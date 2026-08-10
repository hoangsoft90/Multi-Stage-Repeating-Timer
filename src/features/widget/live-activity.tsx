/**
 * iOS Live Activity layout (spec: live-activity) — rendered by ActivityKit on
 * the Lock Screen / Dynamic Island via expo-widgets. Bundled into the widget
 * extension at native build time, so it MUST stay self-contained (expo-widgets
 * + @expo/ui/swift-ui only; pure type imports are erased at compile time).
 *
 * ActivityKit counts down from the absolute `stageEndsAt` on its own — the
 * remainingMs here is just the initial/updated value; it keeps ticking even
 * when the app is backgrounded (solves the iOS 50-notification window).
 *
 * Controls (live-activity R3): Pause/Skip while running, Resume while paused,
 * rendered in the Lock Screen banner and the Dynamic Island expanded bottom.
 * Taps fire UserInteractionEvents (source=TimerActivity) that the app routes
 * via addUserInteractionListener — see widget-interaction.ts.
 */
import { Button, HStack, Text, VStack } from '@expo/ui/swift-ui';
import { font, foregroundStyle, padding } from '@expo/ui/swift-ui/modifiers';
import { createLiveActivity, type LiveActivityEnvironment } from 'expo-widgets';
import { formatWidgetMs, widgetRoundLabel } from './widget-data';
import {
  ACTIVITY_PAUSE_TARGET,
  ACTIVITY_RESUME_TARGET,
  ACTIVITY_SKIP_TARGET,
  type TimerActivityContent,
} from './activity-content';

const TimerActivityLayout = (props: TimerActivityContent, environment: LiveActivityEnvironment) => {
  'widget';
  const dark = environment.colorScheme === 'dark';
  const text = dark ? '#F5F7FA' : '#0F1419';
  const secondary = dark ? '#8B95A3' : '#5B6472';
  const accent = '#FF512F';
  const roundLabel = widgetRoundLabel({ round: props.round, totalRounds: props.totalRounds, isForever: props.isForever });

  // Pause/Skip while running; Resume while paused (ActivityKit control row).
  const buttonRow = (() => {
    if (props.status === 'running') {
      return (
        <HStack modifiers={[padding({ top: 8 })]}>
          <Button
            label={props.pauseLabel}
            target={ACTIVITY_PAUSE_TARGET}
            // Fresh object so the widget renderer always sees a change on press.
            {...({ onButtonPress: () => ({ ...props }) } as Record<string, unknown>)}
            modifiers={[font({ weight: 'bold', size: 13 }), foregroundStyle('#FFFFFF')]}
          />
          <Button
            label={props.skipLabel}
            target={ACTIVITY_SKIP_TARGET}
            {...({ onButtonPress: () => ({ ...props }) } as Record<string, unknown>)}
            modifiers={[font({ weight: 'bold', size: 13 }), foregroundStyle('#FFFFFF')]}
          />
        </HStack>
      );
    }
    if (props.status === 'paused') {
      return (
        <HStack modifiers={[padding({ top: 8 })]}>
          <Button
            label={props.resumeLabel}
            target={ACTIVITY_RESUME_TARGET}
            {...({ onButtonPress: () => ({ ...props }) } as Record<string, unknown>)}
            modifiers={[font({ weight: 'bold', size: 13 }), foregroundStyle('#FFFFFF')]}
          />
        </HStack>
      );
    }
    return null;
  })();

  return {
    // Lock Screen expanded banner.
    banner: (
      <VStack modifiers={[padding({ all: 12 })]}>
        <Text modifiers={[font({ weight: 'bold', size: 16 }), foregroundStyle(text)]}>{props.stageName}</Text>
        <Text modifiers={[font({ size: 13 }), foregroundStyle(secondary)]}>
          {props.presetName} · {roundLabel}
          {props.nextStageName ? ` · Next: ${props.nextStageName}` : ''}
        </Text>
        {buttonRow}
      </VStack>
    ),
    // Dynamic Island — compact (leading = stage, trailing = countdown).
    compactLeading: (
      <Text modifiers={[font({ weight: 'bold', size: 14 }), foregroundStyle(text)]}>{props.stageName}</Text>
    ),
    compactTrailing: (
      <Text modifiers={[font({ weight: 'bold', size: 15 }), foregroundStyle(text)]}>
        {formatWidgetMs(props.remainingMs)}
      </Text>
    ),
    // Dynamic Island — minimal (smallest pill).
    minimal: (
      <Text modifiers={[font({ weight: 'bold', size: 16 }), foregroundStyle(text)]}>
        {formatWidgetMs(props.remainingMs)}
      </Text>
    ),
    // Dynamic Island — expanded.
    expandedLeading: (
      <VStack modifiers={[padding({ all: 12 })]}>
        <Text modifiers={[font({ weight: 'bold', size: 16 }), foregroundStyle(accent)]}>{props.stageName}</Text>
        <Text modifiers={[font({ size: 12 }), foregroundStyle(secondary)]}>{props.presetName}</Text>
      </VStack>
    ),
    expandedTrailing: (
      <VStack modifiers={[padding({ all: 12 })]}>
        <Text modifiers={[font({ weight: 'bold', size: 22 }), foregroundStyle(text)]}>
          {formatWidgetMs(props.remainingMs)}
        </Text>
        <Text modifiers={[font({ size: 12 }), foregroundStyle(secondary)]}>{roundLabel}</Text>
      </VStack>
    ),
    expandedBottom: (
      <VStack modifiers={[padding({ all: 12 })]}>
        {props.nextStageName ? (
          <Text modifiers={[font({ size: 13 }), foregroundStyle(secondary)]}>Next: {props.nextStageName}</Text>
        ) : null}
        {buttonRow}
      </VStack>
    ),
  };
};

export default createLiveActivity('TimerActivity', TimerActivityLayout);
