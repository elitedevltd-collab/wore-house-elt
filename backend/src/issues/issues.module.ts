import { Module } from '@nestjs/common';
import { IssuesService } from './issues.service';
import { IssuesController } from './issues.controller';
import { StockModule } from '../stock/stock.module';

@Module({
  imports: [StockModule],
  providers: [IssuesService],
  controllers: [IssuesController],
})
export class IssuesModule {}
