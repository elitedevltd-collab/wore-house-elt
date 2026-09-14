import { Injectable, Controller, Get, Post, Patch, Delete, Body, Param, Module, UseGuards, NotFoundException, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';

@Injectable()
class ProductsService {
  constructor(private prisma: PrismaService) {}

  findAll(search?: string, categoryId?: string) {
    return this.prisma.product.findMany({
      where: {
        deletedAt: null,
        ...(search
          ? {
              OR: [
                { nameAr: { contains: search, mode: 'insensitive' } },
                { nameEn: { contains: search, mode: 'insensitive' } },
                { sku: { contains: search, mode: 'insensitive' } },
                { barcode: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
        ...(categoryId ? { categoryId } : {}),
      },
      include: { category: true, uom: true },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: { category: true, uom: true, variants: true },
    });
    if (!product) throw new NotFoundException('المنتج غير موجود - Product not found');
    return product;
  }

  create(dto: any) {
    return this.prisma.product.create({ data: dto });
  }

  update(id: string, dto: any) {
    return this.prisma.product.update({ where: { id }, data: dto });
  }

  softDelete(id: string) {
    return this.prisma.product.update({ where: { id }, data: { deletedAt: new Date(), isActive: false } });
  }
}

@ApiTags('products')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('products')
class ProductsController {
  constructor(private service: ProductsService) {}

  @RequirePermissions('products.view')
  @Get()
  findAll(@Query('search') search?: string, @Query('categoryId') categoryId?: string) {
    return this.service.findAll(search, categoryId);
  }

  @RequirePermissions('products.view')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @RequirePermissions('products.create')
  @Post()
  create(@Body() dto: any) {
    return this.service.create(dto);
  }

  @RequirePermissions('products.update')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: any) {
    return this.service.update(id, dto);
  }

  @RequirePermissions('products.delete')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.softDelete(id);
  }
}

@Injectable()
class CategoriesService {
  constructor(private prisma: PrismaService) {}
  findAll() {
    return this.prisma.productCategory.findMany({ include: { children: true } });
  }
  create(dto: any) {
    return this.prisma.productCategory.create({ data: dto });
  }
}

@ApiTags('categories')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('categories')
class CategoriesController {
  constructor(private service: CategoriesService) {}

  @RequirePermissions('products.view')
  @Get()
  findAll() {
    return this.service.findAll();
  }

  @RequirePermissions('products.create')
  @Post()
  create(@Body() dto: any) {
    return this.service.create(dto);
  }
}

@Injectable()
class UomService {
  constructor(private prisma: PrismaService) {}
  findAll() {
    return this.prisma.unitOfMeasure.findMany();
  }
  create(dto: any) {
    return this.prisma.unitOfMeasure.create({ data: dto });
  }
}

@ApiTags('units-of-measure')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('units-of-measure')
class UomController {
  constructor(private service: UomService) {}

  @RequirePermissions('products.view')
  @Get()
  findAll() {
    return this.service.findAll();
  }

  @RequirePermissions('products.create')
  @Post()
  create(@Body() dto: any) {
    return this.service.create(dto);
  }
}

@Module({
  providers: [ProductsService, CategoriesService, UomService],
  controllers: [ProductsController, CategoriesController, UomController],
})
export class ProductsModule {}
