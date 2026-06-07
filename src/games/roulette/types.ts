// ---------------------------------------------------------------------------
// Core colour / number metadata
// ---------------------------------------------------------------------------

export type PocketColor = 'red' | 'black' | 'green';

export const WHEEL_ORDER = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36,
  11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9,
  22, 18, 29, 7, 28, 12, 35, 3, 26,
] as const;

export const RED_NUMBERS: ReadonlySet<number> = new Set([
  1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36,
]);

export const BLACK_NUMBERS: ReadonlySet<number> = new Set([
  2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35,
]);

export function getColor(n: number): PocketColor {
  if (n === 0) return 'green';
  return RED_NUMBERS.has(n) ? 'red' : 'black';
}

// ---------------------------------------------------------------------------
// Bet types
// ---------------------------------------------------------------------------

export type BetType =
  | 'straight'   // 35:1  single number
  | 'split'      // 17:1  two adjacent numbers
  | 'street'     // 11:1  three numbers in a row
  | 'corner'     //  8:1  four numbers forming a square
  | 'six_line'   //  5:1  two adjacent rows (6 numbers)
  | 'dozen'      //  2:1  12 numbers (1-12, 13-24, 25-36)
  | 'column'     //  2:1  12 numbers (col 1/2/3)
  | 'red'        //  1:1  all reds
  | 'black'      //  1:1  all blacks
  | 'odd'        //  1:1  all odds
  | 'even'       //  1:1  all evens
  | 'low'        //  1:1  1–18
  | 'high';      //  1:1  19–36

export const BET_PAYOUT: Readonly<Record<BetType, number>> = {
  straight:  35,
  split:     17,
  street:    11,
  corner:     8,
  six_line:   5,
  dozen:      2,
  column:     2,
  red:        1,
  black:      1,
  odd:        1,
  even:       1,
  low:        1,
  high:       1,
};

// ---------------------------------------------------------------------------
// Placed bet
// ---------------------------------------------------------------------------

export interface PlacedBet {
  /** Unique key for this bet instance on the board. */
  key: string;
  type: BetType;
  /** All number pockets covered by this bet (0–36). */
  numbers: ReadonlyArray<number>;
  amount: number;
  /** Fractional position on the betting board (0–1) for chip display. */
  boardX: number;
  boardY: number;
}

// ---------------------------------------------------------------------------
// Spin result
// ---------------------------------------------------------------------------

export interface SpinResult {
  number: number;
  color: PocketColor;
  winningBets: PlacedBet[];
  losingBets: PlacedBet[];
  grossWinnings: number; // includes returned stakes
  netPnl: number;
}

// ---------------------------------------------------------------------------
// History
// ---------------------------------------------------------------------------

export interface HistoryEntry {
  id: string;
  number: number;
  color: PocketColor;
  netPnl: number;
  balance: number;
  timestamp: number;
}

// ---------------------------------------------------------------------------
// Game phases
// ---------------------------------------------------------------------------

export type RoulettePhase = 'betting' | 'spinning' | 'result';

export interface RouletteState {
  phase: RoulettePhase;
  bets: PlacedBet[];
  lastBets: PlacedBet[];   // saved for "repeat last bet"
  balance: number;
  totalBet: number;
  lastResult: SpinResult | null;
  history: HistoryEntry[];
}
