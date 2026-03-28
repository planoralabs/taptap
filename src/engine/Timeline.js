/**
 * @fileoverview Timeline — schedules and retrieves active hit objects by time.
 *
 * The Timeline holds all hit objects for a beatmap sorted by their hit time.
 * Each frame, `getActiveObjects(currentTime)` returns all objects
 * that should be visible (approaching) or still alive.
 */

import { AR_TO_MS } from '../utils/constants.js';

/**
 * @typedef {import('../game/HitCircle.js').HitCircle
 *         | import('../game/Slider.js').Slider
 *         | import('../game/Spinner.js').Spinner} HitObject
 */

export class Timeline {
  constructor() {
    /** @type {HitObject[]} All objects, sorted by time */
    this._objects = [];

    /** Approach Rate (0–10) — affects how early objects appear */
    this.ar = 5;

    /** Cached preempt time in ms */
    this._preempt = AR_TO_MS(5);

    /** Index pointer — optimization to avoid scanning from 0 each frame */
    this._headIndex = 0;
  }

  // ─────────────────────────────────────────────
  // SETUP
  // ─────────────────────────────────────────────

  /**
   * Load all hit objects for a beatmap.
   * @param {HitObject[]} objects - Must be sorted by time
   * @param {number} ar - Approach Rate from beatmap difficulty
   */
  load(objects, ar = 5) {
    this._objects = [...objects].sort((a, b) => a.time - b.time);
    this.ar = ar;
    this._preempt = AR_TO_MS(ar);
    this._headIndex = 0;
  }

  /** Reset to beginning (replay / restart) */
  reset() {
    this._headIndex = 0;
    this._objects.forEach((o) => o.reset?.());
  }

  /** Clear all objects */
  clear() {
    this._objects = [];
    this._headIndex = 0;
  }

  // ─────────────────────────────────────────────
  // QUERY
  // ─────────────────────────────────────────────

  /**
   * Returns all hit objects that are currently visible or interactive.
   * An object is visible if: `hitTime - preempt <= currentTime <= hitTime + missWindow`
   *
   * @param {number} currentTimeMs - Current audio playback time in ms
   * @returns {HitObject[]}
   */
  getActiveObjects(currentTimeMs) {
    const preempt = this._preempt;
    const active  = [];

    for (const obj of this._objects) {
      const startVisible = obj.time - preempt;
      const endVisible   = obj.endTime ?? (obj.time + 400); // miss window

      if (currentTimeMs < startVisible)       break;  // Not yet — objects are sorted
      if (currentTimeMs > endVisible)         continue; // Expired
      if (obj.state === 'done')               continue; // Already resolved

      active.push(obj);
    }

    return active;
  }

  /**
   * Get the next object that hasn't been hit yet.
   * Useful for cursor guide and AI.
   * @param {number} currentTimeMs
   * @returns {HitObject | null}
   */
  getNextObject(currentTimeMs) {
    for (const obj of this._objects) {
      if (obj.state !== 'done' && obj.time >= currentTimeMs) return obj;
    }
    return null;
  }

  /**
   * Check if all objects have been resolved (hit or missed).
   * @returns {boolean}
   */
  isComplete() {
    return this._objects.every((o) => o.state === 'done' || o.state === 'missed');
  }

  /**
   * Returns a summary of the timeline for debugging.
   */
  getStats() {
    const total  = this._objects.length;
    const done   = this._objects.filter((o) => o.state === 'done').length;
    const missed = this._objects.filter((o) => o.state === 'missed').length;
    return { total, done, missed, pending: total - done - missed };
  }

  get totalObjects() { return this._objects.length; }
  get preemptMs()    { return this._preempt; }
  get objects()      { return this._objects; }
}
