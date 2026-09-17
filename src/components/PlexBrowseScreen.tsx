import { useState, useEffect } from 'react';
import { View, Text, FlatList, TextInput, Pressable, Image, ActivityIndicator, StyleSheet } from 'react-native';
import {
  listPlexArtists,
  listPlexAlbumsForArtist,
  listPlexTracksForAlbum,
  listPlexGenres,
  listPlexAlbumsForGenre,
  listPlexPlaylists,
  listPlexTracksForPlaylist,
} from '../lib/plexClient';
import type { SearchResult, PlexArtist, PlexAlbum, PlexFilterValue, PlexPlaylist } from '../types';
import { colors } from '../lib/colors';

type BrowseView =
  | { level: 'root' }
  | { level: 'artists' }
  | { level: 'artist-albums'; artistKey: string; artistName: string }
  | { level: 'album-tracks'; albumKey: string; albumTitle: string; artistName: string | null }
  | { level: 'genres' }
  | { level: 'genre-albums'; value: PlexFilterValue }
  | { level: 'playlists' }
  | { level: 'playlist-tracks'; playlistKey: string; playlistTitle: string };

const ROOT_ITEMS: { label: string; view: BrowseView }[] = [
  { label: 'Artists', view: { level: 'artists' } },
  { label: 'Genres', view: { level: 'genres' } },
  { label: 'Playlists', view: { level: 'playlists' } },
];

export function PlexBrowseScreen({ onSelectTrack }: { onSelectTrack: (track: SearchResult) => void }) {
  const [stack, setStack] = useState<BrowseView[]>([{ level: 'root' }]);
  const current = stack[stack.length - 1];

  function push(view: BrowseView) {
    setStack((s) => [...s, view]);
  }
  function pop() {
    setStack((s) => (s.length > 1 ? s.slice(0, -1) : s));
  }

  return (
    <View style={{ flex: 1 }}>
      {stack.length > 1 && (
        <Pressable onPress={pop} style={styles.backRow}>
          <Text style={styles.backText}>‹ Back</Text>
        </Pressable>
      )}

      {current.level === 'root' && (
        <FlatList
          data={ROOT_ITEMS}
          keyExtractor={(item) => item.label}
          renderItem={({ item }) => (
            <Pressable onPress={() => push(item.view)} style={styles.rootRow}>
              <Text style={styles.rootLabel}>{item.label}</Text>
              <Text style={styles.chevron}>›</Text>
            </Pressable>
          )}
        />
      )}

      {current.level === 'artists' && (
        <ArtistList onSelect={(a) => push({ level: 'artist-albums', artistKey: a.ratingKey, artistName: a.name })} />
      )}

      {current.level === 'artist-albums' && (
        <AlbumList
          cacheKey={current.artistKey}
          loader={() => listPlexAlbumsForArtist(current.artistKey)}
          onSelect={(al) =>
            push({
              level: 'album-tracks',
              albumKey: al.ratingKey,
              albumTitle: al.title,
              artistName: current.artistName,
            })
          }
        />
      )}

      {current.level === 'album-tracks' && (
        <TrackList
          cacheKey={current.albumKey}
          title={current.artistName ? `${current.artistName} — ${current.albumTitle}` : current.albumTitle}
          loader={() => listPlexTracksForAlbum(current.albumKey)}
          onSelectTrack={onSelectTrack}
        />
      )}

      {current.level === 'genres' && (
        <GenreList onSelect={(value) => push({ level: 'genre-albums', value })} />
      )}

      {current.level === 'genre-albums' && (
        <AlbumList
          cacheKey={current.value.key}
          title={current.value.title}
          loader={() => listPlexAlbumsForGenre(current.value)}
          onSelect={(al) =>
            push({
              level: 'album-tracks',
              albumKey: al.ratingKey,
              albumTitle: al.title,
              artistName: al.artistName ?? null,
            })
          }
        />
      )}

      {current.level === 'playlists' && (
        <PlaylistList
          onSelect={(p) => push({ level: 'playlist-tracks', playlistKey: p.ratingKey, playlistTitle: p.title })}
        />
      )}

      {current.level === 'playlist-tracks' && (
        <TrackList
          cacheKey={current.playlistKey}
          title={current.playlistTitle}
          loader={() => listPlexTracksForPlaylist(current.playlistKey)}
          onSelectTrack={onSelectTrack}
        />
      )}
    </View>
  );
}

function ArtistList({ onSelect }: { onSelect: (artist: PlexArtist) => void }) {
  const [artists, setArtists] = useState<PlexArtist[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  useEffect(() => {
    listPlexArtists()
      .then(setArtists)
      .catch((err) => setError(err.message ?? 'Could not load artists'));
  }, []);
  if (error) return <ErrorState message={error} />;
  if (!artists) return <Loading />;

  const filtered = query.trim()
    ? artists.filter((a) => a.name.toLowerCase().includes(query.trim().toLowerCase()))
    : artists;

  return (
    <View style={{ flex: 1 }}>
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search artists..."
        placeholderTextColor="#888"
        style={styles.searchInput}
      />
      <FlatList
        data={filtered}
        keyExtractor={(a) => a.ratingKey}
        renderItem={({ item }) => (
          <Pressable onPress={() => onSelect(item)} style={styles.row}>
            <Image source={{ uri: item.thumbnailUrl ?? undefined }} style={styles.thumb} />
            <Text style={[styles.rowTitle, styles.singleLineTitle]} numberOfLines={1}>
              {item.name}
            </Text>
          </Pressable>
        )}
      />
    </View>
  );
}

function GenreList({ onSelect }: { onSelect: (value: PlexFilterValue) => void }) {
  const [values, setValues] = useState<PlexFilterValue[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    listPlexGenres()
      .then(setValues)
      .catch((err) => setError(err.message ?? 'Could not load genres'));
  }, []);
  if (error) return <ErrorState message={error} />;
  if (!values) return <Loading />;
  return (
    <FlatList
      data={values}
      keyExtractor={(v) => v.key}
      renderItem={({ item }) => (
        <Pressable onPress={() => onSelect(item)} style={styles.rootRow}>
          <Text style={styles.rootLabel}>{item.title}</Text>
          <Text style={styles.chevron}>›</Text>
        </Pressable>
      )}
    />
  );
}

// Shared by both the artist→albums path and the genre→albums path.
function AlbumList({
  cacheKey,
  title,
  loader,
  onSelect,
}: {
  cacheKey: string;
  title?: string;
  loader: () => Promise<PlexAlbum[]>;
  onSelect: (album: PlexAlbum) => void;
}) {
  const [albums, setAlbums] = useState<PlexAlbum[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    setAlbums(null);
    setError(null);
    loader()
      .then(setAlbums)
      .catch((err) => setError(err.message ?? 'Could not load albums'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cacheKey]);
  if (error) return <ErrorState message={error} />;
  if (!albums) return <Loading />;
  return (
    <View style={{ flex: 1 }}>
      {title && (
        <Text style={styles.sectionTitle} numberOfLines={1}>
          {title}
        </Text>
      )}
      <FlatList
        data={albums}
        keyExtractor={(a) => a.ratingKey}
        renderItem={({ item }) => (
          <Pressable onPress={() => onSelect(item)} style={styles.row}>
            <Image source={{ uri: item.thumbnailUrl ?? undefined }} style={styles.thumb} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.rowTitle} numberOfLines={1}>
                {item.title}
                {item.year ? ` (${item.year})` : ''}
              </Text>
              {item.artistName ? (
                <Text style={styles.rowSubtitle} numberOfLines={1}>
                  {item.artistName}
                </Text>
              ) : null}
            </View>
          </Pressable>
        )}
      />
    </View>
  );
}

function PlaylistList({ onSelect }: { onSelect: (playlist: PlexPlaylist) => void }) {
  const [playlists, setPlaylists] = useState<PlexPlaylist[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    listPlexPlaylists()
      .then(setPlaylists)
      .catch((err) => setError(err.message ?? 'Could not load playlists'));
  }, []);
  if (error) return <ErrorState message={error} />;
  if (!playlists) return <Loading />;
  return (
    <FlatList
      data={playlists}
      keyExtractor={(p) => p.ratingKey}
      renderItem={({ item }) => (
        <Pressable onPress={() => onSelect(item)} style={styles.row}>
          <Image source={{ uri: item.thumbnailUrl ?? undefined }} style={styles.thumb} />
          <Text style={[styles.rowTitle, styles.singleLineTitle]} numberOfLines={1}>
            {item.title} · {item.trackCount} songs
          </Text>
        </Pressable>
      )}
    />
  );
}

function TrackList({
  cacheKey,
  title,
  loader,
  onSelectTrack,
}: {
  cacheKey: string;
  title: string;
  loader: () => Promise<SearchResult[]>;
  onSelectTrack: (track: SearchResult) => void;
}) {
  const [tracks, setTracks] = useState<SearchResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setTracks(null);
    setError(null);
    loader()
      .then(setTracks)
      .catch((err) => setError(err.message ?? 'Could not load tracks'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cacheKey]);

  return (
    <View style={{ flex: 1 }}>
      <Text style={styles.sectionTitle} numberOfLines={1}>
        {title}
      </Text>
      {error ? (
        <ErrorState message={error} />
      ) : !tracks ? (
        <Loading />
      ) : (
        <FlatList
          data={tracks}
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
      )}
    </View>
  );
}

function Loading() {
  return (
    <View style={{ padding: 40, alignItems: 'center' }}>
      <ActivityIndicator color={colors.purple} />
    </View>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <View style={{ padding: 32, alignItems: 'center' }}>
      <Text style={{ color: colors.error, fontSize: 15, textAlign: 'center' }}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  backRow: { padding: 14 },
  backText: { color: colors.purpleBright, fontSize: 16, fontWeight: '600' },
  rootRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 18,
    borderBottomWidth: 1,
    borderColor: '#2c2c2e',
  },
  rootLabel: { color: 'white', fontSize: 17, fontWeight: '600' },
  chevron: { color: '#666', fontSize: 20 },
  sectionTitle: { color: '#999', fontSize: 13, fontWeight: '700', letterSpacing: 1, padding: 16, paddingBottom: 8 },
  searchInput: {
    margin: 16,
    marginBottom: 8,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#1c1c1e',
    color: 'white',
    fontSize: 15,
  },
  row: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderColor: '#2c2c2e' },
  thumb: { width: 48, height: 48, borderRadius: 8, backgroundColor: '#333' },
  rowTitle: { color: 'white', fontSize: 15 },
  singleLineTitle: { marginLeft: 12, flex: 1 },
  rowSubtitle: { color: '#999', fontSize: 13 },
  addIcon: { color: colors.greenBright, fontSize: 22 },
});
