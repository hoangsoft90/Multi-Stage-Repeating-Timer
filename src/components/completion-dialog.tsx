/**
 * Completion celebration (v1.2, spec: completion-celebration) — shown after a
 * session completes naturally: name + duration + streak + a share button.
 * Root-level (like RecoveryDialog) so it works on every screen. Never shown
 * for a manual stop.
 */
import { Modal, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { GradientButton } from '@/components/gradient-button';
import { formatMs, useTimerStore } from '@/features/timer/timer-store';
import { usePresetsStore } from '@/features/presets/presets-store';
import { QUICK_SESSION_PRESET_ID } from '@/features/routine/routine-schedule';
import { createPresetId, createStageId } from '@/core/timer/models';
import { SessionLogRepo, SessionMood } from '@/core/storage/repos';
import { useGoalsStore } from '@/features/goals/goals-store';
import { currentWeekProgress, WeekProgress } from '@/features/goals/weekly-goals';
import { share } from '@/platform';
import { alertAsync } from '@/components/confirm';
import { BrandGradient, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Optional mood options (emoji is the primary UI; i18n is the a11y label). */
const MOODS: Array<{ id: SessionMood; emoji: string; labelKey: string }> = [
  { id: 'happy', emoji: '🙂', labelKey: 'notes.happy' },
  { id: 'neutral', emoji: '😐', labelKey: 'notes.neutral' },
  { id: 'sad', emoji: '😓', labelKey: 'notes.sad' },
];

const sessionLogRepo = new SessionLogRepo();

export function CompletionDialog() {
  const completion = useTimerStore((s) => s.completion);
  const dismissCompletion = useTimerStore((s) => s.dismissCompletion);
  const save = usePresetsStore((s) => s.save);
  const { t } = useTranslation();
  const theme = useTheme();
  const [saving, setSaving] = useState(false);
  const [saveName, setSaveName] = useState('');
  // Session notes (v1.5, spec: session-notes) — optional, never blocks Done.
  const [mood, setMood] = useState<SessionMood | null>(null);
  const [note, setNote] = useState('');
  const [showNote, setShowNote] = useState(false);
  const [moodSaving, setMoodSaving] = useState(false);
  const [notesSaved, setNotesSaved] = useState(false);

  // A new completed session resets the (optional) notes form.
  useEffect(() => {
    setMood(null);
    setNote('');
    setShowNote(false);
    setNotesSaved(false);
  }, [completion?.sessionId]);

  // Weekly goal progress (v1.5, spec: weekly-goals) — computed from the log
  // at dialog-open time so it reflects this very session.
  const goal = useGoalsStore((s) => s.goal);
  const [weekProgress, setWeekProgress] = useState<WeekProgress | null>(null);
  useEffect(() => {
    if (!completion || !goal) {
      setWeekProgress(null);
      return;
    }
    let mounted = true;
    void sessionLogRepo.list().then((entries) => {
      if (mounted) setWeekProgress(currentWeekProgress(entries, goal));
    });
    return () => {
      mounted = false;
    };
  }, [completion, goal]);

  if (!completion) return null;

  const onSaveNotes = async () => {
    if (!mood && !note.trim()) return;
    setMoodSaving(true);
    try {
      await sessionLogRepo.updateMoodNote(completion.sessionId, mood, note.trim() || null);
      setNotesSaved(true);
    } finally {
      setMoodSaving(false);
    }
  };

  const duration = formatMs(completion.durationMs);
  const isQuick = completion.presetId === QUICK_SESSION_PRESET_ID;

  const onShare = async () => {
    const text = t('complete.shareText', {
      name: completion.presetName,
      duration,
      count: completion.streak,
    });
    const ok = await share.share(text);
    if (!ok) alertAsync(t('import.shareFail'), '');
  };

  const onSaveAs = async () => {
    const name = saveName.trim();
    if (!name || !completion?.stages) return;
    setSaving(true);
    try {
      await save({
        id: createPresetId(),
        name,
        // Regenerate stage ids — never leak the quick-session's temp ids
        // (quick_work/quick_break) into a saved preset.
        stages: completion.stages.map((s) => ({ ...s, id: createStageId() })),
        repeatMode: completion.repeatMode ?? 'fixedCount',
        fixedCount: completion.fixedCount ?? null,
        createdAt: Date.now(),
        lastUsedAt: Date.now(),
        schemaVersion: 1,
      });
      dismissCompletion();
      alertAsync(t('quick.saved', { name }), '');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal transparent visible animationType="fade" onRequestClose={dismissCompletion}>
      <View style={[styles.backdrop, { backgroundColor: theme.overlay }]}>
        <ThemedView style={styles.card}>
          <View style={styles.celebrate}>
            <LinearGradient colors={[...BrandGradient]} style={styles.badge}>
              <Ionicons name="trophy" size={30} color="#FFFFFF" />
            </LinearGradient>
            <ThemedText type="subtitle" style={styles.title}>
              {t('complete.title')}
            </ThemedText>
          </View>

          <View style={styles.stats}>
            <View style={[styles.stat, { backgroundColor: theme.backgroundSelected }]}>
              <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                {t('complete.name', { name: completion.presetName })}
              </ThemedText>
              <ThemedText style={styles.statValue}>{duration}</ThemedText>
            </View>
            <View style={[styles.stat, { backgroundColor: theme.backgroundSelected }]}>
              <ThemedText type="small" themeColor="textSecondary">
                {t('stats.streak')}
              </ThemedText>
              <ThemedText style={styles.statValue}>{completion.streak} 🔥</ThemedText>
            </View>
          </View>

          {/* Weekly goal progress (v1.5) — shown when a goal is set */}
          {goal && weekProgress ? (
            <View style={styles.goalBlock}>
              <ThemedText type="small" themeColor="textSecondary">
                {t('goals.progress', { done: weekProgress.completed, target: weekProgress.target })}
              </ThemedText>
              <View style={[styles.goalBar, { backgroundColor: theme.backgroundSelected }]}>
                <LinearGradient
                  colors={[...BrandGradient]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[
                    styles.goalBarFill,
                    {
                      width: `${Math.min(100, Math.round((weekProgress.completed / weekProgress.target) * 100))}%`,
                    },
                  ]}
                />
              </View>
              <ThemedText type="small" themeColor="textSecondary">
                {weekProgress.completed >= weekProgress.target
                  ? t('goals.reached')
                  : t('goals.remaining', { count: weekProgress.target - weekProgress.completed })}
              </ThemedText>
            </View>
          ) : null}

          {/* Quick routine → offer saving the finished session as a preset (v1.3) */}
          {isQuick && completion.stages ? (
            <View style={styles.saveRow}>
              <TextInput
                value={saveName}
                onChangeText={setSaveName}
                placeholder={t('quick.savePlaceholder')}
                placeholderTextColor={theme.textSecondary}
                style={[
                  styles.saveInput,
                  { backgroundColor: theme.backgroundSelected, color: theme.text, borderColor: theme.border },
                ]}
              />
              <GradientButton
                label={t('quick.saveAs')}
                icon="save-outline"
                onPress={() => void onSaveAs()}
                disabled={saving || !saveName.trim()}
                fullWidth={false}
              />
            </View>
          ) : null}

          {/* Optional session notes (v1.5) — mood picker + note, saved to the log */}
          {notesSaved ? (
            <ThemedText type="small" themeColor="textSecondary" style={styles.notesSaved}>
              ✓ {t('notes.saved')}
            </ThemedText>
          ) : (
            <View style={styles.notesBlock}>
              <ThemedText type="smallBold" themeColor="textSecondary" style={styles.notesTitle}>
                {t('notes.title')}
              </ThemedText>
              <View style={styles.moodRow}>
                {MOODS.map((m) => {
                  const active = mood === m.id;
                  return (
                    <Pressable
                      key={m.id}
                      accessibilityRole="button"
                      accessibilityLabel={t(m.labelKey)}
                      onPress={() => setMood(active ? null : m.id)}
                      style={[
                        styles.moodBtn,
                        {
                          backgroundColor: theme.backgroundSelected,
                          borderColor: active ? BrandGradient[0] : theme.border,
                        },
                      ]}
                    >
                      <ThemedText style={styles.moodEmoji}>{m.emoji}</ThemedText>
                    </Pressable>
                  );
                })}
                <Pressable style={styles.noteToggle} onPress={() => setShowNote((v) => !v)}>
                  <Ionicons name="create-outline" size={15} color={theme.textSecondary} />
                  <ThemedText type="small" themeColor="textSecondary">
                    {t('notes.addNote')}
                  </ThemedText>
                </Pressable>
              </View>
              {showNote ? (
                <TextInput
                  value={note}
                  onChangeText={setNote}
                  placeholder={t('notes.notePlaceholder')}
                  placeholderTextColor={theme.textSecondary}
                  multiline
                  style={[
                    styles.noteInput,
                    { backgroundColor: theme.backgroundSelected, color: theme.text, borderColor: theme.border },
                  ]}
                />
              ) : null}
              <GradientButton
                label={t('notes.save')}
                icon="checkmark"
                onPress={() => void onSaveNotes()}
                disabled={moodSaving || (!mood && !note.trim())}
                fullWidth={false}
              />
            </View>
          )}

          <View style={styles.actions}>
            <GradientButton label={t('complete.share')} icon="share-social" onPress={() => void onShare()} />
            <Pressable
              style={({ pressed }) => [styles.ghost, pressed && styles.ghostPressed]}
              onPress={dismissCompletion}
            >
              <ThemedText themeColor="textSecondary" style={styles.ghostLabel}>
                {t('complete.done')}
              </ThemedText>
            </Pressable>
          </View>
        </ThemedView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    borderRadius: Radius.xl,
    padding: 24,
    width: '100%',
    maxWidth: 420,
    gap: 16,
  },
  celebrate: {
    alignItems: 'center',
    gap: 10,
  },
  badge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF512F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
  },
  stats: {
    flexDirection: 'row',
    gap: 12,
  },
  stat: {
    flex: 1,
    borderRadius: Radius.md,
    padding: 14,
    gap: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  saveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  notesBlock: {
    backgroundColor: 'transparent',
    gap: 8,
  },
  notesTitle: {
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  moodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  moodBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  moodEmoji: {
    fontSize: 20,
  },
  noteToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  noteInput: {
    borderRadius: Radius.md,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    minHeight: 64,
    textAlignVertical: 'top',
  },
  notesSaved: {
    alignSelf: 'center',
    paddingVertical: 4,
  },
  goalBlock: {
    gap: 6,
  },
  goalBar: {
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
  },
  goalBarFill: {
    height: '100%',
    borderRadius: 5,
  },
  saveInput: {
    flex: 1,
    borderRadius: Radius.md,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  actions: {
    marginTop: 4,
    gap: 10,
  },
  ghost: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  ghostPressed: { opacity: 0.6 },
  ghostLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
});
