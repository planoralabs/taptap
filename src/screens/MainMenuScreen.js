import { BaseScreen } from './BaseScreen.js';
import { GameState } from '../utils/constants.js';

export class MainMenuScreen extends BaseScreen {
  constructor() {
    super('MainMenuScreen');
  }

  mount(container) {
    this.container = container;
    
    // We create a premium, vibrant modern HTML menu
    this.container.innerHTML = `
      <div class="main-menu-container">
        <div class="background-fx">
           <div class="blob orange"></div>
           <div class="blob pink"></div>
        </div>
        
        <div class="menu-content">
          <h1 class="logo-title">TAP<span>TAP</span></h1>
          <p class="subtitle">AGENTS OF RHYTHM</p>
          
          <div class="menu-actions">
             <button id="btn-play" class="premium-btn primary">
               <span class="btn-text">START MISSION</span>
               <div class="btn-glow"></div>
             </button>
             <button id="btn-options" class="premium-btn secondary">OPTIONS</button>
          </div>
        </div>
      </div>
    `;

    // Bind events
    this.container.querySelector('#btn-play').addEventListener('click', () => {
      this.engine.setState(GameState.SONG_SELECT);
    });
  }

  unmount() {
    if (this.container) {
      this.container.innerHTML = '';
    }
  }

  draw(renderer, time, delta) {
    // If we want canvas background effects, we put them here
    // For now, HTML handles the heavy lifting of the UI
    renderer.clear();
  }
}
