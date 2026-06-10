import { describe, it, expect } from 'vitest';
import type { Ball, HitRecord } from '../src/game/types';
import { stepPhysics } from '../src/game/physics';
import { TABLE_X, TABLE_Y, TABLE_WIDTH, TABLE_HEIGHT, BALL_COLORS, BALL_RADIUS, POCKET_RADIUS } from '../src/game/constants';

function makeBall(id: number, pos: { x: number; y: number }, vel: { x: number; y: number } = { x: 0, y: 0 }): Ball {
  const conf = BALL_COLORS[id] || { color: '#ffffff', stripe: false };
  return {
    id,
    number: id,
    pos: { x: pos.x, y: pos.y },
    vel: { x: vel.x, y: vel.y },
    acc: { x: 0, y: 0 },
    spin: { x: 0, y: 0 },
    color: conf.color,
    stripe: conf.stripe,
    radius: BALL_RADIUS,
    pocketed: false,
    pocketedAt: undefined,
  };
}

const POCKETS = [
  { pos: { x: TABLE_X, y: TABLE_Y }, radius: POCKET_RADIUS },
  { pos: { x: TABLE_X + TABLE_WIDTH / 2, y: TABLE_Y }, radius: POCKET_RADIUS },
  { pos: { x: TABLE_X + TABLE_WIDTH, y: TABLE_Y }, radius: POCKET_RADIUS },
  { pos: { x: TABLE_X, y: TABLE_Y + TABLE_HEIGHT }, radius: POCKET_RADIUS },
  { pos: { x: TABLE_X + TABLE_WIDTH / 2, y: TABLE_Y + TABLE_HEIGHT }, radius: POCKET_RADIUS },
  { pos: { x: TABLE_X + TABLE_WIDTH, y: TABLE_Y + TABLE_HEIGHT }, radius: POCKET_RADIUS },
];

const THRESHOLD = POCKET_RADIUS - BALL_RADIUS * 0.3;

describe('物理引擎 - 进袋检测', () => {
  it('单球位于袋口判定阈值内，stepPhysics 返回正确 pocketedBalls', () => {
    const pocket = POCKETS[0];
    const dist = THRESHOLD - 2;
    const ball = makeBall(
      1,
      {
        x: pocket.pos.x + dist * 0.707,
        y: pocket.pos.y + dist * 0.707,
      },
      { x: -20, y: -20 },
    );
    const balls = [ball];
    const hits: HitRecord[] = [];
    const r = stepPhysics(balls, 1 / 60, hits, Date.now());

    expect(ball.pocketed).toBe(true);
    expect(r.pocketedBalls).toContain(1);
    expect(r.pocketedBalls.length).toBeGreaterThanOrEqual(1);
  });

  it('多颗球同时位于不同袋口阈值内，全部被正确检测到', () => {
    const dist = THRESHOLD - 2;
    const balls = [
      makeBall(1, {
        x: POCKETS[0].pos.x + dist * 0.5,
        y: POCKETS[0].pos.y + dist * 0.866,
      }, { x: -20, y: -20 }),
      makeBall(2, {
        x: POCKETS[2].pos.x - dist * 0.5,
        y: POCKETS[2].pos.y + dist * 0.866,
      }, { x: 20, y: -20 }),
      makeBall(3, {
        x: POCKETS[5].pos.x - dist * 0.707,
        y: POCKETS[5].pos.y - dist * 0.707,
      }, { x: 20, y: 20 }),
    ];
    const hits: HitRecord[] = [];
    const r = stepPhysics(balls, 1 / 60, hits, Date.now());

    expect(r.pocketedBalls).toEqual(expect.arrayContaining([1, 2, 3]));
    expect(balls[0].pocketed).toBe(true);
    expect(balls[1].pocketed).toBe(true);
    expect(balls[2].pocketed).toBe(true);
  });

  it('白球推目标球，目标球位于袋口阈值内，进袋事件正确返回', () => {
    const pocket = POCKETS[3];
    const dist = THRESHOLD - 2;
    const target = makeBall(5, {
      x: pocket.pos.x + dist * 0.8,
      y: pocket.pos.y - dist * 0.6,
    }, { x: -1, y: 1 });
    const cue = makeBall(0, {
      x: TABLE_X + 50,
      y: TABLE_Y + TABLE_HEIGHT - 80,
    }, { x: 0, y: 2 });
    const balls = [cue, target];
    const hits: HitRecord[] = [];
    stepPhysics(balls, 1 / 60, hits, Date.now());

    expect(target.pocketed).toBe(true);
    expect(balls.some((b) => b.pocketed && b.id === 5)).toBe(true);
  });

  it('连续多步子步长，每步返回的进袋球不重复且累计正确', () => {
    const dist = THRESHOLD - 2;
    const balls = [
      makeBall(1, {
        x: POCKETS[0].pos.x + dist * 0.707,
        y: POCKETS[0].pos.y + dist * 0.707,
      }, { x: -20, y: -20 }),
      makeBall(2, {
        x: POCKETS[2].pos.x - dist * 0.707,
        y: POCKETS[2].pos.y + dist * 0.707,
      }, { x: 20, y: -20 }),
      makeBall(3, {
        x: POCKETS[5].pos.x - dist * 0.707,
        y: POCKETS[5].pos.y - dist * 0.707,
      }, { x: 20, y: 20 }),
    ];
    const hits: HitRecord[] = [];
    const seen = new Set<number>();

    for (let step = 0; step < 3; step++) {
      const r = stepPhysics(balls, 1 / 120, hits, Date.now());
      for (const id of r.pocketedBalls) seen.add(id);
    }
    const totalUnique = seen.size;

    expect(totalUnique).toBe(3);
    expect(seen).toEqual(new Set([1, 2, 3]));
    expect(balls.every((b) => b.pocketed)).toBe(true);
  });

  it('球被碰撞后进入袋口（二次进袋检测），不会漏记', () => {
    const pocket = POCKETS[0];
    const dist = THRESHOLD - 2;
    const balls = [
      makeBall(0, { x: TABLE_X + 80, y: TABLE_Y + 100 }, { x: -50, y: -50 }),
      makeBall(7, {
        x: pocket.pos.x + dist * 0.707,
        y: pocket.pos.y + dist * 0.707,
      }, { x: -10, y: -10 }),
    ];
    const hits: HitRecord[] = [];
    const allPocketed: number[] = [];
    for (let step = 0; step < 4; step++) {
      const r = stepPhysics(balls, 1 / 60, hits, Date.now() + step);
      allPocketed.push(...r.pocketedBalls);
    }

    const unique = new Set(allPocketed);
    expect(unique.has(7)).toBe(true);
    expect(balls[1].pocketed).toBe(true);
  });

  it('已进袋的球不会重复出现在多次 stepPhysics 返回中', () => {
    const dist = THRESHOLD - 2;
    const balls = [
      makeBall(5, {
        x: POCKETS[0].pos.x + dist * 0.707,
        y: POCKETS[0].pos.y + dist * 0.707,
      }, { x: -20, y: -20 }),
    ];
    const hits: HitRecord[] = [];
    const counts: Record<number, number> = { 5: 0 };

    for (let step = 0; step < 4; step++) {
      const r = stepPhysics(balls, 1 / 60, hits, Date.now() + step);
      r.pocketedBalls.forEach((id) => { counts[id] = (counts[id] ?? 0) + 1; });
    }

    expect(counts[5]).toBeLessThanOrEqual(2);
  });
});

describe('物理引擎 - 白球首击记录', () => {
  it('白球先撞击1号球，首击记录为1号球', () => {
    const balls = [
      makeBall(0, { x: TABLE_X + TABLE_WIDTH * 0.25, y: TABLE_Y + TABLE_HEIGHT / 2 }, { x: 3, y: 0 }),
      makeBall(1, { x: TABLE_X + TABLE_WIDTH * 0.25 + 2 * BALL_RADIUS + 0.5, y: TABLE_Y + TABLE_HEIGHT / 2 }, { x: 0, y: 0 }),
    ];
    const hits: HitRecord[] = [];
    for (let i = 0; i < 60; i++) {
      stepPhysics(balls, 1 / 120, hits, Date.now() + i);
    }
    expect(hits.length).toBeGreaterThanOrEqual(1);
    expect(hits[0].ballId).toBe(1);
  });

  it('白球同时接触多球时，只记录一次首击', () => {
    const balls = [
      makeBall(0, { x: TABLE_X + 200, y: TABLE_Y + 200 }, { x: 100, y: 0 }),
      makeBall(1, { x: TABLE_X + 200 + 2 * BALL_RADIUS + 0.5, y: TABLE_Y + 200 }, { x: 0, y: 0 }),
      makeBall(2, { x: TABLE_X + 200 + 2 * BALL_RADIUS + 0.5, y: TABLE_Y + 200 + 2 * BALL_RADIUS + 0.5 }, { x: 0, y: 0 }),
    ];
    const hits: HitRecord[] = [];
    for (let i = 0; i < 15; i++) {
      stepPhysics(balls, 1 / 120, hits, Date.now() + i);
    }
    expect(hits.length).toBeGreaterThanOrEqual(1);
    const uniqueFirstBalls = new Set(hits.slice(0, 1).map((h) => h.ballId));
    expect(uniqueFirstBalls.size).toBe(1);
  });
});
