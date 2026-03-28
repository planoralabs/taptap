/**
 * @fileoverview Visual effects for hits (300/100/50/Miss bursts, combo explosions, etc).
 */

import { HitLabel } from '../utils/constants.js';

export class HitEffect {
  constructor(x, y, label, type = 'normal') {
    this.x = x;
    this.y = y;
    this.label = label;
    this.type = type;
    this.time = performance.now();
    this.duration = 500; // ms to live
    this.particles = [];

    // Simple particle system for Great/Good hits
    if (label === HitLabel.GREAT || label === HitLabel.GOOD) {
      const pCount = label === HitLabel.GREAT ? 12 : 6;
      for (let i = 0; i < pCount; i++) {
        const angle = (Math.PI * 2 / pCount) * i;
        const speed = Math.random() * 2 + 1;
        this.particles.push({
          x: 0, 
          y: 0, 
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 1.0,
          color: label === HitLabel.GREAT ? '#f7c948' : '#4cd964'
        });
      }
    }
  }

  isDead() {
    return performance.now() >= this.time + this.duration;
  }

  draw(renderer) {
    if (this.isDead()) return;
    
    const now = performance.now();
    const elapsed = now - this.time;
    const progress = elapsed / this.duration; // 0.0 to 1.0
    
    const alpha = 1.0 - Math.pow(progress, 2); // Fade out quickly at the end
    
    // Draw text (300, 100, 50, Miss)
    let color = '#ffffff';
    let scale = 1.0 + Math.sin(progress * Math.PI) * 0.2; // Slight bounce
    
    if (this.label === HitLabel.GREAT) color = '#f7c948';
    else if (this.label === HitLabel.GOOD) color = '#4cd964';
    else if (this.label === HitLabel.MEH) color = '#5ac8fa';
    else { color = '#ff2d55'; scale = 1.0; } // Miss is red, no bounce

    renderer.drawText(this.label, this.x, this.y - (progress * 20), {
      font: `bold ${Math.floor(24 * scale)}px Bangers`,
      fill: color,
      alpha
    });

    // Draw particles
    if (this.particles.length > 0 && alpha > 0) {
      for (let p of this.particles) {
        // Update particle
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.95; // friction
        p.vy *= 0.95;
        
        // Draw particle (using drawUI to draw outside game transforms easily, or drawCircle)
        renderer.drawCircle(this.x + p.x, this.y + p.y, 4 * alpha, {
          fill: p.color,
          alpha: alpha * 0.8
        });
      }
    }
  }
}
