/**
 * Sound catalog (spec: monetization — custom sound pack, 24h rewarded unlock).
 *
 * Built-in sounds are always available; the custom pack is `locked` until the
 * user watches a Rewarded ad (see features/monetization/rewarded-unlock.ts).
 * Sound names are kept as universal product nouns (Beep/Gong/Bell/...), so
 * they are not localized — only the UI labels around them are.
 */
export interface SoundOption {
  id: string;
  /** Display name (universal product noun — not localized). */
  label: string;
  /** Custom-pack sounds start locked (Rewarded unlock). */
  locked?: boolean;
}

export const BUILTIN_SOUNDS: SoundOption[] = [
  { id: 'chime-up', label: 'Chime 1' },
  { id: 'chime-down', label: 'Chime 2' },
  { id: 'chime-done', label: 'Chime 3' },
];

export const CUSTOM_SOUNDS: SoundOption[] = [
  { id: 'pack-beep', label: 'Beep', locked: true },
  { id: 'pack-tick', label: 'Tick', locked: true },
  { id: 'pack-bell', label: 'Bell', locked: true },
  { id: 'pack-gong', label: 'Gong', locked: true },
  { id: 'pack-alarm', label: 'Alarm', locked: true },
  { id: 'pack-marimba', label: 'Marimba', locked: true },
];

export const ALL_SOUNDS: SoundOption[] = [...BUILTIN_SOUNDS, ...CUSTOM_SOUNDS];

export function soundById(id?: string | null): SoundOption | undefined {
  if (!id) return undefined;
  return ALL_SOUNDS.find((s) => s.id === id);
}

export const DEFAULT_SOUND_ID = 'chime-up';

/** Resolve a stage's transition sound, falling back to the default chime. */
export function resolveSoundId(soundId?: string | null): string {
  return soundById(soundId)?.id ?? DEFAULT_SOUND_ID;
}

/**
 * Static require map for the audio preloader. `require` calls must use static
 * string literals (Metro requirement), and the same file must resolve on both
 * native (number asset id) and web (URL string).
 */
export const SOUND_SOURCES: Record<string, number | string> = {
  'chime-up': require('../../../assets/sounds/chime-up.wav'),
  'chime-down': require('../../../assets/sounds/chime-down.wav'),
  'chime-done': require('../../../assets/sounds/chime-done.wav'),
  'pack-beep': require('../../../assets/sounds/soundpack/pack-beep.wav'),
  'pack-tick': require('../../../assets/sounds/soundpack/pack-tick.wav'),
  'pack-bell': require('../../../assets/sounds/soundpack/pack-bell.wav'),
  'pack-gong': require('../../../assets/sounds/soundpack/pack-gong.wav'),
  'pack-alarm': require('../../../assets/sounds/soundpack/pack-alarm.wav'),
  'pack-marimba': require('../../../assets/sounds/soundpack/pack-marimba.wav'),
};

/** Ids of the "stage transition" sounds the preloader must load. */
export function allSoundIds(): string[] {
  return ALL_SOUNDS.map((s) => s.id);
}
