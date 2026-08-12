import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { Stack, usePathname, useRouter } from 'expo-router';
import { useColorScheme } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useEffect, useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import i18n, { resolveLanguage } from '@/i18n';

import { RecoveryDialog } from '@/components/recovery-dialog';
import { CompletionDialog } from '@/components/completion-dialog';
import { FgsDialog } from '@/components/fgs-dialog';
import { DialogHost } from '@/components/confirm';
import { useBootstrap } from '@/hooks/use-bootstrap';
import { FeedbackCoordinator } from '@/features/feedback/feedback-coordinator';
import {
  handleColdStartResponse,
  subscribeNotificationActions,
} from '@/features/feedback/notification-actions';
import { subscribeWidgetInteraction } from '@/features/widget/widget-interaction';
import { subscribeMissedRateHigh } from '@/features/background/fgs-trigger';
import { useRoutineStore } from '@/features/routine/routine-store';
import { useGoalsStore } from '@/features/goals/goals-store';
import { useTimerStore } from '@/features/timer/timer-store';
import { useSettingsStore } from '@/features/settings/settings-store';
import { adManager, notifications } from '@/platform';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const themeMode = useSettingsStore((s) => s.settings.themeMode);
  // Effective dark: explicit user choice wins; 'system' follows the OS.
  const effectiveDark = themeMode === 'system' ? colorScheme === 'dark' : themeMode === 'dark';
  const { t } = useTranslation();
  const ready = useBootstrap();
  const coordinatorRef = useRef<FeedbackCoordinator | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  const soundEnabled = useSettingsStore((s) => s.settings.soundEnabled);
  const vibrationEnabled = useSettingsStore((s) => s.settings.vibrationEnabled);
  const voiceEnabled = useSettingsStore((s) => s.settings.voiceEnabled);
  const language = useSettingsStore((s) => s.settings.language);
  const onboardingDone = useSettingsStore((s) => s.settings.onboardingDone);
  const fgsDismissed = useSettingsStore((s) => s.settings.fgsDialogDismissed);
  const [fgsVisible, setFgsVisible] = useState(false);

  // First-launch onboarding (v1.2, spec: onboarding) — redirect once settings
  // are loaded and the user hasn't completed/skipped it yet. Skip the redirect
  // while already on the onboarding route to avoid a replace loop.
  useEffect(() => {
    if (!ready) return;
    if (onboardingDone) return;
    if (pathname === '/onboarding') return;
    router.replace('/onboarding');
  }, [ready, onboardingDone, pathname, router]);

  // Attach the feedback coordinator once the engine exists.
  useEffect(() => {
    if (!ready) return;
    if (coordinatorRef.current) return;
    const engine = useTimerStore.getState().engine;
    const settings = useSettingsStore.getState().settings;
    const coordinator = new FeedbackCoordinator(engine, settings);
    coordinator.attach();
    coordinatorRef.current = coordinator;

    // App Open ad on cold start when there is no active session (spec:
    // monetization placement). Web manager is a no-op.
    const status = useTimerStore.getState().state.status;
    if (adManager.canShowAppOpen(true, status === 'running' || status === 'paused', Date.now())) {
      void adManager.showAppOpen();
    }
  }, [ready]);

  // Keep coordinator settings in sync.
  useEffect(() => {
    if (!coordinatorRef.current) return;
    const settings = useSettingsStore.getState().settings;
    coordinatorRef.current.updateSettings(settings);
  }, [ready, soundEnabled, vibrationEnabled, voiceEnabled]);

  // Apply the persisted language once settings are loaded + on changes.
  useEffect(() => {
    if (!ready) return;
    void i18n.changeLanguage(resolveLanguage(language));
  }, [ready, language]);

  // Notification actions (Pause/Skip/Stop) — route taps through the shared
  // handler (hydrates on cold start, reconciles, navigates).
  useEffect(() => {
    if (!ready) return;
    return subscribeNotificationActions((path) => {
      if (path !== usePathname()) router.push(path as '/timer' | '/');
    });
  }, [ready, router]);

  // Cold start: if the app was opened from a notification action while killed,
  // apply it once after hydration.
  useEffect(() => {
    if (!ready) return;
    void handleColdStartResponse((path) => {
      if (path !== usePathname()) router.replace(path as '/timer' | '/');
    });
  }, [ready, router]);

  // Home-widget interactions (v1.4, spec: android-widget R2) — idle "Start"
  // button quick-starts the suggested preset (no-op on web/Expo Go).
  useEffect(() => {
    if (!ready) return;
    return subscribeWidgetInteraction((path) => {
      if (path !== usePathname()) router.push(path as '/timer' | '/');
    });
  }, [ready, router]);

  // FGS "Keep timer alive" opt-in (once, unless dismissed).
  useEffect(() => {
    if (!ready || fgsDismissed) return;
    return subscribeMissedRateHigh(() => setFgsVisible(true));
  }, [ready, fgsDismissed]);

  // Re-register action labels when the UI language changes.
  useEffect(() => {
    if (!ready) return;
    void notifications.registerActionCategories({
      pause: i18n.t('notif.actionPause'),
      skip: i18n.t('notif.actionSkip'),
      stop: i18n.t('notif.actionStop'),
      reminderStart: i18n.t('notif.actionStart'),
      reminderSnooze5: i18n.t('routine.snooze5'),
      reminderSnooze10: i18n.t('routine.snooze10'),
      reminderDismiss: i18n.t('notif.actionDismiss'),
    });
  }, [ready, i18n.language]);

  // Load routine schedules once (reminders must be scheduled after boot).
  useEffect(() => {
    if (!ready) return;
    void useRoutineStore.getState().load().then(() => useRoutineStore.getState().rescheduleAll());
  }, [ready]);

  // Load the weekly goal once — the completion dialog reads it to show
  // week progress without flashing "0/N" before hydration.
  useEffect(() => {
    if (!ready) return;
    void useGoalsStore.getState().load();
  }, [ready]);

  // Load the Ionicons font. On web @expo/vector-icons does NOT auto-register
  // its fonts (no @font-face injected) so icons would render as boxes; on
  // native this is an idempotent no-op. Icon font is cosmetic — never let a
  // font failure reject unhandled or break startup.
  useEffect(() => {
    Ionicons.loadFont().catch(() => {});
  }, []);

  return (
    <ThemeProvider value={effectiveDark ? DarkTheme : DefaultTheme}>
      <Stack
        screenOptions={{
          headerShown: true,
          headerBackTitle: t('nav.back'),
        }}
      >
        <Stack.Screen name="index" options={{ title: t('nav.homeTitle') }} />
        <Stack.Screen name="preset/[id]" options={{ title: t('nav.editorTitle') }} />
        <Stack.Screen name="timer" options={{ title: 'Timer', headerShown: false }} />
        <Stack.Screen name="stats" options={{ title: t('nav.statsTitle') }} />
        <Stack.Screen name="settings" options={{ title: t('nav.settingsTitle') }} />
        <Stack.Screen name="onboarding" options={{ title: 'Onboarding', headerShown: false }} />
        <Stack.Screen name="routine" options={{ title: t('routine.title') }} />
        <Stack.Screen name="routine/[id]" options={{ title: t('routine.edit') }} />
        <Stack.Screen name="templates" options={{ title: t('templates.title') }} />
      </Stack>
      <RecoveryDialog />
      <CompletionDialog />
      <FgsDialog visible={fgsVisible} onClose={() => setFgsVisible(false)} />
      <DialogHost />
    </ThemeProvider>
  );
}
