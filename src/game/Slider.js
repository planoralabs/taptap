/**
 * @fileoverview Slider implementation.
 *
 * Sliders in osu! are complex. This implementation focuses on the visual
 * representation and basic mechanics (head circle, sliding ball, end circle).
 */

import { CS_TO_RADIUS } from '../utils/constants.js';
import { bezierAt, quadBezier, cubicBezier, pointInCircle } from '../utils/math.js';

export class Slider {
  /**
   * @param {import('../parser/OsuParser.js').RawHitObject} raw
   * @param {import('../engine/Timeline.js').Timeline} timeline
   * @param {number} cs - Circle Size
   * @param {number} sv - Slider Velocity (multiplier)
   * @param {number} defaultBpm - Default BPM for timing
   */
  constructor(raw, timeline, cs = 5, sv = 1, defaultBpm = 120) {
    this.x = raw.x;
    this.y = raw.y;
    this.time = raw.time; // Head time
    this.type = raw.type;
    
    // Slider details
    this.curveType = raw.curveType || 'B';
    this.curvePoints = [ {x: raw.x, y: raw.y}, ...(raw.curvePoints || []) ];
    this.slides = raw.slides || 1;
    this.length = raw.length || 0;
    
    // Calculate timing Based on length and SV.
    // Simplifying: (Length / (SliderMultiplier * 100 * SV)) * BeatDuration
    const beatDuration = 60000 / defaultBpm;
    // Approximating slider duration for now. A full calculation requires beatmap global multipliers.
    // Taking a shortcut for the MVP: Map 100 length units to ~300ms.
    const approximateDurationPerSlide = (this.length / 100) * 300 * (1/Math.abs(sv));
    
    this.endTime = this.time + (approximateDurationPerSlide * this.slides);

    this.timeline = timeline;
    this.radius = CS_TO_RADIUS(cs);

    /** @type {'waiting'|'active'|'sliding'|'done'|'missed'} */
    this.state = 'waiting';

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
    if (this.state === 'done' || this.state === 'missed') return;

    const preempt = this.timeline.preemptMs;
    // Visible early for approach
    if (currentTime < this.time - preempt) return;

    // Draw the slider track (simplified: just drawing lines between points for now to save performance)
    if (this.curvePoints.length > 1) {
      for(let i=0; i < this.curvePoints.length - 1; i++) {
         renderer.drawLine(
           this.curvePoints[i].x, this.curvePoints[i].y,
           this.curvePoints[i+1].x, this.curvePoints[i+1].y,
           { stroke: this.comboColor, strokeWidth: this.radius*2, alpha: 0.3 }
         );
         renderer.drawCircle(this.curvePoints[i].x, this.curvePoints[i].y, this.radius, { fill: this.comboColor, alpha: 0.3 });
      }
      // Ends
      renderer.drawCircle(this.curvePoints[this.curvePoints.length-1].x, this.curvePoints[this.curvePoints.length-1].y, this.radius, { fill: this.comboColor, alpha: 0.3 });
    }

    // Draw head circle if not yet hit/sliding
    if (this.state === 'waiting' || this.state === 'active') {
       renderer.drawCircle(this.x, this.y, this.radius, {
         fill: this.comboColor,
         stroke: '#ffffff',
         strokeWidth: 3,
         alpha: 1
       });
    }

    // Draw slider ball if sliding
    if (this.state === 'sliding' && currentTime >= this.time && currentTime <= this.endTime) {
       // Interpolate position along the track (simplified to linear between points if multiple segments)
       const progress = (currentTime - this.time) / (this.endTime - this.time);
       // Just bouncing back and forth for MVP
       const slideProgress = (progress * this.slides) % 1;
       const forward = Math.floor(progress * this.slides) % 2 === 0;
       const t = forward ? slideProgress : 1 - slideProgress;

       // Use bezierAt for MVP curve estimation
       const currentPos = bezierAt(this.curvePoints, t);
       
       renderer.drawCircle(currentPos.x, currentPos.y, this.radius, {
         fill: '#ffffff',
         stroke: this.comboColor,
         strokeWidth: 4,
         alpha: 1
       });
       
       // Follow circle (larger)
       renderer.drawCircle(currentPos.x, currentPos.y, this.radius * 2, {
         fill: null,
         stroke: '#ffdf00',
         strokeWidth: 2,
         alpha: 0.5
       });
    }
  }

  checkHit(inputX, inputY, inputTime) {
    if (this.state === 'waiting' || this.state === 'active') {
      const hit = pointInCircle(inputX, inputY, this.x, this.y, this.radius);
      if (hit) {
        this.state = 'sliding'; // Head hit, transition to sliding
        // Don't mark as 'done' until sliding finishes
      }
      return hit; // We return true to reward the head hit
    }
    return false;
  }
}
