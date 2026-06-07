import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { Colors, Spacing, Radius, Typography } from '../../constants/theme';

// ---------------------------------------------------------------------------
// Chip data
// ---------------------------------------------------------------------------

interface ChipDef {
  value: number;
  label: string;
  color: string;
  textColor: string;
  borderColor: string;
}

const CHIPS: ChipDef[] = [
  { value: 5,    label: '$5',   color: Colors.chipRed,    textColor: '#fff', borderColor: '#b71c1c' },
  { value: 25,   label: '$25',  color: Colors.chipGreen,  textColor: '#fff', borderColor: '#2e7d32' },
  { value: 100,  label: '$100', color: Colors.chipBlack,  textColor: '#ffd700', borderColor: '#555' },
  { value: 500,  label: '$500', color: Colors.chipPurple, textColor: '#fff', borderColor: '#4a0072' },
  { value: 1000, label: '$1K',  color: Colors.chipYellow, textColor: '#1a1a1a', borderColor: '#b8860b' },
];

// ---------------------------------------------------------------------------
// Single chip button
// ---------------------------------------------------------------------------

interface ChipButtonProps {
  chip: ChipDef;
  onPress: () => void;
  disabled: boolean;
}

function ChipButton({ chip, onPress, disabled }: ChipButtonProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  function handlePressIn() {
    scale.value = withSpring(0.88, { damping: 12, stiffness: 300 });
  }

  function handlePressOut() {
    scale.value = withSpring(1, { damping: 10, stiffness: 200 });
  }

  return (
    <Animated.View style={[animatedStyle, disabled && styles.chipDisabled]}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
        activeOpacity={1}
        style={[
          styles.chip,
          {
            backgroundColor: chip.color,
            borderColor: chip.borderColor,
          },
        ]}
        accessibilityLabel={`Add ${chip.label} chip`}
        accessibilityRole="button"
      >
        {/* Shine arc at top of chip */}
        <View style={styles.chipShine} />
        <Text style={[styles.chipLabel, { color: chip.textColor }]}>{chip.label}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------
// ChipSelector
// ---------------------------------------------------------------------------

interface ChipSelectorProps {
  bet: number;
  balance: number;
  onChipTap: (value: number) => void;
  onClear: () => void;
  onDeal: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export default function ChipSelector({
  bet,
  balance,
  onChipTap,
  onClear,
  onDeal,
  disabled = false,
  style,
}: ChipSelectorProps) {
  const canDeal = bet >= 5 && bet <= balance && !disabled;

  // Deal button pulse scale
  const dealScale = useSharedValue(1);

  const dealAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: dealScale.value }],
  }));

  function handleDealPressIn() {
    if (!canDeal) return;
    dealScale.value = withSpring(0.94, { damping: 14, stiffness: 300 });
  }

  function handleDealPressOut() {
    dealScale.value = withSpring(1, { damping: 10, stiffness: 200 });
  }

  return (
    <View style={[styles.container, style]}>
      {/* Bet display */}
      <View style={styles.betRow}>
        <Text style={styles.betLabel}>BET</Text>
        <Text style={styles.betAmount}>${bet.toLocaleString()}</Text>
      </View>

      {/* Chip row */}
      <View style={styles.chipRow}>
        {CHIPS.map((chip) => (
          <ChipButton
            key={chip.value}
            chip={chip}
            onPress={() => onChipTap(chip.value)}
            disabled={disabled || bet + chip.value > balance || bet + chip.value > 1000}
          />
        ))}
      </View>

      {/* Clear + Deal */}
      <View style={styles.actionRow}>
        <TouchableOpacity
          style={[styles.clearButton, disabled && styles.buttonDisabled]}
          onPress={onClear}
          disabled={disabled || bet === 5}
          accessibilityRole="button"
          accessibilityLabel="Clear bet"
        >
          <Text style={[styles.clearText, (disabled || bet === 5) && styles.disabledText]}>
            CLEAR
          </Text>
        </TouchableOpacity>

        <Animated.View style={dealAnimStyle}>
          <TouchableOpacity
            style={[styles.dealButton, !canDeal && styles.dealButtonDisabled]}
            onPress={onDeal}
            onPressIn={handleDealPressIn}
            onPressOut={handleDealPressOut}
            disabled={!canDeal}
            activeOpacity={1}
            accessibilityRole="button"
            accessibilityLabel="Deal cards"
          >
            <Text style={[styles.dealText, !canDeal && styles.disabledText]}>
              DEAL  →
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const CHIP_SIZE = 52;

const styles = StyleSheet.create({
  container: {
    gap: Spacing.md,
  },

  betRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  betLabel: {
    fontSize: Typography.sizeXs,
    fontWeight: '700',
    color: Colors.accentGoldDark,
    letterSpacing: 3,
  },
  betAmount: {
    fontSize: Typography.sizeLg,
    fontWeight: '800',
    color: Colors.accentGold,
  },

  chipRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.sm,
  },

  chip: {
    width: CHIP_SIZE,
    height: CHIP_SIZE,
    borderRadius: CHIP_SIZE / 2,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    // Multi-layer shadow for 3-D look
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 8,
  },
  chipShine: {
    position: 'absolute',
    top: 4,
    left: 8,
    width: 36,
    height: 14,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  chipLabel: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  chipDisabled: {
    opacity: 0.35,
  },

  actionRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.lg,
    marginTop: Spacing.xs,
  },

  clearButton: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
  },
  clearText: {
    color: Colors.textSecondary,
    fontSize: Typography.sizeSm,
    fontWeight: '700',
    letterSpacing: 2,
  },

  dealButton: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.accentGold,
    borderRadius: Radius.md,
    shadowColor: Colors.accentGold,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 6,
  },
  dealButtonDisabled: {
    backgroundColor: Colors.buttonDisabled,
    shadowOpacity: 0,
  },
  dealText: {
    color: Colors.buttonPrimaryText,
    fontSize: Typography.sizeSm,
    fontWeight: '900',
    letterSpacing: 2,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  disabledText: {
    color: Colors.textDisabled,
  },
});
