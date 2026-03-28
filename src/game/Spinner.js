import { CS_TO_RADIUS } from '../utils/constants.js';

export class Spinner {
  constructor(raw, timeline) {
    this.x = 256;
    this.y = 192;
    this.time = raw.time;
    this.endTime = raw.endTime;
    this.type = raw.type;

    this.timeline = timeline;
    this.state = 'waiting';

    this.rotation = 0;
    this.spins = 0;
    
    // Vinyl Record UI
    this.vinylImg = new Image();
    this.vinylImg.src = '/assets/vinyl.png';
  }

  reset() {
    this.state = 'waiting';
    this.rotation = 0;
    this.spins = 0;
    this.lastAngle = undefined;
  }

  update(currentTime, engine) {
    if (this.state === 'waiting' && currentTime >= this.time && currentTime < this.endTime) {
       this.state = 'active';
    }

    if (this.state === 'active') {
       if (currentTime >= this.endTime) {
          this.state = 'done';
          if (this.spins > 3) { // Goal: Ensure robust spinning (3 full cycles)
              engine.score.registerHit(0, this.x, this.y);
              engine.audio.playHitSound('normal');
          } else {
              engine.score.registerMiss(this.x, this.y);
          }
          return;
       }

       // Track Spin
       const ptr = engine.input.getActivePointer();
       if (ptr) {
          const dx = ptr.x - this.x;
          const dy = ptr.y - this.y;
          const angle = Math.atan2(dy, dx);
          
          if (this.lastAngle !== undefined) {
             let delta = angle - this.lastAngle;
             // Ensure shortest path in radians
             if (delta > Math.PI) delta -= Math.PI * 2;
             if (delta < -Math.PI) delta += Math.PI * 2;
             
             this.rotation += delta;
             this.spins = Math.abs(this.rotation) / (Math.PI * 2);
          }
          this.lastAngle = angle;
       } else {
          // You dropped the needle! No rotating if pointer not down
          this.lastAngle = undefined;
       }
    }
  }

  draw(renderer, currentTime) {
    if (this.state !== 'active') return;

    renderer.ctx.save();
    
    const vp = renderer.gameToViewport(this.x, this.y);
    renderer.ctx.translate(vp.x, vp.y);
    renderer.ctx.rotate(this.rotation);
    
    // Massive vinyl fills the bottom screen
    const r = renderer.scaleRadius(160); 
    
    if (this.vinylImg.complete) {
      renderer.ctx.drawImage(this.vinylImg, -r, -r, r*2, r*2);
    } else {
      renderer.ctx.beginPath();
      renderer.ctx.arc(0, 0, r, 0, Math.PI*2);
      renderer.ctx.strokeStyle = '#0ff';
      renderer.ctx.lineWidth = 10;
      renderer.ctx.stroke();
    }
    
    renderer.ctx.restore();
    
    // Render text with no rotation
    renderer.drawText(`SPINS: ${Math.floor(this.spins)} / 3`, this.x, this.y + 140, { 
      font: `bold 24px Inter`, 
      fill: '#ffffff',
      alpha: 1
    });
  }

  checkHit(x, y, time) {
    // Spinners are processed entirely via the Update Loop pointer dragging.
    return false; 
  }
}
