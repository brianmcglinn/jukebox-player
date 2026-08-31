import type { SearchResult } from '../types';

const YT_API_KEY = process.env.EXPO_PUBLIC_YT_API_KEY!;

function parseIsoDuration(iso: string): number {
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/) ?? [];
  const [, h, m, s] = match;
  return (Number(h) || 0) * 3600 + (Number(m) || 0) * 60 + (Number(s) || 0);
}

export async function searchYouTubeMusic(query: string): Promise<SearchResult[]> {
  const searchRes = await fetch(
    `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoCategoryId=10&maxResults=15&q=${encodeURIComponent(query)}&key=${YT_API_KEY}`
  );
  const searchJson = await searchRes.json();
  const items = searchJson.items ?? [];
  const videoIds = items.map((i: any) => i.id.videoId).join(',');
  if (!videoIds) return [];

  const detailsRes = await fetch(
    `https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${videoIds}&key=${YT_API_KEY}`
  );
  const detailsJson = await detailsRes.json();
  const durationById = new Map<string, number>(
    (detailsJson.items ?? []).map((v: any) => [v.id, parseIsoDuration(v.contentDetails.duration)])
  );

  return items.map((i: any) => ({
    source: 'youtube' as const,
    sourceId: i.id.videoId,
    title: i.snippet.title,
    artist: i.snippet.channelTitle ?? null,
    thumbnailUrl: i.snippet.thumbnails?.medium?.url ?? null,
    durationSeconds: durationById.get(i.id.videoId) ?? null,
  }));
}
