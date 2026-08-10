/**
 * ActionMenu — a small cross-platform action sheet (Modal).
 *
 * Replaces Alert.alert for the Home long-press menu: Alert is a no-op on
 * react-native-web, so a native-only menu was a dead-end there. This modal
 * renders tap-able actions on every platform.
 */
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { Radius } from '@/constants/theme';

export interface ActionMenuItem {
  text: string;
  destructive?: boolean;
  onPress: () => void;
}

interface ActionMenuProps {
  visible: boolean;
  title?: string;
  items: ActionMenuItem[];
  onClose: () => void;
}

export function ActionMenu({ visible, title, items, onClose }: ActionMenuProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  if (!visible) return null;

  return (
    <Modal transparent visible animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel={t('menu.closeLabel')}>
        {/* Inner Pressable swallows touches so tapping the card does not close it. */}
        <Pressable style={[styles.card, { backgroundColor: theme.background }]} onPress={() => {}}>
          {title ? (
            <ThemedText type="smallBold" themeColor="textSecondary" style={styles.title}>
              {title}
            </ThemedText>
          ) : null}
          {items.map((item) => (
            <Pressable
              key={item.text}
              style={({ pressed }) => [
                styles.item,
                { backgroundColor: theme.surfaceElevated },
                pressed && styles.itemPressed,
              ]}
              onPress={() => {
                onClose();
                item.onPress();
              }}
            >
              <ThemedText
                style={{
                  color: item.destructive ? '#e5484d' : theme.text,
                  fontWeight: '600',
                  fontSize: 16,
                }}
              >
                {item.text}
              </ThemedText>
            </Pressable>
          ))}
          <Pressable style={styles.item} onPress={onClose}>
            <ThemedText themeColor="textSecondary" style={{ fontWeight: '600', fontSize: 16 }}>
              {t('common.cancel')}
            </ThemedText>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
    padding: 16,
  },
  card: {
    borderRadius: Radius.lg,
    padding: 10,
    gap: 8,
    maxWidth: 520,
    width: '100%',
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
  },
  title: {
    paddingHorizontal: 6,
    paddingTop: 4,
    paddingBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  item: {
    borderRadius: Radius.md,
    paddingVertical: 15,
    alignItems: 'center',
  },
  itemPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.98 }],
  },
});
