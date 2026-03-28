/**
 * @fileoverview HitObject base class and HitCircle implementation.
 *
 * HitCircle lifecycle: 'waiting' -> 'active' -> 'done' | 'missed'
 */

import { CS_TO_RADIUS } from '../utils/constants.js';
import { easeOutQuad, pointInCircle } from '../utils/math.js';

export class HitCircle {
  /**
   * @param {import('../parser/OsuParser.js').RawHitObject} raw
   * @param {import('../engine/Timeline.js').Timeline} timeline
   * @param {number} cs - Circle Size (0-10)
   */
  constructor(raw, timeline, cs = 5) {
    this.x = raw.x;
    this.y = raw.y;
    this.time = raw.time;
    this.type = raw.type;
    this.hitSound = raw.hitSound;
    this.newCombo = raw.newCombo;
    this.comboSkip = raw.comboSkip;

    this.timeline = timeline;
    this.radius = CS_TO_RADIUS(cs);

    /** @type {'waiting'|'active'|'done'|'missed'} */
    this.state = 'waiting';

    // Set during instantiation by Beatmap processor
    this.comboColor = '#ffffff';
    this.comboNumber = 1;
  }

  reset() {
    this.state = 'waiting';
  }

  /**
   * @param {import('../engine/Renderer.js').Renderer} renderer
   * @param {number} currentTime
   */
  draw(renderer, currentTime) {
    if (this.state !== 'waiting' && this.state !== 'active') return;

    const preempt = this.timeline.preemptMs;
    const timeAlive = currentTime - (this.time - preempt);

    if (timeAlive < 0) return; // Not visible yet

    this.state = 'active';

    // Fade in
    const fadeInDuration = preempt * 0.3; // First 30% of preempt time
    let alpha = 1.0;
    if (timeAlive < fadeInDuration) {
      alpha = Math.max(0, timeAlive / fadeInDuration);
    }

    // Draw main circle
    renderer.drawCircle(this.x, this.y, this.radius, {
      fill: this.comboColor,
      stroke: '#ffffff',
      strokeWidth: 3,
      alpha
    });

    // Draw combo number and mapped key
    const labels = ['Q', 'W', 'E', 'R', 'T'];
    const kLabel = labels[(this.comboNumber - 1) % 5] || '?';
    const textToShow = `${this.comboNumber} [${kLabel}]`;

    renderer.drawText(textToShow, this.x, this.y, {
      font: `bold ${Math.max(14, this.radius * 0.45)}px Inter`,
      fill: '#ffffff',
      alpha
    });

    // Draw Approach Circle (only if not hit)
    if (this.state === 'active') {
      const timeRemaining = this.time - currentTime;
      if (timeRemaining > 0) {
        // Approach scale goes from 3.0 down to 1.0
        const progress = 1 - (timeRemaining / preempt);
        const scale = 3.0 - (2.0 * easeOutQuad(progress));
        
        renderer.drawCircle(this.x, this.y, this.radius * scale, {
          fill: null,
          stroke: this.comboColor,
          strokeWidth: 2,
          alpha: alpha * 0.8
        });
      }
    }
  }

  /**
   * Check if input at coordinates hits this circle.
   * @param {number} inputX - Game space X
   * @param {number} inputY - Game space Y
   * @param {number} inputTime - Time of input
   * @returns {boolean}
   */
  checkHit(inputX, inputY, inputTime) {
    // Basic circle collision
    return pointInCircle(inputX, inputY, this.x, this.y, this.radius);
  }
}
