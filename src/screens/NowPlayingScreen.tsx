import { View, Pressable, Text, StyleSheet } from 'react-native';
import type { QueueItem } from '../types';
import { YoutubeNowPlaying } from '../components/YoutubeNowPlaying';
import { PlexAudioNowPlaying } from '../components/PlexAudioNowPlaying';
import { UpNextStrip } from '../components/UpNextStrip';
import { AdminGateButton } from '../components/AdminGateButton';

export function NowPlayingScreen({
  nowPlaying,
  advance,
  onAddMore,
}: {
  nowPlaying: QueueItem;
  advance: () => void;
  onAddMore: () => void;
}) {
  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      {nowPlaying.source === 'youtube' ? (
        <YoutubeNowPlaying videoId={nowPlaying.source_id} onEnded={advance} onError={advance} />
      ) : (
        <PlexAudioNowPlaying item={nowPlaying} onEnded={advance} />
      )}
      <UpNextStrip />
      <Pressable onPress={onAddMore} style={styles.addBtn}>
        <Text style={styles.addBtnText}>+ Add a song</Text>
      </Pressable>
      <AdminGateButton />
    </View>
  );
}

const styles = StyleSheet.create({
  addBtn: {
    position: 'absolute',
    top: 20,
    right: 20,
    backgroundColor: '#e63946',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 20,
  },
  addBtnText: { color: 'white', fontWeight: '700' },
});
