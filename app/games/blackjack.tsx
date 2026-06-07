import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  Platform,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  withDelay,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useBlackjack } from '../../src/hooks/useBlackjack';
import PlayingCard from '../../src/components/casino/PlayingCard';
import ChipSelector from '../../src/components/casino/ChipSelector';
import { Colors, Typography, Spacing, Radius, Shadows } from '../../src/constants/theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ---------------------------------------------------------------------------
// Blackjack screen
// ---------------------------------------------------------------------------

export default function BlackjackScreen() {
  const navigation = useNavigation();
  const {
    display,
    addChip,
    clearBet,
    deal,
    hit,
    stand,
    doubleDown,
    split,
    surrender,
    nextRound,
    newPlayerCardIdx,
    newDealerCardIdx,
  } = useBlackjack();

  // ── Camera push-in on deal ────────────────────────────────────────────────
  const cameraScale = useSharedValue(1);
  const cameraStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cameraScale.value }],
  }));

  // ── Bust screen shake ─────────────────────────────────────────────────────
  const shakeX = useSharedValue(0);
  const bustOverlayOpacity = useSharedValue(0);

  const shakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.value }],
  }));
  const bustOverlayStyle = useAnimatedStyle(() => ({
    opacity: bustOverlayOpacity.value,
  }));

  // ── Result banner spring ──────────────────────────────────────────────────
  const bannerScale = useSharedValue(0);
  const bannerRotate = useSharedValue(-10);

  const bannerStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: bannerScale.value },
      { rotate: `${bannerRotate.value}deg` },
    ],
  }));

  // ── Phase-change side effects ─────────────────────────────────────────────
  const prevPhaseRef = useRef(display.phase);

  useEffect(() => {
    const prev = prevPhaseRef.current;
    const cur = display.phase;
    prevPhaseRef.current = cur;

    // Camera zoom into table when deal starts
    if (prev === 'betting' && cur === 'dealing') {
      cameraScale.value = 0.94;
      cameraScale.value = withSpring(1, { damping: 18, stiffness: 85, mass: 0.9 });
    }

    // Result phase: play appropriate animation
    if (cur === 'result') {
      if (display.isBust || display.result === 'lose') {
        // Red flash
        bustOverlayOpacity.value = withSequence(
          withTiming(0.4, { duration: 70 }),
          withDelay(100, withTiming(0, { duration: 420 })),
        );
      }
      if (display.isBust) {
        // Screen shake
        shakeX.value = withSequence(
          withTiming(-13, { duration: 48, easing: Easing.linear }),
          withTiming(13,  { duration: 48, easing: Easing.linear }),
          withTiming(-10, { duration: 48, easing: Easing.linear }),
          withTiming(10,  { duration: 48, easing: Easing.linear }),
          withTiming(-5,  { duration: 48, easing: Easing.linear }),
          withTiming(0,   { duration: 48, easing: Easing.linear }),
        );
      }
      // Banner explodes in
      bannerScale.value = 0;
      bannerRotate.value = display.result === 'win' || display.result === 'blackjack' ? -10 : 10;
      bannerScale.value = withSpring(1, { damping: 9, stiffness: 240, mass: 0.6 });
      bannerRotate.value = withSpring(0, { damping: 11, stiffness: 160 });
    }

    // Reset banner when going back to betting
    if (cur === 'betting') {
      bannerScale.value = withTiming(0, { duration: 120 });
    }
  // Reanimated shared values are stable — no need to list them as deps
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [display.phase, display.result, display.isBust]);

  // ── Helpers ───────────────────────────────────────────────────────────────

  function scoreLabel(score: number, isSoft: boolean): string {
    if (score === 0) return '';
    if (isSoft && score < 21) return `${score - 10} / ${score}`;
    return String(score);
  }

  const showDealerScore =
    display.phase === 'dealer_reveal' || display.phase === 'result';

  const { availableActions: ax } = display;
  const isPlayerTurn = display.phase === 'player_turn';

  // Result banner config
  type ResultKey = NonNullable<typeof display.result>;
  const resultConfig: Record<ResultKey, { title: string; icon: string; accent: string; bg: string }> = {
    win:       { title: 'YOU WIN',     icon: '🏆', accent: Colors.win,         bg: 'rgba(0,100,30,0.95)' },
    lose:      { title: 'YOU LOSE',    icon: '💀', accent: Colors.lose,        bg: 'rgba(90,10,10,0.97)' },
    push:      { title: 'PUSH',        icon: '🤝', accent: '#aaa',             bg: 'rgba(40,40,40,0.97)' },
    blackjack: { title: 'BLACKJACK!',  icon: '⭐', accent: Colors.accentGold,  bg: 'rgba(60,40,0,0.97)'  },
    bust:      { title: 'BUST',        icon: '💥', accent: Colors.lose,        bg: 'rgba(90,10,10,0.97)' },
    surrender: { title: 'SURRENDERED', icon: '🏳', accent: '#888',             bg: 'rgba(20,20,30,0.97)' },
  };
  const rc = display.result ? resultConfig[display.result] : null;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.background} />

      {/* Bust red flash overlay */}
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, styles.bustOverlay, bustOverlayStyle]}
      />

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
            accessibilityRole="button"
            accessibilityLabel="Return to lobby"
          >
            <Text style={styles.backChevron}>‹</Text>
            <Text style={styles.backText}>LOBBY</Text>
          </TouchableOpacity>

          <Text style={styles.titleText}>BLACKJACK</Text>

          <View style={styles.balancePill}>
            <Text style={styles.balanceText}>${display.balance.toLocaleString()}</Text>
          </View>
        </View>

        {/* ── Table (camera scale + shake wrapper) ───────────────────────── */}
        <Animated.View style={[styles.tableOuter, cameraStyle, shakeStyle]}>
          <LinearGradient
            colors={[Colors.feltHighlight, Colors.feltAccent, Colors.feltBackground, '#030a04']}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={styles.table}
          >
            {/* Subtle felt-dot texture row at top */}
            <View style={styles.feltBadge}>
              <Text style={styles.feltBadgeText}>BLACKJACK PAYS 3 : 2</Text>
            </View>

            {/* ── Dealer zone ──────────────────────────────────────────── */}
            <View style={styles.dealerZone}>
              <Text style={styles.zoneLabel}>DEALER</Text>

              {showDealerScore && display.dealerScore > 0 && (
                <Text style={styles.scoreChip}>
                  {scoreLabel(display.dealerScore, display.dealerIsSoft)}
                </Text>
              )}

              <View style={styles.handRow}>
                {display.dealerCards.map((card, i) => {
                  const isHole = i === 1;
                  const shouldFlip = isHole && display.holeCardFaceUp;
                  const isNew = i === newDealerCardIdx;
                  return (
                    <PlayingCard
                      key={`d-${i}-${card.rank}-${card.suit}`}
                      card={card}
                      isNew={isNew}
                      dealDelay={0}
                      forceFaceDown={isHole && !display.holeCardFaceUp ? true : undefined}
                      flipToFaceUp={shouldFlip}
                      isFloating={false}
                      style={styles.cardGap}
                    />
                  );
                })}
              </View>
            </View>

            {/* ── Felt divider ──────────────────────────────────────────── */}
            <View style={styles.feltDivider}>
              <View style={styles.feltLine} />
              <Text style={styles.feltDiamond}>◆ ◆ ◆</Text>
              <View style={styles.feltLine} />
            </View>

            {/* ── Player zone ───────────────────────────────────────────── */}
            <View style={styles.playerZone}>
              <View style={styles.handRow}>
                {display.playerCards.map((card, i) => {
                  const isNew = i === newPlayerCardIdx;
                  return (
                    <PlayingCard
                      key={`p-${i}-${card.rank}-${card.suit}`}
                      card={card}
                      isNew={isNew}
                      dealDelay={0}
                      isFloating={display.phase === 'player_turn'}
                      style={styles.cardGap}
                    />
                  );
                })}
              </View>

              {display.playerScore > 0 && (
                <View style={styles.playerScoreRow}>
                  <Text style={styles.zoneLabel}>PLAYER</Text>
                  <Text
                    style={[
                      styles.scoreChip,
                      display.isBust && styles.scoreChipBust,
                      display.playerScore === 21 && !display.isBust && styles.scoreChip21,
                    ]}
                  >
                    {display.isBust
                      ? 'BUST'
                      : scoreLabel(display.playerScore, display.playerIsSoft)}
                  </Text>
                </View>
              )}
            </View>
          </LinearGradient>
        </Animated.View>

        {/* ── Controls ──────────────────────────────────────────────────── */}
        <View style={styles.controls}>
          {display.phase === 'betting' && (
            <ChipSelector
              bet={display.pendingBet}
              balance={display.balance}
              onChipTap={addChip}
              onClear={clearBet}
              onDeal={deal}
            />
          )}

          {(display.phase === 'player_turn' ||
            display.phase === 'dealing' ||
            display.phase === 'dealer_reveal') && (
            <View style={styles.actionRow}>
              <ActionBtn
                label="HIT"
                onPress={hit}
                enabled={isPlayerTurn && ax.hit}
                accent={Colors.win}
              />
              <ActionBtn
                label="STAND"
                onPress={stand}
                enabled={isPlayerTurn && ax.stand}
                accent={Colors.accentGold}
              />
              <ActionBtn
                label="2×"
                onPress={doubleDown}
                enabled={isPlayerTurn && ax.double_down}
                accent={Colors.chipPurple}
                compact
              />
              {ax.split && (
                <ActionBtn
                  label="SPLIT"
                  onPress={split}
                  enabled={isPlayerTurn && ax.split}
                  accent={Colors.info}
                  compact
                />
              )}
              {ax.surrender && (
                <ActionBtn
                  label="GIV"
                  onPress={surrender}
                  enabled={isPlayerTurn && ax.surrender}
                  accent={Colors.textSecondary}
                  compact
                />
              )}
            </View>
          )}

          {display.phase === 'result' && (
            <View style={styles.playAgainContainer}>
              <TouchableOpacity
                style={styles.playAgainBtn}
                onPress={nextRound}
                accessibilityRole="button"
                accessibilityLabel="Play next round"
              >
                <Text style={styles.playAgainText}>PLAY AGAIN</Text>
              </TouchableOpacity>
            </View>
          )}

          {display.phase === 'game_over' && (
            <View style={styles.playAgainContainer}>
              <Text style={styles.gameOverText}>GAME OVER</Text>
              <TouchableOpacity
                style={styles.playAgainBtn}
                onPress={() => navigation.goBack()}
              >
                <Text style={styles.playAgainText}>BACK TO LOBBY</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </SafeAreaView>

      {/* ── Result banner (absolute, spring-in on top of everything) ─────── */}
      {display.phase === 'result' && rc && (
        <Animated.View style={[styles.bannerWrapper, bannerStyle]} pointerEvents="none">
          <View style={[styles.banner, { backgroundColor: rc.bg, borderColor: rc.accent }]}>
            <Text style={styles.bannerIcon}>{rc.icon}</Text>
            <Text style={[styles.bannerTitle, { color: rc.accent }]}>{rc.title}</Text>
            {display.result === 'blackjack' && (
              <Text style={[styles.bannerSub, { color: Colors.accentGoldDark }]}>3 : 2  PAYOUT</Text>
            )}
            <Text
              style={[
                styles.bannerPnl,
                { color: display.netPnl >= 0 ? Colors.win : Colors.lose },
              ]}
            >
              {display.netPnl >= 0 ? '+' : ''}
              {display.netPnl.toLocaleString()}
            </Text>
          </View>
        </Animated.View>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// ActionBtn — animated game action button
// ---------------------------------------------------------------------------

interface ActionBtnProps {
  label: string;
  onPress: () => void;
  enabled: boolean;
  accent?: string;
  compact?: boolean;
}

function ActionBtn({ label, onPress, enabled, accent = Colors.accentGold, compact = false }: ActionBtnProps) {
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: interpolate(scale.value, [0.88, 1], [0.85, enabled ? 1 : 0.3]),
  }));

  return (
    <Animated.View style={animStyle}>
      <TouchableOpacity
        style={[
          styles.actionBtn,
          compact && styles.actionBtnCompact,
          { borderColor: enabled ? accent : Colors.border },
        ]}
        disabled={!enabled}
        onPress={onPress}
        onPressIn={() => {
          if (enabled) scale.value = withSpring(0.88, { damping: 14, stiffness: 340 });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 10, stiffness: 220 });
        }}
        activeOpacity={1}
        accessibilityRole="button"
        accessibilityLabel={label}
      >
        <Text
          style={[
            styles.actionBtnLabel,
            compact && styles.actionBtnLabelCompact,
            { color: enabled ? accent : Colors.textDisabled },
          ]}
        >
          {label}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#060d07',
  },
  safe: {
    flex: 1,
  },

  // Bust overlay
  bustOverlay: {
    backgroundColor: Colors.lose,
    zIndex: 10,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.sm,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    minWidth: 80,
  },
  backChevron: {
    fontSize: 30,
    color: Colors.accentGold,
    lineHeight: 32,
    marginTop: -3,
  },
  backText: {
    fontSize: Typography.size2xs,
    fontWeight: '800',
    color: Colors.accentGoldDark,
    letterSpacing: 2,
  },
  titleText: {
    fontSize: Typography.sizeMd,
    fontWeight: '900',
    color: Colors.accentGold,
    letterSpacing: 5,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  balancePill: {
    minWidth: 80,
    alignItems: 'flex-end',
    backgroundColor: 'rgba(212,175,55,0.12)',
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.accentGoldDark,
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
  },
  balanceText: {
    fontSize: Typography.sizeSm,
    fontWeight: '800',
    color: Colors.accentGold,
  },

  // Table
  tableOuter: {
    flex: 1,
    marginHorizontal: Spacing.sm,
    marginBottom: Spacing.sm,
    borderRadius: Radius.xl,
    overflow: 'hidden',
    ...Shadows.elevated,
  },
  table: {
    flex: 1,
    borderRadius: Radius.xl,
    borderWidth: 2,
    borderColor: Colors.feltHighlight,
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
  },

  feltBadge: {
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.25)',
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 2,
  },
  feltBadgeText: {
    fontSize: Typography.size2xs,
    color: 'rgba(212,175,55,0.45)',
    fontWeight: '700',
    letterSpacing: 2,
  },

  // Dealer
  dealerZone: {
    alignItems: 'center',
    gap: Spacing.sm,
    paddingTop: Spacing.sm,
  },

  // Player
  playerZone: {
    alignItems: 'center',
    gap: Spacing.sm,
    paddingBottom: Spacing.sm,
  },
  playerScoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },

  handRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    paddingHorizontal: Spacing.md,
  },
  cardGap: {
    marginHorizontal: 5,
    marginVertical: 2,
  },

  zoneLabel: {
    fontSize: Typography.size2xs,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.35)',
    letterSpacing: 3,
  },
  scoreChip: {
    fontSize: Typography.sizeLg,
    fontWeight: '900',
    color: Colors.textPrimary,
    backgroundColor: 'rgba(0,0,0,0.35)',
    paddingHorizontal: Spacing.md,
    paddingVertical: 2,
    borderRadius: Radius.full,
    overflow: 'hidden',
  },
  scoreChipBust: {
    color: Colors.lose,
    backgroundColor: 'rgba(211,47,47,0.2)',
  },
  scoreChip21: {
    color: Colors.accentGold,
    backgroundColor: 'rgba(212,175,55,0.15)',
  },

  feltDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  feltLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(212,175,55,0.15)',
  },
  feltDiamond: {
    fontSize: 8,
    color: 'rgba(212,175,55,0.25)',
    marginHorizontal: Spacing.md,
    letterSpacing: 4,
  },

  // Controls
  controls: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    paddingBottom: Spacing.lg,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.sm,
    flexWrap: 'wrap',
  },

  actionBtn: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderWidth: 2,
    borderRadius: Radius.lg,
    backgroundColor: 'rgba(0,0,0,0.5)',
    minWidth: 88,
    alignItems: 'center',
    ...Shadows.card,
  },
  actionBtnCompact: {
    paddingHorizontal: Spacing.lg,
    minWidth: 64,
  },
  actionBtnLabel: {
    fontSize: Typography.sizeSm,
    fontWeight: '900',
    letterSpacing: 2,
  },
  actionBtnLabelCompact: {
    fontSize: Typography.sizeXs,
  },

  // Play again
  playAgainContainer: {
    alignItems: 'center',
    gap: Spacing.md,
  },
  playAgainBtn: {
    paddingHorizontal: Spacing['2xl'],
    paddingVertical: Spacing.md,
    backgroundColor: Colors.accentGold,
    borderRadius: Radius.md,
    ...Shadows.button,
  },
  playAgainText: {
    fontSize: Typography.sizeMd,
    fontWeight: '900',
    color: Colors.background,
    letterSpacing: 3,
  },
  gameOverText: {
    fontSize: Typography.sizeXl,
    fontWeight: '900',
    color: Colors.lose,
    letterSpacing: 4,
  },

  // Result banner
  bannerWrapper: {
    position: 'absolute',
    top: '28%',
    left: Spacing['2xl'],
    right: Spacing['2xl'],
    zIndex: 200,
    alignItems: 'center',
  },
  banner: {
    width: '100%',
    borderWidth: 2,
    borderRadius: Radius.xl,
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing['2xl'],
    alignItems: 'center',
    gap: Spacing.sm,
    ...Shadows.elevated,
  },
  bannerIcon: {
    fontSize: 44,
  },
  bannerTitle: {
    fontSize: Typography.size2xl,
    fontWeight: '900',
    letterSpacing: 4,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  bannerSub: {
    fontSize: Typography.sizeSm,
    fontWeight: '700',
    letterSpacing: 5,
  },
  bannerPnl: {
    fontSize: Typography.size3xl,
    fontWeight: '900',
    marginTop: Spacing.xs,
  },
});
