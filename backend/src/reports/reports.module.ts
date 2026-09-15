import { Injectable, Controller, Get, Module, UseGuards, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';

@Injectable()
class ReportsService {
  constructor(private prisma: PrismaService) {}

  async stockValuation(warehouseId?: string) {
    const balances = await this.prisma.stockBalance.findMany({
      where: { ...(warehouseId ? { warehouseId } : {}) },
      include: { product: true, warehouse: true },
    });
    const rows = balances.map((b) => ({
      warehouse: b.warehouse.name,
      product: b.product.nameAr,
      sku: b.product.sku,
      onHand: Number(b.onHand),
      cost: Number(b.product.cost),
      totalValue: Number(b.onHand) * Number(b.product.cost),
    }));
    return {
      rows,
      totalValue: rows.reduce((s, r) => s + r.totalValue, 0),
    };
  }

  async movementSummary(dateFrom?: string, dateTo?: string, warehouseId?: string) {
    const movements = await this.prisma.stockMovement.findMany({
      where: {
        ...(warehouseId ? { warehouseId } : {}),
        ...(dateFrom || dateTo
          ? {
              date: {
                ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
                ...(dateTo ? { lte: new Date(dateTo) } : {}),
              },
            }
          : {}),
      },
    });
    const byType: Record<string, number> = {};
    for (const m of movements) {
      byType[m.type] = (byType[m.type] || 0) + Number(m.quantity);
    }
    return { totalMovements: movements.length, byType };
  }

  /**
   * كل اللي محتاجه شاشة الرئيسية (لوحة التحكم): أرقام سريعة + رسوم بيانية + قوائم إجرائية،
   * في استدعاء واحد عشان الشاشة تحمّل بسرعة.
   * Everything the dashboard needs (KPI cards + charts + actionable lists) in one call.
   */
  async dashboardKpis() {
    const since7Days = new Date();
    since7Days.setDate(since7Days.getDate() - 6);
    since7Days.setHours(0, 0, 0, 0);
    const since30Days = new Date();
    since30Days.setDate(since30Days.getDate() - 30);
    const todayStart = new Date(new Date().setHours(0, 0, 0, 0));

    const [
      productCount,
      warehouseCount,
      supplierCount,
      customerCount,
      movementsToday,
      pendingReceipts,
      pendingIssues,
      pendingTransfers,
      pendingPurchaseOrders,
      pendingSalesOrders,
      activeCounts,
      lowStockProducts,
      recentMovements,
      stockBalances,
    ] = await Promise.all([
      this.prisma.product.count({ where: { isActive: true, deletedAt: null } }),
      this.prisma.warehouse.count({ where: { isActive: true, deletedAt: null } }),
      this.prisma.supplier.count({ where: { isActive: true } }),
      this.prisma.customer.count({ where: { isActive: true } }),
      this.prisma.stockMovement.count({ where: { date: { gte: todayStart } } }),
      this.prisma.receipt.count({ where: { status: 'DRAFT' } }),
      this.prisma.issue.count({ where: { status: 'DRAFT' } }),
      this.prisma.transfer.count({ where: { status: { in: ['DRAFT', 'IN_TRANSIT'] } } }),
      this.prisma.purchaseOrder.count({ where: { status: 'DRAFT' } }),
      this.prisma.salesOrder.count({ where: { status: 'DRAFT' } }),
      this.prisma.stockCount.count({ where: { status: 'IN_PROGRESS' } }),
      this.lowStockProducts(),
      this.prisma.stockMovement.findMany({
        where: { date: { gte: since30Days } },
        select: { date: true, type: true, quantity: true, productId: true, product: { select: { nameAr: true, nameEn: true, sku: true } } },
      }),
      this.prisma.stockBalance.findMany({ include: { product: true, warehouse: true } }),
    ]);

    const totalStockValue = stockBalances.reduce((sum, b) => sum + Number(b.onHand) * Number(b.product.cost), 0);

    const stockByWarehouseMap = new Map<string, { warehouse: string; value: number }>();
    for (const b of stockBalances) {
      const entry = stockByWarehouseMap.get(b.warehouseId) ?? { warehouse: b.warehouse.name, value: 0 };
      entry.value += Number(b.onHand) * Number(b.product.cost);
      stockByWarehouseMap.set(b.warehouseId, entry);
    }

    const inboundTypes = new Set(['RECEIPT', 'TRANSFER_IN', 'ADJUSTMENT_IN', 'COUNT_IN', 'RETURN_IN']);
    const outboundTypes = new Set(['ISSUE', 'TRANSFER_OUT', 'ADJUSTMENT_OUT', 'COUNT_OUT', 'RETURN_OUT']);

    const movementsByDay = new Map<string, { date: string; in: number; out: number }>();
    for (let i = 0; i < 7; i++) {
      const d = new Date(since7Days);
      d.setDate(d.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      movementsByDay.set(key, { date: key, in: 0, out: 0 });
    }
    const productMovementQty = new Map<string, { name: string; sku: string; qty: number }>();
    for (const m of recentMovements) {
      const key = m.date.toISOString().slice(0, 10);
      const bucket = movementsByDay.get(key);
      if (bucket) {
        if (inboundTypes.has(m.type)) bucket.in += Number(m.quantity);
        else if (outboundTypes.has(m.type)) bucket.out += Number(m.quantity);
      }
      const entry = productMovementQty.get(m.productId) ?? {
        name: m.product.nameAr || m.product.nameEn,
        sku: m.product.sku,
        qty: 0,
      };
      entry.qty += Number(m.quantity);
      productMovementQty.set(m.productId, entry);
    }

    const topMovingProducts = [...productMovementQty.values()]
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);

    return {
      productCount,
      warehouseCount,
      supplierCount,
      customerCount,
      lowStockCount: lowStockProducts.length,
      movementsToday,
      totalStockValue,
      pendingDocs: {
        receipts: pendingReceipts,
        issues: pendingIssues,
        transfers: pendingTransfers,
        purchaseOrders: pendingPurchaseOrders,
        salesOrders: pendingSalesOrders,
        counts: activeCounts,
      },
      movementsLast7Days: [...movementsByDay.values()],
      stockByWarehouse: [...stockByWarehouseMap.values()],
      topMovingProducts,
      lowStockProducts: lowStockProducts.slice(0, 8),
    };
  }

  private async lowStockProducts() {
    const products = await this.prisma.product.findMany({
      where: { isActive: true, deletedAt: null },
      include: { stockBalances: true },
    });
    return products
      .map((p) => ({
        id: p.id,
        sku: p.sku,
        nameAr: p.nameAr,
        nameEn: p.nameEn,
        onHand: p.stockBalances.reduce((s, b) => s + Number(b.onHand), 0),
        reorderPoint: Number(p.reorderPoint),
      }))
      .filter((p) => p.onHand <= p.reorderPoint)
      .sort((a, b) => a.onHand - b.onHand);
  }
}

@ApiTags('reports')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('reports')
class ReportsController {
  constructor(private service: ReportsService) {}

  @RequirePermissions('reports.view')
  @Get('stock-valuation')
  stockValuation(@Query('warehouseId') warehouseId?: string) {
    return this.service.stockValuation(warehouseId);
  }

  @RequirePermissions('reports.view')
  @Get('movement-summary')
  movementSummary(
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('warehouseId') warehouseId?: string,
  ) {
    return this.service.movementSummary(dateFrom, dateTo, warehouseId);
  }

  @RequirePermissions('reports.view')
  @Get('dashboard')
  dashboard() {
    return this.service.dashboardKpis();
  }
}

@Module({
  providers: [ReportsService],
  controllers: [ReportsController],
})
export class ReportsModule {}
