import React, { createContext, useContext, useState, useEffect } from 'react';

export type ThemeColor = 'blue' | 'purple' | 'emerald' | 'rose' | 'amber';
export type ThemeMode = 'light' | 'dark' | 'sepia';

interface ThemeContextType {
  accentColor: ThemeColor;
  setAccentColor: (color: ThemeColor) => void;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [accentColor, setAccentColor] = useState<ThemeColor>(() => {
    return (localStorage.getItem('accentColor') as ThemeColor) || 'blue';
  });

  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    return (localStorage.getItem('themeMode') as ThemeMode) || 'light';
  });

  useEffect(() => {
    localStorage.setItem('accentColor', accentColor);
  }, [accentColor]);

  useEffect(() => {
    localStorage.setItem('themeMode', themeMode);
    
    document.documentElement.classList.remove('dark', 'light', 'sepia', 'theme-neutral');
    if (themeMode === 'dark') {
      document.documentElement.classList.add('dark');
    } else if (themeMode === 'sepia') {
      document.documentElement.classList.add('sepia');
    } else {
      document.documentElement.classList.add('light');
    }
  }, [themeMode]);

  return (
    <ThemeContext.Provider value={{ accentColor, setAccentColor, themeMode, setThemeMode }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const getColorClass = (color: ThemeColor, shade: number = 600) => {
    return `bg-${color}-${shade}`;
};
