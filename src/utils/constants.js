/**
 * @fileoverview Global constants for TapTap game engine
 * All gameplay-critical numbers live here so they're easy to tune.
 */

// ─────────────────────────────────────────────
// GAME COORDINATE SPACE
// osu! uses 512×384; we map this to the viewport
// maintaining aspect ratio with letterboxing.
// ─────────────────────────────────────────────
export const OSU_WIDTH  = 512;
export const OSU_HEIGHT = 384;
export const OSU_ASPECT = OSU_WIDTH / OSU_HEIGHT; // ~1.333

// ─────────────────────────────────────────────
// GAME STATES
// ─────────────────────────────────────────────
export const GameState = Object.freeze({
  LOADING:      'LOADING',
  MAIN_MENU:    'MAIN_MENU',
  SONG_SELECT:  'SONG_SELECT',
  OPTIONS:      'OPTIONS',
  PLAYING:      'PLAYING',
  PAUSED:       'PAUSED',
  RESULTS:      'RESULTS',
});

// ─────────────────────────────────────────────
// HIT WINDOWS (ms) — osu! standard defaults
// These can be overridden by beatmap OD (Overall Difficulty)
// ─────────────────────────────────────────────
export const HitWindows = Object.freeze({
  GREAT: 80,  // 300 points
  GOOD:  140, // 100 points
  MEH:   200, // 50 points
  MISS:  400, // 0 points (miss cutoff)
});

// ─────────────────────────────────────────────
// SCORING
// ─────────────────────────────────────────────
export const HitScore = Object.freeze({
  GREAT: 300,
  GOOD:  100,
  MEH:   50,
  MISS:  0,
});

export const HitLabel = Object.freeze({
  GREAT: '300',
  GOOD:  '100',
  MEH:   '50',
  MISS:  'MISS',
});

// Grade thresholds (accuracy %)
export const GradeThreshold = Object.freeze({
  SS: 100,
  S:  95,
  A:  90,
  B:  80,
  C:  70,
  D:  0,
});

// ─────────────────────────────────────────────
// DIFFICULTY DEFAULTS
// ─────────────────────────────────────────────
export const Defaults = Object.freeze({
  CS: 4,   // Circle Size  (osu! standard: 0–10)
  AR: 5,   // Approach Rate
  OD: 5,   // Overall Difficulty
  HP: 5,   // HP Drain Rate
});

// Approach Rate → ms before hit time the circle appears
export const AR_TO_MS = (ar) => {
  if (ar < 5) return 1800 - 120 * ar;
  if (ar === 5) return 1200;
  return 1200 - 150 * (ar - 5);
};

// Circle Size → radius in osu! space px
export const CS_TO_RADIUS = (cs) => 54.4 - 4.48 * cs;

// ─────────────────────────────────────────────
// HIT OBJECT TYPES (bitmask, osu! standard)
// ─────────────────────────────────────────────
export const HitObjectType = Object.freeze({
  CIRCLE:     1,
  SLIDER:     2,
  NEW_COMBO:  4,
  SPINNER:    8,
  COMBO_COLOR: 112, // bits 4-6
});

// ─────────────────────────────────────────────
// SLIDER TYPES
// ─────────────────────────────────────────────
export const SliderType = Object.freeze({
  LINEAR:     'L',
  PERFECT:    'P',
  BEZIER:     'B',
  CATMULL:    'C',
});

// ─────────────────────────────────────────────
// TIMING
// ─────────────────────────────────────────────
export const TICK_RATE = 1000 / 60; // ~16.67ms per frame target

// ─────────────────────────────────────────────
// AUDIO
// ─────────────────────────────────────────────
export const AUDIO_LATENCY_OFFSET = 0; // ms, user-adjustable in options

// ─────────────────────────────────────────────
// EBA VISUAL CONSTANTS
// ─────────────────────────────────────────────
export const COMBO_COLORS = [
  '#ff6b35', // orange
  '#ff2d55', // pink-red
  '#f7c948', // yellow
  '#4cd964', // green
  '#5ac8fa', // light blue
  '#a855f7', // purple
];

// Approach circle starts at this scale multiplier and shrinks to 1.0
export const APPROACH_SCALE_START = 3.0;
