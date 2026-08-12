import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import { Linking, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import * as Application from 'expo-application';
import * as WebBrowser from 'expo-web-browser';
import { useFocusEffect, useRouter } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AppCard } from '@/components/app-card';
import { AppSwitch } from '@/components/app-switch';
import { ActionMenu } from '@/components/action-menu';
import { SegmentedControl } from '@/components/segmented-control';
import { GradientButton } from '@/components/gradient-button';
import { alertAsync } from '@/components/confirm';
import { useSettingsStore } from '@/features/settings/settings-store';
import { useGoalsStore } from '@/features/goals/goals-store';
import { useGuides } from '@/hooks/use-guides';
import { GuideTooltip } from '@/components/guide/guide-tooltip';
import { createGoalId, weekKey } from '@/features/goals/weekly-goals';
import { usePresetsStore } from '@/features/presets/presets-store';
import { formatUnlockRemaining, getUnlockExpiry, watchAdForUnlock } from '@/features/monetization/rewarded-unlock';
import { useTheme } from '@/hooks/use-theme';
import { openExactAlarmSettings } from '@/features/background/permissions';
import { adManager, consent, notifications, remoteConfig, scheduler } from '@/platform';
import { BrandGradient, Radius } from '@/constants/theme';
import { LANGUAGE_OPTIONS } from '@/i18n';
import type { LanguageSetting } from '@/core/storage/repos';

const PRIVACY_URL = 'https://example.com/privacy';
const STORE_URL = 'https://example.com/store';

export default function SettingsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { t } = useTranslation();
  const settings = useSettingsStore((s) => s.settings);
  const set = useSettingsStore((s) => s.set);
  const [languageMenu, setLanguageMenu] = useState(false);

  // One-time explainer above the permissions section (why + what to do).
  const { isSeen, complete } = useGuides();
  const onboardingDone = settings.onboardingDone;

  // Weekly goal (v1.5, spec: weekly-goals) — section form state.
  const goal = useGoalsStore((s) => s.goal);
  const userPresets = usePresetsStore((s) => s.presets);
  const [goalTarget, setGoalTarget] = useState(3);
  const [goalCustom, setGoalCustom] = useState('');
  const [goalCustomMode, setGoalCustomMode] = useState(false);
  const [goalPresetId, setGoalPresetId] = useState<string | null>(null); // null = all routines
  const [goalMenu, setGoalMenu] = useState(false);
  const [goalSaving, setGoalSaving] = useState(false);

  // Reflect the persisted goal into the form when it loads/changes.
  useEffect(() => {
    if (!goal) return;
    setGoalTarget(goal.targetSessions);
    setGoalCustom(String(goal.targetSessions));
    setGoalCustomMode(false);
    setGoalPresetId(goal.presetId ?? null);
  }, [goal]);

  const effectiveTarget = Math.max(
    1,
    Math.min(99, Math.round(goalCustomMode ? Number(goalCustom) || 1 : goalTarget)),
  );

  const onSaveGoal = async () => {
    if (goalSaving) return;
    setGoalSaving(true);
    try {
      await useGoalsStore.getState().saveGoal({
        id: goal?.id ?? createGoalId(),
        presetId: goalPresetId,
        targetSessions: effectiveTarget,
        weekStart: weekKey(Date.now()),
        schemaVersion: 1,
      });
    } finally {
      setGoalSaving(false);
    }
  };

  // Permission status (spec: permissions — visible state + open system settings).
  // Refreshed on every focus so returning from the system settings screen
  // (exact alarms / notification settings) updates the row immediately.
  const [notifStatus, setNotifStatus] = useState<'granted' | 'denied' | 'undetermined'>('undetermined');
  const [alarmExact, setAlarmExact] = useState(false);

  const refreshPermissions = useCallback(() => {
    void (async () => {
      const [status, exact] = await Promise.all([
        notifications.getPermissionStatus(),
        scheduler.canScheduleExactAlarm(),
      ]);
      setNotifStatus(status);
      setAlarmExact(exact);
    })();
  }, []);
  useFocusEffect(refreshPermissions);

  const notifStatusLabel =
    notifStatus === 'granted'
      ? t('settings.statusGranted')
      : notifStatus === 'denied'
        ? t('settings.statusDenied')
        : t('settings.statusUnknown');

  // Rewarded unlock state (spec: monetization — 24h temporary unlock).
  const [unlockExpiry, setUnlockExpiry] = useState<number | null>(null);
  const [watching, setWatching] = useState(false);

  useEffect(() => {
    let mounted = true;
    void getUnlockExpiry().then((expiry) => {
      if (mounted) setUnlockExpiry(expiry);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const onWatchAd = async () => {
    if (watching) return;
    setWatching(true);
    try {
      const hours = remoteConfig.getNumber('custom_sound_unlock_hours') || 24;
      const ok = await watchAdForUnlock(hours);
      if (ok) {
        const expiry = await getUnlockExpiry();
        setUnlockExpiry(expiry);
        alertAsync(t('reward.unlockOk'), '');
      } else {
        alertAsync(t('reward.unlockFail'), '');
      }
    } finally {
      setWatching(false);
    }
  };

  // UMP privacy options (GDPR/CCPA). The form only exists once consent info
  // has been gathered — do it here (idempotent) and surface a friendly
  // message when the form is unavailable (wrong region / still loading).
  const onPrivacyOptions = async () => {
    try {
      await consent.gatherConsent();
      const shown = await consent.showPrivacyOptionsForm();
      if (!shown) {
        alertAsync(t('settings.privacyUnavailable'), t('settings.privacyUnavailableBody'));
      }
    } catch {
      alertAsync(t('settings.privacyUnavailable'), t('settings.privacyUnavailableBody'));
    }
  };

  const version = Application.nativeApplicationVersion ?? '1.0.0';

  const openUrl = async (url: string) => {
    await WebBrowser.openBrowserAsync(url).catch(() => alertAsync(t('settings.cannotOpenLink'), ''));
  };

  const currentLanguageLabel =
    LANGUAGE_OPTIONS.find((o) => o.value === settings.language)?.labelKey ?? 'settings.languageSystem';

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.group}>
          <ThemedText type="smallBold" themeColor="textSecondary" style={styles.groupLabel}>
            {t('settings.soundVibration')}
          </ThemedText>
          <AppCard style={styles.card}>
            <Row
              icon="volume-high-outline"
              label={t('settings.sound')}
              control={
                <AppSwitch value={settings.soundEnabled} onValueChange={(v) => void set({ soundEnabled: v })} />
              }
            />
            <Row
              icon="phone-portrait-outline"
              label={t('settings.vibration')}
              control={
                <AppSwitch
                  value={settings.vibrationEnabled}
                  onValueChange={(v) => void set({ vibrationEnabled: v })}
                />
              }
            />
            <Row
              icon="mic-outline"
              label={t('settings.voice')}
              last
              control={
                <AppSwitch value={settings.voiceEnabled} onValueChange={(v) => void set({ voiceEnabled: v })} />
              }
            />
          </AppCard>
        </View>

        <View style={styles.group}>
          <ThemedText type="smallBold" themeColor="textSecondary" style={styles.groupLabel}>
            {t('settings.scheduleSection')}
          </ThemedText>
          <AppCard style={styles.card}>
            <Row
              icon="calendar-outline"
              label={t('routine.title')}
              value={t('routine.add')}
              last
              onPress={() => router.push('/routine')}
            />
          </AppCard>
        </View>

        <View style={styles.group}>
          <ThemedText type="smallBold" themeColor="textSecondary" style={styles.groupLabel}>
            {t('settings.display')}
          </ThemedText>
          <AppCard style={styles.card}>
            <Row
              icon="sunny-outline"
              label={t('settings.keepAwake')}
              control={
                <AppSwitch
                  value={settings.wakeLockEnabled}
                  onValueChange={(v) => void set({ wakeLockEnabled: v })}
                />
              }
            />
            {/* Theme picker — 3-way (System / Light / Dark). Previously a dead
                toggle: themeMode was stored but never applied anywhere. */}
            <View style={styles.themeBlock}>
              <View style={styles.themeLabelRow}>
                <View style={[styles.iconWrap, { backgroundColor: theme.backgroundSelected }]}>
                  <Ionicons name="contrast-outline" size={18} color={theme.textSecondary} />
                </View>
                <ThemedText style={styles.rowLabel}>{t('settings.theme')}</ThemedText>
              </View>
              <SegmentedControl
                options={[
                  { label: t('settings.themeSystem'), value: 'system' },
                  { label: t('settings.themeLight'), value: 'light' },
                  { label: t('settings.themeDark'), value: 'dark' },
                ]}
                value={settings.themeMode}
                onChange={(v) => void set({ themeMode: v })}
              />
            </View>
          </AppCard>
        </View>

        <View style={styles.group}>
          <ThemedText type="smallBold" themeColor="textSecondary" style={styles.groupLabel}>
            {t('settings.languageSection')}
          </ThemedText>
          <AppCard style={styles.card}>
            <Row
              icon="language-outline"
              label={t('settings.language')}
              value={t(currentLanguageLabel)}
              last
              onPress={() => setLanguageMenu(true)}
            />
          </AppCard>
        </View>

        <View style={styles.group}>
          <ThemedText type="smallBold" themeColor="textSecondary" style={styles.groupLabel}>
            {t('goals.title')}
          </ThemedText>
          <AppCard style={styles.card}>
            <Row
              icon="flag-outline"
              label={t('goals.title')}
              value={goal ? t('goals.goalSet', { target: goal.targetSessions }) : t('goals.notSet')}
            />
            <View style={styles.goalChipsRow}>
              {[3, 5, 7].map((n) => {
                const active = !goalCustomMode && goalTarget === n;
                return (
                  <Pressable
                    key={n}
                    accessibilityRole="button"
                    onPress={() => {
                      setGoalTarget(n);
                      setGoalCustomMode(false);
                    }}
                    style={[
                      styles.goalChip,
                      {
                        backgroundColor: active ? BrandGradient[0] : theme.backgroundSelected,
                        borderColor: active ? BrandGradient[0] : theme.border,
                      },
                    ]}
                  >
                    <ThemedText
                      type="small"
                      style={{ color: active ? '#FFFFFF' : theme.textSecondary, fontWeight: '700' }}
                    >
                      {n}
                    </ThemedText>
                  </Pressable>
                );
              })}
              <Pressable
                accessibilityRole="button"
                onPress={() => setGoalCustomMode(true)}
                style={[
                  styles.goalChip,
                  {
                    backgroundColor: goalCustomMode ? BrandGradient[0] : theme.backgroundSelected,
                    borderColor: goalCustomMode ? BrandGradient[0] : theme.border,
                  },
                ]}
              >
                <ThemedText
                  type="small"
                  style={{ color: goalCustomMode ? '#FFFFFF' : theme.textSecondary, fontWeight: '700' }}
                >
                  {t('goals.custom')}
                </ThemedText>
              </Pressable>
            </View>
            {goalCustomMode ? (
              <TextInput
                value={goalCustom}
                onChangeText={setGoalCustom}
                keyboardType="number-pad"
                placeholder="1–99"
                placeholderTextColor={theme.textSecondary}
                style={[
                  styles.goalInput,
                  { backgroundColor: theme.backgroundSelected, color: theme.text, borderColor: theme.border },
                ]}
              />
            ) : null}
            <Row
              icon="list-outline"
              label={t('goals.choosePreset')}
              value={
                goalPresetId
                  ? (userPresets.find((p) => p.id === goalPresetId)?.name ?? t('goals.forAll'))
                  : t('goals.forAll')
              }
              last
              onPress={() => setGoalMenu(true)}
            />
            <GradientButton
              label={t('goals.save')}
              icon="checkmark"
              onPress={() => void onSaveGoal()}
              disabled={goalSaving}
            />
          </AppCard>
        </View>

        {adManager.supported ? (
          <View style={styles.group}>
            <ThemedText type="smallBold" themeColor="textSecondary" style={styles.groupLabel}>
              {t('settings.soundPacksSection')}
            </ThemedText>
            <AppCard style={styles.card}>
              <Row
                icon={unlockExpiry ? 'checkmark-circle-outline' : 'lock-closed-outline'}
                label={t('settings.customSound')}
                value={
                  unlockExpiry
                    ? t('settings.customSoundUnlocked', { time: formatUnlockRemaining(unlockExpiry) })
                    : t('settings.customSoundLocked')
                }
                // Locked → watch the ad to unlock; unlocked → manage your
                // imported sound files (spec: custom sounds).
                onPress={unlockExpiry ? () => router.push('/custom-sounds') : () => void onWatchAd()}
              />
              {/* UMP privacy options (GDPR/CCPA) — spec: policy */}
              <Row
                icon="shield-half-outline"
                label={t('settings.privacyOptions')}
                last
                onPress={() => void onPrivacyOptions()}
              />
            </AppCard>
          </View>
        ) : null}

        {Platform.OS !== 'web' && (
          <View style={styles.group}>
            <ThemedText type="smallBold" themeColor="textSecondary" style={styles.groupLabel}>
              {t('settings.permissionsSection')}
            </ThemedText>
            {onboardingDone && !isSeen('settings-permissions') ? (
              <GuideTooltip
                title={t('guide.settingsTitle')}
                body={t('guide.settingsBody')}
                actionLabel={t('guide.gotIt')}
                skipLabel={t('guide.skip')}
                onDone={() => complete('settings-permissions')}
                onSkip={() => complete('settings-permissions')}
              />
            ) : null}
            <AppCard style={styles.card}>
              <Row
                icon="notifications-outline"
                label={t('settings.notificationStatus')}
                value={notifStatusLabel}
                last={Platform.OS !== 'android'}
                onPress={() => void Linking.openSettings()}
              />
              {Platform.OS === 'android' && (
                <Row
                  icon="alarm-outline"
                  label={t('settings.alarmStatus')}
                  value={alarmExact ? t('settings.alarmExact') : t('settings.alarmInexact')}
                  last
                  // Always tappable: opens the system "Alarms & reminders"
                  // screen. Harmless when already granted, and the only way
                  // to grant/revoke the special access. Marks the once-per-
                  // install flag so the just-in-time prompt on first Start
                  // does NOT re-open this screen (shared with permissions.ts).
                  // Status refreshes on focus (see refreshPermissions above).
                  onPress={() => void openExactAlarmSettings().catch(() => {})}
                />
              )}
            </AppCard>
          </View>
        )}

        <View style={styles.group}>
          <ThemedText type="smallBold" themeColor="textSecondary" style={styles.groupLabel}>
            {t('settings.info')}
          </ThemedText>
          <AppCard style={styles.card}>
            <Row
              icon="information-circle-outline"
              label={t('settings.about')}
              value={`v${version}`}
              onPress={() => alertAsync('LoopTimer', t('settings.aboutBody', { version }))}
            />
            <Row
              icon="shield-checkmark-outline"
              label={t('settings.privacy')}
              onPress={() => void openUrl(PRIVACY_URL)}
            />
            <Row icon="star-outline" label={t('settings.rate')} onPress={() => void openUrl(STORE_URL)} />
            <Row icon="arrow-back-outline" label={t('common.back')} last onPress={() => router.back()} />
          </AppCard>
        </View>
      </ScrollView>

      {/* Weekly goal scope picker (cross-platform menu) */}
      <ActionMenu
        visible={goalMenu}
        title={t('goals.choosePreset')}
        items={[
          {
            text: t('goals.forAll'),
            onPress: () => setGoalPresetId(null),
          },
          ...userPresets.map((p) => ({
            text: p.name,
            onPress: () => setGoalPresetId(p.id),
          })),
        ]}
        onClose={() => setGoalMenu(false)}
      />

      {/* Language picker (cross-platform menu) */}
      <ActionMenu
        visible={languageMenu}
        title={t('settings.language')}
        items={LANGUAGE_OPTIONS.map((opt) => ({
          text: t(opt.labelKey),
          onPress: () => void set({ language: opt.value as LanguageSetting }),
        }))}
        onClose={() => setLanguageMenu(false)}
      />
    </ThemedView>
  );
}

function Row({
  icon,
  label,
  value,
  control,
  onPress,
  last,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
  control?: React.ReactNode;
  onPress?: () => void;
  last?: boolean;
}) {
  const theme = useTheme();
  const tappable = !!onPress;
  return (
    <Pressable
      style={({ pressed }) => [
        styles.row,
        !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border },
        pressed && tappable && styles.rowPressed,
      ]}
      onPress={onPress}
      disabled={!tappable}
    >
      <View style={[styles.iconWrap, { backgroundColor: theme.backgroundSelected }]}>
        <Ionicons name={icon} size={18} color={theme.textSecondary} />
      </View>
      <ThemedText style={styles.rowLabel}>{label}</ThemedText>
      {value ? (
        <ThemedText type="small" themeColor="textSecondary" numberOfLines={1} style={styles.rowValue}>
          {value}
        </ThemedText>
      ) : null}
      {control}
      {/* Chevron affordance on tappable rows — makes disabled rows obvious. */}
      {tappable && !control ? <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, gap: 24, paddingBottom: 48 },
  group: { gap: 8 },
  groupLabel: { paddingHorizontal: 4 },
  card: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: Radius.lg },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  rowPressed: { opacity: 0.6 },
  rowLabel: { flex: 1, fontSize: 15 },
  rowValue: { flexShrink: 1, textAlign: 'right' },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingVertical: 4,
  },
  goalChip: {
    minWidth: 44,
    height: 40,
    borderRadius: Radius.pill,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalInput: {
    borderRadius: Radius.md,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  themeBlock: { paddingVertical: 8, gap: 12 },
  themeLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
});
