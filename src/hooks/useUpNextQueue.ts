import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { QueueItem } from '../types';

export function useUpNextQueue(limit = 6) {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [totalQueued, setTotalQueued] = useState(0);

  useEffect(() => {
    const fetchQueue = async () => {
      const [{ data }, { count }] = await Promise.all([
        supabase
          .from('queue_items')
          .select('*')
          .eq('status', 'queued')
          .order('position', { ascending: true })
          .limit(limit),
        supabase.from('queue_items').select('*', { count: 'exact', head: true }).eq('status', 'queued'),
      ]);
      setItems(data ?? []);
      setTotalQueued(count ?? 0);
    };
    fetchQueue();

    const channel = supabase
      .channel('up-next')
      .on('postgres_changes', { event: '*', schema: 'mcjukebox', table: 'queue_items' }, fetchQueue)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [limit]);

  return { items, totalQueued };
}
