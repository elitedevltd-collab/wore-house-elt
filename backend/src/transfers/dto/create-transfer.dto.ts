import { Type } from 'class-transformer';
import { IsArray, IsNumber, IsOptional, IsPositive, IsString, ValidateNested } from 'class-validator';

class TransferLineDto {
  @IsString()
  productId: string;

  @IsNumber()
  @IsPositive()
  quantity: number;

  @IsOptional()
  @IsString()
  lotId?: string;
}

export class CreateTransferDto {
  @IsString()
  fromWarehouseId: string;

  @IsString()
  toWarehouseId: string;

  @IsOptional()
  @IsString()
  fromLocationId?: string;

  @IsOptional()
  @IsString()
  toLocationId?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TransferLineDto)
  lines: TransferLineDto[];
}
