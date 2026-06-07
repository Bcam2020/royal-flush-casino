import { useState, useCallback, useRef } from 'react';
import { usePlayerStore } from '../store/playerStore';
import {
  type PlacedBet,
  type SpinResult,
  type HistoryEntry,
  type RoulettePhase,
} from '../games/roulette/types';
import {
  addOrStackBet,
} from '../games/roulette/bets';
import {
  spinWheel,
  evaluateSpin,
  makeHistoryEntry,
  wheelAngleFor,
} from '../games/roulette/engine';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RouletteActions {
  placeBet: (bet: PlacedBet) => void;
  clearBets: () => void;
  repeatLastBets: () => void;
  undoLastBet: () => void;
  spin: () => void;
  clearResult: () => void;
}

export interface RouletteHookResult {
  phase: RoulettePhase;
  bets: PlacedBet[];
  totalBet: number;
  lastResult: SpinResult | null;
  history: HistoryEntry[];
  wheelAngle: number;        // target degrees for the wheel animation
  winningNumber: number | null;
  actions: RouletteActions;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useRoulette(): RouletteHookResult {
  const { balance, subtractBalance, addBalance } = usePlayerStore();

  const [phase, setPhase] = useState<RoulettePhase>('betting');
  const [bets, setBets] = useState<PlacedBet[]>([]);
  const [lastBets, setLastBets] = useState<PlacedBet[]>([]);
  const [betHistory, setBetHistory] = useState<PlacedBet[][]>([]); // stack for undo
  const [lastResult, setLastResult] = useState<SpinResult | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [wheelAngle, setWheelAngle] = useState(0);
  const [winningNumber, setWinningNumber] = useState<number | null>(null);

  const spinTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const totalBet = bets.reduce((sum, b) => sum + b.amount, 0);

  // ── Bet management ──────────────────────────────────────────────────────

  const placeBet = useCallback(
    (bet: PlacedBet) => {
      if (phase !== 'betting') return;
      if (bet.amount > balance - totalBet) return; // not enough funds
      setBetHistory((prev) => [...prev, bets]);
      setBets((prev) => addOrStackBet(prev, bet));
    },
    [phase, balance, totalBet, bets],
  );

  const clearBets = useCallback(() => {
    if (phase !== 'betting') return;
    setBetHistory([]);
    setBets([]);
  }, [phase]);

  const undoLastBet = useCallback(() => {
    if (phase !== 'betting') return;
    setBetHistory((prev) => {
      if (prev.length === 0) return prev;
      const history = [...prev];
      const previous = history.pop()!;
      setBets(previous);
      return history;
    });
  }, [phase]);

  const repeatLastBets = useCallback(() => {
    if (phase !== 'betting') return;
    if (lastBets.length === 0) return;
    const totalRepeat = lastBets.reduce((s, b) => s + b.amount, 0);
    if (totalRepeat > balance) return;
    setBets(lastBets.map((b) => ({ ...b })));
    setBetHistory([]);
  }, [phase, lastBets, balance]);

  // ── Spin ─────────────────────────────────────────────────────────────────

  const spin = useCallback(() => {
    if (phase !== 'betting') return;
    if (bets.length === 0) return;

    // Deduct total stake immediately
    subtractBalance(totalBet);

    const winner = spinWheel();
    const angle = wheelAngleFor(winner, 7);

    setWinningNumber(winner);
    setWheelAngle(angle);
    setPhase('spinning');
    setLastBets(bets);

    // After animation completes (5500ms) → evaluate
    spinTimeoutRef.current = setTimeout(() => {
      const result = evaluateSpin(bets, winner);

      // Credit winnings
      if (result.grossWinnings > 0) {
        addBalance(result.grossWinnings);
      }

      // Update balance snapshot for history entry
      // (balance in store is already updated at this point due to addBalance)
      const balanceAfter = usePlayerStore.getState().balance;
      const entry = makeHistoryEntry(result, balanceAfter);

      setLastResult(result);
      setHistory((prev) => [entry, ...prev].slice(0, 50));
      setPhase('result');
    }, 5700);
  }, [phase, bets, totalBet, subtractBalance, addBalance]);

  // ── Result dismiss ────────────────────────────────────────────────────────

  const clearResult = useCallback(() => {
    setPhase('betting');
    setBets([]);
    setBetHistory([]);
    setLastResult(null);
    setWinningNumber(null);
  }, []);

  return {
    phase,
    bets,
    totalBet,
    lastResult,
    history,
    wheelAngle,
    winningNumber,
    actions: {
      placeBet,
      clearBets,
      repeatLastBets,
      undoLastBet,
      spin,
      clearResult,
    },
  };
}
