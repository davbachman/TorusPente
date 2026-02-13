const DIRECTIONS = [
  [1, 0],
  [0, 1],
  [1, 1],
  [1, -1]
];

function wrapIndex(value, size) {
  const wrapped = value % size;
  return wrapped < 0 ? wrapped + size : wrapped;
}

function gcd(a, b) {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y !== 0) {
    const next = x % y;
    x = y;
    y = next;
  }
  return x || 1;
}

function lcm(a, b) {
  return Math.abs((a * b) / gcd(a, b));
}

function cycleLength(uSize, vSize, di, dj) {
  const uPeriod = di === 0 ? 1 : uSize / gcd(uSize, di);
  const vPeriod = dj === 0 ? 1 : vSize / gcd(vSize, dj);
  return lcm(uPeriod, vPeriod);
}

function collectLineCells(board, move, di, dj) {
  const uSize = board.length;
  const vSize = board[0].length;
  const maxSteps = cycleLength(uSize, vSize, di, dj) - 1;

  const negative = [];
  let ni = move.i;
  let nj = move.j;
  for (let step = 0; step < maxSteps; step += 1) {
    ni = wrapIndex(ni - di, uSize);
    nj = wrapIndex(nj - dj, vSize);
    if (board[ni][nj] !== move.player) {
      break;
    }
    negative.push({ i: ni, j: nj });
  }

  const positive = [];
  let pi = move.i;
  let pj = move.j;
  for (let step = 0; step < maxSteps; step += 1) {
    pi = wrapIndex(pi + di, uSize);
    pj = wrapIndex(pj + dj, vSize);
    if (board[pi][pj] !== move.player) {
      break;
    }
    positive.push({ i: pi, j: pj });
  }

  return {
    cells: negative.reverse().concat([{ i: move.i, j: move.j }], positive),
    moveIndex: negative.length
  };
}

function selectWinningFive(cells, moveIndex, needed) {
  const startMin = Math.max(0, moveIndex - needed + 1);
  const startMax = Math.min(moveIndex, cells.length - needed);
  const start = Math.min(startMin, startMax);
  return cells.slice(start, start + needed);
}

/**
 * @param {number[][]} board
 * @param {{ i: number, j: number, player: number } | null} move
 * @param {number} needed
 * @returns {{ winner: number, direction: number[] | null, count: number, winningCells: {i:number,j:number}[] }}
 */
export function checkWin(board, move, needed = 5) {
  if (!move || !move.player) {
    return { winner: 0, direction: null, count: 0, winningCells: [] };
  }

  for (const direction of DIRECTIONS) {
    const [di, dj] = direction;
    const { cells, moveIndex } = collectLineCells(board, move, di, dj);
    const count = cells.length;
    if (count >= needed) {
      return {
        winner: move.player,
        direction: [di, dj],
        count,
        winningCells: selectWinningFive(cells, moveIndex, needed)
      };
    }
  }

  return { winner: 0, direction: null, count: 0, winningCells: [] };
}
