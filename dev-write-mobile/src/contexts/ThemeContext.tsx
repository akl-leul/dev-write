import React, { createContext, useContext, useEffect, useState } from 'react';
import { Appearance } from 'react-native';
import { useColorScheme } from 'react-native';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  colorScheme: 'light' | 'dark';
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [theme, setTheme] = useState<Theme>('system');

  const getColorScheme = (): 'light' | 'dark' => {
    if (theme === 'system') {
      return systemColorScheme || 'light';
    }
    return theme;
  };

  const colorScheme = getColorScheme();
  const isDark = colorScheme === 'dark';

  useEffect(() => {
    // Update system appearance when theme changes
    if (theme !== 'system') {
      Appearance.setColorScheme(theme);
    } else {
      Appearance.setColorScheme(systemColorScheme);
    }
  }, [theme, systemColorScheme]);

  const toggleTheme = () => {
    setTheme(isDark ? 'light' : 'dark');
  };

  const value = {
    theme,
    colorScheme,
    setTheme,
    toggleTheme,
    isDark,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};
