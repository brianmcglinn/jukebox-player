import type { SearchResult } from '../types';

// Same values already registered in the Spotify Developer Dashboard and
// used by the spotify-remote native module — shared here so
// SpotifyNowPlaying doesn't need its own duplicate copy.
export const SPOTIFY_CLIENT_ID = '721a089792744e7f900924bdd08863f4';
export const SPOTIFY_REDIRECT_URI = 'jukeboxplayer://spotify-auth';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!.replace(/\/+$/, '');
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export interface SpotifyArtist {
  id: string;
  name: string;
  thumbnailUrl: string | null;
}

export interface SpotifyAlbum {
  id: string;
  title: string;
  year: number | null;
  thumbnailUrl: string | null;
}

// Shared fetch helper for the spotify-search function — calls our own
// backend (Client Credentials flow), never Spotify directly, so no Spotify
// token or secret of any kind ever exists on a client device. Completely
// separate from the spotify-remote native module, which only handles
// playback control on the Odroid.
const DEFAULT_TIMEOUT_MS = 20_000;
// The all-albums call makes up to ~12 sequential Spotify requests server-side.
const ALL_ALBUMS_TIMEOUT_MS = 45_000;

async function fetchSpotifyFunction(queryString: string, timeoutMs: number = DEFAULT_TIMEOUT_MS): Promise<any> {
  const url = `${SUPABASE_URL}/functions/v1/spotify-search?${queryString}`;
  // fetch() in React Native has no timeout of its own — without this, an
  // unreachable backend leaves the UI on a spinner for minutes.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    let res: Response;
    try {
      res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          apikey: SUPABASE_ANON_KEY,
        },
        signal: controller.signal,
      });
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        console.error(`[Spotify search] Timed out after ${timeoutMs}ms: ${url}`);
        throw new Error('Spotify search took too long to respond. Please try again.');
      }
      console.error(`[Spotify search] Request failed: ${url}`, err);
      throw new Error('Could not reach the Spotify search function. Check it is deployed on HERMES.');
    }

    if (!res.ok) {
      const bodyText = await res.text().catch(() => '');
      console.error(`[Spotify search] ${res.status} ${res.statusText} for ${url} — body: ${bodyText}`);
      if (/429|rate limit|QUOTA_EXCEEDED/i.test(bodyText)) {
        throw new Error('Spotify is temporarily limiting requests. Please try again in a few minutes.');
      }
      throw new Error(`Spotify search failed (${res.status}): ${bodyText || res.statusText}`);
    }

    const json = await res.json();
    if (json.error) {
      console.error('[Spotify search] Function returned an error:', json.error);
      throw new Error('Spotify search failed — check the function logs on HERMES.');
    }
    return json;
  } finally {
    clearTimeout(timer);
  }
}

export async function searchSpotifyTracks(query: string): Promise<SearchResult[]> {
  const json = await fetchSpotifyFunction(`q=${encodeURIComponent(query)}&type=track`);
  return json.results ?? [];
}

export async function searchSpotifyArtists(query: string): Promise<SpotifyArtist[]> {
  const json = await fetchSpotifyFunction(`q=${encodeURIComponent(query)}&type=artist`);
  return json.artists ?? [];
}

export interface SpotifyArtistAlbums {
  // Oldest-first.
  albums: SpotifyAlbum[];
  // How many albums Spotify says the artist has. Can exceed albums.length
  // (the backend caps very large discographies, and a rate-limit mid-load
  // returns what it got so far — `partial`).
  total: number;
  partial: boolean;
}

// Session cache so re-opening an artist (or backing out of an album and
// going back in) costs nothing. Complete results only — a partial one is
// retried next time. The backend keeps its own, longer-lived cache too.
const artistAlbumsCache = new Map<string, SpotifyArtistAlbums>();

// An artist's whole discography in one call. (This replaced the old
// "Load More Albums" paging: the backend now does the paging itself,
// carefully, and caches the result.)
export async function getAllSpotifyAlbumsForArtist(artistId: string): Promise<SpotifyArtistAlbums> {
  const cached = artistAlbumsCache.get(artistId);
  if (cached) return cached;

  const json = await fetchSpotifyFunction(
    `type=artist-albums-all&artistId=${encodeURIComponent(artistId)}`,
    ALL_ALBUMS_TIMEOUT_MS
  );
  // An older deployment of the function doesn't know this `type` and falls
  // through to its plain-search branch, which answers with `results`, not
  // `albums`. Surface that as an error instead of a silently empty album list.
  if (!Array.isArray(json.albums)) {
    throw new Error('The Spotify search function on HERMES needs updating (no album list in its response).');
  }
  const result: SpotifyArtistAlbums = {
    albums: json.albums,
    total: json.total ?? 0,
    partial: !!json.partial,
  };
  if (!result.partial) artistAlbumsCache.set(artistId, result);
  return result;
}

export async function getSpotifyTracksForAlbum(
  albumId: string,
  albumArt: string | null
): Promise<SearchResult[]> {
  const artParam = albumArt ? `&albumArt=${encodeURIComponent(albumArt)}` : '';
  const json = await fetchSpotifyFunction(`type=album-tracks&albumId=${encodeURIComponent(albumId)}${artParam}`);
  return json.results ?? [];
}

// Spotify's Feb 2026 changes removed the dedicated "artist's top tracks"
// endpoint entirely. This approximates it using the one endpoint (basic
// search) confirmed still working — Spotify's own relevance ranking
// generally surfaces an artist's better-known tracks first for a query like
// this, but it's not a guaranteed "top tracks" chart the removed endpoint
// would have given. No longer used by the main drill-down flow (which now
// goes through albums instead), kept in case it's useful elsewhere.
export async function getSpotifyTracksByArtist(artistName: string): Promise<SearchResult[]> {
  const filterQuery = `artist:"${artistName}"`;
  const json = await fetchSpotifyFunction(`q=${encodeURIComponent(filterQuery)}&type=track`);
  return json.results ?? [];
}

// Retained for anything still calling the original name.
export const searchSpotifyMusic = searchSpotifyTracks;
