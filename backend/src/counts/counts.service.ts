import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StockService } from '../stock/stock.service';
import { CreateStockCountDto } from './dto/count.dto';

@Injectable()
export class CountsService {
  constructor(private prisma: PrismaService, private stockService: StockService) {}

  private async generateReference() {
    const count = await this.prisma.stockCount.count();
    return `CNT-${String(count + 1).padStart(6, '0')}`;
  }

  async create(dto: CreateStockCountDto) {
    const reference = await this.generateReference();

    const products = await this.prisma.product.findMany({
      where: {
        isActive: true,
        deletedAt: null,
        ...(dto.categoryId ? { categoryId: dto.categoryId } : {}),
        ...(dto.productIds?.length ? { id: { in: dto.productIds } } : {}),
      },
    });

    const lines = [];
    for (const product of products) {
      const expectedQty = await this.stockService.getAvailable(
        dto.warehouseId,
        product.id,
        dto.locationId,
      );
      lines.push({ productId: product.id, expectedQty });
    }

    return this.prisma.stockCount.create({
      data: {
        reference,
        warehouseId: dto.warehouseId,
        locationId: dto.locationId,
        categoryId: dto.categoryId,
        status: 'IN_PROGRESS',
        lines: { create: lines },
      },
      include: { lines: { include: { product: true } } },
    });
  }

  async findAll() {
    return this.prisma.stockCount.findMany({
      include: { lines: true, warehouse: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const count = await this.prisma.stockCount.findUnique({
      where: { id },
      include: { lines: { include: { product: true } }, warehouse: true },
    });
    if (!count) throw new NotFoundException('أمر الجرد غير موجود - Stock count not found');
    return count;
  }

  async submitLine(lineId: string, countedQty: number) {
    return this.prisma.stockCountLine.update({
      where: { id: lineId },
      data: { countedQty, status: 'COUNTED' },
    });
  }

  /** بيقفل الجرد وينشئ حركات تسوية تلقائية لكل فرق بين المتوقع والفعلي */
  async complete(id: string, userId: string) {
    const stockCount = await this.findOne(id);
    if (stockCount.status === 'COMPLETED') {
      throw new BadRequestException('الجرد ده اتقفل قبل كده - Count already completed');
    }

    return this.prisma.$transaction(async (tx) => {
      for (const line of stockCount.lines) {
        if (line.countedQty === null || line.countedQty === undefined) continue;
        const diff = Number(line.countedQty) - Number(line.expectedQty);
        if (diff === 0) continue;

        if (diff > 0) {
          await this.stockService.postMovement(
            {
              type: 'COUNT_IN',
              warehouseId: stockCount.warehouseId,
              toLocationId: stockCount.locationId ?? null,
              productId: line.productId,
              quantity: diff,
              sourceDocument: `StockCount:${stockCount.id}`,
              userId,
              reference: stockCount.reference,
              reason: 'جرد دوري - Periodic count adjustment',
            },
            tx,
          );
        } else {
          await this.stockService.postMovement(
            {
              type: 'COUNT_OUT',
              warehouseId: stockCount.warehouseId,
              fromLocationId: stockCount.locationId ?? null,
              productId: line.productId,
              quantity: Math.abs(diff),
              sourceDocument: `StockCount:${stockCount.id}`,
              userId,
              reference: stockCount.reference,
              reason: 'جرد دوري - Periodic count adjustment',
              allowNegative: true,
            },
            tx,
          );
        }
      }

      return tx.stockCount.update({
        where: { id },
        data: { status: 'COMPLETED' },
        include: { lines: true },
      });
    });
  }
}
