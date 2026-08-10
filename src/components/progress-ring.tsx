/**
 * ProgressRing — circular SVG progress ring (react-native-svg) with a
 * gradient stroke following the stage color. The dash offset animates with
 * Reanimated so the countdown feels continuous between store ticks.
 */
import { ReactNode, useEffect, useId } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import Animated, { useAnimatedProps, useSharedValue, withTiming } from 'react-native-reanimated';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface ProgressRingProps {
  /** 0..1 fraction of the stage remaining (remaining / total). */
  progress: number;
  size?: number;
  strokeWidth?: number;
  gradient: readonly [string, string];
  trackColor: string;
  children?: ReactNode;
}

export function ProgressRing({
  progress,
  size = 300,
  strokeWidth = 14,
  gradient,
  trackColor,
  children,
}: ProgressRingProps) {
  const gradientId = useId();
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(1, progress));

  const progressAnim = useSharedValue(clamped);
  useEffect(() => {
    progressAnim.value = withTiming(clamped, { duration: 350 });
  }, [clamped, progressAnim]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - progressAnim.value),
  }));

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} style={styles.svg}>
        <Defs>
          <LinearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={gradient[0]} />
            <Stop offset="100%" stopColor={gradient[1]} />
          </LinearGradient>
        </Defs>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={trackColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={`url(#${gradientId})`}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          animatedProps={animatedProps}
        />
      </Svg>
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  svg: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  content: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
