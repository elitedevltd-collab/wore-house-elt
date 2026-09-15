import { useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { Plus, Trash2, Check, X as XIcon } from 'lucide-react';
import { api } from '../lib/api';
import { useUI } from '../context/UIContext';
import { Table, Button, Modal, Field, inputClass, StatusBadge } from '../components/ui';
import { ScanButton } from '../components/ScanButton';
import { lookupBarcode, matchProductByCode } from '../lib/barcode';

type Line = { productId: string; quantity: number; unitPrice: number };

export function PurchaseOrdersPage() {
  const { t, locale } = useUI();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [supplierId, setSupplierId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [lines, setLines] = useState<Line[]>([{ productId: '', quantity: 1, unitPrice: 0 }]);

  const { data: orders } = useQuery({ queryKey: ['purchase-orders'], queryFn: async () => (await api.get('/purchase-orders')).data });
  const { data: suppliers } = useQuery({ queryKey: ['suppliers', ''], queryFn: async () => (await api.get('/suppliers')).data });
  const { data: warehouses } = useQuery({ queryKey: ['warehouses'], queryFn: async () => (await api.get('/warehouses')).data });
  const { data: products } = useQuery({ queryKey: ['products-all'], queryFn: async () => (await api.get('/products')).data });

  const createMutation = useMutation({
    mutationFn: async () =>
      api.post('/purchase-orders', {
        supplierId,
        warehouseId,
        lines: lines.filter((l) => l.productId && l.quantity > 0),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['purchase-orders'] });
      setOpen(false);
      setLines([{ productId: '', quantity: 1, unitPrice: 0 }]);
      setSupplierId('');
      setWarehouseId('');
    },
  });

  const confirmMutation = useMutation({
    mutationFn: async (id: string) => api.post(`/purchase-orders/${id}/confirm`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['purchase-orders'] });
      qc.invalidateQueries({ queryKey: ['receipts'] });
    },
  });
  const cancelMutation = useMutation({
    mutationFn: async (id: string) => api.post(`/purchase-orders/${id}/cancel`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['purchase-orders'] }),
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
        <h1 className="text-xl font-semibold">🛒 {t('أوامر الشراء', 'Purchase orders')}</h1>
        <Button onClick={() => setOpen(true)}>
          <span className="flex items-center gap-1"><Plus className="w-4 h-4" />{t('أمر شراء جديد', 'New purchase order')}</span>
        </Button>
      </div>

      <Table headers={[t('المرجع', 'Reference'), t('المورد', 'Supplier'), t('المخزن', 'Warehouse'), t('الحالة', 'Status'), t('الإجمالي', 'Total'), '']}>
        {orders?.map((o: any) => (
          <tr key={o.id}>
            <td className="px-4 py-3 font-medium">{o.reference}</td>
            <td className="px-4 py-3 text-gray-500">{o.supplier?.name}</td>
            <td className="px-4 py-3 text-gray-500">{o.warehouse?.name}</td>
            <td className="px-4 py-3"><StatusBadge status={o.status} /></td>
            <td className="px-4 py-3">{total(o.lines || []).toFixed(2)}</td>
            <td className="px-4 py-3">
              {o.status === 'DRAFT' ? (
                <div className="flex gap-2">
                  <button onClick={() => confirmMutation.mutate(o.id)} className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100" title={t('اعتماد وإنشاء أمر استلام', 'Confirm & create receipt')}>
                    <Check className="w-4 h-4" />
                  </button>
                  <button onClick={() => cancelMutation.mutate(o.id)} className="p-1.5 rounded-lg bg-red-50 text-red-700 hover:bg-red-100" title={t('إلغاء', 'Cancel')}>
                    <XIcon className="w-4 h-4" />
                  </button>
                </div>
              ) : o.status === 'CONFIRMED' ? (
                <span className="text-xs text-gray-400">{t('تم إنشاء أمر استلام', 'Receipt created')}</span>
              ) : null}
            </td>
          </tr>
        ))}
      </Table>

      {open && (
        <Modal title={t('أمر شراء جديد', 'New purchase order')} onClose={() => setOpen(false)}>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t('المورد', 'Supplier')}>
              <select className={inputClass} value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
                <option value="">{t('اختر...', 'Select...')}</option>
                {suppliers?.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
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
            <Button onClick={() => createMutation.mutate()} disabled={!supplierId || !warehouseId || createMutation.isPending}>
              {t('حفظ كمسودة', 'Save as draft')}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
