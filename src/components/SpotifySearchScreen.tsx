import { useState, useEffect } from 'react';
import { View, Text, FlatList, TextInput, Pressable, Image, ActivityIndicator, StyleSheet } from 'react-native';
import {
  searchSpotifyTracks,
  searchSpotifyArtists,
  getSpotifyAlbumsForArtist,
  getSpotifyTracksForAlbum,
} from '../lib/spotifyClient';
import { useDebounce } from '../lib/useDebounce';
import { colors } from '../lib/colors';
import type { SearchResult } from '../types';
import type { SpotifyArtist, SpotifyAlbum } from '../lib/spotifyClient';

type SpotifyMode = 'song' | 'artist';

// Artist mode drills two levels deep: artist search results -> that
// artist's albums -> that album's tracks. Mirrors PlexBrowseScreen's own
// Artist -> Albums -> Tracks pattern for consistency between the two.
type DrillState =
  | { level: 'albums'; artist: SpotifyArtist }
  | { level: 'tracks'; artist: SpotifyArtist; album: SpotifyAlbum };

export function SpotifySearchScreen({ onSelectTrack }: { onSelectTrack: (track: SearchResult) => void }) {
  const [mode, setMode] = useState<SpotifyMode>('song');
  const [query, setQuery] = useState('');
  const [drill, setDrill] = useState<DrillState | null>(null);
  const [trackResults, setTrackResults] = useState<SearchResult[]>([]);
  const [artistResults, setArtistResults] = useState<SpotifyArtist[]>([]);
  const [albums, setAlbums] = useState<SpotifyAlbum[]>([]);
  const [albumsTotal, setAlbumsTotal] = useState(0);
  const [loadingMoreAlbums, setLoadingMoreAlbums] = useState(false);
  const [albumTracks, setAlbumTracks] = useState<SearchResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const debouncedQuery = useDebounce(query, 400);

  // Switching modes always exits any drill-down.
  useEffect(() => {
    setDrill(null);
    setAlbums([]);
    setAlbumsTotal(0);
    setAlbumTracks(null);
  }, [mode]);

  useEffect(() => {
    if (drill) return; // paused while drilled into an artist
    setError(null);
    if (debouncedQuery.trim().length < 2) {
      setTrackResults([]);
      setArtistResults([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const run = mode === 'song' ? searchSpotifyTracks(debouncedQuery) : searchSpotifyArtists(debouncedQuery);
    run
      .then((r) => {
        if (cancelled) return;
        if (mode === 'song') setTrackResults(r as SearchResult[]);
        else setArtistResults(r as SpotifyArtist[]);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message ?? 'Search failed');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, mode, drill]);

  async function handleSelectArtist(artist: SpotifyArtist) {
    setDrill({ level: 'albums', artist });
    setAlbums([]);
    setAlbumsTotal(0);
    setError(null);
    setLoading(true);
    try {
      const { albums: firstPage, total } = await getSpotifyAlbumsForArtist(artist.id, 0);
      setAlbums(firstPage);
      setAlbumsTotal(total);
    } catch (err: any) {
      setError(err.message ?? 'Could not load albums for this artist');
    } finally {
      setLoading(false);
    }
  }

  async function handleLoadMoreAlbums() {
    if (drill?.level !== 'albums' || loadingMoreAlbums) return;
    setLoadingMoreAlbums(true);
    setError(null);
    try {
      const { albums: nextPage } = await getSpotifyAlbumsForArtist(drill.artist.id, albums.length, albumsTotal);
      setAlbums((prev) => [...prev, ...nextPage]);
    } catch (err: any) {
      setError(err.message ?? 'Could not load more albums');
    } finally {
      setLoadingMoreAlbums(false);
    }
  }

  async function handleSelectAlbum(album: SpotifyAlbum) {
    if (drill?.level !== 'albums') return;
    setDrill({ level: 'tracks', artist: drill.artist, album });
    setAlbumTracks(null);
    setError(null);
    setLoading(true);
    try {
      const tracks = await getSpotifyTracksForAlbum(album.id, album.thumbnailUrl);
      setAlbumTracks(tracks);
    } catch (err: any) {
      setError(err.message ?? 'Could not load tracks for this album');
    } finally {
      setLoading(false);
    }
  }

  function handleBack() {
    if (drill?.level === 'tracks') {
      setDrill({ level: 'albums', artist: drill.artist });
      setAlbumTracks(null);
    } else {
      setDrill(null);
      setAlbums([]);
      setAlbumsTotal(0);
    }
  }

  const headerLabel =
    drill?.level === 'tracks'
      ? `${drill.artist.name} — ${drill.album.title}`
      : drill?.level === 'albums'
      ? drill.artist.name
      : null;

  return (
    <View style={{ flex: 1 }}>
      {drill ? (
        <Pressable onPress={handleBack} style={styles.backRow}>
          <Text style={styles.backText}>
            {drill.level === 'tracks' ? '‹ Back to Albums' : '‹ Back to Artists'}
          </Text>
        </Pressable>
      ) : (
        <View style={styles.modeRow}>
          {(['song', 'artist'] as const).map((m) => (
            <Pressable
              key={m}
              onPress={() => setMode(m)}
              style={[styles.modeTab, mode === m && styles.modeTabActive]}
            >
              <Text style={styles.modeTabText}>{m === 'song' ? 'Song' : 'Artist'}</Text>
            </Pressable>
          ))}
        </View>
      )}

      {headerLabel ? (
        <Text style={styles.artistHeader} numberOfLines={1}>
          {headerLabel}
        </Text>
      ) : (
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={mode === 'song' ? 'Search for a song...' : 'Search for an artist...'}
          placeholderTextColor="#888"
          style={styles.input}
        />
      )}

      {error && <Text style={styles.errorText}>{error}</Text>}

      {loading ? (
        <View style={{ padding: 32, alignItems: 'center' }}>
          <ActivityIndicator color={colors.purple} />
        </View>
      ) : drill?.level === 'tracks' ? (
        <FlatList
          data={albumTracks ?? []}
          keyExtractor={(t) => `${t.source}-${t.sourceId}`}
          renderItem={({ item }) => (
            <Pressable onPress={() => onSelectTrack(item)} style={styles.row}>
              <Image source={{ uri: item.thumbnailUrl ?? undefined }} style={styles.thumb} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.rowTitle} numberOfLines={1}>
                  {item.title}
                </Text>
              </View>
              <Text style={styles.addIcon}>+</Text>
            </Pressable>
          )}
        />
      ) : drill?.level === 'albums' ? (
        <FlatList
          data={albums}
          keyExtractor={(a) => a.id}
          renderItem={({ item }) => (
            <Pressable onPress={() => handleSelectAlbum(item)} style={styles.row}>
              <Image source={{ uri: item.thumbnailUrl ?? undefined }} style={styles.thumb} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.rowTitle} numberOfLines={1}>
                  {item.title}
                  {item.year ? ` (${item.year})` : ''}
                </Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </Pressable>
          )}
          ListFooterComponent={
            albums.length < albumsTotal ? (
              <Pressable
                onPress={handleLoadMoreAlbums}
                disabled={loadingMoreAlbums}
                style={[styles.loadMoreBtn, loadingMoreAlbums && { opacity: 0.5 }]}
              >
                {loadingMoreAlbums ? (
                  <ActivityIndicator color={colors.purpleBright} />
                ) : (
                  <Text style={styles.loadMoreText}>
                    Load More Albums ({albumsTotal - albums.length} more)
                  </Text>
                )}
              </Pressable>
            ) : null
          }
        />
      ) : mode === 'song' ? (
        <FlatList
          data={trackResults}
          keyExtractor={(t) => `${t.source}-${t.sourceId}`}
          renderItem={({ item }) => (
            <Pressable onPress={() => onSelectTrack(item)} style={styles.row}>
              <Image source={{ uri: item.thumbnailUrl ?? undefined }} style={styles.thumb} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.rowTitle} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={styles.rowSubtitle} numberOfLines={1}>
                  {item.artist}
                </Text>
              </View>
              <Text style={styles.addIcon}>+</Text>
            </Pressable>
          )}
        />
      ) : (
        <FlatList
          data={artistResults}
          keyExtractor={(a) => a.id}
          renderItem={({ item }) => (
            <Pressable onPress={() => handleSelectArtist(item)} style={styles.row}>
              <Image source={{ uri: item.thumbnailUrl ?? undefined }} style={styles.thumb} />
              <Text style={[styles.rowTitle, { marginLeft: 12, flex: 1 }]} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={styles.chevron}>›</Text>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  backRow: { padding: 14 },
  backText: { color: colors.purpleBright, fontSize: 16, fontWeight: '600' },
  modeRow: { flexDirection: 'row', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
  modeTab: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 16,
    marginRight: 10,
    backgroundColor: '#1c1c1e',
  },
  modeTabActive: { backgroundColor: colors.purple },
  modeTabText: { color: 'white', fontSize: 14, fontWeight: '600' },
  input: { margin: 16, marginTop: 8, fontSize: 16, padding: 14, borderRadius: 10, backgroundColor: '#1c1c1e', color: 'white' },
  artistHeader: { color: 'white', fontSize: 20, fontWeight: '700', padding: 16, paddingBottom: 8 },
  errorText: { color: colors.error, marginHorizontal: 16, marginBottom: 8, fontSize: 14 },
  row: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderColor: '#2c2c2e' },
  thumb: { width: 48, height: 48, borderRadius: 8, backgroundColor: '#333' },
  rowTitle: { color: 'white', fontSize: 15 },
  rowSubtitle: { color: '#999', fontSize: 13 },
  chevron: { color: '#666', fontSize: 20 },
  addIcon: { color: colors.greenBright, fontSize: 22 },
  loadMoreBtn: { padding: 16, alignItems: 'center' },
  loadMoreText: { color: colors.purpleBright, fontSize: 15, fontWeight: '600' },
});
