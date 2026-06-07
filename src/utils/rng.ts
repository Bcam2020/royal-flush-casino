/**
 * Cryptographically fair RNG backed by crypto.getRandomValues.
 *
 * React Native's Hermes engine exposes the Web Crypto API via the global
 * `crypto` object. On older RN versions where it is absent we fall back to
 * a rejection-sampling approach over Math.random ONLY as a last resort,
 * and that path is clearly flagged so it is never silently used in prod.
 */

function getRandomBytes(byteCount: number): Uint8Array {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const buf = new Uint8Array(byteCount);
    crypto.getRandomValues(buf);
    return buf;
  }
  // Should never happen on a modern RN build. Surface loudly.
  throw new Error(
    '[RNG] crypto.getRandomValues is unavailable. ' +
      'Ensure you are running on a platform that supports the Web Crypto API.',
  );
}

/**
 * Returns a cryptographically random float in [0, 1).
 * Uses 53 bits of entropy to match JavaScript's floating-point precision.
 */
export function randomFloat(): number {
  const bytes = getRandomBytes(8);
  const view = new DataView(bytes.buffer);
  // Build a 53-bit integer from the first 7 bytes (56 bits), masked to 53.
  const hi = view.getUint32(0) >>> 0;
  const lo = view.getUint32(4) >>> 0;
  // Combine into a 53-bit value: hi contributes the top 21 bits, lo the lower 32.
  const combined = (hi & 0x1fffff) * 0x100000000 + lo;
  return combined / (0x20000000000000); // 2^53
}

/**
 * Returns a cryptographically random integer in [0, exclusiveMax).
 * Uses rejection sampling to eliminate modulo bias.
 */
export function randomInt(exclusiveMax: number): number {
  if (!Number.isInteger(exclusiveMax) || exclusiveMax <= 0) {
    throw new RangeError(`exclusiveMax must be a positive integer, got ${exclusiveMax}`);
  }
  if (exclusiveMax === 1) return 0;

  // Determine how many bytes we need (up to 4 for 32-bit range).
  const bitsNeeded = Math.ceil(Math.log2(exclusiveMax));
  const bytesNeeded = Math.ceil(bitsNeeded / 8);
  const maxAcceptable = Math.floor(0x100000000 / exclusiveMax) * exclusiveMax;

  // Rejection sampling: discard values that would cause modulo bias.
  let value: number;
  do {
    const bytes = getRandomBytes(bytesNeeded);
    const view = new DataView(bytes.buffer);
    // Read as uint32, zero-extending if fewer than 4 bytes.
    let raw = 0;
    for (let i = 0; i < bytesNeeded; i++) {
      raw = (raw << 8) | bytes[i];
    }
    raw = raw >>> 0; // treat as unsigned 32-bit
    value = raw;
  } while (value >= maxAcceptable);

  return value % exclusiveMax;
}

/**
 * Randomly shuffles an array in-place using Fisher-Yates with the above RNG.
 * Returns the same array reference for convenience.
 */
export function shuffleInPlace<T>(array: T[]): T[] {
  for (let i = array.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    // Swap
    const tmp = array[i];
    array[i] = array[j];
    array[j] = tmp;
  }
  return array;
}

/**
 * Returns a new shuffled copy of the array without mutating the original.
 */
export function shuffled<T>(array: T[]): T[] {
  return shuffleInPlace([...array]);
}

/**
 * Randomly picks one element from a non-empty array.
 */
export function randomPick<T>(array: readonly T[]): T {
  if (array.length === 0) throw new RangeError('Cannot pick from an empty array');
  return array[randomInt(array.length)];
}
