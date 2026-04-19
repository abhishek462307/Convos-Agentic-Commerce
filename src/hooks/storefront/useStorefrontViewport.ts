import { useState, useEffect } from 'react';

interface ViewportInfo {
  width: number;
  isDesktop: boolean;
  columns: number;
  mounted: boolean;
}

export function useStorefrontViewport(): ViewportInfo {
  const [viewportWidth, setViewportWidth] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window === 'undefined') return;
    const updateWidth = () => setViewportWidth(window.innerWidth);
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  const isDesktop = mounted ? viewportWidth >= 768 : false;
  const columns = mounted ? (viewportWidth >= 1280 ? 5 : viewportWidth >= 1024 ? 4 : viewportWidth >= 768 ? 3 : 2) : 2;

  return {
    width: viewportWidth,
    isDesktop,
    columns,
    mounted,
  };
}
