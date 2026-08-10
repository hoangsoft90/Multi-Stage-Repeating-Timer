/**
 * useRoutineStore persistence tests (spec: scheduled-routine 7.2) — save /
 * toggle / snooze / markHandled persist through the AsyncStorage repo, and
 * reminder notifications are scheduled with the `reminder_actions` category.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRoutineStore } from '../routine-store';
import { RoutineSchedule, dateKey } from '../routine-schedule';
import { platformMock } from '../../../test-utils/platform-mock';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('../../../platform', () => {
  const m = jest.requireActual('../../../test-utils/platform-mock');
  return m.platformMock;
});

jest.mock('expo-intent-launcher', () => ({
  startActivityAsync: jest.fn().mockResolvedValue(undefined),
}));

function schedule(overrides: Partial<RoutineSchedule> = {}): RoutineSchedule {
  return {
    id: 's1',
    presetId: 'p1',
    enabled: true,
    daysOfWeek: [1, 2, 3, 4, 5],
    hour: 8,
    minute: 0,
    notificationMinutesBefore: [0],
    schemaVersion: 1,
    ...overrides,
  };
}

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  useRoutineStore.setState({ schedules: [], loaded: false });
});

describe('useRoutineStore (v1.3)', () => {
  it('save → toggle → persist qua repo (reload từ storage giữ trạng thái)', async () => {
    await useRoutineStore.getState().save(schedule());
    expect(useRoutineStore.getState().schedules).toHaveLength(1);

    await useRoutineStore.getState().toggle('s1', false);
    expect(useRoutineStore.getState().schedules[0].enabled).toBe(false);

    // Reload từ storage như app khởi động lại.
    useRoutineStore.setState({ schedules: [], loaded: false });
    await useRoutineStore.getState().load();
    const after = useRoutineStore.getState().schedules;
    expect(after).toHaveLength(1);
    expect(after[0].enabled).toBe(false);
    expect(after[0].presetId).toBe('p1');
  });

  it('remove xóa khỏi storage + hủy notification đã lên lịch', async () => {
    await useRoutineStore.getState().save(schedule());
    await useRoutineStore.getState().remove('s1');
    expect(useRoutineStore.getState().schedules).toHaveLength(0);
    expect(platformMock.scheduler.cancelByIds).toHaveBeenCalledWith(['routine_s1']);
  });

  it('snooze tối đa 3 lần rồi chặn; reschedule dùng category reminder_actions', async () => {
    const store = useRoutineStore.getState();
    await store.save(schedule());

    await store.snooze('s1', 5);
    await store.snooze('s1', 5);
    await store.snooze('s1', 5);
    expect(useRoutineStore.getState().schedules[0].snoozeCount).toBe(3);

    // Lần thứ 4 bị chặn (canSnooze = false) — không re-schedule.
    const callsBefore = platformMock.scheduler.scheduleAt.mock.calls.length;
    const blocked = await store.snooze('s1', 5);
    expect(blocked).toBeNull();
    expect(platformMock.scheduler.scheduleAt.mock.calls.length).toBe(callsBefore);

    // Lần snooze hợp lệ cuối cùng schedule lại với category reminder_actions.
    const calls = platformMock.scheduler.scheduleAt.mock.calls;
    const lastCall = calls[calls.length - 1];
    expect(lastCall?.[0]).toBeGreaterThan(Date.now()); // fire time tương lai
    expect(lastCall?.[1]).toBe('routine_s1');
    expect(lastCall?.[4]).toBe('reminder_actions');
  });

  it('markHandled set lastTriggeredDate hôm nay (skip / missed-no-punish)', async () => {
    await useRoutineStore.getState().save(schedule());
    await useRoutineStore.getState().markHandled('s1');
    const s = useRoutineStore.getState().schedules[0];
    expect(s.lastTriggeredDate).toBe(dateKey(Date.now()));
    expect(s.snoozeCount).toBe(0);
  });

  it('rescheduleAll lên lịch next trigger với category reminder_actions', async () => {
    await useRoutineStore.getState().save(schedule());
    useRoutineStore.setState({ schedules: [schedule()] });
    await useRoutineStore.getState().rescheduleAll();
    const call = platformMock.scheduler.scheduleAt.mock.calls[0];
    expect(call).toBeDefined();
    expect(call?.[1]).toBe('routine_s1');
    expect(call?.[4]).toBe('reminder_actions');
  });

  it('before-window reminder dùng nội dung "sắp đến giờ" (spec R2)', async () => {
    const s = schedule({ notificationMinutesBefore: [10] });
    useRoutineStore.setState({ schedules: [s] });
    await useRoutineStore.getState().rescheduleAll();
    const call = platformMock.scheduler.scheduleAt.mock.calls[0];
    expect(call?.[2]).toBe('p1'); // title = preset name
    // body nói "starts in 10 minutes" (không phải "Time for X").
    expect(String(call?.[3])).toContain('10');
    // On-time reminder vẫn dùng "Đến giờ".
    useRoutineStore.setState({ schedules: [schedule()] });
    platformMock.scheduler.scheduleAt.mockClear();
    await useRoutineStore.getState().rescheduleAll();
    const onTime = platformMock.scheduler.scheduleAt.mock.calls[0];
    expect(String(onTime?.[3])).not.toContain('10');
  });
});
