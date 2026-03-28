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
    
    if (this.agentsImg.complete) {
      // Agents occupy the active gameplay screen (bottom)
      // Dimmed to distinct gameplay mechanics
      renderer.drawImage(this.agentsImg, 0, 0, 512, 384, { alpha: 0.4 });
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
