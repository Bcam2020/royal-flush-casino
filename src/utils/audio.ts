/**
 * Casino audio — Web Audio API on web, expo-av on native.
 *
 * On web: all sounds are generated programmatically via OscillatorNode.
 * On native: uses expo-av. Add mp3 files to assets/sounds/ to activate.
 *
 * Both paths honour the mute toggle which persists in AsyncStorage.
 */

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const MUTE_KEY = '@casino/muted';

// ---------------------------------------------------------------------------
// Web Audio API singleton
// ---------------------------------------------------------------------------

let _audioCtx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (Platform.OS !== 'web') return null;
  if (typeof window === 'undefined') return null;
  if (_audioCtx) return _audioCtx;
  try {
    const Ctor = window.AudioContext ?? (window as any).webkitAudioContext;
    _audioCtx = new Ctor();
  } catch {
    _audioCtx = null;
  }
  return _audioCtx;
}

/** Resume the AudioContext after a user gesture (required by browsers). */
async function resumeCtx(): Promise<void> {
  const ctx = getCtx();
  if (ctx && ctx.state === 'suspended') {
    try { await ctx.resume(); } catch {}
  }
}

// ---------------------------------------------------------------------------
// Tone helpers
// ---------------------------------------------------------------------------

function tone(
  freq: number,
  durationMs: number,
  type: OscillatorType = 'sine',
  volume = 0.25,
  delayMs = 0,
): void {
  const ctx = getCtx();
  if (!ctx) return;
  const now = ctx.currentTime + delayMs / 1000;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = type;
  osc.frequency.setValueAtTime(freq, now);
  gain.gain.setValueAtTime(volume, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + durationMs / 1000);
  osc.start(now);
  osc.stop(now + durationMs / 1000);
}

function chord(
  freqs: number[],
  durationMs: number,
  type: OscillatorType = 'sine',
  volume = 0.18,
  gapMs = 80,
): void {
  freqs.forEach((f, i) => tone(f, durationMs, type, volume, i * gapMs));
}

// ---------------------------------------------------------------------------
// Looping noise source for wheel/rattle
// ---------------------------------------------------------------------------

interface LoopSource {
  node: AudioBufferSourceNode | OscillatorNode;
  gain: GainNode;
}

const _looping = new Map<string, LoopSource>();

function startNoise(key: string, volume = 0.15): void {
  const ctx = getCtx();
  if (!ctx || _looping.has(key)) return;

  // Create white-noise buffer
  const bufLen = ctx.sampleRate * 2; // 2 second loop
  const buffer = ctx.createBuffer(1, bufLen, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufLen; i++) data[i] = (Math.random() * 2 - 1) * 0.3;

  const src = ctx.createBufferSource();
  src.buffer = buffer;
  src.loop = true;

  // Low-pass filter for rumble
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = key === 'ball_rattle' ? 3000 : 400;

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(volume, ctx.currentTime);

  src.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  src.start();
  _looping.set(key, { node: src, gain });
}

function stopNoise(key: string, fadeMs = 600): void {
  const src = _looping.get(key);
  if (!src) return;
  _looping.delete(key);
  const ctx = getCtx();
  if (!ctx) return;
  const { node, gain } = src;
  const now = ctx.currentTime;
  gain.gain.setValueAtTime(gain.gain.value, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + fadeMs / 1000);
  setTimeout(() => {
    try { node.stop(); } catch {}
  }, fadeMs + 50);
}

// Ambient music — slow arpeggiated Am chord (A3-C4-E4-A4)
let _ambientTimer: ReturnType<typeof setInterval> | null = null;
let _ambientStep = 0;
const AMBIENT_FREQS = [220, 261.6, 329.6, 440, 329.6, 261.6]; // A3 C4 E4 A4 E4 C4

function startAmbientWeb(): void {
  if (_ambientTimer) return;
  _ambientStep = 0;
  _ambientTimer = setInterval(() => {
    tone(AMBIENT_FREQS[_ambientStep % AMBIENT_FREQS.length], 800, 'sine', 0.07);
    _ambientStep++;
  }, 700);
}

function stopAmbientWeb(): void {
  if (_ambientTimer) {
    clearInterval(_ambientTimer);
    _ambientTimer = null;
  }
}

// ---------------------------------------------------------------------------
// Native expo-av path (no-ops until sound files land in assets/sounds/)
// ---------------------------------------------------------------------------

let _nativeInitialized = false;

async function initNative(): Promise<void> {
  if (_nativeInitialized) return;
  _nativeInitialized = true;
  try {
    const { Audio } = await import('expo-av');
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: false,
      staysActiveInBackground: false,
    });
  } catch {}
}

// ---------------------------------------------------------------------------
// AudioManager
// ---------------------------------------------------------------------------

class AudioManager {
  private muted = false;
  private _ready = false;

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  async init(): Promise<void> {
    if (this._ready) return;
    this._ready = true;
    try {
      const stored = await AsyncStorage.getItem(MUTE_KEY);
      this.muted = stored === 'true';
    } catch {}
    if (Platform.OS !== 'web') await initNative();
  }

  // ── Mute ─────────────────────────────────────────────────────────────────

  isMuted(): boolean { return this.muted; }

  async setMuted(v: boolean): Promise<void> {
    this.muted = v;
    try { await AsyncStorage.setItem(MUTE_KEY, String(v)); } catch {}
    if (v) {
      // Kill all looping sources
      for (const key of _looping.keys()) stopNoise(key, 0);
      stopAmbientWeb();
    }
  }

  async toggleMute(): Promise<boolean> {
    await this.setMuted(!this.muted);
    return this.muted;
  }

  // ── Web sound effects ─────────────────────────────────────────────────────

  private web(fn: () => void): void {
    if (this.muted || Platform.OS !== 'web') return;
    resumeCtx().then(fn);
  }

  // ── Convenience methods (work on web immediately) ─────────────────────────

  buttonTap()   { this.web(() => tone(1200, 40,  'square', 0.12)); }
  chipPlace()   { this.web(() => tone(880,  80,  'square', 0.15)); }
  chipClear()   { this.web(() => tone(440,  100, 'square', 0.1)); }
  ballLand()    { this.web(() => tone(800,  60,  'sawtooth', 0.3)); }

  win()  {
    this.web(() => {
      // Ascending C-E-G-C chime
      chord([523.25, 659.25, 783.99, 1046.5], 400, 'sine', 0.2, 90);
    });
  }

  lose() {
    this.web(() => {
      // Descending G-E-C
      chord([783.99, 659.25, 523.25], 350, 'sine', 0.15, 100);
    });
  }

  coins() {
    this.web(() => {
      // Rapid high ticks
      for (let i = 0; i < 5; i++) tone(1400 + i * 80, 50, 'square', 0.12, i * 60);
    });
  }

  cardDeal()  { this.web(() => tone(600, 60,  'sawtooth', 0.1)); }
  cardFlip()  { this.web(() => tone(900, 80,  'sawtooth', 0.12)); }
  bust()      {
    this.web(() => {
      tone(220, 400, 'sawtooth', 0.25);
      tone(180, 600, 'sawtooth', 0.2, 150);
    });
  }

  blackjackFanfare() {
    this.web(() => chord([523.25, 659.25, 783.99, 1046.5, 1318.5], 600, 'sine', 0.2, 80));
  }

  // ── Looping ───────────────────────────────────────────────────────────────

  wheelSpinStart() {
    if (this.muted || Platform.OS !== 'web') return;
    resumeCtx().then(() => {
      startNoise('wheel_spin', 0.15);
      startNoise('ball_rattle', 0.08);
    });
  }

  wheelSpinStop() {
    stopNoise('wheel_spin', 1000);
    stopNoise('ball_rattle', 500);
  }

  ambientStart() {
    if (this.muted || Platform.OS !== 'web') return;
    resumeCtx().then(() => startAmbientWeb());
  }

  ambientStop() { stopAmbientWeb(); }

  // Aliases used by blackjack
  ballRattleStart() { /* covered by wheelSpinStart */ }
}

const audioManager = new AudioManager();
export default audioManager;
