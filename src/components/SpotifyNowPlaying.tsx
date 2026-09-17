import { useEffect, useRef, useState } from 'react';
import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
import * as SpotifyRemote from '../../modules/spotify-remote';
import { SPOTIFY_CLIENT_ID, SPOTIFY_REDIRECT_URI } from '../lib/spotifyClient';
import { colors } from '../lib/colors';
import { NeonGlow } from './NeonGlow';
import { NeonTint } from './NeonTint';
import type { QueueItem } from '../types';

// How close to the end (in ms) counts as "finished" rather than still
// playing — App Remote's player state doesn't give a clean "ended" event
// the way @rntp/player or the YouTube WebView do, so completion has to be
// inferred from position/duration/pause state instead.
const END_THRESHOLD_MS = 1500;

export function SpotifyNowPlaying({
  item,
  onEnded,
  onProgress,
}: {
  item: QueueItem;
  onEnded: () => void;
  onProgress?: (position: number, duration: number) => void;
}) {
  const loadedIdRef = useRef<string | null>(null);
  // Same reasoning as PlexAudioNowPlaying's hasStartedRef: player-state
  // events can briefly still reflect the PREVIOUS track right after this
  // component mounts, before our own play() call has taken effect —
  // without this guard that stale state could trigger an immediate,
  // incorrect "already ended" advance.
  const hasStartedRef = useRef(false);
  // Guards against onEnded() firing more than once for the same track —
  // Spotify can keep sending player-state updates for a short while after
  // a track actually finishes, and each one would otherwise independently
  // look like "still at/past the end."
  const hasEndedRef = useRef(false);
  // Set true only once a player-state event has actually shown trackUri
  // matching what we requested. Without this, the very first event after
  // play() resolves could still reflect a brief transitional moment before
  // Spotify has fully switched over — which looks identical to "the track
  // already changed away", causing an instant, incorrect advance before
  // the song ever actually started.
  const hasConfirmedCorrectTrackRef = useRef(false);
  const expectedUriRef = useRef<string | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  // Player-state events only fire on discrete transitions (play, pause,
  // resume, seek, track change) — App Remote has no continuous progress
  // tick. Audio keeps playing between events, so the displayed position
  // has to be interpolated locally using elapsed wall-clock time since the
  // last real event, rather than only updating when an event arrives.
  const lastKnownPositionMsRef = useRef(0);
  const lastKnownDurationMsRef = useRef(0);
  const lastEventTimeRef = useRef(Date.now());
  const isPausedRef = useRef(false);

  useEffect(() => {
    if (loadedIdRef.current === item.id) return;
    loadedIdRef.current = item.id;
    hasStartedRef.current = false;
    hasEndedRef.current = false;
    hasConfirmedCorrectTrackRef.current = false;
    expectedUriRef.current = item.source_id;
    console.log(`[Spotify] Starting "${item.title}" (${item.source_id})`);

    (async () => {
      try {
        // Connection is deliberately preserved across songs (see cleanup
        // below — pause(), not disconnect()), so this is a no-op most of
        // the time and only actually authorizes on the very first Spotify
        // track played since the app launched.
        if (!SpotifyRemote.isConnected()) {
          await SpotifyRemote.connect(SPOTIFY_CLIENT_ID, SPOTIFY_REDIRECT_URI);
        }
        await SpotifyRemote.play(item.source_id);
        hasStartedRef.current = true;
      } catch (err) {
        // Skip forward rather than leaving the jukebox stuck on a track
        // that will never play.
        console.error(`[Spotify] connect()/play() FAILED for "${item.title}":`, err);
        onEnded();
      }
    })();

    // Critical: pause playback whenever this component goes away, for any
    // reason — without this, a track that's still actually playing keeps
    // going in the background even though the UI has moved to a different
    // source. Deliberately pause() rather than disconnect() — the Odroid
    // stays plugged in, so there's no battery reason to tear the connection
    // down, and staying connected means the NEXT Spotify track (even after
    // Plex/YouTube songs in between) starts instantly with no reconnect.
    return () => {
      SpotifyRemote.pause().catch(() => {
        // no-op — nothing useful to do if this fails during teardown
      });
    };
  }, [item.id]);

  useEffect(() => {
    const stateSub = SpotifyRemote.addPlayerStateListener((state) => {
      if (!hasStartedRef.current || hasEndedRef.current) return; // ignore stale/duplicate signals

      const isExpectedTrack = expectedUriRef.current != null && state.trackUri === expectedUriRef.current;
      if (isExpectedTrack && !hasConfirmedCorrectTrackRef.current) {
        console.log(`[Spotify] "${item.title}" confirmed playing`);
      }
      if (isExpectedTrack) {
        hasConfirmedCorrectTrackRef.current = true;
      }

      if (state.durationMs != null) {
        lastKnownPositionMsRef.current = state.playbackPositionMs;
        lastKnownDurationMsRef.current = state.durationMs;
        lastEventTimeRef.current = Date.now();
        onProgress?.(state.playbackPositionMs / 1000, state.durationMs / 1000);
      }
      isPausedRef.current = state.isPaused;
      setIsPaused(state.isPaused);

      // Nothing past this point is trusted until we've seen at least one
      // event genuinely matching our own track — see
      // hasConfirmedCorrectTrackRef's comment above for why.
      if (!hasConfirmedCorrectTrackRef.current) return;

      const trackChangedAway = !isExpectedTrack;
      const reachedEnd =
        isExpectedTrack &&
        state.durationMs != null &&
        state.durationMs > 0 &&
        state.playbackPositionMs >= state.durationMs - END_THRESHOLD_MS &&
        state.isPaused;

      if (trackChangedAway || reachedEnd) {
        console.log(`[Spotify] "${item.title}" ended`);
        hasEndedRef.current = true;
        onEnded();
      }
    });

    const errSub = SpotifyRemote.addErrorListener((err) => {
      console.error(`[Spotify] error event for "${item.title}":`, err.message);
    });

    return () => {
      stateSub.remove();
      errSub.remove();
    };
  }, [item.id]);

  // Interpolates displayed position between real player-state events.
  // Only ever reads the refs above and reports a derived position —
  // never touches hasEndedRef/onEnded, so end-of-track detection stays
  // driven exclusively by real events, not by this local guess.
  useEffect(() => {
    const tick = setInterval(() => {
      if (isPausedRef.current || lastKnownDurationMsRef.current <= 0) return;
      const elapsed = Date.now() - lastEventTimeRef.current;
      const interpolatedMs = Math.min(
        lastKnownPositionMsRef.current + elapsed,
        lastKnownDurationMsRef.current
      );
      onProgress?.(interpolatedMs / 1000, lastKnownDurationMsRef.current / 1000);
    }, 250);
    return () => clearInterval(tick);
  }, []);

  function togglePlayPause() {
    if (isPaused) {
      SpotifyRemote.resume().catch(() => {});
    } else {
      SpotifyRemote.pause().catch(() => {});
    }
  }

  // Same sizing approach as PlexAudioNowPlaying, for visual consistency
  // between sources — see that file's comment for why 0.68/380 specifically.
  const artSize =
    containerSize.width > 0
      ? Math.min(Math.min(containerSize.width, containerSize.height) * 0.68, 380)
      : 220;
  const backdropSize = Math.max(containerSize.width, containerSize.height) * 1.08;

  return (
    <Pressable
      style={styles.container}
      onLayout={(e) => setContainerSize({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })}
      onPress={togglePlayPause}
    >
      {/* Same blurred-backdrop approach as Plex — deliberately no
          resizeMode (Android silently disables blurRadius whenever one is
          set), so a square sized to guarantee full coverage is used
          instead. Spotify album art is already square, matching Plex. */}
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
