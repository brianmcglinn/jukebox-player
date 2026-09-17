import { useState } from 'react';
import { View, Pressable, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { QueueItem } from '../types';
import { YoutubeNowPlaying } from '../components/YoutubeNowPlaying';
import { PlexAudioNowPlaying } from '../components/PlexAudioNowPlaying';
import { SpotifyNowPlaying } from '../components/SpotifyNowPlaying';
import { ProgressBar } from '../components/ProgressBar';
import { UpNextStrip } from '../components/UpNextStrip';
import { colors } from '../lib/colors';

export function NowPlayingScreen({
  nowPlaying,
  advance,
  onAddMore,
  compact = false,
}: {
  nowPlaying: QueueItem;
  advance: () => void;
  onAddMore: () => void;
  // When true (search is open beside this), hides the up-next strip and
  // buttons to keep this side of the screen minimal — the underlying
  // Youtube/PlexAudio/Spotify player component itself is untouched by
  // this, same key and everything, so audio keeps playing without any
  // interruption.
  compact?: boolean;
}) {
  const [progress, setProgress] = useState({ position: 0, duration: 0 });
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: '#000', paddingBottom: insets.bottom }}>
      <View style={styles.playerArea}>
        {nowPlaying.source === 'youtube' ? (
          <YoutubeNowPlaying
            // key forces a completely fresh component (and WebView) instance
            // per song — WebView-based players can snapshot their event
            // callbacks at mount time and not reliably pick up fresh closures
            // on prop updates alone.
            key={nowPlaying.id}
            videoId={nowPlaying.source_id}
            onEnded={advance}
            onError={advance}
            onProgress={(position, duration) => setProgress({ position, duration })}
          />
        ) : nowPlaying.source === 'spotify' ? (
          <SpotifyNowPlaying
            // Same reasoning as YouTube — a fresh instance per song, so the
            // player-state listener and completion-detection guards inside
            // SpotifyNowPlaying always start clean for the new track.
            key={nowPlaying.id}
            item={nowPlaying}
            onEnded={advance}
            onProgress={(position, duration) => setProgress({ position, duration })}
          />
        ) : (
          <PlexAudioNowPlaying
            key={nowPlaying.id}
            item={nowPlaying}
            onEnded={advance}
            onProgress={(position, duration) => setProgress({ position, duration })}
          />
        )}
      </View>
      <ProgressBar position={progress.position} duration={progress.duration} />
      {!compact && <UpNextStrip />}
      {!compact && (
        <Pressable onPress={onAddMore} style={[styles.addBtn, { bottom: 20 + insets.bottom }]}>
          <Text style={styles.addBtnText}>+ Add a song</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  playerArea: { flex: 1 },
  addBtn: {
    position: 'absolute',
    right: 20,
    backgroundColor: colors.purple,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 20,
  },
  addBtnText: { color: 'white', fontWeight: '700' },
});
