/**
 * GuideBadge — a small red dot that draws attention to an unseen feature
 * (header icon, etc.). Rendered absolutely inside a relatively-positioned
 * parent; purely visual (no touch handling).
 */
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

interface GuideBadgeProps {
  style?: StyleProp<ViewStyle>;
}

export function GuideBadge({ style }: GuideBadgeProps) {
  return <View style={[styles.badge, style]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" />;
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#e5484d',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
});
