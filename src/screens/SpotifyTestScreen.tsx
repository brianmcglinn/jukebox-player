import { useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import * as SpotifyRemote from '../../modules/spotify-remote';
import { colors } from '../lib/colors';

// Same Client ID and redirect URI already registered in the Spotify
// Developer Dashboard throughout this project — no new Dashboard changes
// needed for this module specifically. Note this is NOT a browser redirect
// URI in this flow; App Remote uses it only as an identifier when Spotify's
// own app shows its native authorization prompt.
const SPOTIFY_CLIENT_ID = '721a089792744e7f900924bdd08863f4';
const REDIRECT_URI = 'jukeboxplayer://spotify-auth';

const TEST_TRACK_URI = 'spotify:track:6IA8E2Q5ttcpbuahIejO74';

type LogLine = { text: string; isError: boolean };

export function SpotifyTestScreen() {
  const [log, setLog] = useState<LogLine[]>([]);
  const [connected, setConnected] = useState(false);
  const [working, setWorking] = useState(false);

  function addLog(text: string, isError = false) {
    setLog((prev) => [...prev, { text, isError }]);
  }

  useEffect(() => {
    const connSub = SpotifyRemote.addConnectionListener(() => {
      setConnected(true);
      addLog('onConnected event received. ✓');
    });
    const discSub = SpotifyRemote.addDisconnectionListener(() => {
      setConnected(false);
      addLog('onDisconnected event received.');
    });
    const errSub = SpotifyRemote.addErrorListener((err) => {
      addLog(`Native error event: ${err.message}`, true);
    });
    const stateSub = SpotifyRemote.addPlayerStateListener((state) => {
      addLog(
        `Player state: ${state.trackName ?? '(no track)'} — paused=${state.isPaused} pos=${state.playbackPositionMs}ms`
      );
    });

    return () => {
      connSub.remove();
      discSub.remove();
      errSub.remove();
      stateSub.remove();
    };
  }, []);

  async function handleConnect() {
    setWorking(true);
    addLog('Calling SpotifyRemote.connect()...');
    try {
      await SpotifyRemote.connect(SPOTIFY_CLIENT_ID, REDIRECT_URI);
      addLog('connect() resolved. ✓');
    } catch (err) {
      addLog(`connect() failed: ${String(err)}`, true);
    } finally {
      setWorking(false);
    }
  }

  async function handlePlayTestTrack() {
    setWorking(true);
    addLog(`Calling play(${TEST_TRACK_URI})...`);
    try {
      await SpotifyRemote.play(TEST_TRACK_URI);
      addLog('play() succeeded — check for audio now. ✓');
    } catch (err) {
      addLog(`play() failed: ${String(err)}`, true);
    } finally {
      setWorking(false);
    }
  }

  function handleDisconnect() {
    SpotifyRemote.disconnect();
    addLog('disconnect() called.');
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Spotify — Native App Remote Module</Text>
      <Text style={styles.subtitle}>
        Talks directly to the official Spotify App Remote SDK — no browser,
        no OAuth redirect, no wwdrew wrapper involved at all.
      </Text>

      <Pressable
        onPress={handleConnect}
        disabled={working || connected}
        style={[styles.button, (working || connected) && { opacity: 0.5 }]}
      >
        <Text style={styles.buttonText}>{connected ? 'Connected ✓' : 'Connect to Spotify'}</Text>
      </Pressable>

      <Pressable
        onPress={handlePlayTestTrack}
        disabled={working || !connected}
        style={[styles.button, styles.playButton, (working || !connected) && { opacity: 0.5 }]}
      >
        <Text style={styles.buttonText}>Play Test Track</Text>
      </Pressable>

      <Pressable onPress={handleDisconnect} disabled={!connected} style={styles.disconnectLink}>
        <Text style={{ color: '#999' }}>Disconnect</Text>
      </Pressable>

      <ScrollView style={styles.log} contentContainerStyle={{ padding: 12 }}>
        {log.map((line, i) => (
          <Text key={i} style={[styles.logLine, line.isError && styles.logLineError]}>
            {line.text}
          </Text>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111', padding: 24 },
  title: { color: 'white', fontSize: 24, fontWeight: '700', marginBottom: 8 },
  subtitle: { color: '#999', fontSize: 14, marginBottom: 20, lineHeight: 20 },
  button: {
    backgroundColor: colors.green,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  playButton: { backgroundColor: colors.purple },
  buttonText: { color: '#000', fontWeight: '800', fontSize: 16 },
  disconnectLink: { alignItems: 'center', marginBottom: 20, padding: 8 },
  log: { flex: 1, backgroundColor: '#1c1c1e', borderRadius: 12 },
  logLine: { color: '#ccc', fontSize: 14, marginBottom: 8, fontFamily: 'monospace' },
  logLineError: { color: colors.error },
});
