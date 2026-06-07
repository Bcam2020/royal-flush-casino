import { nanoid } from 'nanoid/non-secure';
import { randomInt } from '../../utils/rng';
import {
  getColor, WHEEL_ORDER,
  type PlacedBet, type SpinResult, type HistoryEntry,
} from './types';
import { betWins, grossPayout } from './bets';

// ---------------------------------------------------------------------------
// Spin
// ---------------------------------------------------------------------------

/** Returns a cryptographically fair winning number 0–36. */
export function spinWheel(): number {
  return randomInt(37);
}

/** Evaluates all placed bets against the winning number. */
export function evaluateSpin(bets: PlacedBet[], winNumber: number): SpinResult {
  const winningBets: PlacedBet[] = [];
  const losingBets: PlacedBet[] = [];

  for (const bet of bets) {
    if (betWins(bet, winNumber)) {
      winningBets.push(bet);
    } else {
      losingBets.push(bet);
    }
  }

  const grossWinnings = winningBets.reduce((sum, b) => sum + grossPayout(b), 0);
  const totalStake = bets.reduce((sum, b) => sum + b.amount, 0);
  const netPnl = grossWinnings - totalStake;

  return {
    number: winNumber,
    color: getColor(winNumber),
    winningBets,
    losingBets,
    grossWinnings,
    netPnl,
  };
}

/** Creates a history entry from a spin result. */
export function makeHistoryEntry(result: SpinResult, balanceAfter: number): HistoryEntry {
  return {
    id: nanoid(),
    number: result.number,
    color: result.color,
    netPnl: result.netPnl,
    balance: balanceAfter,
    timestamp: Date.now(),
  };
}

// ---------------------------------------------------------------------------
// Wheel geometry
// ---------------------------------------------------------------------------

/** Returns the index in WHEEL_ORDER for a given number (0–36). */
export function wheelIndexOf(number: number): number {
  return WHEEL_ORDER.indexOf(number);
}

/**
 * Returns the wheel rotation angle (degrees) that brings `number` to the
 * 12 o'clock position (top), after `baseRotations` full spins.
 */
export function wheelAngleFor(number: number, baseRotations = 7): number {
  const idx = wheelIndexOf(number);
  const pocketAngle = (idx / 37) * 360;
  // We need the pocket to land at 0° (top). So rotate by -pocketAngle + N*360.
  return -pocketAngle + baseRotations * 360;
}

// ---------------------------------------------------------------------------
// Stats helpers
// ---------------------------------------------------------------------------

export function hotNumbers(history: HistoryEntry[], top = 5): number[] {
  const freq: Map<number, number> = new Map();
  for (const h of history) freq.set(h.number, (freq.get(h.number) ?? 0) + 1);
  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, top)
    .map(([n]) => n);
}

export function coldNumbers(history: HistoryEntry[], top = 5): number[] {
  const freq: Map<number, number> = new Map();
  // Seed all numbers with 0
  for (let i = 0; i <= 36; i++) freq.set(i, 0);
  for (const h of history) freq.set(h.number, (freq.get(h.number) ?? 0) + 1);
  return [...freq.entries()]
    .sort((a, b) => a[1] - b[1])
    .slice(0, top)
    .map(([n]) => n);
}

export function currentStreak(history: HistoryEntry[]): { label: string; count: number } | null {
  if (history.length < 2) return null;
  const last = history[0];
  let count = 1;
  for (let i = 1; i < history.length; i++) {
    if (history[i].color === last.color) count++;
    else break;
  }
  if (count < 2) return null;
  return { label: last.color, count };
}
