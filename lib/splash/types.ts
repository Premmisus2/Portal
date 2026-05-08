// Sales Portal — Splash shell types.
// Host-agnostic. Mirrors the splash-builder skill's empty shell pattern.
// Same shape as Mafia's splash types so future hosts can reuse.

export type SplashMode = 'light' | 'mid' | 'dark';

export type SplashPalette = {
  bg: string;
  ink: string;
  inkMuted: string;
  inkDim: string;
  border: string;
  accent: string;
  accentSoft: string;
  accentSoftBorder: string;
  accentGlow: string;
  font: string;
  displayFont: string;
};

export type SplashQuote = {
  id: string;
  text: string;
  attribution: string;
  source: string | null;
};

export type SplashCadence =
  | { kind: 'every-entry' }
  | { kind: 'once-per-day'; todayKey: string; seenDateStorageKey: string };

export type SplashConfig = {
  storageKeyPrefix: string;
  palettes: Record<SplashMode, SplashPalette>;
  defaultMode: SplashMode;
  modeStorageKey: string;
  sectionLabel: string;
  enterLabel: string;
  quotes: SplashQuote[];
  rotationMs: number;
  workingUrl: string;
  cadence: SplashCadence;
};

export type GateDecision = 'pending' | 'splash' | 'pass' | 'unauthenticated';
