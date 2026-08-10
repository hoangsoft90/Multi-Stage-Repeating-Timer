/**
 * Routine manager (spec: scheduled-routine) — list/create/edit/delete
 * repeating schedules. A schedule = preset + days of week + time (+ optional
 * reminder before). Saving reschedules the next fire.
 */
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AppCard } from '@/components/app-card';
import { GradientButton } from '@/components/gradient-button';
import { confirmAsync } from '@/components/confirm';
import { useRoutineStore, schedulePresetName } from '@/features/routine/routine-store';
import { RoutineSchedule, isMissed, nextTriggerAt } from '@/features/routine/routine-schedule';
import { BUILTIN_TEMPLATES, usePresetsStore } from '@/features/presets/presets-store';
import { overwriteGuard } from '@/features/timer/start-guard';
import { useTimerStore } from '@/features/timer/timer-store';
import { useTheme } from '@/hooks/use-theme';
import { useSettingsStore } from '@/features/settings/settings-store';

const DAY_KEYS = ['routine.dayMon', 'routine.dayTue', 'routine.dayWed', 'routine.dayThu', 'routine.dayFri', 'routine.daySat', 'routine.daySun'];

function formatTime(h: number, m: number): string {
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export default function RoutineScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  const schedules = useRoutineStore((s) => s.schedules);
  const loaded = useRoutineStore((s) => s.loaded);
  const toggle = useRoutineStore((s) => s.toggle);
  const remove = useRoutineStore((s) => s.remove);
  const markHandled = useRoutineStore((s) => s.markHandled);
  const [now, setNow] = useState(Date.now());

  // "Bắt đầu ngay" — start the bound preset through the shared overwrite guard
  // (confirms when another session is active), then mark the reminder handled.
  const onStartNow = (s: RoutineSchedule) => {
    void (async () => {
      const preset =
        usePresetsStore.getState().presets.find((p) => p.id === s.presetId) ??
        BUILTIN_TEMPLATES.find((p) => p.id === s.presetId);
      if (!preset) return;
      const ok = await overwriteGuard(() =>
        confirmAsync({
          title: t('home.runningConfirm.title'),
          message: t('home.runningConfirm.message'),
          confirmLabel: t('home.runningConfirm.confirm'),
          destructive: true,
        }),
      );
      if (!ok) return;
      await useTimerStore.getState().startPreset(preset);
      await markHandled(s.id);
      router.push('/timer');
    })();
  };

  useEffect(() => {
    if (!useSettingsStore.getState().loaded) void useSettingsStore.getState().load();
    void useRoutineStore.getState().load().then(() => useRoutineStore.getState().rescheduleAll());
    const h = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(h);
  }, []);

  const onDelete = (s: RoutineSchedule) => {
    void (async () => {
      const ok = await confirmAsync({
        title: t('routine.delete'),
        message: schedulePresetName(s),
        confirmLabel: t('routine.delete'),
        destructive: true,
      });
      if (ok) await remove(s.id);
    })();
  };

  return (
    <ThemedView style={styles.container}>
      <FlatList
        data={schedules}
        keyExtractor={(s) => s.id}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <GradientButton label={t('routine.add')} icon="add" onPress={() => router.push('/routine/new')} />
        }
        ListEmptyComponent={
          <ThemedText type="default" themeColor="textSecondary" style={styles.empty}>
            {t('routine.empty')}
          </ThemedText>
        }
        renderItem={({ item }) => {
          const missed = isMissed(item, now);
          const next = nextTriggerAt(item, now);
          const daysLabel = item.daysOfWeek.map((d) => t(DAY_KEYS[d - 1] as never)).join(' · ');
          return (
            <AppCard style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={{ flex: 1, gap: 4 }}>
                  <ThemedText style={styles.name}>{schedulePresetName(item)}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {formatTime(item.hour, item.minute)} · {daysLabel}
                  </ThemedText>
                  {next != null && (
                    <ThemedText type="small" themeColor="textSecondary">
                      {t('routine.next', { time: formatTime(new Date(next).getHours(), new Date(next).getMinutes()) })}
                    </ThemedText>
                  )}
                  {missed && (
                    <View style={styles.missedRow}>
                      <Ionicons name="alert-circle-outline" size={14} color="#e5484d" />
                      <ThemedText type="small" style={styles.missedText}>
                        {t('routine.missed')}
                      </ThemedText>
                      <Pressable onPress={() => onStartNow(item)}>
                        <ThemedText type="small" style={styles.startNowText}>
                          {t('routine.startNow')}
                        </ThemedText>
                      </Pressable>
                      <Pressable onPress={() => void markHandled(item.id)}>
                        <ThemedText type="small" themeColor="textSecondary">
                          {t('routine.skip')}
                        </ThemedText>
                      </Pressable>
                    </View>
                  )}
                </View>
                <View style={styles.actions}>
                  <Pressable
                    onPress={() => router.push(`/routine/${item.id}`)}
                    style={styles.iconBtn}
                    accessibilityLabel={t('routine.edit')}
                  >
                    <Ionicons name="create-outline" size={18} color={theme.textSecondary} />
                  </Pressable>
                  <Pressable onPress={() => void toggle(item.id, !item.enabled)} style={styles.iconBtn}>
                    <Ionicons
                      name={item.enabled ? 'toggle' : 'toggle-outline'}
                      size={22}
                      color={item.enabled ? '#3c87f7' : theme.textSecondary}
                    />
                  </Pressable>
                  <Pressable onPress={() => onDelete(item)} style={styles.iconBtn} accessibilityLabel={t('routine.delete')}>
                    <Ionicons name="trash-outline" size={18} color={theme.danger} />
                  </Pressable>
                </View>
              </View>
            </AppCard>
          );
        }}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, gap: 12, paddingBottom: 48 },
  empty: { textAlign: 'center', paddingVertical: 32 },
  card: { padding: 14, gap: 8 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  name: { fontSize: 17, fontWeight: '700' },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  iconBtn: { padding: 6 },
  missedRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  missedText: { color: '#e5484d', fontWeight: '600' },
  startNowText: { color: '#3c87f7', fontWeight: '700' },
});
