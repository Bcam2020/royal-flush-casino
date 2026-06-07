import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Colors } from '../../constants/theme';
import { WHEEL_ORDER, RED_NUMBERS } from '../../games/roulette/types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const WHEEL_SIZE = 280;
const WHEEL_RADIUS = WHEEL_SIZE / 2;
const POCKET_COUNT = 37;
const POCKET_ANGLE = 360 / POCKET_COUNT;
const SPIN_DURATION = 5500;

// Ball orbit radius (slightly inside the rim)
const BALL_ORBIT_R = WHEEL_RADIUS * 0.78;
const BALL_SIZE = 12;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getPocketColor(n: number): string {
  if (n === 0) return Colors.win; // green
  return RED_NUMBERS.has(n) ? Colors.suitRed : Colors.suitBlack;
}

function getPocketTextColor(n: number): string {
  return n === 0 ? '#fff' : '#fff';
}

// ---------------------------------------------------------------------------
// Single pocket wedge label
// ---------------------------------------------------------------------------

interface PocketProps {
  number: number;
  index: number;
}

const Pocket: React.FC<PocketProps> = ({ number, index }) => {
  const angle = index * POCKET_ANGLE;
  const color = getPocketColor(number);

  return (
    <View
      style={[
        styles.pocket,
        {
          transform: [
            { rotate: `${angle}deg` },
            { translateY: -WHEEL_RADIUS * 0.72 },
          ],
        },
      ]}
    >
      <View style={[styles.pocketLabel, { backgroundColor: color }]}>
        <Text style={styles.pocketText} numberOfLines={1}>
          {number}
        </Text>
      </View>
    </View>
  );
};

// ---------------------------------------------------------------------------
// Ball
// ---------------------------------------------------------------------------

interface BallProps {
  isSpinning: boolean;
  finalPocketIndex: number; // index in WHEEL_ORDER of winning number
  spinStartAngle: number;
}

const Ball: React.FC<BallProps> = ({ isSpinning, finalPocketIndex }) => {
  const ballAngle = useSharedValue(0);
  const prevSpinning = useRef(false);

  useEffect(() => {
    if (isSpinning && !prevSpinning.current) {
      // Ball spins opposite direction; land near winning pocket
      const landAngle = -(finalPocketIndex * POCKET_ANGLE);
      // Extra counter-clockwise spins before landing
      ballAngle.value = withTiming(landAngle - 1440, {
        duration: SPIN_DURATION,
        easing: Easing.bezier(0.12, 0, 0.39, 0),
      });
    }
    prevSpinning.current = isSpinning;
  }, [isSpinning, finalPocketIndex]);

  const ballStyle = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${ballAngle.value}deg` },
      { translateY: -BALL_ORBIT_R },
    ],
  }));

  return (
    <Animated.View style={[styles.ballContainer, ballStyle]}>
      <View style={styles.ball} />
    </Animated.View>
  );
};

// ---------------------------------------------------------------------------
// Wheel component
// ---------------------------------------------------------------------------

interface RouletteWheelProps {
  isSpinning: boolean;
  targetAngle: number; // degrees (from wheelAngleFor())
  winningNumber: number | null;
}

const RouletteWheel: React.FC<RouletteWheelProps> = ({
  isSpinning,
  targetAngle,
  winningNumber,
}) => {
  const rotation = useSharedValue(0);
  const prevSpinning = useRef(false);

  useEffect(() => {
    if (isSpinning && !prevSpinning.current) {
      rotation.value = withTiming(targetAngle, {
        duration: SPIN_DURATION,
        easing: Easing.bezier(0.25, 0.1, 0.1, 1),
      });
    }
    prevSpinning.current = isSpinning;
  }, [isSpinning, targetAngle]);

  const wheelStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const finalPocketIndex = winningNumber !== null
    ? (WHEEL_ORDER as readonly number[]).indexOf(winningNumber)
    : 0;

  return (
    <View style={styles.outerRim}>
      {/* Perspective tilt container */}
      <View style={styles.perspectiveContainer}>
        {/* Outer decorative ring */}
        <View style={styles.outerRing} />

        {/* Spinning wheel disc */}
        <Animated.View style={[styles.wheel, wheelStyle]}>
          {/* Center hub */}
          <View style={styles.hub}>
            <Text style={styles.hubText}>★</Text>
          </View>

          {/* Pockets */}
          {WHEEL_ORDER.map((number, index) => (
            <Pocket key={number} number={number} index={index} />
          ))}
        </Animated.View>

        {/* Ball (spins independently) */}
        <View style={styles.ballOrbitContainer}>
          <Ball
            isSpinning={isSpinning}
            finalPocketIndex={finalPocketIndex}
            spinStartAngle={rotation.value}
          />
        </View>

        {/* Fixed top marker */}
        <View style={styles.marker} />
      </View>
    </View>
  );
};

export default RouletteWheel;

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  outerRim: {
    width: WHEEL_SIZE + 24,
    height: WHEEL_SIZE + 24,
    borderRadius: (WHEEL_SIZE + 24) / 2,
    backgroundColor: '#1a0a00',
    borderWidth: 4,
    borderColor: Colors.accentGold,
    alignItems: 'center',
    justifyContent: 'center',
    // Perspective tilt to look like a wheel seen from above-side
    transform: [{ perspective: 800 }, { rotateX: '20deg' }],
    shadowColor: Colors.accentGold,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 20,
  },
  perspectiveContainer: {
    width: WHEEL_SIZE,
    height: WHEEL_SIZE,
    borderRadius: WHEEL_RADIUS,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  outerRing: {
    position: 'absolute',
    width: WHEEL_SIZE,
    height: WHEEL_SIZE,
    borderRadius: WHEEL_RADIUS,
    borderWidth: 8,
    borderColor: '#3d2000',
    backgroundColor: '#2a1500',
  },
  wheel: {
    position: 'absolute',
    width: WHEEL_SIZE - 16,
    height: WHEEL_SIZE - 16,
    borderRadius: (WHEEL_SIZE - 16) / 2,
    backgroundColor: '#1a0a00',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pocket: {
    position: 'absolute',
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pocketLabel: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  pocketText: {
    color: '#fff',
    fontSize: 6,
    fontWeight: '700',
  },
  hub: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.accentGold,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    borderWidth: 2,
    borderColor: Colors.accentGoldDark,
  },
  hubText: {
    color: Colors.accentGoldDark,
    fontSize: 16,
    fontWeight: '900',
  },
  ballOrbitContainer: {
    position: 'absolute',
    width: WHEEL_SIZE,
    height: WHEEL_SIZE,
    borderRadius: WHEEL_RADIUS,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ballContainer: {
    position: 'absolute',
    width: BALL_SIZE,
    height: BALL_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ball: {
    width: BALL_SIZE,
    height: BALL_SIZE,
    borderRadius: BALL_SIZE / 2,
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#aaa',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 3,
    elevation: 5,
  },
  marker: {
    position: 'absolute',
    top: 2,
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 14,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: Colors.accentGold,
    zIndex: 20,
  },
});
