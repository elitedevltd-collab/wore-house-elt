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

  async dashboardKpis() {
    const [productCount, warehouseCount, lowStockCount, movementsToday] = await Promise.all([
      this.prisma.product.count({ where: { isActive: true, deletedAt: null } }),
      this.prisma.warehouse.count({ where: { isActive: true, deletedAt: null } }),
      this.lowStockCount(),
      this.prisma.stockMovement.count({
        where: { date: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
      }),
    ]);
    return { productCount, warehouseCount, lowStockCount, movementsToday };
  }

  private async lowStockCount() {
    const products = await this.prisma.product.findMany({
      where: { isActive: true, deletedAt: null },
      include: { stockBalances: true },
    });
    return products.filter((p) => {
      const onHand = p.stockBalances.reduce((s, b) => s + Number(b.onHand), 0);
      return onHand <= Number(p.reorderPoint);
    }).length;
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
