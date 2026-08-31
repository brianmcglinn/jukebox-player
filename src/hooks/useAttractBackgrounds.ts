import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

// Shown until at least one song has played, then replaced by recently-played
// album art. Drop three real photos in /assets named attract-1/2/3.jpg.
const FALLBACK_IMAGES = [
  require('../../assets/attract-1.jpg'),
  require('../../assets/attract-2.jpg'),
  require('../../assets/attract-3.jpg'),
];

export function useAttractBackgrounds() {
  const [images, setImages] = useState<(string | number)[]>(FALLBACK_IMAGES);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('queue_items')
        .select('thumbnail_url')
        .eq('status', 'played')
        .not('thumbnail_url', 'is', null)
        .order('completed_at', { ascending: false })
        .limit(10);

      const urls = (data ?? []).map((d) => d.thumbnail_url).filter(Boolean) as string[];
      if (!cancelled && urls.length > 0) setImages(urls);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return images;
}
