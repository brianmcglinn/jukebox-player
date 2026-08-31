import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import TrackPlayer from 'react-native-track-player';
import { startKioskMode } from '../modules/kiosk';

export default function RootLayout() {
  useEffect(() => {
    startKioskMode();
    TrackPlayer.setupPlayer().catch(() => {
      // no-op — setupPlayer throws if called twice (e.g. on fast refresh)
    });
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }} />
    </GestureHandlerRootView>
  );
}
