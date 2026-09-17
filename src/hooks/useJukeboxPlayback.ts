import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { QueueItem } from '../types';

// Postgres functions that declare a row-typed variable (e.g. next_item
// mcjukebox.queue_items) and never SELECT INTO it — because nothing matched
// — return that variable anyway. PostgREST can serialize that as a real JSON
// object with every field set to null (e.g. {"id": null, "title": null, ...})
// rather than as a bare JSON null. That object is truthy in JS, so `data ??
// null` never catches it — it was being treated as a genuine now-playing
// item, which is exactly what produced a "song" with a null title and null
// source_id: PlexAudioNowPlaying would mount for it and try to fetch Plex
// metadata for the literal string "null", which only failed after a real
// network round-trip (the multi-second delay before the idle screen
// actually appeared).
function normalizeQueueItem(data: any): QueueItem | null {
  if (!data || !data.id) return null;
  return data as QueueItem;
}

export function useJukeboxPlayback() {
  const [nowPlaying, setNowPlaying] = useState<QueueItem | null>(null);
  // False until the very first "what's actually playing" check has
  // completed. Without this, the app briefly renders whatever nowPlaying's
  // initial null value implies, then can flash to a stale/leftover item the
  // instant that first check resolves, before correcting a moment later.
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  // True for the whole round-trip between a song ending and the next
  // state actually landing — advance() is async, so without this the
  // just-finished song (and its glow/backdrop) keeps rendering, looking
  // frozen, for as long as that round-trip takes.
  const [advancing, setAdvancing] = useState(false);

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
        setNowPlaying(normalizeQueueItem(data));
      }
      setHasLoadedOnce(true);
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
            const normalized = normalizeQueueItem(data);
            if (normalized) setNowPlaying(normalized);
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
      const normalized = normalizeQueueItem(data);
      setNowPlaying((prev) => (normalized?.id !== prev?.id ? normalized : prev));
    }, 15000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(poll);
    };
  }, []);

  const advance = async () => {
    if (!nowPlaying) return;
    setAdvancing(true);
    const { data, error } = await supabase.rpc('complete_and_advance', { finished_item_id: nowPlaying.id });
    if (error) {
      console.error('[useJukeboxPlayback] complete_and_advance RPC error:', error);
    }
    setNowPlaying(normalizeQueueItem(data));
    setAdvancing(false);
  };

  return { nowPlaying, advance, hasLoadedOnce, advancing };
}
