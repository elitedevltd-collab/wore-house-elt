import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StockService } from '../stock/stock.service';
import { CreateTransferDto } from './dto/create-transfer.dto';

@Injectable()
export class TransfersService {
  constructor(private prisma: PrismaService, private stockService: StockService) {}

  private async generateReference() {
    const count = await this.prisma.transfer.count();
    return `TRSF-${String(count + 1).padStart(6, '0')}`;
  }

  async create(dto: CreateTransferDto) {
    if (dto.fromWarehouseId === dto.toWarehouseId && dto.fromLocationId === dto.toLocationId) {
      throw new BadRequestException('من فضلك اختر موقعين مختلفين - Please select two different locations');
    }
    const reference = await this.generateReference();
    return this.prisma.transfer.create({
      data: {
        reference,
        fromWarehouseId: dto.fromWarehouseId,
        toWarehouseId: dto.toWarehouseId,
        fromLocationId: dto.fromLocationId,
        toLocationId: dto.toLocationId,
        notes: dto.notes,
        lines: { create: dto.lines.map((l) => ({ productId: l.productId, quantity: l.quantity, lotId: l.lotId })) },
      },
      include: { lines: true },
    });
  }

  async findAll() {
    return this.prisma.transfer.findMany({
      include: { lines: true, fromWarehouse: true, toWarehouse: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const transfer = await this.prisma.transfer.findUnique({
      where: { id },
      include: { lines: true, fromWarehouse: true, toWarehouse: true },
    });
    if (!transfer) throw new NotFoundException('أمر التحويل غير موجود - Transfer not found');
    return transfer;
  }

  /** يخصم من المخزن المصدر ويحوّل الحالة لـ IN_TRANSIT */
  async confirm(id: string, userId: string) {
    const transfer = await this.findOne(id);
    if (transfer.status !== 'DRAFT') {
      throw new BadRequestException('الأمر ده اتأكد قبل كده - Transfer already confirmed');
    }

    return this.prisma.$transaction(async (tx) => {
      for (const line of transfer.lines) {
        await this.stockService.postMovement(
          {
            type: 'TRANSFER_OUT',
            warehouseId: transfer.fromWarehouseId,
            fromLocationId: transfer.fromLocationId ?? null,
            productId: line.productId,
            quantity: Number(line.quantity),
            lotId: line.lotId,
            sourceDocument: `Transfer:${transfer.id}`,
            userId,
            reference: transfer.reference,
          },
          tx,
        );
      }
      return tx.transfer.update({ where: { id }, data: { status: 'IN_TRANSIT' }, include: { lines: true } });
    });
  }

  /** يضيف للمخزن الوجهة ويقفل الأمر كـ RECEIVED */
  async receive(id: string, userId: string) {
    const transfer = await this.findOne(id);
    if (transfer.status !== 'IN_TRANSIT') {
      throw new BadRequestException('الأمر لازم يكون In Transit الأول - Transfer must be in transit first');
    }

    return this.prisma.$transaction(async (tx) => {
      for (const line of transfer.lines) {
        await this.stockService.postMovement(
          {
            type: 'TRANSFER_IN',
            warehouseId: transfer.toWarehouseId,
            toLocationId: transfer.toLocationId ?? null,
            productId: line.productId,
            quantity: Number(line.quantity),
            lotId: line.lotId,
            sourceDocument: `Transfer:${transfer.id}`,
            userId,
            reference: transfer.reference,
          },
          tx,
        );
      }
      return tx.transfer.update({ where: { id }, data: { status: 'RECEIVED' }, include: { lines: true } });
    });
  }

  async cancel(id: string) {
    const transfer = await this.findOne(id);
    if (transfer.status !== 'DRAFT') {
      throw new BadRequestException('مينفعش تلغي أمر اتأكد - Cannot cancel a confirmed transfer');
    }
    return this.prisma.transfer.update({ where: { id }, data: { status: 'CANCELLED' } });
  }
}
