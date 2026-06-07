/**
 * Two-view betting board:
 *   "board" view — classic casino layout (3-row × 12-col number grid + outside bets)
 *   "grid"  view — scrollable number picker with quick-bet buttons
 */
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  LayoutChangeEvent,
} from 'react-native';
import { Colors, Typography, Spacing, Radius } from '../../constants/theme';
import { RED_NUMBERS } from '../../games/roulette/types';
import type { PlacedBet } from '../../games/roulette/types';
import {
  makeStraightBet,
  makeDozenBet,
  makeColumnBet,
  makeEvenMoneyBet,
  makeSplitBet,
} from '../../games/roulette/bets';

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

const CELL_H = 42;
const CELL_W_FRAC = 1 / 12; // 12 number groups per row

type ViewMode = 'board' | 'grid';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getCellBg(number: number): string {
  if (number === 0) return Colors.win;
  return RED_NUMBERS.has(number) ? Colors.suitRed : Colors.suitBlack;
}

// Mapping: (col 0–11, row 0–2) → roulette number
// row 0 = bottom row of board (1,4,7…), row 2 = top (3,6,9…)
function cellToNumber(col: number, row: number): number {
  return (col + 1) * 3 - (2 - row);
}

// ---------------------------------------------------------------------------
// Chip overlay on a number cell
// ---------------------------------------------------------------------------

interface ChipOverlayProps {
  bets: PlacedBet[];
  boardWidth: number;
}

const ChipOverlay: React.FC<ChipOverlayProps> = ({ bets, boardWidth }) => {
  return (
    <>
      {bets.map((bet) => {
        if (bet.boardX < 0 || bet.boardX > 1 || bet.boardY < 0 || bet.boardY > 1) return null;
        const x = bet.boardX * boardWidth - 12;
        const y = (1 - bet.boardY) * (CELL_H * 3) - 12;
        return (
          <View key={bet.key} style={[styles.chip, { left: x, top: y }]}>
            <Text style={styles.chipText}>
              {bet.amount >= 1000 ? `${bet.amount / 1000}K` : `${bet.amount}`}
            </Text>
          </View>
        );
      })}
    </>
  );
};

// ---------------------------------------------------------------------------
// Classic board view
// ---------------------------------------------------------------------------

interface BoardViewProps {
  bets: PlacedBet[];
  selectedChip: number;
  onBet: (bet: PlacedBet) => void;
}

const BoardView: React.FC<BoardViewProps> = ({ bets, selectedChip, onBet }) => {
  const [boardWidth, setBoardWidth] = useState(0);

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    setBoardWidth(e.nativeEvent.layout.width);
  }, []);

  return (
    <View style={styles.boardContainer} onLayout={onLayout}>
      {/* Zero */}
      <TouchableOpacity
        style={styles.zeroCell}
        onPress={() => onBet(makeStraightBet(0, selectedChip))}
        activeOpacity={0.7}
      >
        <Text style={styles.cellText}>0</Text>
      </TouchableOpacity>

      {/* Number grid: rows top→bottom rendered as 3 absolute rows */}
      <View style={[styles.numberGrid, { height: CELL_H * 3 }]}>
        {[2, 1, 0].map((row) => (
          <View key={row} style={styles.numberRow}>
            {Array.from({ length: 12 }, (_, col) => {
              const number = cellToNumber(col, row);
              return (
                <TouchableOpacity
                  key={col}
                  style={[styles.numberCell, { backgroundColor: getCellBg(number) }]}
                  onPress={() => onBet(makeStraightBet(number, selectedChip))}
                  activeOpacity={0.7}
                >
                  <Text style={styles.cellText}>{number}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}

        {/* Chip overlays */}
        {boardWidth > 0 && (
          <View style={StyleSheet.absoluteFill} pointerEvents="none">
            <ChipOverlay bets={bets} boardWidth={boardWidth} />
          </View>
        )}
      </View>

      {/* Column bets (right side) */}
      <View style={styles.columnBets}>
        {([3, 2, 1] as const).map((col) => (
          <TouchableOpacity
            key={col}
            style={styles.columnCell}
            onPress={() => onBet(makeColumnBet(col, selectedChip))}
            activeOpacity={0.7}
          >
            <Text style={styles.outsideText}>2:1</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Outside bets row */}
      <View style={styles.outsideBets}>
        {/* Dozens */}
        {([1, 2, 3] as const).map((dozen) => (
          <TouchableOpacity
            key={`d${dozen}`}
            style={styles.dozenCell}
            onPress={() => onBet(makeDozenBet(dozen, selectedChip))}
            activeOpacity={0.7}
          >
            <Text style={styles.outsideText}>
              {dozen === 1 ? '1–12' : dozen === 2 ? '13–24' : '25–36'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Even-money row */}
      <View style={styles.evenMoneyRow}>
        {(
          [
            ['low', '1-18'],
            ['even', 'Even'],
            ['red', '●'],
            ['black', '●'],
            ['odd', 'Odd'],
            ['high', '19-36'],
          ] as [Parameters<typeof makeEvenMoneyBet>[0], string][]
        ).map(([type, label]) => (
          <TouchableOpacity
            key={type}
            style={[
              styles.evenMoneyCell,
              type === 'red' && { backgroundColor: Colors.suitRed },
              type === 'black' && { backgroundColor: Colors.suitBlack },
            ]}
            onPress={() => onBet(makeEvenMoneyBet(type, selectedChip))}
            activeOpacity={0.7}
          >
            <Text style={styles.outsideText}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

// ---------------------------------------------------------------------------
// Number grid picker view
// ---------------------------------------------------------------------------

interface GridViewProps {
  bets: PlacedBet[];
  selectedChip: number;
  onBet: (bet: PlacedBet) => void;
}

const GridView: React.FC<GridViewProps> = ({ bets, selectedChip, onBet }) => {
  // Count bets per number for quick display
  const betPerNumber: Map<number, number> = new Map();
  for (const b of bets) {
    for (const n of b.numbers) {
      betPerNumber.set(n, (betPerNumber.get(n) ?? 0) + b.amount);
    }
  }

  return (
    <ScrollView style={styles.gridScroll} showsVerticalScrollIndicator={false}>
      {/* Zero */}
      <TouchableOpacity
        style={[styles.gridCell, { backgroundColor: Colors.win }]}
        onPress={() => onBet(makeStraightBet(0, selectedChip))}
        activeOpacity={0.7}
      >
        <Text style={styles.gridCellText}>0</Text>
      </TouchableOpacity>

      {/* Numbers 1–36 in 6-column grid */}
      <View style={styles.gridNumbers}>
        {Array.from({ length: 36 }, (_, i) => {
          const n = i + 1;
          const hasBet = betPerNumber.has(n);
          return (
            <TouchableOpacity
              key={n}
              style={[
                styles.gridCell,
                { backgroundColor: getCellBg(n) },
                hasBet && styles.gridCellBetted,
              ]}
              onPress={() => onBet(makeStraightBet(n, selectedChip))}
              activeOpacity={0.7}
            >
              <Text style={styles.gridCellText}>{n}</Text>
              {hasBet && (
                <Text style={styles.gridCellBetAmt}>
                  ${betPerNumber.get(n)}
                </Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Quick outside bets */}
      <View style={styles.quickBetsContainer}>
        <Text style={styles.quickBetsHeader}>Outside Bets</Text>
        <View style={styles.quickBetsGrid}>
          {(
            [
              ['red', 'Red'],
              ['black', 'Black'],
              ['odd', 'Odd'],
              ['even', 'Even'],
              ['low', '1–18'],
              ['high', '19–36'],
            ] as [Parameters<typeof makeEvenMoneyBet>[0], string][]
          ).map(([type, label]) => (
            <TouchableOpacity
              key={type}
              style={[
                styles.quickBetCell,
                type === 'red' && { backgroundColor: Colors.suitRed },
                type === 'black' && { backgroundColor: Colors.suitBlack },
              ]}
              onPress={() => onBet(makeEvenMoneyBet(type, selectedChip))}
              activeOpacity={0.7}
            >
              <Text style={styles.outsideText}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </ScrollView>
  );
};

// ---------------------------------------------------------------------------
// Chip selector (strip above the board)
// ---------------------------------------------------------------------------

const CHIP_VALUES = [5, 25, 100, 500, 1000];
const CHIP_COLORS: Record<number, string> = {
  5: Colors.chipRed,
  25: Colors.chipGreen,
  100: Colors.chipBlack,
  500: Colors.chipPurple,
  1000: Colors.chipYellow,
};

interface ChipStripProps {
  selected: number;
  onSelect: (v: number) => void;
}

const ChipStrip: React.FC<ChipStripProps> = ({ selected, onSelect }) => (
  <View style={styles.chipStrip}>
    {CHIP_VALUES.map((v) => (
      <TouchableOpacity
        key={v}
        style={[
          styles.chipButton,
          { backgroundColor: CHIP_COLORS[v] },
          selected === v && styles.chipButtonSelected,
        ]}
        onPress={() => onSelect(v)}
        activeOpacity={0.8}
      >
        <Text style={styles.chipButtonText}>
          {v >= 1000 ? `${v / 1000}K` : `$${v}`}
        </Text>
      </TouchableOpacity>
    ))}
  </View>
);

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

interface RouletteBettingBoardProps {
  bets: PlacedBet[];
  onBet: (bet: PlacedBet) => void;
  disabled?: boolean;
}

const RouletteBettingBoard: React.FC<RouletteBettingBoardProps> = ({
  bets,
  onBet,
  disabled = false,
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('board');
  const [selectedChip, setSelectedChip] = useState(25);

  const handleBet = useCallback(
    (bet: PlacedBet) => {
      if (disabled) return;
      onBet(bet);
    },
    [disabled, onBet],
  );

  return (
    <View style={[styles.container, disabled && styles.containerDisabled]}>
      {/* View toggle */}
      <View style={styles.toggleRow}>
        {(['board', 'grid'] as const).map((mode) => (
          <TouchableOpacity
            key={mode}
            style={[styles.toggleBtn, viewMode === mode && styles.toggleBtnActive]}
            onPress={() => setViewMode(mode)}
            activeOpacity={0.8}
          >
            <Text
              style={[styles.toggleText, viewMode === mode && styles.toggleTextActive]}
            >
              {mode === 'board' ? 'Board' : 'Numbers'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Chip strip */}
      <ChipStrip selected={selectedChip} onSelect={setSelectedChip} />

      {/* Board or grid */}
      {viewMode === 'board' ? (
        <BoardView bets={bets} selectedChip={selectedChip} onBet={handleBet} />
      ) : (
        <GridView bets={bets} selectedChip={selectedChip} onBet={handleBet} />
      )}
    </View>
  );
};

export default RouletteBettingBoard;

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.feltBackground,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.2)',
  },
  containerDisabled: {
    opacity: 0.45,
  },

  // Toggle
  toggleRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: Spacing.xs,
    alignItems: 'center',
  },
  toggleBtnActive: {
    borderBottomWidth: 2,
    borderBottomColor: Colors.accentGold,
  },
  toggleText: {
    color: Colors.textPrimary,
    fontSize: Typography.sizeSm,
    opacity: 0.5,
  },
  toggleTextActive: {
    opacity: 1,
    color: Colors.accentGold,
    fontWeight: '700',
  },

  // Chip strip
  chipStrip: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  chipButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  chipButtonSelected: {
    borderColor: Colors.accentGold,
    borderWidth: 3,
    shadowColor: Colors.accentGold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 8,
  },
  chipButtonText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
  },

  // Board view
  boardContainer: {
    padding: Spacing.xs,
  },
  zeroCell: {
    backgroundColor: Colors.win,
    height: CELL_H * 3,
    width: 28,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    left: Spacing.xs,
    top: Spacing.xs,
    zIndex: 2,
  },
  numberGrid: {
    marginLeft: 34,
    marginRight: 34,
    position: 'relative',
  },
  numberRow: {
    flexDirection: 'row',
    flex: 1,
  },
  numberCell: {
    flex: 1,
    height: CELL_H,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  cellText: {
    color: '#fff',
    fontSize: Typography.size2xs,
    fontWeight: '700',
  },
  columnBets: {
    position: 'absolute',
    right: Spacing.xs,
    top: Spacing.xs,
    width: 30,
  },
  columnCell: {
    height: CELL_H,
    backgroundColor: 'rgba(212,175,55,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.accentGold,
    borderRadius: Radius.sm,
  },
  outsideBets: {
    flexDirection: 'row',
    marginLeft: 34,
    marginRight: 34,
    marginTop: 2,
  },
  dozenCell: {
    flex: 1,
    height: 28,
    backgroundColor: 'rgba(212,175,55,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.accentGold,
  },
  evenMoneyRow: {
    flexDirection: 'row',
    marginLeft: 34,
    marginRight: 34,
    marginTop: 2,
    marginBottom: Spacing.xs,
  },
  evenMoneyCell: {
    flex: 1,
    height: 28,
    backgroundColor: 'rgba(255,255,255,0.07)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  outsideText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '700',
  },

  // Chip overlay
  chip: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.accentGold,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.accentGoldDark,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.6,
    shadowRadius: 3,
    elevation: 6,
    zIndex: 10,
  },
  chipText: {
    color: '#000',
    fontSize: 7,
    fontWeight: '900',
  },

  // Grid view
  gridScroll: {
    maxHeight: 280,
  },
  gridNumbers: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: Spacing.xs,
    gap: 2,
  },
  gridCell: {
    width: '16%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.2)',
    margin: 1,
  },
  gridCellBetted: {
    borderColor: Colors.accentGold,
    borderWidth: 2,
  },
  gridCellText: {
    color: '#fff',
    fontSize: Typography.sizeSm,
    fontWeight: '700',
  },
  gridCellBetAmt: {
    color: Colors.accentGold,
    fontSize: 8,
    fontWeight: '600',
  },
  quickBetsContainer: {
    padding: Spacing.sm,
  },
  quickBetsHeader: {
    color: Colors.textPrimary,
    fontSize: Typography.size2xs,
    opacity: 0.5,
    marginBottom: Spacing.xs,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  quickBetsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  quickBetCell: {
    flex: 1,
    minWidth: '28%',
    height: 36,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.2)',
  },
});
