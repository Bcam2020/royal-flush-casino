import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Dimensions,
  StatusBar,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/types';
import { Colors, Typography, Spacing, Radius, Shadows, Duration } from '../../constants/theme';

type HomeNav = NativeStackNavigationProp<RootStackParamList, 'Home'>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - Spacing['2xl'] * 2;

// ---------------------------------------------------------------------------
// Game data
// ---------------------------------------------------------------------------

interface GameDefinition {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  /** Primary gradient — top colour */
  gradientTop: string;
  /** Primary gradient — bottom colour */
  gradientBottom: string;
  /** Accent colour for the icon and CTA */
  accent: string;
  /** Large decorative character(s) rendered behind the card content */
  decorativeSymbol: string;
  houseEdge: string;
  minBet: string;
}

const GAMES: GameDefinition[] = [
  {
    id: 'blackjack',
    title: 'Blackjack',
    subtitle: 'Classic 21',
    description: 'Six-deck shoe · Dealer stands on soft 17 · 3:2 blackjack',
    gradientTop:    '#0a2310',
    gradientBottom: '#061508',
    accent: Colors.accentGold,
    decorativeSymbol: '🂡',
    houseEdge: '0.5%',
    minBet: '$5',
  },
  {
    id: 'roulette',
    title: 'Roulette',
    subtitle: 'European Wheel',
    description: 'Single zero · 37 pockets · 35:1 on a straight up bet',
    gradientTop:    '#1a0a0a',
    gradientBottom: '#0d0505',
    accent: Colors.suitRed,
    decorativeSymbol: '⊕',
    houseEdge: '2.7%',
    minBet: '$1',
  },
  {
    id: 'three-card-poker',
    title: 'Three Card Poker',
    subtitle: 'Ante & Pair Plus',
    description: 'Dealer qualifies Queen-high · Pair Plus side bet · 40:1 straight flush',
    gradientTop:    '#0f0a1a',
    gradientBottom: '#070512',
    accent: '#7b5ea7',
    decorativeSymbol: '♠♥♦',
    houseEdge: '3.5%',
    minBet: '$5',
  },
];

// ---------------------------------------------------------------------------
// GameCard
// ---------------------------------------------------------------------------

interface GameCardProps {
  game: GameDefinition;
  onPress: (id: string) => void;
}

function GameCard({ game, onPress }: GameCardProps) {
  const scale = useRef(new Animated.Value(1)).current;

  function handlePressIn() {
    Animated.spring(scale, {
      toValue: 0.97,
      useNativeDriver: true,
      speed: 40,
      bounciness: 4,
    }).start();
  }

  function handlePressOut() {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 20,
      bounciness: 6,
    }).start();
  }

  return (
    <Animated.View style={[styles.cardWrapper, { transform: [{ scale }] }]}>
      <TouchableOpacity
        activeOpacity={1}
        onPress={() => onPress(game.id)}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={styles.cardTouchable}
        accessibilityRole="button"
        accessibilityLabel={`Play ${game.title}`}
      >
        <LinearGradient
          colors={[game.gradientTop, game.gradientBottom]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.cardGradient}
        >
          {/* Gold border overlay */}
          <View style={styles.cardBorder} />

          {/* Decorative watermark symbol */}
          <Text style={styles.decorativeSymbol} aria-hidden>
            {game.decorativeSymbol}
          </Text>

          {/* Card content */}
          <View style={styles.cardContent}>
            <View>
              <Text style={[styles.gameSubtitle, { color: game.accent }]}>
                {game.subtitle}
              </Text>
              <Text style={styles.gameTitle}>{game.title}</Text>
              <Text style={styles.gameDescription}>{game.description}</Text>
            </View>

            {/* Stats row */}
            <View style={styles.statsRow}>
              <StatPill label="House Edge" value={game.houseEdge} accent={game.accent} />
              <StatPill label="Min Bet" value={game.minBet} accent={game.accent} />
            </View>

            {/* CTA button */}
            <TouchableOpacity
              style={[styles.playButton, { borderColor: game.accent }]}
              onPress={() => onPress(game.id)}
              accessibilityRole="button"
              accessibilityLabel={`Play ${game.title}`}
            >
              <LinearGradient
                colors={[game.accent + '33', game.accent + '11']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.playButtonGradient}
              >
                <Text style={[styles.playButtonText, { color: game.accent }]}>
                  PLAY NOW
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------
// StatPill
// ---------------------------------------------------------------------------

interface StatPillProps {
  label: string;
  value: string;
  accent: string;
}

function StatPill({ label, value, accent }: StatPillProps) {
  return (
    <View style={styles.statPill}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, { color: accent }]}>{value}</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Header
// ---------------------------------------------------------------------------

function Header() {
  return (
    <LinearGradient
      colors={[Colors.feltBackground, Colors.background]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={styles.header}
    >
      {/* Decorative top rule */}
      <View style={styles.headerRule}>
        <View style={[styles.ruleLine, { flex: 1 }]} />
        <Text style={styles.ruleDiamond}>◆</Text>
        <View style={[styles.ruleLine, { flex: 1 }]} />
      </View>

      <Text style={styles.casinoName} numberOfLines={1} adjustsFontSizeToFit>
        ROYAL FLUSH
      </Text>
      <Text style={styles.casinoTagline}>C A S I N O</Text>

      {/* Chip balance pill */}
      <View style={styles.balancePill}>
        <Text style={styles.balanceLabel}>CHIPS</Text>
        <Text style={styles.balanceAmount}>$1,000</Text>
      </View>

      {/* Bottom rule */}
      <View style={[styles.headerRule, { marginTop: Spacing.lg }]}>
        <View style={[styles.ruleLine, { flex: 1 }]} />
        <Text style={styles.ruleDiamond}>◆</Text>
        <View style={[styles.ruleLine, { flex: 1 }]} />
      </View>
    </LinearGradient>
  );
}

// ---------------------------------------------------------------------------
// HomeScreen
// ---------------------------------------------------------------------------

interface HomeScreenProps {
  /** Called when the user taps a game card. Receives the game id. */
  onSelectGame?: (gameId: string) => void;
}

export default function HomeScreen({ onSelectGame }: HomeScreenProps) {
  const navigation = useNavigation<HomeNav>();

  function handleGamePress(id: string) {
    onSelectGame?.(id);
    if (id === 'blackjack') navigation.navigate('Blackjack');
    // Roulette and Three Card Poker screens to be added
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.background} />

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces
        >
          <Header />

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>SELECT A GAME</Text>
          </View>

          <View style={styles.gameList}>
            {GAMES.map((game) => (
              <GameCard key={game.id} game={game} onPress={handleGamePress} />
            ))}
          </View>

          {/* Footer ornament */}
          <View style={styles.footer}>
            <View style={[styles.ruleLine, { flex: 1 }]} />
            <Text style={styles.footerText}>♠  ♥  ♦  ♣</Text>
            <View style={[styles.ruleLine, { flex: 1 }]} />
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  safeArea: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Spacing['4xl'],
  },

  // ── Header ──────────────────────────────────────────────────────────────
  header: {
    alignItems: 'center',
    paddingTop: Spacing.xl,
    paddingBottom: Spacing['2xl'],
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.sm,
  },
  headerRule: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: Spacing.md,
  },
  ruleLine: {
    height: 1,
    backgroundColor: Colors.accentGoldDark,
    opacity: 0.6,
  },
  ruleDiamond: {
    color: Colors.accentGold,
    fontSize: Typography.sizeXs,
    marginHorizontal: Spacing.sm,
  },
  casinoName: {
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontSize: Typography.size2xl,
    fontWeight: Typography.weightExtraBold,
    color: Colors.accentGold,
    letterSpacing: 4,
    textShadowColor: Colors.accentGoldLight,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
    marginBottom: Spacing.xs,
    textAlign: 'center',
  },
  casinoTagline: {
    fontSize: Typography.sizeXs,
    fontWeight: Typography.weightMedium,
    color: Colors.accentGoldDark,
    letterSpacing: 10,
    marginBottom: Spacing.xl,
    textAlign: 'center',
  },
  balancePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: Colors.accentGoldDark,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  balanceLabel: {
    fontSize: Typography.sizeXs,
    fontWeight: Typography.weightSemiBold,
    color: Colors.accentGoldDark,
    letterSpacing: 2,
  },
  balanceAmount: {
    fontSize: Typography.sizeMd,
    fontWeight: Typography.weightBold,
    color: Colors.accentGold,
  },

  // ── Section header ───────────────────────────────────────────────────────
  sectionHeader: {
    paddingHorizontal: Spacing['2xl'],
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: Typography.sizeXs,
    fontWeight: Typography.weightSemiBold,
    color: Colors.textSecondary,
    letterSpacing: 4,
  },

  // ── Game list ────────────────────────────────────────────────────────────
  gameList: {
    gap: Spacing.lg,
    paddingHorizontal: Spacing['2xl'],
  },

  // ── Game card ────────────────────────────────────────────────────────────
  cardWrapper: {
    width: CARD_WIDTH,
    borderRadius: Radius.lg,
    ...Shadows.card,
  },
  cardTouchable: {
    borderRadius: Radius.lg,
    overflow: 'hidden',
  },
  cardGradient: {
    borderRadius: Radius.lg,
    minHeight: 200,
    padding: Spacing.xl,
    overflow: 'hidden',
  },
  cardBorder: {
    ...StyleSheet.absoluteFill,
    borderWidth: 1,
    borderColor: Colors.accentGoldDark,
    borderRadius: Radius.lg,
    opacity: 0.5,
  },
  decorativeSymbol: {
    position: 'absolute',
    right: -Spacing.sm,
    bottom: -Spacing.xl,
    fontSize: 120,
    opacity: 0.08,
    color: Colors.accentGold,
    lineHeight: 130,
  },
  cardContent: {
    gap: Spacing.lg,
  },
  gameSubtitle: {
    fontSize: Typography.sizeXs,
    fontWeight: Typography.weightSemiBold,
    letterSpacing: 3,
    marginBottom: Spacing.xs,
  },
  gameTitle: {
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontSize: Typography.size2xl,
    fontWeight: Typography.weightBold,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  gameDescription: {
    fontSize: Typography.sizeSm,
    color: Colors.textSecondary,
    lineHeight: Typography.sizeSm * Typography.lineHeightNormal,
    flexShrink: 1,
    flexWrap: 'wrap',
  },

  // ── Stats ────────────────────────────────────────────────────────────────
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  statPill: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: Typography.size2xs,
    color: Colors.textSecondary,
    letterSpacing: 1,
    marginBottom: 2,
  },
  statValue: {
    fontSize: Typography.sizeSm,
    fontWeight: Typography.weightBold,
  },

  // ── Play button ──────────────────────────────────────────────────────────
  playButton: {
    borderWidth: 1,
    borderRadius: Radius.md,
    overflow: 'hidden',
    alignSelf: 'flex-start',
  },
  playButtonGradient: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
  },
  playButtonText: {
    fontSize: Typography.sizeSm,
    fontWeight: Typography.weightBold,
    letterSpacing: 2,
  },

  // ── Footer ───────────────────────────────────────────────────────────────
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing['2xl'],
    marginTop: Spacing['3xl'],
    gap: Spacing.md,
  },
  footerText: {
    fontSize: Typography.sizeSm,
    color: Colors.accentGoldDark,
    letterSpacing: 6,
  },
});
