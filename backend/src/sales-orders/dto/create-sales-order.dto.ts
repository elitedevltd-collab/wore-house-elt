import { Type } from 'class-transformer';
import { IsArray, IsNumber, IsOptional, IsPositive, IsString, ValidateNested } from 'class-validator';

class SalesOrderLineDto {
  @IsString()
  productId: string;

  @IsNumber()
  @IsPositive()
  quantity: number;

  @IsNumber()
  unitPrice: number;
}

export class CreateSalesOrderDto {
  @IsString()
  customerId: string;

  @IsString()
  warehouseId: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SalesOrderLineDto)
  lines: SalesOrderLineDto[];
}
