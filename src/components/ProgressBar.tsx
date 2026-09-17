import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../lib/colors';

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function ProgressBar({ position, duration }: { position: number; duration: number }) {
  const pct = duration > 0 ? Math.min((position / duration) * 100, 100) : 0;

  return (
    <View style={styles.container}>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${pct}%` }]} />
      </View>
      <View style={styles.timeRow}>
        <Text style={styles.timeText}>{formatTime(position)}</Text>
        <Text style={styles.timeText}>{formatTime(duration)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 4 },
  track: { height: 5, backgroundColor: '#333', borderRadius: 3, overflow: 'hidden' },
  fill: { height: 5, backgroundColor: colors.green },
  timeRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  timeText: { color: '#999', fontSize: 12 },
});
