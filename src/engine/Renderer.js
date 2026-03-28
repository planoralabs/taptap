/**
 * @fileoverview Renderer — Canvas 2D wrapper with osu! → viewport coordinate mapping.
 *
 * Game coordinate space: 512×384 (osu! standard)
 * Viewport: any size, letterboxed to maintain 4:3 (osu!) or stretched to 16:9 with safe area.
 *
 * We use a "playfield" concept: the 512×384 space is centered in the viewport
 * with uniform scaling (no distortion). UI can render outside the playfield.
 */

import { OSU_WIDTH, OSU_HEIGHT } from '../utils/constants.js';

export class Renderer {
  /**
   * @param {HTMLCanvasElement} canvas
   */
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');

    // Viewport dimensions (physical pixels)
    this.viewportW = 0;
    this.viewportH = 0;

    // Playfield rect in viewport space
    this.playfield = { x: 0, y: 0, w: 0, h: 0, scale: 1 };

    // Device pixel ratio (Retina support)
    this._dpr = Math.min(window.devicePixelRatio ?? 1, 2);

    this._setupResizeObserver();
    this.resize();
  }

  // ─────────────────────────────────────────────
  // SETUP
  // ─────────────────────────────────────────────

  _setupResizeObserver() {
    const ro = new ResizeObserver(() => this.resize());
    ro.observe(this.canvas.parentElement ?? document.body);
  }

  /**
   * Recalculates canvas size and playfield mapping.
   * Called on window resize.
   */
  resize() {
    const dpr = this._dpr;
    const parent = this.canvas.parentElement ?? document.body;
    const vw = parent.clientWidth;
    const vh = parent.clientHeight;

    this.viewportW = vw;
    this.viewportH = vh;

    // Set physical canvas size (DPR-scaled)
    this.canvas.width  = Math.round(vw * dpr);
    this.canvas.height = Math.round(vh * dpr);

    // CSS size stays as viewport size
    this.canvas.style.width  = `${vw}px`;
    this.canvas.style.height = `${vh}px`;

    // Scale context by DPR
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Calculate playfield: fit 512×384 into viewport with letterboxing
    // We use a 16:9 outer container but osu! 4:3 playfield centered inside
    this._calcPlayfield(vw, vh);
  }

  _calcPlayfield(vw, vh) {
    // We want a dual screen 512 x 768 space.
    // Allow minimal padding.
    const padding = 0.95; 
    const LOGICAL_W = 512;
    const LOGICAL_H = 768; // Two 384 chunks stacked

    const scaleByH = (vh * padding) / LOGICAL_H;
    const scaleByW = (vw * padding) / LOGICAL_W;
    const scale    = Math.min(scaleByH, scaleByW);

    const pw = LOGICAL_W * scale;
    const ph = LOGICAL_H * scale;
    const px = (vw - pw) / 2;
    const py = (vh - ph) / 2;

    this.playfield = { x: px, y: py, w: pw, h: ph, scale };
  }

  // ─────────────────────────────────────────────
  // COORDINATE TRANSFORMS
  // ─────────────────────────────────────────────

  /**
   * Convert osu! game coordinates → viewport (CSS) coordinates.
   * OSU coordinates (0-384) are pushed into the BOTTOM half of the 768 height.
   */
  gameToViewport(gx, gy) {
    // Gameplay is on the bottom screen, meaning y + 384
    let virtualY = gy + 384; 
    return {
      x: this.playfield.x + gx * this.playfield.scale,
      y: this.playfield.y + virtualY * this.playfield.scale,
    };
  }

  /**
   * Convert Top Screen virtual coords -> viewport coords.
   */
  topScreenToViewport(gx, gy) {
    return {
      x: this.playfield.x + gx * this.playfield.scale,
      y: this.playfield.y + gy * this.playfield.scale,
    };
  }

  /**
   * Convert viewport (CSS) coordinates → osu! game coordinates.
   */
  viewportToGame(vx, vy) {
    // Determine raw Y in the 768-pixel tall virtual logic space
    const virtualY = (vy - this.playfield.y) / this.playfield.scale;
    // Map virtualY back to OSU coordinates (subtract 384)
    return {
      x: (vx - this.playfield.x) / this.playfield.scale,
      y: virtualY - 384,
      rawY: virtualY
    };
  }

  /** Convert CSS pixels to osu! coordinates */
  canvasToOsu(clientX, clientY) {
    return this.viewportToGame(clientX, clientY);
  }

  scaleRadius(r) {
    return r * this.playfield.scale;
  }

  // ─────────────────────────────────────────────
  // DRAWING HELPERS
  // ─────────────────────────────────────────────

  /** Clear entire canvas */
  clear() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.viewportW, this.viewportH);
  }

  /**
   * Fill entire viewport with a color or gradient.
   * @param {string | CanvasGradient} fill
   */
  fillViewport(fill) {
    this.ctx.save();
    this.ctx.fillStyle = fill;
    this.ctx.fillRect(0, 0, this.viewportW, this.viewportH);
    this.ctx.restore();
  }

  /**
   * Draw a circle in game coordinates.
   * @param {number} gx @param {number} gy @param {number} gr - game radius
   * @param {object} opts
   */
  drawCircle(gx, gy, gr, { fill, stroke, strokeWidth = 2, alpha = 1 } = {}) {
    const { x, y } = this.gameToViewport(gx, gy);
    const r = this.scaleRadius(gr);
    const ctx = this.ctx;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    if (fill)   { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = strokeWidth; ctx.stroke(); }
    ctx.restore();
  }

  /**
   * Draw text in game coordinates, centered.
   * @param {string} text @param {number} gx @param {number} gy @param {object} opts
   */
  drawText(text, gx, gy, { font = '20px Bangers', fill = '#fff', align = 'center', baseline = 'middle', alpha = 1 } = {}) {
    const { x, y } = this.gameToViewport(gx, gy);
    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = font;
    ctx.fillStyle = fill;
    ctx.textAlign = align;
    ctx.textBaseline = baseline;
    ctx.fillText(text, x, y);
    ctx.restore();
  }

  /**
   * Draw an image in game coordinates
   */
  drawImage(img, gx, gy, gw, gh, options = {}) {
    const isTop = options.topScreen ?? false;
    const { x, y } = isTop ? this.topScreenToViewport(gx, gy) : this.gameToViewport(gx, gy);
    const w = this.scaleRadius(gw);
    const h = this.scaleRadius(gh);
    this.ctx.save();
    this.ctx.globalAlpha = options.alpha ?? 1;
    this.ctx.drawImage(img, x, y, w, h);
    this.ctx.restore();
  }

  /**
   * Draw the Nintendo DS hinge/divider separating Top from Bottom Screen.
   */
  drawDivider() {
    const { x, y } = this.topScreenToViewport(0, 384);
    const w = this.scaleRadius(512);
    this.ctx.save();
    this.ctx.fillStyle = '#000000';
    this.ctx.fillRect(x, y - 6, w, 12);
    this.ctx.strokeStyle = '#444';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(x, y - 6, w, 12);
    this.ctx.restore();
  }

  /**
   * Draw a line in game coordinates.
   * @param {number} x1 @param {number} y1 @param {number} x2 @param {number} y2
   */
  drawLine(x1, y1, x2, y2, { stroke = '#fff', strokeWidth = 2, alpha = 1, topScreen = false } = {}) {
    const a = topScreen ? this.topScreenToViewport(x1, y1) : this.gameToViewport(x1, y1);
    const b = topScreen ? this.topScreenToViewport(x2, y2) : this.gameToViewport(x2, y2);
    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = stroke;
    ctx.lineWidth = strokeWidth;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    ctx.restore();
  }

  /**
   * Draw directly in viewport coordinates (bypasses game transform).
   * Use for HUD, menus, etc.
   * @param {(ctx: CanvasRenderingContext2D, vw: number, vh: number) => void} fn
   */
  drawUI(fn) {
    this.ctx.save();
    fn(this.ctx, this.viewportW, this.viewportH);
    this.ctx.restore();
  }

  /**
   * Draw the playfield debug border (helpful during development).
   */
  drawPlayfieldBorder() {
    const pf = this.playfield;
    const ctx = this.ctx;
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.strokeRect(pf.x, pf.y, pf.w, pf.h);
    ctx.setLineDash([]);
    ctx.restore();
  }

  /**
   * Create a linear gradient in game space.
   * @param {number} x0 @param {number} y0 @param {number} x1 @param {number} y1
   * @returns {CanvasGradient}
   */
  createGameGradient(x0, y0, x1, y1) {
    const a = this.gameToViewport(x0, y0);
    const b = this.gameToViewport(x1, y1);
    return this.ctx.createLinearGradient(a.x, a.y, b.x, b.y);
  }

  /**
   * Create a radial gradient in game space.
   * @param {number} gx @param {number} gy @param {number} gr
   * @returns {CanvasGradient}
   */
  createRadialGradient(gx, gy, gr) {
    const { x, y } = this.gameToViewport(gx, gy);
    const r = this.scaleRadius(gr);
    return this.ctx.createRadialGradient(x, y, 0, x, y, r);
  }
}
