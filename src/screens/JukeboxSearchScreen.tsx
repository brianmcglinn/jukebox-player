import { useState, useEffect } from 'react';
import { View, TextInput, FlatList, Pressable, Text, StyleSheet } from 'react-native';
import { useDebounce } from '../lib/useDebounce';
import { searchPlexMusic } from '../lib/plexClient';
import { searchYouTubeMusic } from '../lib/youtubeClient';
import { SearchResultCard } from '../components/SearchResultCard';
import type { SearchResult } from '../types';

export function JukeboxSearchScreen({ onDone }: { onDone: () => void }) {
  const [query, setQuery] = useState('');
  const [activeSource, setActiveSource] = useState<'plex' | 'youtube'>('plex');
  const [results, setResults] = useState<SearchResult[]>([]);
  const debouncedQuery = useDebounce(query, 400);

  useEffect(() => {
    if (debouncedQuery.trim().length < 2) return setResults([]);
    let cancelled = false;
    const search = activeSource === 'plex' ? searchPlexMusic : searchYouTubeMusic;
    search(debouncedQuery).then((r) => {
      if (!cancelled) setResults(r);
    });
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, activeSource]);

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <TextInput
          autoFocus
          value={query}
          onChangeText={setQuery}
          placeholder="Search for a song or artist..."
          placeholderTextColor="#888"
          style={styles.input}
        />
        <Pressable onPress={onDone} style={styles.doneBtn}>
          <Text style={styles.doneBtnText}>Done</Text>
        </Pressable>
      </View>
      <View style={styles.tabRow}>
        {(['plex', 'youtube'] as const).map((s) => (
          <Pressable
            key={s}
            onPress={() => setActiveSource(s)}
            style={[styles.sourceTab, activeSource === s && styles.sourceTabActive]}
          >
            <Text style={{ color: 'white', fontSize: 18 }}>{s === 'plex' ? 'My Library' : 'YouTube'}</Text>
          </Pressable>
        ))}
      </View>
      <FlatList
        data={results}
        keyExtractor={(item) => `${item.source}-${item.sourceId}`}
        renderItem={({ item }) => <SearchResultCard item={item} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: '#111' },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  input: { flex: 1, fontSize: 26, padding: 18, borderRadius: 12, backgroundColor: '#1c1c1e', color: 'white' },
  doneBtn: { marginLeft: 12, paddingVertical: 14, paddingHorizontal: 20 },
  doneBtnText: { color: '#e63946', fontSize: 18, fontWeight: '700' },
  tabRow: { flexDirection: 'row', marginVertical: 16 },
  sourceTab: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 20,
    marginRight: 12,
    backgroundColor: '#2c2c2e',
  },
  sourceTabActive: { backgroundColor: '#e63946' },
});
