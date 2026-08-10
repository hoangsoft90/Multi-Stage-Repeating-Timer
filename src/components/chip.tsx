/**
 * Chip — compact meta pill (surfaceElevated bg, caption text, optional
 * colored dot for the stage accent).
 */
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/hooks/use-theme';

interface ChipProps {
  children: string;
  dotColor?: string;
}

export function Chip({ children, dotColor }: ChipProps) {
  const theme = useTheme();
  return (
    <View style={[styles.chip, { backgroundColor: theme.backgroundElement }]}>
      {dotColor ? <View style={[styles.dot, { backgroundColor: dotColor }]} /> : null}
      <Text style={[styles.label, { color: theme.textSecondary }]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
  },
});
