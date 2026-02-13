import './styles.css';
import { createGame, PLAYER_ONE } from './game.js';
import { TorusBoard } from './torusBoard.js';
import { attachPointerControls } from './input.js';

const viewport = document.getElementById('viewport');
const turnIndicator = document.getElementById('turn-indicator');
const winnerBanner = document.getElementById('winner-banner');
const restartButton = document.getElementById('restart-btn');

if (!viewport || !turnIndicator || !winnerBanner || !restartButton) {
  throw new Error('Missing required DOM elements.');
}

const game = createGame();
const torusBoard = new TorusBoard(viewport);

let audioContext = null;

function getAudioContext() {
  const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextCtor) {
    return null;
  }
  if (!audioContext) {
    audioContext = new AudioContextCtor();
  }
  return audioContext;
}

function playPlacementClick(player) {
  const ctx = getAudioContext();
  if (!ctx) {
    return;
  }

  if (ctx.state === 'suspended') {
    ctx.resume();
  }

  const now = ctx.currentTime + 0.002;
  const baseFrequency = player === PLAYER_ONE ? 1280 : 920;

  const oscillator = ctx.createOscillator();
  oscillator.type = 'triangle';
  oscillator.frequency.setValueAtTime(baseFrequency, now);
  oscillator.frequency.exponentialRampToValueAtTime(baseFrequency * 0.6, now + 0.045);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.22, now + 0.003);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);

  oscillator.connect(gain);
  gain.connect(ctx.destination);

  oscillator.start(now);
  oscillator.stop(now + 0.065);
}

function updateHud() {
  const state = game.getState();
  const playerLabel = state.currentPlayer === PLAYER_ONE ? 'Player 1 (White)' : 'Player 2 (Black)';

  if (state.gameOver) {
    turnIndicator.textContent = 'Game Over';
    winnerBanner.hidden = false;
    winnerBanner.textContent =
      state.winner === PLAYER_ONE ? 'Player 1 wins with five in a row.' : 'Player 2 wins with five in a row.';
    restartButton.hidden = false;
  } else {
    turnIndicator.textContent = `Turn: ${playerLabel}`;
    winnerBanner.hidden = true;
    winnerBanner.textContent = '';
    restartButton.hidden = true;
  }
}

function syncBoardVisuals() {
  const state = game.getState();
  torusBoard.setPieces(game.getOccupiedCells());
  torusBoard.setHighlightedCells(state.winningCells);
}

function handleDoubleClick(event) {
  const picked = torusBoard.pickCell(event.clientX, event.clientY);
  if (!picked) {
    return;
  }

  const placingPlayer = game.getState().currentPlayer;
  const result = game.placePiece(picked.i, picked.j);
  if (!result.placed) {
    return;
  }

  playPlacementClick(placingPlayer);
  syncBoardVisuals();
  updateHud();
}

const detachControls = attachPointerControls({
  element: torusBoard.getCanvas(),
  onHorizontalDrag: (dx) => {
    game.adjustZRotation(dx * 0.0065);
    torusBoard.setZRotation(game.getState().zRotation);
  },
  onVerticalDrag: (dy) => {
    game.adjustVOffset(-dy * 0.0065);
    torusBoard.setVOffset(game.getState().vOffset);
  },
  onDoubleClick: handleDoubleClick
});

restartButton.addEventListener('click', () => {
  game.reset();
  torusBoard.setZRotation(game.getState().zRotation);
  torusBoard.setVOffset(game.getState().vOffset);
  syncBoardVisuals();
  updateHud();
});

function onWindowResize() {
  torusBoard.resize();
}

window.addEventListener('resize', onWindowResize);

let rafId = 0;
function frame() {
  torusBoard.render();
  rafId = window.requestAnimationFrame(frame);
}
frame();

window.render_game_to_text = () => game.renderToText();
window.advanceTime = (ms) => {
  const steps = Math.max(1, Math.round(ms / (1000 / 60)));
  for (let i = 0; i < steps; i += 1) {
    // deterministic hook; no time-dependent simulation yet
  }
  torusBoard.render();
};

window.addEventListener('beforeunload', () => {
  detachControls();
  window.removeEventListener('resize', onWindowResize);
  window.cancelAnimationFrame(rafId);
});

torusBoard.setZRotation(game.getState().zRotation);
torusBoard.setVOffset(game.getState().vOffset);
syncBoardVisuals();
updateHud();
