import { nanoid } from 'nanoid/non-secure';
import type { BetType, PlacedBet } from './types';
import { BET_PAYOUT } from './types';

// ---------------------------------------------------------------------------
// Number-grid helpers
// ---------------------------------------------------------------------------

/**
 * Maps a grid position to a roulette number.
 * col: 0–11 (number-group index, where group c has numbers 3c+1, 3c+2, 3c+3)
 * row: 0 (bottom, row 1: 1,4,7…) → 2 (top, row 3: 3,6,9…)
 */
export function gridToNumber(col: number, row: number): number | null {
  if (col < 0 || col > 11 || row < 0 || row > 2) return null;
  return (col + 1) * 3 - (2 - row); // row 0 → offset 0, row 1 → +1, row 2 → +2
}

/** Returns [col, row] for a number 1–36, or null for 0. */
export function numberToGrid(n: number): [number, number] | null {
  if (n === 0 || n < 1 || n > 36) return null;
  const col = Math.floor((n - 1) / 3); // 0–11
  const row = (n - 1) % 3;             // 0–2
  return [col, row];
}

// ---------------------------------------------------------------------------
// Column definition
// ---------------------------------------------------------------------------

export function getColumnNumbers(col: 1 | 2 | 3): number[] {
  // Col 1: 1,4,7,…34  Col 2: 2,5,8,…35  Col 3: 3,6,9,…36
  const result: number[] = [];
  for (let i = col; i <= 36; i += 3) result.push(i);
  return result;
}

export function getDozenNumbers(dozen: 1 | 2 | 3): number[] {
  const start = (dozen - 1) * 12 + 1;
  return Array.from({ length: 12 }, (_, i) => start + i);
}

// ---------------------------------------------------------------------------
// Bet factories — all return a PlacedBet with boardX/Y in [0,1]
// ---------------------------------------------------------------------------

/**
 * CELL_COLS = 12 number groups + 1 zero column + 1 right column-bet column = 14 total board cols.
 * CELL_ROWS = 3 number rows + bottom outside-bet rows.
 *
 * boardX / boardY are fractions of the number-grid area only (0-1).
 * Rows 0–2 are the 3 number rows. X 0–12 are the 12 number groups (past zero).
 */

function makeBet(
  type: BetType,
  numbers: number[],
  amount: number,
  boardX: number,
  boardY: number,
): PlacedBet {
  return { key: nanoid(), type, numbers, amount, boardX, boardY, };
}

// Board coordinate helpers (fractions within the number grid, not counting zero column)
// X: 0 = left edge of group 0 (numbers 1-3), 1 = right edge of group 11 (numbers 34-36)
// Y: 0 = bottom (row 0), 1 = top (row 2)

function colFrac(col: number, offset = 0.5) { return (col + offset) / 12; }
function rowFrac(row: number, offset = 0.5) { return (row + offset) / 3; }

/** Straight up: single number */
export function makeStraightBet(number: number, amount: number): PlacedBet {
  if (number === 0) return makeBet('straight', [0], amount, -0.04, 0.5);
  const pos = numberToGrid(number)!;
  return makeBet('straight', [number], amount, colFrac(pos[0]), rowFrac(pos[1]));
}

/** Split: two adjacent numbers */
export function makeSplitBet(
  n1: number, n2: number, amount: number,
  boardX: number, boardY: number,
): PlacedBet {
  return makeBet('split', [n1, n2].sort((a, b) => a - b), amount, boardX, boardY);
}

/** Street: 3 consecutive numbers in the same column group */
export function makeStreetBet(col: number, amount: number): PlacedBet {
  const n1 = col * 3 + 1, n2 = col * 3 + 2, n3 = col * 3 + 3;
  return makeBet('street', [n1, n2, n3], amount, colFrac(col), -0.08);
}

/** Corner: 4 numbers sharing a corner on the grid */
export function makeCornerBet(
  numbers: [number, number, number, number], amount: number,
  boardX: number, boardY: number,
): PlacedBet {
  return makeBet('corner', [...numbers].sort((a, b) => a - b), amount, boardX, boardY);
}

/** Six line: two adjacent column groups (6 numbers) */
export function makeSixLineBet(col: number, amount: number): PlacedBet {
  const numbers: number[] = [];
  for (let r = 0; r < 3; r++) numbers.push(col * 3 + r + 1, (col + 1) * 3 + r + 1);
  return makeBet('six_line', numbers.sort((a, b) => a - b), amount, (col + 1) / 12, -0.08);
}

/** Dozen bet */
export function makeDozenBet(dozen: 1 | 2 | 3, amount: number): PlacedBet {
  return makeBet('dozen', getDozenNumbers(dozen), amount, (dozen - 0.5) / 3, -0.16);
}

/** Column bet */
export function makeColumnBet(col: 1 | 2 | 3, amount: number): PlacedBet {
  return makeBet('column', getColumnNumbers(col), amount, 1.06, (col - 0.5) / 3);
}

/** Even-money bets */
import { RED_NUMBERS, BLACK_NUMBERS } from './types';

export function makeEvenMoneyBet(
  type: 'red' | 'black' | 'odd' | 'even' | 'low' | 'high',
  amount: number,
): PlacedBet {
  let numbers: number[];
  switch (type) {
    case 'red':   numbers = [...RED_NUMBERS]; break;
    case 'black': numbers = [...BLACK_NUMBERS]; break;
    case 'odd':   numbers = Array.from({length: 18}, (_, i) => i * 2 + 1); break;
    case 'even':  numbers = Array.from({length: 18}, (_, i) => (i + 1) * 2); break;
    case 'low':   numbers = Array.from({length: 18}, (_, i) => i + 1); break;
    case 'high':  numbers = Array.from({length: 18}, (_, i) => i + 19); break;
  }
  // Board X positions for outside bets row
  const xMap = { low: 0, even: 1, red: 2, black: 3, odd: 4, high: 5 } as const;
  return makeBet(type, numbers, amount, (xMap[type] + 0.5) / 6, -0.26);
}

// ---------------------------------------------------------------------------
// Win check
// ---------------------------------------------------------------------------

export function betWins(bet: PlacedBet, spinNumber: number): boolean {
  return (bet.numbers as number[]).includes(spinNumber);
}

/** Returns gross payout (winnings + returned stake) for a winning bet. */
export function grossPayout(bet: PlacedBet): number {
  return bet.amount * (BET_PAYOUT[bet.type] + 1);
}

// ---------------------------------------------------------------------------
// Bet merging — if same key/type/numbers exist, combine amounts
// ---------------------------------------------------------------------------

export function addOrStackBet(bets: PlacedBet[], newBet: PlacedBet): PlacedBet[] {
  const existing = bets.findIndex(
    (b) => b.type === newBet.type && arraysEqual(b.numbers, newBet.numbers),
  );
  if (existing === -1) return [...bets, newBet];
  return bets.map((b, i) =>
    i === existing ? { ...b, amount: b.amount + newBet.amount } : b,
  );
}

function arraysEqual(a: ReadonlyArray<number>, b: ReadonlyArray<number>): boolean {
  if (a.length !== b.length) return false;
  return a.every((v, i) => v === b[i]);
}
