import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Minus, Plus, Printer, Search, Trash2, Warehouse as WarehouseIcon } from 'lucide-react';
import { api } from '../lib/api';
import { useUI } from '../context/UIContext';
import { Button, inputClass } from '../components/ui';
import { ScanButton } from '../components/ScanButton';
import { BarcodeImage } from '../components/BarcodeImage';
import { lookupBarcode } from '../lib/barcode';

type LabelItem = { type: 'product' | 'location'; id: string; qty: number; title: string; subtitle: string; code: string };

export function LabelsPage() {
  const { t, locale } = useUI();
  const location = useLocation();
  const [search, setSearch] = useState('');
  const [items, setItems] = useState<LabelItem[]>([]);
  const [tab, setTab] = useState<'products' | 'locations'>('products');

  const { data: products } = useQuery({
    queryKey: ['products', search],
    queryFn: async () => (await api.get('/products', { params: { search } })).data,
  });
  const { data: warehouses } = useQuery({ queryKey: ['warehouses'], queryFn: async () => (await api.get('/warehouses')).data });

  const printMutation = useMutation({
    mutationFn: async () =>
      api.post(
        '/barcode/labels/print',
        { items: items.map((i) => ({ type: i.type, id: i.id, qty: i.qty })) },
        { responseType: 'blob' },
      ),
    onSuccess: (res) => {
      const url = URL.createObjectURL(res.data);
      window.open(url, '_blank');
    },
  });

  useEffect(() => {
    const productId = (location.state as any)?.productId;
    if (productId) addProductById(productId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function addProductById(id: string) {
    const { data: product } = await api.get(`/products/${id}`);
    addItem({
      type: 'product',
      id: product.id,
      qty: 1,
      title: locale === 'ar' ? product.nameAr : product.nameEn,
      subtitle: product.sku,
      code: product.barcode || product.sku,
    });
  }

  function addItem(item: LabelItem) {
    setItems((prev) => {
      const existing = prev.find((i) => i.type === item.type && i.id === item.id);
      if (existing) return prev.map((i) => (i === existing ? { ...i, qty: i.qty + 1 } : i));
      return [...prev, item];
    });
  }

  function addProduct(p: any) {
    addItem({
      type: 'product',
      id: p.id,
      qty: 1,
      title: locale === 'ar' ? p.nameAr : p.nameEn,
      subtitle: p.sku,
      code: p.barcode || p.sku,
    });
  }

  function addLocation(loc: any, warehouse: any) {
    addItem({
      type: 'location',
      id: loc.id,
      qty: 1,
      title: loc.name,
      subtitle: warehouse.name,
      code: `${warehouse.code}-${loc.code}`,
    });
  }

  function updateQty(idx: number, qty: number) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, qty: Math.max(1, qty) } : it)));
  }

  function removeItem(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleScan(code: string) {
    const localMatch = products?.find((p: any) => (p.barcode && p.barcode === code) || p.sku.toLowerCase() === code.toLowerCase());
    if (localMatch) {
      addProduct(localMatch);
      return;
    }
    const result = await lookupBarcode(code).catch(() => null);
    if (result?.type === 'product') addProduct(result.product);
    else if (result?.type === 'location') addLocation(result.location, result.location.warehouse);
    else alert(t(`الكود "${code}" مش متسجل`, `Code "${code}" not found`));
  }

  const totalLabels = useMemo(() => items.reduce((s, i) => s + i.qty, 0), [items]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold">🏷️ {t('طباعة الملصقات', 'Print labels')}</h1>
        <ScanButton label={t('مسح', 'Scan')} keepOpenAfterScan onDetected={handleScan} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <div className="flex border-b border-gray-200 dark:border-gray-800 mb-3">
            <button
              onClick={() => setTab('products')}
              className={`px-3 py-2 text-sm font-medium ${tab === 'products' ? 'text-brand-600 border-b-2 border-brand-600' : 'text-gray-500'}`}
            >
              {t('منتجات', 'Products')}
            </button>
            <button
              onClick={() => setTab('locations')}
              className={`px-3 py-2 text-sm font-medium ${tab === 'locations' ? 'text-brand-600 border-b-2 border-brand-600' : 'text-gray-500'}`}
            >
              {t('مواقع/أرفف', 'Locations')}
            </button>
          </div>

          {tab === 'products' && (
            <div>
              <div className="relative mb-3">
                <Search className="w-4 h-4 absolute top-2.5 start-3 text-gray-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t('بحث بالاسم أو SKU أو الباركود...', 'Search name, SKU, or barcode...')}
                  className={`${inputClass} ps-9`}
                />
              </div>
              <div className="border border-gray-200 dark:border-gray-800 rounded-2xl max-h-96 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800">
                {products?.map((p: any) => (
                  <button
                    key={p.id}
                    onClick={() => addProduct(p)}
                    className="w-full flex items-center justify-between px-4 py-2.5 text-start hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    <div className="text-sm">
                      <div>{locale === 'ar' ? p.nameAr : p.nameEn}</div>
                      <div className="text-xs text-gray-400">{p.sku} {p.barcode ? `· ${p.barcode}` : ''}</div>
                    </div>
                    <Plus className="w-4 h-4 text-brand-600 shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {tab === 'locations' && (
            <div className="border border-gray-200 dark:border-gray-800 rounded-2xl max-h-96 overflow-y-auto">
              {warehouses?.map((w: any) => (
                <div key={w.id} className="border-b border-gray-100 dark:border-gray-800 last:border-0">
                  <div className="px-4 py-2 text-xs font-medium text-gray-500 bg-gray-50 dark:bg-gray-800/60 flex items-center gap-1.5">
                    <WarehouseIcon className="w-3.5 h-3.5" />
                    {w.name}
                  </div>
                  {w.locations?.map((loc: any) => (
                    <button
                      key={loc.id}
                      onClick={() => addLocation(loc, w)}
                      className="w-full flex items-center justify-between px-4 py-2 text-start hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      <div className="text-sm">
                        {loc.name} <span className="text-xs text-gray-400">({w.code}-{loc.code})</span>
                      </div>
                      <Plus className="w-4 h-4 text-brand-600 shrink-0" />
                    </button>
                  ))}
                  {(!w.locations || w.locations.length === 0) && (
                    <div className="px-4 py-2 text-xs text-gray-400">{t('لا يوجد مواقع', 'No locations')}</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="text-sm font-medium mb-3">
            {t('المحدد للطباعة', 'Selected for printing')} ({totalLabels} {t('ملصق', 'labels')})
          </div>
          {items.length === 0 ? (
            <p className="text-sm text-gray-400">{t('اختر منتجات أو مواقع من الشمال، أو امسح باركود.', 'Pick products or locations on the left, or scan a barcode.')}</p>
          ) : (
            <div className="space-y-2 mb-4">
              {items.map((item, idx) => (
                <div key={`${item.type}-${item.id}`} className="flex items-center gap-3 border border-gray-200 dark:border-gray-800 rounded-xl p-2.5">
                  <BarcodeImage type="code128" value={item.code} className="h-10 w-24 object-contain" />
                  <div className="text-sm flex-1 min-w-0">
                    <div className="truncate">{item.title}</div>
                    <div className="text-xs text-gray-400 truncate">{item.subtitle}</div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => updateQty(idx, item.qty - 1)} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800">
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <input
                      type="number"
                      value={item.qty}
                      onChange={(e) => updateQty(idx, Number(e.target.value))}
                      className={`${inputClass} w-14 text-center px-1 py-1`}
                    />
                    <button onClick={() => updateQty(idx, item.qty + 1)} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800">
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <button onClick={() => removeItem(idx)} className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <Button onClick={() => printMutation.mutate()} disabled={items.length === 0 || printMutation.isPending}>
            <span className="flex items-center gap-1.5">
              <Printer className="w-4 h-4" />
              {printMutation.isPending ? t('جارِ التجهيز...', 'Preparing...') : t('طباعة الشيت (A4)', 'Print sheet (A4)')}
            </span>
          </Button>
        </div>
      </div>
    </div>
  );
}
