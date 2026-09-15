import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Package, Warehouse, AlertTriangle, Activity, Wallet, Truck, Users,
  PackagePlus, PackageMinus, ArrowLeftRight, ScanLine, ShoppingCart, FileText,
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  BarChart, Bar, Legend, Cell,
} from 'recharts';
import { api } from '../lib/api';
import { useUI } from '../context/UIContext';

const CHART_COLORS = ['#0ea5e9', '#f97316', '#10b981', '#8b5cf6', '#eab308', '#ef4444'];

export function DashboardPage() {
  const { t, locale, theme } = useUI();
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => (await api.get('/reports/dashboard')).data,
  });

  const gridColor = theme === 'dark' ? '#27272a' : '#e5e7eb';
  const textColor = theme === 'dark' ? '#9ca3af' : '#6b7280';

  const cards = [
    { icon: Package, label: t('عدد المنتجات', 'Total products'), value: data?.productCount, color: 'text-brand-600' },
    { icon: Wallet, label: t('قيمة المخزون', 'Stock value'), value: data ? Number(data.totalStockValue).toLocaleString(undefined, { maximumFractionDigits: 0 }) : undefined, color: 'text-emerald-600' },
    { icon: AlertTriangle, label: t('منتجات تحت الحد الأدنى', 'Low stock products'), value: data?.lowStockCount, color: 'text-amber-600' },
    { icon: Activity, label: t('حركات اليوم', "Today's movements"), value: data?.movementsToday, color: 'text-indigo-600' },
    { icon: Warehouse, label: t('عدد المخازن', 'Warehouses'), value: data?.warehouseCount, color: 'text-sky-600' },
    { icon: Truck, label: t('الموردين', 'Suppliers'), value: data?.supplierCount, color: 'text-orange-600' },
    { icon: Users, label: t('العملاء', 'Customers'), value: data?.customerCount, color: 'text-pink-600' },
  ];

  const pendingItems = [
    { icon: PackagePlus, label: t('استلامات مسودة', 'Draft receipts'), value: data?.pendingDocs?.receipts, to: '/receipts' },
    { icon: PackageMinus, label: t('صرف مسودة', 'Draft issues'), value: data?.pendingDocs?.issues, to: '/issues' },
    { icon: ArrowLeftRight, label: t('تحويلات قيد التنفيذ', 'Transfers in progress'), value: data?.pendingDocs?.transfers, to: '/transfers' },
    { icon: ScanLine, label: t('جرد جاري', 'Counts in progress'), value: data?.pendingDocs?.counts, to: '/counts' },
    { icon: ShoppingCart, label: t('أوامر شراء مسودة', 'Draft purchase orders'), value: data?.pendingDocs?.purchaseOrders, to: '/purchase-orders' },
    { icon: FileText, label: t('أوامر بيع مسودة', 'Draft sales orders'), value: data?.pendingDocs?.salesOrders, to: '/sales-orders' },
  ];

  return (
    <div>
      <h1 className="text-xl font-semibold mb-6">{t('الرئيسية', 'Dashboard')}</h1>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-4 mb-6">
        {cards.map((c) => (
          <div key={c.label} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4">
            <c.icon className={`w-4 h-4 ${c.color} mb-2`} />
            <div className="text-xl font-semibold">{isLoading ? '—' : c.value ?? 0}</div>
            <div className="text-xs text-gray-500 mt-1">{c.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="lg:col-span-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
          <div className="text-sm font-medium mb-4">{t('حركة المخزون - آخر 7 أيام', 'Stock movement - last 7 days')}</div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={data?.movementsLast7Days || []}>
              <defs>
                <linearGradient id="inGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="outGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: textColor }} tickFormatter={(v) => v.slice(5)} />
              <YAxis tick={{ fontSize: 11, fill: textColor }} width={32} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Legend
                formatter={(value) => (value === 'in' ? t('وارد', 'Inbound') : t('صادر', 'Outbound'))}
                wrapperStyle={{ fontSize: 12 }}
              />
              <Area type="monotone" dataKey="in" stroke="#10b981" fill="url(#inGrad)" strokeWidth={2} />
              <Area type="monotone" dataKey="out" stroke="#ef4444" fill="url(#outGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
          <div className="text-sm font-medium mb-4">{t('قيمة المخزون حسب المخزن', 'Stock value by warehouse')}</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data?.stockByWarehouse || []} layout="vertical" margin={{ left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: textColor }} />
              <YAxis dataKey="warehouse" type="category" tick={{ fontSize: 11, fill: textColor }} width={80} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {(data?.stockByWarehouse || []).map((_: any, i: number) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {pendingItems.map((p) => (
          <button
            key={p.label}
            onClick={() => navigate(p.to)}
            className="flex items-center gap-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 text-start hover:border-brand-300 dark:hover:border-brand-700"
          >
            <div className="p-2 rounded-xl bg-brand-50 dark:bg-brand-900/20">
              <p.icon className="w-4 h-4 text-brand-600" />
            </div>
            <div className="flex-1">
              <div className="text-lg font-semibold">{isLoading ? '—' : p.value ?? 0}</div>
              <div className="text-xs text-gray-500">{p.label}</div>
            </div>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
          <div className="text-sm font-medium mb-3">{t('منتجات تحت حد إعادة الطلب', 'Products below reorder point')}</div>
          {(!data?.lowStockProducts || data.lowStockProducts.length === 0) ? (
            <p className="text-sm text-gray-400">{t('كله تمام، مفيش نواقص حاليًا.', 'All good, nothing low right now.')}</p>
          ) : (
            <div className="space-y-2">
              {data.lowStockProducts.map((p: any) => (
                <div key={p.id} className="flex items-center justify-between text-sm border-b border-gray-100 dark:border-gray-800 pb-2 last:border-0">
                  <span>{locale === 'ar' ? p.nameAr : p.nameEn}</span>
                  <span className="text-amber-600 font-medium">{p.onHand} / {p.reorderPoint}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
          <div className="text-sm font-medium mb-3">{t('الأكثر حركة (آخر 30 يوم)', 'Top movers (last 30 days)')}</div>
          {(!data?.topMovingProducts || data.topMovingProducts.length === 0) ? (
            <p className="text-sm text-gray-400">{t('مفيش حركة كفاية لسه.', 'Not enough movement yet.')}</p>
          ) : (
            <div className="space-y-2">
              {data.topMovingProducts.map((p: any, i: number) => (
                <div key={p.sku} className="flex items-center justify-between text-sm border-b border-gray-100 dark:border-gray-800 pb-2 last:border-0">
                  <span className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-gray-100 dark:bg-gray-800 text-xs flex items-center justify-center text-gray-500">{i + 1}</span>
                    {p.name}
                  </span>
                  <span className="text-gray-500">{p.qty}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
