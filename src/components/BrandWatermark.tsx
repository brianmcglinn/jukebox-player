import { memo } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { colors } from '../lib/colors';

const ICON_IMAGE = require('../../assets/icon.png');

// The corner branding shown over the Now Playing screens: app icon followed
// by the "McJukebox" wordmark, top-left.
//
// `left` clears the admin gear button, which AdminGateButton pins to the
// top-left corner (20px in, plus 10px of padding and a ~20px glyph). Change
// it here if that button ever moves.
const GEAR_CLEARANCE = 72;

function BrandWatermarkBase({ compact = false }: { compact?: boolean }) {
  const iconSize = compact ? 28 : 40;
  return (
    // pointerEvents="none" so a tap on the branding falls through to the
    // player underneath (tap-to-pause) instead of being swallowed here.
    <View pointerEvents="none" style={[styles.row, { left: GEAR_CLEARANCE, top: compact ? 24 : 20 }]}>
      <Image
        source={ICON_IMAGE}
        style={{ width: iconSize, height: iconSize, borderRadius: iconSize * 0.22 }}
        resizeMode="contain"
      />
      <Text style={[styles.text, { fontSize: compact ? 18 : 26, marginLeft: compact ? 8 : 10 }]}>McJukebox</Text>
    </View>
  );
}

export const BrandWatermark = memo(BrandWatermarkBase);

const styles = StyleSheet.create({
  row: { position: 'absolute', flexDirection: 'row', alignItems: 'center' },
  text: {
    color: colors.greenBright,
    fontWeight: '800',
    letterSpacing: 2,
    textShadowColor: colors.green,
    textShadowRadius: 12,
    textShadowOffset: { width: 0, height: 0 },
  },
});
