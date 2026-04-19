"use client"

import { useState, useEffect } from 'react';

type MerchantTheme = 'dark' | 'light';

const STORAGE_KEY = 'merchant-panel-theme';

export function useMerchantTheme() {
  const [theme, setTheme] = useState<MerchantTheme>('light');

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as MerchantTheme | null;
    if (stored === 'light' || stored === 'dark') {
      setTheme(stored);
    }
  }, []);

  const toggleTheme = () => {
    setTheme((current) => {
      const next = current === 'dark' ? 'light' : 'dark';
      localStorage.setItem(STORAGE_KEY, next);
      return next;
    });
  };

  return { theme, toggleTheme };
}
