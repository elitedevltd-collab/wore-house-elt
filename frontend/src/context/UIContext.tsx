import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

type Locale = 'ar' | 'en';
type Theme = 'light' | 'dark';

interface UIContextType {
  locale: Locale;
  theme: Theme;
  dir: 'rtl' | 'ltr';
  toggleLocale: () => void;
  toggleTheme: () => void;
  t: (ar: string, en: string) => string;
}

const UIContext = createContext<UIContextType | null>(null);

export function UIProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>(() => (localStorage.getItem('locale') as Locale) || 'ar');
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem('theme') as Theme) || 'light');

  const dir = locale === 'ar' ? 'rtl' : 'ltr';

  useEffect(() => {
    document.documentElement.dir = dir;
    document.documentElement.lang = locale;
    localStorage.setItem('locale', locale);
  }, [locale, dir]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('theme', theme);
  }, [theme]);

  function toggleLocale() {
    setLocale((l) => (l === 'ar' ? 'en' : 'ar'));
  }
  function toggleTheme() {
    setTheme((t) => (t === 'light' ? 'dark' : 'light'));
  }
  function t(ar: string, en: string) {
    return locale === 'ar' ? ar : en;
  }

  return (
    <UIContext.Provider value={{ locale, theme, dir, toggleLocale, toggleTheme, t }}>
      {children}
    </UIContext.Provider>
  );
}

export function useUI() {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error('useUI must be used within UIProvider');
  return ctx;
}
