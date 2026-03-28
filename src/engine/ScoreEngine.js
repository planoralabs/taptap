/**
 * @fileoverview ScoreEngine — osu!-compatible scoring system.
 *
 * Scoring formula reference: osu! standard (simplified)
 * Score = Σ [hit_value × (1 + combo/25 × difficulty_multiplier)]
 * Accuracy = (300*n300 + 100*n100 + 50*n50) / (300 * total) × 100%
 */

import { EventEmitter, GameEvents } from '../utils/events.js';
import {
  HitScore, HitLabel, HitWindows, GradeThreshold, Defaults
} from '../utils/constants.js';

export class ScoreEngine extends EventEmitter {
  constructor() {
    super();
    this.reset();
  }

  // ─────────────────────────────────────────────
  // STATE
  // ─────────────────────────────────────────────

  reset() {
    this.score       = 0;
    this.combo       = 0;
    this.maxCombo    = 0;
    this.health      = 1.0; // 0.0 to 1.0

    this.n300 = 0;
    this.n100 = 0;
    this.n50  = 0;
    this.nMiss = 0;

    this.totalObjects = 0;
    this._difficultyMultiplier = 1;
  }

  // ─────────────────────────────────────────────
  // CONFIGURATION
  // ─────────────────────────────────────────────

  /**
   * Configure based on beatmap difficulty settings.
   * @param {{ od?: number, hp?: number, totalObjects?: number }} opts
   */
  configure({ od = Defaults.OD, hp = Defaults.HP, totalObjects = 0 } = {}) {
    this._od = od;
    this._hp = hp;
    this._difficultyMultiplier = this._calcDifficultyMultiplier(od, hp);
    this.totalObjects = totalObjects;
  }

  _calcDifficultyMultiplier(od, hp) {
    // Simplified osu! difficulty multiplier
    return Math.round((hp + od + 4) * 0.4); // 1–6 range typically
  }

  // ─────────────────────────────────────────────
  // HIT WINDOWS (adjusted by OD)
  // ─────────────────────────────────────────────

  getHitWindows() {
    const od = this._od ?? Defaults.OD;
    return {
      great: 80 - 6 * od,
      good:  140 - 8 * od,
      meh:   200 - 10 * od,
    };
  }

  // ─────────────────────────────────────────────
  // REGISTER HITS
  // ─────────────────────────────────────────────

  /**
   * Register a hit with timing error.
   * @param {number} timingError - ms difference from perfect hit (absolute value)
   * @param {number} x - game x coordinate (for effects)
   * @param {number} y - game y coordinate
   * @returns {{ label: string, score: number, combo: number, grade: string }}
   */
  registerHit(timingError, x, y) {
    const windows = this.getHitWindows();
    let hitValue, label;

    const err = Math.abs(timingError);
    if (err <= windows.great)     { hitValue = HitScore.GREAT; label = HitLabel.GREAT; this.n300++; }
    else if (err <= windows.good) { hitValue = HitScore.GOOD;  label = HitLabel.GOOD;  this.n100++; }
    else if (err <= windows.meh)  { hitValue = HitScore.MEH;   label = HitLabel.MEH;   this.n50++;  }
    else                          { return this.registerMiss(x, y); }

    this.combo++;
    if (this.combo > this.maxCombo) this.maxCombo = this.combo;

    // Score = hit_value × (1 + combo/25 × diffMult)
    const scoreGain = Math.round(hitValue * (1 + (this.combo / 25) * this._difficultyMultiplier));
    this.score += scoreGain;

    // HP gain
    const hpGain = hitValue === HitScore.GREAT ? 0.02 : hitValue === HitScore.GOOD ? 0.01 : 0.005;
    this._updateHealth(hpGain);

    const result = { label, score: scoreGain, combo: this.combo, x, y, timingError };
    this.emit(GameEvents.HIT_RESULT, result);
    return result;
  }

  /**
   * Register a miss.
   * @param {number} x @param {number} y
   */
  registerMiss(x, y) {
    this.nMiss++;
    const prevCombo = this.combo;
    this.combo = 0;

    this._updateHealth(-0.1);

    const result = { label: HitLabel.MISS, score: 0, combo: 0, prevCombo, x, y };
    this.emit(GameEvents.MISS, result);
    if (prevCombo > 0) this.emit(GameEvents.COMBO_BREAK);
    return result;
  }

  /**
   * Register a slider tick or spinner tick (partial credit).
   * @param {'tick'|'end'} type
   */
  registerSliderTick(type = 'tick') {
    const value = type === 'end' ? HitScore.GOOD : 10;
    this.combo++;
    if (this.combo > this.maxCombo) this.maxCombo = this.combo;
    this.score += value;
    this._updateHealth(0.005);
  }

  // ─────────────────────────────────────────────
  // HEALTH
  // ─────────────────────────────────────────────

  _updateHealth(delta) {
    const prev = this.health;
    this.health = Math.max(0, Math.min(1, this.health + delta));
    this.emit(GameEvents.HEALTH_CHANGE, { value: this.health, delta: this.health - prev });

    if (this.health <= 0) {
      this.emit(GameEvents.GAME_OVER);
    }
  }

  // ─────────────────────────────────────────────
  // ACCURACY & GRADE
  // ─────────────────────────────────────────────

  /**
   * Accuracy percentage (0–100).
   * @returns {number}
   */
  get accuracy() {
    const total = this.n300 + this.n100 + this.n50 + this.nMiss;
    if (total === 0) return 100;
    return ((300 * this.n300 + 100 * this.n100 + 50 * this.n50) / (300 * total)) * 100;
  }

  /**
   * Letter grade.
   * @returns {'SS'|'S'|'A'|'B'|'C'|'D'}
   */
  get grade() {
    const acc = this.accuracy;
    // SS: 100% accuracy
    if (this.nMiss === 0 && this.n50 === 0 && this.n100 === 0) return 'SS';
    // S: ≥95% and no miss
    if (acc >= GradeThreshold.S && this.nMiss === 0) return 'S';
    if (acc >= GradeThreshold.A) return 'A';
    if (acc >= GradeThreshold.B) return 'B';
    if (acc >= GradeThreshold.C) return 'C';
    return 'D';
  }

  /**
   * Full result summary (emitted at game complete).
   */
  getResults() {
    return {
      score:    this.score,
      accuracy: this.accuracy,
      grade:    this.grade,
      maxCombo: this.maxCombo,
      n300:     this.n300,
      n100:     this.n100,
      n50:      this.n50,
      nMiss:    this.nMiss,
    };
  }
}
