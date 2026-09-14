import { BadRequestException, Injectable } from '@nestjs/common';
import { MovementType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface PostMovementInput {
  type: MovementType;
  warehouseId: string;
  fromLocationId?: string | null;
  toLocationId?: string | null;
  productId: string;
  quantity: number;
  lotId?: string | null;
  serialNumberId?: string | null;
  sourceDocument: string;
  userId: string;
  reference: string;
  reason?: string;
  allowNegative?: boolean;
}

const INBOUND_TYPES: MovementType[] = [
  'RECEIPT',
  'TRANSFER_IN',
  'ADJUSTMENT_IN',
  'COUNT_IN',
  'RETURN_IN',
];

const OUTBOUND_TYPES: MovementType[] = [
  'ISSUE',
  'TRANSFER_OUT',
  'ADJUSTMENT_OUT',
  'COUNT_OUT',
  'RETURN_OUT',
];

@Injectable()
export class StockService {
  constructor(private prisma: PrismaService) {}

  /**
   * كل حركة مخزون (استلام/صرف/تحويل/تسوية/جرد) لازم تعدّي من هنا.
   * الدالة دي بتضمن: تسجيل StockMovement + تحديث StockBalance في نفس الوقت (Transaction واحدة)
   * عشان الأرقام متفضلش أبدًا Out of Sync.
   */
  async postMovement(input: PostMovementInput, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    const isInbound = INBOUND_TYPES.includes(input.type);
    const isOutbound = OUTBOUND_TYPES.includes(input.type);

    if (input.quantity <= 0) {
      throw new BadRequestException('الكمية لازم تكون أكبر من صفر - Quantity must be greater than zero');
    }

    if (isOutbound) {
      const available = await this.getAvailable(
        input.warehouseId,
        input.productId,
        input.fromLocationId ?? undefined,
        input.lotId ?? undefined,
        client,
      );
      if (available < input.quantity && !input.allowNegative) {
        throw new BadRequestException(
          `الكمية المتاحة غير كافية (متاح: ${available}) - Insufficient available stock (available: ${available})`,
        );
      }
    }

    const movement = await client.stockMovement.create({
      data: {
        type: input.type,
        warehouseId: input.warehouseId,
        fromLocationId: input.fromLocationId ?? null,
        toLocationId: input.toLocationId ?? null,
        productId: input.productId,
        quantity: input.quantity,
        lotId: input.lotId ?? null,
        serialNumberId: input.serialNumberId ?? null,
        sourceDocument: input.sourceDocument,
        userId: input.userId,
        reference: input.reference,
        reason: input.reason,
      },
    });

    if (isInbound) {
      await this.upsertBalance(
        client,
        input.warehouseId,
        input.toLocationId ?? null,
        input.productId,
        input.lotId ?? null,
        input.quantity,
      );
    }
    if (isOutbound) {
      await this.upsertBalance(
        client,
        input.warehouseId,
        input.fromLocationId ?? null,
        input.productId,
        input.lotId ?? null,
        -input.quantity,
      );
    }

    return movement;
  }

  private async upsertBalance(
    client: Prisma.TransactionClient | PrismaService,
    warehouseId: string,
    locationId: string | null,
    productId: string,
    lotId: string | null,
    deltaQty: number,
  ) {
    const existing = await client.stockBalance.findFirst({
      where: { warehouseId, locationId, productId, lotId },
    });

    if (existing) {
      await client.stockBalance.update({
        where: { id: existing.id },
        data: { onHand: { increment: deltaQty } },
      });
    } else {
      await client.stockBalance.create({
        data: {
          warehouseId,
          locationId,
          productId,
          lotId,
          onHand: deltaQty,
        },
      });
    }
  }

  async getAvailable(
    warehouseId: string,
    productId: string,
    locationId?: string,
    lotId?: string,
    client: Prisma.TransactionClient | PrismaService = this.prisma,
  ): Promise<number> {
    const balances = await client.stockBalance.findMany({
      where: {
        warehouseId,
        productId,
        ...(locationId ? { locationId } : {}),
        ...(lotId ? { lotId } : {}),
      },
    });
    const onHand = balances.reduce((sum, b) => sum + Number(b.onHand), 0);
    const reserved = balances.reduce((sum, b) => sum + Number(b.reserved), 0);
    return onHand - reserved;
  }

  async getBalanceSummary(warehouseId: string, productId: string) {
    const balances = await this.prisma.stockBalance.findMany({
      where: { warehouseId, productId },
      include: { location: true, lot: true },
    });
    const onHand = balances.reduce((sum, b) => sum + Number(b.onHand), 0);
    const reserved = balances.reduce((sum, b) => sum + Number(b.reserved), 0);
    return {
      onHand,
      reserved,
      available: onHand - reserved,
      byLocation: balances.map((b) => ({
        locationId: b.locationId,
        locationName: b.location?.name,
        lotId: b.lotId,
        lotNumber: b.lot?.lotNumber,
        onHand: Number(b.onHand),
      })),
    };
  }
}
