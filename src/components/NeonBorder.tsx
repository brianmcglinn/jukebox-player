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
const CYCLE_DURATION_MS = 9000;

export function NeonBorder({
  width,
  height,
  borderWidth = 4,
  children,
}: {
  width: number;
  height: number;
  borderWidth?: number;
  children: React.ReactNode;
}) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(CYCLE.length - 1, { duration: CYCLE_DURATION_MS, easing: Easing.linear }),
      -1,
      false
    );
  }, []);

  const borderStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(progress.value, CYCLE_INPUT, CYCLE),
  }));

  return (
    <Animated.View
      style={[styles.frame, { width, height, borderWidth, borderRadius: 14 }, borderStyle]}
    >
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  frame: { overflow: 'hidden' },
});
