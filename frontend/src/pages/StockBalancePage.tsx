import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useUI } from '../context/UIContext';
import { Table } from '../components/ui';

export function StockBalancePage() {
  const { t, locale } = useUI();

  const { data: balances } = useQuery({
    queryKey: ['stock-balances'],
    queryFn: async () => (await api.get('/stock/balances')).data,
  });

  return (
    <div>
      <h1 className="text-xl font-semibold mb-6">{t('أرصدة المخزون', 'Stock balance')}</h1>
      <Table headers={[t('المنتج', 'Product'), t('المخزن', 'Warehouse'), t('الموقع', 'Location'), t('اللوت', 'Lot'), t('الكمية المتاحة', 'On hand')]}>
        {balances?.map((b: any) => (
          <tr key={b.id}>
            <td className="px-4 py-3">{locale === 'ar' ? b.product.nameAr : b.product.nameEn}</td>
            <td className="px-4 py-3 text-gray-500">{b.warehouse.name}</td>
            <td className="px-4 py-3 text-gray-500">{b.location?.name || '-'}</td>
            <td className="px-4 py-3 text-gray-500">{b.lot?.lotNumber || '-'}</td>
            <td className="px-4 py-3 font-medium">{Number(b.onHand)}</td>
          </tr>
        ))}
      </Table>
    </div>
  );
}
