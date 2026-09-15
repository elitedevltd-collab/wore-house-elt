import { useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { Plus, Trash2, Check, X as XIcon } from 'lucide-react';
import { api } from '../lib/api';
import { useUI } from '../context/UIContext';
import { Table, Button, Modal, Field, inputClass, StatusBadge } from '../components/ui';
import { ScanButton } from '../components/ScanButton';
import { lookupBarcode, matchProductByCode } from '../lib/barcode';

export function ReceiptsPage() {
  const { t, locale } = useUI();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [warehouseId, setWarehouseId] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [lines, setLines] = useState<Array<{ productId: string; quantity: number; lotNumber: string }>>([
    { productId: '', quantity: 1, lotNumber: '' },
  ]);

  const { data: receipts } = useQuery({
    queryKey: ['receipts'],
    queryFn: async () => (await api.get('/receipts')).data,
  });
  const { data: warehouses } = useQuery({
    queryKey: ['warehouses'],
    queryFn: async () => (await api.get('/warehouses')).data,
  });
  const { data: suppliers } = useQuery({
    queryKey: ['suppliers', ''],
    queryFn: async () => (await api.get('/suppliers')).data,
  });
  const { data: products } = useQuery({
    queryKey: ['products-all'],
    queryFn: async () => (await api.get('/products')).data,
  });

  const createMutation = useMutation({
    mutationFn: async () =>
      api.post('/receipts', {
        warehouseId,
        supplierId: supplierId || undefined,
        lines: lines.filter((l) => l.productId && l.quantity > 0),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['receipts'] });
      setOpen(false);
      setLines([{ productId: '', quantity: 1, lotNumber: '' }]);
      setWarehouseId('');
      setSupplierId('');
    },
  });

  const confirmMutation = useMutation({
    mutationFn: async (id: string) => api.post(`/receipts/${id}/confirm`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['receipts'] }),
  });
  const cancelMutation = useMutation({
    mutationFn: async (id: string) => api.post(`/receipts/${id}/cancel`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['receipts'] }),
  });

  function updateLine(i: number, patch: Partial<{ productId: string; quantity: number; lotNumber: string }>) {
    setLines((ls) => ls.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  }

  function applyScannedProduct(productId: string) {
    setLines((ls) => {
      const emptyIdx = ls.findIndex((l) => !l.productId);
      if (emptyIdx !== -1) {
        return ls.map((l, idx) => (idx === emptyIdx ? { ...l, productId } : l));
      }
      const lastIdx = ls.length - 1;
      if (ls[lastIdx]?.productId === productId) {
        return ls.map((l, idx) => (idx === lastIdx ? { ...l, quantity: l.quantity + 1 } : l));
      }
      return [...ls, { productId, quantity: 1, lotNumber: '' }];
    });
  }

  async function handleScan(code: string) {
    const local = matchProductByCode(products, code);
    if (local) {
      applyScannedProduct(local.id);
      return;
    }
    const result = await lookupBarcode(code).catch(() => null);
    if (result?.type === 'product') {
      applyScannedProduct(result.product.id);
    } else {
      alert(t(`الكود "${code}" مش متسجل لأي منتج`, `Code "${code}" does not match any product`));
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold">📥 {t('الاستلام', 'Receipts')}</h1>
        <Button onClick={() => setOpen(true)}>
          <span className="flex items-center gap-1"><Plus className="w-4 h-4" />{t('استلام جديد', 'New receipt')}</span>
        </Button>
      </div>

      <Table headers={[t('المرجع', 'Reference'), t('المخزن', 'Warehouse'), t('المورد', 'Supplier'), t('الحالة', 'Status'), t('عدد الأسطر', 'Lines'), '']}>
        {receipts?.map((r: any) => (
          <tr key={r.id}>
            <td className="px-4 py-3 font-medium">{r.reference}</td>
            <td className="px-4 py-3 text-gray-500">{r.warehouse?.name}</td>
            <td className="px-4 py-3 text-gray-500">{r.supplier?.name || '-'}</td>
            <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
            <td className="px-4 py-3">{r.lines?.length}</td>
            <td className="px-4 py-3">
              {r.status === 'DRAFT' && (
                <div className="flex gap-2">
                  <button onClick={() => confirmMutation.mutate(r.id)} className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100" title={t('تأكيد', 'Confirm')}>
                    <Check className="w-4 h-4" />
                  </button>
                  <button onClick={() => cancelMutation.mutate(r.id)} className="p-1.5 rounded-lg bg-red-50 text-red-700 hover:bg-red-100" title={t('إلغاء', 'Cancel')}>
                    <XIcon className="w-4 h-4" />
                  </button>
                </div>
              )}
            </td>
          </tr>
        ))}
      </Table>

      {open && (
        <Modal title={t('استلام بضاعة جديد', 'New receipt')} onClose={() => setOpen(false)}>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t('المخزن', 'Warehouse')}>
              <select className={inputClass} value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)}>
                <option value="">{t('اختر...', 'Select...')}</option>
                {warehouses?.map((w: any) => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </Field>
            <Field label={t('المورد (اختياري)', 'Supplier (optional)')}>
              <select className={inputClass} value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
                <option value="">{t('بدون', 'None')}</option>
                {suppliers?.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </Field>
          </div>

          <div className="flex items-center justify-between mt-4 mb-2">
            <div className="text-sm font-medium">{t('الأصناف', 'Lines')}</div>
            <ScanButton
              label={t('مسح صنف', 'Scan item')}
              title={t('امسح باركود الصنف لإضافته تلقائيًا', 'Scan an item barcode to add it automatically')}
              keepOpenAfterScan
              onDetected={handleScan}
            />
          </div>
          {lines.map((line, i) => (
            <div key={i} className="flex gap-2 mb-2 items-center">
              <select className={inputClass} value={line.productId} onChange={(e) => updateLine(i, { productId: e.target.value })}>
                <option value="">{t('المنتج...', 'Product...')}</option>
                {products?.map((p: any) => (
                  <option key={p.id} value={p.id}>{locale === 'ar' ? p.nameAr : p.nameEn} ({p.sku})</option>
                ))}
              </select>
              <input
                type="number" className={`${inputClass} w-24`} value={line.quantity}
                onChange={(e) => updateLine(i, { quantity: Number(e.target.value) })}
              />
              <input
                placeholder={t('لوت (اختياري)', 'Lot (optional)')} className={`${inputClass} w-32`} value={line.lotNumber}
                onChange={(e) => updateLine(i, { lotNumber: e.target.value })}
              />
              <button onClick={() => setLines((ls) => ls.filter((_, idx) => idx !== i))} className="p-2 text-red-600">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          <button
            onClick={() => setLines((ls) => [...ls, { productId: '', quantity: 1, lotNumber: '' }])}
            className="text-sm text-brand-600 mb-4"
          >
            + {t('إضافة صنف', 'Add line')}
          </button>

          <div className="flex justify-end gap-2 mt-4">
            <Button variant="secondary" onClick={() => setOpen(false)}>{t('إلغاء', 'Cancel')}</Button>
            <Button onClick={() => createMutation.mutate()} disabled={!warehouseId || createMutation.isPending}>
              {t('حفظ كمسودة', 'Save as draft')}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
