import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StockService } from '../stock/stock.service';
import { CreateAdjustmentDto } from './dto/create-adjustment.dto';

@Injectable()
export class AdjustmentsService {
  constructor(private prisma: PrismaService, private stockService: StockService) {}

  private async generateReference() {
    const count = await this.prisma.stockAdjustment.count();
    return `ADJ-${String(count + 1).padStart(6, '0')}`;
  }

  async create(dto: CreateAdjustmentDto) {
    const reference = await this.generateReference();

    const lines = [];
    for (const line of dto.lines) {
      const systemQuantity = await this.stockService.getAvailable(
        dto.warehouseId,
        line.productId,
        dto.locationId,
        line.lotId,
      );
      lines.push({
        productId: line.productId,
        lotId: line.lotId,
        systemQuantity,
        countedQuantity: line.countedQuantity,
        difference: line.countedQuantity - systemQuantity,
      });
    }

    return this.prisma.stockAdjustment.create({
      data: {
        reference,
        warehouseId: dto.warehouseId,
        locationId: dto.locationId,
        reason: dto.reason,
        lines: { create: lines },
      },
      include: { lines: true },
    });
  }

  async findAll() {
    return this.prisma.stockAdjustment.findMany({
      include: { lines: true, warehouse: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const adj = await this.prisma.stockAdjustment.findUnique({
      where: { id },
      include: { lines: true, warehouse: true },
    });
    if (!adj) throw new NotFoundException('أمر التسوية غير موجود - Adjustment not found');
    return adj;
  }

  async confirm(id: string, userId: string) {
    const adjustment = await this.findOne(id);
    if (adjustment.status !== 'DRAFT') {
      throw new BadRequestException('الأمر ده اتأكد قبل كده - Adjustment already processed');
    }

    return this.prisma.$transaction(async (tx) => {
      for (const line of adjustment.lines) {
        const diff = Number(line.difference);
        if (diff === 0) continue;

        if (diff > 0) {
          await this.stockService.postMovement(
            {
              type: 'ADJUSTMENT_IN',
              warehouseId: adjustment.warehouseId,
              toLocationId: adjustment.locationId ?? null,
              productId: line.productId,
              quantity: diff,
              lotId: line.lotId,
              sourceDocument: `Adjustment:${adjustment.id}`,
              userId,
              reference: adjustment.reference,
              reason: adjustment.reason ?? undefined,
            },
            tx,
          );
        } else {
          await this.stockService.postMovement(
            {
              type: 'ADJUSTMENT_OUT',
              warehouseId: adjustment.warehouseId,
              fromLocationId: adjustment.locationId ?? null,
              productId: line.productId,
              quantity: Math.abs(diff),
              lotId: line.lotId,
              sourceDocument: `Adjustment:${adjustment.id}`,
              userId,
              reference: adjustment.reference,
              reason: adjustment.reason ?? undefined,
              allowNegative: true,
            },
            tx,
          );
        }
      }

      return tx.stockAdjustment.update({
        where: { id },
        data: { status: 'CONFIRMED' },
        include: { lines: true },
      });
    });
  }
}
