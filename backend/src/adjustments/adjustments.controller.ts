import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { AdjustmentsService } from './adjustments.service';
import { CreateAdjustmentDto } from './dto/create-adjustment.dto';

@ApiTags('adjustments')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('adjustments')
export class AdjustmentsController {
  constructor(private service: AdjustmentsService) {}

  @RequirePermissions('stock.adjust')
  @Post()
  create(@Body() dto: CreateAdjustmentDto) {
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

  @RequirePermissions('stock.adjust')
  @Post(':id/confirm')
  confirm(@Param('id') id: string, @Req() req: any) {
    return this.service.confirm(id, req.user.userId);
  }
}
