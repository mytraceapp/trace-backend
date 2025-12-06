import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';

export type ThemeMode = 'day' | 'night' | 'auto';
export type EffectiveTheme = 'day' | 'night';

interface ThemeState {
  theme: ThemeMode;
  effectiveTheme: EffectiveTheme;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeState | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

function getSystemTheme(): EffectiveTheme {
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'night' : 'day';
  }
  return 'day';
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('trace-theme');
      if (stored === 'day' || stored === 'night' || stored === 'auto') {
        return stored;
      }
    }
    return 'day';
  });

  const [systemTheme, setSystemTheme] = useState<EffectiveTheme>(getSystemTheme);

  const effectiveTheme: EffectiveTheme = theme === 'auto' ? systemTheme : theme;

  const setTheme = useCallback((newTheme: ThemeMode) => {
    setThemeState(newTheme);
    localStorage.setItem('trace-theme', newTheme);
  }, []);

  const toggleTheme = useCallback(() => {
    if (theme === 'day') {
      setTheme('night');
    } else if (theme === 'night') {
      setTheme('auto');
    } else {
      setTheme('day');
    }
  }, [theme, setTheme]);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? 'night' : 'day');
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    
    if (effectiveTheme === 'night') {
      root.classList.add('theme-night');
      root.classList.remove('theme-day');
    } else {
      root.classList.add('theme-day');
      root.classList.remove('theme-night');
    }
  }, [effectiveTheme]);

  return (
    <ThemeContext.Provider value={{ theme, effectiveTheme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
