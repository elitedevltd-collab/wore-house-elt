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

  /**
   * بيدور على المنتج أو الموقع اللي يطابق الكود الممسوح (باركود المنتج، SKU، أو كود الموقع/الرف)
   * Resolves a scanned code against products (by barcode or SKU) then warehouse locations (by code).
   */
  async lookup(rawCode: string) {
    const code = rawCode.trim();
    if (!code) throw new BadRequestException('الكود فارغ - Empty code');

    const product = await this.prisma.product.findFirst({
      where: {
        deletedAt: null,
        OR: [{ barcode: code }, { sku: { equals: code, mode: 'insensitive' } }],
      },
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

  /** بيولّد صورة باركود Code128 أو QR جاهزة للعرض/الطباعة */
  async generateImage(bcid: BarcodeSymbology, value: string, includeText: boolean): Promise<Buffer> {
    if (!value) throw new BadRequestException('القيمة مطلوبة - value is required');
    const toBuffer = bwipjs.toBuffer as unknown as (options: Record<string, unknown>) => Promise<Buffer>;
    if (bcid === 'code128') {
      return toBuffer({
        bcid: 'code128',
        text: value,
        scale: 3,
        height: 12,
        includetext: includeText,
        textxalign: 'center',
      });
    }
    return toBuffer({
      bcid: 'qrcode',
      text: value,
      scale: 4,
      eclevel: 'M',
    });
  }

  private qrPayload(entry: { type: 'product' | 'location'; id: string; sku?: string }): string {
    return JSON.stringify(entry.type === 'product' ? { t: 'p', id: entry.id, sku: entry.sku } : { t: 'l', id: entry.id });
  }

  /**
   * بيولّد ملف PDF بشيت ملصقات (A4، 3 أعمدة × 8 صفوف = 24 ملصق بالصفحة) لمنتجات و/أو مواقع مخزنية،
   * كل ملصق فيه باركود Code128 + QR + اسم الصنف بالعربي والإنجليزي وSKU - جاهز للطباعة على ورق ملصقات عادي.
   * Generates a printable A4 label sheet (3x8 grid) with Code128 + QR + bilingual text per item.
   */
  async printLabels(items: LabelItemDto[]): Promise<Buffer> {
    type LabelData = { code: string; qrValue: string; titleAr: string; titleEn: string; subtitle: string };
    const labels: LabelData[] = [];

    for (const item of items) {
      if (item.type === 'product') {
        const product = await this.prisma.product.findUnique({ where: { id: item.id } });
        if (!product) continue;
        const code = product.barcode || product.sku;
        for (let i = 0; i < item.qty; i++) {
          labels.push({
            code,
            qrValue: this.qrPayload({ type: 'product', id: product.id, sku: product.sku }),
            titleAr: product.nameAr,
            titleEn: product.nameEn,
            subtitle: product.sku,
          });
        }
      } else {
        const location = await this.prisma.warehouseLocation.findUnique({
          where: { id: item.id },
          include: { warehouse: true },
        });
        if (!location) continue;
        const code = `${location.warehouse.code}-${location.code}`;
        for (let i = 0; i < item.qty; i++) {
          labels.push({
            code,
            qrValue: this.qrPayload({ type: 'location', id: location.id }),
            titleAr: location.name,
            titleEn: location.warehouse.name,
            subtitle: code,
          });
        }
      }
    }

    if (labels.length === 0) {
      throw new BadRequestException('مفيش أصناف صالحة للطباعة - No valid items to print');
    }

    return this.renderLabelSheet(labels);
  }

  private async renderLabelSheet(
    labels: Array<{ code: string; qrValue: string; titleAr: string; titleEn: string; subtitle: string }>,
  ): Promise<Buffer> {
    const doc = new PDFDocument({ size: 'A4', margin: 20, autoFirstPage: false });
    registerArabicFonts(doc);

    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    const finished = new Promise<Buffer>((resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
    });

    const cols = 3;
    const rows = 8;
    const margin = 20;
    const pageWidth = doc.page?.width ?? 595.28;
    const pageHeight = doc.page?.height ?? 841.89;
    const cellW = (pageWidth - margin * 2) / cols;
    const cellH = (pageHeight - margin * 2) / rows;
    const perPage = cols * rows;

    for (let idx = 0; idx < labels.length; idx++) {
      if (idx % perPage === 0) doc.addPage();
      const label = labels[idx];
      const posInPage = idx % perPage;
      const col = posInPage % cols;
      const row = Math.floor(posInPage / cols);
      const x = margin + col * cellW;
      const y = margin + row * cellH;
      const pad = 6;
      const innerW = cellW - pad * 2;

      doc.roundedRect(x + 2, y + 2, cellW - 4, cellH - 4, 3).lineWidth(0.5).strokeColor('#cccccc').stroke();

      const barcodePng = await this.generateImage('code128', label.code, false);
      const barcodeH = cellH * 0.34;
      const barcodeW = Math.min(innerW * 0.72, barcodeH * 3.4);
      doc.image(barcodePng, x + pad, y + pad, { width: barcodeW, height: barcodeH });

      const qrSize = cellH * 0.34;
      const qrPng = await this.generateImage('qrcode', label.qrValue, false);
      doc.image(qrPng, x + pad + barcodeW + 4, y + pad, { width: qrSize, height: qrSize });

      const textY = y + pad + barcodeH + 6;
      const titleFit = fitBidiText(doc, label.titleAr, innerW, 8, true);
      drawBidiText(doc, titleFit.text, x + pad, textY, innerW, { fontSize: titleFit.fontSize, bold: true, align: 'right' });

      const subtitleY = textY + 13;
      doc
        .font('Helvetica')
        .fontSize(7)
        .fillColor('#444444')
        .text(label.titleEn, x + pad, subtitleY, { width: innerW, height: 9, ellipsis: true });

      const codeY = subtitleY + 11;
      doc
        .font('Helvetica')
        .fontSize(7.5)
        .fillColor('#000000')
        .text(label.code, x + pad, codeY, { width: innerW, height: 10, ellipsis: true });
    }

    doc.end();
    return finished;
  }
}
