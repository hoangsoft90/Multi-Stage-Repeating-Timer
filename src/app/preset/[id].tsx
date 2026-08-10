import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, TextInput, View, Platform } from 'react-native';
import { useEffect, useMemo, useState } from 'react';

import { isTemplate } from '@/features/presets/template-utils';
import { reorderStages } from '@/features/presets/reorder';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AppCard } from '@/components/app-card';
import { GradientButton } from '@/components/gradient-button';
import { IconButton } from '@/components/icon-button';
import { SegmentedControl } from '@/components/segmented-control';
import { Stepper } from '@/components/stepper';
import { ActionMenu } from '@/components/action-menu';
import { alertAsync, confirmAsync } from '@/components/confirm';
import { ALL_SOUNDS, BUILTIN_SOUNDS, soundById } from '@/features/sounds/sound-pack';
import { getUnlockExpiry, watchAdForUnlock } from '@/features/monetization/rewarded-unlock';
import { remoteConfig } from '@/platform';
import { BUILTIN_TEMPLATES, usePresetsStore } from '@/features/presets/presets-store';
import { useTimerStore } from '@/features/timer/timer-store';
import { exceedsNotificationWindow } from '@/features/background/coverage';
import { effectiveMaxStageQueue } from '@/features/routine/routine-schedule';
import { useRoutineStore } from '@/features/routine/routine-store';
import { requestNotificationPermissionOnFirstTimer } from '@/features/background/permissions';
import { Preset, RepeatMode, Stage, createPresetId, createStageId } from '@/core/timer/models';
import { isValidPreset, validatePreset } from '@/core/validation';
import { useTheme } from '@/hooks/use-theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { stageAccent } from '@/constants/stage-colors';

const REPEAT_OPTIONS: { labelKey: string; value: RepeatMode }[] = [
  { labelKey: 'editor.repeatOnce', value: 'once' },
  { labelKey: 'editor.repeatFixed', value: 'fixedCount' },
  { labelKey: 'editor.repeatForever', value: 'forever' },
];

export default function EditorScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t } = useTranslation();
  const theme = useTheme();
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';

  const presets = usePresetsStore((s) => s.presets);
  const save = usePresetsStore((s) => s.save);
  const remove = usePresetsStore((s) => s.remove);
  const timerStatus = useTimerStore((s) => s.state.status);
  const activeSchedules = useRoutineStore((s) => s.schedules.filter((x) => x.enabled).length);

  const source = useMemo(() => {
    if (id && id !== 'new') {
      const fromUser = presets.find((p) => p.id === id);
      if (fromUser) return fromUser;
      return BUILTIN_TEMPLATES.find((t) => t.id === id) ?? null;
    }
    return null;
  }, [id, presets]);

  const [name, setName] = useState('');
  const [stages, setStages] = useState<Stage[]>([]);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>('once');
  const [fixedCount, setFixedCount] = useState(4);
  const [errors, setErrors] = useState<ReturnType<typeof validatePreset>>({});
  const [soundMenuFor, setSoundMenuFor] = useState<number | null>(null);
  const [soundUnlocked, setSoundUnlocked] = useState(false);
  const [watchingAd, setWatchingAd] = useState(false);

  // Custom sound pack state (Rewarded unlock, 24h).
  useEffect(() => {
    let mounted = true;
    void getUnlockExpiry().then((exp) => {
      if (mounted) setSoundUnlocked(exp !== null);
    });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (source) {
      setName(source.name);
      setStages(source.stages.map((s) => ({ ...s })));
      setRepeatMode(source.repeatMode);
      setFixedCount(source.fixedCount ?? 4);
    } else {
      setName('');
      setStages([
        { id: createStageId(), name: 'WORK', durationSeconds: 60 },
        { id: createStageId(), name: 'BREAK', durationSeconds: 10 },
      ]);
      setRepeatMode('forever');
      setFixedCount(4);
    }
  }, [source]);

  const draft: Pick<Preset, 'name' | 'stages' | 'repeatMode' | 'fixedCount'> = {
    name,
    stages,
    repeatMode,
    fixedCount: repeatMode === 'fixedCount' ? fixedCount : null,
  };

  const updateStage = (index: number, patch: Partial<Stage>) => {
    setStages((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  };

  // Drag & drop reorder (spec: drag-drop) — swap positions, KEEP stage ids so
  // the per-stage soundId mapping (custom sound pack) never breaks.
  const moveStage = (from: number, to: number) => {
    setStages((prev) => reorderStages(prev, from, to));
  };

  const pickSound = (index: number, optionId: string) => {
    setSoundMenuFor(null);
    updateStage(index, { soundId: optionId });
  };

  const onLockedSoundPress = async (index: number, optionId: string) => {
    if (watchingAd) return; // prevent double-tap → double rewarded ad
    const ok = await confirmAsync({
      title: t('sound.unlockTitle'),
      message: t('sound.unlockMessage'),
      confirmLabel: t('sound.unlockConfirm'),
    });
    if (!ok) return;
    setWatchingAd(true);
    try {
      const hours = remoteConfig.getNumber('custom_sound_unlock_hours') || 24;
      const earned = await watchAdForUnlock(hours);
      if (earned) {
      setSoundUnlocked(true);
      pickSound(index, optionId);
      alertAsync(t('reward.unlockOk'), '');
      } else {
        alertAsync(t('reward.unlockFail'), '');
      }
    } finally {
      setWatchingAd(false);
    }
  };

  const soundMenuItems =
    soundMenuFor !== null
      ? ALL_SOUNDS.map((s) => {
          const locked = Boolean(s.locked) && !soundUnlocked;
          return {
            text: locked ? `${s.label} 🔒` : s.label,
            onPress: () => {
              if (locked) void onLockedSoundPress(soundMenuFor, s.id);
              else pickSound(soundMenuFor, s.id);
            },
          };
        })
      : [];

  // Templates are read-only entry points (spec: drag-drop R2) — any Save from
  // a template always creates a NEW preset ("Save as new"), never overwrites
  // the 3 built-in templates.
  const isTemplateSource = Boolean(source && isTemplate(source.id));

  const onSave = async () => {
    const validation = validatePreset(draft);
    setErrors(validation);
    if (!isValidPreset(draft)) {
      alertAsync(t('editor.cannotSave'), t('editor.fixErrors'));
      return;
    }
    const preset: Preset = {
      id: isTemplateSource ? createPresetId() : (source?.id ?? createPresetId()),
      name: isTemplateSource ? `${name.trim()} ${t('editor.editedSuffix')}` : name.trim(),
      stages: stages.map((s) => ({ ...s, name: s.name.trim() })),
      repeatMode,
      fixedCount: repeatMode === 'fixedCount' ? fixedCount : null,
      createdAt: source?.createdAt ?? Date.now(),
      lastUsedAt: source?.lastUsedAt ?? Date.now(),
      schemaVersion: 1,
    };
    await save(preset);
    // POST_NOTIFICATIONS — ask when the user creates their first timer.
    if (!source) void requestNotificationPermissionOnFirstTimer();
    router.back();
  };

  const onStart = async () => {
    const validation = validatePreset(draft);
    setErrors(validation);
    if (!isValidPreset(draft)) {
      alertAsync(t('editor.cannotStart'), t('editor.fixErrors'));
      return;
    }
    // Start directly without saving (templates-first activation).
    if (timerStatus === 'running' || timerStatus === 'paused') {
      const ok = await confirmAsync({
        title: t('home.runningConfirm.title'),
        message: t('editor.runningConfirmMessage'),
        confirmLabel: t('home.runningConfirm.confirm'),
        destructive: true,
      });
      if (!ok) return;
    }
    void doStart();
  };

  const doStart = async () => {
    const preset: Preset = {
      id: source?.id ?? createPresetId(),
      name: name.trim() || t('editor.quickTimer'),
      stages: stages.map((s) => ({ ...s, name: s.name.trim() })),
      repeatMode,
      fixedCount: repeatMode === 'fixedCount' ? fixedCount : null,
      createdAt: Date.now(),
      lastUsedAt: Date.now(),
      schemaVersion: 1,
    };
    await useTimerStore.getState().startPreset(preset);
    router.push('/timer');
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Name */}
        <View style={styles.section}>
          <ThemedText type="smallBold" themeColor="textSecondary">{t('editor.nameLabel')}</ThemedText>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder={t('editor.namePlaceholder')}
            placeholderTextColor={theme.textSecondary}
            style={[
              styles.input,
              {
                backgroundColor: theme.backgroundElement,
                color: theme.text,
                borderColor: errors.name ? theme.danger : 'transparent',
                borderWidth: errors.name ? 1.5 : 0,
              },
            ]}
            maxLength={50}
          />
          {errors.name && <ThemedText style={styles.error}>{errors.name}</ThemedText>}
        </View>

        {/* Repeat mode */}
        <View style={styles.section}>
          <ThemedText type="smallBold" themeColor="textSecondary">{t('editor.repeatLabel')}</ThemedText>
          <SegmentedControl
            options={REPEAT_OPTIONS.map((o) => ({ ...o, label: t(o.labelKey) }))}
            value={repeatMode}
            onChange={setRepeatMode}
          />
          {repeatMode === 'fixedCount' && (
            <View style={styles.roundRow}>
              <ThemedText>{t('editor.roundsLabel')}</ThemedText>
              <Stepper value={fixedCount} onChange={setFixedCount} min={1} max={999} step={1} />
              {errors.fixedCount && <ThemedText style={styles.error}>{errors.fixedCount}</ThemedText>}
            </View>
          )}
        </View>

        {/* Stages */}
        <View style={styles.section}>
          <View style={styles.stageHeader}>
            <ThemedText type="smallBold" themeColor="textSecondary">
              {t('editor.stagesLabel', { count: stages.length })}
            </ThemedText>
            <Pressable
              onPress={() =>
                setStages((prev) =>
                  prev.length < 50 ? [...prev, { id: createStageId(), name: 'STAGE', durationSeconds: 60 }] : prev,
                )
              }
              accessibilityRole="button"
              style={({ pressed }) => [styles.addStage, pressed && styles.pressed]}
            >
              <Ionicons name="add-circle-outline" size={18} color="#3c87f7" />
              <ThemedText style={styles.addStageLabel}>{t('editor.addStage')}</ThemedText>
            </Pressable>
          </View>
          {errors.stages && <ThemedText style={styles.error}>{errors.stages}</ThemedText>}

          {stages.map((stage, i) => (
            <AppCard key={stage.id} style={styles.stageCard}>
              <View style={styles.stageRow}>
                <View
                  style={[styles.stageDot, { backgroundColor: stageAccent(stage.name, isDark) }]}
                />
                <View style={styles.stageBody}>
                  <TextInput
                    value={stage.name}
                    onChangeText={(text) => updateStage(i, { name: text })}
                    placeholder={t('editor.stagePlaceholder')}
                    placeholderTextColor={theme.textSecondary}
                    style={[styles.input, { backgroundColor: theme.background, color: theme.text }]}
                  />
                  <View style={styles.durationRow}>
                    <Stepper
                      value={stage.durationSeconds}
                      onChange={(next) => updateStage(i, { durationSeconds: next })}
                      min={1}
                      max={9999}
                      step={5}
                      suffix={t('editor.secondsUnit')}
                    />
                    {errors.stageErrors?.[i] && (
                      <ThemedText style={[styles.error, styles.stageError]}>
                        {errors.stageErrors[i]}
                      </ThemedText>
                    )}
                  </View>
                  {/* Reorder (spec: drag-drop) — keep stage ids, sound mapping intact */}
                  <View style={styles.reorderRow}>
                    <Pressable
                      onPress={() => moveStage(i, i - 1)}
                      disabled={i === 0}
                      accessibilityLabel={t('editor.moveUp')}
                      style={[styles.reorderBtn, i === 0 && { opacity: 0.3 }]}
                    >
                      <Ionicons name="chevron-up" size={18} color={theme.textSecondary} />
                    </Pressable>
                    <Pressable
                      onPress={() => moveStage(i, i + 1)}
                      disabled={i === stages.length - 1}
                      accessibilityLabel={t('editor.moveDown')}
                      style={[styles.reorderBtn, i === stages.length - 1 && { opacity: 0.3 }]}
                    >
                      <Ionicons name="chevron-down" size={18} color={theme.textSecondary} />
                    </Pressable>
                  </View>
                  {/* Stage transition sound (custom pack when unlocked) */}
                  <Pressable
                    style={[styles.soundChip, { backgroundColor: theme.background }]}
                    onPress={() => setSoundMenuFor(i)}
                    accessibilityRole="button"
                  >
                    <Ionicons name="musical-notes-outline" size={14} color={theme.textSecondary} />
                    <ThemedText type="small">
                      {soundById(stage.soundId)?.label ?? BUILTIN_SOUNDS[0].label}
                    </ThemedText>
                    <Ionicons name="chevron-down" size={12} color={theme.textSecondary} />
                  </Pressable>
                </View>
                <IconButton
                  icon="trash-outline"
                  label={t('editor.deleteStageLabel')}
                  onPress={() => setStages((prev) => prev.filter((_, idx) => idx !== i))}
                  color={theme.danger}
                />
              </View>
            </AppCard>
          ))}
        </View>

        {/* iOS coverage-window warning (spec: background-scheduling + scheduled-routine budget split) */}
        {Platform.OS === 'ios' &&
          exceedsNotificationWindow(draft, effectiveMaxStageQueue(remoteConfig.getNumber('reminder_reserved_slots') || 10, activeSchedules, remoteConfig.getNumber('max_scheduled_transitions_ios') || 50)) && (
          <AppCard style={styles.notice}>
            <ThemedText type="small">{t('editor.iosCoverage')}</ThemedText>
          </AppCard>
        )}

        {/* Actions */}
        <View style={styles.actions}>
          <GradientButton label={t('editor.startCta')} icon="play" onPress={() => void onStart()} />
          <GradientButton
            label={isTemplateSource ? t('editor.saveAsNew') : t('editor.saveCta')}
            icon="save-outline"
            secondary
            onPress={() => void onSave()}
          />
          {source && !BUILTIN_TEMPLATES.some((t) => t.id === source.id) && (
            <Pressable
              style={styles.deleteBtn}
              accessibilityRole="button"
              onPress={() => {
                void (async () => {
                  const ok = await confirmAsync({
                    title: t('home.deleteConfirm.title'),
                    message: t('home.deleteConfirm.message', { name: source.name }),
                    confirmLabel: t('common.delete'),
                    destructive: true,
                  });
                  if (ok) {
                    await remove(source.id);
                    router.back();
                  }
                })();
              }}
            >
              <Ionicons name="trash-outline" size={16} color={theme.danger} />
              <ThemedText style={styles.deleteLabel}>{t('editor.deleteCta')}</ThemedText>
            </Pressable>
          )}
        </View>
      </ScrollView>

      {/* Stage transition sound picker (cross-platform menu) */}
      <ActionMenu
        visible={soundMenuFor !== null}
        title={soundMenuFor !== null ? stages[soundMenuFor]?.name ?? '' : ''}
        items={soundMenuItems}
        onClose={() => setSoundMenuFor(null)}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, gap: 20, paddingBottom: 48 },
  section: { gap: 10 },
  input: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  soundChip: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  error: {
    color: '#e5484d',
    fontSize: 13,
  },
  stageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  addStage: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  addStageLabel: {
    color: '#3c87f7',
    fontWeight: '700',
  },
  pressed: { opacity: 0.7 },
  stageCard: { padding: 12 },
  stageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stageDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 18,
  },
  stageBody: { flex: 1, gap: 8 },
  durationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  stageError: { flexShrink: 1 },
  reorderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  reorderBtn: {
    padding: 4,
  },
  roundRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    flexWrap: 'wrap',
  },
  notice: { gap: 4 },
  actions: { gap: 10, marginTop: 4 },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
  },
  deleteLabel: { color: '#e5484d', fontWeight: '600' },
});
