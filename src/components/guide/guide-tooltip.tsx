/**
 * GuideTooltip — a compact coach-mark bubble shown inline next to the feature
 * it explains. Renders a title, a short "why / what to do" body, and a
 * Skip / Got-it action row. Intentionally self-contained (no global overlay,
 * no measurement) so it works identically on native and web.
 */
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { BrandGradient, Radius } from '@/constants/theme';

interface GuideTooltipProps {
  title: string;
  body: string;
  actionLabel: string;
  skipLabel: string;
  onDone: () => void;
  onSkip?: () => void;
  style?: StyleProp<ViewStyle>;
  /** Compact variant for tight/non-scrollable layouts (e.g. the timer screen). */
  compact?: boolean;
}

export function GuideTooltip({ title, body, actionLabel, skipLabel, onDone, onSkip, style, compact }: GuideTooltipProps) {
  const theme = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: theme.background, borderColor: BrandGradient[0] + '55' }, compact && styles.cardCompact, style]}>
      <View style={styles.header}>
        <View style={[styles.iconWrap, { backgroundColor: BrandGradient[0] + '22' }]}>
          <Ionicons name="bulb-outline" size={15} color={BrandGradient[0]} />
        </View>
        <ThemedText type="smallBold" style={[styles.title, compact && styles.titleCompact]}>
          {title}
        </ThemedText>
      </View>
      <ThemedText type="small" themeColor="textSecondary" style={[styles.body, compact && styles.bodyCompact]} numberOfLines={compact ? 3 : undefined}>
        {body}
      </ThemedText>
      <View style={styles.actions}>
        {onSkip ? (
          <Pressable onPress={onSkip} hitSlop={8} accessibilityRole="button" style={styles.skipBtn}>
            <ThemedText type="small" themeColor="textSecondary" style={styles.skipLabel}>
              {skipLabel}
            </ThemedText>
          </Pressable>
        ) : (
          <View />
        )}
        <Pressable
          onPress={onDone}
          accessibilityRole="button"
          style={({ pressed }) => [styles.doneBtn, { backgroundColor: BrandGradient[0] }, pressed && styles.donePressed]}
        >
          <Ionicons name="checkmark" size={15} color="#FFFFFF" />
          <ThemedText type="small" style={styles.doneLabel}>
            {actionLabel}
          </ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: 14,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 4,
  },
  cardCompact: {
    padding: 10,
    gap: 5,
    borderRadius: Radius.md,
  },
  titleCompact: {
    fontSize: 13,
  },
  bodyCompact: {
    lineHeight: 17,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconWrap: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 14,
    flex: 1,
  },
  body: {
    lineHeight: 19,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 12,
    marginTop: 2,
  },
  skipBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  skipLabel: {
    fontWeight: '600',
  },
  doneBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: Radius.pill,
  },
  donePressed: {
    opacity: 0.85,
    transform: [{ scale: 0.97 }],
  },
  doneLabel: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
});
