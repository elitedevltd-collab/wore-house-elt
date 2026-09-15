import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';

@Injectable()
export class PurchaseOrdersService {
  constructor(private prisma: PrismaService) {}

  private async generateReference() {
    const count = await this.prisma.purchaseOrder.count();
    return `PO-${String(count + 1).padStart(6, '0')}`;
  }

  async create(dto: CreatePurchaseOrderDto) {
    const reference = await this.generateReference();
    return this.prisma.purchaseOrder.create({
      data: {
        reference,
        supplierId: dto.supplierId,
        warehouseId: dto.warehouseId,
        notes: dto.notes,
        lines: {
          create: dto.lines.map((l) => ({ productId: l.productId, quantity: l.quantity, unitPrice: l.unitPrice })),
        },
      },
      include: { lines: true, supplier: true, warehouse: true },
    });
  }

  findAll() {
    return this.prisma.purchaseOrder.findMany({
      include: { lines: true, supplier: true, warehouse: true, receipts: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const po = await this.prisma.purchaseOrder.findUnique({
      where: { id },
      include: { lines: { include: { product: true } }, supplier: true, warehouse: true, receipts: true },
    });
    if (!po) throw new NotFoundException('أمر الشراء غير موجود - Purchase order not found');
    return po;
  }

  /**
   * اعتماد أمر الشراء بينشئ تلقائيًا أمر استلام (Receipt) بمسودة مربوط بيه، جاهز إن مسؤول
   * المخزن يراجعه ويأكده من شاشة الاستلام العادية زي أي استلام تاني (فالـ Stock Engine
   * بيفضل هو المصدر الوحيد لتحريك المخزون، حتى لو جاي من أمر شراء).
   *
   * Confirming a PO auto-creates a linked draft Receipt; the warehouse team still
   * confirms that Receipt through the normal flow, keeping the Stock Engine as the
   * single place stock actually moves.
   */
  async confirm(id: string) {
    const po = await this.findOne(id);
    if (po.status !== 'DRAFT') {
      throw new BadRequestException('أمر الشراء ده اتأكد أو اتلغى قبل كده - Purchase order already processed');
    }

    return this.prisma.$transaction(async (tx) => {
      const receiptCount = await tx.receipt.count();
      const receiptReference = `RCPT-${String(receiptCount + 1).padStart(6, '0')}`;

      await tx.receipt.create({
        data: {
          reference: receiptReference,
          warehouseId: po.warehouseId,
          supplierId: po.supplierId,
          purchaseOrderId: po.id,
          notes: `من أمر الشراء ${po.reference} - Generated from purchase order ${po.reference}`,
          lines: {
            create: po.lines.map((l) => ({ productId: l.productId, quantity: l.quantity })),
          },
        },
      });

      return tx.purchaseOrder.update({
        where: { id },
        data: { status: 'CONFIRMED' },
        include: { lines: true, supplier: true, warehouse: true, receipts: true },
      });
    });
  }

  async cancel(id: string) {
    const po = await this.findOne(id);
    if (po.status !== 'DRAFT') {
      throw new BadRequestException('مينفعش تلغي أمر شراء اتأكد بالفعل - Cannot cancel a confirmed purchase order');
    }
    return this.prisma.purchaseOrder.update({ where: { id }, data: { status: 'CANCELLED' } });
  }
}
