import { useEffect, useRef, useState } from 'react';
import { Camera, CheckCircle2, Keyboard, ScanLine, X } from 'lucide-react';
import { useUI } from '../context/UIContext';

interface ScannerModalProps {
  onDetected: (code: string) => void;
  onClose: () => void;
  /** لو true المودال بيفضل فاتح بعد كل مسح (مفيد في الجرد اللي بتمسح أكتر من صنف ورا بعض) */
  keepOpenAfterScan?: boolean;
  title?: string;
}

/**
 * مودال مسح باركود/QR: بيدعم كاميرا الموبايل/التابلت وكمان أجهزة السكانر (USB/Bluetooth)
 * اللي بتشتغل زي لوحة مفاتيح (بتكتب الكود بسرعة وتضغط Enter).
 *
 * Barcode/QR scanner modal: supports the device camera AND USB/Bluetooth
 * hardware scanners, which behave like a very fast keyboard followed by Enter.
 */
export function ScannerModal({ onDetected, onClose, keepOpenAfterScan, title }: ScannerModalProps) {
  const { t } = useUI();
  const [mode, setMode] = useState<'camera' | 'manual'>('camera');
  const [manualValue, setManualValue] = useState('');
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const manualInputRef = useRef<HTMLInputElement>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);
  const lastDetectRef = useRef<{ code: string; at: number }>({ code: '', at: 0 });

  function handleDetected(code: string) {
    const now = Date.now();
    // منع تسجيل نفس الكود أكتر من مرة وهو لسه قدام الكاميرا
    if (code === lastDetectRef.current.code && now - lastDetectRef.current.at < 1500) return;
    lastDetectRef.current = { code, at: now };
    setLastScanned(code);
    onDetected(code);
    if (!keepOpenAfterScan) onClose();
  }

  useEffect(() => {
    if (mode !== 'camera') return;
    let cancelled = false;
    let controls: { stop: () => void } | null = null;

    (async () => {
      try {
        const { BrowserMultiFormatReader } = await import('@zxing/browser');
        const reader = new BrowserMultiFormatReader();
        const result = await reader.decodeFromVideoDevice(undefined, videoRef.current ?? undefined, (res) => {
          if (res) handleDetected(res.getText());
        });
        if (cancelled) {
          result.stop();
          return;
        }
        controls = result;
        controlsRef.current = result;
      } catch (err: any) {
        setCameraError(err?.message || 'camera error');
      }
    })();

    return () => {
      cancelled = true;
      controls?.stop();
      controlsRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  useEffect(() => {
    if (mode === 'manual') manualInputRef.current?.focus();
  }, [mode]);

  function submitManual() {
    const value = manualValue.trim();
    if (!value) return;
    handleDetected(value);
    setManualValue('');
    manualInputRef.current?.focus();
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-800">
          <h2 className="font-semibold flex items-center gap-2">
            <ScanLine className="w-4 h-4 text-brand-600" />
            {title || t('مسح باركود / QR', 'Scan barcode / QR')}
          </h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex border-b border-gray-200 dark:border-gray-800">
          <button
            onClick={() => setMode('camera')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium ${
              mode === 'camera' ? 'text-brand-600 border-b-2 border-brand-600' : 'text-gray-500'
            }`}
          >
            <Camera className="w-4 h-4" />
            {t('الكاميرا', 'Camera')}
          </button>
          <button
            onClick={() => setMode('manual')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium ${
              mode === 'manual' ? 'text-brand-600 border-b-2 border-brand-600' : 'text-gray-500'
            }`}
          >
            <Keyboard className="w-4 h-4" />
            {t('جهاز سكانر / يدوي', 'Scanner device / manual')}
          </button>
        </div>

        <div className="p-5">
          {mode === 'camera' ? (
            <div>
              <div className="relative rounded-xl overflow-hidden bg-black aspect-square">
                <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
                <div className="absolute inset-8 border-2 border-brand-400/70 rounded-lg pointer-events-none" />
              </div>
              {cameraError && (
                <p className="text-xs text-red-600 mt-2">
                  {t('تعذر تشغيل الكاميرا - جرّب وضع الإدخال اليدوي/السكانر.', 'Could not access the camera - try the scanner/manual mode.')}
                </p>
              )}
              <p className="text-xs text-gray-500 mt-2">{t('وجّه الكاميرا على الباركود أو رمز QR', 'Point the camera at the barcode or QR code')}</p>
            </div>
          ) : (
            <div>
              <p className="text-xs text-gray-500 mb-2">
                {t(
                  'استخدم جهاز السكانر (USB/Bluetooth) عادي هيكتب هنا ويأكد تلقائي، أو اكتب الكود يدويًا واضغط Enter.',
                  'Use a USB/Bluetooth scanner as normal - it will type here and submit automatically, or type the code manually and press Enter.',
                )}
              </p>
              <input
                ref={manualInputRef}
                autoFocus
                value={manualValue}
                onChange={(e) => setManualValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    submitManual();
                  }
                }}
                placeholder={t('امسح أو اكتب الكود هنا...', 'Scan or type the code here...')}
                className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent focus:outline-none focus:ring-2 focus:ring-brand-500 text-center text-lg tracking-wider"
              />
            </div>
          )}

          {lastScanned && (
            <div className="mt-4 flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-300 px-3 py-2 rounded-lg">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span className="truncate">{t('آخر كود اتمسح:', 'Last scanned:')} {lastScanned}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
