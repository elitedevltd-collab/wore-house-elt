import { Type } from 'class-transformer';
import { IsArray, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';

class AdjustmentLineDto {
  @IsString()
  productId: string;

  @IsOptional()
  @IsString()
  lotId?: string;

  @IsNumber()
  @Min(0)
  countedQuantity: number;
}

export class CreateAdjustmentDto {
  @IsString()
  warehouseId: string;

  @IsOptional()
  @IsString()
  locationId?: string;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AdjustmentLineDto)
  lines: AdjustmentLineDto[];
}
