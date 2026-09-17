import { useState, useEffect } from 'react';
import { View } from 'react-native';
import { supabase } from '../lib/supabase';
import { useJukeboxPlayback } from '../hooks/useJukeboxPlayback';
import { IdleAttractScreen } from './IdleAttractScreen';
import { NowPlayingScreen } from './NowPlayingScreen';
import { JukeboxSearchScreen } from './JukeboxSearchScreen';
import { AdminGateButton } from '../components/AdminGateButton';

export function JukeboxRoot() {
  const { nowPlaying, advance, hasLoadedOnce, advancing } = useJukeboxPlayback();
  const [pendingCount, setPendingCount] = useState<number | null>(null);
  const [showSearch, setShowSearch] = useState(false);

  useEffect(() => {
    const check = async () => {
      const { count } = await supabase
        .from('queue_items')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'queued');
      setPendingCount(count ?? 0);
    };
    check();
    const channel = supabase
      .channel('queue-count')
      .on('postgres_changes', { event: '*', schema: 'mcjukebox', table: 'queue_items' }, check)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Not loaded yet, or actively transitioning between songs, is treated the
  // same as idle — without this, a stale/just-finished nowPlaying value
  // (real, but no longer accurate) kept rendering its glow/backdrop for as
  // long as the async advance()/initial-check round-trip took, looking like
  // a frozen black screen before the real state caught up.
  const isIdle = !hasLoadedOnce || advancing || (!nowPlaying && (pendingCount ?? 0) === 0);
  const showingPlayer = !isIdle && !!nowPlaying;
  const splitLayout = showSearch && showingPlayer;

  return (
    <View style={{ flex: 1, flexDirection: splitLayout ? 'row' : 'column' }}>
      {showingPlayer && (
        // Side-by-side (not stacked) when search is open — a touch anywhere
        // over the video toggles YouTube's own built-in play/pause, so search
        // needs to live in genuinely separate screen real estate, not just
        // below a measured boundary. This also gives search noticeably more
        // room for results than squeezing it under the video ever could.
        // Stays mounted the whole time (never unmounts for search) so audio
        // keeps playing uninterrupted — only the surrounding chrome (up-next
        // strip, buttons) hides via compact mode, not the player itself.
        <View style={{ flex: splitLayout ? 0.42 : 1 }}>
          <NowPlayingScreen
            nowPlaying={nowPlaying}
            advance={advance}
            onAddMore={() => setShowSearch(true)}
            compact={splitLayout}
          />
        </View>
      )}

      {isIdle && !showSearch && <IdleAttractScreen onTap={() => setShowSearch(true)} />}

      {showSearch && (
        <View style={{ flex: showingPlayer ? 0.58 : 1 }}>
          <JukeboxSearchScreen onDone={() => setShowSearch(false)} />
        </View>
      )}

      <AdminGateButton />
    </View>
  );
}
