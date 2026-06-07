/**
 * Dark casino colour palette — deep greens, golds, and near-blacks.
 * All values are plain hex strings compatible with React Native's StyleSheet.
 */

// ---------------------------------------------------------------------------
// Base palette
// ---------------------------------------------------------------------------

const palette = {
  // Felt greens
  feltDeep:    '#0a2310',   // deep baize — table background
  feltMid:     '#0f3020',   // mid felt
  feltLight:   '#1a4a30',   // highlight / card tray
  feltBright:  '#22603c',   // active area accent

  // Golds / ambers
  goldDeep:    '#7d5a00',   // dark gold for disabled states
  goldMid:     '#b8860b',   // dark goldenrod
  goldBright:  '#d4af37',   // classic casino gold
  goldSheen:   '#f0cf65',   // highlight shimmer
  champagne:   '#fbe9a0',   // near-white gold for text on dark

  // Neutrals
  onyx:        '#0d0d0d',   // deepest black
  charcoal:    '#1a1a1a',   // card backs, modal backgrounds
  graphite:    '#2e2e2e',   // dividers, borders
  slate:       '#4a4a4a',   // secondary text
  ash:         '#8a8a8a',   // placeholder text
  fog:         '#c4c4c4',   // inactive icons
  ivory:       '#f5f0e8',   // primary text on dark backgrounds
  white:       '#ffffff',

  // Status / semantic
  emerald:     '#00c853',   // win
  crimson:     '#d32f2f',   // lose / bust
  amber:       '#ff8f00',   // warning / insurance
  sapphire:    '#1565c0',   // info

  // Suit colours
  heartRed:    '#e53935',
  diamondRed:  '#ef5350',
  clubBlack:   '#212121',
  spadeBlack:  '#1a1a1a',
} as const;

// ---------------------------------------------------------------------------
// Semantic tokens
// ---------------------------------------------------------------------------

export const Colors = {
  // Backgrounds
  background:           palette.onyx,
  backgroundSecondary:  palette.charcoal,
  backgroundTertiary:   palette.graphite,

  // Table felt
  feltBackground:       palette.feltDeep,
  feltAccent:           palette.feltMid,
  feltHighlight:        palette.feltLight,
  feltActive:           palette.feltBright,

  // Text
  textPrimary:          palette.ivory,
  textSecondary:        palette.ash,
  textDisabled:         palette.slate,
  textOnGold:           palette.onyx,
  textOnCard:           palette.charcoal,

  // Gold / accent
  accentGold:           palette.goldBright,
  accentGoldLight:      palette.goldSheen,
  accentGoldDark:       palette.goldMid,
  accentGoldMuted:      palette.goldDeep,
  textOnAccent:         palette.champagne,

  // Cards
  cardFace:             palette.white,
  cardBack:             '#1e3a5f',  // traditional blue card back
  cardBackPattern:      '#17304f',
  cardBorder:           palette.graphite,
  cardShadow:           'rgba(0,0,0,0.6)',

  // Suits
  suitRed:              palette.heartRed,
  suitBlack:            palette.clubBlack,

  // Chips
  chipWhite:            '#f5f5f5',  //   $1
  chipRed:              '#e53935',  //   $5
  chipGreen:            '#43a047',  //  $25
  chipBlack:            '#212121',  // $100
  chipPurple:           '#7b1fa2',  // $500
  chipYellow:           palette.goldBright, // $1000

  // Status
  win:                  palette.emerald,
  lose:                 palette.crimson,
  push:                 palette.goldBright,
  blackjack:            palette.goldSheen,
  bust:                 palette.crimson,
  warning:              palette.amber,
  info:                 palette.sapphire,

  // UI chrome
  border:               palette.graphite,
  borderAccent:         palette.goldMid,
  divider:              palette.graphite,
  overlay:              'rgba(0,0,0,0.75)',
  scrim:                'rgba(0,0,0,0.9)',

  // Buttons
  buttonPrimary:        palette.goldBright,
  buttonPrimaryText:    palette.onyx,
  buttonSecondary:      palette.graphite,
  buttonSecondaryText:  palette.ivory,
  buttonDestructive:    palette.crimson,
  buttonDisabled:       palette.slate,
  buttonDisabledText:   palette.ash,
} as const;

export type ColorName = keyof typeof Colors;

// ---------------------------------------------------------------------------
// Typography
// ---------------------------------------------------------------------------

export const Typography = {
  // Font families (loaded via expo-font)
  familyDisplay:    'Playfair Display',   // headings, chip counts
  familyBody:       'Inter',              // UI text
  familyMono:       'Roboto Mono',        // card ranks

  // Weights
  weightRegular:    '400' as const,
  weightMedium:     '500' as const,
  weightSemiBold:   '600' as const,
  weightBold:       '700' as const,
  weightExtraBold:  '800' as const,

  // Scale (sp)
  size2xs: 10,
  sizeXs:  12,
  sizeSm:  14,
  sizeMd:  16,
  sizeLg:  18,
  sizeXl:  22,
  size2xl: 28,
  size3xl: 36,
  size4xl: 48,

  // Line heights
  lineHeightTight:  1.2,
  lineHeightNormal: 1.5,
  lineHeightLoose:  1.8,
} as const;

// ---------------------------------------------------------------------------
// Spacing (8-point grid)
// ---------------------------------------------------------------------------

export const Spacing = {
  px:   1,
  xs:   4,
  sm:   8,
  md:   12,
  lg:   16,
  xl:   24,
  '2xl': 32,
  '3xl': 48,
  '4xl': 64,
} as const;

// ---------------------------------------------------------------------------
// Border radius
// ---------------------------------------------------------------------------

export const Radius = {
  none:   0,
  sm:     4,
  md:     8,
  lg:     12,
  xl:     16,
  full:   9999,
  card:   10,  // playing cards
  chip:   50,  // poker chips are circular
} as const;

// ---------------------------------------------------------------------------
// Shadows (React Native shadow props)
// ---------------------------------------------------------------------------

export const Shadows = {
  card: {
    shadowColor:   palette.onyx,
    shadowOffset:  { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius:  8,
    elevation:     8,
  },
  elevated: {
    shadowColor:   palette.onyx,
    shadowOffset:  { width: 0, height: 8 },
    shadowOpacity: 0.7,
    shadowRadius:  16,
    elevation:     12,
  },
  button: {
    shadowColor:   palette.goldBright,
    shadowOffset:  { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius:  6,
    elevation:     4,
  },
} as const;

// ---------------------------------------------------------------------------
// Animation durations (ms)
// ---------------------------------------------------------------------------

export const Duration = {
  instant:  0,
  fast:     150,
  normal:   300,
  slow:     500,
  deal:     200,   // per card deal
  flip:     350,   // card flip
  payout:   600,   // chip animation
} as const;

// ---------------------------------------------------------------------------
// Z-indices
// ---------------------------------------------------------------------------

export const ZIndex = {
  base:    0,
  card:    10,
  overlay: 100,
  modal:   200,
  toast:   300,
} as const;
