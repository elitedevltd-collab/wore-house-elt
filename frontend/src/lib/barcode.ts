import { api } from './api';

/** بيدور على منتج في ليستة منتجات محمّلة already بمطابقة الباركود أو الـ SKU بالظبط */
export function matchProductByCode(products: any[] | undefined, code: string): any | undefined {
  if (!products) return undefined;
  const normalized = code.trim().toLowerCase();
  return products.find(
    (p) => (p.barcode && String(p.barcode).toLowerCase() === normalized) || String(p.sku).toLowerCase() === normalized,
  );
}

export interface BarcodeLookupResult {
  type: 'product' | 'location' | null;
  product?: any;
  location?: any;
}

/** استدعاء لو الكود مش موجود في الليستة المحمّلة محليًا (fallback على السيرفر) */
export async function lookupBarcode(code: string): Promise<BarcodeLookupResult> {
  const { data } = await api.get(`/barcode/lookup/${encodeURIComponent(code)}`);
  return data;
}
