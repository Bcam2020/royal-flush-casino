import React, { useEffect } from 'react';
import { StyleSheet, Text, View, type ViewStyle, type StyleProp } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withRepeat,
  withSequence,
  withDelay,
  interpolate,
  Easing,
} from 'react-native-reanimated';
import type { Card } from '../../utils/deck';
import { isRedCard, cardLabel, SUIT_SYMBOLS } from '../../utils/deck';
import { Colors, Radius, Shadows } from '../../constants/theme';

// ---------------------------------------------------------------------------
// Dimensions
// ---------------------------------------------------------------------------

export const CARD_WIDTH = 72;
export const CARD_HEIGHT = 104;

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface PlayingCardProps {
  card: Card;
  /** Delay in ms before the deal animation starts */
  dealDelay?: number;
  /** Whether this card was just added (plays deal animation) */
  isNew?: boolean;
  /** Gently bobs up and down while the player thinks */
  isFloating?: boolean;
  /** Override faceDown state (for staged hole-card reveal) */
  forceFaceDown?: boolean;
  /** True triggers the 3-D flip-to-face-up animation */
  flipToFaceUp?: boolean;
  style?: StyleProp<ViewStyle>;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function PlayingCard({
  card,
  dealDelay = 0,
  isNew = false,
  isFloating = false,
  forceFaceDown,
  flipToFaceUp = false,
  style,
}: PlayingCardProps) {
  const faceDown = forceFaceDown ?? card.faceDown;

  // ── Deal animation (arc fly-in from deck area, upper-right) ──────────────
  const dealX = useSharedValue(isNew ? 220 : 0);
  const dealY = useSharedValue(isNew ? -260 : 0);
  const dealRotate = useSharedValue(isNew ? 25 : 0);
  const dealOpacity = useSharedValue(isNew ? 0 : 1);
  const dealScale = useSharedValue(isNew ? 0.7 : 1);

  useEffect(() => {
    if (!isNew) return;
    dealOpacity.value = withDelay(dealDelay, withTiming(1, { duration: 80 }));
    // X slides in with ease-out cubic
    dealX.value = withDelay(
      dealDelay,
      withTiming(0, { duration: 380, easing: Easing.out(Easing.cubic) }),
    );
    // Y bounces with spring for a natural settling arc
    dealY.value = withDelay(
      dealDelay,
      withSpring(0, { damping: 14, stiffness: 110, mass: 0.8 }),
    );
    dealRotate.value = withDelay(
      dealDelay,
      withSpring(0, { damping: 12, stiffness: 120 }),
    );
    dealScale.value = withDelay(
      dealDelay,
      withSpring(1, { damping: 16, stiffness: 140 }),
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isNew, dealDelay]);

  const dealStyle = useAnimatedStyle(() => ({
    opacity: dealOpacity.value,
    transform: [
      { translateX: dealX.value },
      { translateY: dealY.value },
      { rotate: `${dealRotate.value}deg` },
      { scale: dealScale.value },
    ],
  }));

  // ── Float animation (gentle bob while waiting for player) ────────────────
  const floatY = useSharedValue(0);

  useEffect(() => {
    if (isFloating) {
      floatY.value = withRepeat(
        withSequence(
          withTiming(-4, { duration: 1400, easing: Easing.inOut(Easing.sin) }),
          withTiming(4, { duration: 1400, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        true,
      );
    } else {
      floatY.value = withTiming(0, { duration: 300 });
    }
  }, [isFloating, floatY]);

  const floatStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: floatY.value }],
  }));

  // ── 3-D flip animation (hole card reveal) ────────────────────────────────
  //
  // Strategy: two absolute-positioned views (front + back) share the same
  // container. Back face rotates 0 → -90 (disappears behind) while front
  // rotates 90 → 0 (appears from behind). We swap opacity at midpoint so
  // only one face is ever visible.
  //
  const flipProgress = useSharedValue(faceDown ? 0 : 1);

  useEffect(() => {
    if (flipToFaceUp) {
      flipProgress.value = withTiming(1, {
        duration: 420,
        easing: Easing.inOut(Easing.quad),
      });
    }
  }, [flipToFaceUp, flipProgress]);

  const frontStyle = useAnimatedStyle(() => {
    const rotateY = interpolate(flipProgress.value, [0.5, 1], [90, 0]);
    return {
      opacity: flipProgress.value >= 0.5 ? 1 : 0,
      transform: [{ perspective: 1000 }, { rotateY: `${rotateY}deg` }],
    };
  });

  const backStyle = useAnimatedStyle(() => {
    const rotateY = interpolate(flipProgress.value, [0, 0.5], [0, -90]);
    return {
      opacity: flipProgress.value < 0.5 ? 1 : 0,
      transform: [{ perspective: 1000 }, { rotateY: `${rotateY}deg` }],
    };
  });

  // ── Render ────────────────────────────────────────────────────────────────

  const isRed = !faceDown && isRedCard(card);
  const suitColor = isRed ? Colors.suitRed : Colors.suitBlack;
  const label = cardLabel(card);

  const isFlippable = flipToFaceUp || (forceFaceDown !== undefined);

  if (isFlippable) {
    // Two-face flip variant
    return (
      <Animated.View style={[styles.wrapper, style, dealStyle, floatStyle]}>
        {/* Front face */}
        <Animated.View style={[styles.card, styles.face, frontStyle]}>
          <CardFace card={card} suitColor={suitColor} label={label} />
        </Animated.View>

        {/* Back face */}
        <Animated.View style={[styles.card, styles.face, styles.cardBack, backStyle]}>
          <CardBack />
        </Animated.View>
      </Animated.View>
    );
  }

  // Simple (no flip)
  return (
    <Animated.View style={[styles.wrapper, style, dealStyle, floatStyle]}>
      <View style={styles.card}>
        {faceDown ? <CardBack /> : <CardFace card={card} suitColor={suitColor} label={label} />}
      </View>
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------
// Card faces
// ---------------------------------------------------------------------------

function CardFace({ card, suitColor, label }: { card: Card; suitColor: string; label: string }) {
  const symbol = SUIT_SYMBOLS[card.suit];
  return (
    <>
      {/* Top-left rank + suit */}
      <View style={styles.corner}>
        <Text style={[styles.rankText, { color: suitColor }]}>{card.rank}</Text>
        <Text style={[styles.suitTextSmall, { color: suitColor }]}>{symbol}</Text>
      </View>

      {/* Centre suit */}
      <Text style={[styles.centreSymbol, { color: suitColor }]}>{symbol}</Text>

      {/* Bottom-right (rotated) */}
      <View style={[styles.corner, styles.cornerBottom]}>
        <Text style={[styles.rankText, { color: suitColor, transform: [{ rotate: '180deg' }] }]}>
          {card.rank}
        </Text>
        <Text style={[styles.suitTextSmall, { color: suitColor, transform: [{ rotate: '180deg' }] }]}>
          {symbol}
        </Text>
      </View>
    </>
  );
}

function CardBack() {
  return (
    <View style={styles.backInner}>
      {/* Diamond cross-hatch pattern */}
      <View style={styles.backBorder}>
        <Text style={styles.backPattern}>◆</Text>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  wrapper: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
  },
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    backgroundColor: Colors.cardFace,
    borderRadius: Radius.card,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.15)',
    overflow: 'hidden',
    ...Shadows.card,
    // Extra depth shadow layered underneath
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 6 },
    shadowOpacity: 0.55,
    shadowRadius: 10,
    elevation: 10,
  },
  face: {
    position: 'absolute',
    top: 0,
    left: 0,
    backfaceVisibility: 'hidden',
  },
  cardBack: {
    backgroundColor: Colors.cardBack,
  },
  corner: {
    position: 'absolute',
    top: 5,
    left: 6,
    alignItems: 'center',
  },
  cornerBottom: {
    top: undefined,
    left: undefined,
    bottom: 5,
    right: 6,
  },
  rankText: {
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 16,
  },
  suitTextSmall: {
    fontSize: 10,
    lineHeight: 12,
  },
  centreSymbol: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    fontSize: 30,
    transform: [{ translateX: -15 }, { translateY: -18 }],
  },
  backInner: {
    flex: 1,
    backgroundColor: Colors.cardBack,
    margin: 4,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.cardBackPattern ?? '#17304f',
  },
  backBorder: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    transform: [{ rotate: '45deg' }],
  },
  backPattern: {
    fontSize: 20,
    color: 'rgba(255,255,255,0.3)',
    transform: [{ rotate: '-45deg' }],
  },
});
