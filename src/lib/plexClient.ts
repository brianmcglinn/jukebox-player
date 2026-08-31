import type { SearchResult } from '../types';

const PLEX_SERVER = process.env.EXPO_PUBLIC_PLEX_SERVER_URL!;
const PLEX_TOKEN = process.env.EXPO_PUBLIC_PLEX_TOKEN!;

export async function searchPlexMusic(query: string): Promise<SearchResult[]> {
  const res = await fetch(
    `${PLEX_SERVER}/hubs/search?query=${encodeURIComponent(query)}&limit=15`,
    { headers: { 'X-Plex-Token': PLEX_TOKEN, Accept: 'application/json' } }
  );
  const json = await res.json();
  const trackHub = (json.MediaContainer.Hub ?? []).find((h: any) => h.type === 'track');

  return (trackHub?.Metadata ?? []).map((t: any) => ({
    source: 'plex' as const,
    sourceId: t.ratingKey,
    title: t.title,
    artist: t.grandparentTitle ?? null,
    thumbnailUrl: t.thumb ? `${PLEX_SERVER}${t.thumb}?X-Plex-Token=${PLEX_TOKEN}` : null,
    durationSeconds: t.duration ? Math.round(t.duration / 1000) : null,
  }));
}

// Resolved fresh right before playback, not stored in the queue row.
export async function getPlexStreamUrl(ratingKey: string): Promise<string> {
  const res = await fetch(
    `${PLEX_SERVER}/library/metadata/${ratingKey}?X-Plex-Token=${PLEX_TOKEN}`,
    { headers: { Accept: 'application/json' } }
  );
  const json = await res.json();
  const part = json.MediaContainer.Metadata[0].Media[0].Part[0];
  return `${PLEX_SERVER}${part.key}?X-Plex-Token=${PLEX_TOKEN}`;
}
