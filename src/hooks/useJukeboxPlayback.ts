import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { QueueItem } from '../types';

export function useJukeboxPlayback() {
  const [nowPlaying, setNowPlaying] = useState<QueueItem | null>(null);

  useEffect(() => {
    (async () => {
      const { data: playing } = await supabase
        .from('queue_items')
        .select('*')
        .eq('status', 'playing')
        .maybeSingle();

      if (playing) {
        setNowPlaying(playing);
      } else {
        const { data } = await supabase.rpc('start_if_idle');
        setNowPlaying(data ?? null);
      }
    })();

    const channel = supabase
      .channel('jukebox-playback')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'mcjukebox', table: 'queue_items' },
        async (payload) => {
          if ((payload.new as QueueItem).status !== 'queued') return;
          const { data: playing } = await supabase
            .from('queue_items')
            .select('id')
            .eq('status', 'playing')
            .maybeSingle();
          if (!playing) {
            const { data } = await supabase.rpc('start_if_idle');
            if (data) setNowPlaying(data);
          }
        }
      )
      .subscribe();

    // Safety net — realtime can drop silently on network blips
    const poll = setInterval(async () => {
      const { data } = await supabase
        .from('queue_items')
        .select('*')
        .eq('status', 'playing')
        .maybeSingle();
      setNowPlaying((prev) => (data?.id !== prev?.id ? data ?? null : prev));
    }, 15000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(poll);
    };
  }, []);

  const advance = async () => {
    if (!nowPlaying) return;
    const { data } = await supabase.rpc('complete_and_advance', { finished_item_id: nowPlaying.id });
    setNowPlaying(data ?? null);
  };

  return { nowPlaying, advance };
}
