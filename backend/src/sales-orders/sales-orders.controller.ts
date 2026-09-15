import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { SalesOrdersService } from './sales-orders.service';
import { CreateSalesOrderDto } from './dto/create-sales-order.dto';

@ApiTags('sales-orders')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('sales-orders')
export class SalesOrdersController {
  constructor(private service: SalesOrdersService) {}

  @RequirePermissions('sales_orders.manage')
  @Post()
  create(@Body() dto: CreateSalesOrderDto) {
    return this.service.create(dto);
  }

  @RequirePermissions('sales_orders.view')
  @Get()
  findAll() {
    return this.service.findAll();
  }

  @RequirePermissions('sales_orders.view')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @RequirePermissions('sales_orders.manage')
  @Post(':id/confirm')
  confirm(@Param('id') id: string) {
    return this.service.confirm(id);
  }

  @RequirePermissions('sales_orders.manage')
  @Post(':id/cancel')
  cancel(@Param('id') id: string) {
    return this.service.cancel(id);
  }
}
