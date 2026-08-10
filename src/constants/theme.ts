/**
 * Design tokens (redesign-vibrant-ui). Dark-first palette with full light
 * theme, brand/secondary gradients, typography scale, spacing/radius.
 */
import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#0F1419',
    background: '#F6F7F9',
    backgroundElement: '#FFFFFF',
    backgroundSelected: '#EBEEF2',
    textSecondary: '#5B6472',
    border: 'rgba(15,20,25,0.08)',
    surface: '#FFFFFF',
    surfaceElevated: '#FFFFFF',
    overlay: 'rgba(0,0,0,0.40)',
    danger: '#D9383E',
  },
  dark: {
    text: '#F5F7FA',
    background: '#0B0F14',
    backgroundElement: '#151B22',
    backgroundSelected: '#1C242E',
    textSecondary: '#8B95A3',
    border: 'rgba(255,255,255,0.08)',
    surface: '#151B22',
    surfaceElevated: '#1C242E',
    overlay: 'rgba(0,0,0,0.55)',
    danger: '#FF5A5F',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

/** Primary CTA gradient (vibrant sporty: red-orange → amber). */
export const BrandGradient = ['#FF512F', '#F09819'] as const;

/** Secondary CTA gradient (cyan → blue). */
export const SecondaryGradient = ['#22D3EE', '#3B82F6'] as const;

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

/** Typography scale (system font, weight-based). */
export const Typography = {
  /** 80–96 / 700–800, tabular-nums — countdown. Use via style, size per context. */
  display: 80,
  /** 34 / 700 — stage name on Timer. */
  title: 34,
  /** 22 / 700 — screen headings. */
  heading: 22,
  /** 17 / 600 — card titles. */
  subtitle: 17,
  /** 15 / 500 — body. */
  body: 15,
  /** 13 / 500 — meta, chips. */
  caption: 13,
  /** 11 / 600 uppercase letterSpacing 1 — labels. */
  micro: 11,
} as const;

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 12,
  four: 16,
  five: 24,
  six: 32,
  seven: 48,
} as const;

export const Radius = {
  sm: 10,
  md: 14,
  lg: 20,
  xl: 24,
  pill: 999,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
