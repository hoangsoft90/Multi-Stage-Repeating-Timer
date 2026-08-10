/**
 * ConfirmDialog — the app's own styled question/alert dialog.
 *
 * Replaces native `Alert.alert` and `window.confirm` (both of which are
 * dead or inconsistent on web): a single styled modal that renders
 * identically on web and native, matching the vibrant redesign.
 *
 * Modes:
 * - confirm: Hủy (secondary) + confirm (brand gradient, or danger gradient
 *   when `destructive`).
 * - alert: single "OK" button (informational).
 */
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/themed-text';
import { GradientButton } from '@/components/gradient-button';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Danger gradient for destructive confirms (reads clearly red). */
const DANGER_GRADIENT = ['#FF3B30', '#C0392B'] as const;

export interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  /** Single "OK" button — informational alert. */
  alertMode?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel,
  cancelLabel,
  destructive = false,
  alertMode = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const confirmText = confirmLabel ?? t('common.ok');
  const cancelText = cancelLabel ?? t('common.cancel');

  const icon = alertMode ? 'information-circle' : destructive ? 'alert-circle' : 'help-circle';
  const iconColor = alertMode ? theme.textSecondary : destructive ? '#FF3B30' : '#FF512F';
  const badgeBg = alertMode
    ? theme.backgroundSelected
    : destructive
      ? 'rgba(255,59,48,0.12)'
      : 'rgba(255,81,47,0.14)';

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onCancel}>
      <Pressable
        style={[styles.backdrop, { backgroundColor: theme.overlay }]}
        onPress={onCancel}
        accessibilityLabel={t('dialog.closeLabel')}
      >
        {/* Inner Pressable swallows touches so tapping the card does not close it. */}
        <Pressable style={[styles.card, { backgroundColor: theme.surface }]} onPress={() => {}}>
          <View style={[styles.badge, { backgroundColor: badgeBg }]}>
            <Ionicons name={icon} size={28} color={iconColor} />
          </View>
          <ThemedText style={styles.title}>{title}</ThemedText>
          {message ? (
            <ThemedText type="default" themeColor="textSecondary" style={styles.message}>
              {message}
            </ThemedText>
          ) : null}
          <View style={styles.actions}>
            {alertMode ? (
              <GradientButton label={confirmText} onPress={onConfirm} />
            ) : (
              <>
                <GradientButton label={cancelText} secondary onPress={onCancel} />
                <GradientButton
                  label={confirmText}
                  gradient={destructive ? DANGER_GRADIENT : undefined}
                  onPress={onConfirm}
                />
              </>
            )}
          </View>
        </Pressable>
      </Pressable>
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
    alignItems: 'center',
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 10,
  },
  badge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
  },
  message: {
    textAlign: 'center',
    lineHeight: 22,
  },
  actions: {
    width: '100%',
    gap: 8,
    marginTop: 6,
  },
});
