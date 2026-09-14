import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Warehouse } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';

export function LoginPage() {
  const { login } = useAuth();
  const { t } = useUI();
  const navigate = useNavigate();
  const [email, setEmail] = useState('admin@warehouse.local');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!email || !password) {
      setError(t('من فضلك أدخل البريد وكلمة السر', 'Please enter email and password'));
      return;
    }
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          t('بيانات الدخول غير صحيحة', 'Invalid credentials'),
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
      <form onSubmit={handleSubmit} className="w-full max-w-sm bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-8">
        <div className="flex flex-col items-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-brand-600 flex items-center justify-center mb-3">
            <Warehouse className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-lg font-semibold">{t('تسجيل الدخول', 'Sign in')}</h1>
          <p className="text-sm text-gray-500">{t('نظام إدارة المخازن', 'Warehouse Management System')}</p>
        </div>

        <label className="block text-sm mb-1 text-gray-600 dark:text-gray-300">{t('البريد الإلكتروني', 'Email')}</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full mb-4 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent focus:outline-none focus:ring-2 focus:ring-brand-500"
        />

        <label className="block text-sm mb-1 text-gray-600 dark:text-gray-300">{t('كلمة السر', 'Password')}</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full mb-4 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent focus:outline-none focus:ring-2 focus:ring-brand-500"
        />

        {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white font-medium disabled:opacity-60"
        >
          {loading ? t('جاري الدخول...', 'Signing in...') : t('دخول', 'Sign in')}
        </button>

        <p className="text-xs text-gray-400 mt-4 text-center">
          {t('حساب تجريبي: admin@warehouse.local / Admin@12345', 'Demo account: admin@warehouse.local / Admin@12345')}
        </p>
      </form>
    </div>
  );
}
