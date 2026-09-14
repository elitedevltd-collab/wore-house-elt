import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { StockService } from './stock.service';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('stock')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('stock')
export class StockController {
  constructor(private stockService: StockService, private prisma: PrismaService) {}

  @RequirePermissions('stock.view')
  @Get('balance')
  async balance(@Query('warehouseId') warehouseId: string, @Query('productId') productId: string) {
    return this.stockService.getBalanceSummary(warehouseId, productId);
  }

  @RequirePermissions('stock.view')
  @Get('balances')
  async balances(
    @Query('warehouseId') warehouseId?: string,
    @Query('categoryId') categoryId?: string,
  ) {
    return this.prisma.stockBalance.findMany({
      where: {
        ...(warehouseId ? { warehouseId } : {}),
        ...(categoryId ? { product: { categoryId } } : {}),
      },
      include: { product: true, warehouse: true, location: true, lot: true },
      orderBy: { updatedAt: 'desc' },
      take: 200,
    });
  }

  @RequirePermissions('stock.view')
  @Get('movements')
  async movements(
    @Query('productId') productId?: string,
    @Query('warehouseId') warehouseId?: string,
  ) {
    return this.prisma.stockMovement.findMany({
      where: {
        ...(productId ? { productId } : {}),
        ...(warehouseId ? { warehouseId } : {}),
      },
      include: { product: true, user: true, fromLocation: true, toLocation: true },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  @RequirePermissions('stock.view')
  @Get('low-stock')
  async lowStock() {
    const products = await this.prisma.product.findMany({
      where: { isActive: true, deletedAt: null },
      include: { stockBalances: true },
    });
    return products
      .map((p) => {
        const onHand = p.stockBalances.reduce((s, b) => s + Number(b.onHand), 0);
        return { id: p.id, sku: p.sku, nameAr: p.nameAr, nameEn: p.nameEn, onHand, reorderPoint: Number(p.reorderPoint) };
      })
      .filter((p) => p.onHand <= p.reorderPoint);
  }
}
