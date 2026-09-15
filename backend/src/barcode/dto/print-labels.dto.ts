import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsIn, IsInt, IsString, Max, Min, ValidateNested } from 'class-validator';

export class LabelItemDto {
  @IsIn(['product', 'location'])
  type: 'product' | 'location';

  @IsString()
  id: string;

  @IsInt()
  @Min(1)
  @Max(500)
  qty: number;
}

export class PrintLabelsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => LabelItemDto)
  items: LabelItemDto[];
}
