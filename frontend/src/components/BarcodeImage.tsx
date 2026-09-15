import { useEffect, useState } from 'react';
import { api } from '../lib/api';

interface BarcodeImageProps {
  type: 'code128' | 'qrcode';
  value: string;
  includeText?: boolean;
  className?: string;
  alt?: string;
}

/**
 * بيعرض صورة باركود/QR بجلبها من الـ API (محتاجة توكن الدخول، فمينفعش نستخدم <img src> مباشرة)
 * Fetches the barcode/QR PNG via the authenticated API client (endpoint needs a JWT, so a plain <img src> won't work).
 */
export function BarcodeImage({ type, value, includeText = false, className, alt }: BarcodeImageProps) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    if (!value) {
      setSrc(null);
      return;
    }
    let objectUrl: string | null = null;
    let cancelled = false;
    api
      .get('/barcode/image', {
        params: { type, value, text: includeText ? '1' : '0' },
        responseType: 'blob',
      })
      .then((res) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(res.data);
        setSrc(objectUrl);
      })
      .catch(() => setSrc(null));

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [type, value, includeText]);

  if (!src) {
    return <div className={`bg-gray-100 dark:bg-gray-800 animate-pulse rounded ${className || ''}`} />;
  }
  return <img src={src} alt={alt || value} className={className} />;
}
