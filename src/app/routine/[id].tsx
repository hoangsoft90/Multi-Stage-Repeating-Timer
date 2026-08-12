/**
 * Routine schedule editor (spec: scheduled-routine) — pick preset, days of
 * week, time, optional remind-before. Saving persists + reschedules.
 */
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useEffect, useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AppCard } from '@/components/app-card';
import { GradientButton } from '@/components/gradient-button';
import { ActionMenu } from '@/components/action-menu';
import { Stepper } from '@/components/stepper';
import { BUILTIN_TEMPLATES, usePresetsStore } from '@/features/presets/presets-store';
import { useRoutineStore } from '@/features/routine/routine-store';
import { RoutineSchedule, createScheduleId } from '@/features/routine/routine-schedule';
import { useTheme } from '@/hooks/use-theme';

const DAY_KEYS = ['routine.dayMon', 'routine.dayTue', 'routine.dayWed', 'routine.dayThu', 'routine.dayFri', 'routine.daySat', 'routine.daySun'];

export default function RoutineEditorScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t } = useTranslation();
  const theme = useTheme();

  const presets = usePresetsStore((s) => s.presets);
  // Built-in templates + user presets (built-ins first, deduped by id) so a
  // new user with no saved presets can still bind a routine to a template.
  const allPresets = useMemo(() => {
    const seen = new Set<string>();
    return [...BUILTIN_TEMPLATES, ...presets].filter((p) => {
      if (seen.has(p.id)) return false;
      seen.add(p.id);
      return true;
    });
  }, [presets]);
  const schedules = useRoutineStore((s) => s.schedules);
  const save = useRoutineStore((s) => s.save);
  const rescheduleAll = useRoutineStore((s) => s.rescheduleAll);

  const editing = id && id !== 'new' ? schedules.find((s) => s.id === id) : null;

  const [presetId, setPresetId] = useState<string | null>(null);
  const [days, setDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [hour, setHour] = useState(8);
  const [minute, setMinute] = useState(0);
  const [before, setBefore] = useState(0);
  const [presetMenu, setPresetMenu] = useState(false);

  useEffect(() => {
    if (editing) {
      setPresetId(editing.presetId);
      setDays(editing.daysOfWeek);
      setHour(editing.hour);
      setMinute(editing.minute);
      setBefore(editing.notificationMinutesBefore[0] ?? 0);
    } else if (allPresets.length > 0 && !presetId) {
      setPresetId(allPresets[0].id);
    }
  }, [editing, allPresets, presetId]);

  const toggleDay = (d: number) => {
    setDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort((a, b) => a - b)));
  };

  const onSave = async () => {
    if (!presetId || days.length === 0) return;
    const schedule: RoutineSchedule = {
      id: editing?.id ?? createScheduleId(),
      presetId,
      enabled: editing?.enabled ?? true,
      daysOfWeek: days,
      hour,
      minute,
      notificationMinutesBefore: [before],
      lastTriggeredDate: editing?.lastTriggeredDate,
      snoozeCount: editing?.snoozeCount,
      snoozeUntil: editing?.snoozeUntil,
      schemaVersion: 1,
    };
    await save(schedule);
    await rescheduleAll();
    router.back();
  };

  const presetName = allPresets.find((p) => p.id === presetId)?.name ?? '';

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Preset picker */}
        <View style={styles.section}>
          <ThemedText type="smallBold" themeColor="textSecondary">
            {t('routine.preset')}
          </ThemedText>
          <Pressable
            style={[styles.picker, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}
            onPress={() => setPresetMenu(true)}
          >
            <ThemedText style={{ fontWeight: '600' }}>{presetName || '—'}</ThemedText>
            <Ionicons name="chevron-down" size={16} color={theme.textSecondary} />
          </Pressable>
        </View>

        {/* Days of week */}
        <View style={styles.section}>
          <ThemedText type="smallBold" themeColor="textSecondary">
            {t('routine.days')}
          </ThemedText>
          <View style={styles.daysRow}>
            {DAY_KEYS.map((key, i) => {
              const d = i + 1;
              const active = days.includes(d);
              return (
                <Pressable
                  key={key}
                  style={[
                    styles.dayChip,
                    { backgroundColor: active ? BrandGradient0 : theme.backgroundElement, borderColor: theme.border },
                  ]}
                  onPress={() => toggleDay(d)}
                >
                  <ThemedText
                    type="small"
                    style={active ? styles.dayChipActive : undefined}
                  >
                    {t(key as never)}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Time */}
        <View style={styles.section}>
          <ThemedText type="smallBold" themeColor="textSecondary">
            {t('routine.time')}
          </ThemedText>
          <View style={styles.timeRow}>
            <Stepper value={hour} onChange={setHour} min={0} max={23} step={1} suffix={t('routine.hourUnit')} />
            <Stepper value={minute} onChange={setMinute} min={0} max={59} step={5} suffix={t('routine.minuteUnit')} />
          </View>
        </View>

        {/* Remind before */}
        <View style={styles.section}>
          <ThemedText type="smallBold" themeColor="textSecondary">
            {t('routine.before')}
          </ThemedText>
          <View style={styles.timeRow}>
            <Stepper value={before} onChange={setBefore} min={0} max={30} step={5} suffix={t('routine.minuteUnit')} />
          </View>
        </View>

        <GradientButton label={t('routine.save')} icon="save-outline" onPress={() => void onSave()} disabled={!presetId || days.length === 0} />
      </ScrollView>

      <ActionMenu
        visible={presetMenu}
        title={t('routine.preset')}
        items={allPresets.map((p) => ({ text: p.name, onPress: () => setPresetId(p.id) }))}
        onClose={() => setPresetMenu(false)}
      />
    </ThemedView>
  );
}

const BrandGradient0 = '#FF512F';

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, gap: 20, paddingBottom: 48 },
  section: { gap: 10 },
  picker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  daysRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  dayChip: {
    minWidth: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    borderWidth: 1,
  },
  dayChipActive: { color: '#FFFFFF', fontWeight: '700' },
  timeRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
});
