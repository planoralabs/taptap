/**
 * @fileoverview Spinner implementation.
 */

import { OSU_WIDTH, OSU_HEIGHT } from '../utils/constants.js';
import { pointInCircle } from '../utils/math.js';

export class Spinner {
  constructor(raw, timeline) {
    this.x = OSU_WIDTH / 2; // Spinners are typically centered
    this.y = OSU_HEIGHT / 2;
    this.time = raw.time;
    this.endTime = raw.endTime || this.time + 1000;
    this.type = raw.type;

    this.timeline = timeline;
    this.state = 'waiting';

    this.rotation = 0; // Current visual rotation
    this.spinVelocity = 0; // RPM
    this.lastInputAngle = 0;
    
    // MVP: RPM calculation
    this.lastTime = 0;
  }

  reset() {
    this.state = 'waiting';
    this.rotation = 0;
    this.spinVelocity = 0;
  }

  draw(renderer, currentTime) {
    if (this.state === 'done' || this.state === 'missed') return;

    if (currentTime >= this.time && currentTime <= this.endTime) {
      if(this.state === 'waiting') this.state = 'active';
      this.state = 'sliding'; // Use sliding state equivalent
      
      const cx = this.x;
      const cy = this.y;
      
      const progress = (currentTime - this.time) / (this.endTime - this.time);

      // Outer ring
      renderer.drawCircle(cx, cy, 180, {
         fill: 'rgba(0,100,255,0.2)',
         stroke: '#ffffff',
         strokeWidth: 5,
         alpha: 1
      });

      // Inner disc (rotates)
      renderer.ctx.save();
      const viewportCenter = renderer.gameToViewport(cx, cy);
      renderer.ctx.translate(viewportCenter.x, viewportCenter.y);
      renderer.ctx.rotate(this.rotation);
      
      const rScale = renderer.scaleRadius(1);
      
      renderer.ctx.beginPath();
      renderer.ctx.arc(0, 0, 150 * rScale, 0, Math.PI * 2);
      renderer.ctx.fillStyle = 'rgba(0,200,255,0.4)';
      renderer.ctx.fill();
      
      // Spinner meter/progress (shrinking circle)
      const shrinkRadius = 150 * (1 - progress);
      renderer.ctx.beginPath();
      renderer.ctx.arc(0, 0, shrinkRadius * rScale, 0, Math.PI * 2);
      renderer.ctx.fillStyle = 'rgba(255,255,255,0.8)';
      renderer.ctx.fill();
      
      renderer.ctx.restore();
    }
  }

  // Spinners use input differently (continuous tracking), but we implement checkHit for polyfill
  checkHit(inputX, inputY, inputTime) {
    if (inputTime >= this.time && inputTime <= this.endTime) {
      // Calculate angle
      const dx = inputX - this.x;
      const dy = inputY - this.y;
      const angle = Math.atan2(dy, dx);
      
      if (this.lastInputAngle !== 0) {
        let delta = angle - this.lastInputAngle;
        // Fix wraparound
        if (delta > Math.PI) delta -= Math.PI * 2;
        if (delta < -Math.PI) delta += Math.PI * 2;
        
        this.rotation += delta;
        // In a full implementation, we'd calculate RPM here and award points
      }
      this.lastInputAngle = angle;
      return true; // Register as "interacting"
    }
    return false;
  }
}
