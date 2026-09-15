import { Injectable, Controller, Get, Post, Patch, Delete, Body, Param, Module, UseGuards, NotFoundException, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';

@Injectable()
class SuppliersService {
  constructor(private prisma: PrismaService) {}

  findAll(search?: string) {
    return this.prisma.supplier.findMany({
      where: search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
              { phone: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {},
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const supplier = await this.prisma.supplier.findUnique({ where: { id } });
    if (!supplier) throw new NotFoundException('المورد غير موجود - Supplier not found');
    return supplier;
  }

  create(dto: any) {
    return this.prisma.supplier.create({ data: dto });
  }

  update(id: string, dto: any) {
    return this.prisma.supplier.update({ where: { id }, data: dto });
  }

  deactivate(id: string) {
    return this.prisma.supplier.update({ where: { id }, data: { isActive: false } });
  }
}

@ApiTags('suppliers')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('suppliers')
class SuppliersController {
  constructor(private service: SuppliersService) {}

  @RequirePermissions('partners.view')
  @Get()
  findAll(@Query('search') search?: string) {
    return this.service.findAll(search);
  }

  @RequirePermissions('partners.view')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @RequirePermissions('partners.manage')
  @Post()
  create(@Body() dto: any) {
    return this.service.create(dto);
  }

  @RequirePermissions('partners.manage')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: any) {
    return this.service.update(id, dto);
  }

  @RequirePermissions('partners.manage')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.deactivate(id);
  }
}

@Module({
  providers: [SuppliersService],
  controllers: [SuppliersController],
})
export class SuppliersModule {}
