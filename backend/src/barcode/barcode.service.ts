import { BadRequestException, Injectable } from '@nestjs/common';

import * as bwipjs from 'bwip-js';

import PDFDocument from 'pdfkit';

import { PrismaService } from '../prisma/prisma.service';

import { drawBidiText, fitBidiText, registerArabicFonts } from '../common/pdf/arabic-text';

import { LabelItemDto } from './dto/print-labels.dto';



export type BarcodeSymbology = 'code128' | 'qrcode';



@Injectable()
  
export class BarcodeService {
  
  constructor(private prisma: PrismaService) {}
  

  
  async lookup(rawCode: string) {
    
    const code = rawCode.trim();
    
    if (!code) throw new BadRequestException('الكود فارغ - Empty code');
    
    const product = await this.prisma.product.findFirst({
      
      where: { deletedAt: null, OR: [{ barcode: code }, { sku: { equals: code, mode: 'insensitive' } }] },
      
      include: { category: true, uom: true },
      
    });
    
    if (product) return { type: 'product' as const, product };
    
    const location = await this.prisma.warehouseLocation.findFirst({
      
      where: { code: { equals: code, mode: 'insensitive' } },
      
      include: { warehouse: true },
      
    });
    
    if (location) return { type: 'location' as const, location };
    
    return { type: null, code };
    
  }
  

  
  async generateImage(bcid: BarcodeSymbology, value: string, includeText: boolean): Promise<Buffer> {
    
    if (!value) throw new BadRequestException('القيمة مطلوبة - value is required');
    
    const toBuffer = bwipjs.toBuffer as unknown as (options: Record<string, unknown>) => Promise<Buffer>;
    
    if (bcid === 'code128') {
      
      return toBuffer({ bcid: 'code128', text: value, scale: 3, height: 12, includetext: includeText, textxalign: 'center' });
      
    }
    
    return toBuffer({ bcid: 'qrcode', text: value, scale: 4, eclevel: 'M' });
    
  }
  

  
  private qrPayload(entry: { type: 'product' | 'location'; id: string; sku?: string }): string {
    
    return JSON.stringify(entry.type === 'product' ? { t: 'p', id: entry.id, sku: entry.sku } : { t: 'l', id: entry.id });
    
  }
  

  
  async printLabels(items: LabelItemDto[]): Promise<Buffer> {
    
    type LabelData = { code: string; qrValue: string; titleAr: string; titleEn: string; subtitle: string };
    
    const labels: LabelData[] = [];
    
    for (const item of items) {
      
      if (item.type === 'product') {
        
        const product = await this.prisma.product.findUnique({ where: { id: item.id } });
        
        if (!product) continue;
        
        const code = product.barcode || product.sku;
        
        for (let i = 0; i < item.qty; i++) labels.push({ code, qrValue: this.qrPayload({ type: 'product', id: product.id, sku: product.sku }), titleAr: product.nameAr, titleEn: product.nameEn, subtitle: product.sku });
        
      } else {
        
        const location = await this.prisma.warehouseLocation.findUnique({ where: { id: item.id }, include: { warehouse: true } });
        
        if (!location) continue;
        
        const code = `${location.warehouse.code}-${location.code}`;
        
        for (let i = 0; i < item.qty; i++) labels.push({ code, qrValue: this.qrPayload({ type: 'location', id: 













































