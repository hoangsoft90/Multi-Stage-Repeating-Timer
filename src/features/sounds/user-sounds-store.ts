/**
 * User-imported sounds store (Zustand) — audio files the user picks from
 * their device (spec: custom sounds). Import is gated by the rewarded 24h
 * unlock; PLAYBACK of imported files is permanent (product decision — the ad
 * only gates the import action, see design.md).
 *
 * Persisted to AsyncStorage (key `looptimer:user-sounds`). Sound ids use the
 * `user-<timestamp>` prefix so `isUserSoundId()` can distinguish them from
 * the bundled catalog (sound-pack.ts) everywhere a soundId is resolved.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

export interface UserSound {
  id: string;
  /** Display name — the picked file's name without its extension. */
  label: string;
  /** Absolute `file://` uri inside the app document directory (persists). */
  uri: string;
  addedAt: number;
}

const KEY = 'looptimer:user-sounds';

/**
 * Mutation guard against the load()/add() race: add/remove bump a revision;
 * a load() that started before a mutation resolves AFTER it is stale and must
 * not clobber the newer in-memory list with an older storage snapshot.
 */
let revision = 0;

/** User sound ids are namespaced (`user-...`) so lookups never clash with the
 * bundled catalog ids (chime-up, pack-beep, ...). */
export function isUserSoundId(id?: string | null): boolean {
  return !!id && id.startsWith('user-');
}

export function createUserSoundId(): string {
  return `user-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

interface UserSoundsState {
  sounds: UserSound[];
  loaded: boolean;
  load: () => Promise<void>;
  add: (sound: UserSound) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

export const useUserSoundsStore = create<UserSoundsState>((set, get) => ({
  sounds: [],
  loaded: false,

  load: async () => {
    const started = revision;
    try {
      const raw = await AsyncStorage.getItem(KEY);
      const sounds: UserSound[] = raw ? (JSON.parse(raw) as UserSound[]) : [];
      // A mutation completed while we were reading → its state is newer.
      if (revision !== started) return;
      set({ sounds, loaded: true });
    } catch {
      if (revision === started) set({ sounds: [], loaded: true });
    }
  },

  add: async (sound) => {
    revision += 1;
    const sounds = [...get().sounds, sound];
    await AsyncStorage.setItem(KEY, JSON.stringify(sounds));
    set({ sounds });
  },

  remove: async (id) => {
    revision += 1;
    const sounds = get().sounds.filter((s) => s.id !== id);
    await AsyncStorage.setItem(KEY, JSON.stringify(sounds));
    set({ sounds });
  },
}));

/** Sync lookup of a user sound (reads the in-memory store state). */
export function getUserSound(id?: string | null): UserSound | undefined {
  if (!isUserSoundId(id)) return undefined;
  return useUserSoundsStore.getState().sounds.find((s) => s.id === id);
}
