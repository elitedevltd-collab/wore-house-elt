import { Type } from 'class-transformer';
import { IsArray, IsDateString, IsNumber, IsOptional, IsPositive, IsString, ValidateNested } from 'class-validator';

class ReceiptLineDto {
  @IsString()
  productId: string;

  @IsNumber()
  @IsPositive()
  quantity: number;

  @IsOptional()
  @IsString()
  lotNumber?: string;

  @IsOptional()
  @IsDateString()
  expiryDate?: string;
}

export class CreateReceiptDto {
  @IsString()
  warehouseId: string;

  @IsOptional()
  @IsString()
  locationId?: string;

  @IsOptional()
  @IsString()
  supplierId?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReceiptLineDto)
  lines: ReceiptLineDto[];
}
