import { ReactNode } from 'react';

export { Modal } from './Modal';


export function Table({ headers, children }: { headers: string[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 dark:border-gray-800 text-gray-500">
            {headers.map((h) => (
              <th key={h} className="text-start font-medium px-4 py-3">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">{children}</tbody>
      </table>
    </div>
  );
}

const STATUS_STYLES: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  CONFIRMED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  IN_TRANSIT: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  RECEIVED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  CANCELLED: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  IN_PROGRESS: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  COMPLETED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_STYLES[status] || 'bg-gray-100 text-gray-700'}`}>
      {status}
    </span>
  );
}

export function Button({
  children, onClick, variant = 'primary', type = 'button', disabled,
}: {
  children: ReactNode; onClick?: () => void; variant?: 'primary' | 'secondary' | 'danger'; type?: 'button' | 'submit'; disabled?: boolean;
}) {
  const styles = {
    primary: 'bg-brand-600 hover:bg-brand-700 text-white',
    secondary: 'border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800',
    danger: 'bg-red-600 hover:bg-red-700 text-white',
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`px-3.5 py-2 rounded-lg text-sm font-medium disabled:opacity-50 ${styles[variant]}`}
    >
      {children}
    </button>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="mb-3">
      <label className="block text-sm mb-1 text-gray-600 dark:text-gray-300">{label}</label>
      {children}
    </div>
  );
}

export const inputClass =
  'w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm';
