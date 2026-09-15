import { useState } from 'react';
import { ScanLine } from 'lucide-react';
import { ScannerModal } from './ScannerModal';

interface ScanButtonProps {
  onDetected: (code: string) => void;
  keepOpenAfterScan?: boolean;
  title?: string;
  className?: string;
  label?: string;
}

/** زرار صغير بأيقونة سكانر بيفتح مودال المسح (كاميرا أو جهاز سكانر) */
export function ScanButton({ onDetected, keepOpenAfterScan, title, className, label }: ScanButtonProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title={title}
        className={
          className ||
          'p-2 rounded-lg border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-brand-600 shrink-0 flex items-center gap-1.5'
        }
      >
        <ScanLine className="w-4 h-4" />
        {label && <span className="text-sm">{label}</span>}
      </button>
      {open && (
        <ScannerModal
          title={title}
          keepOpenAfterScan={keepOpenAfterScan}
          onDetected={onDetected}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
