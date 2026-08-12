/**
 * Custom sounds manager (spec: custom sounds) — reached from Settings when
 * the 24h rewarded unlock is live. Lets the user import their own audio file
 * (system file picker), preview it, and delete it. Import is gated by the
 * unlock; playback of imported files is permanent (product decision).
 */
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useFocusEffect, useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useCallback, useState } from 'react';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AppCard } from '@/components/app-card';
import { GradientButton } from '@/components/gradient-button';
import { confirmAsync, alertAsync } from '@/components/confirm';
import { useTheme } from '@/hooks/use-theme';
import { useUserSoundsStore } from '@/features/sounds/user-sounds-store';
import { pickAudioFile } from '@/features/sounds/import-sound';
import {
  formatUnlockRemaining,
  getUnlockExpiry,
  watchAdForUnlock,
} from '@/features/monetization/rewarded-unlock';
import { remoteConfig, audio } from '@/platform';
import { Radius } from '@/constants/theme';

export default function CustomSoundsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { t } = useTranslation();
  const sounds = useUserSoundsStore((s) => s.sounds);
  const [importing, setImporting] = useState(false);
  const [unlockExpiry, setUnlockExpiry] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);
  const [watching, setWatching] = useState(false);

  // Keep the list fresh when returning from the file picker + re-check the
  // unlock (it may have expired while the app was backgrounded).
  useFocusEffect(
    useCallback(() => {
      void useUserSoundsStore.getState().load();
      void getUnlockExpiry().then((exp) => {
        setUnlockExpiry(exp);
        setChecked(true);
      });
    }, []),
  );

  // Import is gated by the rewarded 24h unlock (spec: monetization). If the
  // unlock expired since Settings navigated here, fall back to the watch-ad
  // CTA instead of silently allowing an import. `checked` avoids flashing the
  // wrong CTA while the expiry is being read.
  const unlocked = checked && unlockExpiry !== null;

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

  const onAdd = async () => {
    if (importing) return;
    setImporting(true);
    try {
      const imported = await pickAudioFile();
      if (!imported) return;
      await useUserSoundsStore.getState().add(imported);
      alertAsync(t('sound.imported', { name: imported.label }), '');
    } catch {
      alertAsync(t('sound.importFail'), '');
    } finally {
      setImporting(false);
    }
  };

  const onRemove = async (id: string) => {
    const ok = await confirmAsync({
      title: t('customSounds.deleteConfirm'),
      message: '',
      confirmLabel: t('common.delete'),
      destructive: true,
    });
    if (ok) await useUserSoundsStore.getState().remove(id);
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <AppCard style={styles.card}>
          <View style={styles.hero}>
            <Ionicons name="musical-notes-outline" size={22} color={theme.textSecondary} />
            <ThemedText type="small" themeColor="textSecondary" style={styles.heroText}>
              {t('customSounds.hint')}
            </ThemedText>
          </View>
          {!checked ? null : unlocked ? (
            <GradientButton
              label={importing ? t('customSounds.importing') : t('customSounds.add')}
              icon="add-circle-outline"
              onPress={() => void onAdd()}
              disabled={importing}
            />
          ) : (
            <GradientButton
              label={watching ? t('customSounds.importing') : t('settings.customSoundLocked')}
              icon="lock-closed-outline"
              onPress={() => void onWatchAd()}
              disabled={watching}
            />
          )}
          {/* Keep the hero card height stable while the expiry check loads. */}
          {!checked ? <View style={styles.spacer} /> : null}
          {unlocked && (
            <ThemedText type="small" themeColor="textSecondary" style={styles.unlockNote}>
              {t('settings.customSoundUnlocked', { time: formatUnlockRemaining(unlockExpiry as number) })}
            </ThemedText>
          )}
        </AppCard>

        <View style={styles.group}>
          <ThemedText type="smallBold" themeColor="textSecondary" style={styles.groupLabel}>
            {t('customSounds.section')}
          </ThemedText>
          {sounds.length === 0 ? (
            <AppCard style={styles.card}>
              <ThemedText type="small" themeColor="textSecondary" style={styles.empty}>
                {t('customSounds.empty')}
              </ThemedText>
            </AppCard>
          ) : (
            sounds.map((s) => (
              <AppCard key={s.id} style={styles.card}>
                <View style={styles.row}>
                  <View style={[styles.iconWrap, { backgroundColor: theme.backgroundSelected }]}>
                    <Ionicons name="musical-note-outline" size={18} color={theme.textSecondary} />
                  </View>
                  <ThemedText style={styles.label} numberOfLines={1}>
                    {s.label}
                  </ThemedText>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t('customSounds.preview')}
                    onPress={() => void audio.play(s.id)}
                    style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
                  >
                    <Ionicons name="play-circle-outline" size={26} color={theme.textSecondary} />
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t('customSounds.delete')}
                    onPress={() => void onRemove(s.id)}
                    style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
                  >
                    <Ionicons name="trash-outline" size={20} color={theme.danger} />
                  </Pressable>
                </View>
              </AppCard>
            ))
          )}
        </View>

        <Pressable
          accessibilityRole="button"
          style={({ pressed }) => [styles.backRow, pressed && styles.pressed]}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back-outline" size={18} color={theme.textSecondary} />
          <ThemedText type="small" themeColor="textSecondary">
            {t('common.back')}
          </ThemedText>
        </Pressable>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, gap: 20, paddingBottom: 48 },
  card: { padding: 16, borderRadius: Radius.lg },
  hero: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  heroText: { flex: 1 },
  group: { gap: 8 },
  groupLabel: { paddingHorizontal: 4 },
  empty: { textAlign: 'center', paddingVertical: 8 },
  unlockNote: { marginTop: 10, textAlign: 'center' },
  spacer: { height: 48 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { flex: 1, fontSize: 15 },
  iconBtn: { padding: 4 },
  pressed: { opacity: 0.6 },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'center',
    paddingVertical: 8,
  },
});
