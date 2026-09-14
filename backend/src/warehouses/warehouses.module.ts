import { Injectable, Controller, Get, Post, Patch, Body, Param, Module, UseGuards, NotFoundException } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';

@Injectable()
class WarehousesService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.warehouse.findMany({
      where: { deletedAt: null },
      include: { locations: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const wh = await this.prisma.warehouse.findUnique({ where: { id }, include: { locations: true } });
    if (!wh) throw new NotFoundException('المخزن غير موجود - Warehouse not found');
    return wh;
  }

  create(dto: any) {
    return this.prisma.warehouse.create({ data: dto });
  }

  update(id: string, dto: any) {
    return this.prisma.warehouse.update({ where: { id }, data: dto });
  }

  softDelete(id: string) {
    return this.prisma.warehouse.update({ where: { id }, data: { deletedAt: new Date(), isActive: false } });
  }

  addLocation(warehouseId: string, dto: any) {
    return this.prisma.warehouseLocation.create({ data: { ...dto, warehouseId } });
  }
}

@ApiTags('warehouses')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('warehouses')
class WarehousesController {
  constructor(private service: WarehousesService) {}

  @RequirePermissions('warehouses.view')
  @Get()
  findAll() {
    return this.service.findAll();
  }

  @RequirePermissions('warehouses.view')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @RequirePermissions('warehouses.create')
  @Post()
  create(@Body() dto: any) {
    return this.service.create(dto);
  }

  @RequirePermissions('warehouses.update')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: any) {
    return this.service.update(id, dto);
  }

  @RequirePermissions('warehouses.create')
  @Post(':id/locations')
  addLocation(@Param('id') id: string, @Body() dto: any) {
    return this.service.addLocation(id, dto);
  }
}

@Module({
  providers: [WarehousesService],
  controllers: [WarehousesController],
})
export class WarehousesModule {}
