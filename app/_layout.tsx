import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import TrackPlayer from '@rntp/player';
import { startKioskMode } from '../modules/kiosk';
import { BackExitHandler } from '../src/components/BackExitHandler';

export default function RootLayout() {
  useEffect(() => {
    startKioskMode();
    (async () => {
      try {
        // Wrapped in try/await rather than chaining .then()/.catch() directly —
        // on some devices, setupPlayer's first call doesn't reliably return a
        // real Promise (a known timing quirk in this library), and `await`
        // handles that gracefully where a direct .catch() would crash.
        await TrackPlayer.setupPlayer({
          contentType: 'music',
          handleAudioBecomingNoisy: true,
          android: { wakeMode: 'network' },
        });
      } catch {
        // no-op — setupPlayer also throws if called twice (e.g. on fast refresh)
      }
    })();
  }, []);

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Stack screenOptions={{ headerShown: false }} />
        <BackExitHandler />
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}
