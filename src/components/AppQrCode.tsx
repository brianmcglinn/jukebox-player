import { memo } from 'react';
import { View, Text, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

// Where guests get the McJukebox Remote app (the TestFlight link, set in .env).
export const MOBILE_APP_URL = process.env.EXPO_PUBLIC_MOBILE_APP_URL ?? 'https://mcglinnjukebox.app';

export const QR_CAPTION = 'Or scan to add from iPhone';

type Props = {
  size: number;
  caption?: string;
  captionSize?: number;
  style?: StyleProp<ViewStyle>;
};

// One QR + caption used by both the idle screen and the Now Playing screen,
// so the two can never drift apart. Wrapped in memo() on purpose: the Now
// Playing screen re-renders every few hundred milliseconds as the progress
// bar ticks, and regenerating a QR matrix on each of those renders would be
// pure waste — with stable props this component renders exactly once.
function AppQrCodeBase({ size, caption, captionSize = 14, style }: Props) {
  const cardWidth = size + CARD_PADDING * 2;
  return (
    <View style={[styles.wrap, { width: cardWidth }, style]}>
      <View style={styles.card}>
        <QRCode value={MOBILE_APP_URL} size={size} backgroundColor="white" color="black" />
      </View>
      {caption ? (
        <Text style={[styles.caption, { fontSize: captionSize, lineHeight: Math.round(captionSize * 1.25) }]}>
          {caption}
        </Text>
      ) : null}
    </View>
  );
}

const CARD_PADDING = 10;

export const AppQrCode = memo(AppQrCodeBase);

const styles = StyleSheet.create({
  wrap: { alignItems: 'center' },
  card: { backgroundColor: 'white', padding: CARD_PADDING, borderRadius: 12 },
  caption: {
    color: '#e6e6f0',
    marginTop: 8,
    textAlign: 'center',
    fontWeight: '600',
    textShadowColor: 'rgba(0,0,0,0.85)',
    textShadowRadius: 6,
    textShadowOffset: { width: 0, height: 1 },
  },
});
