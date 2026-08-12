/* eslint-env jest */
// Initialize the i18n singleton early so every test file (even ones that only
// import components using useTranslation) sees real translations.
require('./src/i18n');

// AsyncStorage mock — use-theme now reaches the settings store (→ repos →
// AsyncStorage), so any component test that renders a themed component needs
// the mock. Mock globally instead of duplicating it in every test file.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// expo-document-picker + expo-file-system (custom sounds import) — native
// modules have no jest implementation. The editor screen imports
// import-sound.ts transitively, so mock both globally (pickAudioFile is never
// exercised in unit tests — only its imports must not throw).
jest.mock('expo-document-picker', () => ({
  getDocumentAsync: jest.fn().mockResolvedValue({ canceled: true, assets: [] }),
}));

jest.mock('expo-file-system', () => {
  class MockFile {
    constructor(..._parts) {
      this.uri = 'file:///mock-sound.wav';
    }
    copy = jest.fn().mockResolvedValue(undefined);
    create = jest.fn();
    get exists() {
      return true;
    }
  }
  class MockDirectory {
    constructor(..._parts) {
      this.uri = 'file:///mock-dir';
    }
    create = jest.fn();
    get exists() {
      return true;
    }
  }
  return {
    File: MockFile,
    Directory: MockDirectory,
    Paths: { document: new MockDirectory(), cache: new MockDirectory() },
  };
});

// Deterministic device locale for i18n tests (device reports Vietnamese).
jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageCode: 'vi', languageTag: 'vi-VN', textDirection: 'ltr' }],
  getCalendars: () => [{ calendar: 'gregorian' }],
  getCountryCode: () => 'VN',
  getTimeZone: () => 'Asia/Ho_Chi_Minh',
  getPreferences: () => ({ locale: 'vi-VN' }),
  getLocalesAsync: async () => [{ languageCode: 'vi', languageTag: 'vi-VN', textDirection: 'ltr' }],
  getCalendarsAsync: async () => [{ calendar: 'gregorian' }],
  getCountryCodeAsync: async () => 'VN',
  getTimeZoneAsync: async () => 'Asia/Ho_Chi_Minh',
  getPreferencesAsync: async () => ({ locale: 'vi-VN' }),
}));

// Minimal mock for react-native-reanimated. The official `mock.js` and
// `setUpTests()` both crash in jest-expo SDK 57 because they load the
// worklets native module (loadUnpackers). We provide just enough for the
// animated components to render in tests (no real animation).
jest.mock('react-native-reanimated', () => {
  const React = require('react');
  const passthrough = (C) => C;
  const createAnimatedComponent = passthrough;
  return {
    __esModule: true,
    default: { createAnimatedComponent },
    useSharedValue: (initial) => React.useRef({ value: initial }).current,
    useAnimatedProps: (factory) => factory(),
    useAnimatedStyle: (factory) => factory(),
    withTiming: (toValue) => toValue,
    withSpring: (toValue) => toValue,
    withRepeat: (v) => v,
    withSequence: (...vals) => vals[vals.length - 1],
    Easing: { inOut: (x) => x, linear: (x) => x },
    interpolate: (x, input, output) => output[output.length - 1],
    Extrapolation: { CLAMP: 'clamp' },
    createAnimatedComponent,
    useDerivedValue: (fn) => ({ value: fn() }),
    runOnJS: (fn) => fn,
    cancelAnimation: () => {},
  };
});
