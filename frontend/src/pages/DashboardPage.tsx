import { useQuery } from '@tanstack/react-query';
import { Package, Warehouse, AlertTriangle, Activity } from 'lucide-react';
import { api } from '../lib/api';
import { useUI } from '../context/UIContext';

export function DashboardPage() {
  const { t } = useUI();
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => (await api.get('/reports/dashboard')).data,
  });

  const cards = [
    { icon: Package, label: t('عدد المنتجات', 'Total products'), value: data?.productCount, color: 'text-brand-600' },
    { icon: Warehouse, label: t('عدد المخازن', 'Warehouses'), value: data?.warehouseCount, color: 'text-emerald-600' },
    { icon: AlertTriangle, label: t('منتجات تحت الحد الأدنى', 'Low stock products'), value: data?.lowStockCount, color: 'text-amber-600' },
    { icon: Activity, label: t('حركات اليوم', "Today's movements"), value: data?.movementsToday, color: 'text-indigo-600' },
  ];

  return (
    <div>
      <h1 className="text-xl font-semibold mb-6">{t('الرئيسية', 'Dashboard')}</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <div key={c.label} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
            <c.icon className={`w-5 h-5 ${c.color} mb-3`} />
            <div className="text-2xl font-semibold">{isLoading ? '—' : c.value ?? 0}</div>
            <div className="text-sm text-gray-500 mt-1">{c.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
