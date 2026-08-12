/**
 * User-imported sounds store tests (spec: custom sounds).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createUserSoundId, getUserSound, isUserSoundId, useUserSoundsStore, UserSound } from '../user-sounds-store';

const KEY = 'looptimer:user-sounds';

function makeSound(overrides: Partial<UserSound> = {}): UserSound {
  return {
    id: createUserSoundId(),
    label: 'My ringtone',
    uri: 'file:///mock-user-sounds/my-ringtone.m4a',
    addedAt: Date.now(),
    ...overrides,
  };
}

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  useUserSoundsStore.setState({ sounds: [], loaded: false });
});

describe('user-sounds store', () => {
  it('isUserSoundId nhận diện id namespace user-*', () => {
    expect(isUserSoundId('user-123')).toBe(true);
    expect(isUserSoundId('chime-up')).toBe(false);
    expect(isUserSoundId('pack-beep')).toBe(false);
    expect(isUserSoundId(null)).toBe(false);
    expect(isUserSoundId(undefined)).toBe(false);
  });

  it('createUserSoundId tạo id prefix user-', () => {
    expect(isUserSoundId(createUserSoundId())).toBe(true);
    expect(createUserSoundId()).not.toBe(createUserSoundId());
  });

  it('add + load lưu và đọc lại từ AsyncStorage', async () => {
    const s = makeSound();
    await useUserSoundsStore.getState().add(s);
    expect(useUserSoundsStore.getState().sounds).toEqual([s]);

    // Re-hydrate from storage (as after an app restart).
    useUserSoundsStore.setState({ sounds: [], loaded: false });
    await useUserSoundsStore.getState().load();
    expect(useUserSoundsStore.getState().sounds).toEqual([s]);
    expect(useUserSoundsStore.getState().loaded).toBe(true);
  });

  it('remove xóa đúng sound và persist', async () => {
    const a = makeSound({ label: 'A' });
    const b = makeSound({ label: 'B' });
    await useUserSoundsStore.getState().add(a);
    await useUserSoundsStore.getState().add(b);

    await useUserSoundsStore.getState().remove(a.id);
    expect(useUserSoundsStore.getState().sounds.map((s) => s.id)).toEqual([b.id]);

    const raw = await AsyncStorage.getItem(KEY);
    expect(JSON.parse(raw as string).map((s: UserSound) => s.id)).toEqual([b.id]);
  });

  it('getUserSound resolve từ store state (sync)', async () => {
    const s = makeSound();
    await useUserSoundsStore.getState().add(s);
    expect(getUserSound(s.id)?.label).toBe('My ringtone');
    expect(getUserSound('user-nope')).toBeUndefined();
    expect(getUserSound('chime-up')).toBeUndefined();
  });

  it('load với dữ liệu hỏng → sounds rỗng, không crash', async () => {
    await AsyncStorage.setItem(KEY, 'not-json{');
    await useUserSoundsStore.getState().load();
    expect(useUserSoundsStore.getState().sounds).toEqual([]);
    expect(useUserSoundsStore.getState().loaded).toBe(true);
  });
});
