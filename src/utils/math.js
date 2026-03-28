/**
 * @fileoverview Math utilities for TapTap game engine
 * Easing functions, Bezier curves, vector math, etc.
 */

// ─────────────────────────────────────────────
// VECTOR 2D
// ─────────────────────────────────────────────

/** @typedef {{ x: number, y: number }} Vec2 */

/** @param {number} x @param {number} y @returns {Vec2} */
export const vec2 = (x, y) => ({ x, y });

/** @param {Vec2} a @param {Vec2} b @returns {number} */
export const dist = (a, b) => Math.hypot(b.x - a.x, b.y - a.y);

/** @param {Vec2} a @param {Vec2} b @param {number} t @returns {Vec2} */
export const lerp2 = (a, b, t) => ({
  x: a.x + (b.x - a.x) * t,
  y: a.y + (b.y - a.y) * t,
});

/** @param {Vec2} v @returns {number} */
export const magnitude = (v) => Math.hypot(v.x, v.y);

/** @param {Vec2} v @returns {Vec2} */
export const normalize = (v) => {
  const m = magnitude(v);
  return m === 0 ? { x: 0, y: 0 } : { x: v.x / m, y: v.y / m };
};

/** @param {Vec2} a @param {Vec2} b @returns {Vec2} */
export const addVec = (a, b) => ({ x: a.x + b.x, y: a.y + b.y });

/** @param {Vec2} a @param {Vec2} b @returns {Vec2} */
export const subVec = (a, b) => ({ x: a.x - b.x, y: a.y - b.y });

/** @param {Vec2} v @param {number} s @returns {Vec2} */
export const scaleVec = (v, s) => ({ x: v.x * s, y: v.y * s });

// ─────────────────────────────────────────────
// EASING FUNCTIONS
// All functions: t ∈ [0, 1] → [0, 1]
// ─────────────────────────────────────────────

export const easeLinear = (t) => t;

export const easeInQuad   = (t) => t * t;
export const easeOutQuad  = (t) => t * (2 - t);
export const easeInOutQuad = (t) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;

export const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
export const easeInCubic  = (t) => t * t * t;

export const easeOutBack = (t) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};

export const easeOutElastic = (t) => {
  if (t === 0 || t === 1) return t;
  const c4 = (2 * Math.PI) / 3;
  return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
};

export const easeOutBounce = (t) => {
  const n1 = 7.5625, d1 = 2.75;
  if (t < 1 / d1) return n1 * t * t;
  if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
  if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
  return n1 * (t -= 2.625 / d1) * t + 0.984375;
};

// ─────────────────────────────────────────────
// BEZIER CURVES (for sliders)
// ─────────────────────────────────────────────

/**
 * Evaluate a quadratic Bezier curve at t.
 * @param {Vec2} p0 @param {Vec2} p1 @param {Vec2} p2 @param {number} t
 * @returns {Vec2}
 */
export const quadBezier = (p0, p1, p2, t) => {
  const mt = 1 - t;
  return {
    x: mt * mt * p0.x + 2 * mt * t * p1.x + t * t * p2.x,
    y: mt * mt * p0.y + 2 * mt * t * p1.y + t * t * p2.y,
  };
};

/**
 * Evaluate a cubic Bezier curve at t.
 * @param {Vec2} p0 @param {Vec2} p1 @param {Vec2} p2 @param {Vec2} p3 @param {number} t
 * @returns {Vec2}
 */
export const cubicBezier = (p0, p1, p2, p3, t) => {
  const mt = 1 - t;
  const mt2 = mt * mt;
  const t2 = t * t;
  return {
    x: mt2 * mt * p0.x + 3 * mt2 * t * p1.x + 3 * mt * t2 * p2.x + t2 * t * p3.x,
    y: mt2 * mt * p0.y + 3 * mt2 * t * p1.y + 3 * mt * t2 * p2.y + t2 * t * p3.y,
  };
};

/**
 * Approximate arc length of a Bezier by sampling.
 * @param {Vec2[]} points - Control points
 * @param {number} [samples=50]
 * @returns {number}
 */
export const bezierLength = (points, samples = 50) => {
  if (points.length < 2) return 0;
  let length = 0;
  let prev = points[0];
  for (let i = 1; i <= samples; i++) {
    const t = i / samples;
    const curr = bezierAt(points, t);
    length += dist(prev, curr);
    prev = curr;
  }
  return length;
};

/**
 * Evaluate a general Bezier curve (de Casteljau's algorithm).
 * @param {Vec2[]} points @param {number} t
 * @returns {Vec2}
 */
export const bezierAt = (points, t) => {
  let pts = [...points];
  while (pts.length > 1) {
    const next = [];
    for (let i = 0; i < pts.length - 1; i++) {
      next.push(lerp2(pts[i], pts[i + 1], t));
    }
    pts = next;
  }
  return pts[0];
};

// ─────────────────────────────────────────────
// CIRCLE MATH (for Perfect curve sliders)
// ─────────────────────────────────────────────

/**
 * Find circumcenter of 3 points.
 * @param {Vec2} a @param {Vec2} b @param {Vec2} c
 * @returns {{ center: Vec2, radius: number } | null}
 */
export const circumcircle = (a, b, c) => {
  const ax = a.x, ay = a.y;
  const bx = b.x, by = b.y;
  const cx = c.x, cy = c.y;
  const D = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by));
  if (Math.abs(D) < 1e-7) return null; // Collinear

  const ux = ((ax*ax + ay*ay) * (by - cy) + (bx*bx + by*by) * (cy - ay) + (cx*cx + cy*cy) * (ay - by)) / D;
  const uy = ((ax*ax + ay*ay) * (cx - bx) + (bx*bx + by*by) * (ax - cx) + (cx*cx + cy*cy) * (bx - ax)) / D;
  const center = { x: ux, y: uy };
  return { center, radius: dist(center, a) };
};

// ─────────────────────────────────────────────
// GENERAL MATH HELPERS
// ─────────────────────────────────────────────

/** Clamp a value between min and max */
export const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

/** Linear interpolation */
export const lerp = (a, b, t) => a + (b - a) * t;

/** Map a value from one range to another */
export const remap = (v, inMin, inMax, outMin, outMax) =>
  outMin + ((v - inMin) / (inMax - inMin)) * (outMax - outMin);

/** Convert degrees to radians */
export const degToRad = (d) => (d * Math.PI) / 180;

/** Convert radians to degrees */
export const radToDeg = (r) => (r * 180) / Math.PI;

/** Random integer between min and max (inclusive) */
export const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

/** Random float between min and max */
export const randFloat = (min, max) => Math.random() * (max - min) + min;

/** Check if a point is within a circle */
export const pointInCircle = (px, py, cx, cy, r) =>
  Math.hypot(px - cx, py - cy) <= r;
