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
  primary: string;
  secondary: string;
  accent: string;
  accentFg: string;
  border: string;
  warn: string;
  success: string;
  danger: string;
  card: string;
  inputBg: string;
};

const LIGHT: ThemeColors = {
  bg: '#F6F8F5',
  surface: '#FFFFFF',
  elevated: '#EEF3EE',
  fg: '#16281E',
  muted: '#5F7366',
  primary: '#1F5A43',
  secondary: '#3B7A57',
  accent: '#1F5A43',
  accentFg: '#FFFFFF',
  border: '#DDE5DD',
  warn: '#D97706',
  success: '#2E7D50',
  danger: '#DC2626',
  card: '#FFFFFF',
  inputBg: '#FFFFFF',
};

const NIGHT: ThemeColors = {
  bg: '#0A100C',
  surface: '#141E18',
  elevated: '#1A2620',
  fg: '#E6F0E6',
  muted: '#8A9E8E',
  primary: '#2EA05F',
  secondary: '#3B7A57',
  accent: '#2EA05F',
  accentFg: '#FFFFFF',
  border: '#2E5038',
  warn: '#F0B429',
  success: '#2E7D50',
  danger: '#EF4444',
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
