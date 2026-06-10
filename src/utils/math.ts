import type { Vec2 } from '../game/types';

export const v = {
  add(a: Vec2, b: Vec2): Vec2 {
    return { x: a.x + b.x, y: a.y + b.y };
  },
  sub(a: Vec2, b: Vec2): Vec2 {
    return { x: a.x - b.x, y: a.y - b.y };
  },
  mul(a: Vec2, s: number): Vec2 {
    return { x: a.x * s, y: a.y * s };
  },
  div(a: Vec2, s: number): Vec2 {
    return s === 0 ? { x: 0, y: 0 } : { x: a.x / s, y: a.y / s };
  },
  dot(a: Vec2, b: Vec2): number {
    return a.x * b.x + a.y * b.y;
  },
  cross(a: Vec2, b: Vec2): number {
    return a.x * b.y - a.y * b.x;
  },
  len(a: Vec2): number {
    return Math.sqrt(a.x * a.x + a.y * a.y);
  },
  len2(a: Vec2): number {
    return a.x * a.x + a.y * a.y;
  },
  norm(a: Vec2): Vec2 {
    const l = v.len(a);
    return l === 0 ? { x: 0, y: 0 } : { x: a.x / l, y: a.y / l };
  },
  dist(a: Vec2, b: Vec2): number {
    return v.len(v.sub(a, b));
  },
  dist2(a: Vec2, b: Vec2): number {
    return v.len2(v.sub(a, b));
  },
  reflect(a: Vec2, normal: Vec2): Vec2 {
    const d = 2 * v.dot(a, normal);
    return { x: a.x - d * normal.x, y: a.y - d * normal.y };
  },
  rotate(a: Vec2, angle: number): Vec2 {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return { x: a.x * cos - a.y * sin, y: a.x * sin + a.y * cos };
  },
  fromAngle(angle: number, length = 1): Vec2 {
    return { x: Math.cos(angle) * length, y: Math.sin(angle) * length };
  },
  angle(a: Vec2): number {
    return Math.atan2(a.y, a.x);
  },
  angleBetween(a: Vec2, b: Vec2): number {
    return Math.atan2(v.cross(a, b), v.dot(a, b));
  },
  lerp(a: Vec2, b: Vec2, t: number): Vec2 {
    return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
  },
  clamp(a: Vec2, minLen: number, maxLen: number): Vec2 {
    const l = v.len(a);
    if (l === 0) return a;
    const nl = Math.max(minLen, Math.min(maxLen, l));
    return v.mul(a, nl / l);
  },
  zero(): Vec2 {
    return { x: 0, y: 0 };
  },
  copy(a: Vec2): Vec2 {
    return { x: a.x, y: a.y };
  },
};

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function randRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

export function angleDiff(a: number, b: number): number {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}
