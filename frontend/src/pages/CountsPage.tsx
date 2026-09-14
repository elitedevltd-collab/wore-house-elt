import { useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { api } from '../lib/api';
import { useUI } from '../context/UIContext';
import { Table, Button, Modal, Field, inputClass, StatusBadge } from '../components/ui';

export function CountsPage() {
  const { t, locale } = useUI();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [warehouseId, setWarehouseId] = useState('');
  const [activeCountId, setActiveCountId] = useState<string | null>(null);

  const { data: counts } = useQuery({ queryKey: ['counts'], queryFn: async () => (await api.get('/counts')).data });
  const { data: warehouses } = useQuery({ queryKey: ['warehouses'], queryFn: async () => (await api.get('/warehouses')).data });
  const { data: activeCount } = useQuery({
    queryKey: ['count', activeCountId],
    queryFn: async () => (await api.get(`/counts/${activeCountId}`)).data,
    enabled: !!activeCountId,
  });

  const createMutation = useMutation({
    mutationFn: async () => api.post('/counts', { warehouseId }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['counts'] });
      setOpen(false);
      setActiveCountId(res.data.id);
    },
  });

  const submitLineMutation = useMutation({
    mutationFn: async ({ id, lineId, countedQty }: any) => api.post(`/counts/${id}/lines`, { lineId, countedQty }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['count', activeCountId] }),
  });

  const completeMutation = useMutation({
    mutationFn: async (id: string) => api.post(`/counts/${id}/complete`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['counts'] });
      setActiveCountId(null);
    },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold">📋 {t('الجرد', 'Stock counts')}</h1>
        <Button onClick={() => setOpen(true)}>
          <span className="flex items-center gap-1"><Plus className="w-4 h-4" />{t('جرد جديد', 'New count')}</span>
        </Button>
      </div>

      <Table headers={[t('المرجع', 'Reference'), t('المخزن', 'Warehouse'), t('الحالة', 'Status'), '']}>
        {counts?.map((c: any) => (
          <tr key={c.id}>
            <td className="px-4 py-3 font-medium">{c.reference}</td>
            <td className="px-4 py-3 text-gray-500">{c.warehouse?.name}</td>
            <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
            <td className="px-4 py-3">
              {c.status === 'IN_PROGRESS' && (
                <Button variant="secondary" onClick={() => setActiveCountId(c.id)}>{t('إدخال النتائج', 'Enter results')}</Button>
              )}
            </td>
          </tr>
        ))}
      </Table>

      {open && (
        <Modal title={t('جرد جديد', 'New count')} onClose={() => setOpen(false)}>
          <Field label={t('المخزن', 'Warehouse')}>
            <select className={inputClass} value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)}>
              <option value="">{t('اختر...', 'Select...')}</option>
              {warehouses?.map((w: any) => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </Field>
          <p className="text-xs text-gray-500 mb-3">
            {t('هيتم إنشاء سطر جرد لكل منتج نشط في المخزن ده، وتحدد الكمية الفعلية لكل واحد بعدين.', 'A count line will be generated for every active product in this warehouse; you enter the counted quantity next.')}
          </p>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="secondary" onClick={() => setOpen(false)}>{t('إلغاء', 'Cancel')}</Button>
            <Button onClick={() => createMutation.mutate()} disabled={!warehouseId}>{t('بدء الجرد', 'Start count')}</Button>
          </div>
        </Modal>
      )}

      {activeCountId && activeCount && (
        <Modal title={`${t('جرد', 'Count')} ${activeCount.reference}`} onClose={() => setActiveCountId(null)}>
          <div className="space-y-2 max-h-80 overflow-y-auto mb-4">
            {activeCount.lines?.map((line: any) => (
              <div key={line.id} className="flex items-center justify-between gap-2 border-b border-gray-100 dark:border-gray-800 pb-2">
                <div className="text-sm">
                  <div>{locale === 'ar' ? line.product.nameAr : line.product.nameEn}</div>
                  <div className="text-xs text-gray-400">{t('متوقع', 'Expected')}: {Number(line.expectedQty)}</div>
                </div>
                <input
                  type="number"
                  className={`${inputClass} w-24`}
                  defaultValue={line.countedQty ?? ''}
                  onBlur={(e) =>
                    submitLineMutation.mutate({ id: activeCountId, lineId: line.id, countedQty: Number(e.target.value) })
                  }
                />
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setActiveCountId(null)}>{t('إغلاق', 'Close')}</Button>
            <Button onClick={() => completeMutation.mutate(activeCountId)}>{t('اعتماد الجرد', 'Complete count')}</Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
