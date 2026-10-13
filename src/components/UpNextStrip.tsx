import { View, Text, Image, FlatList, StyleSheet } from 'react-native';
import { useUpNextQueue } from '../hooks/useUpNextQueue';
import { colors } from '../lib/colors';
import type { QueueItem } from '../types';

// Same app icon IdleAttractScreen uses, reused here so the empty state
// reads as a deliberate brand moment rather than dead space.
const ICON_IMAGE = require('../../assets/icon.png');

export function UpNextStrip() {
  const { items, totalQueued } = useUpNextQueue(6);

  if (items.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.label}>UP NEXT</Text>
        <View style={styles.emptyState}>
          <Image source={ICON_IMAGE} style={styles.emptyIcon} resizeMode="contain" />
          <Text style={styles.emptyText}>Queue's empty — add a song!</Text>
        </View>
      </View>
    );
  }

  const remainder = totalQueued - items.length;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>UP NEXT</Text>
      <FlatList
        horizontal
        data={items}
        keyExtractor={(item) => item.id}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16 }}
        renderItem={({ item, index }) => <UpNextCard item={item} isNext={index === 0} />}
        ListFooterComponent={
          remainder > 0 ? (
            <View style={styles.moreChip}>
              <Text style={styles.moreChipText}>+{remainder} more</Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}

function UpNextCard({ item, isNext }: { item: QueueItem; isNext: boolean }) {
  return (
    <View style={[styles.card, isNext && styles.cardHighlight]}>
      <Image source={{ uri: item.thumbnail_url ?? undefined }} style={styles.thumb} />
      <View style={{ flex: 1, marginLeft: 10 }}>
        {isNext && <Text style={styles.nextBadge}>NEXT</Text>}
        <Text numberOfLines={1} style={styles.title}>
          {item.title}
        </Text>
        <Text numberOfLines={1} style={styles.artist}>
          {item.artist}
        </Text>
        <Text numberOfLines={1} style={styles.addedBy}>
          added by {item.added_by}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0a0a0a',
    paddingTop: 12,
    paddingBottom: 20,
  },
  label: { color: '#999', fontSize: 13, fontWeight: '700', letterSpacing: 1, marginLeft: 20, marginBottom: 8 },
  emptyState: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    height: 76,
  },
  emptyIcon: { width: 44, height: 44, marginRight: 14, opacity: 0.85 },
  emptyText: {
    color: colors.greenBright,
    fontSize: 16,
    fontWeight: '700',
    textShadowColor: colors.green,
    textShadowRadius: 8,
    textShadowOffset: { width: 0, height: 0 },
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 220,
    height: 76,
    backgroundColor: '#1c1c1e',
    borderRadius: 12,
    marginRight: 12,
    padding: 8,
  },
  cardHighlight: { borderWidth: 2, borderColor: colors.green },
  thumb: { width: 56, height: 56, borderRadius: 8, backgroundColor: '#333' },
  nextBadge: { color: colors.greenBright, fontSize: 11, fontWeight: '800' },
  title: { color: 'white', fontSize: 15, fontWeight: '600' },
  artist: { color: '#999', fontSize: 13 },
  addedBy: { color: '#666', fontSize: 11 },
  moreChip: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 100,
    height: 76,
    backgroundColor: '#1c1c1e',
    borderRadius: 12,
  },
  moreChipText: { color: '#999', fontSize: 14, fontWeight: '600' },
});
