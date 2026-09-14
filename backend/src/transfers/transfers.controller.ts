import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { TransfersService } from './transfers.service';
import { CreateTransferDto } from './dto/create-transfer.dto';

@ApiTags('transfers')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('transfers')
export class TransfersController {
  constructor(private service: TransfersService) {}

  @RequirePermissions('stock.transfer')
  @Post()
  create(@Body() dto: CreateTransferDto) {
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

  @RequirePermissions('stock.transfer')
  @Post(':id/confirm')
  confirm(@Param('id') id: string, @Req() req: any) {
    return this.service.confirm(id, req.user.userId);
  }

  @RequirePermissions('stock.transfer')
  @Post(':id/receive')
  receive(@Param('id') id: string, @Req() req: any) {
    return this.service.receive(id, req.user.userId);
  }

  @RequirePermissions('stock.transfer')
  @Post(':id/cancel')
  cancel(@Param('id') id: string) {
    return this.service.cancel(id);
  }
}
