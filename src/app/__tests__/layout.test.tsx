/**
 * Regression test for the "Maximum update depth exceeded" crash on web:
 * useBootstrap() previously used `useSettingsStore((s) => [s.settings, s.set])`
 * — an array-literal selector that returns a new reference every render,
 * which loops forever under zustand's Object.is comparison.
 *
 * Rendering the real RootLayout exercises useBootstrap + the feedback
 * coordinator attach path; if the unstable selector ever comes back, React
 * throws "Maximum update depth exceeded" and this test fails.
 */
import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { render, screen, waitFor } from '@testing-library/react-native';

import RootLayout from '../_layout';
import { useSettingsStore } from '../../features/settings/settings-store';
import { usePresetsStore } from '../../features/presets/presets-store';
import { useTimerStore } from '../../features/timer/timer-store';

jest.mock('expo-router', () => {
  const React = require('react');
  const { View } = require('react-native');
  const Stack = ({ children }: { children?: React.ReactNode }) => React.createElement(View, null, children);
  Stack.Screen = () => null;
  return {
    Stack,
    ThemeProvider: ({ children }: { children?: React.ReactNode }) => children,
    DarkTheme: {},
    DefaultTheme: {},
    useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
    usePathname: () => '/',
    useLocalSearchParams: () => ({}),
  };
});

jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
    SafeAreaView: ({ children, ...props }: Record<string, unknown>) =>
      React.createElement(View, props, children),
    useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
  };
});

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('../../platform', () => {
  const m = jest.requireActual('../../test-utils/platform-mock');
  return m.platformMock;
});

jest.mock('expo-intent-launcher', () => ({
  startActivityAsync: jest.fn().mockResolvedValue(undefined),
}));

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  usePresetsStore.setState({ presets: [], loaded: false });
  useTimerStore.setState({ recovery: null });
});

afterEach(async () => {
  const st = useTimerStore.getState();
  if (st.state.status === 'running' || st.state.status === 'paused') {
    await st.stop();
  }
  await AsyncStorage.clear();
});

test('RootLayout mounts without an infinite render loop and boots once', async () => {
  // If the unstable selector returns, this render() call throws
  // "Maximum update depth exceeded" and the test fails.
  await render(<RootLayout />);

  // Bootstrap effect ran and completed: settings + presets got loaded.
  await waitFor(() => expect(useSettingsStore.getState().loaded).toBe(true));
  await waitFor(() => expect(usePresetsStore.getState().loaded).toBe(true));

  // The screen tree rendered something.
  expect(screen.toJSON()).not.toBeNull();
});
