import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './src/prisma/prisma.module';
import { AuthModule } from './src/auth/auth.module';
import { UsersModule } from './src/users/users.module';
import { RolesModule } from './src/roles/roles.module';
import { WarehousesModule } from './src/warehouses/warehouses.module';
import { ProductsModule } from './src/products/products.module';
import { StockModule } from './src/stock/stock.module';
import { ReceiptsModule } from './src/receipts/receipts.module';
import { IssuesModule } from './src/issues/issues.module';
import { TransfersModule } from './src/transfers/transfers.module';
import { AdjustmentsModule } from './src/adjustments/adjustments.module';
import { CountsModule } from './src/counts/counts.module';
import { AuditModule } from './src/audit/audit.module';
import { ReportsModule } from './src/reports/reports.module';
import { BarcodeModule } from './src/barcode/barcode.module';
import { PurchaseOrdersModule } from './src/purchase-orders/purchase-orders.module';
import { SalesOrdersModule } from './src/sales-orders/sales-orders.module';
import { SuppliersModule } from './src/suppliers/suppliers.module';
import { CustomersModule } from './src/customers/customers.module';
import { InventoryModule } from './src/inventory/inventory.module';
import { AuditInterceptor } from './src/common/interceptors/audit.interceptor';

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
    BarcodeModule,
    SuppliersModule,
    CustomersModule,
    PurchaseOrdersModule,
    SalesOrdersModule,
    InventoryModule,
  ],
  providers: [AuditInterceptor],
})
export class AppModule {}
