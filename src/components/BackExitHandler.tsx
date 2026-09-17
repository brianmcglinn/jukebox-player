import { useEffect, useState } from 'react';
import { BackHandler, View, Text, TextInput, Pressable, Modal, StyleSheet, Platform } from 'react-native';
import { verifyAdminPin } from '../lib/queueClient';
import { colors } from '../lib/colors';
import { stopKioskMode } from '../../modules/kiosk';

// Android's own screen-pinning "unpin" gesture (hold Back + Overview) isn't
// something apps can reconfigure — it's fixed at the OS level. This
// component sidesteps that entirely: it intercepts a single Back press
// directly and shows our own PIN prompt, calling stopKioskMode() ourselves
// on success. Same security model as the admin gate (same PIN), just a much
// simpler physical gesture to trigger it.
export function BackExitHandler() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      setShowPrompt(true);
      return true; // handled — prevents the default back action
    });
    return () => subscription.remove();
  }, []);

  function closePrompt() {
    setShowPrompt(false);
    setPin('');
    setError(false);
  }

  async function tryExit() {
    const valid = await verifyAdminPin(pin);
    if (valid) {
      closePrompt();
      stopKioskMode();
    } else {
      setError(true);
      setPin('');
    }
  }

  return (
    <Modal visible={showPrompt} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>Enter PIN to exit kiosk mode</Text>
          <TextInput
            value={pin}
            onChangeText={setPin}
            keyboardType="number-pad"
            secureTextEntry
            maxLength={6}
            autoFocus
            style={styles.input}
            onSubmitEditing={tryExit}
          />
          {error && <Text style={styles.error}>Incorrect PIN</Text>}
          <Pressable onPress={closePrompt} style={{ padding: 8 }}>
            <Text style={styles.cancel}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.7)' },
  card: { backgroundColor: '#1c1c1e', padding: 24, borderRadius: 16, width: 260 },
  title: { color: 'white', fontSize: 16, marginBottom: 12, textAlign: 'center' },
  input: {
    backgroundColor: '#2c2c2e',
    color: 'white',
    padding: 14,
    borderRadius: 10,
    fontSize: 22,
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: 8,
  },
  error: { color: colors.error, marginBottom: 8, textAlign: 'center' },
  cancel: { color: '#999', textAlign: 'center' },
});
