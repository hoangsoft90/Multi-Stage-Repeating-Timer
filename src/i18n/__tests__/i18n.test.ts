/**
 * i18n tests: key parity across ALL languages, device-locale resolution and
 * interpolation. Device locale in jest is mocked to Vietnamese.
 */
import i18n, {
  resolveLanguage,
  systemLanguage,
  t,
  LANGUAGE_OPTIONS,
  SUPPORTED_LANGUAGES,
  resources,
} from '../index';
import { vi } from '../vi';

describe('i18n', () => {
  afterEach(() => {
    i18n.changeLanguage('vi');
  });

  it('mọi ngôn ngữ có đúng bộ key như tiếng Việt', () => {
    const viKeys = Object.keys(vi).sort();
    for (const lng of SUPPORTED_LANGUAGES) {
      const dict = resources[lng].translation;
      expect(Object.keys(dict).sort()).toEqual(viKeys);
    }
  });

  it('mọi giá trị giữ đúng token {{...}} như tiếng Việt (không sót single-brace)', () => {
    const tokens = (s: string) => [...s.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]).sort();
    const viKeys = Object.keys(vi) as Array<keyof typeof vi>;
    for (const lng of SUPPORTED_LANGUAGES) {
      const dict = resources[lng].translation as Record<string, string>;
      for (const key of viKeys) {
        const value = dict[key as string];
        expect(tokens(value)).toEqual(tokens(vi[key]));
        // Không còn dấu ngoặc {} nào sau khi bỏ token hợp lệ
        expect(value.replace(/\{\{\w+\}\}/g, '')).not.toMatch(/[{}]/);
      }
    }
  });

  it('resolveLanguage: system theo thiết bị; mã ngôn ngữ giữ nguyên', () => {
    // Device locale trong jest = vi (mock expo-localization)
    expect(systemLanguage()).toBe('vi');
    expect(resolveLanguage('system')).toBe('vi');
    for (const code of SUPPORTED_LANGUAGES) {
      expect(resolveLanguage(code)).toBe(code);
    }
  });

  it('t dịch đúng từng ngôn ngữ + interpolation', () => {
    i18n.changeLanguage('vi');
    expect(t('editor.saveCta')).toBe('💾 Lưu preset');
    expect(t('timer.stopConfirm.title')).toBe('Dừng timer?');
    expect(t('validation.roundsMin')).toBe('Số round phải ≥ 1');
    expect(t('home.deleteConfirm.message', { name: 'HIIT' })).toBe('"HIIT" sẽ bị xóa vĩnh viễn.');

    i18n.changeLanguage('en');
    expect(t('editor.saveCta')).toBe('💾 Save preset');
    expect(t('home.deleteConfirm.message', { name: 'HIIT' })).toBe('"HIIT" will be permanently deleted.');
    expect(t('timer.round', { current: 1, total: '∞' })).toBe('ROUND 1 / ∞');

    i18n.changeLanguage('ja');
    expect(t('editor.saveCta')).toBe('💾 プリセットを保存');
    expect(t('recovery.stageLeft', { stage: 'WORK', time: '01:00' })).toBe('ステージ: WORK · 残り 01:00');

    i18n.changeLanguage('zh-Hans');
    expect(t('timer.stopConfirm.title')).toBe('停止计时器？');

    i18n.changeLanguage('ko');
    expect(t('home.start')).toBe('▶ 시작');
  });

  it('LANGUAGE_OPTIONS có system + đủ 12 ngôn ngữ, label là endonym', () => {
    const values = LANGUAGE_OPTIONS.map((o) => o.value);
    expect(values).toEqual(['system', ...SUPPORTED_LANGUAGES]);
    expect(LANGUAGE_OPTIONS.every((o) => o.labelKey in vi)).toBe(true);
    // Endonym được hiển thị bằng chính ngôn ngữ đó trong mọi dict
    expect(t('settings.languageJapanese')).toBe('日本語');
    i18n.changeLanguage('ru');
    expect(t('settings.languageJapanese')).toBe('日本語');
    expect(t('settings.languageRussian')).toBe('Русский');
  });
});
