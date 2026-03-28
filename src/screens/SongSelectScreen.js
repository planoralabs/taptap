import { BaseScreen } from './BaseScreen.js';
import { GameState } from '../utils/constants.js';

export class SongSelectScreen extends BaseScreen {
  constructor() {
    super('SongSelectScreen');
  }

  mount(container) {
    this.container = container;
    
    this.container.innerHTML = `
      <div class="song-select-container">
        
        <div class="top-bar">
          <button id="btn-back" class="icon-btn">← BACK</button>
          <h2>MISSIONS</h2>
          <div class="player-profile">Guest Agent</div>
        </div>

        <div class="carousel-wrapper">
          
          <div class="song-card active">
            <div class="song-art procedural-art">
              <div class="art-overlay"></div>
              <h1 class="bpm">128 BPM</h1>
            </div>
            <div class="song-info">
              <h3>Operation: Demo Track</h3>
              <p>Procedural Audio Division</p>
              
              <div class="difficulty-meter">
                 <span class="diff-stars">⭐⭐⭐</span>
                 <span class="diff-badge hard">HARD</span>
              </div>
            </div>
          </div>

          <div class="song-card locked">
            <div class="song-art">
              <div class="lock-icon">🔒</div>
            </div>
            <div class="song-info">
              <h3>Import .OSU</h3>
              <p>Custom Maps (Soon)</p>
            </div>
          </div>

        </div>

        <div class="bottom-action">
           <button id="btn-start" class="premium-btn play-btn">
             <span>ENGAGE</span>
           </button>
        </div>
      </div>
    `;

    this.container.querySelector('#btn-back').addEventListener('click', () => {
      this.engine.setState(GameState.MAIN_MENU);
    });

    this.container.querySelector('#btn-start').addEventListener('click', () => {
      // Trigger the app to load demo beatmap
      this.engine.emit('ui:song_select:play_demo');
    });
  }

  unmount() {
    if (this.container) {
      this.container.innerHTML = '';
    }
  }

  draw(renderer) {
    // Basic canvas background, though CSS will cover most
    renderer.clear();
  }
}
