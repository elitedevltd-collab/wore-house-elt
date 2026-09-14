import { IsArray, IsOptional, IsString } from 'class-validator';

export class CreateStockCountDto {
  @IsString()
  warehouseId: string;

  @IsOptional()
  @IsString()
  locationId?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsArray()
  productIds?: string[];
}

export class SubmitCountLineDto {
  @IsString()
  lineId: string;

  countedQty: number;
}
