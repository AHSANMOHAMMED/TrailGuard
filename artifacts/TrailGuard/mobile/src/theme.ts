/**
 * Light (default) matches the web A01 white field UI.
 * Night matches the previous dark chrome — user toggles on Home.
 */
export type MobileTheme = 'light' | 'night';

export type ThemeColors = {
  bg: string;
  surface: string;
  elevated: string;
  fg: string;
  muted: string;
  accent: string;
  accentFg: string;
  border: string;
  warn: string;
  card: string;
  inputBg: string;
};

const LIGHT: ThemeColors = {
  bg: '#F6F8F5',
  surface: '#FFFFFF',
  elevated: '#EEF3EE',
  fg: '#16281E',
  muted: '#5F7366',
  accent: '#1F5A43',
  accentFg: '#FFFFFF',
  border: '#DDE5DD',
  warn: '#D97706',
  card: '#FFFFFF',
  inputBg: '#FFFFFF',
};

const NIGHT: ThemeColors = {
  bg: '#0A100C',
  surface: '#141E18',
  elevated: '#1A2620',
  fg: '#E6F0E6',
  muted: '#8A9E8E',
  accent: '#2EA05F',
  accentFg: '#FFFFFF',
  border: '#2E5038',
  warn: '#F0B429',
  card: '#141E18',
  inputBg: '#141E18',
};

let theme: MobileTheme = 'light';
const listeners = new Set<() => void>();

export function getTheme(): MobileTheme {
  return theme;
}

export function getColors(): ThemeColors {
  return theme === 'night' ? NIGHT : LIGHT;
}

export function setTheme(next: MobileTheme) {
  theme = next;
  listeners.forEach((l) => l());
}

export function toggleTheme() {
  setTheme(theme === 'night' ? 'light' : 'night');
}

export function subscribeTheme(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
