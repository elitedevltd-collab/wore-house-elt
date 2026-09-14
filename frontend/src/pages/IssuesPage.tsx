import { useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { Plus, Trash2, Check, X as XIcon } from 'lucide-react';
import { api } from '../lib/api';
import { useUI } from '../context/UIContext';
import { Table, Button, Modal, Field, inputClass, StatusBadge } from '../components/ui';

export function IssuesPage() {
  const { t, locale } = useUI();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [warehouseId, setWarehouseId] = useState('');
  const [lines, setLines] = useState<Array<{ productId: string; quantity: number }>>([{ productId: '', quantity: 1 }]);
  const [errorMsg, setErrorMsg] = useState('');

  const { data: issues } = useQuery({ queryKey: ['issues'], queryFn: async () => (await api.get('/issues')).data });
  const { data: warehouses } = useQuery({ queryKey: ['warehouses'], queryFn: async () => (await api.get('/warehouses')).data });
  const { data: products } = useQuery({ queryKey: ['products-all'], queryFn: async () => (await api.get('/products')).data });

  const createMutation = useMutation({
    mutationFn: async () => api.post('/issues', { warehouseId, lines: lines.filter((l) => l.productId && l.quantity > 0) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['issues'] });
      setOpen(false);
      setLines([{ productId: '', quantity: 1 }]);
      setWarehouseId('');
    },
  });

  const confirmMutation = useMutation({
    mutationFn: async (id: string) => api.post(`/issues/${id}/confirm`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['issues'] }),
    onError: (err: any) => setErrorMsg(err?.response?.data?.message?.[0] || err?.response?.data?.message || 'error'),
  });
  const cancelMutation = useMutation({
    mutationFn: async (id: string) => api.post(`/issues/${id}/cancel`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['issues'] }),
  });

  function updateLine(i: number, patch: Partial<{ productId: string; quantity: number }>) {
    setLines((ls) => ls.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold">📤 {t('الصرف', 'Issues')}</h1>
        <Button onClick={() => setOpen(true)}>
          <span className="flex items-center gap-1"><Plus className="w-4 h-4" />{t('صرف جديد', 'New issue')}</span>
        </Button>
      </div>

      {errorMsg && <div className="mb-4 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">{errorMsg}</div>}

      <Table headers={[t('المرجع', 'Reference'), t('المخزن', 'Warehouse'), t('الحالة', 'Status'), t('عدد الأسطر', 'Lines'), '']}>
        {issues?.map((r: any) => (
          <tr key={r.id}>
            <td className="px-4 py-3 font-medium">{r.reference}</td>
            <td className="px-4 py-3 text-gray-500">{r.warehouse?.name}</td>
            <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
            <td className="px-4 py-3">{r.lines?.length}</td>
            <td className="px-4 py-3">
              {r.status === 'DRAFT' && (
                <div className="flex gap-2">
                  <button onClick={() => confirmMutation.mutate(r.id)} className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100">
                    <Check className="w-4 h-4" />
                  </button>
                  <button onClick={() => cancelMutation.mutate(r.id)} className="p-1.5 rounded-lg bg-red-50 text-red-700 hover:bg-red-100">
                    <XIcon className="w-4 h-4" />
                  </button>
                </div>
              )}
            </td>
          </tr>
        ))}
      </Table>

      {open && (
        <Modal title={t('صرف بضاعة جديد', 'New issue')} onClose={() => setOpen(false)}>
          <Field label={t('المخزن', 'Warehouse')}>
            <select className={inputClass} value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)}>
              <option value="">{t('اختر...', 'Select...')}</option>
              {warehouses?.map((w: any) => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </Field>

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
            <Button onClick={() => createMutation.mutate()} disabled={!warehouseId || createMutation.isPending}>
              {t('حفظ كمسودة', 'Save as draft')}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
