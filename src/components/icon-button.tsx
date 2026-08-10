/**
 * IconButton — circular 44px icon button replacing emoji buttons.
 * accessibilityLabel is required (a11y).
 */
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/use-theme';

interface IconButtonProps {
  icon: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
  label: string;
  size?: number;
  color?: string;
  backgroundColor?: string;
}

export function IconButton({
  icon,
  onPress,
  label,
  size = 20,
  color,
  backgroundColor,
}: IconButtonProps) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      style={({ pressed }) => [
        styles.btn,
        { backgroundColor: backgroundColor ?? theme.backgroundElement },
        pressed && styles.pressed,
      ]}
    >
      <Ionicons name={icon} size={size} color={color ?? theme.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.75,
    transform: [{ scale: 0.94 }],
  },
});
