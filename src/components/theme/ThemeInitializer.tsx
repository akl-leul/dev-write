import React, { useEffect, useState } from 'react';
import { useTheme } from '@/contexts/ThemeContext';

export function ThemeInitializer({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch by only rendering the theme after mounting
  useEffect(() => {
    setMounted(true);
  }, []);

  // Apply theme class to the root element
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const root = window.document.documentElement;

    // Remove all theme classes
    root.classList.remove('light', 'dark');

    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
      root.classList.add(systemTheme);
    } else {
      root.classList.add(theme);
    }
  }, [theme]);

  // Render children immediately to prevent white screen
  // Theme will be applied after mounting
  return <>{children}</>;
}
