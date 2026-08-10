/**
 * FGS "Keep timer alive" opt-in dialog (spec: notification-cold-start R3) —
 * shown once when missed_transition_rate_high is observed and the user hasn't
 * dismissed it yet. Opens Settings so the user can enable the foreground
 * service (dev build). Never blocks the timer.
 */
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { GradientButton } from '@/components/gradient-button';
import { useSettingsStore } from '@/features/settings/settings-store';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface FgsDialogProps {
  visible: boolean;
  onClose: () => void;
}

export function FgsDialog({ visible, onClose }: FgsDialogProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const router = useRouter();

  if (!visible) return null;

  const dismiss = () => {
    void useSettingsStore.getState().set({ fgsDialogDismissed: true });
    onClose();
  };

  const openSettings = () => {
    void useSettingsStore.getState().set({ fgsDialogDismissed: true });
    onClose();
    router.push('/settings');
  };

  return (
    <Modal transparent visible animationType="fade" onRequestClose={dismiss}>
      <View style={[styles.backdrop, { backgroundColor: theme.overlay }]}>
        <ThemedView style={styles.card}>
          <View style={styles.header}>
            <Ionicons name="phone-portrait-outline" size={26} color="#FF512F" />
            <ThemedText type="subtitle" style={styles.title}>
              {t('fgs.title')}
            </ThemedText>
          </View>
          <ThemedText type="default" themeColor="textSecondary" style={styles.body}>
            {t('fgs.body')}
          </ThemedText>
          <View style={styles.actions}>
            <GradientButton label={t('fgs.openSettings')} icon="settings-outline" onPress={openSettings} />
            <Pressable style={({ pressed }) => [styles.ghost, pressed && styles.ghostPressed]} onPress={dismiss}>
              <ThemedText themeColor="textSecondary" style={styles.ghostLabel}>
                {t('fgs.later')}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  title: {
    flex: 1,
    fontSize: 20,
  },
  body: {
    lineHeight: 24,
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
