import {
  FRICTION,
  SPIN_FRICTION,
  MIN_VELOCITY,
  RESTITUTION_BALL,
  RESTITUTION_WALL,
  PLAYFIELD_LEFT,
  PLAYFIELD_RIGHT,
  PLAYFIELD_TOP,
  PLAYFIELD_BOTTOM,
  BALL_RADIUS,
  POCKETS,
} from './constants';
import type { Ball, HitRecord } from './types';
import { v } from '../utils/math';

export interface StepResult {
  ballCollisions: Array<{ a: number; b: number }>;
  wallCollisions: Array<{ ballId: number }>;
  pocketedBalls: number[];
}

export function stepPhysics(
  balls: Ball[],
  dt: number,
  hitRecords?: HitRecord[],
  timestamp?: number,
): StepResult {
  const result: StepResult = {
    ballCollisions: [],
    wallCollisions: [],
    pocketedBalls: [],
  };

  const activeBalls = balls.filter((b) => !b.pocketed);

  for (const ball of activeBalls) {
    ball.vel.x += ball.acc.x * dt;
    ball.vel.y += ball.acc.y * dt;

    if (v.len(ball.spin) > 0.01) {
      ball.vel.x += ball.spin.x * 0.002;
      ball.vel.y += ball.spin.y * 0.002;
    }

    ball.pos.x += ball.vel.x;
    ball.pos.y += ball.vel.y;

    ball.vel.x *= Math.pow(FRICTION, dt * 60);
    ball.vel.y *= Math.pow(FRICTION, dt * 60);
    ball.spin.x *= Math.pow(SPIN_FRICTION, dt * 60);
    ball.spin.y *= Math.pow(SPIN_FRICTION, dt * 60);

    if (Math.abs(ball.vel.x) < MIN_VELOCITY) ball.vel.x = 0;
    if (Math.abs(ball.vel.y) < MIN_VELOCITY) ball.vel.y = 0;
  }

  const cueBallFirstHitRecorded = () => hitRecords && hitRecords.length > 0;

  for (let i = 0; i < activeBalls.length; i++) {
    const a = activeBalls[i];
    for (let j = i + 1; j < activeBalls.length; j++) {
      const b = activeBalls[j];
      if (resolveBallCollision(a, b)) {
        result.ballCollisions.push({ a: a.id, b: b.id });
        if (hitRecords && timestamp !== undefined && !cueBallFirstHitRecorded()) {
          if (a.id === 0) {
            hitRecords.push({ ballId: b.id, timestamp });
          } else if (b.id === 0) {
            hitRecords.push({ ballId: a.id, timestamp });
          }
        }
      }
    }
  }

  const checkPockets = () => {
    for (const ball of activeBalls) {
      if (ball.pocketed) continue;
      for (const pocket of POCKETS) {
        const d = v.dist(ball.pos, pocket.pos);
        if (d < pocket.radius - BALL_RADIUS * 0.3) {
          ball.pocketed = true;
          ball.pocketedAt = timestamp || Date.now();
          ball.vel.x = 0;
          ball.vel.y = 0;
          result.pocketedBalls.push(ball.id);
          break;
        }
      }
    }
  };

  checkPockets();

  for (const ball of activeBalls) {
    if (ball.pocketed) continue;
    if (resolveWallCollision(ball)) {
      result.wallCollisions.push({ ballId: ball.id });
    }
  }

  checkPockets();

  return result;
}

function resolveBallCollision(a: Ball, b: Ball): boolean {
  const delta = v.sub(b.pos, a.pos);
  const dist = v.len(delta);
  const minDist = a.radius + b.radius;

  if (dist >= minDist || dist === 0) return false;

  const normal = v.div(delta, dist);
  const overlap = minDist - dist;

  const totalMass = 2;
  a.pos.x -= normal.x * overlap * (1 / totalMass);
  a.pos.y -= normal.y * overlap * (1 / totalMass);
  b.pos.x += normal.x * overlap * (1 / totalMass);
  b.pos.y += normal.y * overlap * (1 / totalMass);

  const relVel = v.sub(a.vel, b.vel);
  const velAlongNormal = v.dot(relVel, normal);
  if (velAlongNormal <= 0) return false;

  const impulse = (-(1 + RESTITUTION_BALL) * velAlongNormal) / (1 / 1 + 1 / 1);

  const impulseVec = v.mul(normal, impulse);
  a.vel.x += impulseVec.x;
  a.vel.y += impulseVec.y;
  b.vel.x -= impulseVec.x;
  b.vel.y -= impulseVec.y;

  const tangent = { x: -normal.y, y: normal.x };
  const relVelTan = v.dot(relVel, tangent);
  const frictionImpulse = -relVelTan * 0.08;
  a.vel.x += tangent.x * frictionImpulse;
  a.vel.y += tangent.y * frictionImpulse;
  b.vel.x -= tangent.x * frictionImpulse;
  b.vel.y -= tangent.y * frictionImpulse;

  return true;
}

function resolveWallCollision(ball: Ball): boolean {
  let collided = false;

  if (ball.pos.x - ball.radius < PLAYFIELD_LEFT) {
    ball.pos.x = PLAYFIELD_LEFT + ball.radius;
    ball.vel.x = -ball.vel.x * RESTITUTION_WALL;
    collided = true;
  }
  if (ball.pos.x + ball.radius > PLAYFIELD_RIGHT) {
    ball.pos.x = PLAYFIELD_RIGHT - ball.radius;
    ball.vel.x = -ball.vel.x * RESTITUTION_WALL;
    collided = true;
  }
  if (ball.pos.y - ball.radius < PLAYFIELD_TOP) {
    ball.pos.y = PLAYFIELD_TOP + ball.radius;
    ball.vel.y = -ball.vel.y * RESTITUTION_WALL;
    collided = true;
  }
  if (ball.pos.y + ball.radius > PLAYFIELD_BOTTOM) {
    ball.pos.y = PLAYFIELD_BOTTOM - ball.radius;
    ball.vel.y = -ball.vel.y * RESTITUTION_WALL;
    collided = true;
  }

  return collided;
}

export function allBallsStopped(balls: Ball[]): boolean {
  for (const ball of balls) {
    if (ball.pocketed) continue;
    if (Math.abs(ball.vel.x) > 0.001 || Math.abs(ball.vel.y) > 0.001) return false;
  }
  return true;
}

export function applyShot(
  balls: Ball[],
  aimAngle: number,
  power: number,
  maxPower: number,
  spinX = 0,
  spinY = 0,
): void {
  const cueBall = balls.find((b) => b.id === 0);
  if (!cueBall) return;

  const speed = power * maxPower;
  cueBall.vel.x = Math.cos(aimAngle) * speed;
  cueBall.vel.y = Math.sin(aimAngle) * speed;
  cueBall.spin.x = spinX * maxPower * 2;
  cueBall.spin.y = spinY * maxPower * 2;
}

export function runPhysicsUntilStopped(
  balls: Ball[],
  maxSteps = 5000,
): { hitRecords: HitRecord[]; pocketedBalls: number[]; steps: number } {
  const hitRecords: HitRecord[] = [];
  const pocketedBalls: Set<number> = new Set();
  let steps = 0;

  while (steps < maxSteps) {
    const result = stepPhysics(balls, 1 / 60, hitRecords, steps);
    for (const id of result.pocketedBalls) {
      pocketedBalls.add(id);
    }
    steps++;
    if (allBallsStopped(balls)) break;
  }

  return {
    hitRecords,
    pocketedBalls: Array.from(pocketedBalls),
    steps,
  };
}
