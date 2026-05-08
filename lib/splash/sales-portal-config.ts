// Sales Portal — Splash host config.
// Single-mode dark (JARVIS Workshop). All three SplashMode slots map to the
// same dark palette; if a light mode is added later, override the others.

import type { SplashConfig, SplashPalette } from './types';
import { SPLASH_QUOTES } from './quotes';

const DARK: SplashPalette = {
  bg: '#000000',
  ink: '#ffffff',
  inkMuted: '#888',
  inkDim: '#2a2a2a',
  border: 'rgba(0,240,255,.18)',
  accent: '#00F0FF',
  accentSoft: 'rgba(0,240,255,.10)',
  accentSoftBorder: 'rgba(0,240,255,.40)',
  accentGlow: 'rgba(0,240,255,.18)',
  font: 'Inter, sans-serif',
  displayFont: 'Inter, sans-serif',
};

export const SALES_PORTAL_SPLASH_CONFIG: SplashConfig = {
  storageKeyPrefix: 'pmss',
  palettes: { light: DARK, mid: DARK, dark: DARK },
  defaultMode: 'dark',
  modeStorageKey: 'pmss:mode',
  sectionLabel: 'Today’s Pitch',
  enterLabel: 'Enter',
  quotes: SPLASH_QUOTES,
  rotationMs: 12_000,
  workingUrl: '/',
  cadence: { kind: 'every-entry' },
};
