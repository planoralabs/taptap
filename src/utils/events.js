/**
 * @fileoverview EventEmitter — lightweight pub/sub for game events
 * Used throughout the engine for decoupled communication.
 */
export class EventEmitter {
  constructor() {
    /** @type {Map<string, Set<Function>>} */
    this._listeners = new Map();
  }

  /**
   * Subscribe to an event.
   * @param {string} event
   * @param {Function} fn
   * @returns {() => void} Unsubscribe function
   */
  on(event, fn) {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, new Set());
    }
    this._listeners.get(event).add(fn);
    return () => this.off(event, fn);
  }

  /**
   * Subscribe, auto-unsubscribe after first call.
   * @param {string} event @param {Function} fn
   */
  once(event, fn) {
    const wrapper = (...args) => {
      fn(...args);
      this.off(event, wrapper);
    };
    return this.on(event, wrapper);
  }

  /**
   * Unsubscribe from an event.
   * @param {string} event @param {Function} fn
   */
  off(event, fn) {
    this._listeners.get(event)?.delete(fn);
  }

  /**
   * Emit an event with optional payload.
   * @param {string} event @param {...any} args
   */
  emit(event, ...args) {
    this._listeners.get(event)?.forEach((fn) => {
      try { fn(...args); }
      catch (e) { console.error(`[EventEmitter] Error in "${event}" handler:`, e); }
    });
  }

  /**
   * Remove all listeners (useful for cleanup).
   * @param {string} [event] — if omitted, clears all events
   */
  removeAll(event) {
    if (event) {
      this._listeners.delete(event);
    } else {
      this._listeners.clear();
    }
  }
}

// ─────────────────────────────────────────────
// Well-known game events (type safety via JSDoc)
// ─────────────────────────────────────────────
export const GameEvents = Object.freeze({
  // Engine lifecycle
  STATE_CHANGE:       'state:change',       // { from, to }
  FRAME:              'engine:frame',       // { time, delta }

  // Audio
  AUDIO_READY:        'audio:ready',
  AUDIO_PLAY:         'audio:play',
  AUDIO_PAUSE:        'audio:pause',
  AUDIO_END:          'audio:end',

  // Input
  INPUT_DOWN:         'input:down',         // { x, y, time, id }
  INPUT_UP:           'input:up',           // { x, y, time, id }
  INPUT_MOVE:         'input:move',         // { x, y, time, id }

  // Gameplay
  HIT_CIRCLE_SPAWN:   'game:circle:spawn',  // { object }
  HIT_RESULT:         'game:hit',           // { score, label, combo, x, y }
  MISS:               'game:miss',          // { object }
  COMBO_BREAK:        'game:combo:break',
  HEALTH_CHANGE:      'game:health',        // { value, delta }
  GAME_OVER:          'game:over',
  GAME_COMPLETE:      'game:complete',      // { score, accuracy, grade }

  // UI
  SCREEN_CHANGE:      'ui:screen',          // { screen }
  LOADING_PROGRESS:   'ui:loading',         // { progress 0–1, message }
});
