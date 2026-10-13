import type { SearchResult, PlexArtist, PlexAlbum, PlexFilterValue, PlexPlaylist } from '../types';

const PLEX_SERVER = process.env.EXPO_PUBLIC_PLEX_SERVER_URL!.replace(/\/+$/, '');
const PLEX_TOKEN = process.env.EXPO_PUBLIC_PLEX_TOKEN!;

// Shared fetch wrapper for every Plex call in this file.
//
// Two jobs beyond a bare fetch():
//  1. Logging — a failed connection (blocked cleartext traffic, wrong IP,
//     expired token, Plex down) logs the specific URL and error, visible via
//     `adb logcat` on a standalone build, instead of looking identical to
//     "there just aren't any matches."
//  2. A hard timeout. React Native's HTTP client has NO connect timeout of
//     its own, so if the device simply can't route to the Plex host (TV on a
//     different VLAN / guest Wi-Fi, client isolation, firewall dropping the
//     packets) fetch() waits for the OS-level TCP timeout — minutes — and the
//     browse/search screens sit on a spinner the whole time. With the timeout
//     the screens get a real, readable error within seconds instead.
//     The timer covers reading the response body too, not just the headers.
const DEFAULT_TIMEOUT_MS = 15_000;
const LIBRARY_TIMEOUT_MS = 40_000; // whole-library listings can be big

async function plexFetch(path: string, timeoutMs: number = DEFAULT_TIMEOUT_MS): Promise<any> {
  const url = `${PLEX_SERVER}${path}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    let res: Response;
    try {
      res = await fetch(url, {
        headers: { 'X-Plex-Token': PLEX_TOKEN, Accept: 'application/json' },
        signal: controller.signal,
      });
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        console.error(`[Plex] Timed out after ${timeoutMs}ms: ${url}`);
        throw new Error(
          `Plex at ${PLEX_SERVER} didn't respond in ${Math.round(timeoutMs / 1000)} seconds. ` +
            `Check that this device is on the same network as the Plex server.`
        );
      }
      console.error(`[Plex] Request failed: ${url}`, err);
      throw new Error(`Could not reach Plex at ${PLEX_SERVER}. Check the server is running and reachable.`);
    }
    if (!res.ok) {
      console.error(`[Plex] ${res.status} ${res.statusText} for ${url}`);
      throw new Error(`Plex returned ${res.status} ${res.statusText} for ${path}`);
    }
    try {
      return await res.json();
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        console.error(`[Plex] Timed out reading response after ${timeoutMs}ms: ${url}`);
        throw new Error(`Plex at ${PLEX_SERVER} stopped responding partway through. Try again.`);
      }
      throw err;
    }
  } finally {
    clearTimeout(timer);
  }
}

function thumbUrl(thumb: string | null | undefined): string | null {
  return thumb ? `${PLEX_SERVER}${thumb}?X-Plex-Token=${PLEX_TOKEN}` : null;
}

export async function searchPlexMusic(query: string): Promise<SearchResult[]> {
  const json = await plexFetch(`/hubs/search?query=${encodeURIComponent(query)}&limit=15`);
  const trackHub = (json.MediaContainer.Hub ?? []).find((h: any) => h.type === 'track');

  return (trackHub?.Metadata ?? []).map((t: any) => ({
    source: 'plex' as const,
    sourceId: t.ratingKey,
    title: t.title,
    artist: t.grandparentTitle ?? null,
    thumbnailUrl: thumbUrl(t.thumb),
    durationSeconds: t.duration ? Math.round(t.duration / 1000) : null,
  }));
}

// Resolved fresh right before playback, not stored in the queue row.
export async function getPlexStreamUrl(ratingKey: string): Promise<string> {
  const json = await plexFetch(`/library/metadata/${ratingKey}`);
  // Optional chaining throughout — a malformed/unexpected response shape now
  // throws one clear, specific error instead of an ambiguous native crash.
  const part = json?.MediaContainer?.Metadata?.[0]?.Media?.[0]?.Part?.[0];
  if (!part?.key) {
    throw new Error(`Plex returned no playable media for ratingKey ${ratingKey}`);
  }
  return `${PLEX_SERVER}${part.key}?X-Plex-Token=${PLEX_TOKEN}`;
}

let cachedMusicSectionId: string | null = null;

async function getMusicSectionId(): Promise<string> {
  if (cachedMusicSectionId) return cachedMusicSectionId;
  const json = await plexFetch('/library/sections');
  const musicSection = (json.MediaContainer.Directory ?? []).find((d: any) => d.type === 'artist');
  if (!musicSection) throw new Error('No music library section found on this Plex server.');
  cachedMusicSectionId = musicSection.key;
  return cachedMusicSectionId!;
}

function toSearchResult(t: any): SearchResult {
  return {
    source: 'plex' as const,
    sourceId: t.ratingKey,
    title: t.title,
    artist: t.grandparentTitle ?? null,
    thumbnailUrl: thumbUrl(t.thumb),
    durationSeconds: t.duration ? Math.round(t.duration / 1000) : null,
  };
}

export async function listPlexArtists(): Promise<PlexArtist[]> {
  const sectionId = await getMusicSectionId();
  const json = await plexFetch(`/library/sections/${sectionId}/all?type=8&sort=titleSort`, LIBRARY_TIMEOUT_MS);
  const items = json.MediaContainer.Metadata ?? [];
  return items.map((a: any) => ({
    ratingKey: a.ratingKey,
    name: a.title,
    thumbnailUrl: thumbUrl(a.thumb),
  }));
}

export async function listPlexAlbumsForArtist(artistRatingKey: string): Promise<PlexAlbum[]> {
  const json = await plexFetch(`/library/metadata/${artistRatingKey}/children?sort=year:desc`);
  const items = json.MediaContainer.Metadata ?? [];
  return items.map((al: any) => ({
    ratingKey: al.ratingKey,
    title: al.title,
    year: al.year ?? null,
    thumbnailUrl: thumbUrl(al.thumb),
  }));
}

export async function listPlexTracksForAlbum(albumRatingKey: string): Promise<SearchResult[]> {
  const json = await plexFetch(`/library/metadata/${albumRatingKey}/children`);
  const items = json.MediaContainer.Metadata ?? [];
  return items.map(toSearchResult);
}

export async function listPlexGenres(): Promise<PlexFilterValue[]> {
  // Scoped to type=9 (albums) — this matches how genre is tagged in this
  // library (at the album level) and mirrors the "by Album Artist" genre
  // view in the Plex client itself, rather than Plex's much larger/noisier
  // default set of track-level genre tags.
  const sectionId = await getMusicSectionId();
  const json = await plexFetch(`/library/sections/${sectionId}/genre?type=9`);
  const items = json.MediaContainer.Directory ?? [];
  return items.map((d: any) => ({
    key: d.key,
    fastKey: d.fastKey ?? null,
    title: d.title,
  }));
}

export async function listPlexAlbumsForGenre(genreValue: PlexFilterValue): Promise<PlexAlbum[]> {
  // Deliberately not using genreValue.fastKey here — it has proven unreliable
  // twice now (previously returned track/artist-scoped results unexpectedly).
  // Always construct the query explicitly so the type=9 (album) scope is
  // guaranteed rather than assumed.
  const sectionId = await getMusicSectionId();
  const json = await plexFetch(
    `/library/sections/${sectionId}/all?genre=${encodeURIComponent(genreValue.key)}&type=9`,
    LIBRARY_TIMEOUT_MS
  );
  const items = json.MediaContainer.Metadata ?? [];
  return items.map((al: any) => ({
    ratingKey: al.ratingKey,
    title: al.title,
    year: al.year ?? null,
    thumbnailUrl: thumbUrl(al.thumb),
    artistName: al.parentTitle ?? null,
  }));
}

// Plex auto-generates several system/smart playlists that aren't things a
// guest would ever want to add songs from, and there's no reliable API flag
// that distinguishes all of them cleanly — so this filters by name instead.
// Add more titles here (lowercase) if other auto-generated playlists show up.
const EXCLUDED_PLAYLIST_TITLES = new Set([
  'liked songs',
  'fresh liked songs',
  'all music',
  'recently added',
  'recently played',
]);

export async function listPlexPlaylists(): Promise<PlexPlaylist[]> {
  const json = await plexFetch('/playlists?playlistType=audio');
  const items = json.MediaContainer.Metadata ?? [];
  return items
    .filter((p: any) => !EXCLUDED_PLAYLIST_TITLES.has((p.title ?? '').trim().toLowerCase()))
    .map((p: any) => ({
      ratingKey: p.ratingKey,
      title: p.title,
      trackCount: p.leafCount ?? 0,
      thumbnailUrl: thumbUrl(p.thumb ?? p.composite),
    }));
}

export async function listPlexTracksForPlaylist(playlistRatingKey: string): Promise<SearchResult[]> {
  const json = await plexFetch(`/playlists/${playlistRatingKey}/items`);
  const items = json.MediaContainer.Metadata ?? [];
  return items.map(toSearchResult);
}
