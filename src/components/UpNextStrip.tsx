import { View, Text, Image, FlatList, StyleSheet } from 'react-native';
import { useUpNextQueue } from '../hooks/useUpNextQueue';
import type { QueueItem } from '../types';

export function UpNextStrip() {
  const { items, totalQueued } = useUpNextQueue(6);
  if (items.length === 0) return null;
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
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.75)',
    paddingTop: 12,
    paddingBottom: 20,
  },
  label: { color: '#999', fontSize: 13, fontWeight: '700', letterSpacing: 1, marginLeft: 20, marginBottom: 8 },
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
  cardHighlight: { borderWidth: 2, borderColor: '#e63946' },
  thumb: { width: 56, height: 56, borderRadius: 8, backgroundColor: '#333' },
  nextBadge: { color: '#e63946', fontSize: 11, fontWeight: '800' },
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
