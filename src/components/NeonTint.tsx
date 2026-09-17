import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
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
const CYCLE_DURATION_MS = 14000; // slower than the glow/border — ambient, not attention-grabbing

// A very low-opacity, full-screen color wash that cycles through the same
// neon hues as NeonGlow/NeonBorder, meant to sit over a blurred backdrop so
// the whole screen feels tied into the theme rather than just the art itself.
export function NeonTint({ opacity = 0.14 }: { opacity?: number }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(CYCLE.length - 1, { duration: CYCLE_DURATION_MS, easing: Easing.linear }),
      -1,
      false
    );
  }, []);

  const tintStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(progress.value, CYCLE_INPUT, CYCLE),
    opacity,
  }));

  return <Animated.View pointerEvents="none" style={[styles.fill, tintStyle]} />;
}

const styles = StyleSheet.create({
  fill: { ...StyleSheet.absoluteFillObject },
});
