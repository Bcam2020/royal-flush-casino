/**
 * Payout tables for all supported games.
 *
 * All payouts are expressed as a multiplier of the original bet.
 * A value of 1.0 means "even money" (win 1× your bet, keeping the stake).
 * The net_gain column is what's added on top of the returned stake.
 *
 * Example: bet $10 on a hand that pays 3:2
 *   returned_total = bet × (1 + payout_ratio) = $10 × 2.5 = $25
 *   net_gain       = $15
 */

// ---------------------------------------------------------------------------
// Shared utilities
// ---------------------------------------------------------------------------

export interface PayoutEntry {
  /** Human-readable label for this outcome. */
  label: string;
  /**
   * Net payout multiplier on the bet.
   * 1.0 = even money, 1.5 = 3:2, -1.0 = lose your bet, 0 = push.
   */
  netMultiplier: number;
  /** Odds expressed as a ratio string, e.g. "3:2", "35:1". */
  oddsDisplay: string;
  /** House edge contribution description, for informational display. */
  description?: string;
}

/** Calculates the total return (stake + winnings) for a given bet. */
export function calculateReturn(bet: number, netMultiplier: number): number {
  return bet + bet * netMultiplier;
}

/** Calculates net gain (positive) or loss (negative) for a given bet. */
export function calculateNetGain(bet: number, netMultiplier: number): number {
  return Math.round(bet * netMultiplier);
}

// ---------------------------------------------------------------------------
// Blackjack payouts
// ---------------------------------------------------------------------------

export const BLACKJACK_PAYOUTS = {
  /** Standard natural blackjack payout. */
  BLACKJACK_3_2: {
    label: 'Blackjack',
    netMultiplier: 1.5,
    oddsDisplay: '3:2',
    description: 'Natural 21 on first two cards when dealer does not also have blackjack.',
  },
  /** Unfavourable single-deck payout sometimes seen in casinos. */
  BLACKJACK_6_5: {
    label: 'Blackjack (6:5)',
    netMultiplier: 1.2,
    oddsDisplay: '6:5',
    description: 'Increases house edge by approximately 1.4%.',
  },
  WIN: {
    label: 'Win',
    netMultiplier: 1.0,
    oddsDisplay: '1:1',
    description: 'Player hand beats dealer without busting.',
  },
  PUSH: {
    label: 'Push',
    netMultiplier: 0,
    oddsDisplay: 'Push',
    description: 'Tied hands — bet returned.',
  },
  LOSE: {
    label: 'Lose',
    netMultiplier: -1.0,
    oddsDisplay: '0:1',
    description: 'Dealer hand beats player, or player busts.',
  },
  BUST: {
    label: 'Bust',
    netMultiplier: -1.0,
    oddsDisplay: '0:1',
    description: 'Player total exceeds 21.',
  },
  SURRENDER: {
    label: 'Surrender',
    netMultiplier: -0.5,
    oddsDisplay: '1:2 returned',
    description: 'Early surrender — half the bet is returned.',
  },
  INSURANCE_WIN: {
    label: 'Insurance Win',
    netMultiplier: 2.0,
    oddsDisplay: '2:1',
    description: 'Insurance bet wins when dealer has a natural blackjack.',
  },
  INSURANCE_LOSE: {
    label: 'Insurance Loss',
    netMultiplier: -1.0,
    oddsDisplay: '0:1',
    description: 'Insurance bet lost when dealer does not have blackjack.',
  },
} as const satisfies Record<string, PayoutEntry>;

/** House edge estimates for blackjack variants. */
export const BLACKJACK_HOUSE_EDGE = {
  /** 6-deck, S17, DAS, RSA, no surrender. */
  STANDARD: 0.005,            // 0.5%
  /** 6-deck, H17, no DAS. */
  UNFAVOURABLE: 0.009,        // 0.9%
  /** Single deck, S17 — best theoretical odds. */
  SINGLE_DECK_S17: 0.0015,   // 0.15%
} as const;

// ---------------------------------------------------------------------------
// Roulette payouts (American wheel: 0 + 00; European: 0 only)
// ---------------------------------------------------------------------------

export type RouletteVariant = 'american' | 'european';

export interface RouletteBet extends PayoutEntry {
  /** Number of pockets covered by this bet. */
  pocketsCovered: number;
  /** True probability of winning (European 37-pocket wheel). */
  trueOddsEuropean: number;
  /** True probability of winning (American 38-pocket wheel). */
  trueOddsAmerican: number;
}

export const ROULETTE_PAYOUTS: Record<string, RouletteBet> = {
  STRAIGHT_UP: {
    label: 'Straight Up',
    netMultiplier: 35,
    oddsDisplay: '35:1',
    pocketsCovered: 1,
    trueOddsEuropean: 1 / 37,
    trueOddsAmerican: 1 / 38,
    description: 'Single number bet.',
  },
  SPLIT: {
    label: 'Split',
    netMultiplier: 17,
    oddsDisplay: '17:1',
    pocketsCovered: 2,
    trueOddsEuropean: 2 / 37,
    trueOddsAmerican: 2 / 38,
    description: 'Two adjacent numbers.',
  },
  STREET: {
    label: 'Street',
    netMultiplier: 11,
    oddsDisplay: '11:1',
    pocketsCovered: 3,
    trueOddsEuropean: 3 / 37,
    trueOddsAmerican: 3 / 38,
    description: 'Three numbers in a row.',
  },
  CORNER: {
    label: 'Corner',
    netMultiplier: 8,
    oddsDisplay: '8:1',
    pocketsCovered: 4,
    trueOddsEuropean: 4 / 37,
    trueOddsAmerican: 4 / 38,
    description: 'Four numbers forming a square.',
  },
  FIVE_NUMBER: {
    label: 'Five Number',
    netMultiplier: 6,
    oddsDisplay: '6:1',
    pocketsCovered: 5,
    trueOddsEuropean: 0,        // only valid on American wheel (0,00,1,2,3)
    trueOddsAmerican: 5 / 38,
    description: 'American only: 0, 00, 1, 2, 3. Highest house edge bet on the table.',
  },
  SIX_LINE: {
    label: 'Six Line',
    netMultiplier: 5,
    oddsDisplay: '5:1',
    pocketsCovered: 6,
    trueOddsEuropean: 6 / 37,
    trueOddsAmerican: 6 / 38,
    description: 'Two adjacent streets (6 numbers).',
  },
  COLUMN: {
    label: 'Column',
    netMultiplier: 2,
    oddsDisplay: '2:1',
    pocketsCovered: 12,
    trueOddsEuropean: 12 / 37,
    trueOddsAmerican: 12 / 38,
    description: 'One of three columns of 12 numbers.',
  },
  DOZEN: {
    label: 'Dozen',
    netMultiplier: 2,
    oddsDisplay: '2:1',
    pocketsCovered: 12,
    trueOddsEuropean: 12 / 37,
    trueOddsAmerican: 12 / 38,
    description: '1st (1–12), 2nd (13–24), or 3rd (25–36) dozen.',
  },
  RED_BLACK: {
    label: 'Red / Black',
    netMultiplier: 1,
    oddsDisplay: '1:1',
    pocketsCovered: 18,
    trueOddsEuropean: 18 / 37,
    trueOddsAmerican: 18 / 38,
    description: 'Even money outside bet.',
  },
  ODD_EVEN: {
    label: 'Odd / Even',
    netMultiplier: 1,
    oddsDisplay: '1:1',
    pocketsCovered: 18,
    trueOddsEuropean: 18 / 37,
    trueOddsAmerican: 18 / 38,
    description: 'Even money outside bet.',
  },
  HIGH_LOW: {
    label: 'High / Low',
    netMultiplier: 1,
    oddsDisplay: '1:1',
    pocketsCovered: 18,
    trueOddsEuropean: 18 / 37,
    trueOddsAmerican: 18 / 38,
    description: '1–18 (Low) or 19–36 (High). Even money outside bet.',
  },
} as const;

/** House edge for roulette variants. */
export const ROULETTE_HOUSE_EDGE: Record<RouletteVariant, number> = {
  european: 0.027,   // 2.7% — single zero
  american: 0.0526,  // 5.26% — double zero (five-number bet is 7.89%)
};

// ---------------------------------------------------------------------------
// Three Card Poker payouts
// ---------------------------------------------------------------------------

/**
 * Three Card Poker has two main wagers:
 *   1. Ante + Play (mandatory bet + optional play bet)
 *   2. Pair Plus (optional side bet on hand quality alone)
 */

export type ThreeCardPokerHandRank =
  | 'straight_flush'
  | 'three_of_a_kind'
  | 'straight'
  | 'flush'
  | 'pair'
  | 'high_card';

export interface ThreeCardPokerPayout extends PayoutEntry {
  handRank: ThreeCardPokerHandRank;
  /** Probability of being dealt this hand from a fresh 52-card deck. */
  probability: number;
}

/** Ante Bonus — paid regardless of dealer qualifying. */
export const TCP_ANTE_BONUS: Record<string, ThreeCardPokerPayout> = {
  STRAIGHT_FLUSH_ANTE: {
    label: 'Straight Flush (Ante Bonus)',
    handRank: 'straight_flush',
    netMultiplier: 5,
    oddsDisplay: '5:1',
    probability: 48 / 22100,
    description: 'Paid on Ante regardless of dealer\'s hand.',
  },
  THREE_OF_A_KIND_ANTE: {
    label: 'Three of a Kind (Ante Bonus)',
    handRank: 'three_of_a_kind',
    netMultiplier: 4,
    oddsDisplay: '4:1',
    probability: 52 / 22100,
    description: 'Paid on Ante regardless of dealer\'s hand.',
  },
  STRAIGHT_ANTE: {
    label: 'Straight (Ante Bonus)',
    handRank: 'straight',
    netMultiplier: 1,
    oddsDisplay: '1:1',
    probability: 720 / 22100,
    description: 'Paid on Ante regardless of dealer\'s hand.',
  },
} as const;

/** Pair Plus side bet — independent of Ante/Play outcome. */
export const TCP_PAIR_PLUS: Record<string, ThreeCardPokerPayout> = {
  STRAIGHT_FLUSH_PP: {
    label: 'Straight Flush (Pair Plus)',
    handRank: 'straight_flush',
    netMultiplier: 40,
    oddsDisplay: '40:1',
    probability: 48 / 22100,
    description: 'Pair Plus pays 40:1 for a straight flush.',
  },
  THREE_OF_A_KIND_PP: {
    label: 'Three of a Kind (Pair Plus)',
    handRank: 'three_of_a_kind',
    netMultiplier: 30,
    oddsDisplay: '30:1',
    probability: 52 / 22100,
    description: 'Pair Plus pays 30:1 for trips.',
  },
  STRAIGHT_PP: {
    label: 'Straight (Pair Plus)',
    handRank: 'straight',
    netMultiplier: 6,
    oddsDisplay: '6:1',
    probability: 720 / 22100,
    description: 'Pair Plus pays 6:1 for a straight.',
  },
  FLUSH_PP: {
    label: 'Flush (Pair Plus)',
    handRank: 'flush',
    netMultiplier: 3,
    oddsDisplay: '3:1',
    probability: 1096 / 22100,
    description: 'Pair Plus pays 3:1 for a flush.',
  },
  PAIR_PP: {
    label: 'Pair (Pair Plus)',
    handRank: 'pair',
    netMultiplier: 1,
    oddsDisplay: '1:1',
    probability: 3744 / 22100,
    description: 'Pair Plus pays 1:1 (even money) for a pair.',
  },
  HIGH_CARD_PP: {
    label: 'High Card (Pair Plus)',
    handRank: 'high_card',
    netMultiplier: -1,
    oddsDisplay: '0:1',
    probability: 16440 / 22100,
    description: 'Pair Plus loses on high card.',
  },
} as const;

/** Ante/Play main game payouts. */
export const TCP_ANTE_PLAY: Record<string, PayoutEntry> = {
  WIN: {
    label: 'Win',
    netMultiplier: 1,
    oddsDisplay: '1:1',
    description: 'Player hand beats qualifying dealer hand.',
  },
  LOSE: {
    label: 'Lose',
    netMultiplier: -1,
    oddsDisplay: '0:1',
    description: 'Dealer qualifies and beats player hand.',
  },
  PUSH: {
    label: 'Push',
    netMultiplier: 0,
    oddsDisplay: 'Push',
    description: 'Tied hands.',
  },
  DEALER_NO_QUALIFY: {
    label: 'Dealer Does Not Qualify',
    netMultiplier: 0,
    oddsDisplay: 'Ante wins 1:1; Play pushes',
    description: 'Dealer must have Queen-high or better to qualify. ' +
                 'Ante paid 1:1; Play bet returned.',
  },
} as const;

/** House edge for Three Card Poker variants. */
export const TCP_HOUSE_EDGE = {
  ANTE_PLAY: 0.0353,     // 3.53% on Ante + Play combined
  PAIR_PLUS: 0.0724,     // 7.24% on Pair Plus side bet
} as const;

// ---------------------------------------------------------------------------
// Summary table for display
// ---------------------------------------------------------------------------

export interface GameOddsSummary {
  gameName: string;
  houseEdge: number;
  houseEdgeDisplay: string;
  bestBet: string;
  worstBet: string;
}

export const GAME_ODDS_SUMMARY: GameOddsSummary[] = [
  {
    gameName: 'Blackjack (6-deck, S17)',
    houseEdge: BLACKJACK_HOUSE_EDGE.STANDARD,
    houseEdgeDisplay: '0.5%',
    bestBet: 'Basic strategy play',
    worstBet: 'Insurance (2.7% side edge)',
  },
  {
    gameName: 'Roulette (European)',
    houseEdge: ROULETTE_HOUSE_EDGE.european,
    houseEdgeDisplay: '2.7%',
    bestBet: 'Any even-money bet',
    worstBet: 'Any bet (all identical edge)',
  },
  {
    gameName: 'Roulette (American)',
    houseEdge: ROULETTE_HOUSE_EDGE.american,
    houseEdgeDisplay: '5.26%',
    bestBet: 'Any even-money bet',
    worstBet: 'Five-number bet (7.89%)',
  },
  {
    gameName: 'Three Card Poker (Ante + Play)',
    houseEdge: TCP_HOUSE_EDGE.ANTE_PLAY,
    houseEdgeDisplay: '3.53%',
    bestBet: 'Ante/Play with optimal strategy',
    worstBet: 'Pair Plus side bet (7.24%)',
  },
];
