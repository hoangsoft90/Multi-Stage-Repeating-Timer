import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AppCard } from '@/components/app-card';
import { SessionLogEntry, SessionLogRepo } from '@/core/storage/repos';
import {
  bestStreak,
  currentStreak,
  dayKey,
  formatDay,
  formatDuration,
  lastWeeksGrid,
  moodSummaryByPreset,
  totalDurationMs,
  totalSessions,
  weekDurationMs,
} from '@/features/stats/stats';
import { useTheme } from '@/hooks/use-theme';
import { Radius } from '@/constants/theme';

const repo = new SessionLogRepo();

/** Heat intensity colors (green scale on both themes). */
const HEAT_COLORS = ['#22C55E22', '#22C55E66', '#22C55EAA', '#22C55E'];

/** Mood → emoji (v1.5 session-notes); empty string when unset. */
const MOOD_EMOJI: Record<string, string> = {
  happy: '🙂',
  neutral: '😐',
  sad: '😓',
};

export default function StatsScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const [entries, setEntries] = useState<SessionLogEntry[]>([]);

  useEffect(() => {
    let mounted = true;
    void repo.list().then((list) => {
      if (mounted) setEntries(list);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const recent = useMemo(() => [...entries].reverse().slice(0, 12), [entries]);
  const heat = useMemo(() => lastWeeksGrid(entries), [entries]);
  const moodSummary = useMemo(() => moodSummaryByPreset(entries), [entries]);
  const stats = useMemo(
    () => ({
      sessions: totalSessions(entries),
      total: formatDuration(totalDurationMs(entries)),
      week: formatDuration(weekDurationMs(entries)),
      streak: currentStreak(entries),
      best: bestStreak(entries),
    }),
    [entries],
  );

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {entries.length === 0 ? (
          <ThemedText type="default" themeColor="textSecondary" style={styles.empty}>
            {t('stats.empty')}
          </ThemedText>
        ) : (
          <>
            {/* stat cards */}
            <View style={styles.grid}>
              <StatCard label={t('stats.totalSessions')} value={String(stats.sessions)} theme={theme} />
              <StatCard label={t('stats.totalTime')} value={stats.total} theme={theme} />
              <StatCard label={t('stats.week')} value={stats.week} theme={theme} />
              <StatCard
                label={t('stats.streak')}
                value={String(stats.streak)}
                sub={`${t('stats.best')}: ${stats.best}`}
                theme={theme}
              />
            </View>

            {/* 12-week heatmap */}
            <AppCard style={styles.card}>
              <ThemedText type="smallBold" themeColor="textSecondary" style={styles.cardTitle}>
                {t('nav.statsTitle')} · 12w
              </ThemedText>
              <View style={styles.heatWrap}>
                {heat.map((cell) => {
                  const level = cell.count === 0 ? 0 : Math.min(3, 1 + Math.floor(cell.count / 2));
                  return (
                    <View
                      key={cell.day}
                      style={[
                        styles.heatCell,
                        {
                          backgroundColor:
                            level === 0 ? theme.backgroundSelected : HEAT_COLORS[level - 1],
                        },
                      ]}
                    />
                  );
                })}
              </View>
            </AppCard>

            {/* mood by preset (v1.5 session-notes) — shown when there is data */}
            {moodSummary.length > 0 && (
              <AppCard style={styles.card}>
                <ThemedText type="smallBold" themeColor="textSecondary" style={styles.cardTitle}>
                  {t('stats.mood')}
                </ThemedText>
                {moodSummary.map((m, i) => (
                  <View
                    key={m.presetId}
                    style={[
                      styles.recentRow,
                      i < moodSummary.length - 1 && {
                        borderBottomWidth: StyleSheet.hairlineWidth,
                        borderBottomColor: theme.border,
                      },
                    ]}
                  >
                    <View style={{ flex: 1 }}>
                      <ThemedText style={styles.recentName}>{m.presetName}</ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        {t('stats.totalSessions')}: {m.total}
                      </ThemedText>
                    </View>
                    <ThemedText type="small" themeColor="textSecondary">
                      🙂 {m.happy} · 😐 {m.neutral} · 😓 {m.sad}
                      {m.noted > 0 ? ` · 📝 ${m.noted}` : ''}
                    </ThemedText>
                  </View>
                ))}
              </AppCard>
            )}

            {/* recent sessions */}
            <AppCard style={styles.card}>
              <ThemedText type="smallBold" themeColor="textSecondary" style={styles.cardTitle}>
                {t('stats.recent')}
              </ThemedText>
              {recent.map((e, i) => (
                <View
                  key={e.id}
                  style={[
                    styles.recentRow,
                    i < recent.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border },
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <ThemedText style={styles.recentName}>
                      {e.presetName}
                      {e.mood ? ` ${MOOD_EMOJI[e.mood] ?? ''}` : ''}
                    </ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {dayKey(e.endedAt) === dayKey(Date.now())
                        ? t('stats.today')
                        : formatDay(e.endedAt)}
                    </ThemedText>
                  </View>
                  <ThemedText type="small" themeColor="textSecondary">
                    {formatDuration(e.durationMs)} · {e.stageCount} st
                  </ThemedText>
                </View>
              ))}
            </AppCard>
          </>
        )}
      </ScrollView>
    </ThemedView>
  );
}

function StatCard({
  label,
  value,
  sub,
  theme,
}: {
  label: string;
  value: string;
  sub?: string;
  theme: ReturnType<typeof useTheme>;
}) {
  return (
    <View style={[styles.statCard, { backgroundColor: theme.backgroundElement }]}>
      <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
        {label}
      </ThemedText>
      <ThemedText style={styles.statValue} numberOfLines={1}>
        {value}
      </ThemedText>
      {sub ? (
        <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
          {sub}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, gap: 16, paddingBottom: 48 },
  empty: { textAlign: 'center', paddingVertical: 48, paddingHorizontal: 24 },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    flexBasis: '47%',
    flexGrow: 1,
    borderRadius: Radius.lg,
    padding: 16,
    gap: 4,
  },
  statValue: {
    fontSize: 26,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  card: { padding: 16, gap: 12, borderRadius: Radius.lg },
  cardTitle: { letterSpacing: 1, textTransform: 'uppercase' },
  heatWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
  },
  heatCell: {
    width: 15,
    height: 15,
    borderRadius: 4,
  },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
  },
  recentName: { fontWeight: '700' },
});
