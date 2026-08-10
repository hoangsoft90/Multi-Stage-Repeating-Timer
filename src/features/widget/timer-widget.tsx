/**
 * Home-screen widget layout (spec: android-widget / live-activity stretch) —
 * rendered by expo-widgets on iOS (WidgetKit) and Android (Glance). This file
 * is bundled into the widget extension at native build time, so it MUST stay
 * self-contained: only imports from expo-widgets + @expo/ui/swift-ui (pure
 * type/const imports are erased at compile time).
 *
 * The layout shows: preset name + status, stage name + countdown (MM:SS at the
 * last update — Android updatePeriodMillis ≥ 30 min, no realtime tick), and
 * round (`x/y`, `x / ∞` for forever). Idle state → "Mở LoopTimer".
 *
 * Tap handling (spec: android-widget R2):
 * - Body tap (widgetURL): running/paused → opens the Timer screen
 *   (`looptimer:///timer`); idle → quick-starts the suggested preset
 *   (`looptimer:///?start=<id>`, '' → Home).
 * - Idle "Start" button (expo-widgets interactive widget): fires a
 *   UserInteractionEvent the app handles via addUserInteractionListener
 *   (see widget-interaction.ts) — belt-and-suspenders for quick-start.
 * - Active session control buttons (like the Live Activity): Pause/Stop
 *   while running, Resume/Stop while paused — applied in place by the app
 *   (never navigates); the widget updates via the store events.
 *   Labels are localized through the widget data (TimerWidgetLabels, filled
 *   by the app via i18n) — the widget extension itself has no i18n.
 */
import { Button, HStack, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import { font, foregroundStyle, padding, widgetURL } from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';
import {
  formatWidgetMs,
  widgetRoundLabel,
  WIDGET_SOURCE,
  WIDGET_START_TARGET,
  WIDGET_PAUSE_TARGET,
  WIDGET_RESUME_TARGET,
  WIDGET_STOP_TARGET,
  type TimerWidgetData,
} from './widget-data';

const TimerWidgetLayout = (props: TimerWidgetData, environment: WidgetEnvironment) => {
  'widget';
  const dark = environment.colorScheme === 'dark';
  const text = dark ? '#F5F7FA' : '#0F1419';
  const secondary = dark ? '#8B95A3' : '#5B6472';
  const accent = '#FF512F';

  const active = props.status === 'running' || props.status === 'paused';
  // Body tap → the right screen: the timer while a session runs (never
  // quick-start over a live session), otherwise quick-start the suggested
  // preset ('' → Home).
  const openUrl = active
    ? 'looptimer:///timer'
    : props.quickStartPresetId
      ? `looptimer:///?start=${props.quickStartPresetId}`
      : 'looptimer:///';

  if (props.status === 'idle') {
    return (
      <VStack modifiers={[padding({ all: 16 }), widgetURL(openUrl)]}>
        <Text modifiers={[font({ weight: 'bold', size: 15 }), foregroundStyle(text)]}>LoopTimer</Text>
        <Text modifiers={[font({ size: 13 }), foregroundStyle(secondary)]}>{props.openAppLabel}</Text>
        <Spacer />
        {/* Interactive quick-start (expo-widgets 'widget' bundle contract: the
            renderer wires `onButtonPress` + `target` and emits the interaction
            event to the app). The cast is required — @expo/ui ButtonProps only
            types `onPress`, while widget buttons use `onButtonPress`. */}
        <Button
          label={props.startLabel}
          target={WIDGET_START_TARGET}
          // Fresh object so the widget renderer always sees a change on press.
          {...({ onButtonPress: () => ({ ...props }) } as Record<string, unknown>)}
          modifiers={[font({ weight: 'bold', size: 13 }), foregroundStyle('#FFFFFF')]}
        />
      </VStack>
    );
  }

  return (
    <VStack modifiers={[padding({ all: 16 }), widgetURL(openUrl)]}>
      <Text modifiers={[font({ size: 12 }), foregroundStyle(secondary)]}>{props.presetName}</Text>
      <HStack>
        <Text modifiers={[font({ weight: 'bold', size: 15 }), foregroundStyle(accent)]}>{props.stageName}</Text>
        <Spacer />
        <Text modifiers={[font({ weight: 'bold', size: 20 }), foregroundStyle(text)]}>
          {formatWidgetMs(props.remainingMs)}
        </Text>
      </HStack>
      <Text modifiers={[font({ size: 12 }), foregroundStyle(secondary)]}>
        {widgetRoundLabel({ round: props.round, totalRounds: props.totalRounds, isForever: props.isForever })}
      </Text>
      {/* Active-session controls (expo-widgets interactive widget, same
          contract as the Live Activity buttons): Pause/Stop while running,
          Resume/Stop while paused. Fresh object on press so the renderer
          always sees a change. */}
      {props.status === 'running' ? (
        <HStack modifiers={[padding({ top: 8 })]}>
          <Button
            label={props.pauseLabel}
            target={WIDGET_PAUSE_TARGET}
            {...({ onButtonPress: () => ({ ...props }) } as Record<string, unknown>)}
            modifiers={[font({ weight: 'bold', size: 13 }), foregroundStyle('#FFFFFF')]}
          />
          <Button
            label={props.stopLabel}
            target={WIDGET_STOP_TARGET}
            {...({ onButtonPress: () => ({ ...props }) } as Record<string, unknown>)}
            modifiers={[font({ weight: 'bold', size: 13 }), foregroundStyle('#FFFFFF')]}
          />
        </HStack>
      ) : props.status === 'paused' ? (
        <HStack modifiers={[padding({ top: 8 })]}>
          <Button
            label={props.resumeLabel}
            target={WIDGET_RESUME_TARGET}
            {...({ onButtonPress: () => ({ ...props }) } as Record<string, unknown>)}
            modifiers={[font({ weight: 'bold', size: 13 }), foregroundStyle('#FFFFFF')]}
          />
          <Button
            label={props.stopLabel}
            target={WIDGET_STOP_TARGET}
            {...({ onButtonPress: () => ({ ...props }) } as Record<string, unknown>)}
            modifiers={[font({ weight: 'bold', size: 13 }), foregroundStyle('#FFFFFF')]}
          />
        </HStack>
      ) : null}
    </VStack>
  );
};

export default createWidget(WIDGET_SOURCE, TimerWidgetLayout);
