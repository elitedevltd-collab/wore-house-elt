import { NavLink, Outlet } from 'react-router-dom';
import {
  LayoutDashboard, Package, Warehouse, PackagePlus, PackageMinus,
  ArrowLeftRight, ClipboardList, ScanLine, FileBarChart, Moon, Sun, Globe, LogOut,
} from 'lucide-react';
import { useUI } from '../context/UIContext';
import { useAuth } from '../context/AuthContext';

const NAV_ITEMS = [
  { to: '/', icon: LayoutDashboard, ar: 'الرئيسية', en: 'Dashboard' },
  { to: '/products', icon: Package, ar: 'المنتجات', en: 'Products' },
  { to: '/warehouses', icon: Warehouse, ar: 'المخازن', en: 'Warehouses' },
  { to: '/stock', icon: FileBarChart, ar: 'أرصدة المخزون', en: 'Stock Balance' },
  { to: '/receipts', icon: PackagePlus, ar: 'الاستلام', en: 'Receipts' },
  { to: '/issues', icon: PackageMinus, ar: 'الصرف', en: 'Issues' },
  { to: '/transfers', icon: ArrowLeftRight, ar: 'التحويلات', en: 'Transfers' },
  { to: '/counts', icon: ScanLine, ar: 'الجرد', en: 'Stock Counts' },
  { to: '/audit', icon: ClipboardList, ar: 'سجل التدقيق', en: 'Audit Log' },
];

export function AppLayout() {
  const { t, theme, toggleTheme, toggleLocale, locale } = useUI();
  const { user, logout } = useAuth();

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="w-60 shrink-0 border-e border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex flex-col">
        <div className="h-14 flex items-center px-4 font-semibold text-lg border-b border-gray-200 dark:border-gray-800">
          <Warehouse className="w-5 h-5 me-2 text-brand-600" />
          {t('نظام المخازن', 'Warehouse WMS')}
        </div>
        <nav className="flex-1 overflow-y-auto py-2">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 text-sm mx-2 rounded-lg ${
                  isActive
                    ? 'bg-brand-50 dark:bg-brand-700/20 text-brand-700 dark:text-brand-100 font-medium'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`
              }
            >
              <item.icon className="w-4 h-4" />
              {t(item.ar, item.en)}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-14 shrink-0 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex items-center justify-between px-4">
          <div className="text-sm text-gray-500">
            {user && `${user.firstName} ${user.lastName}`}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleLocale}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-1 text-sm"
              aria-label="toggle language"
            >
              <Globe className="w-4 h-4" />
              {locale === 'ar' ? 'EN' : 'AR'}
            </button>
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
              aria-label="toggle theme"
            >
              {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>
            <button
              onClick={logout}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-1 text-sm text-red-600"
            >
              <LogOut className="w-4 h-4" />
              {t('خروج', 'Logout')}
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
