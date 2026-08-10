/**
 * Curated template library (v1.5, spec: curated-templates) — browse 12
 * hand-picked templates by category; "Use this" saves a REGULAR user preset
 * (editable / deletable, unlike the 3 immutable built-ins).
 */
import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AppCard } from '@/components/app-card';
import { GradientButton } from '@/components/gradient-button';
import { Chip } from '@/components/chip';
import { alertAsync } from '@/components/confirm';
import {
  CURATED_TEMPLATES,
  CuratedTemplate,
  TEMPLATE_CATEGORIES,
  TemplateCategory,
  formatStageDuration,
  toPreset,
} from '@/core/curated-templates';
import { usePresetsStore } from '@/features/presets/presets-store';
import { stageColorFor } from '@/constants/stage-colors';
import { BrandGradient, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Show at most this many stage chips in the preview row. */
const PREVIEW_LIMIT = 6;

type CategoryFilter = 'all' | TemplateCategory;

export default function TemplatesScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  const [category, setCategory] = useState<CategoryFilter>('all');

  const templates =
    category === 'all'
      ? CURATED_TEMPLATES
      : CURATED_TEMPLATES.filter((x) => x.category === category);

  const onUse = async (template: CuratedTemplate) => {
    const name = template.name;
    await usePresetsStore.getState().save(toPreset(template));
    alertAsync(t('templates.added', { name }), '');
    router.back();
  };

  const roundLabel = (template: CuratedTemplate): string => {
    if (template.repeatMode === 'forever') return t('home.modeLoop');
    if (template.repeatMode === 'fixedCount') {
      return t('templates.rounds', { count: template.fixedCount ?? 1 });
    }
    return t('home.modeOnce');
  };

  const categoryChips: Array<{ id: CategoryFilter; label: string }> = [
    { id: 'all', label: t('templates.all') },
    ...TEMPLATE_CATEGORIES.map((c) => ({ id: c as CategoryFilter, label: t(`templates.${c}`) })),
  ];

  return (
    <ThemedView style={styles.container}>
      <FlatList
        data={templates}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View style={styles.chipsRow}>
            {categoryChips.map((c) => {
              const active = c.id === category;
              return (
                <Pressable
                  key={c.id}
                  accessibilityRole="button"
                  onPress={() => setCategory(c.id)}
                  style={[
                    styles.catChip,
                    {
                      backgroundColor: active ? BrandGradient[0] : theme.backgroundElement,
                      borderColor: active ? BrandGradient[0] : theme.border,
                    },
                  ]}
                >
                  <ThemedText
                    type="small"
                    style={{ color: active ? '#FFFFFF' : theme.textSecondary, fontWeight: '700' }}
                  >
                    {c.label}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        }
        renderItem={({ item }) => {
          const accent = stageColorFor(item.stages[0]?.name).main;
          return (
            <AppCard style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={[styles.emojiWrap, { backgroundColor: theme.backgroundSelected }]}>
                  <ThemedText style={styles.emoji}>{item.emoji}</ThemedText>
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <ThemedText style={styles.name}>{item.name}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {item.description}
                  </ThemedText>
                </View>
              </View>

              {/* stage preview (name + compact duration) */}
              <View style={styles.previewRow}>
                {item.stages.slice(0, PREVIEW_LIMIT).map((s, i) => (
                  <View key={`${s.name}_${i}`} style={[styles.previewChip, { backgroundColor: theme.backgroundSelected }]}>
                    <View style={[styles.stageDot, { backgroundColor: stageColorFor(s.name).main }]} />
                    <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                      {s.name} · {formatStageDuration(s.durationSeconds)}
                    </ThemedText>
                  </View>
                ))}
                {item.stages.length > PREVIEW_LIMIT ? (
                  <ThemedText type="small" themeColor="textSecondary">
                    +{item.stages.length - PREVIEW_LIMIT}
                  </ThemedText>
                ) : null}
              </View>

              <View style={styles.cardFooter}>
                <Chip dotColor={accent}>
                  {`${t('templates.stages', { count: item.stages.length })} · ${roundLabel(item)}`}
                </Chip>
                <GradientButton
                  label={t('templates.useThis')}
                  icon="add"
                  onPress={() => void onUse(item)}
                  fullWidth={false}
                />
              </View>
            </AppCard>
          );
        }}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, gap: 12, paddingBottom: 48 },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
  },
  catChip: {
    borderRadius: Radius.pill,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  card: { gap: 12 },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  emojiWrap: {
    width: 48,
    height: 48,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: { fontSize: 24 },
  name: { fontSize: 17, fontWeight: '700' },
  previewRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  previewChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: Radius.pill,
    paddingHorizontal: 9,
    paddingVertical: 4,
    maxWidth: 150,
  },
  stageDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
});
