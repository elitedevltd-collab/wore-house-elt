import { Module } from '@nestjs/common';
import { ReceiptsService } from './receipts.service';
import { ReceiptsController } from './receipts.controller';
import { StockModule } from '../stock/stock.module';

@Module({
  imports: [StockModule],
  providers: [ReceiptsService],
  controllers: [ReceiptsController],
})
export class ReceiptsModule {}
