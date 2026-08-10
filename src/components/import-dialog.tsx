/**
 * Import preset dialog (v1.2, spec: preset-sharing) — paste a preset JSON
 * string to import it. Validates via `decodePreset`; shows success/error
 * feedback. Cross-platform (works on web where share/deep-link may be harder).
 */
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { GradientButton } from '@/components/gradient-button';
import { alertAsync } from '@/components/confirm';
import { usePresetsStore } from '@/features/presets/presets-store';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface ImportDialogProps {
  visible: boolean;
  onClose: () => void;
}

export function ImportDialog({ visible, onClose }: ImportDialogProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const [json, setJson] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const importPreset = usePresetsStore((s) => s.importPreset);

  const onImport = async () => {
    const result = await importPreset(json);
    if (result.ok) {
      // Spec: "dialog đóng kèm thông báo thành công" — close + alert.
      const name = result.name ?? '';
      setJson('');
      setMessage(null);
      onClose();
      alertAsync(t('import.success', { name }), '');
    } else {
      setMessage(t('import.invalid'));
    }
  };

  const close = () => {
    setJson('');
    setMessage(null);
    onClose();
  };

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={close}>
      <View style={[styles.backdrop, { backgroundColor: theme.overlay }]}>
        <ThemedView style={styles.card}>
          <ThemedText style={styles.title}>{t('import.title')}</ThemedText>
          <TextInput
            value={json}
            onChangeText={setJson}
            placeholder={t('import.placeholder')}
            placeholderTextColor={theme.textSecondary}
            multiline
            autoCapitalize="none"
            autoCorrect={false}
            style={[
              styles.input,
              {
                backgroundColor: theme.backgroundSelected,
                color: theme.text,
                borderColor: theme.border,
              },
            ]}
          />
          {message ? (
            <ThemedText type="small" themeColor="textSecondary">
              {message}
            </ThemedText>
          ) : null}
          <View style={styles.actions}>
            <GradientButton label={t('import.confirm')} icon="download-outline" onPress={() => void onImport()} disabled={!json.trim()} />
            <Pressable style={({ pressed }) => [styles.ghost, pressed && styles.ghostPressed]} onPress={close}>
              <ThemedText themeColor="textSecondary" style={styles.ghostLabel}>
                {t('common.cancel')}
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
    maxWidth: 440,
    gap: 14,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  input: {
    minHeight: 110,
    borderRadius: Radius.md,
    borderWidth: 1,
    padding: 12,
    fontSize: 13,
    fontFamily: 'monospace',
    textAlignVertical: 'top',
  },
  actions: {
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
