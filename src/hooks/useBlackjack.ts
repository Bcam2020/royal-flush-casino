import { useCallback, useEffect, useRef, useState } from 'react';
import type { Card } from '../utils/deck';
import {
  createInitialGameState,
  startRound,
  playerHit,
  playerStand,
  playerDoubleDown,
  playerSplit,
  playerSurrender,
  buyInsurance,
  declineInsurance,
  resetForNextRound,
  getAvailableActions,
  computeHandValue,
  getPayoutDetails,
  ensureFreshShoe,
} from '../games/blackjack/engine';
import type {
  BlackjackGameState,
  BlackjackPhase,
  PayoutDetail,
  AvailableActions,
} from '../games/blackjack/types';
import { usePlayerStore } from '../store/playerStore';

// ---------------------------------------------------------------------------
// Display-layer types (decoupled from engine state for animation sequencing)
// ---------------------------------------------------------------------------

export type GameDisplayPhase =
  | 'betting'
  | 'dealing'      // cards flying in, buttons disabled
  | 'player_turn'
  | 'dealer_reveal' // hole card flipping + dealer drawing
  | 'result'
  | 'game_over';

export interface BlackjackDisplayState {
  phase: GameDisplayPhase;
  playerCards: Card[];
  dealerCards: Card[];          // only what should be visible
  holeCardFaceUp: boolean;
  newCardIndices: Set<number>;  // card indices that should play deal animation
  playerScore: number;
  dealerScore: number;
  playerIsSoft: boolean;
  dealerIsSoft: boolean;
  balance: number;
  currentBet: number;
  pendingBet: number;           // bet being built in betting phase
  availableActions: AvailableActions;
  result: 'win' | 'lose' | 'push' | 'blackjack' | 'bust' | 'surrender' | null;
  netPnl: number;
  payoutDetails: PayoutDetail[];
  isBust: boolean;
}

const noActions: AvailableActions = {
  hit: false, stand: false, double_down: false,
  split: false, surrender: false, buy_insurance: false,
  decline_insurance: false,
};

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useBlackjack() {
  const { balance: storeBalance, setBalance } = usePlayerStore();

  const [engine, setEngine] = useState<BlackjackGameState>(() =>
    createInitialGameState(storeBalance),
  );

  // Pending bet built in the betting phase (separate from engine currentBet)
  const [pendingBet, setPendingBet] = useState(5);

  // Cards visible in the dealer area during dealer reveal sequence
  const [visibleDealerCardCount, setVisibleDealerCardCount] = useState(2);

  // Whether the hole card is shown face-up
  const [holeCardFaceUp, setHoleCardFaceUp] = useState(false);

  // Cards visible in the player hand during the deal sequence
  const [visiblePlayerCards, setVisiblePlayerCards] = useState<Card[]>([]);
  const [visibleDealerCards, setVisibleDealerCards] = useState<Card[]>([]);

  // Tracks which card indices in each hand just appeared (should animate in)
  const [newPlayerCardIdx, setNewPlayerCardIdx] = useState<number | null>(null);
  const [newDealerCardIdx, setNewDealerCardIdx] = useState<number | null>(null);

  // Display phase (may lag behind engine for animation sequencing)
  const [displayPhase, setDisplayPhase] = useState<GameDisplayPhase>('betting');

  // Result summary
  const [result, setResult] = useState<BlackjackDisplayState['result']>(null);
  const [netPnl, setNetPnl] = useState(0);
  const [payoutDetails, setPayoutDetails] = useState<PayoutDetail[]>([]);

  // Timeout refs so we can cancel on unmount
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  function scheduleTimer(fn: () => void, delay: number) {
    const id = setTimeout(fn, delay);
    timersRef.current.push(id);
    return id;
  }

  useEffect(() => {
    return () => { timersRef.current.forEach(clearTimeout); };
  }, []);

  // Sync store balance whenever engine balance changes
  useEffect(() => {
    setBalance(engine.balance);
  }, [engine.balance, setBalance]);

  // ---------------------------------------------------------------------------
  // Chip / bet management
  // ---------------------------------------------------------------------------

  const addChip = useCallback((value: number) => {
    if (displayPhase !== 'betting') return;
    setPendingBet((prev) => Math.min(prev + value, engine.rules.maxBet, engine.balance));
  }, [displayPhase, engine.rules.maxBet, engine.balance]);

  const clearBet = useCallback(() => {
    if (displayPhase !== 'betting') return;
    setPendingBet(engine.rules.minBet);
  }, [displayPhase, engine.rules.minBet]);

  // ---------------------------------------------------------------------------
  // Deal — sequences 4 cards appearing 300 ms apart
  // ---------------------------------------------------------------------------

  const deal = useCallback(() => {
    if (displayPhase !== 'betting') return;
    if (pendingBet < engine.rules.minBet || pendingBet > engine.balance) return;

    ensureFreshShoe(engine.rules);
    const newState = startRound(engine, pendingBet);
    if (!newState) return;

    const pCards = newState.playerHands[0].cards;
    const dCards = newState.dealerHand.cards;

    setDisplayPhase('dealing');
    setHoleCardFaceUp(false);
    setVisiblePlayerCards([]);
    setVisibleDealerCards([]);
    setResult(null);
    setNetPnl(0);

    // card 1 — player face-up
    scheduleTimer(() => {
      setVisiblePlayerCards([pCards[0]]);
      setNewPlayerCardIdx(0);
    }, 0);

    // card 2 — dealer face-up
    scheduleTimer(() => {
      setVisibleDealerCards([dCards[0]]);
      setNewDealerCardIdx(0);
    }, 300);

    // card 3 — player face-up
    scheduleTimer(() => {
      setVisiblePlayerCards([pCards[0], pCards[1]]);
      setNewPlayerCardIdx(1);
    }, 600);

    // card 4 — dealer face-down (hole)
    scheduleTimer(() => {
      setVisibleDealerCards([dCards[0], { ...dCards[1], faceDown: true }]);
      setNewDealerCardIdx(1);
    }, 900);

    // All dealt — apply engine state and switch to player turn
    scheduleTimer(() => {
      setEngine(newState);
      setNewPlayerCardIdx(null);
      setNewDealerCardIdx(null);

      if (newState.playerHands[0].status === 'blackjack') {
        // Natural blackjack — go straight to dealer reveal
        runDealerReveal(newState, pCards, dCards);
      } else {
        setDisplayPhase('player_turn');
      }
    }, 1300);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayPhase, pendingBet, engine]);

  // ---------------------------------------------------------------------------
  // Player actions
  // ---------------------------------------------------------------------------

  const hit = useCallback(() => {
    if (displayPhase !== 'player_turn') return;
    const next = playerHit(engine);
    const pCards = next.playerHands[0].cards;

    setVisiblePlayerCards(pCards);
    setNewPlayerCardIdx(pCards.length - 1);
    scheduleTimer(() => setNewPlayerCardIdx(null), 600);

    setEngine(next);

    if (next.playerHands[0].status === 'bust') {
      scheduleTimer(() => {
        setResult('bust');
        const details = getPayoutDetails(next);
        setPayoutDetails(details);
        setNetPnl(details.reduce((s, d) => s + d.netChips, 0));
        setDisplayPhase('result');
      }, 700);
    } else if (next.phase === 'dealer_turn' || next.phase === 'payout') {
      scheduleTimer(() => runDealerReveal(next, pCards, next.dealerHand.cards), 400);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayPhase, engine]);

  const stand = useCallback(() => {
    if (displayPhase !== 'player_turn') return;
    const next = playerStand(engine);
    setEngine(next);
    runDealerReveal(next, visiblePlayerCards, next.dealerHand.cards);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayPhase, engine, visiblePlayerCards]);

  const doubleDown = useCallback(() => {
    if (displayPhase !== 'player_turn') return;
    const next = playerDoubleDown(engine);
    const pCards = next.playerHands[0].cards;
    setVisiblePlayerCards(pCards);
    setNewPlayerCardIdx(pCards.length - 1);
    scheduleTimer(() => setNewPlayerCardIdx(null), 600);
    setEngine(next);
    scheduleTimer(() => runDealerReveal(next, pCards, next.dealerHand.cards), 700);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayPhase, engine]);

  const split = useCallback(() => {
    if (displayPhase !== 'player_turn') return;
    const next = playerSplit(engine);
    setEngine(next);
    setVisiblePlayerCards(next.playerHands[0].cards);
  }, [displayPhase, engine]);

  const surrender = useCallback(() => {
    if (displayPhase !== 'player_turn') return;
    const next = playerSurrender(engine);
    const details = getPayoutDetails(next);
    setEngine(next);
    setPayoutDetails(details);
    setNetPnl(details.reduce((s, d) => s + d.netChips, 0));
    setResult('surrender');
    scheduleTimer(() => setDisplayPhase('result'), 400);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayPhase, engine]);

  // ---------------------------------------------------------------------------
  // Dealer reveal sequence
  // ---------------------------------------------------------------------------

  function runDealerReveal(
    state: BlackjackGameState,
    pCards: Card[],
    finalDealerCards: Card[],
  ) {
    setDisplayPhase('dealer_reveal');
    setVisiblePlayerCards(pCards);

    // Step 1 — flip hole card (400 ms)
    scheduleTimer(() => {
      setHoleCardFaceUp(true);
      setVisibleDealerCards(finalDealerCards.slice(0, 2));
    }, 200);

    // Step 2 — reveal any extra dealer cards one by one (400 ms each)
    const extraCards = finalDealerCards.slice(2);
    extraCards.forEach((_, i) => {
      scheduleTimer(() => {
        setVisibleDealerCards(finalDealerCards.slice(0, 3 + i));
        setNewDealerCardIdx(2 + i);
        scheduleTimer(() => setNewDealerCardIdx(null), 500);
      }, 600 + i * 450);
    });

    // Step 3 — show result
    const resultDelay = 700 + extraCards.length * 450;
    scheduleTimer(() => {
      const finalState = state.phase === 'payout' ? state : resetForNextRound(state);
      const details = getPayoutDetails(state);
      const pnl = details.reduce((s, d) => s + d.netChips + d.insuranceNetChips, 0);
      setPayoutDetails(details);
      setNetPnl(pnl);
      setVisibleDealerCards(finalDealerCards);

      const primaryResult = details[0]?.result;
      if (primaryResult === 'blackjack') setResult('blackjack');
      else if (primaryResult === 'win') setResult('win');
      else if (primaryResult === 'push') setResult('push');
      else if (primaryResult === 'surrender') setResult('surrender');
      else setResult('lose');

      setDisplayPhase('result');
    }, resultDelay);
  }

  // ---------------------------------------------------------------------------
  // Next round
  // ---------------------------------------------------------------------------

  const nextRound = useCallback(() => {
    const next = resetForNextRound(engine);
    setEngine(next);
    setPendingBet(Math.min(pendingBet, next.balance));
    setResult(null);
    setNetPnl(0);
    setDisplayPhase(next.balance > 0 ? 'betting' : 'game_over');
    setHoleCardFaceUp(false);
    setVisiblePlayerCards([]);
    setVisibleDealerCards([]);
  }, [engine, pendingBet]);

  // ---------------------------------------------------------------------------
  // Derived values
  // ---------------------------------------------------------------------------

  const playerValue = visiblePlayerCards.length
    ? computeHandValue(visiblePlayerCards)
    : { value: 0, isSoft: false, isBust: false, isBlackjack: false };

  const dealerValue = visibleDealerCards.filter((c) => !c.faceDown).length
    ? computeHandValue(visibleDealerCards.filter((c) => !c.faceDown))
    : { value: 0, isSoft: false, isBust: false, isBlackjack: false };

  const availableActions =
    displayPhase === 'player_turn' ? getAvailableActions(engine) : noActions;

  const display: BlackjackDisplayState = {
    phase: displayPhase,
    playerCards: visiblePlayerCards,
    dealerCards: visibleDealerCards,
    holeCardFaceUp,
    newCardIndices: new Set(
      [newPlayerCardIdx, newDealerCardIdx].filter((x) => x !== null) as number[],
    ),
    playerScore: playerValue.value,
    dealerScore: dealerValue.value,
    playerIsSoft: playerValue.isSoft,
    dealerIsSoft: dealerValue.isSoft,
    balance: engine.balance,
    currentBet: engine.currentBet,
    pendingBet,
    availableActions,
    result,
    netPnl,
    payoutDetails,
    isBust: playerValue.isBust,
  };

  return {
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
  };
}
