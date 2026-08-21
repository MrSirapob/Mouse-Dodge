import { Renderer } from './rendering/renderer.js?v=20260821-iylt';
import { InputManager } from './core/input.js?v=20260821-iylt';
import { UI } from './ui/ui.js?v=20260821-iylt';
import { Game } from './systems/game.js?v=20260821-iylt';

const canvas = document.getElementById('game');
const renderer = new Renderer(canvas);
const input = new InputManager(canvas);
const ui = new UI();
const game = new Game({ renderer, input, ui });
ui.setStartHandler((mode, skill, skillP2) => game.start(mode, skill, skillP2));

function resize() { renderer.resize(); input.resize(); }
window.addEventListener('resize', resize, { passive: true });
window.addEventListener('orientationchange', () => setTimeout(resize, 100), { passive: true });
resize();
