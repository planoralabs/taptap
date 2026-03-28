/**
 * @fileoverview Results screen (Grades, Accuracy, Combo max).
 */
import { BaseScreen } from './BaseScreen.js';
import { GameState } from '../utils/constants.js';

export class ResultsScreen extends BaseScreen {
  constructor() {
    super('ResultsScreen');
    this.results = null;
  }

  init(engine) {
    super.init(engine);
    this.results = this.engine.score.getResults();
  }

  mount(container) {
    this.container = container;
    
    const rankColor = this.getGradeColor(this.results.grade);
    const scoreStr = this.results.score.toString().padStart(7, '0');

    this.container.innerHTML = `
      <div class="main-menu-container" style="display:flex; justify-content:center; align-items:center;">
        <div class="background-fx">
           <div class="blob" style="background:${rankColor}; width:800px; height:800px; filter:blur(100px); opacity:0.3"></div>
        </div>
        
        <div style="background:var(--bg-secondary); border: 8px solid #000; border-radius:30px; padding:3rem; min-width:60vw; box-shadow: 20px 20px 0 #000; z-index:10; display:flex; gap:3rem;">
           
           <div style="flex:1;">
             <h2 style="font-family:var(--font-display); font-size:4rem; color:var(--color-accent-blue); margin:0; text-shadow:3px 3px 0 #000;">MISSION CLEAR</h2>
             
             <div style="font-family:var(--font-display); font-size:6rem; color:#fff; text-shadow:4px 4px 0 #000; letter-spacing:3px;">
                ${scoreStr}
             </div>

             <div style="font-family:var(--font-body); font-size:1.5rem; font-weight:800; margin-top:2rem;">
               <div style="color:var(--color-accent-yellow);">Great (300): ${this.results.n300}</div>
               <div style="color:var(--color-accent-green);">Good (100): ${this.results.n100}</div>
               <div style="color:var(--color-accent-blue);">Meh (50): ${this.results.n50}</div>
               <div style="color:var(--color-accent-pink);">Miss (X): ${this.results.nMiss}</div>
             </div>

             <div style="font-family:var(--font-body); font-size:2rem; font-weight:900; margin-top:2rem; color:#fff;">
                Max Combo: <span style="color:var(--color-accent-yellow)">${this.results.maxCombo}x</span><br>
                Accuracy: <span style="color:var(--color-accent-blue)">${this.results.accuracy.toFixed(1)}%</span>
             </div>
           </div>

           <div style="display:flex; flex-direction:column; justify-content:center; align-items:center;">
              <div style="font-family:var(--font-display); font-size:15rem; color:#fff; text-shadow: 10px 10px 0 ${rankColor}, 20px 20px 0 #000; line-height:0.8; animation:popIn 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275) both;">
                ${this.results.grade}
              </div>
              <p style="font-family:var(--font-display); font-size:2rem; color:var(--text-secondary); margin-top:2rem;">OVERALL RANK</p>
           </div>
        </div>
        
        <div style="position:absolute; bottom:5%; width:100%; display:flex; justify-content:center; z-index:100;">
           <button id="btn-done" class="premium-btn primary" style="font-size:2.5rem; padding: 1rem 4rem;">CONTINUE</button>
        </div>
      </div>
    `;

    this.container.querySelector('#btn-done').addEventListener('click', () => {
      this.engine.setState(GameState.MAIN_MENU);
    });
  }

  unmount() {
    if (this.container) this.container.innerHTML = '';
  }

  draw(renderer, time, delta) {
    renderer.clear();
  }

  getGradeColor(grade) {
    switch(grade) {
      case 'SS': return '#a855f7'; // Purple
      case 'S':  return '#f7c948'; // Gold
      case 'A':  return '#4cd964'; // Green
      case 'B':  return '#5ac8fa'; // Blue
      case 'C':  return '#ff6b35'; // Orange
      case 'D':  return '#ff2d55'; // Red
      default:   return '#444';
    }
  }

  onInput(x, y) {
    if (this.engine) {
      this.engine.setState(GameState.MAIN_MENU);
    }
  }
}
