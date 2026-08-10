/**
 * "Continue where you left off?" dialog (spec: session-recovery).
 * Shown after kill/reboot when an active session was restored. Never
 * auto-resumes. Three choices: Resume / Restart / Dismiss. When the
 * sequence finished while away: shows "Routine đã hoàn thành..." and no
 * Resume button.
 */
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { GradientButton } from '@/components/gradient-button';
import { formatMs, useTimerStore } from '@/features/timer/timer-store';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function RecoveryDialog() {
  const recovery = useTimerStore((s) => s.recovery);
  const resolveRecovery = useTimerStore((s) => s.resolveRecovery);
  const { t } = useTranslation();
  const theme = useTheme();

  if (!recovery?.pending) return null;

  return (
    <Modal transparent visible animationType="fade" onRequestClose={() => resolveRecovery('dismiss')}>
      <View style={[styles.backdrop, { backgroundColor: theme.overlay }]}>
        <ThemedView style={styles.card}>
          <ThemedText type="subtitle" style={styles.title}>
            {recovery.completedWhileAway ? t('recovery.completedTitle') : t('recovery.runningTitle')}
          </ThemedText>

          {recovery.completedWhileAway ? (
            <ThemedText type="default" themeColor="textSecondary" style={styles.body}>
              {t('recovery.completedBody')}
            </ThemedText>
          ) : (
            <ThemedText type="default" themeColor="textSecondary" style={styles.body}>
              {t('recovery.stageLeft', {
                stage: recovery.stageName,
                time: formatMs(recovery.remainingMs),
              })}
            </ThemedText>
          )}

          <View style={styles.actions}>
            {!recovery.completedWhileAway && (
              <GradientButton label={t('recovery.resume')} icon="play" onPress={() => resolveRecovery('resume')} />
            )}
            <GradientButton
              label={t('recovery.restart')}
              icon="refresh"
              secondary
              onPress={() => resolveRecovery('restart')}
            />
            <Pressable
              style={({ pressed }) => [styles.ghost, pressed && styles.ghostPressed]}
              onPress={() => resolveRecovery('dismiss')}
            >
              <ThemedText themeColor="textSecondary" style={styles.ghostLabel}>
                {t('recovery.dismiss')}
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
    gap: 12,
  },
  title: {
    fontSize: 24,
    lineHeight: 30,
  },
  body: {
    lineHeight: 24,
  },
  mono: {
    fontVariant: ['tabular-nums'],
  },
  actions: {
    marginTop: 12,
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
