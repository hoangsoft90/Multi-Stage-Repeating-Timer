import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { FlatList, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ActionMenu } from '@/components/action-menu';
import { AppCard } from '@/components/app-card';
import { Chip } from '@/components/chip';
import { GradientButton } from '@/components/gradient-button';
import { IconButton } from '@/components/icon-button';
import { confirmAsync, alertAsync } from '@/components/confirm';
import { ImportDialog } from '@/components/import-dialog';
import { QuickRoutineCard } from '@/components/quick-routine-card';
import { AdBanner } from '@/components/ad-banner';
import { GuideTooltip } from '@/components/guide/guide-tooltip';
import { GuideBadge } from '@/components/guide/guide-badge';
import { useGuides } from '@/hooks/use-guides';
import { useSettingsStore } from '@/features/settings/settings-store';
import { BUILTIN_TEMPLATES, usePresetsStore } from '@/features/presets/presets-store';
import { encodePreset } from '@/features/presets/preset-codec';
import { suggestPresetForDayOfWeek, suggestPresetForNow } from '@/features/stats/stats';
import type { RoutineSuggestion, WeekdayRoutineSuggestion } from '@/features/stats/stats';
import { SessionLogRepo } from '@/core/storage/repos';
import { useTimerStore } from '@/features/timer/timer-store';
import { isMissed, nextTriggerAt, RoutineSchedule } from '@/features/routine/routine-schedule';
import { schedulePresetName, useRoutineStore } from '@/features/routine/routine-store';
import { Preset } from '@/core/timer/models';
import { share } from '@/platform';
import { stageColorFor } from '@/constants/stage-colors';
import { BrandGradient } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// v1.4 (spec: smart-routine-v2): weekday (1=Mon..7=Sun) → i18n day-label key,
// used by the "Routine hôm nay" subtitle when the weekday model matched.
const DAY_LABEL_KEYS: Record<number, string> = {
  1: 'routine.dayMon',
  2: 'routine.dayTue',
  3: 'routine.dayWed',
  4: 'routine.dayThu',
  5: 'routine.dayFri',
  6: 'routine.daySat',
  7: 'routine.daySun',
};

function presetSummary(p: Preset, t: (key: string, opts?: Record<string, unknown>) => string): string {
  const stages = t('home.summaryStages', { count: p.stages.length });
  const mode =
    p.repeatMode === 'forever'
      ? t('home.modeLoop')
      : p.repeatMode === 'fixedCount'
        ? t('home.modeRounds', { count: p.fixedCount })
        : t('home.modeOnce');
  return `${stages} · ${mode}`;
}

export default function HomeScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const theme = useTheme();
  const presets = usePresetsStore((s) => s.presets);
  const duplicate = usePresetsStore((s) => s.duplicate);
  const remove = usePresetsStore((s) => s.remove);
  const setFavorite = usePresetsStore((s) => s.setFavorite);
  const timerStatus = useTimerStore((s) => s.state.status);
  const timerStageName = useTimerStore((s) => s.state.currentStage?.name);
  const schedules = useRoutineStore((s) => s.schedules);

  // In-app guidance (v2): one-time tooltips + attention badges. Only after
  // onboarding so first-launch flow stays clean.
  const { isSeen, complete } = useGuides();
  const onboardingDone = useSettingsStore((s) => s.settings.onboardingDone);
  const isSessionActive = timerStatus === 'running' || timerStatus === 'paused';

  // Upcoming reminder (v1.3, spec: scheduled-routine 5.2) — earliest next
  // trigger among enabled schedules.
  const upcoming = useMemo(() => {
    let best: { at: number; schedule: RoutineSchedule } | null = null;
    for (const s of schedules) {
      if (!s.enabled) continue;
      const at = nextTriggerAt(s);
      if (at == null) continue;
      if (!best || at < best.at) best = { at, schedule: s };
    }
    return best;
  }, [schedules]);

  // Missed today (v1.3) — reminder passed unhandled; offer Start now / Skip.
  const missedSchedules = useMemo(() => schedules.filter((s) => isMissed(s)), [schedules]);

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  // Deep-link quick start: ?start=<presetId> (foundation for home-screen
  // widgets — `looptimer:///?start=hiit`). Runs once per mount.
  const { start: startParam, import: importParam } = useLocalSearchParams<{
    start?: string;
    import?: string;
  }>();
  const handledStartRef = useRef(false);

  const rows = useMemo(() => {
    const templates = BUILTIN_TEMPLATES.map((t) => ({ kind: 'template' as const, preset: t }));
    const user = presets.map((p) => ({ kind: 'preset' as const, preset: p }));
    return [...templates, ...user];
  }, [presets]);

  // Quick-start favorites (v1.3): user presets marked favorite float first.
  const favoriteRows = useMemo(
    () => rows.filter((r) => r.preset.isFavorite),
    [rows],
  );

  const openEditor = (preset: Preset) => {
    router.push(`/preset/${preset.id}`);
  };

  const onStart = async (preset: Preset) => {
    // Single active session confirm (spec: screens).
    if (timerStatus === 'running' || timerStatus === 'paused') {
      const ok = await confirmAsync({
        title: t('home.runningConfirm.title'),
        message: t('home.runningConfirm.message'),
        confirmLabel: t('home.runningConfirm.confirm'),
        destructive: true,
      });
      if (!ok) return;
    }
    await start(preset);
  };

  const start = async (preset: Preset) => {
    await useTimerStore.getState().startPreset(preset);
    router.push('/timer');
  };

  const isTemplate = (id: string) => BUILTIN_TEMPLATES.some((t) => t.id === id);

  // One-tap quick start from a deep link / future widget.
  useEffect(() => {
    const id = startParam;
    if (!id || handledStartRef.current) return;
    handledStartRef.current = true;
    const preset = rows.find((r) => r.preset.id === id)?.preset;
    if (!preset) return;
    void (async () => {
      await useTimerStore.getState().startPreset(preset);
      router.replace('/timer');
    })();
  }, [startParam, rows, router]);

  // Deep-link import: ?import=<encoded preset JSON> (v1.2, spec: preset-sharing).
  const handledImportRef = useRef(false);
  useEffect(() => {
    const encoded = importParam;
    if (!encoded || handledImportRef.current) return;
    handledImportRef.current = true;
    void (async () => {
      const result = await usePresetsStore.getState().importPreset(encoded);
      alertAsync(result.ok ? t('import.success', { name: result.name ?? '' }) : t('import.invalid'), '');
    })();
  }, [importParam, t]);

  // "Routine hôm nay" suggestion (v1.2, spec: daily-routine) — computed from
  // the last 7 days of local session history for the current time-of-day bucket.
  // v1.4 (spec: smart-routine-v2): the weekday model (4 weeks, same weekday)
  // wins when it has a signal; otherwise we fall back to the v1.2 model so new
  // users keep seeing the card. Refreshes on every screen focus.
  const [suggestion, setSuggestion] = useState<RoutineSuggestion | WeekdayRoutineSuggestion | null>(null);
  const [importVisible, setImportVisible] = useState(false);
  const refreshSuggestion = useCallback(() => {
    void new SessionLogRepo()
      .list()
      .then((entries) => {
        const ids = rows.map((r) => r.preset.id);
        setSuggestion(suggestPresetForDayOfWeek(entries, ids) ?? suggestPresetForNow(entries, ids));
      });
  }, [rows]);
  useEffect(() => {
    refreshSuggestion();
  }, [refreshSuggestion]);
  useFocusEffect(
    useCallback(() => {
      refreshSuggestion();
    }, [refreshSuggestion]),
  );

  const suggestedPreset = suggestion ? rows.find((r) => r.preset.id === suggestion.presetId)?.preset ?? null : null;

  // v1.4 (spec: smart-routine-v2): when the suggestion came from the weekday
  // model, show the matched weekday as a subtitle ("Thường tập Thứ 3").
  const suggestionWeekday = suggestion && 'weekDay' in suggestion ? suggestion.weekDay : null;

  const [menuPreset, setMenuPreset] = useState<Preset | null>(null);

  const onLongPress = (preset: Preset) => setMenuPreset(preset);

  const onSharePreset = async (preset: Preset) => {
    const ok = await share.share(encodePreset(preset));
    if (!ok) alertAsync(t('import.shareFail'), '');
  };

  const menuItems = menuPreset
    ? [
        { text: t('home.menuDuplicate'), onPress: () => void duplicate(menuPreset.id) },
        {
          text: menuPreset.isFavorite ? t('common.unfavorite') : t('common.favorite'),
          onPress: () => void setFavorite(menuPreset!.id, !menuPreset!.isFavorite),
        },
        { text: t('home.menuShare'), onPress: () => void onSharePreset(menuPreset) },
        // Templates are built-in constants — they cannot be deleted.
        ...(isTemplate(menuPreset.id)
          ? []
          : [
              {
                text: t('common.delete'),
                destructive: true as const,
                onPress: () => {
                  void (async () => {
                    const ok = await confirmAsync({
                      title: t('home.deleteConfirm.title'),
                      message: t('home.deleteConfirm.message', { name: menuPreset.name }),
                      confirmLabel: t('common.delete'),
                      destructive: true,
                    });
                    if (ok) await remove(menuPreset.id);
                  })();
                },
              },
            ]),
      ]
    : [];

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        {/* header */}
        <View style={styles.header}>
          <LinearGradient
            colors={[...BrandGradient]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.logo}
          >
            <Ionicons name="timer-outline" size={22} color="#FFFFFF" />
          </LinearGradient>
          <View style={{ flex: 1 }}>
            <ThemedText style={styles.appName}>LoopTimer</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {t('home.subtitle')}
            </ThemedText>
          </View>
          <View style={styles.headerIcons}>
            <View>
              <IconButton
                icon="library-outline"
                label={t('templates.title')}
                onPress={() => {
                  complete('badge-templates');
                  router.push('/templates');
                }}
              />
              {onboardingDone && !isSeen('badge-templates') ? <GuideBadge /> : null}
            </View>
            <View>
              <IconButton
                icon="bar-chart-outline"
                label={t('home.statsLabel')}
                onPress={() => {
                  complete('badge-stats');
                  router.push('/stats');
                }}
              />
              {onboardingDone && !isSeen('badge-stats') ? <GuideBadge /> : null}
            </View>
            <View>
              <IconButton
                icon="settings-outline"
                label={t('home.settingsLabel')}
                onPress={() => {
                  complete('badge-settings');
                  router.push('/settings');
                }}
              />
              {onboardingDone && !isSeen('badge-settings') ? <GuideBadge /> : null}
            </View>
          </View>
        </View>

        <FlatList
          data={rows}
          keyExtractor={(item) => item.preset.id}
          contentContainerStyle={{ paddingBottom: 32, gap: 12 }}
          key={favoriteRows.length + rows.length}
          ListHeaderComponent={
            <View style={{ gap: 12, marginBottom: 4 }}>
              {/* Timer still running (background design) — jump back in */}
              {isSessionActive ? (
                <AppCard style={[styles.todayCard, { borderColor: '#22c55e55' }]}>
                  <View style={styles.cardBody}>
                    <View style={[styles.stageDot, { backgroundColor: '#22c55e' }]} />
                    <View style={{ flex: 1, gap: 4 }}>
                      <ThemedText type="smallBold" style={[styles.todayLabel, { color: '#22c55e' }]}>
                        {t('home.runningTitle')}
                      </ThemedText>
                      <ThemedText style={{ fontWeight: '700', fontSize: 17 }}>
                        {timerStageName ?? '…'}
                      </ThemedText>
                    </View>
                    <GradientButton
                      label={t('home.runningOpen')}
                      onPress={() => router.push('/timer')}
                      fullWidth={false}
                    />
                  </View>
                </AppCard>
              ) : null}

              {/* First-run guide: how to start (dismissed forever on action) */}
              {onboardingDone && !isSeen('home-start') && !isSessionActive ? (
                <GuideTooltip
                  title={t('guide.homeStartTitle')}
                  body={t('guide.homeStartBody')}
                  actionLabel={t('guide.gotIt')}
                  skipLabel={t('guide.skip')}
                  onDone={() => complete('home-start')}
                  onSkip={() => complete('home-start')}
                />
              ) : null}

              {/* Quick Routine (v1.3) — zero-friction start */}
              <QuickRoutineCard onStarted={() => router.push('/timer')} />

              {/* Upcoming reminder (v1.3, spec: scheduled-routine) */}
              {upcoming && (
                <AppCard style={[styles.todayCard, { borderColor: BrandGradient[0] + '44' }]}>
                  <View style={styles.cardBody}>
                    <View style={[styles.stageDot, { backgroundColor: stageColorFor('WORK').main }]} />
                    <View style={{ flex: 1, gap: 6 }}>
                      <ThemedText type="smallBold" style={styles.todayLabel}>
                        {t('routine.upcoming')}
                      </ThemedText>
                      <ThemedText style={{ fontWeight: '700', fontSize: 17 }}>
                        {schedulePresetName(upcoming.schedule)}
                      </ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        {t('routine.next', { time: formatTime(upcoming.at) })}
                      </ThemedText>
                    </View>
                  </View>
                </AppCard>
              )}

              {/* Missed reminders today (v1.3) — Start now / Skip */}
              {missedSchedules.map((s) => {
                const preset = rows.find((r) => r.preset.id === s.presetId)?.preset ?? null;
                return (
                  <AppCard key={s.id} style={[styles.todayCard, { borderColor: theme.danger + '55' }]}>
                    <View style={styles.cardBody}>
                      <View style={{ flex: 1, gap: 6 }}>
                        <ThemedText type="smallBold" style={{ color: theme.danger, textTransform: 'uppercase', letterSpacing: 1 }}>
                          {t('routine.missed')}
                        </ThemedText>
                        <ThemedText style={{ fontWeight: '700', fontSize: 17 }}>
                          {schedulePresetName(s)}
                        </ThemedText>
                      </View>
                      <View style={{ gap: 6, alignItems: 'center' }}>
                        <GradientButton
                          label={t('routine.startNow')}
                          onPress={() => preset && void onStart(preset)}
                          fullWidth={false}
                        />
                        <Pressable
                          accessibilityRole="button"
                          onPress={() => void useRoutineStore.getState().markHandled(s.id)}
                        >
                          <ThemedText type="small" themeColor="textSecondary">
                            {t('routine.skip')}
                          </ThemedText>
                        </Pressable>
                      </View>
                    </View>
                  </AppCard>
                );
              })}

              {/* Preset chips (v1.3) — tap ▶ to start, tap body to edit */}
              {rows.length > 0 && (
                <>
                  <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionLabel}>
                    {t('home.chips')}
                  </ThemedText>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
                    {rows.map((r) => (
                      <Pressable
                        key={r.preset.id}
                        style={[styles.chip, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}
                        onPress={() => openEditor(r.preset)}
                      >
                        <ThemedText style={styles.chipLabel} numberOfLines={1}>
                          {r.preset.name}
                        </ThemedText>
                        <View style={[styles.chipStart, { backgroundColor: BrandGradient[0] }]}>
                          <Ionicons name="play" size={12} color="#FFFFFF" onPress={() => void onStart(r.preset)} />
                        </View>
                      </Pressable>
                    ))}
                  </ScrollView>
                </>
              )}

              {/* Favorites (v1.3) — favorite presets float first */}
              {favoriteRows.length > 0 && (
                <>
                  <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionLabel}>
                    {t('home.favorites')}
                  </ThemedText>
                  {favoriteRows.map((r) => (
                    <AppCard key={r.preset.id} style={styles.card}>
                      <Pressable
                        style={styles.cardBody}
                        onPress={() => openEditor(r.preset)}
                        onLongPress={() => onLongPress(r.preset)}
                      >
                        <View style={[styles.stageDot, { backgroundColor: stageColorFor(r.preset.stages[0]?.name).main }]} />
                        <View style={{ flex: 1, gap: 6 }}>
                          <ThemedText style={{ fontWeight: '700', fontSize: 17 }}>{r.preset.name}</ThemedText>
                          <View style={styles.metaRow}>
                            <Chip>{presetSummary(r.preset, t)}</Chip>
                          </View>
                        </View>
                        <GradientButton
                          label={t('home.start')}
                          onPress={() => void onStart(r.preset)}
                          fullWidth={false}
                          style={styles.startBtn}
                        />
                      </Pressable>
                    </AppCard>
                  ))}
                </>
              )}

              {/* Routine hôm nay (v1.2) — suggested preset for this time of day */}
              {suggestedPreset && suggestion ? (
                <AppCard style={[styles.todayCard, { borderColor: BrandGradient[0] + '55' }]}>
                  <View style={styles.cardBody}>
                    <View style={[styles.stageDot, { backgroundColor: stageColorFor(suggestedPreset.stages[0]?.name).main }]} />
                    <View style={{ flex: 1, gap: 6 }}>
                      <ThemedText type="smallBold" style={styles.todayLabel}>
                        {t('home.todayRoutine')}
                      </ThemedText>
                      <ThemedText style={{ fontWeight: '700', fontSize: 17 }}>{suggestedPreset.name}</ThemedText>
                      {suggestionWeekday != null && (
                        <ThemedText type="small" themeColor="textSecondary">
                          {t('home.routineDayReason', { day: t(DAY_LABEL_KEYS[suggestionWeekday]) })}
                        </ThemedText>
                      )}
                      <View style={styles.metaRow}>
                        <Chip>{presetSummary(suggestedPreset, t)}</Chip>
                      </View>
                    </View>
                    <GradientButton
                      label={t('home.start')}
                      onPress={() => void onStart(suggestedPreset)}
                      fullWidth={false}
                      style={styles.startBtn}
                    />
                  </View>
                </AppCard>
              ) : null}

              <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionLabel}>
                {t('home.templatesSection')}
              </ThemedText>
              <Pressable
                style={[styles.newPreset, { borderColor: theme.text + '40', backgroundColor: theme.backgroundElement }]}
                onPress={() => router.push('/preset/new')}
              >
                <Ionicons name="add-circle-outline" size={18} color={theme.text} />
                <ThemedText style={{ fontWeight: '700' }}>{t('home.newPreset')}</ThemedText>
              </Pressable>
              <Pressable
                style={[styles.newPreset, { borderColor: theme.text + '30', backgroundColor: theme.backgroundElement }]}
                onPress={() => setImportVisible(true)}
              >
                <Ionicons name="download-outline" size={18} color={theme.textSecondary} />
                <ThemedText themeColor="textSecondary" style={{ fontWeight: '600' }}>
                  {t('home.importPreset')}
                </ThemedText>
              </Pressable>
            </View>
          }
          renderItem={({ item }) => {
            const accent = stageColorFor(item.preset.stages[0]?.name).main;
            return (
              <AppCard style={styles.card}>
                <Pressable
                  style={styles.cardBody}
                  onPress={() => openEditor(item.preset)}
                  onLongPress={() => onLongPress(item.preset)}
                >
                  <View style={[styles.stageDot, { backgroundColor: accent }]} />
                  <View style={{ flex: 1, gap: 6 }}>
                    <ThemedText style={{ fontWeight: '700', fontSize: 17 }}>{item.preset.name}</ThemedText>
                    <View style={styles.metaRow}>
                      <Chip>{presetSummary(item.preset, t)}</Chip>
                    </View>
                  </View>
                  <GradientButton
                    label={t('home.start')}
                    onPress={() => void onStart(item.preset)}
                    fullWidth={false}
                    style={styles.startBtn}
                  />
                </Pressable>
              </AppCard>
            );
          }}
          ListEmptyComponent={
            <ThemedText type="default" themeColor="textSecondary" style={styles.empty}>
              {t('home.empty')}
            </ThemedText>
          }
        />
      </SafeAreaView>

      {/* Banner ad (spec: monetization — native only; web stub renders null). */}
      <AdBanner />

      {/* Long-press action menu (cross-platform; Alert is a no-op on web). */}
      <ActionMenu
        visible={menuPreset !== null}
        title={menuPreset?.name}
        items={menuItems}
        onClose={() => setMenuPreset(null)}
      />

      {/* Import preset dialog (v1.2, spec: preset-sharing). */}
      <ImportDialog visible={importVisible} onClose={() => setImportVisible(false)} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, paddingHorizontal: 20 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 16,
  },
  logo: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF512F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 4,
  },
  appName: {
    fontSize: 22,
    fontWeight: '800',
  },
  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sectionLabel: { textTransform: 'uppercase', letterSpacing: 1 },
  newPreset: {
    borderRadius: 14,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    paddingVertical: 15,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  card: {
    padding: 12,
  },
  cardBody: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stageDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  startBtn: {
    alignSelf: 'center',
  },
  empty: { textAlign: 'center', paddingVertical: 24 },
  todayCard: {
    padding: 12,
    borderWidth: 1.5,
  },
  todayLabel: {
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: BrandGradient[0],
  },
  chipsRow: {
    gap: 8,
    paddingVertical: 2,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingLeft: 14,
    paddingRight: 6,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  chipLabel: {
    maxWidth: 120,
    fontWeight: '600',
  },
  chipStart: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
