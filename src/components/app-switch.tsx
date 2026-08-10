/**
 * AppSwitch — custom pill switch (thumb + track). Track turns brand-orange
 * when on; web-friendly (Pressable, no native Switch).
 */
import { Pressable, StyleSheet, View } from 'react-native';
import { BrandGradient, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface AppSwitchProps {
  value: boolean;
  onValueChange: (next: boolean) => void;
}

export function AppSwitch({ value, onValueChange }: AppSwitchProps) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      onPress={() => onValueChange(!value)}
      hitSlop={6}
      style={[styles.track, { backgroundColor: value ? BrandGradient[0] : theme.backgroundSelected }]}
    >
      <View style={[styles.thumb, { transform: [{ translateX: value ? 20 : 0 }] }]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: {
    width: 48,
    height: 28,
    borderRadius: Radius.pill,
    padding: 3,
    justifyContent: 'center',
  },
  thumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 2,
  },
});
