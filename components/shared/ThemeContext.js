import React, { createContext, useContext, useState, useEffect } from 'react';
import { storage } from './constants';

// ─── Dark theme ───────────────────────────────────────────────────────────────
const DARK = {
  bg:         '#070d1a',
  surface:    '#0e1629',
  surface2:   '#162035',
  surfaceAlt: '#0c1424',
  border:     '#1e2d4a',
  borderLight:'#253654',
  primary:    '#1e40af',
  accent:     '#f59e0b',
  text:       '#e2e8f0',
  textSec:    '#94a3b8',
  textMuted:  '#475569',
  green:      '#10b981',
  yellow:     '#f59e0b',
  red:        '#ef4444',
};

// ─── Light theme ──────────────────────────────────────────────────────────────
const LIGHT = {
  bg:         '#f8fafc',
  surface:    '#ffffff',
  surface2:   '#f1f5f9',
  surfaceAlt: '#f8fafc',
  border:     '#e2e8f0',
  borderLight:'#cbd5e1',
  primary:    '#1e40af',
  accent:     '#d97706',
  text:       '#0f172a',
  textSec:    '#475569',
  textMuted:  '#94a3b8',
  green:      '#10b981',
  yellow:     '#d97706',
  red:        '#ef4444',
};

const ThemeContext = createContext(null);

// ─── Provider ─────────────────────────────────────────────────────────────────
export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(true); // default dark to avoid white flash

  useEffect(() => {
    storage.get('theme').then(val => {
      if (val === 'light') setIsDark(false);
      // 'dark' or null → stay dark
    });
  }, []);

  const toggleTheme = () => {
    setIsDark(prev => {
      const next = !prev;
      storage.set('theme', next ? 'dark' : 'light');
      return next;
    });
  };

  return (
    <ThemeContext.Provider value={{ C: isDark ? DARK : LIGHT, isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
}
