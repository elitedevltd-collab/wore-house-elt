import { Type } from 'class-transformer';
import { IsArray, IsNumber, IsOptional, IsPositive, IsString, ValidateNested } from 'class-validator';

class PurchaseOrderLineDto {
  @IsString()
  productId: string;

  @IsNumber()
  @IsPositive()
  quantity: number;

  @IsNumber()
  unitPrice: number;
}

export class CreatePurchaseOrderDto {
  @IsString()
  supplierId: string;

  @IsString()
  warehouseId: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PurchaseOrderLineDto)
  lines: PurchaseOrderLineDto[];
}
