/**
 * Casino audio manager — expo-av backed.
 *
 * Place sound files in assets/sounds/ with these names:
 *   wheel_spin.mp3   ball_rattle.mp3   ball_land.mp3
 *   chip_place.mp3   chip_clear.mp3    win.mp3
 *   lose.mp3         blackjack.mp3     card_deal.mp3
 *   card_flip.mp3    bust.mp3          coins.mp3
 *   ambient.mp3      button_tap.mp3
 *
 * If a file is missing the call silently no-ops (no crash).
 */

import { Audio, type AVPlaybackStatus } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';

const MUTE_KEY = '@casino/muted';

// ---------------------------------------------------------------------------
// Sound catalogue
// ---------------------------------------------------------------------------

export type SoundKey =
  | 'wheel_spin'
  | 'ball_rattle'
  | 'ball_land'
  | 'chip_place'
  | 'chip_clear'
  | 'win'
  | 'lose'
  | 'blackjack_fanfare'
  | 'card_deal'
  | 'card_flip'
  | 'bust'
  | 'coins'
  | 'ambient'
  | 'button_tap';

// Map sound keys to require() paths.  The requires live here so Metro
// can statically analyse them.  Missing files are caught at load time
// and silently skipped — the game continues without audio.
const SOUND_MODULES: Partial<Record<SoundKey, number>> = {
  // Populate once real files land in assets/sounds/:
  // wheel_spin:       require('../../assets/sounds/wheel_spin.mp3'),
  // ball_rattle:      require('../../assets/sounds/ball_rattle.mp3'),
  // ball_land:        require('../../assets/sounds/ball_land.mp3'),
  // chip_place:       require('../../assets/sounds/chip_place.mp3'),
  // chip_clear:       require('../../assets/sounds/chip_clear.mp3'),
  // win:              require('../../assets/sounds/win.mp3'),
  // lose:             require('../../assets/sounds/lose.mp3'),
  // blackjack_fanfare:require('../../assets/sounds/blackjack.mp3'),
  // card_deal:        require('../../assets/sounds/card_deal.mp3'),
  // card_flip:        require('../../assets/sounds/card_flip.mp3'),
  // bust:             require('../../assets/sounds/bust.mp3'),
  // coins:            require('../../assets/sounds/coins.mp3'),
  // ambient:          require('../../assets/sounds/ambient.mp3'),
  // button_tap:       require('../../assets/sounds/button_tap.mp3'),
};

// ---------------------------------------------------------------------------
// Manager
// ---------------------------------------------------------------------------

class AudioManager {
  private sounds: Map<SoundKey, Audio.Sound> = new Map();
  private looping: Map<SoundKey, Audio.Sound> = new Map();
  private muted = false;
  private initialized = false;

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  async init(): Promise<void> {
    if (this.initialized) return;
    this.initialized = true;

    try {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: false,
        staysActiveInBackground: false,
      });
      const stored = await AsyncStorage.getItem(MUTE_KEY);
      this.muted = stored === 'true';
    } catch {
      // Permissions or storage unavailable — continue silently
    }

    await this.preloadAll();
  }

  private async preloadAll(): Promise<void> {
    const entries = Object.entries(SOUND_MODULES) as [SoundKey, number][];
    await Promise.allSettled(
      entries.map(async ([key, module]) => {
        try {
          const { sound } = await Audio.Sound.createAsync(module, { shouldPlay: false });
          this.sounds.set(key, sound);
        } catch {
          // File missing or platform error — skip
        }
      }),
    );
  }

  async unloadAll(): Promise<void> {
    await Promise.allSettled([
      ...[...this.sounds.values()].map((s) => s.unloadAsync()),
      ...[...this.looping.values()].map((s) => s.unloadAsync()),
    ]);
    this.sounds.clear();
    this.looping.clear();
  }

  // ── Mute ─────────────────────────────────────────────────────────────────

  isMuted(): boolean {
    return this.muted;
  }

  async setMuted(muted: boolean): Promise<void> {
    this.muted = muted;
    try {
      await AsyncStorage.setItem(MUTE_KEY, String(muted));
    } catch {}
    if (muted) await this.stopAllLooping();
  }

  async toggleMute(): Promise<boolean> {
    await this.setMuted(!this.muted);
    return this.muted;
  }

  // ── One-shot playback ────────────────────────────────────────────────────

  async play(key: SoundKey, volume = 1.0): Promise<void> {
    if (this.muted) return;
    const sound = this.sounds.get(key);
    if (!sound) return;
    try {
      await sound.setVolumeAsync(volume);
      await sound.setPositionAsync(0);
      await sound.playAsync();
    } catch {}
  }

  // ── Looping ──────────────────────────────────────────────────────────────

  async startLooping(key: SoundKey, volume = 0.5): Promise<void> {
    if (this.muted) return;
    if (this.looping.has(key)) return; // already looping
    const source = this.sounds.get(key);
    if (!source) return;
    try {
      // Clone so we can loop independently
      const module = SOUND_MODULES[key]!;
      const { sound } = await Audio.Sound.createAsync(module, {
        shouldPlay: true,
        isLooping: true,
        volume,
      });
      this.looping.set(key, sound);
    } catch {}
  }

  async stopLooping(key: SoundKey, fadeDuration = 800): Promise<void> {
    const sound = this.looping.get(key);
    if (!sound) return;
    this.looping.delete(key);
    try {
      // Fade out
      const steps = 10;
      const stepMs = fadeDuration / steps;
      for (let i = steps - 1; i >= 0; i--) {
        await new Promise<void>((r) => setTimeout(r, stepMs));
        try { await sound.setVolumeAsync(i / steps); } catch {}
      }
      await sound.stopAsync();
      await sound.unloadAsync();
    } catch {}
  }

  async stopAllLooping(): Promise<void> {
    const keys = [...this.looping.keys()];
    await Promise.allSettled(keys.map((k) => this.stopLooping(k, 0)));
  }

  // ── Convenience methods ───────────────────────────────────────────────────

  chipPlace()      { this.play('chip_place', 0.7); }
  chipClear()      { this.play('chip_clear', 0.7); }
  buttonTap()      { this.play('button_tap', 0.5); }
  ballLand()       { this.play('ball_land', 1.0); }
  win()            { this.play('win', 1.0); }
  lose()           { this.play('lose', 0.8); }
  coins()          { this.play('coins', 0.9); }
  cardDeal()       { this.play('card_deal', 0.8); }
  cardFlip()       { this.play('card_flip', 0.8); }
  bust()           { this.play('bust', 1.0); }
  blackjackFanfare() { this.play('blackjack_fanfare', 1.0); }

  wheelSpinStart() { this.startLooping('wheel_spin', 0.6); }
  ballRattleStart(){ this.startLooping('ball_rattle', 0.8); }
  wheelSpinStop()  {
    this.stopLooping('wheel_spin', 1000);
    this.stopLooping('ball_rattle', 600);
  }

  ambientStart()   { this.startLooping('ambient', 0.3); }
  ambientStop()    { this.stopLooping('ambient', 1500); }
}

// Singleton
const audioManager = new AudioManager();
export default audioManager;
