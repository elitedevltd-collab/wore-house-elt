import { BadRequestException, Body, Controller, Get, Param, Post, Query, Res, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { BarcodeService, BarcodeSymbology } from './barcode.service';
import { PrintLabelsDto } from './dto/print-labels.dto';

@ApiTags('barcode')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('barcode')
export class BarcodeController {
  constructor(private service: BarcodeService) {}

  /** مسح كود (باركود منتج/SKU أو كود موقع) وإرجاع المطابقة - يُستخدم بعد قراءة الكاميرا/جهاز السكانر */
  @RequirePermissions('products.view')
  @Get('lookup/:code')
  lookup(@Param('code') code: string) {
    return this.service.lookup(code);
  }

  /** صورة باركود/QR جاهزة (PNG) لعرضها في الواجهة أو تنزيلها */
  @RequirePermissions('products.view')
  @Get('image')
  async image(
    @Query('type') type: BarcodeSymbology = 'code128',
    @Query('value') value: string,
    @Query('text') text: string | undefined,
    @Res() res: Response,
  ) {
    if (type !== 'code128' && type !== 'qrcode') {
      throw new BadRequestException('type لازم يكون code128 أو qrcode - type must be code128 or qrcode');
    }
    const png = await this.service.generateImage(type, value, text === '1' || text === 'true');
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.end(png);
  }

  /** طباعة شيت ملصقات (A4) لمنتج/موقع أو أكتر، كل ملصق فيه Code128 + QR + الاسم بالعربي والإنجليزي */
  @RequirePermissions('products.print_labels')
  @Post('labels/print')
  async printLabels(@Body() dto: PrintLabelsDto, @Res() res: Response) {
    const pdf = await this.service.printLabels(dto.items);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="labels.pdf"');
    res.end(pdf);
  }
}
