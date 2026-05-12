'use client';

import { useEffect, useState } from 'react';

/* ────────────────────────────────────────────────────────────────────────
   Theme system — dark (default JARVIS Workshop) and light (clean document).
   - Reads/writes body.theme-light class
   - Persists per-device in localStorage under "premmisus:theme"
   - Default is dark (preserves the existing operator-facing experience)
   - Anti-flash bootstrap script lives in app/layout.tsx, runs before React
     hydrates so users don't see a flash of the wrong theme
   ──────────────────────────────────────────────────────────────────────── */

export type Theme = 'dark' | 'light';

export const THEME_STORAGE_KEY = 'premmisus:theme';

function readStoredTheme(): Theme {
  if (typeof window === 'undefined') return 'dark';
  try {
    const v = localStorage.getItem(THEME_STORAGE_KEY);
    if (v === 'light' || v === 'dark') return v;
  } catch {}
  // Fallback to whatever the anti-flash script applied (in case storage is
  // unavailable but the body class is already set by the inline bootstrap)
  if (typeof document !== 'undefined' && document.body.classList.contains('theme-light')) {
    return 'light';
  }
  return 'dark';
}

function applyTheme(theme: Theme) {
  if (typeof document === 'undefined') return;
  if (theme === 'light') {
    document.body.classList.add('theme-light');
  } else {
    document.body.classList.remove('theme-light');
  }
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>('dark');

  // Read stored theme on mount + sync state
  useEffect(() => {
    const stored = readStoredTheme();
    setThemeState(stored);
    applyTheme(stored);
  }, []);

  // Apply + persist whenever theme changes
  const setTheme = (next: Theme) => {
    setThemeState(next);
    applyTheme(next);
    try { localStorage.setItem(THEME_STORAGE_KEY, next); } catch {}
  };

  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');

  return { theme, setTheme, toggleTheme };
}

/* Inline script payload — paste into <body> at the very top via
   dangerouslySetInnerHTML in app/layout.tsx. Runs BEFORE React hydrates so
   the body has the correct theme class on first paint. Defensive try/catch
   so a private-mode browser without localStorage doesn't crash. */
export const ANTI_FLASH_SCRIPT = `
(function(){
  try {
    var t = localStorage.getItem('${THEME_STORAGE_KEY}');
    if (t === 'light') document.body.classList.add('theme-light');
  } catch(e) {}
})();
`;
