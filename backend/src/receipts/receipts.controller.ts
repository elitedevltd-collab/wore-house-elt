import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { ReceiptsService } from './receipts.service';
import { CreateReceiptDto } from './dto/create-receipt.dto';

@ApiTags('receipts')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('receipts')
export class ReceiptsController {
  constructor(private service: ReceiptsService) {}

  @RequirePermissions('stock.receive')
  @Post()
  create(@Body() dto: CreateReceiptDto) {
    return this.service.create(dto);
  }

  @RequirePermissions('stock.view')
  @Get()
  findAll() {
    return this.service.findAll();
  }

  @RequirePermissions('stock.view')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @RequirePermissions('stock.receive')
  @Post(':id/confirm')
  confirm(@Param('id') id: string, @Req() req: any) {
    return this.service.confirm(id, req.user.userId);
  }

  @RequirePermissions('stock.receive')
  @Post(':id/cancel')
  cancel(@Param('id') id: string) {
    return this.service.cancel(id);
  }
}
