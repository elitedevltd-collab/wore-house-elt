import { Module } from '@nestjs/common';
import { AdjustmentsService } from './adjustments.service';
import { AdjustmentsController } from './adjustments.controller';
import { StockModule } from '../stock/stock.module';

@Module({
  imports: [StockModule],
  providers: [AdjustmentsService],
  controllers: [AdjustmentsController],
})
export class AdjustmentsModule {}
