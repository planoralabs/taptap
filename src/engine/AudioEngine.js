/**
 * @fileoverview AudioEngine — Web Audio API wrapper with precise sync.
 *
 * Features:
 * - Loads audio via fetch → AudioContext.decodeAudioData
 * - currentTime synced to AudioContext clock (not performance.now)
 * - Configurable global offset for latency correction
 * - Procedural demo audio generation (no MP3 needed for testing)
 * - Preview mode (15s loop)
 */

import { EventEmitter, GameEvents } from '../utils/events.js';
import { AUDIO_LATENCY_OFFSET } from '../utils/constants.js';

export class AudioEngine extends EventEmitter {
  constructor() {
    super();

    /** @type {AudioContext | null} */
    this._ctx = null;

    /** @type {AudioBufferSourceNode | null} */
    this._source = null;

    /** @type {AudioBuffer | null} */
    this._buffer = null;

    this._startAt    = 0;  // AudioContext time when playback started
    this._startOffset = 0; // Offset into buffer (for resume)
    this._playing    = false;
    this._duration   = 0;  // ms

    /** User-adjustable offset correction (ms) */
    this.latencyOffset = AUDIO_LATENCY_OFFSET;

    /** Gain node for volume */
    this._gainNode = null;
    this._volume = 1.0;
  }

  // ─────────────────────────────────────────────
  // INIT
  // ─────────────────────────────────────────────

  /**
   * Must be called after a user gesture (browser autoplay policy).
   */
  _ensureContext() {
    if (!this._ctx) {
      this._ctx = new AudioContext();
      this._gainNode = this._ctx.createGain();
      this._gainNode.connect(this._ctx.destination);
      this._gainNode.gain.value = this._volume;
    }
    if (this._ctx.state === 'suspended') {
      this._ctx.resume();
    }
  }

  // ─────────────────────────────────────────────
  // LOADING
  // ─────────────────────────────────────────────

  /**
   * Load an audio file from a URL.
   * @param {string} url
   * @returns {Promise<void>}
   */
  async loadFromUrl(url) {
    this._ensureContext();
    const response = await fetch(url);
    if (!response.ok) throw new Error(`AudioEngine: Failed to load ${url} (${response.status})`);
    const arrayBuffer = await response.arrayBuffer();
    await this._decode(arrayBuffer);
  }

  /**
   * Load an audio file from an ArrayBuffer (e.g. user-dropped file).
   * @param {ArrayBuffer} arrayBuffer
   */
  async loadFromBuffer(arrayBuffer) {
    this._ensureContext();
    await this._decode(arrayBuffer);
  }

  /**
   * Generate a procedural demo track using Web Audio API synthesis.
   * Creates a simple 4/4 beat pattern (120 BPM, ~60 seconds).
   */
  async loadDemo() {
    this._ensureContext();
    const ctx = this._ctx;
    const bpm = 128;
    const beats = 64;
    const beatDuration = 60 / bpm;
    const totalDuration = beats * beatDuration;
    const sampleRate = ctx.sampleRate;
    const totalSamples = Math.ceil(totalDuration * sampleRate);

    const buffer = ctx.createBuffer(2, totalSamples, sampleRate);
    const left  = buffer.getChannelData(0);
    const right = buffer.getChannelData(1);

    const writeTone = (freq, startSec, durationSec, amplitude, decay = 0.8) => {
      const startSample = Math.round(startSec * sampleRate);
      const numSamples  = Math.round(durationSec * sampleRate);
      for (let i = 0; i < numSamples; i++) {
        const t    = i / sampleRate;
        const env  = Math.exp(-decay * t * 10);
        const wave = Math.sin(2 * Math.PI * freq * t) * env * amplitude;
        // Add slight harmonics for richness
        const h2   = Math.sin(4 * Math.PI * freq * t) * env * amplitude * 0.3;
        const h3   = Math.sin(6 * Math.PI * freq * t) * env * amplitude * 0.15;
        const sample = (wave + h2 + h3);
        if (startSample + i < totalSamples) {
          left[startSample + i]  += sample;
          right[startSample + i] += sample;
        }
      }
    };

    const writeNoise = (startSec, durationSec, amplitude) => {
      const startSample = Math.round(startSec * sampleRate);
      const numSamples  = Math.round(durationSec * sampleRate);
      for (let i = 0; i < numSamples; i++) {
        const env = Math.exp(-30 * (i / sampleRate));
        const sample = (Math.random() * 2 - 1) * env * amplitude;
        if (startSample + i < totalSamples) {
          left[startSample + i]  += sample;
          right[startSample + i] += sample;
        }
      }
    };

    // Generate beat pattern
    for (let beat = 0; beat < beats; beat++) {
      const t = beat * beatDuration;
      const bar = beat % 4;

      // Kick drum on beats 1 & 3
      if (bar === 0 || bar === 2) {
        writeTone(55, t, 0.3, 0.9, 1.2);
        writeNoise(t, 0.05, 0.5);
      }

      // Snare on beats 2 & 4
      if (bar === 1 || bar === 3) {
        writeTone(200, t, 0.15, 0.5, 2);
        writeNoise(t, 0.1, 0.7);
      }

      // Hi-hat every beat
      writeNoise(t, 0.03, 0.2);
      // Off-beat hi-hat
      writeNoise(t + beatDuration / 2, 0.02, 0.12);

      // Bass melody (simple arpeggio)
      const notes = [65.41, 73.42, 87.31, 98.00, 110.00, 130.81]; // C2 scale
      const noteIdx = Math.floor(beat / 2) % notes.length;
      writeTone(notes[noteIdx], t + 0.01, 0.4, 0.4, 0.5);

      // Lead melody every 2 beats
      if (beat % 2 === 0) {
        const melodyNotes = [261.63, 293.66, 329.63, 349.23, 392.00, 440.00]; // C4 scale
        const mIdx = (beat / 2) % melodyNotes.length;
        writeTone(melodyNotes[mIdx], t + 0.02, 0.45, 0.3, 0.6);
      }
    }

    // Normalize to prevent clipping
    let maxAmp = 0;
    for (let i = 0; i < totalSamples; i++) {
      maxAmp = Math.max(maxAmp, Math.abs(left[i]), Math.abs(right[i]));
    }
    if (maxAmp > 0.95) {
      const factor = 0.95 / maxAmp;
      for (let i = 0; i < totalSamples; i++) {
        left[i]  *= factor;
        right[i] *= factor;
      }
    }

    this._buffer   = buffer;
    this._duration = totalDuration * 1000;
    this.emit(GameEvents.AUDIO_READY, { duration: this._duration });
  }

  async _decode(arrayBuffer) {
    this._buffer = await this._ctx.decodeAudioData(arrayBuffer);
    this._duration = this._buffer.duration * 1000;
    this.emit(GameEvents.AUDIO_READY, { duration: this._duration });
  }

  // ─────────────────────────────────────────────
  // PLAYBACK
  // ─────────────────────────────────────────────

  play(offsetMs = 0) {
    if (!this._buffer || !this._ctx) return;
    this._ensureContext();
    this._stopSource();

    const offsetSec = Math.max(0, offsetMs / 1000);
    this._source = this._ctx.createBufferSource();
    this._source.buffer = this._buffer;
    this._source.connect(this._gainNode);
    this._source.onended = () => {
      if (this._playing) {
        this._playing = false;
        this.emit(GameEvents.AUDIO_END);
      }
    };

    this._startAt     = this._ctx.currentTime;
    this._startOffset = offsetSec;
    this._source.start(0, offsetSec);
    this._playing = true;
    this.emit(GameEvents.AUDIO_PLAY);
  }

  pause() {
    if (!this._playing) return;
    this._startOffset = this._getCurrentSec();
    this._stopSource();
    this._playing = false;
    this.emit(GameEvents.AUDIO_PAUSE);
  }

  resume() {
    if (this._playing) return;
    this.play(this._startOffset * 1000);
  }

  stop() {
    this._stopSource();
    this._startOffset = 0;
    this._playing = false;
  }

  _stopSource() {
    if (this._source) {
      try { this._source.stop(); } catch (_) { /* already stopped */ }
      this._source.disconnect();
      this._source = null;
    }
  }

  // ─────────────────────────────────────────────
  // TIME
  // ─────────────────────────────────────────────

  _getCurrentSec() {
    if (!this._ctx || !this._playing) return this._startOffset;
    return this._ctx.currentTime - this._startAt + this._startOffset;
  }

  /**
   * Current playback position in milliseconds.
   * This is what the Timeline uses for synchronization.
   * @returns {number}
   */
  getCurrentTime() {
    return this._getCurrentSec() * 1000 + this.latencyOffset;
  }

  /** @returns {number} Total duration in ms */
  get duration() { return this._duration; }

  /** @returns {boolean} */
  get isPlaying() { return this._playing; }

  /** @returns {boolean} Buffer is loaded */
  get isLoaded() { return this._buffer !== null; }

  // ─────────────────────────────────────────────
  // VOLUME
  // ─────────────────────────────────────────────

  /** @param {number} v - 0 to 1 */
  setVolume(v) {
    this._volume = Math.max(0, Math.min(1, v));
    if (this._gainNode) {
      this._gainNode.gain.setTargetAtTime(this._volume, this._ctx.currentTime, 0.01);
    }
  }

  get volume() { return this._volume; }

  // ─────────────────────────────────────────────
  // HIT SOUNDS (sfx)
  // ─────────────────────────────────────────────

  /**
   * Play a short procedural hit sound.
   * @param {'normal'|'whistle'|'finish'|'clap'} type
   */
  playHitSound(type = 'normal') {
    if (!this._ctx) return;
    this._ensureContext();

    const ctx = this._ctx;
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.connect(env);
    env.connect(ctx.destination);

    const configs = {
      normal:  { freq: 880, type: 'sine',     duration: 0.06, gain: 0.4 },
      whistle: { freq: 1200, type: 'triangle',duration: 0.12, gain: 0.3 },
      finish:  { freq: 660, type: 'sine',      duration: 0.18, gain: 0.5 },
      clap:    { freq: 400, type: 'square',    duration: 0.08, gain: 0.25 },
    };

    const cfg = configs[type] ?? configs.normal;
    osc.type = cfg.type;
    osc.frequency.setValueAtTime(cfg.freq, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(cfg.freq * 0.5, ctx.currentTime + cfg.duration);
    env.gain.setValueAtTime(cfg.gain, ctx.currentTime);
    env.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + cfg.duration);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + cfg.duration);
  }
}
