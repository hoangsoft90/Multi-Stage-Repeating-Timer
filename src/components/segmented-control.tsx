/**
 * SegmentedControl — pill track with selectable segments (repeat mode…).
 */
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export interface SegmentOption<T extends string> {
  label: string;
  value: T;
}

interface SegmentedControlProps<T extends string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
}

export function SegmentedControl<T extends string>({ options, value, onChange }: SegmentedControlProps<T>) {
  const theme = useTheme();
  return (
    <View style={[styles.track, { backgroundColor: theme.backgroundElement }]}>
      {options.map((opt) => {
        const selected = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            style={[styles.segment, selected && { backgroundColor: theme.backgroundSelected }]}
          >
            <Text
              style={[
                styles.label,
                { color: selected ? theme.text : theme.textSecondary },
                selected && styles.labelSelected,
              ]}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    borderRadius: Radius.pill,
    padding: 4,
    gap: 4,
  },
  segment: {
    flex: 1,
    borderRadius: Radius.pill,
    paddingVertical: 9,
    alignItems: 'center',
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
  },
  labelSelected: {
    fontWeight: '700',
  },
});
