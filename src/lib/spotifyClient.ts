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
async function fetchSpotifyFunction(queryString: string): Promise<any> {
  const url = `${SUPABASE_URL}/functions/v1/spotify-search?${queryString}`;
  let res: Response;
  try {
    res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        apikey: SUPABASE_ANON_KEY,
      },
    });
  } catch (err) {
    console.error(`[Spotify search] Request failed: ${url}`, err);
    throw new Error('Could not reach the Spotify search function. Check it is deployed on HERMES.');
  }

  if (!res.ok) {
    const bodyText = await res.text().catch(() => '');
    console.error(`[Spotify search] ${res.status} ${res.statusText} for ${url} — body: ${bodyText}`);
    throw new Error(`Spotify search failed (${res.status}): ${bodyText || res.statusText}`);
  }

  const json = await res.json();
  if (json.error) {
    console.error('[Spotify search] Function returned an error:', json.error);
    throw new Error('Spotify search failed — check the function logs on HERMES.');
  }
  return json;
}

export async function searchSpotifyTracks(query: string): Promise<SearchResult[]> {
  const json = await fetchSpotifyFunction(`q=${encodeURIComponent(query)}&type=track`);
  return json.results ?? [];
}

export async function searchSpotifyArtists(query: string): Promise<SpotifyArtist[]> {
  const json = await fetchSpotifyFunction(`q=${encodeURIComponent(query)}&type=artist`);
  return json.artists ?? [];
}

export interface SpotifyAlbumPage {
  albums: SpotifyAlbum[];
  total: number;
}

export async function getSpotifyAlbumsForArtist(
  artistId: string,
  offset = 0,
  knownTotal?: number
): Promise<SpotifyAlbumPage> {
  // knownTotal is omitted on the first call for a given artist (the
  // backend doesn't know the total yet either, and does one small extra
  // lookup call to learn it) — every subsequent "Load More" call should
  // pass back the total from the previous response, so the backend can
  // compute the right page with exactly one Spotify call instead of
  // needing to look the total up again each time.
  const totalParam = knownTotal != null ? `&knownTotal=${knownTotal}` : '';
  const json = await fetchSpotifyFunction(
    `type=artist-albums&artistId=${encodeURIComponent(artistId)}&offset=${offset}${totalParam}`
  );
  return { albums: json.albums ?? [], total: json.total ?? 0 };
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
