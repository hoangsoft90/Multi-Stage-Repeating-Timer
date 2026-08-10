/**
 * StagePill — horizontal strip of stage chips. The current stage glows with
 * its accent color; completed stages fade to gray.
 */
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { stageAccent } from '@/constants/stage-colors';
import { useTheme } from '@/hooks/use-theme';

interface StagePillProps {
  stages: Array<{ id: string; name: string }>;
  currentIndex: number;
  isDark: boolean;
}

export function StagePill({ stages, currentIndex, isDark }: StagePillProps) {
  const theme = useTheme();
  if (stages.length === 0) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      style={styles.scroll}
    >
      {stages.map((stage, i) => {
        const isCurrent = i === currentIndex;
        const accent = stageAccent(stage.name, isDark);
        return (
          <View
            key={stage.id}
            style={[
              styles.pill,
              {
                backgroundColor: isCurrent ? accent : theme.backgroundElement,
                borderColor: isCurrent ? accent : theme.border,
              },
            ]}
          >
            <Text
              style={[
                styles.label,
                { color: isCurrent ? '#FFFFFF' : theme.textSecondary },
              ]}
            >
              {stage.name}
            </Text>
            {i < stages.length - 1 ? (
              <Text style={[styles.sep, { color: theme.textSecondary }]}>→</Text>
            ) : null}
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    maxWidth: '100%',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 4,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1.5,
    paddingHorizontal: 12,
    paddingVertical: 5,
    gap: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  sep: {
    fontSize: 11,
    opacity: 0.7,
  },
});
