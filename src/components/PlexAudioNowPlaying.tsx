import { useEffect, useRef } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import TrackPlayer, { Event, useTrackPlayerEvents } from 'react-native-track-player';
import { getPlexStreamUrl } from '../lib/plexClient';
import type { QueueItem } from '../types';

export function PlexAudioNowPlaying({ item, onEnded }: { item: QueueItem; onEnded: () => void }) {
  const loadedIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (loadedIdRef.current === item.id) return;
    loadedIdRef.current = item.id;

    (async () => {
      const url = await getPlexStreamUrl(item.source_id);
      await TrackPlayer.reset();
      await TrackPlayer.add({
        id: item.id,
        url,
        title: item.title,
        artist: item.artist ?? undefined,
        artwork: item.thumbnail_url ?? undefined,
      });
      await TrackPlayer.play();
    })();
  }, [item.id]);

  useTrackPlayerEvents([Event.PlaybackQueueEnded, Event.PlaybackError], (event) => {
    if (event.type === Event.PlaybackQueueEnded || event.type === Event.PlaybackError) {
      onEnded();
    }
  });

  return (
    <View style={styles.container}>
      <Image source={{ uri: item.thumbnail_url ?? undefined }} style={styles.art} />
      <Text style={styles.title} numberOfLines={2}>
        {item.title}
      </Text>
      <Text style={styles.artist} numberOfLines={1}>
        {item.artist}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#000' },
  art: { width: 280, height: 280, borderRadius: 16, backgroundColor: '#222' },
  title: { color: 'white', fontSize: 24, fontWeight: '700', marginTop: 24, paddingHorizontal: 24, textAlign: 'center' },
  artist: { color: '#999', fontSize: 18, marginTop: 6 },
});
