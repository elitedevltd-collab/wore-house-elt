import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Injectable,
  Module,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';

@Injectable()
class InventoryService {
  constructor(private prisma: PrismaService) {}

  async alerts(warehouseId?: string) {
    const products = await this.prisma.product.findMany({
      where: { isActive: true, deletedAt: null },
      include: { stockBalances: { where: warehouseId ? { warehouseId } : undefined } },
    });
    const lowStock = products
      .map((product) => ({
        id: product.id,
        sku: product.sku,
        nameAr: product.nameAr,
        nameEn: product.nameEn,
        onHand: product.stockBalances.reduce((sum, row) => sum + Number(row.onHand), 0),
        reserved: product.stockBalances.reduce((sum, row) => sum + Number(row.reserved), 0),
        reorderPoint: Number(product.reorderPoint),
        minimumStock: Number(product.minimumStock),
      }))
      .filter((row) => row.onHand - row.reserved <= row.reorderPoint)
      .sort((a, b) => a.onHand - b.onHand);

    return { lowStock, count: lowStock.length };
  }

  async expiring(days = 30, warehouseId?: string) {
    const until = new Date();
    until.setDate(until.getDate() + Math.max(1, Math.min(days, 3650)));
    const rows = await this.prisma.stockBalance.findMany({
      where: {
        onHand: { gt: 0 },
        ...(warehouseId ? { warehouseId } : {}),
        lot: { expiryDate: { not: null, lte: until } },
      },
      include: { product: true, lot: true, warehouse: true, location: true },
      orderBy: { lot: { expiryDate: 'asc' } },
    });
    return rows.map((row) => ({
      id: row.id,
      productId: row.productId,
      sku: row.product.sku,
      productName: row.product.nameAr,
      lotNumber: row.lot?.lotNumber,
      expiryDate: row.lot?.expiryDate,
      warehouse: row.warehouse.name,
      location: row.location?.name,
      onHand: Number(row.onHand),
    }));
  }

  locations(warehouseId?: string) {
    return this.prisma.warehouseLocation.findMany({
      where: warehouseId ? { warehouseId, deletedAt: null } : { deletedAt: null },
      include: { warehouse: true, _count: { select: { stockBalances: true } } },
      orderBy: [{ warehouseId: 'asc' }, { code: 'asc' }],
    });
  }

  createLocation(dto: { warehouseId: string; code: string; name: string }) {
    return this.prisma.warehouseLocation.create({ data: dto });
  }

  lots(productId?: string, includeExpired = true) {
    return this.prisma.lot.findMany({
      where: {
        ...(productId ? { productId } : {}),
        ...(includeExpired ? {} : { OR: [{ expiryDate: null }, { expiryDate: { gt: new Date() } }] }),
      },
      include: { product: true, stockBalances: { include: { warehouse: true, location: true } } },
      orderBy: { expiryDate: 'asc' },
    });
  }

  async createLot(dto: { productId: string; lotNumber: string; manufactureDate?: string; expiryDate?: string }) {
    return this.prisma.lot.create({
      data: {
        productId: dto.productId,
        lotNumber: dto.lotNumber,
        manufactureDate: dto.manufactureDate ? new Date(dto.manufactureDate) : undefined,
        expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : undefined,
      },
    });
  }

  serials(productId?: string, status?: string) {
    return this.prisma.serialNumber.findMany({
      where: { ...(productId ? { productId } : {}), ...(status ? { status } : {}) },
      include: { product: true },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });
  }

  createSerial(dto: { productId: string; serial: string; status?: string }) {
    return this.prisma.serialNumber.create({ data: { ...dto, status: dto.status || 'IN_STOCK' } });
  }

  async reserve(balanceId: string, quantity: number) {
    if (quantity <= 0) throw new BadRequestException('الكمية يجب أن تكون أكبر من صفر');
    return this.prisma.$transaction(async (tx) => {
      const balance = await tx.stockBalance.findUnique({ where: { id: balanceId } });
      if (!balance) throw new BadRequestException('رصيد المخزون غير موجود');
      const available = Number(balance.onHand) - Number(balance.reserved);
      if (available < quantity) throw new BadRequestException(`المتاح للحجز: ${available}`);
      return tx.stockBalance.update({ where: { id: balanceId }, data: { reserved: { increment: quantity } } });
    });
  }

  release(balanceId: string, quantity: number) {
    if (quantity <= 0) throw new BadRequestException('الكمية يجب أن تكون أكبر من صفر');
    return this.prisma.stockBalance.updateMany({
      where: { id: balanceId, reserved: { gte: quantity } },
      data: { reserved: { decrement: quantity } },
    });
  }
}

@ApiTags('inventory-control')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('inventory')
class InventoryController {
  constructor(private service: InventoryService) {}

  @RequirePermissions('stock.view')
  @Get('alerts')
  alerts(@Query('warehouseId') warehouseId?: string) { return this.service.alerts(warehouseId); }

  @RequirePermissions('stock.view')
  @Get('expiring')
  expiring(@Query('days') days?: string, @Query('warehouseId') warehouseId?: string) {
    return this.service.expiring(Number(days || 30), warehouseId);
  }

  @RequirePermissions('warehouses.view')
  @Get('locations')
  locations(@Query('warehouseId') warehouseId?: string) { return this.service.locations(warehouseId); }

  @RequirePermissions('warehouses.create')
  @Post('locations')
  createLocation(@Body() dto: { warehouseId: string; code: string; name: string }) { return this.service.createLocation(dto); }

  @RequirePermissions('stock.view')
  @Get('lots')
  lots(@Query('productId') productId?: string, @Query('includeExpired') includeExpired?: string) {
    return this.service.lots(productId, includeExpired !== 'false');
  }

  @RequirePermissions('stock.receive')
  @Post('lots')
  createLot(@Body() dto: { productId: string; lotNumber: string; manufactureDate?: string; expiryDate?: string }) {
    return this.service.createLot(dto);
  }

  @RequirePermissions('stock.view')
  @Get('serials')
  serials(@Query('productId') productId?: string, @Query('status') status?: string) { return this.service.serials(productId, status); }

  @RequirePermissions('stock.receive')
  @Post('serials')
  createSerial(@Body() dto: { productId: string; serial: string; status?: string }) { return this.service.createSerial(dto); }

  @RequirePermissions('stock.issue')
  @Patch('balances/:id/reserve')
  reserve(@Param('id') id: string, @Body('quantity') quantity: number) { return this.service.reserve(id, Number(quantity)); }

  @RequirePermissions('stock.issue')
  @Patch('balances/:id/release')
  release(@Param('id') id: string, @Body('quantity') quantity: number) { return this.service.release(id, Number(quantity)); }
}

@Module({ providers: [InventoryService], controllers: [InventoryController] })
export class InventoryModule {}
