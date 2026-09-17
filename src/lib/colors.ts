// Shared neon palette — the three "core" colors are sampled directly from
// the app icon artwork so the UI genuinely matches it, not an approximation.
// The "Bright" variants are lighter tints of the same hue, used for body
// text/labels where the fully-saturated core color reads as too intense.
export const colors = {
  purple: '#7901f5',
  purpleBright: '#b478ff',
  blue: '#005dff',
  blueBright: '#5ca8ff',
  green: '#4dfc00',
  greenBright: '#9dff78',

  background: '#0a0a12',
  card: '#16161f',
  cardAlt: '#1c1c2a',
  border: '#2a2a3a',
  textPrimary: '#ffffff',
  textSecondary: '#9a9ab0',
  textMuted: '#6b6b80',
  error: '#ff5c7a',
} as const;
