import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSalesOrderDto } from './dto/create-sales-order.dto';

@Injectable()
export class SalesOrdersService {
  constructor(private prisma: PrismaService) {}

  private async generateReference() {
    const count = await this.prisma.salesOrder.count();
    return `SO-${String(count + 1).padStart(6, '0')}`;
  }

  async create(dto: CreateSalesOrderDto) {
    const reference = await this.generateReference();
    return this.prisma.salesOrder.create({
      data: {
        reference,
        customerId: dto.customerId,
        warehouseId: dto.warehouseId,
        notes: dto.notes,
        lines: {
          create: dto.lines.map((l) => ({ productId: l.productId, quantity: l.quantity, unitPrice: l.unitPrice })),
        },
      },
      include: { lines: true, customer: true, warehouse: true },
    });
  }

  findAll() {
    return this.prisma.salesOrder.findMany({
      include: { lines: true, customer: true, warehouse: true, issues: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const so = await this.prisma.salesOrder.findUnique({
      where: { id },
      include: { lines: { include: { product: true } }, customer: true, warehouse: true, issues: true },
    });
    if (!so) throw new NotFoundException('أمر البيع غير موجود - Sales order not found');
    return so;
  }

  /**
   * اعتماد أمر البيع بينشئ تلقائيًا أمر صرف (Issue) بمسودة مربوط بيه؛ الفريق يأكده من شاشة
   * الصرف العادية زي أي صرف تاني، وساعتها الـ Stock Engine بيتحقق من توفر الكمية ويخصمها.
   *
   * Confirming an SO auto-creates a linked draft Issue; it is confirmed through the
   * normal Issues flow, where the Stock Engine checks availability and deducts stock.
   */
  async confirm(id: string) {
    const so = await this.findOne(id);
    if (so.status !== 'DRAFT') {
      throw new BadRequestException('أمر البيع ده اتأكد أو اتلغى قبل كده - Sales order already processed');
    }

    return this.prisma.$transaction(async (tx) => {
      const issueCount = await tx.issue.count();
      const issueReference = `ISSU-${String(issueCount + 1).padStart(6, '0')}`;

      await tx.issue.create({
        data: {
          reference: issueReference,
          warehouseId: so.warehouseId,
          customerId: so.customerId,
          salesOrderId: so.id,
          reason: 'SALES_ORDER',
          notes: `من أمر البيع ${so.reference} - Generated from sales order ${so.reference}`,
          lines: {
            create: so.lines.map((l) => ({ productId: l.productId, quantity: l.quantity })),
          },
        },
      });

      return tx.salesOrder.update({
        where: { id },
        data: { status: 'CONFIRMED' },
        include: { lines: true, customer: true, warehouse: true, issues: true },
      });
    });
  }

  async cancel(id: string) {
    const so = await this.findOne(id);
    if (so.status !== 'DRAFT') {
      throw new BadRequestException('مينفعش تلغي أمر بيع اتأكد بالفعل - Cannot cancel a confirmed sales order');
    }
    return this.prisma.salesOrder.update({ where: { id }, data: { status: 'CANCELLED' } });
  }
}
