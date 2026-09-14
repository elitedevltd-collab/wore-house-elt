import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StockService } from '../stock/stock.service';
import { CreateReceiptDto } from './dto/create-receipt.dto';

@Injectable()
export class ReceiptsService {
  constructor(private prisma: PrismaService, private stockService: StockService) {}

  private async generateReference() {
    const count = await this.prisma.receipt.count();
    return `RCPT-${String(count + 1).padStart(6, '0')}`;
  }

  async create(dto: CreateReceiptDto) {
    const reference = await this.generateReference();
    return this.prisma.receipt.create({
      data: {
        reference,
        warehouseId: dto.warehouseId,
        locationId: dto.locationId,
        supplierId: dto.supplierId,
        notes: dto.notes,
        lines: {
          create: dto.lines.map((l) => ({
            productId: l.productId,
            quantity: l.quantity,
            lotNumber: l.lotNumber,
            expiryDate: l.expiryDate ? new Date(l.expiryDate) : undefined,
          })),
        },
      },
      include: { lines: true },
    });
  }

  async findAll() {
    return this.prisma.receipt.findMany({
      include: { lines: true, warehouse: true, supplier: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const receipt = await this.prisma.receipt.findUnique({
      where: { id },
      include: { lines: true, warehouse: true, supplier: true },
    });
    if (!receipt) throw new NotFoundException('أمر الاستلام غير موجود - Receipt not found');
    return receipt;
  }

  async confirm(id: string, userId: string) {
    const receipt = await this.findOne(id);
    if (receipt.status !== 'DRAFT') {
      throw new BadRequestException('الأمر ده اتأكد أو اتلغى قبل كده - Receipt already processed');
    }

    return this.prisma.$transaction(async (tx) => {
      for (const line of receipt.lines) {
        let lotId: string | undefined;
        if (line.lotNumber) {
          const lot = await tx.lot.upsert({
            where: { productId_lotNumber: { productId: line.productId, lotNumber: line.lotNumber } },
            update: {},
            create: {
              productId: line.productId,
              lotNumber: line.lotNumber,
              expiryDate: line.expiryDate ?? undefined,
            },
          });
          lotId = lot.id;
        }

        await this.stockService.postMovement(
          {
            type: 'RECEIPT',
            warehouseId: receipt.warehouseId,
            toLocationId: receipt.locationId ?? null,
            productId: line.productId,
            quantity: Number(line.quantity),
            lotId,
            sourceDocument: `Receipt:${receipt.id}`,
            userId,
            reference: receipt.reference,
          },
          tx,
        );
      }

      return tx.receipt.update({
        where: { id },
        data: { status: 'CONFIRMED' },
        include: { lines: true },
      });
    });
  }

  async cancel(id: string) {
    const receipt = await this.findOne(id);
    if (receipt.status !== 'DRAFT') {
      throw new BadRequestException(
        'مينفعش تلغي أمر اتأكد - استخدم عملية Reverse بدل كده - Cannot cancel a confirmed receipt, use Reverse instead',
      );
    }
    return this.prisma.receipt.update({ where: { id }, data: { status: 'CANCELLED' } });
  }
}
