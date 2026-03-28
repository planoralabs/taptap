/**
 * @fileoverview Base class for all screens.
 */

export class BaseScreen {
  constructor(name) {
    this.name = name;
    /** @type {import('../engine/GameEngine.js').GameEngine} */
    this.engine = null; // Injected on setScreen
  }

  /** Called when screen becomes active */
  init(engine) {
    this.engine = engine;
  }

  /** Mounts HTML UI to a container div */
  mount(container) {}

  /** Unmounts HTML UI from a container div */
  unmount() {}

  /** Called every frame to update logic */
  update(time, delta) {}

  /** Call every frame to render */
  draw(renderer, time, delta) {}

  /** Called when switching away from this screen */
  destroy() {}
}
