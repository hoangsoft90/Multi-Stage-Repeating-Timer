/**
 * Quick Routine (spec: quick-start R3) — zero-friction timer: no name, no
 * full editor. Runs under `temp_quick_session` so it never pollutes the
 * presets DB. Completion offers "Save as Preset" (handled by CompletionDialog).
 */
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { AppCard } from '@/components/app-card';
import { GradientButton } from '@/components/gradient-button';
import { Stepper } from '@/components/stepper';
import { confirmAsync } from '@/components/confirm';
import { useTimerStore } from '@/features/timer/timer-store';
import { overwriteGuard } from '@/features/timer/start-guard';
import { QUICK_SESSION_PRESET_ID } from '@/features/routine/routine-schedule';
import { useTheme } from '@/hooks/use-theme';
import { Preset } from '@/core/timer/models';

interface QuickRoutineCardProps {
  onStarted: () => void;
}

export function QuickRoutineCard({ onStarted }: QuickRoutineCardProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const [workMin, setWorkMin] = useState(25);
  const [breakMin, setBreakMin] = useState(5);
  const [repeat, setRepeat] = useState(4);

  const startQuick = async () => {
    const ok = await overwriteGuard(() =>
      confirmAsync({
        title: t('home.runningConfirm.title'),
        message: t('home.runningConfirm.message'),
        confirmLabel: t('home.runningConfirm.confirm'),
        destructive: true,
      }),
    );
    if (!ok) return;
    const preset: Preset = {
      id: QUICK_SESSION_PRESET_ID,
      name: t('quick.defaultName'),
      stages: [
        { id: 'quick_work', name: t('quick.work'), durationSeconds: workMin * 60 },
        { id: 'quick_break', name: t('quick.break'), durationSeconds: breakMin * 60 },
      ],
      repeatMode: 'fixedCount',
      fixedCount: repeat,
      createdAt: Date.now(),
      lastUsedAt: Date.now(),
      schemaVersion: 1,
    };
    await useTimerStore.getState().startPreset(preset);
    onStarted();
  };

  const row = (label: string, value: number, onChange: (v: number) => void, max: number, suffix?: string) => (
    <View style={styles.row}>
      <ThemedText style={styles.rowLabel}>{label}</ThemedText>
      <Stepper value={value} onChange={onChange} min={1} max={max} step={1} suffix={suffix} />
    </View>
  );

  return (
    <AppCard style={styles.card}>
      <View style={styles.header}>
        <Ionicons name="flash-outline" size={18} color="#FF512F" />
        <ThemedText style={styles.title}>{t('quick.title')}</ThemedText>
      </View>
      {/* Work/Break values are MINUTES — never show the seconds suffix. */}
      {row(t('quick.work'), workMin, setWorkMin, 120, t('routine.minuteUnit'))}
      {row(t('quick.break'), breakMin, setBreakMin, 60, t('routine.minuteUnit'))}
      {row(t('quick.repeat'), repeat, setRepeat, 99)}
      <GradientButton label={t('quick.start')} icon="play" onPress={() => void startQuick()} />
    </AppCard>
  );
}

const styles = StyleSheet.create({
  card: { padding: 14, gap: 10 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: 16, fontWeight: '700' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  rowLabel: { fontSize: 15, fontWeight: '600' },
});
