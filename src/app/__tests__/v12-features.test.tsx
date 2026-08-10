/**
 * v1.2 feature tests: onboarding flow, completion dialog, voice toggle in
 * settings, Home "Routine hôm nay" card, and preset import dialog.
 */
import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';

import HomeScreen from '../index';
import OnboardingScreen from '../onboarding';
import SettingsScreen from '../settings';
import { CompletionDialog } from '../../components/completion-dialog';
import { DialogHost, clearDialog } from '../../components/confirm';
import { platformMock } from '../../test-utils/platform-mock';
import { useTimerStore } from '../../features/timer/timer-store';
import { usePresetsStore } from '../../features/presets/presets-store';
import { useSettingsStore } from '../../features/settings/settings-store';
import { SessionLogRepo } from '../../core/storage/repos';
import { Preset } from '../../core/timer/models';

const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockBack = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace, back: mockBack }),
  useLocalSearchParams: () => ({}),
  useFocusEffect: (cb: () => void) => {
    const React = require('react');
    React.useEffect(() => cb(), [cb]);
  },
}));

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

function makePreset(overrides: Partial<Preset> = {}): Preset {
  return {
    id: 'p_test',
    name: 'Test',
    stages: [
      { id: 's1', name: 'WORK', durationSeconds: 60 },
      { id: 's2', name: 'BREAK', durationSeconds: 10 },
    ],
    repeatMode: 'forever',
    fixedCount: null,
    createdAt: 1,
    lastUsedAt: 1,
    schemaVersion: 1,
    ...overrides,
  };
}

beforeEach(async () => {
  jest.clearAllMocks();
  clearDialog();
  await AsyncStorage.clear();
  usePresetsStore.setState({ presets: [], loaded: false });
  useTimerStore.setState({ recovery: null, completion: null });
  await act(async () => {
    await useSettingsStore.getState().set({ onboardingDone: true });
  });
});

afterEach(async () => {
  const st = useTimerStore.getState();
  if (st.state.status === 'running' || st.state.status === 'paused') {
    await st.stop();
  }
  await AsyncStorage.clear();
});

describe('Onboarding (v1.2)', () => {
  it('hiển thị bước 1 (Welcome) với nút Next', async () => {
    await render(<OnboardingScreen />);
    expect(screen.getByText('Tập trung vào routine của bạn')).toBeTruthy();
    expect(screen.getByText('Tiếp')).toBeTruthy();
  });

  it('đi qua 3 bước và Start template gợi ý → session chạy + điều hướng /timer', async () => {
    await render(<OnboardingScreen />);
    await fireEvent.press(screen.getByText('Tiếp'));
    expect(screen.getByText('Bạn dùng LoopTimer để làm gì?')).toBeTruthy();
    // Chọn mục tiêu Workout → bước 3 gợi ý HIIT 40/20
    await fireEvent.press(screen.getByText('Tập luyện / HIIT'));
    await fireEvent.press(screen.getByText('Tiếp'));
    expect(screen.getByText('HIIT 40/20')).toBeTruthy();
    await fireEvent.press(screen.getByText('Bắt đầu'));
    await waitFor(() => expect(useTimerStore.getState().state.status).toBe('running'));
    expect(mockReplace).toHaveBeenCalledWith('/timer');
    expect(useSettingsStore.getState().settings.onboardingDone).toBe(true);
  });

  it('Skip → onboardingDone = true và về Home', async () => {
    await render(<OnboardingScreen />);
    await fireEvent.press(screen.getByText('Bỏ qua'));
    await waitFor(() => expect(useSettingsStore.getState().settings.onboardingDone).toBe(true));
    expect(mockReplace).toHaveBeenCalledWith('/');
  });
});

describe('CompletionDialog (v1.2)', () => {
  it('hiển thị khi session hoàn thành + Share gọi platform share', async () => {
    // Force a completion in the store (as if SessionCompleted fired).
    useTimerStore.setState({
      completion: { sessionId: 'log_1', presetId: 'p1', presetName: 'My HIIT', durationMs: 1_200_000, streak: 3 },
    });
    await render(
      <>
        <DialogHost />
        <CompletionDialog />
      </>,
    );
    expect(screen.getByText(/Routine hoàn thành!/)).toBeTruthy();
    expect(screen.getByText('20:00')).toBeTruthy(); // 1_200_000 ms
    expect(screen.getByText('3 🔥')).toBeTruthy();
    await fireEvent.press(screen.getByText('Chia sẻ kết quả'));
    expect(platformMock.share.share).toHaveBeenCalled();
  });

  it('nút Xong đóng dialog', async () => {
    useTimerStore.setState({
      completion: { sessionId: 'log_2', presetId: 'p2', presetName: 'A', durationMs: 60_000, streak: 1 },
    });
    await render(<CompletionDialog />);
    await fireEvent.press(screen.getByText('Xong'));
    expect(useTimerStore.getState().completion).toBeNull();
  });

  it('mood picker: chọn 🙂 + Lưu → ghi mood vào session log (v1.5)', async () => {
    const repo = new SessionLogRepo();
    await repo.add({
      id: 'log_mood',
      presetId: 'p1',
      presetName: 'My HIIT',
      startedAt: Date.now() - 60_000,
      endedAt: Date.now(),
      durationMs: 60_000,
      stageCount: 2,
      status: 'completed',
    });
    useTimerStore.setState({
      completion: { sessionId: 'log_mood', presetId: 'p1', presetName: 'My HIIT', durationMs: 60_000, streak: 1 },
    });
    await render(<CompletionDialog />);
    await fireEvent.press(screen.getByLabelText('Tuyệt vời')); // 🙂
    await fireEvent.press(screen.getByText('Lưu'));
    await waitFor(async () => {
      const list = await repo.list();
      expect(list.find((e) => e.id === 'log_mood')?.mood).toBe('happy');
    });
    // Sau khi lưu, khối nhập ẩn đi, hiện trạng thái đã lưu.
    expect(screen.getByText(/Đã lưu ghi chú/)).toBeTruthy();
  });

  it('completion quick session → "Lưu thành Preset" tạo preset mới (v1.3)', async () => {
    useTimerStore.setState({
      completion: {
        sessionId: 'log_3',
        presetId: 'temp_quick_session',
        presetName: 'Quick Routine',
        durationMs: 600_000,
        streak: 1,
        stages: [
          { id: 'qw', name: 'Tập', durationSeconds: 300 },
          { id: 'qb', name: 'Nghỉ', durationSeconds: 120 },
        ],
        repeatMode: 'fixedCount',
        fixedCount: 4,
      },
    });
    await render(<CompletionDialog />);
    await fireEvent.changeText(screen.getByPlaceholderText('Tên preset'), 'My Quick');
    await fireEvent.press(screen.getByText('Lưu thành Preset'));
    await waitFor(() => {
      const saved = usePresetsStore.getState().presets.find((p) => p.name === 'My Quick');
      expect(saved).toBeDefined();
      expect(saved?.stages).toHaveLength(2);
      expect(saved?.repeatMode).toBe('fixedCount');
    });
    // Dialog đóng sau khi lưu.
    expect(useTimerStore.getState().completion).toBeNull();
  });
});

describe('Settings — Voice toggle (v1.2)', () => {
  it('hiển thị toggle Đọc voice và lưu thay đổi', async () => {
    await render(<SettingsScreen />);
    expect(screen.getByText('Đọc voice')).toBeTruthy();
    // AppSwitch renders accessibilityRole="switch"; 5 switches exist in
    // order: Sound, Vibration, Voice, Keep awake, System theme.
    const switches = screen.getAllByRole('switch');
    expect(switches.length).toBe(5);
    await fireEvent.press(switches[2]);
    await waitFor(() => expect(useSettingsStore.getState().settings.voiceEnabled).toBe(false));
  });
});

describe('Home — Routine hôm nay (v1.2)', () => {
  it('hiển thị card gợi ý khi có lịch sử khung giờ hiện tại', async () => {
    // Seed one completed session today (same hour bucket) for preset p_test.
    const repo = new SessionLogRepo();
    await repo.add({
      id: 'log_1',
      presetId: 'p_test',
      presetName: 'Test',
      startedAt: Date.now() - 60_000,
      endedAt: Date.now(),
      durationMs: 60_000,
      stageCount: 2,
      status: 'completed',
    });
    await usePresetsStore.getState().save(makePreset());
    await render(<HomeScreen />);
    await waitFor(() => expect(screen.getByText('Routine hôm nay')).toBeTruthy());
  });

  it('không hiện card khi chưa có lịch sử', async () => {
    await render(<HomeScreen />);
    await waitFor(() => {
      expect(screen.queryByText('Routine hôm nay')).toBeNull();
    });
  });
});

describe('Home — Import preset (v1.2)', () => {
  it('import JSON hợp lệ → preset xuất hiện trên Home + thông báo', async () => {
    const json = JSON.stringify({
      type: 'looptimer-preset',
      version: 1,
      preset: {
        name: 'Imported HIIT',
        stages: [
          { name: 'WORK', durationSeconds: 40 },
          { name: 'REST', durationSeconds: 20 },
        ],
        repeatMode: 'fixedCount',
        fixedCount: 4,
      },
    });
    await render(
      <>
        <DialogHost />
        <HomeScreen />
      </>,
    );
    await fireEvent.press(screen.getByText('Import preset'));
    await fireEvent.changeText(screen.getByPlaceholderText('Dán chuỗi JSON preset vào đây'), json);
    await fireEvent.press(screen.getByText('Import'));
    await waitFor(() => expect(screen.getByText(/Đã import preset/)).toBeTruthy());
    const saved = usePresetsStore.getState().presets.find((p) => p.name === 'Imported HIIT');
    expect(saved).toBeDefined();
  });

  it('import JSON sai → thông báo lỗi, không lưu', async () => {
    await render(
      <>
        <DialogHost />
        <HomeScreen />
      </>,
    );
    await fireEvent.press(screen.getByText('Import preset'));
    await fireEvent.changeText(screen.getByPlaceholderText('Dán chuỗi JSON preset vào đây'), 'garbage{');
    await fireEvent.press(screen.getByText('Import'));
    await waitFor(() => expect(screen.getByText('Dữ liệu preset không hợp lệ')).toBeTruthy());
  });
});
