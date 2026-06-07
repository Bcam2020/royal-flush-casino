import type { Card } from '../../utils/deck';

// ---------------------------------------------------------------------------
// Hand
// ---------------------------------------------------------------------------

export type HandResult =
  | 'blackjack'   // natural 21 on first two cards
  | 'win'
  | 'lose'
  | 'push'        // tie
  | 'bust'
  | 'surrender'
  | 'pending';    // hand not yet resolved

export type HandStatus =
  | 'active'      // player is still acting on this hand
  | 'standing'    // player has stood; awaiting dealer resolution
  | 'doubled'     // player doubled down and received one more card
  | 'bust'
  | 'blackjack'
  | 'surrendered';

export interface BlackjackHand {
  readonly id: string;
  cards: Card[];
  status: HandStatus;
  result: HandResult;
  /** Wager placed on this specific hand (relevant after splits). */
  bet: number;
  /** Whether this hand was created via a split. */
  isSplit: boolean;
  /** Whether insurance was purchased (only valid on the first hand). */
  hasInsurance: boolean;
  /** Insurance bet amount (half the original bet). */
  insuranceBet: number;
}

// ---------------------------------------------------------------------------
// Dealer
// ---------------------------------------------------------------------------

export interface DealerHand {
  cards: Card[];
  /** True once the dealer has revealed their hole card. */
  revealed: boolean;
}

// ---------------------------------------------------------------------------
// Player state
// ---------------------------------------------------------------------------

/** Index into `BlackjackGameState.playerHands`. */
export type HandIndex = number;

export type BlackjackPhase =
  | 'idle'           // waiting for a bet to be placed
  | 'betting'        // player is setting their bet
  | 'dealing'        // initial two cards being distributed (animation phase)
  | 'insurance'      // dealer has an Ace up — offering insurance
  | 'player_turn'    // player is choosing actions
  | 'dealer_turn'    // dealer is drawing cards
  | 'payout'         // hands resolved, showing results
  | 'game_over';     // player has run out of chips

export type BlackjackAction =
  | 'hit'
  | 'stand'
  | 'double_down'
  | 'split'
  | 'surrender'       // early surrender only (pre-dealer blackjack check)
  | 'buy_insurance'
  | 'decline_insurance';

// ---------------------------------------------------------------------------
// Game configuration
// ---------------------------------------------------------------------------

export interface BlackjackRules {
  /** Number of decks in the shoe. */
  deckCount: number;
  /** Blackjack pays 3:2 (standard) or 6:5 (unfavourable). */
  blackjackPays: '3:2' | '6:5';
  /** Dealer draws until 17; stands on soft 17. */
  dealerStandsOnSoft17: boolean;
  /** Player may double down on any two cards. */
  doubleOnAnyTwoCards: boolean;
  /** Player may double down after splitting. */
  doubleAfterSplit: boolean;
  /** Maximum number of hands after splitting. */
  maxSplitHands: number;
  /** Re-splitting aces allowed. */
  resplitAces: boolean;
  /** Early surrender offered. */
  surrenderAllowed: boolean;
  /** Insurance offered when dealer shows an Ace. */
  insuranceAllowed: boolean;
  /** Minimum and maximum bet per hand. */
  minBet: number;
  maxBet: number;
}

export const DEFAULT_BLACKJACK_RULES: BlackjackRules = {
  deckCount: 6,
  blackjackPays: '3:2',
  dealerStandsOnSoft17: true,
  doubleOnAnyTwoCards: true,
  doubleAfterSplit: true,
  maxSplitHands: 4,
  resplitAces: false,
  surrenderAllowed: true,
  insuranceAllowed: true,
  minBet: 5,
  maxBet: 1000,
};

// ---------------------------------------------------------------------------
// Full game state
// ---------------------------------------------------------------------------

export interface BlackjackGameState {
  phase: BlackjackPhase;
  rules: BlackjackRules;
  playerHands: BlackjackHand[];
  /** Index of the hand the player is currently acting on. */
  activeHandIndex: HandIndex;
  dealerHand: DealerHand;
  /** Player's total chip balance. */
  balance: number;
  /** Bet set before the current round. */
  currentBet: number;
  /** Net result of the last completed round in chips (positive = profit). */
  lastRoundPnl: number | null;
  /** Running count of rounds played this session. */
  handsPlayed: number;
}

// ---------------------------------------------------------------------------
// Engine output
// ---------------------------------------------------------------------------

export interface AvailableActions {
  hit: boolean;
  stand: boolean;
  double_down: boolean;
  split: boolean;
  surrender: boolean;
  buy_insurance: boolean;
  decline_insurance: boolean;
}

/** Detailed breakdown of a hand's payout. */
export interface PayoutDetail {
  handId: string;
  betAmount: number;
  netChips: number;   // positive = chips won, negative = chips lost
  result: HandResult;
  insuranceResult: 'win' | 'lose' | 'none';
  insuranceNetChips: number;
}
