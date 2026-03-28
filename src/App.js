/**
 * @fileoverview App core — manages application lifecycle, connects screens to state.
 */

import { GameEngine } from './engine/GameEngine.js';
import { GameState } from './utils/constants.js';
import { MainMenuScreen } from './screens/MainMenuScreen.js';
import { SongSelectScreen } from './screens/SongSelectScreen.js';
import { GameScreen } from './screens/GameScreen.js';
import { ResultsScreen } from './screens/ResultsScreen.js';

// Dummy game data for phase 1 demo
import { HitCircle } from './game/HitCircle.js';
// Basic dummy parser data generator
function createDemoBeatmapAndObjects(engineTimeline) {
  const beatmap = {
    difficulty: { overallDifficulty: 5, hpDrainRate: 5, approachRate: 5 },
    general: { audioLeadIn: 1000 },
    audioUrl: null // Use procedural audio
  };
  
  // Create 10 demo circles synchronized roughly with procedural audio beats at 128 BPM
  const msPerBeat = 60000 / 128; 
  const objects = [];
  
  for(let i=0; i<30; i++) {
     // Beat times: beat 2, 4, 6...
     const beat = i * 2 + 2;
     const time = beat * msPerBeat;

     const x = 100 + Math.random() * 300;
     const y = 80 + Math.random() * 200;

     const raw = { x, y, time, type: 1, hitSound: 0, isCircle: true, isSlider: false, isSpinner: false };
     const c = new HitCircle(raw, engineTimeline, 5);
     c.comboColor = ['#ff6b35', '#ff2d55', '#4cd964'][i%3];
     c.comboNumber = (i % 4) + 1;
     objects.push(c);
  }

  return { beatmap, objects };
}

export class App {
  constructor(canvas, uiLayer) {
    this.engine = new GameEngine(canvas);
    this.engine.uiLayer = uiLayer;
    
    this.screens = {
      [GameState.MAIN_MENU]: new MainMenuScreen(),
      [GameState.SONG_SELECT]: new SongSelectScreen(),
      [GameState.PLAYING]: new GameScreen(),
      [GameState.RESULTS]: new ResultsScreen()
    };
    
    this._bindEvents();
  }

  start() {
    this.engine.start();
    this.engine.setState(GameState.MAIN_MENU);
  }

  _bindEvents() {
    // 1. Screen Transitions
    this.engine.on('state:change', ({ from, to }) => {
       console.log(`[App] State: ${from} -> ${to}`);
       
       if (this.screens[to]) {
           this.engine.setScreen(this.screens[to]);
       }

       // Handle specific transitions
       if (to === GameState.RESULTS) {
         // Stop procedural music explicitly if it didn't finish completely
         this.engine.audio.stop(); 
       }
    });

    // 2. Custom UI Events (from Song Select)
    this.engine.on('ui:song_select:play_demo', async () => {
       const { beatmap, objects } = createDemoBeatmapAndObjects(this.engine.timeline);
       await this.engine.startBeatmap(beatmap, objects);
    });

    // 3. Global Input routing to active screen (if it needs clicks outside of gameplay)
    this.engine.input.on('input:down', ({x, y}) => {
       if (this.engine.state !== GameState.PLAYING) {
          // Route clicks to menu screens
          if(this.engine.activeScreen && this.engine.activeScreen.onInput) {
             this.engine.activeScreen.onInput(x, y);
          }
       }
    });
  }
}
