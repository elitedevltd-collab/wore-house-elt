import { useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { api } from '../lib/api';
import { useUI } from '../context/UIContext';
import { Table, Button, Modal, Field, inputClass } from '../components/ui';

export function WarehousesPage() {
  const { t } = useUI();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ code: '', name: '', address: '' });

  const { data: warehouses } = useQuery({
    queryKey: ['warehouses'],
    queryFn: async () => (await api.get('/warehouses')).data,
  });

  const createMutation = useMutation({
    mutationFn: async () => api.post('/warehouses', { ...form, companyId: '00000000-0000-0000-0000-000000000001' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['warehouses'] });
      setOpen(false);
      setForm({ code: '', name: '', address: '' });
    },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold">{t('المخازن', 'Warehouses')}</h1>
        <Button onClick={() => setOpen(true)}>
          <span className="flex items-center gap-1"><Plus className="w-4 h-4" />{t('مخزن جديد', 'New warehouse')}</span>
        </Button>
      </div>

      <Table headers={[t('الكود', 'Code'), t('الاسم', 'Name'), t('العنوان', 'Address'), t('عدد المواقع', 'Locations')]}>
        {warehouses?.map((w: any) => (
          <tr key={w.id}>
            <td className="px-4 py-3 text-gray-500">{w.code}</td>
            <td className="px-4 py-3">{w.name}</td>
            <td className="px-4 py-3 text-gray-500">{w.address || '-'}</td>
            <td className="px-4 py-3">{w.locations?.length ?? 0}</td>
          </tr>
        ))}
      </Table>

      {open && (
        <Modal title={t('مخزن جديد', 'New warehouse')} onClose={() => setOpen(false)}>
          <Field label={t('الكود', 'Code')}>
            <input className={inputClass} value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
          </Field>
          <Field label={t('الاسم', 'Name')}>
            <input className={inputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label={t('العنوان', 'Address')}>
            <input className={inputClass} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </Field>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="secondary" onClick={() => setOpen(false)}>{t('إلغاء', 'Cancel')}</Button>
            <Button onClick={() => createMutation.mutate()} disabled={!form.code || !form.name}>{t('حفظ', 'Save')}</Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
