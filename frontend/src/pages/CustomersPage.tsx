import { useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { Plus, Search, Pencil, Ban } from 'lucide-react';
import { api } from '../lib/api';
import { useUI } from '../context/UIContext';
import { Table, Button, Modal, Field, inputClass } from '../components/ui';

const EMPTY_FORM = { name: '', email: '', phone: '' };

export function CustomersPage() {
  const { t } = useUI();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const { data: customers } = useQuery({
    queryKey: ['customers', search],
    queryFn: async () => (await api.get('/customers', { params: { search } })).data,
  });

  const saveMutation = useMutation({
    mutationFn: async () =>
      editingId ? api.patch(`/customers/${editingId}`, form) : api.post('/customers', form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customers'] });
      setOpen(false);
      setEditingId(null);
      setForm(EMPTY_FORM);
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: async (id: string) => api.delete(`/customers/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['customers'] }),
  });

  function openEdit(customer: any) {
    setEditingId(customer.id);
    setForm({ name: customer.name, email: customer.email || '', phone: customer.phone || '' });
    setOpen(true);
  }

  function openNew() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setOpen(true);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold">🧑‍💼 {t('العملاء', 'Customers')}</h1>
        <Button onClick={openNew}>
          <span className="flex items-center gap-1"><Plus className="w-4 h-4" />{t('عميل جديد', 'New customer')}</span>
        </Button>
      </div>

      <div className="relative mb-4 max-w-sm">
        <Search className="w-4 h-4 absolute top-2.5 start-3 text-gray-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('بحث بالاسم أو الإيميل أو الجوال...', 'Search name, email, or phone...')}
          className={`${inputClass} ps-9`}
        />
      </div>

      <Table headers={[t('الاسم', 'Name'), t('الإيميل', 'Email'), t('الجوال', 'Phone'), t('الحالة', 'Status'), '']}>
        {customers?.map((c: any) => (
          <tr key={c.id}>
            <td className="px-4 py-3">{c.name}</td>
            <td className="px-4 py-3 text-gray-500">{c.email || '-'}</td>
            <td className="px-4 py-3 text-gray-500">{c.phone || '-'}</td>
            <td className="px-4 py-3">
              {c.isActive ? (
                <span className="text-emerald-600 text-xs">{t('نشط', 'Active')}</span>
              ) : (
                <span className="text-gray-400 text-xs">{t('غير نشط', 'Inactive')}</span>
              )}
            </td>
            <td className="px-4 py-3">
              <div className="flex gap-2">
                <button onClick={() => openEdit(c)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500">
                  <Pencil className="w-4 h-4" />
                </button>
                {c.isActive && (
                  <button onClick={() => deactivateMutation.mutate(c.id)} className="p-1.5 rounded-lg bg-red-50 text-red-700 hover:bg-red-100" title={t('تعطيل', 'Deactivate')}>
                    <Ban className="w-4 h-4" />
                  </button>
                )}
              </div>
            </td>
          </tr>
        ))}
      </Table>

      {open && (
        <Modal title={editingId ? t('تعديل عميل', 'Edit customer') : t('عميل جديد', 'New customer')} onClose={() => setOpen(false)}>
          <Field label={t('الاسم', 'Name')}>
            <input className={inputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label={t('الإيميل', 'Email')}>
            <input className={inputClass} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </Field>
          <Field label={t('الجوال', 'Phone')}>
            <input className={inputClass} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </Field>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="secondary" onClick={() => setOpen(false)}>{t('إلغاء', 'Cancel')}</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={!form.name || saveMutation.isPending}>
              {t('حفظ', 'Save')}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
