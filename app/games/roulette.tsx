import React, { useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';

import { Colors, Typography, Spacing, Radius } from '../../src/constants/theme';
import { useRoulette } from '../../src/hooks/useRoulette';
import { usePlayerStore } from '../../src/store/playerStore';
import RouletteWheel from '../../src/components/casino/RouletteWheel';
import RouletteBettingBoard from '../../src/components/casino/RouletteBettingBoard';
import RouletteHistory from '../../src/components/casino/RouletteHistory';
import audioManager from '../../src/utils/audio';

// ---------------------------------------------------------------------------
// Result banner
// ---------------------------------------------------------------------------

interface ResultBannerProps {
  number: number | null;
  netPnl: number;
  onDismiss: () => void;
}

const ResultBanner: React.FC<ResultBannerProps> = ({ number, netPnl, onDismiss }) => {
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (number === null) return;
    scale.value = withSpring(1, { damping: 12, stiffness: 200 });
    opacity.value = withTiming(1, { duration: 300 });
  }, [number]);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  if (number === null) return null;

  const isWin = netPnl > 0;
  const isZero = number === 0;
  const bannerColor = isZero ? Colors.win : isWin ? Colors.win : Colors.lose;

  return (
    <Animated.View style={[styles.bannerContainer, style]}>
      <LinearGradient
        colors={['rgba(0,0,0,0.92)', 'rgba(0,0,0,0.85)']}
        style={styles.bannerGradient}
      >
        <Text style={[styles.bannerNumber, { color: bannerColor }]}>{number}</Text>
        <Text style={[styles.bannerPnl, { color: bannerColor }]}>
          {netPnl > 0 ? `+$${netPnl.toLocaleString()}` : netPnl < 0 ? `-$${Math.abs(netPnl).toLocaleString()}` : 'No win'}
        </Text>
        <TouchableOpacity style={styles.bannerBtn} onPress={onDismiss} activeOpacity={0.8}>
          <Text style={styles.bannerBtnText}>New Spin</Text>
        </TouchableOpacity>
      </LinearGradient>
    </Animated.View>
  );
};

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

export default function RouletteScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { balance } = usePlayerStore();

  const {
    phase,
    bets,
    totalBet,
    lastResult,
    history,
    wheelAngle,
    winningNumber,
    actions,
  } = useRoulette();

  const [isMuted, setIsMuted] = React.useState(false);

  // Audio init
  useEffect(() => {
    audioManager.init().then(() => {
      setIsMuted(audioManager.isMuted());
    });
    return () => {
      audioManager.wheelSpinStop();
    };
  }, []);

  // Audio reactions to phase changes
  const prevPhase = useRef(phase);
  useEffect(() => {
    if (phase === 'spinning' && prevPhase.current === 'betting') {
      audioManager.wheelSpinStart();
      audioManager.ballRattleStart();
    }
    if (phase === 'result' && prevPhase.current === 'spinning') {
      audioManager.wheelSpinStop();
      audioManager.ballLand();
      if (lastResult && lastResult.netPnl > 0) {
        audioManager.coins();
      } else if (lastResult && lastResult.netPnl < 0) {
        audioManager.lose();
      }
    }
    prevPhase.current = phase;
  }, [phase, lastResult]);

  // Spin button pulse animation
  const spinBtnScale = useSharedValue(1);
  const spinBtnGlow = useSharedValue(0);

  useEffect(() => {
    if (phase === 'betting' && bets.length > 0) {
      spinBtnGlow.value = withSequence(
        withTiming(1, { duration: 600 }),
        withTiming(0.3, { duration: 600 }),
      );
      const interval = setInterval(() => {
        spinBtnGlow.value = withSequence(
          withTiming(1, { duration: 600 }),
          withTiming(0.3, { duration: 600 }),
        );
      }, 1200);
      return () => clearInterval(interval);
    } else {
      spinBtnGlow.value = withTiming(0, { duration: 300 });
    }
  }, [phase, bets.length]);

  const spinBtnStyle = useAnimatedStyle(() => ({
    transform: [{ scale: spinBtnScale.value }],
    shadowOpacity: spinBtnGlow.value * 0.8,
  }));

  const handleSpin = useCallback(() => {
    if (phase !== 'betting' || bets.length === 0) return;
    spinBtnScale.value = withSequence(
      withSpring(0.92, { damping: 8, stiffness: 400 }),
      withSpring(1, { damping: 8, stiffness: 400 }),
    );
    actions.spin();
  }, [phase, bets.length, actions]);

  const handleToggleMute = useCallback(async () => {
    const muted = await audioManager.toggleMute();
    setIsMuted(muted);
  }, []);

  const canSpin = phase === 'betting' && bets.length > 0;

  return (
    <LinearGradient
      colors={[Colors.background, '#030a04', '#050e06']}
      style={[styles.root, { paddingTop: insets.top }]}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.8}
        >
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        <Text style={styles.title}>ROULETTE</Text>

        <View style={styles.headerRight}>
          <TouchableOpacity onPress={handleToggleMute} style={styles.muteBtn} activeOpacity={0.8}>
            <Text style={styles.muteBtnText}>{isMuted ? '🔇' : '🔊'}</Text>
          </TouchableOpacity>
          <View style={styles.balancePill}>
            <Text style={styles.balanceText}>${balance.toLocaleString()}</Text>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 16 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Wheel */}
        <View style={styles.wheelSection}>
          <RouletteWheel
            isSpinning={phase === 'spinning'}
            targetAngle={wheelAngle}
            winningNumber={winningNumber}
          />

          {/* Last number badge */}
          {history.length > 0 && phase === 'betting' && (
            <View
              style={[
                styles.lastNumberBadge,
                {
                  backgroundColor:
                    history[0].color === 'green'
                      ? Colors.win
                      : history[0].color === 'red'
                      ? Colors.suitRed
                      : Colors.suitBlack,
                },
              ]}
            >
              <Text style={styles.lastNumberText}>{history[0].number}</Text>
            </View>
          )}
        </View>

        {/* History strip */}
        <View style={styles.historySection}>
          <RouletteHistory history={history} />
        </View>

        {/* Bet summary + action buttons */}
        <View style={styles.actionsRow}>
          <View style={styles.betSummary}>
            <Text style={styles.betSummaryLabel}>Total Bet</Text>
            <Text style={styles.betSummaryAmount}>${totalBet.toLocaleString()}</Text>
          </View>

          <View style={styles.actionBtns}>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={actions.undoLastBet}
              disabled={phase !== 'betting'}
              activeOpacity={0.7}
            >
              <Text style={styles.actionBtnText}>Undo</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={actions.clearBets}
              disabled={phase !== 'betting' || bets.length === 0}
              activeOpacity={0.7}
            >
              <Text style={styles.actionBtnText}>Clear</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, styles.actionBtnRepeat]}
              onPress={actions.repeatLastBets}
              disabled={phase !== 'betting'}
              activeOpacity={0.7}
            >
              <Text style={[styles.actionBtnText, { color: Colors.accentGold }]}>Repeat</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Betting board */}
        <View style={styles.boardSection}>
          <RouletteBettingBoard
            bets={bets}
            onBet={actions.placeBet}
            disabled={phase !== 'betting'}
          />
        </View>

        {/* Spin button */}
        <Animated.View style={[styles.spinBtnWrapper, spinBtnStyle]}>
          <TouchableOpacity
            style={[styles.spinBtn, !canSpin && styles.spinBtnDisabled]}
            onPress={handleSpin}
            disabled={!canSpin}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={
                canSpin
                  ? [Colors.accentGold, Colors.accentGoldDark]
                  : ['#444', '#333']
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.spinBtnGradient}
            >
              <Text style={[styles.spinBtnText, !canSpin && styles.spinBtnTextDisabled]}>
                {phase === 'spinning' ? 'SPINNING…' : 'SPIN'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>

      {/* Result overlay */}
      {phase === 'result' && lastResult && (
        <View style={styles.resultOverlay} pointerEvents="box-none">
          <ResultBanner
            number={lastResult.number}
            netPnl={lastResult.netPnl}
            onDismiss={actions.clearResult}
          />
        </View>
      )}
    </LinearGradient>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(212,175,55,0.3)',
  },
  backBtn: {
    paddingVertical: Spacing.xs,
    paddingRight: Spacing.sm,
  },
  backText: {
    color: Colors.accentGold,
    fontSize: Typography.sizeSm,
    fontWeight: '600',
  },
  title: {
    flex: 1,
    textAlign: 'center',
    color: Colors.accentGold,
    fontSize: Typography.sizeLg,
    fontWeight: '800',
    letterSpacing: 4,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  muteBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  muteBtnText: {
    fontSize: Typography.sizeMd,
  },
  balancePill: {
    backgroundColor: 'rgba(212,175,55,0.15)',
    borderWidth: 1,
    borderColor: Colors.accentGold,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
  },
  balanceText: {
    color: Colors.accentGold,
    fontSize: Typography.sizeSm,
    fontWeight: '700',
  },

  // Scroll
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.md,
    gap: Spacing.md,
  },

  // Wheel
  wheelSection: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
    position: 'relative',
  },
  lastNumberBadge: {
    position: 'absolute',
    right: Spacing.xl,
    top: Spacing.md,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 6,
  },
  lastNumberText: {
    color: '#fff',
    fontSize: Typography.sizeLg,
    fontWeight: '900',
  },

  // History
  historySection: {},

  // Actions
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  betSummary: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: Radius.md,
    padding: Spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.2)',
  },
  betSummaryLabel: {
    color: Colors.textPrimary,
    fontSize: Typography.size2xs,
    opacity: 0.5,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  betSummaryAmount: {
    color: Colors.accentGold,
    fontSize: Typography.sizeLg,
    fontWeight: '800',
  },
  actionBtns: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  actionBtn: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  actionBtnRepeat: {
    borderColor: Colors.accentGold,
    backgroundColor: 'rgba(212,175,55,0.08)',
  },
  actionBtnText: {
    color: Colors.textPrimary,
    fontSize: Typography.size2xs,
    fontWeight: '600',
  },

  // Board
  boardSection: {},

  // Spin button
  spinBtnWrapper: {
    shadowColor: Colors.accentGold,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 16,
    elevation: 12,
  },
  spinBtn: {
    borderRadius: Radius.xl,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: Colors.accentGold,
  },
  spinBtnDisabled: {
    borderColor: '#444',
  },
  spinBtnGradient: {
    paddingVertical: Spacing.lg,
    alignItems: 'center',
  },
  spinBtnText: {
    color: '#000',
    fontSize: Typography.sizeXl,
    fontWeight: '900',
    letterSpacing: 3,
  },
  spinBtnTextDisabled: {
    color: '#666',
  },

  // Result overlay
  resultOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  bannerContainer: {
    width: '80%',
    borderRadius: Radius.xl,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: Colors.accentGold,
    shadowColor: Colors.accentGold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 20,
  },
  bannerGradient: {
    padding: Spacing['2xl'],
    alignItems: 'center',
    gap: Spacing.sm,
  },
  bannerNumber: {
    fontSize: 72,
    fontWeight: '900',
    lineHeight: 80,
  },
  bannerPnl: {
    fontSize: Typography.size2xl,
    fontWeight: '800',
  },
  bannerBtn: {
    marginTop: Spacing.md,
    backgroundColor: Colors.accentGold,
    paddingHorizontal: Spacing['2xl'],
    paddingVertical: Spacing.md,
    borderRadius: Radius.full,
  },
  bannerBtnText: {
    color: '#000',
    fontSize: Typography.sizeLg,
    fontWeight: '900',
    letterSpacing: 2,
  },
});
