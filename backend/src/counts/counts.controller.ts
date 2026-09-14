import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { CountsService } from './counts.service';
import { CreateStockCountDto, SubmitCountLineDto } from './dto/count.dto';

@ApiTags('counts')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('counts')
export class CountsController {
  constructor(private service: CountsService) {}

  @RequirePermissions('stock.count')
  @Post()
  create(@Body() dto: CreateStockCountDto) {
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

  @RequirePermissions('stock.count')
  @Post(':id/lines')
  submitLine(@Param('id') id: string, @Body() dto: SubmitCountLineDto) {
    return this.service.submitLine(dto.lineId, dto.countedQty);
  }

  @RequirePermissions('stock.count')
  @Post(':id/complete')
  complete(@Param('id') id: string, @Req() req: any) {
    return this.service.complete(id, req.user.userId);
  }
}
