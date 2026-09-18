import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Table, StatusBadge } from '../components/ui';
import { useUI } from '../context/UIContext';

export function InventoryControlPage() {
  const { t } = useUI();
  const [alerts, setAlerts] = useState<any[]>([]);
  const [expiring, setExpiring] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [lots, setLots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/inventory/alerts'),
      api.get('/inventory/expiring?days=90'),
      api.get('/inventory/locations'),
      api.get('/inventory/lots'),
    ]).then(([a, e, l, b]) => {
      setAlerts(a.data.lowStock || []);
      setExpiring(e.data || []);
      setLocations(l.data || []);
      setLots(b.data || []);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-gray-500">{t('جاري التحميل...', 'Loading...')}</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">{t('مراقبة المخزون والتحكم', 'Inventory Control')}</h1>
        <p className="text-sm text-gray-500 mt-1">{t('تنبيهات النقص والصلاحية والمواقع والتشغيلات', 'Low stock, expiry, locations, and lot visibility')}</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl bg-amber-50 dark:bg-amber-900/20 p-4"><div className="text-sm text-amber-700">{t('أصناف تحت حد الطلب', 'Low stock')}</div><div className="text-2xl font-bold mt-2">{alerts.length}</div></div>
        <div className="rounded-2xl bg-red-50 dark:bg-red-900/20 p-4"><div className="text-sm text-red-700">{t('تشغيلات قريبة الانتهاء', 'Expiring lots')}</div><div className="text-2xl font-bold mt-2">{expiring.length}</div></div>
        <div className="rounded-2xl bg-blue-50 dark:bg-blue-900/20 p-4"><div className="text-sm text-blue-700">{t('مواقع التخزين', 'Locations')}</div><div className="text-2xl font-bold mt-2">{locations.length}</div></div>
        <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 p-4"><div className="text-sm text-emerald-700">{t('التشغيلات', 'Lots')}</div><div className="text-2xl font-bold mt-2">{lots.length}</div></div>
      </div>

      <section>
        <h2 className="font-semibold mb-3">{t('تنبيهات المخزون المنخفض', 'Low-stock alerts')}</h2>
        <Table headers={[t('الصنف', 'Product'), 'SKU', t('المتاح', 'Available'), t('حد الطلب', 'Reorder point')]}>
          {alerts.map((row) => <tr key={row.id}><td className="px-4 py-3">{row.nameAr}</td><td className="px-4 py-3">{row.sku}</td><td className="px-4 py-3 text-red-600 font-semibold">{row.onHand - row.reserved}</td><td className="px-4 py-3">{row.reorderPoint}</td></tr>)}
          {!alerts.length && <tr><td className="px-4 py-5 text-gray-500" colSpan={4}>{t('لا توجد تنبيهات', 'No alerts')}</td></tr>}
        </Table>
      </section>

      <section>
        <h2 className="font-semibold mb-3">{t('الصلاحية خلال 90 يوم', 'Expiry within 90 days')}</h2>
        <Table headers={[t('الصنف', 'Product'), t('التشغيلة', 'Lot'), t('الصلاحية', 'Expiry'), t('المخزن', 'Warehouse'), t('الكمية', 'On hand')]}>
          {expiring.map((row) => <tr key={row.id}><td className="px-4 py-3">{row.productName}<div className="text-xs text-gray-500">{row.sku}</div></td><td className="px-4 py-3">{row.lotNumber || '-'}</td><td className="px-4 py-3"><StatusBadge status={new Date(row.expiryDate) < new Date() ? 'CANCELLED' : 'IN_PROGRESS'} /> <span className="ms-2">{new Date(row.expiryDate).toLocaleDateString()}</span></td><td className="px-4 py-3">{row.warehouse}</td><td className="px-4 py-3">{row.onHand}</td></tr>)}
          {!expiring.length && <tr><td className="px-4 py-5 text-gray-500" colSpan={5}>{t('لا توجد تشغيلات قريبة الانتهاء', 'No expiring lots')}</td></tr>}
        </Table>
      </section>

      <section>
        <h2 className="font-semibold mb-3">{t('مواقع التخزين', 'Storage locations')}</h2>
        <Table headers={[t('المخزن', 'Warehouse'), 'Code', t('الاسم', 'Name'), t('الأرصدة', 'Balances')]}>
          {locations.map((row) => <tr key={row.id}><td className="px-4 py-3">{row.warehouse?.name}</td><td className="px-4 py-3">{row.code}</td><td className="px-4 py-3">{row.name}</td><td className="px-4 py-3">{row._count?.stockBalances || 0}</td></tr>)}
        </Table>
      </section>
    </div>
  );
}
