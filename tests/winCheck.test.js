import { describe, expect, it } from 'vitest';
import { checkWin } from '../src/winCheck.js';

function makeBoard(u = 16, v = 8) {
  return Array.from({ length: u }, () => Array(v).fill(0));
}

describe('checkWin', () => {
  it('detects a horizontal five-in-a-row', () => {
    const board = makeBoard();
    const j = 3;
    for (let i = 5; i < 10; i += 1) {
      board[i][j] = 1;
    }

    const result = checkWin(board, { i: 9, j, player: 1 }, 5);
    expect(result.winner).toBe(1);
    expect(result.winningCells).toEqual([
      { i: 5, j: 3 },
      { i: 6, j: 3 },
      { i: 7, j: 3 },
      { i: 8, j: 3 },
      { i: 9, j: 3 }
    ]);
  });

  it('detects a vertical five-in-a-row', () => {
    const board = makeBoard();
    const i = 10;
    for (let j = 1; j <= 5; j += 1) {
      board[i][j] = 2;
    }

    const result = checkWin(board, { i, j: 5, player: 2 }, 5);
    expect(result.winner).toBe(2);
  });

  it('detects a positive diagonal five-in-a-row', () => {
    const board = makeBoard();
    const cells = [
      [2, 1],
      [3, 2],
      [4, 3],
      [5, 4],
      [6, 5]
    ];

    for (const [i, j] of cells) {
      board[i][j] = 1;
    }

    const result = checkWin(board, { i: 6, j: 5, player: 1 }, 5);
    expect(result.winner).toBe(1);
  });

  it('detects a negative diagonal five-in-a-row', () => {
    const board = makeBoard();
    const cells = [
      [4, 6],
      [5, 5],
      [6, 4],
      [7, 3],
      [8, 2]
    ];

    for (const [i, j] of cells) {
      board[i][j] = 2;
    }

    const result = checkWin(board, { i: 8, j: 2, player: 2 }, 5);
    expect(result.winner).toBe(2);
  });

  it('detects a wrapped seam win across the i boundary', () => {
    const board = makeBoard();
    const j = 4;
    const cells = [14, 15, 0, 1, 2];
    for (const i of cells) {
      board[i][j] = 1;
    }

    const result = checkWin(board, { i: 0, j, player: 1 }, 5);
    expect(result.winner).toBe(1);
  });

  it('detects a wrapped seam win across the j boundary', () => {
    const board = makeBoard();
    const i = 7;
    const cells = [6, 7, 0, 1, 2];
    for (const j of cells) {
      board[i][j] = 2;
    }

    const result = checkWin(board, { i, j: 0, player: 2 }, 5);
    expect(result.winner).toBe(2);
    expect(result.winningCells).toEqual([
      { i: 7, j: 6 },
      { i: 7, j: 7 },
      { i: 7, j: 0 },
      { i: 7, j: 1 },
      { i: 7, j: 2 }
    ]);
  });

  it('does not report a win for a four-piece near miss', () => {
    const board = makeBoard();
    const j = 0;
    for (const i of [1, 2, 3, 4]) {
      board[i][j] = 1;
    }

    const result = checkWin(board, { i: 4, j, player: 1 }, 5);
    expect(result.winner).toBe(0);
    expect(result.winningCells).toEqual([]);
  });
});
