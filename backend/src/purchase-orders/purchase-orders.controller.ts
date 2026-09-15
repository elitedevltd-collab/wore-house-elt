import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { PurchaseOrdersService } from './purchase-orders.service';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';

@ApiTags('purchase-orders')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('purchase-orders')
export class PurchaseOrdersController {
  constructor(private service: PurchaseOrdersService) {}

  @RequirePermissions('purchase_orders.manage')
  @Post()
  create(@Body() dto: CreatePurchaseOrderDto) {
    return this.service.create(dto);
  }

  @RequirePermissions('purchase_orders.view')
  @Get()
  findAll() {
    return this.service.findAll();
  }

  @RequirePermissions('purchase_orders.view')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @RequirePermissions('purchase_orders.manage')
  @Post(':id/confirm')
  confirm(@Param('id') id: string) {
    return this.service.confirm(id);
  }

  @RequirePermissions('purchase_orders.manage')
  @Post(':id/cancel')
  cancel(@Param('id') id: string) {
    return this.service.cancel(id);
  }
}
