import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useJukeboxPlayback } from '../hooks/useJukeboxPlayback';
import { IdleAttractScreen } from './IdleAttractScreen';
import { NowPlayingScreen } from './NowPlayingScreen';
import { JukeboxSearchScreen } from './JukeboxSearchScreen';

export function JukeboxRoot() {
  const { nowPlaying, advance } = useJukeboxPlayback();
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

  const isIdle = !nowPlaying && (pendingCount ?? 0) === 0;

  if (showSearch) return <JukeboxSearchScreen onDone={() => setShowSearch(false)} />;
  if (isIdle) return <IdleAttractScreen onTap={() => setShowSearch(true)} />;
  return nowPlaying ? (
    <NowPlayingScreen nowPlaying={nowPlaying} advance={advance} onAddMore={() => setShowSearch(true)} />
  ) : null;
}
