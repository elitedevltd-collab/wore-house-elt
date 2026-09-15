import * as path from 'path';
import PDFDocument from 'pdfkit';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const ArabicReshaper = require('arabic-reshaper');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const bidiFactory = require('bidi-js');

const bidi = bidiFactory();

/**
 * دعم اللغة العربية في تقارير وملصقات الـ PDF
 * Arabic support for PDF reports & labels.
 *
 * PDFKit لا يدعم تشكيل النصوص العربية (contextual shaping) ولا اتجاه RTL من تلقائيًا،
 * فبنستخدم هنا:
 *  - arabic-reshaper: لاختيار الشكل الصحيح لكل حرف (أول/وسط/آخر/منفصل)
 *  - bidi-js: لترتيب النص بصريًا حسب خوارزمية Unicode Bidirectional Algorithm
 *  - خط Amiri (مرخّص SIL OFL 1.1) لأنه من أوضح الخطوط العربية للطباعة، مع نسخة لاتينية
 *    مطابقة للأرقام والنصوص الإنجليزية عشان الخط يفضل متناسق في نفس الملصق/التقرير.
 *
 * PDFKit has no built-in Arabic shaping/RTL support, so we reshape text into
 * presentation forms, reorder it visually per the Unicode BiDi algorithm, and
 * draw it left-to-right (which is how PDFKit always draws) split into
 * per-script runs so each run uses the matching embedded font.
 */

const FONTS_DIR = path.join(__dirname, '..', '..', '..', 'assets', 'fonts');

export const ARABIC_FONTS = {
  regular: 'ArabicRegular',
  bold: 'ArabicBold',
  latinRegular: 'ArabicLatinRegular',
  latinBold: 'ArabicLatinBold',
};

let registered = false;

/** لازم تتنادى مرة واحدة بعد إنشاء PDFDocument وقبل أي استخدام لـ drawBidiText/fitBidiText */
export function registerArabicFonts(doc: PDFKit.PDFDocument) {
  doc.registerFont(ARABIC_FONTS.regular, path.join(FONTS_DIR, 'Amiri-Regular.ttf'));
  doc.registerFont(ARABIC_FONTS.bold, path.join(FONTS_DIR, 'Amiri-Bold.ttf'));
  doc.registerFont(ARABIC_FONTS.latinRegular, path.join(FONTS_DIR, 'Amiri-Latin-Regular.ttf'));
  doc.registerFont(ARABIC_FONTS.latinBold, path.join(FONTS_DIR, 'Amiri-Latin-Bold.ttf'));
  registered = true;
}

function ensureRegistered() {
  if (!registered) {
    throw new Error('registerArabicFonts(doc) لازم تتنادى الأول - call registerArabicFonts(doc) before drawing Arabic text');
  }
}

function isArabicChar(ch: string): boolean {
  const c = ch.codePointAt(0) ?? 0;
  return (
    (c >= 0x0600 && c <= 0x06ff) ||
    (c >= 0x0750 && c <= 0x077f) ||
    (c >= 0xfb50 && c <= 0xfdff) ||
    (c >= 0xfe70 && c <= 0xfeff)
  );
}

/** يحول النص لترتيبه البصري النهائي (اللي لازم نرسمه من الشمال لليمين زي ما PDFKit بيرسم دايمًا) */
function toVisualOrder(text: string): string[] {
  const reshaped: string = ArabicReshaper.convertArabic(text);
  const chars = Array.from(reshaped);
  const embeddingLevels = bidi.getEmbeddingLevels(reshaped);
  const flips: Array<[number, number]> = bidi.getReorderSegments(reshaped, embeddingLevels);
  for (const [start, end] of flips) {
    let i = start;
    let j = end;
    while (i < j) {
      const tmp = chars[i];
      chars[i] = chars[j];
      chars[j] = tmp;
      i++;
      j--;
    }
  }
  return chars;
}

interface Run {
  type: 'ar' | 'la';
  text: string;
}

function splitRuns(chars: string[]): Run[] {
  const runs: Run[] = [];
  let currentText = '';
  let currentType: 'ar' | 'la' | null = null;
  for (const ch of chars) {
    const rawType: 'ar' | 'la' = isArabicChar(ch) ? 'ar' : 'la';
    // مسافة بتفضل تابعة لنوع الكلمة اللي قبلها عشان القياس والرسم يفضلوا متظبطين
    const effectiveType = ch === ' ' && currentType ? currentType : rawType;
    if (currentType === null) currentType = effectiveType;
    if (effectiveType !== currentType) {
      runs.push({ type: currentType, text: currentText });
      currentText = ch;
      currentType = effectiveType;
    } else {
      currentText += ch;
    }
  }
  if (currentText) runs.push({ type: currentType as 'ar' | 'la', text: currentText });
  return runs;
}

function fontFor(type: 'ar' | 'la', bold: boolean) {
  if (type === 'ar') return bold ? ARABIC_FONTS.bold : ARABIC_FONTS.regular;
  return bold ? ARABIC_FONTS.latinBold : ARABIC_FONTS.latinRegular;
}

export interface BidiTextOptions {
  fontSize?: number;
  bold?: boolean;
  align?: 'right' | 'left' | 'center';
  color?: string;
}

/** بيرجع عرض النص الكامل من غير ما يرسمه - مفيد قبل الرسم عشان نعرف هل هيدخل في المساحة المتاحة */
export function measureBidiText(doc: PDFKit.PDFDocument, text: string, fontSize: number, bold = false): number {
  ensureRegistered();
  const runs = splitRuns(toVisualOrder(text));
  doc.fontSize(fontSize);
  return runs.reduce((sum, run) => sum + doc.font(fontFor(run.type, bold)).widthOfString(run.text), 0);
}

/** بيرسم سطر واحد من نص عربي/إنجليزي مختلط، بمحاذاة صحيحة واتجاه صحيح */
export function drawBidiText(
  doc: PDFKit.PDFDocument,
  text: string,
  x: number,
  y: number,
  width: number,
  opts: BidiTextOptions = {},
) {
  ensureRegistered();
  const { fontSize = 11, bold = false, align = 'right', color = '#000000' } = opts;
  const runs = splitRuns(toVisualOrder(text));

  doc.fontSize(fontSize).fillColor(color);
  const totalWidth = runs.reduce((sum, run) => sum + doc.font(fontFor(run.type, bold)).widthOfString(run.text), 0);

  let startX = x;
  if (align === 'right') startX = x + width - totalWidth;
  else if (align === 'center') startX = x + (width - totalWidth) / 2;

  doc.text('', startX, y, { continued: false, lineBreak: false });
  runs.forEach((run, i) => {
    doc.font(fontFor(run.type, bold)).text(run.text, { continued: i < runs.length - 1, lineBreak: false });
  });
  doc.fillColor('#000000');
}

/**
 * بيقلل حجم الخط تدريجيًا، ولو لسه مش هيدخل بيقص النص ويضيف "…"، عشان يتظبط جوه عرض معين
 * (مفيد جدًا في الملصقات الصغيرة اللي المساحة فيها محدودة)
 */
export function fitBidiText(
  doc: PDFKit.PDFDocument,
  text: string,
  maxWidth: number,
  preferredFontSize: number,
  bold = false,
  minFontSize = 6,
): { text: string; fontSize: number } {
  let size = preferredFontSize;
  while (size > minFontSize) {
    if (measureBidiText(doc, text, size, bold) <= maxWidth) return { text, fontSize: size };
    size -= 0.5;
  }
  size = minFontSize;
  let truncated = text;
  while (truncated.length > 1) {
    truncated = truncated.slice(0, -1);
    const candidate = `${truncated}…`;
    if (measureBidiText(doc, candidate, size, bold) <= maxWidth) return { text: candidate, fontSize: size };
  }
  return { text: truncated, fontSize: size };
}
