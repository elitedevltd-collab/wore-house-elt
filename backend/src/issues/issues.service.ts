import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StockService } from '../stock/stock.service';
import { CreateIssueDto } from './dto/create-issue.dto';

@Injectable()
export class IssuesService {
  constructor(private prisma: PrismaService, private stockService: StockService) {}

  private async generateReference() {
    const count = await this.prisma.issue.count();
    return `ISSU-${String(count + 1).padStart(6, '0')}`;
  }

  async create(dto: CreateIssueDto) {
    const reference = await this.generateReference();
    return this.prisma.issue.create({
      data: {
        reference,
        warehouseId: dto.warehouseId,
        locationId: dto.locationId,
        customerId: dto.customerId,
        reason: dto.reason,
        notes: dto.notes,
        lines: {
          create: dto.lines.map((l) => ({
            productId: l.productId,
            quantity: l.quantity,
            lotId: l.lotId,
          })),
        },
      },
      include: { lines: true },
    });
  }

  async findAll() {
    return this.prisma.issue.findMany({
      include: { lines: true, warehouse: true, customer: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const issue = await this.prisma.issue.findUnique({
      where: { id },
      include: { lines: true, warehouse: true, customer: true },
    });
    if (!issue) throw new NotFoundException('أمر الصرف غير موجود - Issue not found');
    return issue;
  }

  async confirm(id: string, userId: string) {
    const issue = await this.findOne(id);
    if (issue.status !== 'DRAFT') {
      throw new BadRequestException('الأمر ده اتأكد أو اتلغى قبل كده - Issue already processed');
    }

    return this.prisma.$transaction(async (tx) => {
      for (const line of issue.lines) {
        await this.stockService.postMovement(
          {
            type: 'ISSUE',
            warehouseId: issue.warehouseId,
            fromLocationId: issue.locationId ?? null,
            productId: line.productId,
            quantity: Number(line.quantity),
            lotId: line.lotId,
            sourceDocument: `Issue:${issue.id}`,
            userId,
            reference: issue.reference,
            reason: issue.reason ?? undefined,
          },
          tx,
        );
      }

      return tx.issue.update({
        where: { id },
        data: { status: 'CONFIRMED' },
        include: { lines: true },
      });
    });
  }

  async cancel(id: string) {
    const issue = await this.findOne(id);
    if (issue.status !== 'DRAFT') {
      throw new BadRequestException('مينفعش تلغي أمر اتأكد - Cannot cancel a confirmed issue');
    }
    return this.prisma.issue.update({ where: { id }, data: { status: 'CANCELLED' } });
  }
}
