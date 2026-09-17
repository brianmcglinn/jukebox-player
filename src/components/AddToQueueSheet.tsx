import { useState } from 'react';
import { View, Text, TextInput, Pressable, Modal, StyleSheet } from 'react-native';
import { addToQueue } from '../lib/queueClient';
import { colors } from '../lib/colors';
import type { SearchResult } from '../types';

export function AddToQueueSheet({ item, onClose }: { item: SearchResult; onClose: () => void }) {
  const [name, setName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  async function handleAdd() {
    const addedBy = name.trim() || 'Jukebox';
    const { error } = await addToQueue(item, addedBy, 'jukebox');
    if (error) return setErrorMsg(error);
    onClose();
  }

  return (
    <Modal transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>Add "{item.title}"?</Text>
          <TextInput
            placeholder="Your name (optional)"
            value={name}
            onChangeText={setName}
            placeholderTextColor="#888"
            style={styles.input}
          />
          {!!errorMsg && <Text style={styles.error}>{errorMsg}</Text>}
          <Pressable onPress={handleAdd} style={styles.addButton}>
            <Text style={styles.addButtonText}>Add to Queue</Text>
          </Pressable>
          <Pressable onPress={onClose} style={{ padding: 12 }}>
            <Text style={{ color: '#999', textAlign: 'center' }}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  card: { margin: 24, backgroundColor: '#1c1c1e', borderRadius: 16, padding: 24 },
  title: { color: 'white', fontSize: 22, marginBottom: 12 },
  input: { backgroundColor: '#2c2c2e', color: 'white', padding: 14, borderRadius: 10 },
  error: { color: colors.error, marginTop: 8 },
  addButton: { backgroundColor: colors.purple, padding: 16, borderRadius: 10, marginTop: 16 },
  addButtonText: { color: 'white', textAlign: 'center', fontSize: 18 },
});
