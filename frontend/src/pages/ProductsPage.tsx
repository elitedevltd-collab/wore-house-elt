import { useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { Plus, Search } from 'lucide-react';
import { api } from '../lib/api';
import { useUI } from '../context/UIContext';
import { Table, Button, Modal, Field, inputClass } from '../components/ui';

export function ProductsPage() {
  const { t, locale } = useUI();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ nameAr: '', nameEn: '', sku: '', barcode: '', cost: 0, salePrice: 0, uomId: '', reorderPoint: 0 });

  const { data: products } = useQuery({
    queryKey: ['products', search],
    queryFn: async () => (await api.get('/products', { params: { search } })).data,
  });

  const { data: uoms } = useQuery({
    queryKey: ['uoms'],
    queryFn: async () => (await api.get('/units-of-measure')).data,
  });

  const createMutation = useMutation({
    mutationFn: async () => api.post('/products', { ...form, cost: Number(form.cost), salePrice: Number(form.salePrice), reorderPoint: Number(form.reorderPoint) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] });
      setOpen(false);
    },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold">{t('المنتجات', 'Products')}</h1>
        <Button onClick={() => setOpen(true)}>
          <span className="flex items-center gap-1"><Plus className="w-4 h-4" />{t('منتج جديد', 'New product')}</span>
        </Button>
      </div>

      <div className="relative mb-4 max-w-sm">
        <Search className="w-4 h-4 absolute top-2.5 start-3 text-gray-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('بحث بالاسم أو SKU أو الباركود...', 'Search name, SKU, or barcode...')}
          className={`${inputClass} ps-9`}
        />
      </div>

      <Table headers={[t('الاسم', 'Name'), 'SKU', t('الباركود', 'Barcode'), t('التكلفة', 'Cost'), t('سعر البيع', 'Sale price'), t('حد إعادة الطلب', 'Reorder point')]}>
        {products?.map((p: any) => (
          <tr key={p.id}>
            <td className="px-4 py-3">{locale === 'ar' ? p.nameAr : p.nameEn}</td>
            <td className="px-4 py-3 text-gray-500">{p.sku}</td>
            <td className="px-4 py-3 text-gray-500">{p.barcode || '-'}</td>
            <td className="px-4 py-3">{Number(p.cost).toFixed(2)}</td>
            <td className="px-4 py-3">{Number(p.salePrice).toFixed(2)}</td>
            <td className="px-4 py-3">{Number(p.reorderPoint)}</td>
          </tr>
        ))}
      </Table>

      {open && (
        <Modal title={t('منتج جديد', 'New product')} onClose={() => setOpen(false)}>
          <Field label={t('الاسم بالعربي', 'Name (Arabic)')}>
            <input className={inputClass} value={form.nameAr} onChange={(e) => setForm({ ...form, nameAr: e.target.value })} />
          </Field>
          <Field label={t('الاسم بالإنجليزي', 'Name (English)')}>
            <input className={inputClass} value={form.nameEn} onChange={(e) => setForm({ ...form, nameEn: e.target.value })} />
          </Field>
          <Field label="SKU">
            <input className={inputClass} value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
          </Field>
          <Field label={t('الباركود', 'Barcode')}>
            <input className={inputClass} value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} />
          </Field>
          <Field label={t('وحدة القياس', 'Unit of measure')}>
            <select className={inputClass} value={form.uomId} onChange={(e) => setForm({ ...form, uomId: e.target.value })}>
              <option value="">{t('اختر...', 'Select...')}</option>
              {uoms?.map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label={t('التكلفة', 'Cost')}>
              <input type="number" className={inputClass} value={form.cost} onChange={(e) => setForm({ ...form, cost: Number(e.target.value) })} />
            </Field>
            <Field label={t('سعر البيع', 'Sale price')}>
              <input type="number" className={inputClass} value={form.salePrice} onChange={(e) => setForm({ ...form, salePrice: Number(e.target.value) })} />
            </Field>
            <Field label={t('حد إعادة الطلب', 'Reorder point')}>
              <input type="number" className={inputClass} value={form.reorderPoint} onChange={(e) => setForm({ ...form, reorderPoint: Number(e.target.value) })} />
            </Field>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="secondary" onClick={() => setOpen(false)}>{t('إلغاء', 'Cancel')}</Button>
            <Button onClick={() => createMutation.mutate()} disabled={!form.sku || !form.uomId || createMutation.isPending}>
              {t('حفظ', 'Save')}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
