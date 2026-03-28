/**
 * @fileoverview Game Screen — where the actual gameplay happens.
 */

import { BaseScreen } from './BaseScreen.js';
import { GameState } from '../utils/constants.js';
import { GameEvents } from '../utils/events.js';
import { HitEffect } from '../game/HitEffect.js';

export class GameScreen extends BaseScreen {
  constructor() {
    super('GameScreen');
    
    this.effects = [];

    // Load static images for EBA Dual Screen Backgrounds
    this.storyImg = new Image();
    this.storyImg.src = '/src/assets/story.png';
    this.agentsImg = new Image();
    this.agentsImg.src = '/src/assets/agents.png';
    this.agentsFailImg = new Image();
    this.agentsFailImg.src = '/src/assets/agents_fail.png';
    
    this.lastMissTime = 0;
  }

  init(engine) {
    super.init(engine);
    console.log('[GameScreen] Initialized');
    // ...
    this._onGameOver = () => this.engine.setState(GameState.RESULTS);
    
    this._onHit = (result) => {
       this.effects.push(new HitEffect(result.x, result.y, result.label));
    };

    this._onMiss = (result) => {
       this.effects.push(new HitEffect(result.x, result.y, result.label, 'miss'));
       this.lastMissTime = performance.now();
    };

    this.engine.on('game:over', this._onGameOver);
    this.engine.on('game:hit', this._onHit);
    this.engine.on('game:miss', this._onMiss);
  }

  update(time, delta) {
    this.effects = this.effects.filter(e => !e.isDead());
  }

  draw(renderer, time, delta) {
    // 1. Draw Dual Screen Backgrounds
    if (this.storyImg.complete) {
      renderer.drawImage(this.storyImg, 0, 0, 512, 384, { topScreen: true });
    }
    
    const now = performance.now();
    const isFailing = (now - this.lastMissTime < 800); // Agents stumble for 800ms
    const activeImg = isFailing ? this.agentsFailImg : this.agentsImg;
    
    if (activeImg.complete) {
      let scale = 1.0;
      if (!isFailing) {
         // BPM is 128, one beat every 468.75ms
         const beatMs = 60000 / 128;
         const currentBeat = (this.engine.audio.getCurrentTime() / beatMs) % 1; 
         // pop up and shrink (bouncing sync to audio!)
         scale = 1.0 + Math.max(0, 1 - (currentBeat * 2)) * 0.05; 
      }
      
      const gw = 512 * scale;
      const gh = 384 * scale;
      const gx = -(gw - 512) / 2;
      const gy = -(gh - 384) / 2;
      
      renderer.drawImage(activeImg, gx, gy, gw, gh, { alpha: isFailing ? 0.7 : 0.4 });
    }
    
    if (isFailing) {
       renderer.ctx.save();
       const vp = renderer.gameToViewport(0,0);
       renderer.ctx.fillStyle = 'rgba(255, 0, 0, 0.25)'; // Fail red flash over the playfield
       renderer.ctx.fillRect(vp.x, vp.y, renderer.scaleRadius(512), renderer.scaleRadius(384));
       renderer.ctx.restore();
    }

    // 2. Draw standard DS gap/divider
    renderer.drawDivider();

    // 3. Draw active Game Objects
    const activeObjects = this.engine.timeline.getActiveObjects(this.engine.audio.getCurrentTime());
    
    // Draw all objects (older first back-to-front)
    for (let i = activeObjects.length - 1; i >= 0; i--) {
      activeObjects[i].draw(renderer, this.engine.audio.getCurrentTime());
    }

    // Draw localized hit effects (above hit objects)
    for (const effect of this.effects) {
       effect.draw(renderer);
    }

    // Draw UI HUD
    renderer.drawUI((ctx, vw, vh) => {
        // Score
        ctx.fillStyle = '#fff';
        ctx.font = '24px Bangers';
        ctx.textAlign = 'right';
        ctx.fillText(this.engine.score.score.toString().padStart(7, '0'), vw - 20, 40);

        // Combo
        ctx.textAlign = 'left';
        ctx.fillStyle = this.engine.score.combo > 10 ? '#ffea00' : '#fff';
        ctx.fillText(`${this.engine.score.combo}x`, 20, vh - 20);
        
        // HP Bar
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.fillRect(vw/2 - 200, 20, 400, 10);
        ctx.fillStyle = this.engine.score.health < 0.2 ? '#ff2d55' : '#4cd964';
        ctx.fillRect(vw/2 - 200, 20, 400 * this.engine.score.health, 10);
    });
  }

  destroy() {
    this.engine.off('game:over', this._onGameOver);
  }
}
