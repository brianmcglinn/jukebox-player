import { useState } from 'react';
import { Pressable, View, Text, Image, StyleSheet } from 'react-native';
import { AddToQueueSheet } from './AddToQueueSheet';
import type { SearchResult } from '../types';

export function SearchResultCard({ item }: { item: SearchResult }) {
  const [confirming, setConfirming] = useState(false);
  return (
    <>
      <Pressable onPress={() => setConfirming(true)} style={styles.row}>
        <Image source={{ uri: item.thumbnailUrl ?? undefined }} style={styles.art} />
        <View style={{ marginLeft: 16, flex: 1 }}>
          <Text style={styles.title} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.artist} numberOfLines={1}>
            {item.artist}
          </Text>
        </View>
      </Pressable>
      {confirming && <AddToQueueSheet item={item} onClose={() => setConfirming(false)} />}
    </>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderColor: '#2c2c2e' },
  art: { width: 60, height: 60, borderRadius: 8 },
  title: { color: 'white', fontSize: 20 },
  artist: { color: '#999', fontSize: 16 },
});
