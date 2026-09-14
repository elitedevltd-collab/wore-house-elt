import { Module } from '@nestjs/common';
import { CountsService } from './counts.service';
import { CountsController } from './counts.controller';
import { StockModule } from '../stock/stock.module';

@Module({
  imports: [StockModule],
  providers: [CountsService],
  controllers: [CountsController],
})
export class CountsModule {}
