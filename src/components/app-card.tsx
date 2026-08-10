/**
 * AppCard — standard surface card (radius lg, soft shadow, padding 16).
 */
import { StyleSheet, View, ViewProps } from 'react-native';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function AppCard({ style, ...props }: ViewProps) {
  const theme = useTheme();
  return <View style={[styles.card, { backgroundColor: theme.surface }, style]} {...props} />;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.lg,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 16,
    elevation: 2,
  },
});
