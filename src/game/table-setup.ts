import {
  PLAYFIELD_LEFT,
  PLAYFIELD_RIGHT,
  PLAYFIELD_TOP,
  PLAYFIELD_BOTTOM,
  BALL_DIAMETER,
  createBall,
} from './constants';
import type { Ball, GameMode } from './types';

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function setupBalls(mode: GameMode): Ball[] {
  const balls: Ball[] = [];
  const cueX = PLAYFIELD_LEFT + (PLAYFIELD_RIGHT - PLAYFIELD_LEFT) * 0.25;
  const centerY = (PLAYFIELD_TOP + PLAYFIELD_BOTTOM) / 2;

  const cueBall = createBall(0, cueX, centerY);
  balls.push(cueBall);

  const rackX = PLAYFIELD_LEFT + (PLAYFIELD_RIGHT - PLAYFIELD_LEFT) * 0.7;

  if (mode === '8ball') {
    const rackOrder: number[] = [];
    const solids = [1, 2, 3, 4, 5, 6, 7];
    const stripes = [9, 10, 11, 12, 13, 14, 15];
    const shuffledSolids = shuffle(solids);
    const shuffledStripes = shuffle(stripes);

    rackOrder[0] = shuffledSolids[0];
    rackOrder[4] = 8;
    rackOrder[1] = shuffledStripes[0];
    rackOrder[2] = shuffledSolids[1];
    rackOrder[3] = shuffledStripes[1];
    rackOrder[5] = shuffledStripes[2];
    rackOrder[6] = shuffledSolids[2];
    rackOrder[7] = shuffledStripes[3];
    rackOrder[8] = shuffledSolids[3];
    rackOrder[9] = shuffledSolids[4];
    rackOrder[10] = shuffledStripes[4];
    rackOrder[11] = shuffledSolids[5];
    rackOrder[12] = shuffledStripes[5];
    rackOrder[13] = shuffledSolids[6];
    rackOrder[14] = shuffledStripes[6];

    const rows = 5;
    let idx = 0;
    for (let row = 0; row < rows; row++) {
      const ballsInRow = row + 1;
      const rowY = centerY - (row * BALL_DIAMETER * Math.sin(Math.PI / 3)) / 2;
      for (let col = 0; col < ballsInRow; col++) {
        const x = rackX + row * BALL_DIAMETER * Math.cos(Math.PI / 6);
        const y = rowY + col * BALL_DIAMETER * Math.sin(Math.PI / 3) - ((row - 1) * BALL_DIAMETER * Math.sin(Math.PI / 3)) / 2;
        const ballId = rackOrder[idx++];
        if (ballId !== undefined) {
          balls.push(createBall(ballId, x, y + (col - row / 2) * BALL_DIAMETER));
        }
      }
    }
  } else {
    const diamondPositions = [
      { row: 0, col: 0, id: 1 },
      { row: 1, col: 0, id: 2 },
      { row: 1, col: 1, id: 3 },
      { row: 2, col: 0, id: 4 },
      { row: 2, col: 1, id: 9 },
      { row: 2, col: 2, id: 5 },
      { row: 3, col: 0, id: 6 },
      { row: 3, col: 1, id: 7 },
      { row: 4, col: 0, id: 8 },
    ];

    for (const pos of diamondPositions) {
      const x = rackX + pos.row * BALL_DIAMETER * Math.cos(Math.PI / 6);
      const y = centerY + (pos.col - pos.row / 2) * BALL_DIAMETER * 0.98;
      balls.push(createBall(pos.id, x, y));
    }
  }

  return balls;
}

export function resetCueBall(): Ball {
  const cueX = PLAYFIELD_LEFT + (PLAYFIELD_RIGHT - PLAYFIELD_LEFT) * 0.25;
  const centerY = (PLAYFIELD_TOP + PLAYFIELD_BOTTOM) / 2;
  return createBall(0, cueX, centerY);
}

export function placeCueBall(x: number, y: number): Ball {
  const clampedX = Math.max(PLAYFIELD_LEFT + BALL_DIAMETER, Math.min(PLAYFIELD_RIGHT - BALL_DIAMETER, x));
  const clampedY = Math.max(PLAYFIELD_TOP + BALL_DIAMETER, Math.min(PLAYFIELD_BOTTOM - BALL_DIAMETER, y));
  return createBall(0, clampedX, clampedY);
}
