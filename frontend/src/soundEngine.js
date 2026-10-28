/**
 * soundEngine.js — Pure Web Audio API Sound Synthesizer for BINGO BATTLE
 *
 * 100% Zero-dependency, offline-reliable audio engine.
 * No external .mp3 or network assets required.
 */

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.listeners = new Set();

    // Restore mute state from localStorage if available
    try {
      const saved = localStorage.getItem('bingo_audio_muted');
      if (saved !== null) {
        this.muted = saved === 'true';
      }
    } catch {
      // Local storage unavailable (private browsing/iframe)
    }
  }

  /**
   * Lazy initialization to satisfy browser autoplay policy
   */
  init() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  isMuted() {
    return this.muted;
  }

  setMuted(muted) {
    this.muted = !!muted;
    try {
      localStorage.setItem('bingo_audio_muted', String(this.muted));
    } catch {}
    this.notify();
  }

  toggleMute() {
    this.setMuted(!this.muted);
    return this.muted;
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify() {
    for (const fn of this.listeners) {
      fn(this.muted);
    }
  }

  // ─── 1. Pencil Scratch / Cut Sound ──────────────────────────────────────────
  /**
   * Crisp short-decay frequency ramp oscillator + filtered noise burst
   * simulating a physical pencil strike or blade slash through paper.
   */
  playCutSound() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;

    try {
      // Tonal frequency ramp (downward sweep)
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(850, now);
      osc.frequency.exponentialRampToValueAtTime(140, now + 0.08);

      gain.gain.setValueAtTime(0.28, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.085);

      // Noise friction component (crisp pencil scratch grit)
      const bufferSize = Math.floor(this.ctx.sampleRate * 0.06);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(2800, now);
      filter.Q.setValueAtTime(3.0, now);

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.2, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);

      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(this.ctx.destination);

      noise.start(now);
      noise.stop(now + 0.065);
    } catch {}
  }

  // ─── 2. Line Completed Chime ────────────────────────────────────────────────
  /**
   * Upbeat 4-note ascending chord chime (C5, E5, G5, C6)
   * with sparkling overtone decay when a row, column, or diagonal line is completed.
   */
  playLineCompleteSound() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const notes = [
      { freq: 523.25, timeOffset: 0.000 }, // C5
      { freq: 659.25, timeOffset: 0.085 }, // E5
      { freq: 783.99, timeOffset: 0.170 }, // G5
      { freq: 1046.50, timeOffset: 0.255 }, // C6
    ];

    notes.forEach(({ freq, timeOffset }) => {
      const t = now + timeOffset;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);

      // Sparkling overtone with triangle
      const overtone = this.ctx.createOscillator();
      const overtoneGain = this.ctx.createGain();
      overtone.type = 'triangle';
      overtone.frequency.setValueAtTime(freq * 2, t);

      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.linearRampToValueAtTime(0.22, t + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.38);

      overtoneGain.gain.setValueAtTime(0.0001, t);
      overtoneGain.gain.linearRampToValueAtTime(0.08, t + 0.015);
      overtoneGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      overtone.connect(overtoneGain);
      overtoneGain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + 0.4);
      overtone.start(t);
      overtone.stop(t + 0.3);
    });
  }

  // ─── 3. Victory Horn / Fanfare ──────────────────────────────────────────────
  /**
   * Full-bodied celebratory brass fanfare chime sequence when BINGO is claimed and verified.
   */
  playVictorySound() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;

    // Fast melodic fanfare lead-in: G4 -> C5 -> E5 -> G5
    const fanfare = [
      { freq: 392.00, start: 0.00, dur: 0.14 }, // G4
      { freq: 523.25, start: 0.12, dur: 0.14 }, // C5
      { freq: 659.25, start: 0.24, dur: 0.14 }, // E5
      { freq: 783.99, start: 0.36, dur: 0.25 }, // G5
    ];

    fanfare.forEach(({ freq, start, dur }) => {
      const t = now + start;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.linearRampToValueAtTime(0.26, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + dur + 0.02);
    });

    // Grand triumphal major chord at 0.52s: C5, E5, G5, C6 (with brassy filtered sawtooth warmth)
    const chordTime = now + 0.52;
    const chordNotes = [523.25, 659.25, 783.99, 1046.50];

    chordNotes.forEach((freq) => {
      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, chordTime);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(2200, chordTime);
      filter.frequency.exponentialRampToValueAtTime(800, chordTime + 0.9);

      gain.gain.setValueAtTime(0.0001, chordTime);
      gain.gain.linearRampToValueAtTime(0.14, chordTime + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, chordTime + 1.1);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(chordTime);
      osc.stop(chordTime + 1.15);
    });
  }

  // ─── 4. False Call Warning Buzzer ───────────────────────────────────────────
  /**
   * Low dual-frequency dissonant buzzer (130Hz + 138.5Hz sawtooth)
   * when a player clicks BINGO prematurely without enough lines.
   */
  playFalseCallBuzzer() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const freqs = [130, 138.5]; // Low beating dissonance

    freqs.forEach((freq) => {
      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1400, now);

      // Two sharp warning pulses: 0 -> 0.16s, then 0.22s -> 0.44s
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(0.25, now + 0.015);
      gain.gain.setValueAtTime(0.25, now + 0.14);
      gain.gain.setValueAtTime(0.0001, now + 0.16);

      gain.gain.setValueAtTime(0.0001, now + 0.21);
      gain.gain.linearRampToValueAtTime(0.25, now + 0.23);
      gain.gain.setValueAtTime(0.25, now + 0.38);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.46);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.48);
    });
  }

  // ─── 5. Tactile 3D Button Click Pop ─────────────────────────────────────────
  /**
   * Subtle high-satisfaction physical micro-click when 3D arcade buttons are pressed.
   */
  playButtonClickSound() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.exponentialRampToValueAtTime(90, now + 0.04);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.04);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.045);
  }
}

export const soundEngine = new SoundEngine();
export default soundEngine;
