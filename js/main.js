import { Renderer } from './rendering/renderer.js';
import { InputManager } from './core/input.js';
import { UI } from './ui/ui.js';
import { Game } from './systems/game.js';
import { UpdateChecker } from './systems/updateChecker.js';

const canvas = document.getElementById('game');
const renderer = new Renderer(canvas);
const input = new InputManager(canvas);
const ui = new UI();
const game = new Game({ renderer, input, ui });

const updateChecker = new UpdateChecker({
  getGameState: () => game.state.state,
  onSafePoint: (version) => ui.showUpdateAvailable(version),
});
game.updateChecker = updateChecker;
ui.setStartHandler((mode, skill, skillP2) => game.start(mode, skill, skillP2));

function resize() { renderer.resize(); input.resize(); }
window.addEventListener('resize', resize, { passive: true });
window.addEventListener('orientationchange', () => setTimeout(resize, 100), { passive: true });
resize();
