import { useState, useEffect } from 'react';
import { View, TextInput, FlatList, Pressable, Text, StyleSheet } from 'react-native';
import { useDebounce } from '../lib/useDebounce';
import { searchPlexMusic } from '../lib/plexClient';
import { searchYouTubeMusic } from '../lib/youtubeClient';
import { SearchResultCard } from '../components/SearchResultCard';
import { PlexBrowseScreen } from '../components/PlexBrowseScreen';
import { SpotifySearchScreen } from '../components/SpotifySearchScreen';
import { AddToQueueSheet } from '../components/AddToQueueSheet';
import { colors } from '../lib/colors';
import type { SearchResult } from '../types';

// Spotify is intentionally NOT in this map — it has its own dedicated
// search UI (song/artist mode toggle + artist drill-down) rendered
// separately below, rather than using the shared textbox+list pattern.
const SEARCH_FNS = {
  plex: searchPlexMusic,
  youtube: searchYouTubeMusic,
} as const;

const SOURCES = ['plex', 'youtube', 'spotify'] as const;
type Source = (typeof SOURCES)[number];

const SOURCE_LABELS: Record<Source, string> = {
  plex: 'My Library',
  youtube: 'YouTube',
  spotify: 'Spotify',
};

export function JukeboxSearchScreen({ onDone }: { onDone: () => void }) {
  const [query, setQuery] = useState('');
  const [activeSource, setActiveSource] = useState<Source>('plex');
  const [mode, setMode] = useState<'search' | 'browse'>('search');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [confirmingTrack, setConfirmingTrack] = useState<SearchResult | null>(null);
  const debouncedQuery = useDebounce(query, 400);

  useEffect(() => {
    if (activeSource === 'spotify') return;
    if (mode !== 'search') return;
    setSearchError(null);
    if (debouncedQuery.trim().length < 2) return setResults([]);
    let cancelled = false;
    SEARCH_FNS[activeSource](debouncedQuery)
      .then((r) => {
        if (!cancelled) setResults(r);
      })
      .catch((err) => {
        if (!cancelled) setSearchError(err.message ?? 'Search failed');
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, activeSource, mode]);

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        {activeSource !== 'spotify' && mode === 'search' ? (
          <TextInput
            autoFocus
            value={query}
            onChangeText={setQuery}
            placeholder="Search for a song or artist..."
            placeholderTextColor="#888"
            style={styles.input}
          />
        ) : activeSource === 'plex' ? (
          <Text style={styles.browseHeader}>Browse My Library</Text>
        ) : (
          <View style={{ flex: 1 }} />
        )}
        <Pressable onPress={onDone} style={styles.doneBtn}>
          <Text style={styles.doneBtnText}>Done</Text>
        </Pressable>
      </View>

      <View style={styles.tabRow}>
        {SOURCES.map((s) => (
          <Pressable
            key={s}
            onPress={() => {
              setActiveSource(s);
              // Browse mode only exists for Plex — everything else is search-only.
              if (s !== 'plex') setMode('search');
            }}
            style={[styles.sourceTab, activeSource === s && styles.sourceTabActive]}
          >
            <Text style={{ color: 'white', fontSize: 18 }}>{SOURCE_LABELS[s]}</Text>
          </Pressable>
        ))}
        {activeSource === 'plex' &&
          (['search', 'browse'] as const).map((m) => (
            <Pressable
              key={m}
              onPress={() => setMode(m)}
              style={[styles.modeTab, mode === m && styles.modeTabActive]}
            >
              <Text style={{ color: 'white', fontSize: 16 }}>{m === 'search' ? 'Search' : 'Browse'}</Text>
            </Pressable>
          ))}
      </View>

      {activeSource === 'spotify' ? (
        <SpotifySearchScreen onSelectTrack={setConfirmingTrack} />
      ) : mode === 'search' ? (
        <>
          {searchError && <Text style={styles.searchErrorText}>{searchError}</Text>}
          <FlatList
            data={results}
            keyExtractor={(item) => `${item.source}-${item.sourceId}`}
            renderItem={({ item }) => <SearchResultCard item={item} />}
          />
        </>
      ) : (
        <PlexBrowseScreen onSelectTrack={setConfirmingTrack} />
      )}

      {confirmingTrack && (
        <AddToQueueSheet item={confirmingTrack} onClose={() => setConfirmingTrack(null)} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: '#111' },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  input: { flex: 1, fontSize: 26, padding: 18, borderRadius: 12, backgroundColor: '#1c1c1e', color: 'white' },
  searchErrorText: { color: colors.error, marginBottom: 8, fontSize: 15 },
  browseHeader: { flex: 1, fontSize: 26, color: 'white', fontWeight: '700', padding: 18 },
  doneBtn: { marginLeft: 12, paddingVertical: 14, paddingHorizontal: 20 },
  doneBtnText: { color: colors.purpleBright, fontSize: 18, fontWeight: '700' },
  tabRow: { flexDirection: 'row', marginVertical: 16, flexWrap: 'wrap' },
  sourceTab: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 20,
    marginRight: 12,
    marginBottom: 8,
    backgroundColor: '#2c2c2e',
  },
  sourceTabActive: { backgroundColor: colors.purple },
  modeTab: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 20,
    marginRight: 12,
    marginBottom: 8,
    backgroundColor: '#1c1c1e',
  },
  modeTabActive: { backgroundColor: '#444' },
});
