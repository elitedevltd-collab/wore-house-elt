import { Injectable, Controller, Get, Post, Patch, Delete, Body, Param, Module, UseGuards, NotFoundException, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';

@Injectable()
class CustomersService {
  constructor(private prisma: PrismaService) {}

  findAll(search?: string) {
    return this.prisma.customer.findMany({
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
    const customer = await this.prisma.customer.findUnique({ where: { id } });
    if (!customer) throw new NotFoundException('العميل غير موجود - Customer not found');
    return customer;
  }

  create(dto: any) {
    return this.prisma.customer.create({ data: dto });
  }

  update(id: string, dto: any) {
    return this.prisma.customer.update({ where: { id }, data: dto });
  }

  deactivate(id: string) {
    return this.prisma.customer.update({ where: { id }, data: { isActive: false } });
  }
}

@ApiTags('customers')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('customers')
class CustomersController {
  constructor(private service: CustomersService) {}

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
  providers: [CustomersService],
  controllers: [CustomersController],
})
export class CustomersModule {}
