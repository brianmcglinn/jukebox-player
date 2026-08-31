import { useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import DraggableFlatList, { RenderItemParams } from 'react-native-draggable-flatlist';
import { supabase } from '../lib/supabase';
import { adminRemoveQueueItem, adminReorderQueueItem, adminSkip } from '../lib/queueClient';
import type { QueueItem } from '../types';

export function AdminScreen({ pin, onClose }: { pin: string; onClose: () => void }) {
  const [nowPlaying, setNowPlaying] = useState<QueueItem | null>(null);
  const [queue, setQueue] = useState<QueueItem[]>([]);

  useEffect(() => {
    const fetchAll = async () => {
      const [{ data: playing }, { data: queued }] = await Promise.all([
        supabase.from('queue_items').select('*').eq('status', 'playing').maybeSingle(),
        supabase.from('queue_items').select('*').eq('status', 'queued').order('position', { ascending: true }),
      ]);
      setNowPlaying(playing ?? null);
      setQueue(queued ?? []);
    };
    fetchAll();
    const channel = supabase
      .channel('admin-queue')
      .on('postgres_changes', { event: '*', schema: 'mcjukebox', table: 'queue_items' }, fetchAll)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function handleSkip() {
    await adminSkip(pin);
  }

  async function handleRemove(item: QueueItem) {
    await adminRemoveQueueItem(item.id, pin);
  }

  async function handleDragEnd({ data, to }: { data: QueueItem[]; from: number; to: number }) {
    const moved = data[to];
    const prev = data[to - 1];
    const next = data[to + 1];
    const prevPos = prev?.position ?? moved.position - 1;
    const nextPos = next?.position ?? moved.position + 1;
    await adminReorderQueueItem(moved.id, (prevPos + nextPos) / 2, pin);
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#111' }}>
      <View style={{ padding: 20 }}>
        <Pressable onPress={onClose}>
          <Text style={{ color: '#999' }}>Close</Text>
        </Pressable>
        {nowPlaying && (
          <View style={styles.nowPlayingAdminCard}>
            <Text style={{ color: 'white', fontSize: 18, flex: 1 }} numberOfLines={1}>
              Now: {nowPlaying.title}
            </Text>
            <Pressable onPress={handleSkip} style={styles.skipBtn}>
              <Text style={{ color: 'white', fontWeight: '700' }}>Skip</Text>
            </Pressable>
          </View>
        )}
      </View>
      <DraggableFlatList
        data={queue}
        keyExtractor={(item) => item.id}
        onDragEnd={handleDragEnd}
        renderItem={({ item, drag, isActive }: RenderItemParams<QueueItem>) => (
          <Pressable onLongPress={drag} style={[styles.adminRow, isActive && { opacity: 0.6 }]}>
            <Text style={{ color: '#666', width: 20 }}>≡</Text>
            <Text style={{ color: 'white', flex: 1, marginLeft: 8 }} numberOfLines={1}>
              {item.title} — {item.artist}
            </Text>
            <Pressable onPress={() => handleRemove(item)}>
              <Text style={{ color: '#e63946', fontSize: 14 }}>Remove</Text>
            </Pressable>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  nowPlayingAdminCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1c1c1e',
    padding: 14,
    borderRadius: 12,
    marginTop: 16,
  },
  skipBtn: { backgroundColor: '#e63946', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 10 },
  adminRow: { flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: 1, borderColor: '#2c2c2e' },
});
