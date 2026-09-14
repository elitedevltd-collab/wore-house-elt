import { useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';
import { api } from '../lib/api';
import { useUI } from '../context/UIContext';
import { Table, Button, Modal, Field, inputClass, StatusBadge } from '../components/ui';

export function TransfersPage() {
  const { t, locale } = useUI();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [fromWarehouseId, setFromWarehouseId] = useState('');
  const [toWarehouseId, setToWarehouseId] = useState('');
  const [lines, setLines] = useState<Array<{ productId: string; quantity: number }>>([{ productId: '', quantity: 1 }]);

  const { data: transfers } = useQuery({ queryKey: ['transfers'], queryFn: async () => (await api.get('/transfers')).data });
  const { data: warehouses } = useQuery({ queryKey: ['warehouses'], queryFn: async () => (await api.get('/warehouses')).data });
  const { data: products } = useQuery({ queryKey: ['products-all'], queryFn: async () => (await api.get('/products')).data });

  const createMutation = useMutation({
    mutationFn: async () =>
      api.post('/transfers', { fromWarehouseId, toWarehouseId, lines: lines.filter((l) => l.productId && l.quantity > 0) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transfers'] });
      setOpen(false);
      setLines([{ productId: '', quantity: 1 }]);
    },
  });

  const confirmMutation = useMutation({
    mutationFn: async (id: string) => api.post(`/transfers/${id}/confirm`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['transfers'] }),
  });
  const receiveMutation = useMutation({
    mutationFn: async (id: string) => api.post(`/transfers/${id}/receive`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['transfers'] }),
  });

  function updateLine(i: number, patch: Partial<{ productId: string; quantity: number }>) {
    setLines((ls) => ls.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold">🔄 {t('التحويلات', 'Transfers')}</h1>
        <Button onClick={() => setOpen(true)}>
          <span className="flex items-center gap-1"><Plus className="w-4 h-4" />{t('تحويل جديد', 'New transfer')}</span>
        </Button>
      </div>

      <Table headers={[t('المرجع', 'Reference'), t('من', 'From'), t('إلى', 'To'), t('الحالة', 'Status'), '']}>
        {transfers?.map((r: any) => (
          <tr key={r.id}>
            <td className="px-4 py-3 font-medium">{r.reference}</td>
            <td className="px-4 py-3 text-gray-500">{r.fromWarehouse?.name}</td>
            <td className="px-4 py-3 text-gray-500">{r.toWarehouse?.name}</td>
            <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
            <td className="px-4 py-3">
              {r.status === 'DRAFT' && (
                <Button variant="secondary" onClick={() => confirmMutation.mutate(r.id)}>{t('تأكيد الخروج', 'Confirm out')}</Button>
              )}
              {r.status === 'IN_TRANSIT' && (
                <Button variant="secondary" onClick={() => receiveMutation.mutate(r.id)}>{t('تأكيد الاستلام', 'Confirm received')}</Button>
              )}
            </td>
          </tr>
        ))}
      </Table>

      {open && (
        <Modal title={t('تحويل جديد', 'New transfer')} onClose={() => setOpen(false)}>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t('من مخزن', 'From warehouse')}>
              <select className={inputClass} value={fromWarehouseId} onChange={(e) => setFromWarehouseId(e.target.value)}>
                <option value="">{t('اختر...', 'Select...')}</option>
                {warehouses?.map((w: any) => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </Field>
            <Field label={t('إلى مخزن', 'To warehouse')}>
              <select className={inputClass} value={toWarehouseId} onChange={(e) => setToWarehouseId(e.target.value)}>
                <option value="">{t('اختر...', 'Select...')}</option>
                {warehouses?.map((w: any) => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </Field>
          </div>

          <div className="text-sm font-medium mt-4 mb-2">{t('الأصناف', 'Lines')}</div>
          {lines.map((line, i) => (
            <div key={i} className="flex gap-2 mb-2 items-center">
              <select className={inputClass} value={line.productId} onChange={(e) => updateLine(i, { productId: e.target.value })}>
                <option value="">{t('المنتج...', 'Product...')}</option>
                {products?.map((p: any) => (
                  <option key={p.id} value={p.id}>{locale === 'ar' ? p.nameAr : p.nameEn} ({p.sku})</option>
                ))}
              </select>
              <input type="number" className={`${inputClass} w-24`} value={line.quantity} onChange={(e) => updateLine(i, { quantity: Number(e.target.value) })} />
              <button onClick={() => setLines((ls) => ls.filter((_, idx) => idx !== i))} className="p-2 text-red-600">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          <button onClick={() => setLines((ls) => [...ls, { productId: '', quantity: 1 }])} className="text-sm text-brand-600 mb-4">
            + {t('إضافة صنف', 'Add line')}
          </button>

          <div className="flex justify-end gap-2 mt-4">
            <Button variant="secondary" onClick={() => setOpen(false)}>{t('إلغاء', 'Cancel')}</Button>
            <Button onClick={() => createMutation.mutate()} disabled={!fromWarehouseId || !toWarehouseId}>
              {t('حفظ كمسودة', 'Save as draft')}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
