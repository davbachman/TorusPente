import { checkWin } from './winCheck.js';

const TAU = Math.PI * 2;

export const MAJOR_RADIUS = 20;
export const MINOR_RADIUS = 10;
export const U_CELLS = 16;
export const V_CELLS = 8;
export const PLAYER_ONE = 1;
export const PLAYER_TWO = 2;

/**
 * @typedef {Object} Move
 * @property {number} i
 * @property {number} j
 * @property {number} player
 */

/**
 * @typedef {Object} WinResult
 * @property {number} winner
 * @property {number[] | null} direction
 * @property {number} count
 * @property {{i:number,j:number}[]} winningCells
 */

/**
 * @typedef {Object} GameState
 * @property {number[][]} board
 * @property {number} currentPlayer
 * @property {number} winner
 * @property {boolean} gameOver
 * @property {number} vOffset
 * @property {number} zRotation
 * @property {Move | null} lastMove
 * @property {{i:number,j:number}[]} winningCells
 */

function createEmptyBoard() {
  return Array.from({ length: U_CELLS }, () => Array(V_CELLS).fill(0));
}

export function normalizeAngle(angle) {
  let normalized = angle % TAU;
  if (normalized < 0) {
    normalized += TAU;
  }
  return normalized;
}

export function createGame() {
  /** @type {GameState} */
  const state = {
    board: createEmptyBoard(),
    currentPlayer: PLAYER_ONE,
    winner: 0,
    gameOver: false,
    vOffset: 0,
    zRotation: 0,
    lastMove: null,
    winningCells: []
  };

  const getState = () => ({
    currentPlayer: state.currentPlayer,
    winner: state.winner,
    gameOver: state.gameOver,
    vOffset: state.vOffset,
    zRotation: state.zRotation,
    lastMove: state.lastMove,
    winningCells: state.winningCells
  });

  const getOccupiedCells = () => {
    const occupied = [];
    for (let i = 0; i < U_CELLS; i += 1) {
      for (let j = 0; j < V_CELLS; j += 1) {
        if (state.board[i][j] !== 0) {
          occupied.push({ i, j, player: state.board[i][j] });
        }
      }
    }
    return occupied;
  };

  const setZRotation = (zRotation) => {
    state.zRotation = normalizeAngle(zRotation);
  };

  const adjustZRotation = (deltaRadians) => {
    setZRotation(state.zRotation + deltaRadians);
  };

  const setVOffset = (vOffset) => {
    state.vOffset = normalizeAngle(vOffset);
  };

  const adjustVOffset = (deltaRadians) => {
    setVOffset(state.vOffset + deltaRadians);
  };

  const placePiece = (i, j) => {
    if (state.gameOver) {
      return { placed: false, reason: 'game-over', winner: state.winner };
    }

    if (i < 0 || i >= U_CELLS || j < 0 || j >= V_CELLS) {
      return { placed: false, reason: 'out-of-range', winner: state.winner };
    }

    if (state.board[i][j] !== 0) {
      return { placed: false, reason: 'occupied', winner: state.winner };
    }

    const player = state.currentPlayer;
    state.board[i][j] = player;
    state.lastMove = { i, j, player };

    /** @type {WinResult} */
    const winResult = checkWin(state.board, state.lastMove, 5);
    if (winResult.winner !== 0) {
      state.winner = winResult.winner;
      state.gameOver = true;
      state.winningCells = winResult.winningCells;
    } else {
      state.currentPlayer = player === PLAYER_ONE ? PLAYER_TWO : PLAYER_ONE;
      state.winningCells = [];
    }

    return { placed: true, reason: 'placed', winner: state.winner };
  };

  const reset = () => {
    state.board = createEmptyBoard();
    state.currentPlayer = PLAYER_ONE;
    state.winner = 0;
    state.gameOver = false;
    state.vOffset = 0;
    state.zRotation = 0;
    state.lastMove = null;
    state.winningCells = [];
  };

  const renderToText = () => {
    const payload = {
      mode: state.gameOver ? 'won' : 'playing',
      torus: {
        majorRadius: MAJOR_RADIUS,
        minorRadius: MINOR_RADIUS,
        uCells: U_CELLS,
        vCells: V_CELLS
      },
      currentPlayer: state.currentPlayer,
      winner: state.winner,
      gameOver: state.gameOver,
      vOffset: state.vOffset,
      zRotation: state.zRotation,
      winningCells: state.winningCells,
      occupiedCells: getOccupiedCells(),
      coordinateNote:
        'u goes around the torus center ring; v goes around each tube cross-section; stones are placed on grid intersections.'
    };
    return JSON.stringify(payload);
  };

  return {
    getState,
    getOccupiedCells,
    setZRotation,
    adjustZRotation,
    setVOffset,
    adjustVOffset,
    placePiece,
    reset,
    renderToText
  };
}
