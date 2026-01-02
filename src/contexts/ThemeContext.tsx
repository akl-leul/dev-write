import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';

type Theme = 'dark' | 'light' | 'system';
type ResolvedTheme = 'dark' | 'light';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: ResolvedTheme;
  isDarkMode: boolean;
  toggleTheme: () => void;
  systemTheme: ResolvedTheme;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('system');
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>('light');
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>('light');
  const [isMounted, setIsMounted] = useState(false);

  // Get system theme preference
  const getSystemTheme = useCallback((): ResolvedTheme => {
    if (typeof window === 'undefined') return 'light';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }, []);

  // Apply theme class to document element with smooth transition
  const applyTheme = useCallback((newTheme: Theme, smooth = true) => {
    if (typeof window === 'undefined') return;

    const root = window.document.documentElement;
    const resolved = newTheme === 'system' ? getSystemTheme() : newTheme;

    // Add transition class for smooth theme switching
    if (smooth) {
      root.style.transition = 'background-color 0.3s ease, color 0.3s ease';
    }

    // Remove all theme classes first
    root.classList.remove('light', 'dark');

    // Add the appropriate theme class
    root.classList.add(resolved);

    // Update state
    setResolvedTheme(resolved);

    // Save to localStorage (except for system theme)
    if (newTheme !== 'system') {
      localStorage.setItem('theme', newTheme);
    } else {
      localStorage.removeItem('theme');
    }

    // Remove transition after animation completes
    if (smooth) {
      setTimeout(() => {
        root.style.transition = '';
      }, 300);
    }
  }, [getSystemTheme]);

  // Initialize theme from localStorage or system preference
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const storedTheme = localStorage.getItem('theme') as Theme | null;
    const initialTheme = storedTheme || 'system';
    const currentSystemTheme = getSystemTheme();

    setSystemTheme(currentSystemTheme);
    setThemeState(initialTheme);
    applyTheme(initialTheme, false); // No transition on initial load
    setIsMounted(true);

    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleSystemThemeChange = () => {
      const newSystemTheme = getSystemTheme();
      setSystemTheme(newSystemTheme);
      // If we are currently on 'system' theme, re-apply it
      // Note: We need the latest theme state here, which we can get via functional update if needed
      // but 'theme' is in the dependency array so this will re-run.
    };

    mediaQuery.addEventListener('change', handleSystemThemeChange);
    return () => mediaQuery.removeEventListener('change', handleSystemThemeChange);
  }, [theme, applyTheme, getSystemTheme]);

  // Set theme and update the UI
  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
    applyTheme(newTheme);
  }, [applyTheme]);

  // Toggle between light and dark themes
  const toggleTheme = useCallback(() => {
    if (theme === 'light') {
      setTheme('dark');
    } else if (theme === 'dark') {
      setTheme('light');
    } else {
      // If system, toggle to the opposite of current system theme
      setTheme(systemTheme === 'light' ? 'dark' : 'light');
    }
  }, [theme, systemTheme, setTheme]);

  // Memoize the context value
  const contextValue = useMemo(() => ({
    theme,
    setTheme,
    resolvedTheme,
    isDarkMode: resolvedTheme === 'dark',
    toggleTheme,
    systemTheme,
  }), [theme, setTheme, resolvedTheme, toggleTheme, systemTheme]);

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
