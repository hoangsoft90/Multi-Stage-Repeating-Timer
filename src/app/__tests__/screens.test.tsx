/**
 * Screen render tests (task 8.3):
 * - Home hiển thị templates + Start điều hướng tới /timer
 * - Editor chặn lưu preset sai (thiếu tên / fixedCount = 0)
 * - Timer Running render đúng state + Pause/Resume + Stop confirm dialog
 *
 * Note: @testing-library/react-native v14 makes render()/fireEvent() async —
 * every call must be awaited.
 */
import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { render, fireEvent, screen, waitFor, act } from '@testing-library/react-native';

import HomeScreen from '../index';
import EditorScreen from '../preset/[id]';
import TimerScreen from '../timer';
import SettingsScreen from '../settings';
import StatsScreen from '../stats';
import TemplatesScreen from '../templates';
import { SessionLogRepo } from '../../core/storage/repos';
import { DialogHost, clearDialog } from '../../components/confirm';
import { platformMock } from '../../test-utils/platform-mock';
import { useTimerStore } from '../../features/timer/timer-store';
import { usePresetsStore } from '../../features/presets/presets-store';
import { useSettingsStore } from '../../features/settings/settings-store';
import { useGoalsStore } from '../../features/goals/goals-store';
import { weekKey } from '../../features/goals/weekly-goals';
import { useUserSoundsStore } from '../../features/sounds/user-sounds-store';
import { Preset } from '../../core/timer/models';

const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockBack = jest.fn();
// Mutable route params — lets tests open the Editor with a template id.
let mockParams: Record<string, string> = { id: 'new' };

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace, back: mockBack }),
  useLocalSearchParams: () => mockParams,
  // Home refreshes its "Routine hôm nay" card on focus — run the callback
  // on every render in tests (no navigation context available).
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

// permissions.ts (imported by the timer store) pulls expo-intent-launcher at import time.
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
  // Zustand stores are module singletons — reset them so reordering tests
  // (or adding new ones) can never observe stale state.
  usePresetsStore.setState({ presets: [], loaded: false });
  useTimerStore.setState({ recovery: null });
  useGoalsStore.setState({ goal: null, loaded: false });
  useUserSoundsStore.setState({ sounds: [], loaded: false });
  mockParams = { id: 'new' };
});

afterEach(async () => {
  const st = useTimerStore.getState();
  if (st.state.status === 'running' || st.state.status === 'paused') {
    await st.stop();
  }
  await AsyncStorage.clear();
});

describe('Home', () => {
  it('hiển thị các templates nổi bật', async () => {
    await render(<HomeScreen />);
    // Template names appear in both the featured cards and the quick-start
    // chips row (v1.3) — assert the first occurrence.
    expect(screen.getAllByText('Work / Break 60/10')[0]).toBeTruthy();
    expect(screen.getAllByText('Pomodoro 25/5 + Long 15')[0]).toBeTruthy();
    expect(screen.getAllByText('HIIT 40/20')[0]).toBeTruthy();
    expect(screen.getAllByText('+ Tạo preset mới')[0]).toBeTruthy();
  });

  it('Start một template → session chạy + điều hướng tới /timer', async () => {
    await render(<HomeScreen />);
    const startButtons = screen.getAllByText('▶ Start');
    await fireEvent.press(startButtons[0]);
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/timer'));
    expect(useTimerStore.getState().state.status).toBe('running');
  });

  it('long-press template mở ActionMenu KHÔNG có Xóa (built-in)', async () => {
    await render(<HomeScreen />);
    // Chips (index 0) have no long-press — long-press the featured card (last).
    const templateCards = screen.getAllByText('Work / Break 60/10');
    await fireEvent(templateCards[templateCards.length - 1], 'longPress');
    // Menu mở ra — chạm được trên mọi platform (Alert là no-op trên web).
    expect(screen.getByText('Duplicate')).toBeTruthy();
    expect(screen.queryByText('Xóa')).toBeNull(); // template không xóa được
    await fireEvent.press(screen.getByText('Hủy'));
    expect(screen.queryByText('Duplicate')).toBeNull(); // menu đóng
  });

  it('long-press preset người dùng có Xóa và xóa được sau xác nhận', async () => {
    const preset = makePreset({ id: 'p_user', name: 'My preset' });
    await usePresetsStore.getState().save(preset);
    await render(
      <>
        <DialogHost />
        <HomeScreen />
      </>,
    );
    // Chip (index 0) has no long-press — long-press the preset card (last).
    const presetCards = screen.getAllByText('My preset');
    await fireEvent(presetCards[presetCards.length - 1], 'longPress');
    await fireEvent.press(screen.getByText('Xóa'));
    // Custom confirm dialog (thay Alert) — bấm nút Xóa trong dialog
    await waitFor(() => expect(screen.getAllByText('Xóa').length).toBe(1));
    await fireEvent.press(screen.getByText('Xóa'));
    await waitFor(() =>
      expect(usePresetsStore.getState().presets.find((p) => p.id === 'p_user')).toBeUndefined(),
    );
  });
});

describe('Editor', () => {
  it('chặn lưu khi thiếu tên preset', async () => {
    await render(
      <>
        <DialogHost />
        <EditorScreen />
      </>,
    );
    await fireEvent.press(screen.getByText('💾 Lưu preset'));
    // Alert dialog riêng của app (thay Alert.alert)
    expect(screen.getByText('Không thể lưu')).toBeTruthy();
    expect(screen.getByText('Vui lòng sửa các lỗi trong form.')).toBeTruthy();
    expect(screen.getByText('Tên preset không được để trống')).toBeTruthy();
    expect(mockBack).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByText('OK'));
    expect(screen.queryByText('Không thể lưu')).toBeNull();
  });

  it('Stepper N rounds không xuống dưới 1 và lưu được preset 1 round', async () => {
    await render(<EditorScreen />);
    await fireEvent.press(screen.getByText('N rounds'));
    // Bấm Giảm 5 lần: 4 → 1 (Stepper dừng ở min=1)
    for (let i = 0; i < 5; i++) {
      await fireEvent.press(screen.getAllByLabelText('Giảm')[0]);
    }
    await fireEvent.changeText(screen.getByPlaceholderText('VD: Workout 4 rounds'), 'My HIIT');
    await fireEvent.press(screen.getByText('💾 Lưu preset'));
    await waitFor(() => expect(mockBack).toHaveBeenCalled());
    const saved = usePresetsStore.getState().presets.find((p) => p.name === 'My HIIT');
    expect(saved?.fixedCount).toBe(1);
  });

  it('lưu preset hợp lệ → lưu vào store + quay lại', async () => {
    await render(<EditorScreen />);
    await fireEvent.changeText(screen.getByPlaceholderText('VD: Workout 4 rounds'), 'My HIIT');
    await fireEvent.press(screen.getByText('💾 Lưu preset'));
    await waitFor(() => expect(mockBack).toHaveBeenCalled());
    const saved = usePresetsStore.getState().presets.find((p) => p.name === 'My HIIT');
    expect(saved).toBeDefined();
    expect(saved?.stages).toHaveLength(2);
  });

  it('mở từ template → Save tạo preset mới, KHÔNG ghi đè template gốc (v1.3 save-as-new)', async () => {
    mockParams = { id: 'template_hiit' };
    await render(<EditorScreen />);
    // Template source → CTA đổi thành "Lưu thành preset mới".
    await fireEvent.press(screen.getByText('Lưu thành preset mới'));
    await waitFor(() => expect(mockBack).toHaveBeenCalled());
    const saved = usePresetsStore.getState().presets.find((p) => p.id !== 'template_hiit');
    expect(saved).toBeDefined();
    expect(saved!.name).toContain('HIIT');
    expect(saved!.id).not.toBe('template_hiit');
    // Template gốc không bị ghi đè: không nằm trong presets store (chỉ là hằng số).
    expect(usePresetsStore.getState().presets.find((p) => p.id === 'template_hiit')).toBeUndefined();
  });
});

describe('Settings — ngôn ngữ', () => {
  it('đổi ngôn ngữ qua menu → lưu vào settings store', async () => {
    await render(<SettingsScreen />);
    await fireEvent.press(screen.getByText('Ngôn ngữ'));
    // ActionMenu mở ra với 3 lựa chọn ('Theo hệ thống' còn hiện ở row giá trị)
    await waitFor(() => expect(screen.getByText('English')).toBeTruthy());
    expect(screen.getAllByText('Theo hệ thống').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('Tiếng Việt')).toBeTruthy();
    await fireEvent.press(screen.getByText('English'));
    // set() lưu AsyncStorage trước khi cập nhật store → chờ để tránh race
    await waitFor(() => expect(useSettingsStore.getState().settings.language).toBe('en'));
    // cleanup — không để rò rỉ qua test khác
    await act(async () => {
      await useSettingsStore.getState().set({ language: 'system' });
    });
  });
});

describe('Editor — sound picker (v1.1 custom sound pack)', () => {
  it('chọn built-in sound cho stage', async () => {
    await render(
      <>
        <DialogHost />
        <EditorScreen />
      </>,
    );
    // Mặc định stage chưa có soundId → chip hiện 'Chime 1'
    await fireEvent.press(screen.getAllByText('Chime 1')[0]);
    expect(screen.getByText('Beep 🔒')).toBeTruthy(); // custom pack khóa
    expect(screen.getByText('Gong 🔒')).toBeTruthy();
    await fireEvent.press(screen.getByText('Chime 2'));
    // Menu đóng, chip stage cập nhật
    expect(screen.getAllByText('Chime 2').length).toBeGreaterThan(0);
  });

  it('unlocked: sound menu hiện user-imported sounds + item import (custom sounds)', async () => {
    // Seed qua AsyncStorage (editor load() đọc từ storage, không phải store
    // state trực tiếp): unlock 24h + một user sound.
    await AsyncStorage.setItem('looptimer:reward-unlock-until', String(Date.now() + 3600_000));
    await AsyncStorage.setItem(
      'looptimer:user-sounds',
      JSON.stringify([{ id: 'user-1', label: 'My ringtone', uri: 'file:///mock/my.wav', addedAt: Date.now() }]),
    );
    await render(
      <>
        <DialogHost />
        <EditorScreen />
      </>,
    );
    await fireEvent.press(screen.getAllByText('Chime 1')[0]);
    // Imported sound không bị 🔒 và item import hiện ra.
    await waitFor(() => expect(screen.getByText('My ringtone')).toBeTruthy());
    expect(screen.getByText('Import file âm thanh…')).toBeTruthy();
    // Chọn user sound → chip stage cập nhật.
    await fireEvent.press(screen.getByText('My ringtone'));
    expect(screen.getAllByText('My ringtone').length).toBeGreaterThan(0);
    // Cleanup unlock key.
    await AsyncStorage.removeItem('looptimer:reward-unlock-until');
  });

  it('chọn sound khóa → confirm xem ad; ad fail → alert, sound không đổi', async () => {
    await render(
      <>
        <DialogHost />
        <EditorScreen />
      </>,
    );
    await fireEvent.press(screen.getAllByText('Chime 1')[0]);
    await fireEvent.press(screen.getByText('Beep 🔒'));
    expect(screen.getByText('Mở khóa âm thanh?')).toBeTruthy();
    await fireEvent.press(screen.getByText('Xem quảng cáo'));
    // showRewarded mock mặc định false → fail alert
    await waitFor(() =>
      expect(screen.getByText('Không thể mở khóa ngay lúc này. Thử lại sau.')).toBeTruthy(),
    );
    expect(platformMock.adManager.showRewarded).toHaveBeenCalled();
  });
});

describe('Stats — lịch sử & thống kê (v1.1)', () => {
  it('render trạng thái rỗng khi chưa có phiên', async () => {
    await render(<StatsScreen />);
    await waitFor(() => expect(screen.getByText(/Chưa có phiên nào/)).toBeTruthy());
  });

  it('hiển thị tổng thời gian + streak + phiên gần đây sau khi có log', async () => {
    const repo = new SessionLogRepo();
    const now = Date.now();
    await repo.add({
      id: 'log_1',
      presetId: 'p1',
      presetName: 'My HIIT',
      startedAt: now - 5 * 60_000,
      endedAt: now,
      durationMs: 5 * 60_000,
      stageCount: 3,
      status: 'completed',
    });
    await render(<StatsScreen />);
    await waitFor(() => expect(screen.getAllByText('5m').length).toBeGreaterThan(0));
    expect(screen.getByText('My HIIT')).toBeTruthy();
    expect(screen.getByText(/PHIÊN GẦN ĐÂY/)).toBeTruthy();
    expect(screen.getByText(/Chuỗi ngày/)).toBeTruthy();
  });
});

describe('Settings — rewarded unlock (monetization)', () => {
  it('xem quảng cáo thành công → hiện trạng thái đã mở khóa + còn thời gian', async () => {
    // Ads chỉ hiển thị trên native build (platformMock mặc định supported=false).
    (platformMock.adManager as { supported: boolean }).supported = true;
    try {
      await render(
        <>
          <DialogHost />
          <SettingsScreen />
        </>,
      );
      // Locked state: row hiển thị CTA mở khóa
      await waitFor(() => expect(screen.getByText('Âm thanh tùy chỉnh')).toBeTruthy());
      expect(screen.getByText('Xem 1 quảng cáo để mở khóa 24 giờ')).toBeTruthy();

      // Xem ad thành công (showRewarded → true)
      (platformMock.adManager.showRewarded as jest.Mock).mockResolvedValueOnce(true);
      await fireEvent.press(screen.getByText('Xem 1 quảng cáo để mở khóa 24 giờ'));

      await waitFor(() => expect(screen.getByText('Đã mở khóa âm thanh tùy chỉnh!')).toBeTruthy());
      expect(platformMock.adManager.showRewarded).toHaveBeenCalled();
      // Dialog OK đóng lại + row chuyển sang trạng thái unlocked (còn thời gian)
      await fireEvent.press(screen.getByText('OK'));
      await waitFor(() => expect(screen.getByText(/Đã mở khóa · còn/)).toBeTruthy());
    } finally {
      (platformMock.adManager as { supported: boolean }).supported = false;
    }
  });

  it('xem quảng cáo thất bại → alert lỗi, vẫn khóa', async () => {
    (platformMock.adManager as { supported: boolean }).supported = true;
    try {
      await render(
        <>
          <DialogHost />
          <SettingsScreen />
        </>,
      );
      await waitFor(() => expect(screen.getByText('Xem 1 quảng cáo để mở khóa 24 giờ')).toBeTruthy());
      // showRewarded default → false
      await fireEvent.press(screen.getByText('Xem 1 quảng cáo để mở khóa 24 giờ'));
      await waitFor(() =>
        expect(screen.getByText('Không thể mở khóa ngay lúc này. Thử lại sau.')).toBeTruthy(),
      );
    } finally {
      (platformMock.adManager as { supported: boolean }).supported = false;
    }
  });
});

describe('Timer Running', () => {
  it('render đúng state: stage, countdown, controls, stage strip', async () => {
    await useTimerStore.getState().startPreset(makePreset());
    await render(<TimerScreen />);
    // 'WORK' appears as the stage name AND in the StagePill strip
    expect(screen.getAllByText('WORK').length).toBeGreaterThan(0);
    expect(screen.getByText(/^0[01]:[0-5][0-9]$/)).toBeTruthy();
    expect(screen.getByText('Pause')).toBeTruthy();
    expect(screen.getByText('Skip')).toBeTruthy();
    expect(screen.getByText('Stop')).toBeTruthy();
    // StagePill shows the next stage chip
    expect(screen.getAllByText('BREAK').length).toBeGreaterThan(0);
  });

  it('Pause → Resume toggle cập nhật state', async () => {
    await useTimerStore.getState().startPreset(makePreset());
    await render(<TimerScreen />);
    await fireEvent.press(screen.getByText('Pause'));
    expect(useTimerStore.getState().state.status).toBe('paused');
    await fireEvent.press(screen.getByText('Resume'));
    expect(useTimerStore.getState().state.status).toBe('running');
  });

  it('✕ exit trên native: quay về Home nhưng KHÔNG dừng timer (background design)', async () => {
    await useTimerStore.getState().startPreset(makePreset());
    await render(<TimerScreen />);
    await fireEvent.press(screen.getByLabelText('Quay về màn hình chính'));
    expect(mockBack).toHaveBeenCalled();
    expect(useTimerStore.getState().state.status).toBe('running');
  });

  it('Stop hiện confirm dialog; chọn Dừng → dừng + quay về Home', async () => {
    await useTimerStore.getState().startPreset(makePreset());
    await render(
      <>
        <DialogHost />
        <TimerScreen />
      </>,
    );
    await fireEvent.press(screen.getByText('Stop'));
    // Custom question dialog (thay Alert)
    expect(screen.getByText('Dừng timer?')).toBeTruthy();
    expect(screen.getByText('Toàn bộ tiến trình hiện tại sẽ bị hủy.')).toBeTruthy();
    await fireEvent.press(screen.getByText('Dừng'));
    await waitFor(() => expect(useTimerStore.getState().state.status).toBe('stopped'));
    expect(mockReplace).toHaveBeenCalledWith('/');
  });
});

describe('Templates (v1.5 curated library)', () => {
  it('hiển thị card template + Use this tạo preset user + quay lại', async () => {
    await render(
      <>
        <DialogHost />
        <TemplatesScreen />
      </>,
    );
    // FlatList virtualization — ít nhất initialNumToRender (10) card hiện.
    expect(screen.getAllByText('Dùng ngay').length).toBeGreaterThanOrEqual(10);
    expect(screen.getByText('Tabata 20/10')).toBeTruthy();
    expect(screen.getByText('2 stages · 8 rounds')).toBeTruthy();
    await fireEvent.press(screen.getAllByText('Dùng ngay')[0]);
    await waitFor(() => expect(mockBack).toHaveBeenCalled());
    const saved = usePresetsStore.getState().presets.find((p) => p.name === 'Tabata 20/10');
    expect(saved).toBeDefined();
    expect(saved?.repeatMode).toBe('fixedCount');
    expect(saved?.fixedCount).toBe(8);
  });

  it('lọc theo category — wellness chỉ còn 3 template', async () => {
    await render(<TemplatesScreen />);
    await fireEvent.press(screen.getByText('Sức khỏe'));
    // 3 wellness template đều render (nhỏ hơn initialNumToRender).
    expect(screen.getAllByText('Dùng ngay')).toHaveLength(3);
    expect(screen.getByText('Box Breathing')).toBeTruthy();
    expect(screen.queryByText('Tabata 20/10')).toBeNull();
  });
});

describe('Settings — Weekly goal (v1.5)', () => {
  it('chọn chip 7 + Lưu → lưu goal vào store (recurring)', async () => {
    await render(<SettingsScreen />);
    await fireEvent.press(screen.getByText('7'));
    await fireEvent.press(screen.getByText('Lưu mục tiêu'));
    await waitFor(() => {
      const g = useGoalsStore.getState().goal;
      expect(g?.targetSessions).toBe(7);
      expect(g?.presetId).toBeNull();
    });
  });

  it('hiển thị goal hiện tại khi đã đặt', async () => {
    useGoalsStore.setState({
      goal: { id: 'g1', presetId: null, targetSessions: 5, weekStart: weekKey(Date.now()), schemaVersion: 1 },
      loaded: true,
    });
    await render(<SettingsScreen />);
    expect(screen.getByText(/Mục tiêu: 5 phiên\/tuần/)).toBeTruthy();
    expect(screen.getByText('Tất cả routine')).toBeTruthy();
  });
});
