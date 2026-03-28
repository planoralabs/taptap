/**
 * @fileoverview InputManager — normalizes mouse/touch into game coordinates.
 *
 * ALL coordinates emitted are in osu! game space (0-512, 0-384)
 * so the rest of the engine never needs to think about pixels.
 */

import { EventEmitter, GameEvents } from '../utils/events.js';

export class InputManager extends EventEmitter {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {import('./Renderer.js').Renderer} renderer
   */
  constructor(canvas, renderer) {
    super();
    this.canvas   = canvas;
    this.renderer = renderer;
    this.enabled  = true;

    /** @type {Map<number, { x: number, y: number }>} Active touch points in game coords */
    this.activeTouches = new Map();

    this._bindEvents();
  }

  // ─────────────────────────────────────────────
  // SETUP
  // ─────────────────────────────────────────────

  _bindEvents() {
    // Mouse
    this.canvas.addEventListener('mousedown',  this._onMouseDown.bind(this),  { passive: false });
    this.canvas.addEventListener('mouseup',    this._onMouseUp.bind(this),    { passive: false });
    this.canvas.addEventListener('mousemove',  this._onMouseMove.bind(this),  { passive: false });

    // Touch (multi-touch support up to 10 fingers)
    this.canvas.addEventListener('touchstart', this._onTouchStart.bind(this), { passive: false });
    this.canvas.addEventListener('touchend',   this._onTouchEnd.bind(this),   { passive: false });
    this.canvas.addEventListener('touchmove',  this._onTouchMove.bind(this),  { passive: false });
    this.canvas.addEventListener('touchcancel',this._onTouchEnd.bind(this),   { passive: false });

    // Keyboard (for desktop play — Z, X keys like osu!)
    window.addEventListener('keydown', this._onKeyDown.bind(this));
    window.addEventListener('keyup',   this._onKeyUp.bind(this));
  }

  // ─────────────────────────────────────────────
  // MOUSE HANDLERS
  // ─────────────────────────────────────────────

  _onMouseDown(e) {
    e.preventDefault();
    if (!this.enabled) return;
    const { x, y } = this._mouseToGame(e);
    this.emit(GameEvents.INPUT_DOWN, { x, y, time: performance.now(), id: 'mouse' });
  }

  _onMouseUp(e) {
    e.preventDefault();
    if (!this.enabled) return;
    const { x, y } = this._mouseToGame(e);
    this.emit(GameEvents.INPUT_UP, { x, y, time: performance.now(), id: 'mouse' });
  }

  _onMouseMove(e) {
    if (!this.enabled) return;
    const { x, y } = this._mouseToGame(e);
    this.emit(GameEvents.INPUT_MOVE, { x, y, time: performance.now(), id: 'mouse' });
  }

  // ─────────────────────────────────────────────
  // TOUCH HANDLERS
  // ─────────────────────────────────────────────

  _onTouchStart(e) {
    e.preventDefault();
    if (!this.enabled) return;
    for (const touch of e.changedTouches) {
      const { x, y } = this._touchToGame(touch);
      this.activeTouches.set(touch.identifier, { x, y });
      this.emit(GameEvents.INPUT_DOWN, { x, y, time: performance.now(), id: touch.identifier });
    }
  }

  _onTouchEnd(e) {
    e.preventDefault();
    if (!this.enabled) return;
    for (const touch of e.changedTouches) {
      const { x, y } = this._touchToGame(touch);
      this.activeTouches.delete(touch.identifier);
      this.emit(GameEvents.INPUT_UP, { x, y, time: performance.now(), id: touch.identifier });
    }
  }

  _onTouchMove(e) {
    e.preventDefault();
    if (!this.enabled) return;
    for (const touch of e.changedTouches) {
      const { x, y } = this._touchToGame(touch);
      this.activeTouches.set(touch.identifier, { x, y });
      this.emit(GameEvents.INPUT_MOVE, { x, y, time: performance.now(), id: touch.identifier });
    }
  }

  // ─────────────────────────────────────────────
  // KEYBOARD
  // ─────────────────────────────────────────────

  _onKeyDown(e) {
    if (!this.enabled) return;
    
    const keyMap = {
       'q': 1, '1': 1,
       'w': 2, '2': 2,
       'e': 3, '3': 3,
       'r': 4, '4': 4,
       't': 5, '5': 5
    };
    
    const k = e.key.toLowerCase();
    if (keyMap[k]) {
       this.emit('input:mapped_key', { number: keyMap[k], time: performance.now() });
    }

    // osu! keys: Z and X — emit as synthetic center hit
    if (e.key === 'z' || e.key === 'Z' || e.key === 'x' || e.key === 'X') {
      this.emit(GameEvents.INPUT_DOWN, { x: 256, y: 192, time: performance.now(), id: `key_${e.key}`, isKey: true });
    }
    this.emit('key:down', { key: e.key, code: e.code });
  }

  _onKeyUp(e) {
    if (!this.enabled) return;
    if (e.key === 'z' || e.key === 'Z' || e.key === 'x' || e.key === 'X') {
      this.emit(GameEvents.INPUT_UP, { x: 256, y: 192, time: performance.now(), id: `key_${e.key}`, isKey: true });
    }
    this.emit('key:up', { key: e.key, code: e.code });
  }

  // ─────────────────────────────────────────────
  // COORDINATE CONVERSION
  // ─────────────────────────────────────────────

  _mouseToGame(e) {
    const rect = this.canvas.getBoundingClientRect();
    const vx = e.clientX - rect.left;
    const vy = e.clientY - rect.top;
    return this.renderer.viewportToGame(vx, vy);
  }

  _touchToGame(touch) {
    const rect = this.canvas.getBoundingClientRect();
    const vx = touch.clientX - rect.left;
    const vy = touch.clientY - rect.top;
    return this.renderer.viewportToGame(vx, vy);
  }

  // ─────────────────────────────────────────────
  // CONTROL
  // ─────────────────────────────────────────────

  enable()  { this.enabled = true; }
  disable() { this.enabled = false; }

  destroy() {
    this.removeAll();
  }
}
