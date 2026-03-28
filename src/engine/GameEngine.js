/**
 * @fileoverview GameEngine — central game loop and state machine.
 *
 * Orchestrates: AudioEngine, Renderer, InputManager, Timeline, ScoreEngine
 * and the active Screen. Uses requestAnimationFrame with delta time.
 *
 * States: LOADING → MAIN_MENU ↔ SONG_SELECT ↔ OPTIONS → PLAYING ↔ PAUSED → RESULTS
 */

import { EventEmitter, GameEvents } from '../utils/events.js';
import { GameState } from '../utils/constants.js';
import { Renderer }      from './Renderer.js';
import { AudioEngine }   from './AudioEngine.js';
import { InputManager }  from './InputManager.js';
import { Timeline }      from './Timeline.js';
import { ScoreEngine }   from './ScoreEngine.js';

export class GameEngine extends EventEmitter {
  /**
   * @param {HTMLCanvasElement} canvas
   */
  constructor(canvas) {
    super();

    // — Core systems —
    this.renderer  = new Renderer(canvas);
    this.audio     = new AudioEngine();
    this.input     = new InputManager(canvas, this.renderer);
    this.timeline  = new Timeline();
    this.score     = new ScoreEngine();

    // — State —
    this.state     = GameState.LOADING;
    this._running  = false;
    this._rafId    = null;
    this._lastTime = 0;

    /** @type {import('../screens/BaseScreen.js').BaseScreen | null} */
    this._activeScreen = null;

    // Forward sub-system events upward
    this._forwardEvents();
  }

  // ─────────────────────────────────────────────
  // INITIALIZATION
  // ─────────────────────────────────────────────

  /**
   * Start the engine. Call once after DOM is ready.
   */
  start() {
    this._running = true;
    this._lastTime = performance.now();
    this._tick(this._lastTime);
  }

  /**
   * Stop the loop (used for cleanup / testing).
   */
  stop() {
    this._running = false;
    if (this._rafId) cancelAnimationFrame(this._rafId);
    this._rafId = null;
  }

  // ─────────────────────────────────────────────
  // GAME LOOP
  // ─────────────────────────────────────────────

  _tick(timestamp) {
    if (!this._running) return;
    this._rafId = requestAnimationFrame(this._tick.bind(this));

    const delta = Math.min(timestamp - this._lastTime, 50); // Cap at 50ms (avoid spiral)
    this._lastTime = timestamp;

    this._update(timestamp, delta);
    this._draw(timestamp, delta);

    this.emit(GameEvents.FRAME, { time: timestamp, delta });
  }

  _update(time, delta) {
    if (this._activeScreen?.update) {
      this._activeScreen.update(time, delta);
    }

    // During gameplay, check for missed objects and update active sliding trackers
    if (this.state === GameState.PLAYING) {
      this._processGameplayFrame();
    }
  }

  _draw(time, delta) {
    this.renderer.clear();

    if (this._activeScreen?.draw) {
      this._activeScreen.draw(this.renderer, time, delta);
    }
  }

  // ─────────────────────────────────────────────
  // GAMEPLAY
  // ─────────────────────────────────────────────

  _processGameplayFrame() {
    if (!this.audio.isPlaying) return;
    const currentTime = this.audio.getCurrentTime();

    // Get active objects from timeline
    const active = this.timeline.getActiveObjects(currentTime);

    // Give objects a chance to update their own state continuously (e.g. Sliders tracking input)
    for (const obj of active) {
      if (obj.update) obj.update(currentTime, this);
    }

    // Check for objects that have passed their miss window
    for (const obj of this.timeline.objects) {
      if (obj.state === 'waiting' || obj.state === 'active') {
        const missTime = obj.time + (this._getMissWindow());
        if (currentTime > missTime) {
          obj.state = 'missed';
          this.score.registerMiss(obj.x, obj.y);
        }
      }
    }

    // Check timeline completion
    if (this.timeline.isComplete()) {
      this._onSongComplete();
    }
  }

  _getMissWindow() {
    return 400; // ms after hit time before object auto-misses
  }

  _onSongComplete() {
    if (this.state !== GameState.PLAYING) return;
    const results = this.score.getResults();
    this.setState(GameState.RESULTS);
    this.emit(GameEvents.GAME_COMPLETE, results);
  }

  // ─────────────────────────────────────────────
  // STATE MACHINE
  // ─────────────────────────────────────────────

  /**
   * Transition to a new game state.
   * @param {string} newState - GameState constant
   */
  setState(newState) {
    const from = this.state;
    this.state = newState;
    this.emit(GameEvents.STATE_CHANGE, { from, to: newState });
  }

  /**
   * Load and start a beatmap.
   * @param {import('../parser/OsuParser.js').Beatmap} beatmap
   * @param {HitObject[]} hitObjects - Instantiated game objects
   */
  async startBeatmap(beatmap, hitObjects) {
    this.setState(GameState.LOADING);

    // Configure score for this beatmap
    this.score.reset();
    this.score.configure({
      od:           beatmap.difficulty.overallDifficulty,
      hp:           beatmap.difficulty.hpDrainRate,
      totalObjects: hitObjects.length,
    });

    // Load timeline
    this.timeline.load(hitObjects, beatmap.difficulty.approachRate);

    // Load audio
    try {
      if (beatmap.audioUrl) {
        await this.audio.loadFromUrl(beatmap.audioUrl);
      } else {
        await this.audio.loadDemo();
      }
    } catch (e) {
      console.warn('[GameEngine] Audio load failed, using demo:', e);
      await this.audio.loadDemo();
    }

    // Start playback with lead-in
    const leadIn = beatmap.general?.audioLeadIn ?? 1000;
    setTimeout(() => {
      this.audio.play();
      this.setState(GameState.PLAYING);
    }, leadIn > 0 ? Math.min(leadIn, 2000) : 0);
  }

  pauseGame() {
    if (this.state !== GameState.PLAYING) return;
    this.audio.pause();
    this.setState(GameState.PAUSED);
  }

  resumeGame() {
    if (this.state !== GameState.PAUSED) return;
    this.audio.resume();
    this.setState(GameState.PLAYING);
  }

  restartGame() {
    this.audio.stop();
    this.score.reset();
    this.timeline.reset();
    this.audio.play();
    this.setState(GameState.PLAYING);
  }

  // ─────────────────────────────────────────────
  // SCREEN MANAGEMENT
  // ─────────────────────────────────────────────

  /**
   * Switch to a screen (handles cleanup of old screen).
   * @param {import('../screens/BaseScreen.js').BaseScreen} screen
   */
  setScreen(screen) {
    if (this._activeScreen?.destroy) {
      this._activeScreen.unmount();
      this._activeScreen.destroy();
    }
    this._activeScreen = screen;
    if (screen?.init) {
      screen.init(this);
      if (this.uiLayer) screen.mount(this.uiLayer);
    }
    this.emit(GameEvents.SCREEN_CHANGE, { screen: screen?.name ?? 'unknown' });
  }

  get activeScreen() { return this._activeScreen; }

  // ─────────────────────────────────────────────
  // HIT DETECTION (called by InputManager events)
  // ─────────────────────────────────────────────

  /**
   * Attempt to hit any active circle at the given game coordinates.
   * @param {number} x @param {number} y @param {number} time - audio time in ms
   * @returns {boolean} true if something was hit
   */
  tryHit(x, y, time) {
    if (this.state !== GameState.PLAYING) return false;
    const active = this.timeline.getActiveObjects(time);

    // Hit the frontmost (earliest) object within range
    for (const obj of active) {
      if (obj.state !== 'waiting' && obj.state !== 'active') continue;
      
      const hitResult = obj.checkHit?.(x, y, time) || false;
      if (hitResult) {
        const timingError = time - obj.time;
        this.score.registerHit(timingError, obj.x, obj.y);
        
        // If the object transitioned itself (like Slider to 'sliding'), respect it.
        // Otherwise, standard HitCircles just die ('done').
        if (obj.state === 'waiting' || obj.state === 'active') {
           obj.state = 'done';
        }
        
        this.audio.playHitSound(obj.hitSound ?? 'normal');
        return true;
      }
    }
    return false;
  }

  /**
   * Attempt to hit an active circle by its combo number (for keyboard testing).
   */
  tryHitByNumber(number, time) {
    if (this.state !== GameState.PLAYING) return false;
    const active = this.timeline.getActiveObjects(time);

    // Hit the earliest object that matches the requested number
    for (const obj of active) {
      if (obj.state !== 'waiting' && obj.state !== 'active') continue;
      if (obj.comboNumber === number) {
        
        // Emulate a perfect click on center
        const hitResult = obj.checkHit?.(obj.x, obj.y, time) || false;
        
        if (hitResult) {
          const timingError = time - obj.time;
          this.score.registerHit(timingError, obj.x, obj.y);
          
          if (obj.state === 'sliding') {
             obj.keyboardAutomated = true; // Testing shortcut for notebooks
          } else if (obj.state === 'waiting' || obj.state === 'active') {
             obj.state = 'done';
          }
          
          this.audio.playHitSound(obj.hitSound ?? 'normal');
          return true;
        }
      }
    }
    return false;
  }

  // ─────────────────────────────────────────────
  // EVENT FORWARDING
  // ─────────────────────────────────────────────

  _forwardEvents() {
    // Input → tryHit during gameplay (Mouse/Touch validation)
    this.input.on(GameEvents.INPUT_DOWN, ({ x, y, time }) => {
      if (this.state === GameState.PLAYING) {
        this.tryHit(x, y, this.audio.getCurrentTime());
      }
    });

    // Input → tryHitByNumber (Keyboard QWERT validation)
    this.input.on('input:mapped_key', ({ number, time }) => {
      if (this.state === GameState.PLAYING) {
         this.tryHitByNumber(number, this.audio.getCurrentTime());
      }
    });

    // Forward audio events
    this.audio.on(GameEvents.AUDIO_END, () => this.emit(GameEvents.AUDIO_END));

    // Score events
    this.score.on(GameEvents.HIT_RESULT,   (e) => this.emit(GameEvents.HIT_RESULT, e));
    this.score.on(GameEvents.MISS,         (e) => this.emit(GameEvents.MISS, e));
    this.score.on(GameEvents.COMBO_BREAK,  ()  => this.emit(GameEvents.COMBO_BREAK));
    this.score.on(GameEvents.HEALTH_CHANGE,(e) => this.emit(GameEvents.HEALTH_CHANGE, e));
    this.score.on(GameEvents.GAME_OVER,    ()  => this.emit(GameEvents.GAME_OVER));
  }
}
