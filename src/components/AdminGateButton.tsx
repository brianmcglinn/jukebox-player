import { useState } from 'react';
import { Pressable, View, Text, TextInput, Modal, StyleSheet } from 'react-native';
import { verifyAdminPin } from '../lib/queueClient';
import { AdminScreen } from '../screens/AdminScreen';

export function AdminGateButton() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [verifiedPin, setVerifiedPin] = useState<string | null>(null);
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  async function tryUnlock() {
    const valid = await verifyAdminPin(pin);
    if (valid) {
      setVerifiedPin(pin);
      setShowAdmin(true);
      setShowPrompt(false);
      setError(false);
    } else {
      setError(true);
    }
    setPin('');
  }

  return (
    <>
      <Pressable onPress={() => setShowPrompt(true)} style={styles.gearBtn}>
        <Text style={{ color: '#666', fontSize: 20 }}>⚙</Text>
      </Pressable>
      <Modal visible={showPrompt} transparent animationType="fade">
        <View style={styles.pinOverlay}>
          <View style={styles.pinCard}>
            <TextInput
              value={pin}
              onChangeText={setPin}
              keyboardType="number-pad"
              secureTextEntry
              maxLength={6}
              autoFocus
              style={styles.pinInput}
              onSubmitEditing={tryUnlock}
            />
            {error && <Text style={{ color: '#e63946', marginBottom: 8 }}>Incorrect PIN</Text>}
            <Pressable onPress={() => setShowPrompt(false)}>
              <Text style={{ color: '#999' }}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
      {showAdmin && verifiedPin && (
        <Modal visible animationType="slide">
          <AdminScreen pin={verifiedPin} onClose={() => setShowAdmin(false)} />
        </Modal>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  gearBtn: { position: 'absolute', top: 20, left: 20, padding: 10 },
  pinOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.7)' },
  pinCard: { backgroundColor: '#1c1c1e', padding: 24, borderRadius: 16, width: 220 },
  pinInput: {
    backgroundColor: '#2c2c2e',
    color: 'white',
    padding: 14,
    borderRadius: 10,
    fontSize: 22,
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: 8,
  },
});
