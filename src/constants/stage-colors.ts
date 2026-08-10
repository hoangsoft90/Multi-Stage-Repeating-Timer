/**
 * Stage colors (redesign-vibrant-ui): accent color follows the current
 * stage so the user reads state by color (WORK red/orange, BREAK green…).
 *
 * Heuristic: lowercase the stage name and match keywords; unknown names
 * fall back to the amber `default` group. The stage name is ALWAYS shown
 * next to the color (accessibility — never color-only).
 */
export interface StageColor {
  /** Main accent (dark mode). */
  main: string;
  /** Accent on light backgrounds. */
  light: string;
  /** Gradient stops for rings/CTAs. */
  gradient: readonly [string, string];
  /** Low-alpha tint for the Timer background wash. */
  tint: string;
}

export const STAGE_COLORS: Record<string, StageColor> = {
  work: {
    main: '#FF4D2E',
    light: '#E23D12',
    gradient: ['#FF7A18', '#FF3D2E'],
    tint: 'rgba(255,77,46,0.12)',
  },
  break: {
    main: '#22C55E',
    light: '#16A34A',
    gradient: ['#4ADE80', '#16A34A'],
    tint: 'rgba(34,197,94,0.12)',
  },
  focus: {
    main: '#A78BFA',
    light: '#7C3AED',
    gradient: ['#C4B5FD', '#7C3AED'],
    tint: 'rgba(167,139,250,0.12)',
  },
  cooldown: {
    main: '#38BDF8',
    light: '#0284C7',
    gradient: ['#7DD3FC', '#0284C7'],
    tint: 'rgba(56,189,248,0.12)',
  },
  default: {
    main: '#F59E0B',
    light: '#D97706',
    gradient: ['#FBBF24', '#F59E0B'],
    tint: 'rgba(245,158,11,0.12)',
  },
};

const KEYWORD_GROUPS: Array<[string[], string]> = [
  [['work', 'focus', 'hiit', 'sprint', 'push', 'exercise', 'run'], 'work'],
  [['break', 'rest', 'rest'], 'break'],
  [['focus', 'deep'], 'focus'],
  [['cooldown', 'cool', 'stretch', 'warm'], 'cooldown'],
];

/** Map a stage name → group key ('work' | 'break' | 'focus' | 'cooldown' | 'default'). */
export function stageColorKey(name: string | undefined | null): string {
  const n = (name ?? '').toLowerCase().trim();
  if (!n) return 'default';
  for (const [keywords, key] of KEYWORD_GROUPS) {
    if (keywords.some((k) => n.includes(k))) return key;
  }
  return 'default';
}

/** Resolved StageColor for a stage name (dark mode by default). */
export function stageColorFor(name: string | undefined | null): StageColor {
  return STAGE_COLORS[stageColorKey(name)] ?? STAGE_COLORS.default;
}

/** Accent main color for the current theme. */
export function stageAccent(name: string | undefined | null, isDark: boolean): string {
  const c = stageColorFor(name);
  return isDark ? c.main : c.light;
}

/** Accent for a raw group key, honoring theme. */
export function groupAccent(key: string, isDark: boolean): string {
  const c = STAGE_COLORS[key] ?? STAGE_COLORS.default;
  return isDark ? c.main : c.light;
}

/** Cycles group keys so stages without a match still look varied. */
export function stageColorAt(index: number): StageColor {
  const keys = Object.keys(STAGE_COLORS);
  return STAGE_COLORS[keys[index % keys.length]] ?? STAGE_COLORS.default;
}

