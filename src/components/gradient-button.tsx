/**
 * GradientButton — primary CTA with the brand gradient (vibrant sporty).
 * Secondary variant uses the cyan→blue SecondaryGradient (per design
 * tokens) — same shape, different energy color.
 */
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, StyleProp, ViewStyle } from 'react-native';
import { BrandGradient, SecondaryGradient, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface GradientButtonProps {
  label: string;
  onPress?: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  gradient?: readonly [string, string];
  secondary?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function GradientButton({
  label,
  onPress,
  icon,
  gradient,
  secondary,
  disabled,
  fullWidth = true,
  style,
}: GradientButtonProps) {
  const theme = useTheme();
  const colors = gradient ?? (secondary ? SecondaryGradient : BrandGradient);
  const labelColor = secondary ? theme.text : '#FFFFFF';

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.wrap,
        fullWidth && styles.fullWidth,
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
    >
      <LinearGradient
        colors={[...colors]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.gradient, secondary && { backgroundColor: theme.backgroundElement, borderWidth: 1, borderColor: theme.border }]}
      >
        {icon ? <Ionicons name={icon} size={18} color={labelColor} style={styles.icon} /> : null}
        <Text style={[styles.label, { color: labelColor }]}>{label}</Text>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: Radius.lg,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 4,
  },
  fullWidth: {
    alignSelf: 'stretch',
  },
  gradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: Radius.lg,
  },
  icon: {
    marginRight: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '700',
  },
  pressed: {
    transform: [{ scale: 0.97 }],
    opacity: 0.92,
  },
  disabled: {
    opacity: 0.5,
  },
});
