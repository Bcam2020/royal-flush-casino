import { shuffleInPlace } from './rng';

// ---------------------------------------------------------------------------
// Core card types
// ---------------------------------------------------------------------------

export type Suit = 'clubs' | 'diamonds' | 'hearts' | 'spades';
export type Rank =
  | 'A'
  | '2'
  | '3'
  | '4'
  | '5'
  | '6'
  | '7'
  | '8'
  | '9'
  | '10'
  | 'J'
  | 'Q'
  | 'K';

export interface Card {
  readonly rank: Rank;
  readonly suit: Suit;
  /** Whether this card is face-down (hidden from the player). */
  faceDown: boolean;
}

// ---------------------------------------------------------------------------
// Lookup tables
// ---------------------------------------------------------------------------

export const SUITS: readonly Suit[] = ['clubs', 'diamonds', 'hearts', 'spades'];

export const RANKS: readonly Rank[] = [
  'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K',
];

/** Blackjack point values for each rank. Aces are handled separately. */
export const RANK_VALUES: Readonly<Record<Rank, number>> = {
  A:  1, // treated as 1 or 11 — see handValue()
  '2': 2,
  '3': 3,
  '4': 4,
  '5': 5,
  '6': 6,
  '7': 7,
  '8': 8,
  '9': 9,
  '10': 10,
  J: 10,
  Q: 10,
  K: 10,
};

/** Human-readable suit symbols. */
export const SUIT_SYMBOLS: Readonly<Record<Suit, string>> = {
  clubs:    '♣',
  diamonds: '♦',
  hearts:   '♥',
  spades:   '♠',
};

// ---------------------------------------------------------------------------
// Single-deck factory
// ---------------------------------------------------------------------------

/** Builds one standard 52-card deck (unshuffled). */
function buildDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ rank, suit, faceDown: false });
    }
  }
  return deck;
}

// ---------------------------------------------------------------------------
// Shoe (multi-deck)
// ---------------------------------------------------------------------------

export const DEFAULT_DECK_COUNT = 6;

export interface Shoe {
  cards: Card[];
  /** Total number of standard decks in this shoe. */
  deckCount: number;
  /** Index of the next card to be dealt. */
  position: number;
  /**
   * The cut-card position — when `position` reaches this index, the shoe
   * should be reshuffled before the next hand begins.
   */
  cutCardPosition: number;
}

/**
 * Creates and shuffles a new shoe of `deckCount` standard decks.
 *
 * The cut card is placed randomly within the last 60–80 cards of the shoe,
 * matching common casino practice.
 */
export function createShoe(deckCount: number = DEFAULT_DECK_COUNT): Shoe {
  const allCards: Card[] = [];
  for (let d = 0; d < deckCount; d++) {
    allCards.push(...buildDeck());
  }

  shuffleInPlace(allCards);

  // Place the cut card somewhere in the final ~60–80 cards.
  const totalCards = allCards.length;
  const cutCardPosition = totalCards - (60 + Math.floor(Math.random() * 21)); // 60–80

  return {
    cards: allCards,
    deckCount,
    position: 0,
    cutCardPosition: Math.max(cutCardPosition, totalCards - 80),
  };
}

/**
 * Deals the next card from the shoe.
 * Throws if the shoe is exhausted — callers should check `needsReshuffle`
 * before each hand.
 */
export function dealCard(shoe: Shoe, faceDown: boolean = false): Card {
  if (shoe.position >= shoe.cards.length) {
    throw new Error('Shoe is exhausted — reshuffle before dealing.');
  }
  const card: Card = { ...shoe.cards[shoe.position], faceDown };
  shoe.position++;
  return card;
}

/**
 * Returns true when the shoe has reached (or passed) the cut-card position,
 * indicating a reshuffle is due before the next hand.
 */
export function needsReshuffle(shoe: Shoe): boolean {
  return shoe.position >= shoe.cutCardPosition;
}

/**
 * Returns the approximate number of decks remaining in the shoe.
 * Useful for displaying penetration information.
 */
export function decksRemaining(shoe: Shoe): number {
  const cardsLeft = shoe.cards.length - shoe.position;
  return cardsLeft / 52;
}

/**
 * Resets and reshuffles the shoe in-place.
 */
export function reshuffleShoe(shoe: Shoe): void {
  // Rebuild from scratch so removed cards (from previously dealt positions)
  // are restored — this is how a real casino re-uses a shuffling machine.
  const allCards: Card[] = [];
  for (let d = 0; d < shoe.deckCount; d++) {
    allCards.push(...buildDeck());
  }
  shuffleInPlace(allCards);

  const totalCards = allCards.length;
  shoe.cards = allCards;
  shoe.position = 0;
  shoe.cutCardPosition = totalCards - (60 + Math.floor(Math.random() * 21));
}

// ---------------------------------------------------------------------------
// Card display helpers
// ---------------------------------------------------------------------------

/** Returns a short string like "A♠" or "10♦". */
export function cardLabel(card: Card): string {
  if (card.faceDown) return '??';
  return `${card.rank}${SUIT_SYMBOLS[card.suit]}`;
}

/** Returns true for red suits. */
export function isRedCard(card: Card): boolean {
  return card.suit === 'hearts' || card.suit === 'diamonds';
}
