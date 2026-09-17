import { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  interpolateColor,
  Easing,
} from 'react-native-reanimated';
import { colors } from '../lib/colors';

const CYCLE = [colors.purple, colors.blue, colors.green, colors.purple];
const CYCLE_INPUT = CYCLE.map((_, i) => i);
const CYCLE_DURATION_MS = 9000; // full purple->blue->green->purple loop

// Three concentric, softly-overlapping rings behind the artwork, each
// cycling through the same neon hues on a slightly offset phase and pulsing
// gently in scale — creates a "breathing" halo effect without needing any
// blur library, which Android doesn't support natively via shadows anyway.
export function NeonGlow({ size }: { size: number }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(CYCLE.length - 1, { duration: CYCLE_DURATION_MS, easing: Easing.linear }),
      -1,
      false
    );
  }, []);

  const outer = useAnimatedStyle(() => {
    const color = interpolateColor(progress.value, CYCLE_INPUT, CYCLE);
    const pulse = 1 + 0.08 * Math.sin(progress.value * Math.PI * 1.3);
    return { backgroundColor: color, opacity: 0.22, transform: [{ scale: pulse }] };
  });

  const mid = useAnimatedStyle(() => {
    const color = interpolateColor(progress.value, CYCLE_INPUT, CYCLE);
    const pulse = 1 + 0.06 * Math.sin(progress.value * Math.PI * 1.3 + 0.6);
    return { backgroundColor: color, opacity: 0.35, transform: [{ scale: pulse }] };
  });

  const inner = useAnimatedStyle(() => {
    const color = interpolateColor(progress.value, CYCLE_INPUT, CYCLE);
    const pulse = 1 + 0.04 * Math.sin(progress.value * Math.PI * 1.3 + 1.2);
    return { backgroundColor: color, opacity: 0.5, transform: [{ scale: pulse }] };
  });

  return (
    <View
      pointerEvents="none"
      style={[styles.wrap, { width: size * 1.5, height: size * 1.5 }]}
    >
      <Animated.View
        style={[styles.ring, { width: size * 1.42, height: size * 1.42, borderRadius: size }, outer]}
      />
      <Animated.View
        style={[styles.ring, { width: size * 1.24, height: size * 1.24, borderRadius: size }, mid]}
      />
      <Animated.View
        style={[styles.ring, { width: size * 1.1, height: size * 1.1, borderRadius: size }, inner]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute' },
});
