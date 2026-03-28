/**
 * @fileoverview Time utilities for TapTap
 * High-precision timing helpers using performance.now()
 */

/**
 * Returns current high-resolution time in milliseconds.
 * Preferred over Date.now() for audio sync.
 * @returns {number}
 */
export const now = () => performance.now();

/**
 * Format milliseconds as MM:SS.mmm
 * @param {number} ms
 * @returns {string}
 */
export const formatTime = (ms) => {
  if (isNaN(ms) || ms < 0) return '0:00.000';
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const millis  = Math.floor(ms % 1000);
  return `${minutes}:${String(seconds).padStart(2, '0')}.${String(millis).padStart(3, '0')}`;
};

/**
 * Format milliseconds as MM:SS (no millis, for display)
 * @param {number} ms
 * @returns {string}
 */
export const formatTimeShort = (ms) => {
  if (isNaN(ms) || ms < 0) return '0:00';
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
};

/**
 * BPM → ms per beat
 * @param {number} bpm
 * @returns {number}
 */
export const bpmToMs = (bpm) => 60000 / bpm;

/**
 * ms per beat → BPM
 * @param {number} ms
 * @returns {number}
 */
export const msToBpm = (ms) => 60000 / ms;

/**
 * Create a simple Stopwatch
 */
export class Stopwatch {
  constructor() {
    this._start = 0;
    this._elapsed = 0;
    this._running = false;
  }

  start() {
    if (!this._running) {
      this._start = now() - this._elapsed;
      this._running = true;
    }
    return this;
  }

  pause() {
    if (this._running) {
      this._elapsed = now() - this._start;
      this._running = false;
    }
    return this;
  }

  reset() {
    this._elapsed = 0;
    this._running = false;
    return this;
  }

  restart() {
    this._elapsed = 0;
    this._start = now();
    this._running = true;
    return this;
  }

  /** @returns {number} elapsed ms */
  get elapsed() {
    return this._running ? now() - this._start : this._elapsed;
  }

  get running() { return this._running; }
}
