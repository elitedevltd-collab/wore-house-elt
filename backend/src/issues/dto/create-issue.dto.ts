import { Type } from 'class-transformer';
import { IsArray, IsNumber, IsOptional, IsPositive, IsString, ValidateNested } from 'class-validator';

class IssueLineDto {
  @IsString()
  productId: string;

  @IsNumber()
  @IsPositive()
  quantity: number;

  @IsOptional()
  @IsString()
  lotId?: string;
}

export class CreateIssueDto {
  @IsString()
  warehouseId: string;

  @IsOptional()
  @IsString()
  locationId?: string;

  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => IssueLineDto)
  lines: IssueLineDto[];
}
