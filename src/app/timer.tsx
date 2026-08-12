import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Animated, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { confirmAsync } from '@/components/confirm';
import { ProgressRing } from '@/components/progress-ring';
import { StagePill } from '@/components/stage-pill';
import { GuideTooltip } from '@/components/guide/guide-tooltip';
import { formatMs, useTimerStore } from '@/features/timer/timer-store';
import { useSettingsStore } from '@/features/settings/settings-store';
import { useGuides } from '@/hooks/use-guides';
import { stageColorFor } from '@/constants/stage-colors';
import { Radius, Typography } from '@/constants/theme';
import { useIsDark, useTheme } from '@/hooks/use-theme';

export default function TimerScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const theme = useTheme();
  // Effective dark (honours the forced Light/Dark theme setting).
  const isDark = useIsDark();

  const state = useTimerStore((s) => s.state);
  const pause = useTimerStore((s) => s.pause);
  const resume = useTimerStore((s) => s.resume);
  const skip = useTimerStore((s) => s.skip);
  const stop = useTimerStore((s) => s.stop);
  const tick = useTimerStore((s) => s.tick);

  // One-time coach mark explaining the controls + background behaviour.
  const { isSeen, complete } = useGuides();
  const onboardingDone = useSettingsStore((s) => s.settings.onboardingDone);
  const showControlsGuide = onboardingDone && !isSeen('timer-controls');

  // Reconcile + refresh on mount, then keep a 250ms render tick.
  useEffect(() => {
    tick();
    const h = setInterval(tick, 250);
    return () => clearInterval(h);
  }, [tick]);

  const status = state.status;
  const isRunning = status === 'running';

  // Nothing to show — go home.
  useEffect(() => {
    // Also redirect after a completed session so the screen never sits stuck
    // on a dead 00:00 ring once the completion dialog is dismissed (the
    // dialog itself is rendered globally at the root layout).
    if (status === 'idle' || status === 'stopped' || status === 'completed') {
      router.replace('/');
    }
  }, [status, router]);

  const stage = state.currentStage;
  const stageColor = stageColorFor(stage?.name);
  const accent = isDark ? stageColor.main : stageColor.light;

  // ---- background tint crossfades when the stage changes ----
  const tintAnim = useRef(new Animated.Value(1)).current;
  const prevTintRef = useRef(stageColor.tint);
  const curTintRef = useRef(stageColor.tint);
  useEffect(() => {
    if (curTintRef.current === stageColor.tint) return;
    prevTintRef.current = curTintRef.current;
    curTintRef.current = stageColor.tint;
    tintAnim.setValue(0);
    Animated.timing(tintAnim, { toValue: 1, duration: 400, useNativeDriver: false }).start();
  }, [stageColor.tint, tintAnim]);
  const bgColor = tintAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [prevTintRef.current, curTintRef.current],
  });

  // ---- pulse when the stage is about to end ----
  const pulse = useRef(new Animated.Value(0)).current;
  const isNearEnd = isRunning && state.remainingMs > 0 && state.remainingMs < 10_000;
  useEffect(() => {
    if (isNearEnd) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1, duration: 500, useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 0, duration: 500, useNativeDriver: true }),
        ]),
      );
      loop.start();
      return () => loop.stop();
    }
    pulse.setValue(0);
  }, [isNearEnd, pulse]);

  const totalMs = (stage?.durationSeconds ?? 0) * 1000;
  const ringProgress = totalMs > 0 ? Math.max(0, Math.min(1, 1 - state.progress)) : 0;
  // Shrink the ring while the first-run tooltip is visible so the controls
  // + Stop button stay on screen even on small phones.
  const ringSize = showControlsGuide ? 260 : 300;
  const roundsLabel =
    state.totalRounds > 1
      ? t('timer.round', {
          current: Math.min(state.currentRound, state.totalRounds),
          total: state.totalRounds === Infinity ? '∞' : String(state.totalRounds),
        })
      : '';

  const onStop = async () => {
    const ok = await confirmAsync({
      title: t('timer.stopConfirm.title'),
      message: t('timer.stopConfirm.message'),
      confirmLabel: t('timer.stopConfirm.confirm'),
      destructive: true,
    });
    if (!ok) return;
    await stop();
    router.replace('/');
  };

  const onExit = async () => {
    if (Platform.OS === 'web') {
      // On web there are no background notifications — leaving would orphan
      // an invisible timer, so stop it (with confirm).
      await onStop();
      return;
    }
    // Native: background scheduling IS the design — leave the screen and
    // the timer keeps running; the next-stage notification still fires.
    router.back();
  };

  if (status === 'idle' || status === 'stopped') return null;

  const pulseStyle = {
    opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 0.55] }),
    transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.04] }) }],
  };

  return (
    <ThemedView style={styles.container}>
      {/* stage-colored background wash */}
      <Animated.View style={[styles.bgWash, { backgroundColor: bgColor }]} />

      <SafeAreaView style={styles.safeArea}>
        {/* top bar: exit + preset name */}
        <View style={styles.topBar}>
          <Pressable
            style={[styles.exitBtn, { backgroundColor: theme.backgroundElement }]}
            onPress={() => void onExit()}
            hitSlop={12}
            accessibilityLabel={t('timer.exitLabel')}
          >
            <Ionicons name="close" size={20} color={theme.text} />
          </Pressable>
          <View style={styles.topBarSpacer} />
        </View>

        {/* progress ring */}
        <ProgressRing
          progress={ringProgress}
          size={ringSize}
          strokeWidth={14}
          gradient={stageColor.gradient}
          trackColor={theme.backgroundElement}
        >
          <ThemedText type="title" style={styles.stageName}>
            {stage?.name ?? '—'}
          </ThemedText>
          <Animated.Text
            style={[styles.countdown, { color: theme.text, fontVariant: ['tabular-nums'] }, pulseStyle]}
          >
            {formatMs(state.remainingMs)}
          </Animated.Text>
          {roundsLabel ? (
            <ThemedText type="small" themeColor="textSecondary" style={styles.roundLabel}>
              {roundsLabel}
            </ThemedText>
          ) : null}
        </ProgressRing>

        {/* stage strip */}
        <StagePill
          stages={state.session?.stagesSnapshot ?? []}
          currentIndex={state.currentStageIndex}
          isDark={isDark}
        />

        {/* controls */}
        <View style={styles.controls}>
          <Pressable
            style={[styles.ctrlBtn, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}
            onPress={isRunning ? pause : resume}
            accessibilityLabel={isRunning ? t('timer.pause') : t('timer.resume')}
          >
            <Ionicons name={isRunning ? 'pause' : 'play'} size={30} color={isRunning ? theme.text : accent} />
            <Text style={[styles.ctrlLabel, { color: theme.textSecondary }]}>
              {isRunning ? t('timer.pause') : t('timer.resume')}
            </Text>
          </Pressable>
          <Pressable
            style={[styles.ctrlBtn, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}
            onPress={skip}
            accessibilityLabel={t('timer.skip')}
          >
            <Ionicons name="play-skip-forward" size={30} color={accent} />
            <Text style={[styles.ctrlLabel, { color: theme.textSecondary }]}>{t('timer.skip')}</Text>
          </Pressable>
        </View>

        {/* First-run guide: controls + "leaving does NOT stop the timer" */}
        {showControlsGuide ? (
          <GuideTooltip
            title={t('guide.timerTitle')}
            body={t('guide.timerBody')}
            actionLabel={t('guide.gotIt')}
            skipLabel={t('guide.skip')}
            onDone={() => complete('timer-controls')}
            onSkip={() => complete('timer-controls')}
            compact
            style={styles.guideTip}
          />
        ) : null}

        <Pressable style={styles.stopBtn} onPress={() => void onStop()} accessibilityLabel={t('timer.stop')}>
          <Ionicons name="stop" size={16} color={theme.danger} />
          <Text style={[styles.stopLabel, { color: theme.danger }]}>{t('timer.stop')}</Text>
        </Pressable>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  bgWash: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  safeArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 20,
  },
  topBar: {
    position: 'absolute',
    top: 8,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  exitBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(128,128,128,0.2)',
  },
  topBarSpacer: {
    width: 44,
  },
  stageName: {
    fontSize: Typography.title,
    fontWeight: '700',
    marginBottom: 4,
  },
  countdown: {
    fontSize: 84,
    fontWeight: '200',
    lineHeight: 96,
    textAlign: 'center',
  },
  roundLabel: {
    letterSpacing: 1,
    marginTop: 2,
  },
  controls: {
    flexDirection: 'row',
    gap: 24,
    marginTop: 8,
  },
  ctrlBtn: {
    width: 104,
    height: 104,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderWidth: 1,
  },
  ctrlLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  stopBtn: {
    marginTop: 4,
    paddingHorizontal: 24,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stopLabel: {
    fontWeight: '700',
    fontSize: 16,
  },
  guideTip: {
    alignSelf: 'center',
    maxWidth: 340,
    width: '100%',
    marginTop: 4,
  },
});
