import { Module } from '@nestjs/common';
import { TransfersService } from './transfers.service';
import { TransfersController } from './transfers.controller';
import { StockModule } from '../stock/stock.module';

@Module({
  imports: [StockModule],
  providers: [TransfersService],
  controllers: [TransfersController],
})
export class TransfersModule {}
