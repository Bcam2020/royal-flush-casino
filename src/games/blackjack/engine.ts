/**
 * Blackjack game engine.
 *
 * All state mutations are pure functions that accept the current state and
 * return a new state object. No side-effects, no async — suited for direct
 * use with React state or a Redux-style store.
 */

import { nanoid } from 'nanoid/non-secure';
import type { Card } from '../../utils/deck';
import { dealCard, needsReshuffle, reshuffleShoe, createShoe } from '../../utils/deck';
import type { Shoe } from '../../utils/deck';
import { RANK_VALUES } from '../../utils/deck';
import type {
  BlackjackGameState,
  BlackjackHand,
  BlackjackRules,
  DealerHand,
  HandResult,
  HandStatus,
  AvailableActions,
  PayoutDetail,
} from './types';
import { DEFAULT_BLACKJACK_RULES } from './types';

// ---------------------------------------------------------------------------
// Hand value calculation
// ---------------------------------------------------------------------------

export interface HandValue {
  /** The best (highest non-busting) value, or the lowest busting value. */
  value: number;
  /** True when at least one ace is counted as 11 without busting. */
  isSoft: boolean;
  /** True when value > 21. */
  isBust: boolean;
  /** True when two-card hand totalling exactly 21. */
  isBlackjack: boolean;
}

/**
 * Computes the blackjack value of a set of cards, correctly handling
 * multiple aces and soft/hard totals.
 */
export function computeHandValue(cards: Card[]): HandValue {
  const visibleCards = cards.filter((c) => !c.faceDown);

  let total = 0;
  let aceCount = 0;

  for (const card of visibleCards) {
    const val = RANK_VALUES[card.rank];
    total += val;
    if (card.rank === 'A') aceCount++;
  }

  // Promote aces from 1 → 11 as long as we don't bust.
  let softAces = 0;
  while (aceCount > 0 && total + 10 <= 21) {
    total += 10;
    aceCount--;
    softAces++;
  }

  const isBust = total > 21;
  const isSoft = softAces > 0;
  const isBlackjack = visibleCards.length === 2 && total === 21;

  return { value: total, isSoft, isBust, isBlackjack };
}

// ---------------------------------------------------------------------------
// Hand factories
// ---------------------------------------------------------------------------

function makeHand(bet: number, isSplit: boolean = false): BlackjackHand {
  return {
    id: nanoid(),
    cards: [],
    status: 'active',
    result: 'pending',
    bet,
    isSplit,
    hasInsurance: false,
    insuranceBet: 0,
  };
}

function makeDealerHand(): DealerHand {
  return { cards: [], revealed: false };
}

// ---------------------------------------------------------------------------
// Initial game state
// ---------------------------------------------------------------------------

export function createInitialGameState(
  startingBalance: number = 1000,
  rules: BlackjackRules = DEFAULT_BLACKJACK_RULES,
): BlackjackGameState {
  return {
    phase: 'idle',
    rules,
    playerHands: [],
    activeHandIndex: 0,
    dealerHand: makeDealerHand(),
    balance: startingBalance,
    currentBet: rules.minBet,
    lastRoundPnl: null,
    handsPlayed: 0,
  };
}

// ---------------------------------------------------------------------------
// Shoe management (kept outside state so it is not serialised)
// ---------------------------------------------------------------------------

let _shoe: Shoe = createShoe(DEFAULT_BLACKJACK_RULES.deckCount);

export function getShoe(): Shoe {
  return _shoe;
}

export function ensureFreshShoe(rules: BlackjackRules): void {
  if (needsReshuffle(_shoe) || _shoe.deckCount !== rules.deckCount) {
    if (_shoe.deckCount !== rules.deckCount) {
      _shoe = createShoe(rules.deckCount);
    } else {
      reshuffleShoe(_shoe);
    }
  }
}

/** Exposed for testing — replace the internal shoe. */
export function _injectShoe(shoe: Shoe): void {
  _shoe = shoe;
}

// ---------------------------------------------------------------------------
// Phase: deal
// ---------------------------------------------------------------------------

/**
 * Places a bet and deals the initial four cards.
 * Returns null if the bet is outside limits or the balance is insufficient.
 */
export function startRound(
  state: BlackjackGameState,
  bet: number,
): BlackjackGameState | null {
  const { rules, balance } = state;

  if (bet < rules.minBet || bet > rules.maxBet) return null;
  if (bet > balance) return null;

  ensureFreshShoe(rules);

  const hand = makeHand(bet);
  const dealer = makeDealerHand();

  // Standard deal order: player, dealer, player, dealer (hole card face-down)
  hand.cards.push(dealCard(_shoe, false));
  dealer.cards.push(dealCard(_shoe, false));
  hand.cards.push(dealCard(_shoe, false));
  dealer.cards.push(dealCard(_shoe, true)); // hole card

  // Check for player blackjack immediately.
  const handVal = computeHandValue(hand.cards);
  let handStatus: HandStatus = 'active';
  if (handVal.isBlackjack) {
    handStatus = 'blackjack';
  }
  hand.status = handStatus;

  const dealerUpCard = dealer.cards[0];
  const dealerShowsAce = dealerUpCard.rank === 'A';

  // Move to insurance phase if applicable, otherwise player_turn.
  const nextPhase =
    rules.insuranceAllowed && dealerShowsAce ? 'insurance' : 'player_turn';

  return {
    ...state,
    phase: nextPhase,
    playerHands: [{ ...hand }],
    activeHandIndex: 0,
    dealerHand: dealer,
    balance: balance - bet,
    currentBet: bet,
    lastRoundPnl: null,
  };
}

// ---------------------------------------------------------------------------
// Phase: insurance
// ---------------------------------------------------------------------------

export function buyInsurance(state: BlackjackGameState): BlackjackGameState {
  const hand = state.playerHands[0];
  const insuranceBet = Math.floor(hand.bet / 2);

  if (state.balance < insuranceBet) {
    // Cannot afford insurance — treat as declined.
    return declineInsurance(state);
  }

  const updatedHand: BlackjackHand = {
    ...hand,
    hasInsurance: true,
    insuranceBet,
  };

  return {
    ...state,
    phase: 'player_turn',
    balance: state.balance - insuranceBet,
    playerHands: [updatedHand, ...state.playerHands.slice(1)],
  };
}

export function declineInsurance(state: BlackjackGameState): BlackjackGameState {
  // If the player has blackjack, skip to dealer turn to check dealer BJ.
  const hand = state.playerHands[0];
  const nextPhase = hand.status === 'blackjack' ? 'dealer_turn' : 'player_turn';
  return { ...state, phase: nextPhase };
}

// ---------------------------------------------------------------------------
// Action availability
// ---------------------------------------------------------------------------

export function getAvailableActions(state: BlackjackGameState): AvailableActions {
  const { phase, playerHands, activeHandIndex, rules, balance } = state;

  const none: AvailableActions = {
    hit: false,
    stand: false,
    double_down: false,
    split: false,
    surrender: false,
    buy_insurance: false,
    decline_insurance: false,
  };

  if (phase === 'insurance') {
    const insuranceBet = Math.floor((playerHands[0]?.bet ?? 0) / 2);
    return {
      ...none,
      buy_insurance: balance >= insuranceBet,
      decline_insurance: true,
    };
  }

  if (phase !== 'player_turn') return none;

  const hand = playerHands[activeHandIndex];
  if (!hand || hand.status !== 'active') return none;

  const { value } = computeHandValue(hand.cards);
  const isFirstAction = hand.cards.length === 2;
  const canAffordDouble = balance >= hand.bet;
  const isAcePair =
    hand.cards.length === 2 &&
    hand.cards[0].rank === 'A' &&
    hand.cards[1].rank === 'A';
  const isPair =
    hand.cards.length === 2 &&
    RANK_VALUES[hand.cards[0].rank] === RANK_VALUES[hand.cards[1].rank];
  const splitHandCount = playerHands.filter((h) => h.isSplit || h === hand).length;
  const canSplit =
    isPair &&
    isFirstAction &&
    splitHandCount < rules.maxSplitHands &&
    balance >= hand.bet &&
    (!isAcePair || rules.resplitAces || !hand.isSplit);

  // After splitting aces, player typically only gets one card per ace.
  const splitAcesLocked = hand.isSplit && isAcePair && !rules.resplitAces;

  const canDouble =
    isFirstAction &&
    canAffordDouble &&
    (rules.doubleOnAnyTwoCards || value === 9 || value === 10 || value === 11) &&
    (!hand.isSplit || rules.doubleAfterSplit) &&
    !splitAcesLocked;

  return {
    hit: !splitAcesLocked,
    stand: true,
    double_down: canDouble,
    split: canSplit,
    surrender: rules.surrenderAllowed && isFirstAction && !hand.isSplit,
    buy_insurance: false,
    decline_insurance: false,
  };
}

// ---------------------------------------------------------------------------
// Phase: player actions
// ---------------------------------------------------------------------------

function updateHandInState(
  state: BlackjackGameState,
  index: number,
  update: Partial<BlackjackHand>,
): BlackjackHand[] {
  return state.playerHands.map((h, i) => (i === index ? { ...h, ...update } : h));
}

/** Advances activeHandIndex to the next active hand, or moves to dealer_turn. */
function advanceHand(state: BlackjackGameState): BlackjackGameState {
  const nextActiveIndex = state.playerHands.findIndex(
    (h, i) => i > state.activeHandIndex && h.status === 'active',
  );

  if (nextActiveIndex !== -1) {
    return { ...state, activeHandIndex: nextActiveIndex };
  }

  // All hands resolved — move to dealer's turn.
  return runDealerTurn({ ...state, phase: 'dealer_turn' });
}

export function playerHit(state: BlackjackGameState): BlackjackGameState {
  const idx = state.activeHandIndex;
  const hand = state.playerHands[idx];

  const newCard = dealCard(_shoe);
  const newCards = [...hand.cards, newCard];
  const { isBust, isBlackjack } = computeHandValue(newCards);

  let newStatus: HandStatus = hand.status;
  if (isBust) {
    newStatus = 'bust';
  } else if (isBlackjack) {
    // 21 after a hit — auto-stand.
    newStatus = 'standing';
  }

  const updatedHands = updateHandInState(state, idx, {
    cards: newCards,
    status: newStatus,
  });

  const nextState = { ...state, playerHands: updatedHands };

  if (newStatus !== 'active') {
    return advanceHand(nextState);
  }
  return nextState;
}

export function playerStand(state: BlackjackGameState): BlackjackGameState {
  const idx = state.activeHandIndex;
  const updatedHands = updateHandInState(state, idx, { status: 'standing' });
  return advanceHand({ ...state, playerHands: updatedHands });
}

export function playerDoubleDown(state: BlackjackGameState): BlackjackGameState {
  const idx = state.activeHandIndex;
  const hand = state.playerHands[idx];

  const newCard = dealCard(_shoe);
  const newCards = [...hand.cards, newCard];
  const { isBust } = computeHandValue(newCards);

  const newStatus: HandStatus = isBust ? 'bust' : 'doubled';

  const updatedHands = updateHandInState(state, idx, {
    cards: newCards,
    status: newStatus,
    bet: hand.bet * 2,
  });

  return advanceHand({
    ...state,
    balance: state.balance - hand.bet, // deduct the additional bet
    playerHands: updatedHands,
  });
}

export function playerSplit(state: BlackjackGameState): BlackjackGameState {
  const idx = state.activeHandIndex;
  const hand = state.playerHands[idx];

  const [card1, card2] = hand.cards;

  // First hand keeps card1, gets a new card dealt immediately.
  const hand1: BlackjackHand = {
    ...hand,
    id: nanoid(),
    cards: [card1, dealCard(_shoe)],
    isSplit: true,
  };

  // Re-check for aces: after splitting aces, only one card each.
  const isAceSplit = card1.rank === 'A';

  // Second hand gets card2 + new card (non-ace splits get it now; ace splits too).
  const hand2: BlackjackHand = {
    ...makeHand(hand.bet, true),
    cards: [card2, dealCard(_shoe)],
    isSplit: true,
  };

  // After splitting aces most casinos only allow one card each — auto-stand.
  if (isAceSplit && !state.rules.resplitAces) {
    hand1.status = 'standing';
    hand2.status = 'standing';
  }

  const newHands = [
    ...state.playerHands.slice(0, idx),
    hand1,
    hand2,
    ...state.playerHands.slice(idx + 1),
  ];

  const nextState = {
    ...state,
    balance: state.balance - hand.bet, // deduct the second hand's bet
    playerHands: newHands,
    activeHandIndex: idx,
  };

  // If both hands are standing (ace split), advance immediately.
  if (hand1.status === 'standing' && hand2.status === 'standing') {
    return advanceHand({ ...nextState, activeHandIndex: idx + 1 });
  }

  // Otherwise the player acts on hand1 now.
  return nextState;
}

export function playerSurrender(state: BlackjackGameState): BlackjackGameState {
  const idx = state.activeHandIndex;
  const hand = state.playerHands[idx];

  const updatedHands = updateHandInState(state, idx, {
    status: 'surrendered',
    result: 'surrender',
  });

  // Return half the bet immediately.
  return advanceHand({
    ...state,
    balance: state.balance + Math.floor(hand.bet / 2),
    playerHands: updatedHands,
  });
}

// ---------------------------------------------------------------------------
// Phase: dealer turn
// ---------------------------------------------------------------------------

/**
 * Runs the full dealer draw sequence according to casino rules.
 * Dealer stands on hard 17+ and on soft 17 (if dealerStandsOnSoft17 = true).
 */
function runDealerTurn(state: BlackjackGameState): BlackjackGameState {
  const { rules } = state;
  const dealer = { ...state.dealerHand };

  // Reveal the hole card.
  dealer.cards = dealer.cards.map((c) => ({ ...c, faceDown: false }));
  dealer.revealed = true;

  // Check if any player hand is still in play (not bust/surrendered).
  const anyActiveHand = state.playerHands.some(
    (h) => h.status !== 'bust' && h.status !== 'surrendered',
  );

  // Dealer only draws if at least one player hand can beat them.
  if (anyActiveHand) {
    let dealerVal = computeHandValue(dealer.cards);
    while (!dealerVal.isBust) {
      const { value, isSoft } = dealerVal;
      // Stand on hard 17+.
      if (value > 17) break;
      // Stand on soft 17 if the rule says so; otherwise draw again.
      if (value === 17 && (!isSoft || rules.dealerStandsOnSoft17)) break;
      dealer.cards.push(dealCard(_shoe));
      dealerVal = computeHandValue(dealer.cards);
    }
  }

  return resolveHands({ ...state, dealerHand: dealer });
}

// ---------------------------------------------------------------------------
// Phase: resolve / payout
// ---------------------------------------------------------------------------

function resolveHands(state: BlackjackGameState): BlackjackGameState {
  const { rules } = state;
  const dealerVal = computeHandValue(state.dealerHand.cards);
  const dealerHasBlackjack = dealerVal.isBlackjack;

  let totalPayout = 0;

  const resolvedHands: BlackjackHand[] = state.playerHands.map((hand) => {
    // Already-resolved hands (bust, surrender) keep their status.
    if (hand.status === 'bust' || hand.status === 'surrendered') {
      // Insurance resolution for bust.
      if (hand.hasInsurance && dealerHasBlackjack) {
        totalPayout += hand.insuranceBet * 2; // 2:1 on insurance
      }
      return { ...hand, result: hand.status === 'bust' ? 'bust' : 'surrender' };
    }

    const playerVal = computeHandValue(hand.cards);
    let result: HandResult;

    if (hand.status === 'blackjack' && !dealerHasBlackjack) {
      result = 'blackjack';
      // 3:2 or 6:5 payout.
      const ratio = rules.blackjackPays === '3:2' ? 1.5 : 1.2;
      totalPayout += Math.floor(hand.bet * ratio) + hand.bet;
    } else if (hand.status === 'blackjack' && dealerHasBlackjack) {
      result = 'push';
      totalPayout += hand.bet; // return bet
    } else if (dealerHasBlackjack) {
      result = 'lose';
      // No payout — bet already deducted.
    } else if (dealerVal.isBust) {
      result = 'win';
      totalPayout += hand.bet * 2;
    } else if (playerVal.value > dealerVal.value) {
      result = 'win';
      totalPayout += hand.bet * 2;
    } else if (playerVal.value === dealerVal.value) {
      result = 'push';
      totalPayout += hand.bet;
    } else {
      result = 'lose';
    }

    // Insurance resolution.
    if (hand.hasInsurance) {
      if (dealerHasBlackjack) {
        totalPayout += hand.insuranceBet * 2; // 2:1 payout + stake back
      }
      // If dealer doesn't have blackjack, insurance bet is lost (already deducted).
    }

    return { ...hand, result };
  });

  const previousBalance = state.balance;
  const newBalance = previousBalance + totalPayout;
  const originalTotalBet = resolvedHands.reduce((sum, h) => sum + h.bet, 0);
  const lastRoundPnl = newBalance - (state.balance); // chips returned minus nothing extra yet

  return {
    ...state,
    phase: newBalance === 0 ? 'game_over' : 'payout',
    playerHands: resolvedHands,
    balance: newBalance,
    lastRoundPnl: totalPayout - originalTotalBet, // net gain/loss
    handsPlayed: state.handsPlayed + 1,
  };
}

// ---------------------------------------------------------------------------
// Payout detail (for UI display)
// ---------------------------------------------------------------------------

export function getPayoutDetails(state: BlackjackGameState): PayoutDetail[] {
  const { rules } = state;
  const dealerVal = computeHandValue(state.dealerHand.cards);
  const dealerHasBlackjack = dealerVal.isBlackjack;

  return state.playerHands.map((hand) => {
    let netChips = -hand.bet; // assume loss
    let insuranceResult: 'win' | 'lose' | 'none' = 'none';
    let insuranceNetChips = 0;

    if (hand.result === 'blackjack') {
      const ratio = rules.blackjackPays === '3:2' ? 1.5 : 1.2;
      netChips = Math.floor(hand.bet * ratio);
    } else if (hand.result === 'win') {
      netChips = hand.bet;
    } else if (hand.result === 'push') {
      netChips = 0;
    } else if (hand.result === 'surrender') {
      netChips = -Math.floor(hand.bet / 2);
    }

    if (hand.hasInsurance) {
      if (dealerHasBlackjack) {
        insuranceResult = 'win';
        insuranceNetChips = hand.insuranceBet; // net after returning stake
      } else {
        insuranceResult = 'lose';
        insuranceNetChips = -hand.insuranceBet;
      }
    }

    return {
      handId: hand.id,
      betAmount: hand.bet,
      netChips,
      result: hand.result,
      insuranceResult,
      insuranceNetChips,
    };
  });
}

// ---------------------------------------------------------------------------
// Reset for next round
// ---------------------------------------------------------------------------

export function resetForNextRound(state: BlackjackGameState): BlackjackGameState {
  return {
    ...state,
    phase: state.balance > 0 ? 'betting' : 'game_over',
    playerHands: [],
    activeHandIndex: 0,
    dealerHand: makeDealerHand(),
    lastRoundPnl: state.lastRoundPnl, // keep for display
  };
}
