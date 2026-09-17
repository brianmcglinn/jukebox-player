import { useEffect, useRef, useState } from 'react';
import { View, Text, Image, Animated, Pressable, StyleSheet, Dimensions } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { useAttractBackgrounds } from '../hooks/useAttractBackgrounds';
import { colors } from '../lib/colors';

const ICON_IMAGE = require('../../assets/icon.png');

const { width, height } = Dimensions.get('window');
const ROTATE_INTERVAL_MS = 8000;
const MOBILE_APP_URL = process.env.EXPO_PUBLIC_MOBILE_APP_URL ?? 'https://mcglinnjukebox.app';

function toImageSource(item: string | number) {
  return typeof item === 'string' ? { uri: item } : item;
}

function AttractBackground({ images }: { images: (string | number)[] }) {
  const [index, setIndex] = useState(0);
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (images.length < 2) return;
    const interval = setInterval(() => {
      Animated.timing(opacity, { toValue: 0, duration: 800, useNativeDriver: true }).start(() => {
        setIndex((i) => (i + 1) % images.length);
        Animated.timing(opacity, { toValue: 1, duration: 800, useNativeDriver: true }).start();
      });
    }, ROTATE_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [images.length]);

  return (
    <Animated.Image
      source={toImageSource(images[index])}
      blurRadius={18}
      style={[StyleSheet.absoluteFill, { opacity, width, height }]}
      resizeMode="cover"
    />
  );
}

export function IdleAttractScreen({ onTap }: { onTap: () => void }) {
  const images = useAttractBackgrounds();
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.06, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <Pressable style={StyleSheet.absoluteFill} onPress={onTap}>
      <AttractBackground images={images} />
      <View style={styles.scrim} />
      <View style={styles.content}>
        <Text style={styles.brandTitle}>McJukebox</Text>
        <Image source={ICON_IMAGE} style={styles.iconImage} resizeMode="contain" />
        <Animated.Text style={[styles.cta, { transform: [{ scale: pulse }] }]}>
          Tap to add a song
        </Animated.Text>
        <View style={styles.qrRow}>
          <View style={styles.qrCard}>
            <QRCode value={MOBILE_APP_URL} size={120} backgroundColor="white" />
          </View>
          <Text style={styles.qrLabel}>Or scan to add from your phone</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.55)' },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  brandTitle: {
    color: colors.greenBright,
    fontSize: 40,
    fontWeight: '800',
    letterSpacing: 3,
    marginBottom: 12,
    textShadowColor: colors.green,
    textShadowRadius: 18,
    textShadowOffset: { width: 0, height: 0 },
  },
  iconImage: { width: 160, height: 160 },
  cta: { color: colors.purpleBright, fontSize: 44, fontWeight: '800', marginTop: 24 },
  qrRow: { position: 'absolute', bottom: 60, alignItems: 'center' },
  qrCard: { backgroundColor: 'white', padding: 12, borderRadius: 12 },
  qrLabel: { color: '#ccc', fontSize: 16, marginTop: 12 },
});
