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
  }

  init(engine) {
    super.init(engine);
    console.log('[GameScreen] Initialized');
    
    // Listen for events 
    this._onGameOver = () => this.engine.setState(GameState.RESULTS);
    
    this._onHit = (result) => {
       this.effects.push(new HitEffect(result.x, result.y, result.label));
    };

    this._onMiss = (result) => {
       this.effects.push(new HitEffect(result.x, result.y, result.label, 'miss'));
    };

    this.engine.on('game:over', this._onGameOver);
    // Observe that the events from ScoreEngine were forwarded via GameEvents in engine constants.
    // They are matching the string literals we used in events.js 
    this.engine.on('game:hit', this._onHit);
    this.engine.on('game:miss', this._onMiss);
  }

  update(time, delta) {
    // Cleanup dead effects
    this.effects = this.effects.filter(e => !e.isDead());
  }

  draw(renderer, time, delta) {
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
