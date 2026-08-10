import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { GradientButton } from '@/components/gradient-button';
import { BUILTIN_TEMPLATES } from '@/features/presets/presets-store';
import { useTimerStore } from '@/features/timer/timer-store';
import { useSettingsStore } from '@/features/settings/settings-store';
import { stageColorFor } from '@/constants/stage-colors';
import { BrandGradient, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { Preset } from '@/core/timer/models';

type Goal = 'workout' | 'study' | 'work';

const GOALS: Array<{ id: Goal; icon: keyof typeof Ionicons.glyphMap; labelKey: string }> = [
  { id: 'workout', icon: 'barbell-outline', labelKey: 'onboarding.goalWorkout' },
  { id: 'study', icon: 'school-outline', labelKey: 'onboarding.goalStudy' },
  { id: 'work', icon: 'briefcase-outline', labelKey: 'onboarding.goalWork' },
];

/** Template suggestion per goal (workout → HIIT, study → Pomodoro, work → Work/Break). */
function templateForGoal(goal: Goal): Preset {
  const id =
    goal === 'workout' ? 'template_hiit' : goal === 'study' ? 'template_pomodoro' : 'template_work_break';
  return BUILTIN_TEMPLATES.find((t) => t.id === id) ?? BUILTIN_TEMPLATES[0];
}

export default function OnboardingScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [goal, setGoal] = useState<Goal | null>(null);

  const finish = async () => {
    await useSettingsStore.getState().set({ onboardingDone: true });
    router.replace('/');
  };

  const startTemplate = async () => {
    const template = templateForGoal(goal ?? 'workout');
    await useSettingsStore.getState().set({ onboardingDone: true });
    await useTimerStore.getState().startPreset(template);
    router.replace('/timer');
  };

  const template = templateForGoal(goal ?? 'workout');
  const accent = stageColorFor(template.stages[0]?.name).main;

  const next = () => {
    if (step === 0) setStep(1);
    else if (step === 1 && goal) setStep(2);
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* step dots */}
        <View style={styles.dots}>
          {[0, 1, 2].map((i) => (
            <View
              key={i}
              style={[styles.dot, i === step ? styles.dotActive : { backgroundColor: theme.backgroundSelected }]}
            />
          ))}
        </View>

        {step === 0 && (
          <View style={styles.body}>
            <LinearGradient colors={[...BrandGradient]} style={styles.logo}>
              <Ionicons name="timer-outline" size={40} color="#FFFFFF" />
            </LinearGradient>
            <ThemedText type="subtitle" style={styles.title}>
              {t('onboarding.welcomeTitle')}
            </ThemedText>
            <ThemedText type="default" themeColor="textSecondary" style={styles.bodyText}>
              {t('onboarding.welcomeBody')}
            </ThemedText>
            <View style={styles.actions}>
              <GradientButton label={t('onboarding.next')} icon="arrow-forward" onPress={next} />
            </View>
          </View>
        )}

        {step === 1 && (
          <View style={styles.body}>
            <ThemedText type="subtitle" style={styles.title}>
              {t('onboarding.goalTitle')}
            </ThemedText>
            <View style={styles.goals}>
              {GOALS.map((g) => (
                <Pressable
                  key={g.id}
                  style={[
                    styles.goalCard,
                    { backgroundColor: theme.backgroundElement, borderColor: goal === g.id ? BrandGradient[0] : theme.border },
                  ]}
                  onPress={() => setGoal(g.id)}
                >
                  <Ionicons name={g.icon} size={26} color={goal === g.id ? BrandGradient[0] : theme.textSecondary} />
                  <ThemedText style={styles.goalLabel}>{t(g.labelKey)}</ThemedText>
                </Pressable>
              ))}
            </View>
            <View style={styles.actions}>
              <GradientButton label={t('onboarding.next')} icon="arrow-forward" onPress={next} disabled={!goal} />
            </View>
          </View>
        )}

        {step === 2 && (
          <View style={styles.body}>
            <ThemedText type="subtitle" style={styles.title}>
              {t('onboarding.templateTitle')}
            </ThemedText>
            <View style={[styles.templateCard, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
              <View style={[styles.stageDot, { backgroundColor: accent }]} />
              <View style={{ flex: 1 }}>
                <ThemedText style={styles.templateName}>{template.name}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {t('home.summaryStages', { count: template.stages.length })} ·{' '}
                  {template.repeatMode === 'forever'
                    ? t('home.modeLoop')
                    : template.repeatMode === 'fixedCount'
                      ? t('home.modeRounds', { count: template.fixedCount })
                      : t('home.modeOnce')}
                </ThemedText>
              </View>
            </View>
            <View style={styles.actions}>
              <GradientButton label={t('onboarding.start')} icon="play" onPress={() => void startTemplate()} />
              <Pressable style={({ pressed }) => [styles.ghost, pressed && styles.ghostPressed]} onPress={() => void finish()}>
                <ThemedText themeColor="textSecondary" style={styles.ghostLabel}>
                  {t('onboarding.later')}
                </ThemedText>
              </Pressable>
            </View>
          </View>
        )}

        {/* footer: back / skip */}
        <View style={styles.footer}>
          {step > 0 ? (
            <Pressable style={styles.footerBtn} onPress={() => setStep(step - 1)}>
              <Ionicons name="arrow-back" size={18} color={theme.textSecondary} />
              <ThemedText themeColor="textSecondary" style={styles.footerLabel}>
                {t('onboarding.back')}
              </ThemedText>
            </Pressable>
          ) : (
            <View />
          )}
          <Pressable style={styles.footerBtn} onPress={() => void finish()}>
            <ThemedText themeColor="textSecondary" style={styles.footerLabel}>
              {t('onboarding.skip')}
            </ThemedText>
          </Pressable>
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, padding: 24 },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    backgroundColor: BrandGradient[0],
    width: 24,
  },
  body: {
    flex: 1,
    justifyContent: 'center',
    gap: 20,
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
  },
  logo: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    shadowColor: '#FF512F',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 5,
  },
  title: {
    fontSize: 26,
    textAlign: 'center',
  },
  bodyText: {
    textAlign: 'center',
    lineHeight: 24,
  },
  goals: {
    gap: 12,
  },
  goalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    padding: 18,
  },
  goalLabel: {
    fontSize: 17,
    fontWeight: '600',
  },
  templateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: 18,
  },
  stageDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  templateName: {
    fontSize: 18,
    fontWeight: '700',
  },
  actions: {
    gap: 10,
  },
  ghost: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  ghostPressed: { opacity: 0.6 },
  ghostLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
  },
  footerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 10,
  },
  footerLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
});
