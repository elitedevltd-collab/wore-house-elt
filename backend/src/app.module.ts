import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { RolesModule } from './roles/roles.module';
import { WarehousesModule } from './warehouses/warehouses.module';
import { ProductsModule } from './products/products.module';
import { StockModule } from './stock/stock.module';
import { ReceiptsModule } from './receipts/receipts.module';
import { IssuesModule } from './issues/issues.module';
import { TransfersModule } from './transfers/transfers.module';
import { AdjustmentsModule } from './adjustments/adjustments.module';
import { CountsModule } from './counts/counts.module';
import { AuditModule } from './audit/audit.module';
import { ReportsModule } from './reports/reports.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 200 }]),
    PrismaModule,
    AuthModule,
    UsersModule,
    RolesModule,
    WarehousesModule,
    ProductsModule,
    StockModule,
    ReceiptsModule,
    IssuesModule,
    TransfersModule,
    AdjustmentsModule,
    CountsModule,
    AuditModule,
    ReportsModule,
  ],
})
export class AppModule {}
