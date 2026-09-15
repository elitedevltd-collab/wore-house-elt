import { useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { Plus, Trash2, Check, X as XIcon } from 'lucide-react';
import { api } from '../lib/api';
import { useUI } from '../context/UIContext';
import { Table, Button, Modal, Field, inputClass, StatusBadge } from '../components/ui';
import { ScanButton } from '../components/ScanButton';
import { lookupBarcode, matchProductByCode } from '../lib/barcode';

type Line = { productId: string; quantity: number; unitPrice: number };

export function SalesOrdersPage() {
  const { t, locale } = useUI();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [customerId, setCustomerId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [lines, setLines] = useState<Line[]>([{ productId: '', quantity: 1, unitPrice: 0 }]);
  const [errorMsg, setErrorMsg] = useState('');

  const { data: orders } = useQuery({ queryKey: ['sales-orders'], queryFn: async () => (await api.get('/sales-orders')).data });
  const { data: customers } = useQuery({ queryKey: ['customers', ''], queryFn: async () => (await api.get('/customers')).data });
  const { data: warehouses } = useQuery({ queryKey: ['warehouses'], queryFn: async () => (await api.get('/warehouses')).data });
  const { data: products } = useQuery({ queryKey: ['products-all'], queryFn: async () => (await api.get('/products')).data });

  const createMutation = useMutation({
    mutationFn: async () =>
      api.post('/sales-orders', {
        customerId,
        warehouseId,
        lines: lines.filter((l) => l.productId && l.quantity > 0),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sales-orders'] });
      setOpen(false);
      setLines([{ productId: '', quantity: 1, unitPrice: 0 }]);
      setCustomerId('');
      setWarehouseId('');
    },
  });

  const confirmMutation = useMutation({
    mutationFn: async (id: string) => api.post(`/sales-orders/${id}/confirm`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sales-orders'] });
      qc.invalidateQueries({ queryKey: ['issues'] });
    },
    onError: (err: any) => setErrorMsg(err?.response?.data?.message?.[0] || err?.response?.data?.message || 'error'),
  });
  const cancelMutation = useMutation({
    mutationFn: async (id: string) => api.post(`/sales-orders/${id}/cancel`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sales-orders'] }),
  });

  function updateLine(i: number, patch: Partial<Line>) {
    setLines((ls) => ls.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  }

  async function handleScan(code: string) {
    const local = matchProductByCode(products, code);
    const applyLine = (productId: string) =>
      setLines((ls) => {
        const emptyIdx = ls.findIndex((l) => !l.productId);
        if (emptyIdx !== -1) return ls.map((l, idx) => (idx === emptyIdx ? { ...l, productId } : l));
        return [...ls, { productId, quantity: 1, unitPrice: 0 }];
      });
    if (local) {
      applyLine(local.id);
      return;
    }
    const result = await lookupBarcode(code).catch(() => null);
    if (result?.type === 'product') applyLine(result.product.id);
  }

  const total = (ls: Line[]) => ls.reduce((s, l) => s + l.quantity * l.unitPrice, 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold">🧾 {t('أوامر البيع', 'Sales orders')}</h1>
        <Button onClick={() => setOpen(true)}>
          <span className="flex items-center gap-1"><Plus className="w-4 h-4" />{t('أمر بيع جديد', 'New sales order')}</span>
        </Button>
      </div>

      {errorMsg && <div className="mb-4 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">{errorMsg}</div>}

      <Table headers={[t('المرجع', 'Reference'), t('العميل', 'Customer'), t('المخزن', 'Warehouse'), t('الحالة', 'Status'), t('الإجمالي', 'Total'), '']}>
        {orders?.map((o: any) => (
          <tr key={o.id}>
            <td className="px-4 py-3 font-medium">{o.reference}</td>
            <td className="px-4 py-3 text-gray-500">{o.customer?.name}</td>
            <td className="px-4 py-3 text-gray-500">{o.warehouse?.name}</td>
            <td className="px-4 py-3"><StatusBadge status={o.status} /></td>
            <td className="px-4 py-3">{total(o.lines || []).toFixed(2)}</td>
            <td className="px-4 py-3">
              {o.status === 'DRAFT' ? (
                <div className="flex gap-2">
                  <button onClick={() => confirmMutation.mutate(o.id)} className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100" title={t('اعتماد وإنشاء أمر صرف', 'Confirm & create issue')}>
                    <Check className="w-4 h-4" />
                  </button>
                  <button onClick={() => cancelMutation.mutate(o.id)} className="p-1.5 rounded-lg bg-red-50 text-red-700 hover:bg-red-100" title={t('إلغاء', 'Cancel')}>
                    <XIcon className="w-4 h-4" />
                  </button>
                </div>
              ) : o.status === 'CONFIRMED' ? (
                <span className="text-xs text-gray-400">{t('تم إنشاء أمر صرف', 'Issue created')}</span>
              ) : null}
            </td>
          </tr>
        ))}
      </Table>

      {open && (
        <Modal title={t('أمر بيع جديد', 'New sales order')} onClose={() => setOpen(false)}>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t('العميل', 'Customer')}>
              <select className={inputClass} value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
                <option value="">{t('اختر...', 'Select...')}</option>
                {customers?.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
            <Field label={t('المخزن', 'Warehouse')}>
              <select className={inputClass} value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)}>
                <option value="">{t('اختر...', 'Select...')}</option>
                {warehouses?.map((w: any) => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </Field>
          </div>

          <div className="flex items-center justify-between mt-4 mb-2">
            <div className="text-sm font-medium">{t('الأصناف', 'Lines')}</div>
            <ScanButton label={t('مسح صنف', 'Scan item')} keepOpenAfterScan onDetected={handleScan} />
          </div>
          {lines.map((line, i) => (
            <div key={i} className="flex gap-2 mb-2 items-center">
              <select className={inputClass} value={line.productId} onChange={(e) => updateLine(i, { productId: e.target.value })}>
                <option value="">{t('المنتج...', 'Product...')}</option>
                {products?.map((p: any) => (
                  <option key={p.id} value={p.id}>{locale === 'ar' ? p.nameAr : p.nameEn} ({p.sku})</option>
                ))}
              </select>
              <input type="number" className={`${inputClass} w-20`} value={line.quantity} onChange={(e) => updateLine(i, { quantity: Number(e.target.value) })} title={t('الكمية', 'Quantity')} />
              <input type="number" className={`${inputClass} w-24`} value={line.unitPrice} onChange={(e) => updateLine(i, { unitPrice: Number(e.target.value) })} title={t('سعر الوحدة', 'Unit price')} />
              <button onClick={() => setLines((ls) => ls.filter((_, idx) => idx !== i))} className="p-2 text-red-600">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          <button onClick={() => setLines((ls) => [...ls, { productId: '', quantity: 1, unitPrice: 0 }])} className="text-sm text-brand-600 mb-2">
            + {t('إضافة صنف', 'Add line')}
          </button>
          <div className="text-sm text-gray-500 mb-4">{t('الإجمالي', 'Total')}: {total(lines).toFixed(2)}</div>

          <div className="flex justify-end gap-2 mt-4">
            <Button variant="secondary" onClick={() => setOpen(false)}>{t('إلغاء', 'Cancel')}</Button>
            <Button onClick={() => createMutation.mutate()} disabled={!customerId || !warehouseId || createMutation.isPending}>
              {t('حفظ كمسودة', 'Save as draft')}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
