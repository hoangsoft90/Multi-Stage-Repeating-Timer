/**
 * Stepper — round − / + buttons with a numeric value between them
 * (stage duration seconds, fixed rounds, …).
 */
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/hooks/use-theme';

interface StepperProps {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  step?: number;
  /** Suffix shown after the number (e.g. 's'). */
  suffix?: string;
}

export function Stepper({ value, onChange, min = 1, max = 9999, step = 5, suffix }: StepperProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const dec = () => onChange(Math.max(min, value - step));
  const inc = () => onChange(Math.min(max, value + step));

  return (
    <View style={[styles.row, { backgroundColor: theme.backgroundElement }]}>
      <Pressable
        onPress={dec}
        disabled={value <= min}
        accessibilityRole="button"
        accessibilityLabel={t('stepper.decrease')}
        style={({ pressed }) => [styles.btn, pressed && styles.pressed]}
      >
        <Ionicons name="remove" size={18} color={value <= min ? theme.textSecondary : theme.text} />
      </Pressable>
      <View style={styles.valueWrap}>
        <Text style={[styles.value, { color: theme.text }]}>{value}</Text>
        {suffix ? <Text style={styles.suffix}>{suffix}</Text> : null}
      </View>
      <Pressable
        onPress={inc}
        disabled={value >= max}
        accessibilityRole="button"
        accessibilityLabel={t('stepper.increase')}
        style={({ pressed }) => [styles.btn, pressed && styles.pressed]}
      >
        <Ionicons name="add" size={18} color={value >= max ? theme.textSecondary : theme.text} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    padding: 3,
    gap: 4,
  },
  btn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.7,
    transform: [{ scale: 0.92 }],
  },
  valueWrap: {
    minWidth: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: {
    fontSize: 16,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  suffix: {
    color: 'rgba(128,128,128,0.7)',
    fontSize: 11,
  },
});
