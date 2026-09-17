export type ItemSource = 'plex' | 'youtube' | 'spotify';
export type ItemStatus = 'queued' | 'playing' | 'played' | 'skipped';
export type AddedFrom = 'mobile' | 'jukebox';

// Matches a row in the queue_items table
export interface QueueItem {
  id: string;
  status: ItemStatus;
  source: ItemSource;
  source_id: string;
  title: string;
  artist: string | null;
  thumbnail_url: string | null;
  duration_seconds: number | null;
  position: number;
  added_by: string;
  added_from: AddedFrom;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
}

// Shape returned by the Plex/YouTube search clients, before it's been added
export interface SearchResult {
  source: ItemSource;
  sourceId: string;
  title: string;
  artist: string | null;
  thumbnailUrl: string | null;
  durationSeconds: number | null;
}

// Plex library-browsing types (artist/album/genre/mood/style/playlist drill-down)
export interface PlexArtist {
  ratingKey: string;
  name: string;
  thumbnailUrl: string | null;
}

export interface PlexAlbum {
  ratingKey: string;
  title: string;
  year: number | null;
  thumbnailUrl: string | null;
}

export interface PlexFilterValue {
  key: string;
  fastKey: string | null;
  title: string;
}

export interface PlexPlaylist {
  ratingKey: string;
  title: string;
  trackCount: number;
  thumbnailUrl: string | null;
}
