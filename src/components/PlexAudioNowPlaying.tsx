import { useEffect, useRef, useState } from 'react';
import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
import TrackPlayer, { usePlaybackState, useIsPlaying, useProgress, PlaybackState } from '@rntp/player';
import { getPlexStreamUrl } from '../lib/plexClient';
import { colors } from '../lib/colors';
import { NeonGlow } from './NeonGlow';
import { NeonTint } from './NeonTint';
import type { QueueItem } from '../types';

export function PlexAudioNowPlaying({
  item,
  onEnded,
  onProgress,
}: {
  item: QueueItem;
  onEnded: () => void;
  onProgress?: (position: number, duration: number) => void;
}) {
  const loadedIdRef = useRef<string | null>(null);
  // Guards against reacting to a stale playbackState left over from the
  // PREVIOUS track. usePlaybackState() reflects a single shared native
  // player, so the instant this component mounts for a new song it can
  // briefly still read the old song's final state (e.g. "ended") before our
  // own setMediaItems()/play() call below has even run — which was
  // triggering an immediate, incorrect "this song already ended" advance.
  const hasStartedRef = useRef(false);
  const playbackState = usePlaybackState();
  const { playing } = useIsPlaying();
  const { position, duration } = useProgress(0.5);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (loadedIdRef.current === item.id) return;
    loadedIdRef.current = item.id;
    hasStartedRef.current = false;

    (async () => {
      try {
        const url = await getPlexStreamUrl(item.source_id);

        // Build the track object without ever including a key whose value is
        // `undefined` — the New Architecture's stricter native serialization
        // can choke on an explicitly-undefined value where an absent key is
        // expected, which matched a real crash here (setMediaItems throwing
        // "Cannot convert undefined value to object").
        const track: { url: string; title: string; artist?: string; artwork?: string } = {
          url,
          title: item.title,
        };
        if (item.artist) track.artist = item.artist;
        if (item.thumbnail_url) track.artwork = item.thumbnail_url;

        // setMediaItems replaces the whole queue, so no separate reset() call is needed —
        // this only ever plays one track at a time, matching our own Supabase-driven queue.
        await TrackPlayer.setMediaItems([track]);
        await TrackPlayer.play();
        // Only from this point on is it safe to trust playbackState signals
        // as actually describing THIS track rather than the previous one.
        hasStartedRef.current = true;
      } catch (err) {
        // Log for debugging, and skip forward rather than leaving the jukebox
        // stuck on a track that will never play.
        console.error('Plex playback failed for', item.title, err);
        onEnded();
      }
    })();

    // Critical: stop playback whenever this component goes away, for any
    // reason — without this, a track that's still actually playing keeps
    // going in the native layer even though the UI has moved on.
    return () => {
      (async () => {
        try {
          // Wrapped in try/await rather than chaining .catch() directly —
          // same reasoning as setupPlayer() earlier: pause() doesn't always
          // reliably return a real Promise either, and calling .catch() on
          // whatever it returns instead threw "Cannot read property 'catch'
          // of undefined" here.
          await TrackPlayer.pause();
        } catch {
          // no-op
        }
      })();
    };
  }, [item.id]);

  useEffect(() => {
    // Logged so a repeat of the "audio still playing, wrong screen showing"
    // issue can be diagnosed from real data rather than guesswork.
    console.log(`[Plex] ${item.title} playbackState ->`, playbackState);
    if (!hasStartedRef.current) return; // ignore stale state from the previous track
    if (playbackState === PlaybackState.Ended || playbackState === PlaybackState.Error) {
      onEnded();
    }
  }, [playbackState]);

  useEffect(() => {
    onProgress?.(position, duration);
  }, [position, duration]);

  // Sized as a fraction of the smaller screen dimension, capped so it
  // doesn't grow unbounded on very large displays. The glow halo (NeonGlow)
  // extends outward to ~1.42x whatever size it's given, so this fraction
  // must stay under ~0.7 to avoid the outer ring clipping against the
  // screen edges — 0.68 leaves a small safety margin below that limit.
  const artSize =
    containerSize.width > 0
      ? Math.min(Math.min(containerSize.width, containerSize.height) * 0.68, 380)
      : 220;

  // A square at least as large as the container's longer side, centered,
  // fully covers the container regardless of its aspect ratio — a small 8%
  // buffer avoids any hairline gap at the edges.
  const backdropSize = Math.max(containerSize.width, containerSize.height) * 1.08;

  return (
    <Pressable
      style={styles.container}
      onLayout={(e) => setContainerSize({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })}
      onPress={() => (playing ? TrackPlayer.pause() : TrackPlayer.play())}
    >
      {/* Ambient backdrop: this track's own artwork, heavily blurred and
          scaled to fill the whole screen — fills the black space around the
          art/halo with something connected to what's actually playing,
          rather than empty background.
          Deliberately NOT using resizeMode here — Android has a confirmed,
          long-standing bug where specifying any resizeMode on an Image
          silently disables blurRadius entirely. Since Plex art is already
          ~square, rendering it as a large square (sized to guarantee full
          coverage) avoids needing resizeMode at all: a square source into a
          square box can't distort regardless of default scaling behavior. */}
      {item.thumbnail_url && containerSize.width > 0 && (
        <Image
          source={{ uri: item.thumbnail_url }}
          blurRadius={30}
          style={{
            position: 'absolute',
            width: backdropSize,
            height: backdropSize,
            left: (containerSize.width - backdropSize) / 2,
            top: (containerSize.height - backdropSize) / 2,
          }}
        />
      )}
      <View style={styles.scrim} />
      <NeonTint opacity={0.12} />

      <View style={{ width: artSize, height: artSize, alignItems: 'center', justifyContent: 'center' }}>
        <NeonGlow size={artSize} />
        <Image
          source={{ uri: item.thumbnail_url ?? undefined }}
          style={[styles.art, { width: artSize, height: artSize }]}
          resizeMode="cover"
        />
      </View>
      <Text style={styles.title} numberOfLines={2}>
        {item.title}
      </Text>
      <Text style={styles.artist} numberOfLines={1}>
        {item.artist}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    overflow: 'hidden',
  },
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(8,8,14,0.7)' },
  art: { borderRadius: 16, backgroundColor: colors.card },
  title: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: '700',
    marginTop: 18,
    paddingHorizontal: 24,
    textAlign: 'center',
  },
  artist: { color: colors.blueBright, fontSize: 16, marginTop: 4 },
});
