import type { Ball, Pocket, Table } from './types';

export const BALL_RADIUS = 12;
export const BALL_DIAMETER = BALL_RADIUS * 2;
export const BALL_MASS = 1;

export const FRICTION = 0.988;
export const SPIN_FRICTION = 0.97;
export const MIN_VELOCITY = 0.02;
export const RESTITUTION_BALL = 0.96;
export const RESTITUTION_WALL = 0.82;

export const TABLE_WIDTH = 800;
export const TABLE_HEIGHT = 400;
export const TABLE_X = 40;
export const TABLE_Y = 40;
export const TABLE_BORDER = 24;
export const CUSHION_WIDTH = 12;
export const POCKET_RADIUS = 22;

export const MAX_POWER = 28;
export const POWER_ACCELERATION = 1.8;

export const POCKETS: Pocket[] = [
  { pos: { x: TABLE_X, y: TABLE_Y }, radius: POCKET_RADIUS },
  { pos: { x: TABLE_X + TABLE_WIDTH / 2, y: TABLE_Y - 4 }, radius: POCKET_RADIUS - 2 },
  { pos: { x: TABLE_X + TABLE_WIDTH, y: TABLE_Y }, radius: POCKET_RADIUS },
  { pos: { x: TABLE_X, y: TABLE_Y + TABLE_HEIGHT }, radius: POCKET_RADIUS },
  { pos: { x: TABLE_X + TABLE_WIDTH / 2, y: TABLE_Y + TABLE_HEIGHT + 4 }, radius: POCKET_RADIUS - 2 },
  { pos: { x: TABLE_X + TABLE_WIDTH, y: TABLE_Y + TABLE_HEIGHT }, radius: POCKET_RADIUS },
];

export const TABLE: Table = {
  width: TABLE_WIDTH,
  height: TABLE_HEIGHT,
  x: TABLE_X,
  y: TABLE_Y,
  borderWidth: TABLE_BORDER,
  pockets: POCKETS,
};

export const PLAYFIELD_LEFT = TABLE_X + CUSHION_WIDTH;
export const PLAYFIELD_RIGHT = TABLE_X + TABLE_WIDTH - CUSHION_WIDTH;
export const PLAYFIELD_TOP = TABLE_Y + CUSHION_WIDTH;
export const PLAYFIELD_BOTTOM = TABLE_Y + TABLE_HEIGHT - CUSHION_WIDTH;

export const BALL_COLORS: Record<number, { color: string; stripe: boolean }> = {
  0: { color: '#F5F0E0', stripe: false },
  1: { color: '#F5D033', stripe: false },
  2: { color: '#1E40AF', stripe: false },
  3: { color: '#DC2626', stripe: false },
  4: { color: '#4C1D95', stripe: false },
  5: { color: '#EA580C', stripe: false },
  6: { color: '#166534', stripe: false },
  7: { color: '#7C2D12', stripe: false },
  8: { color: '#0F0F0F', stripe: false },
  9: { color: '#F5D033', stripe: true },
  10: { color: '#1E40AF', stripe: true },
  11: { color: '#DC2626', stripe: true },
  12: { color: '#4C1D95', stripe: true },
  13: { color: '#EA580C', stripe: true },
  14: { color: '#166534', stripe: true },
  15: { color: '#7C2D12', stripe: true },
};

export const FOUL_MESSAGES: Record<string, string> = {
  CUE_BALL_POCKETED: '犯规：白球落袋！对方获得自由球',
  WRONG_FIRST_CONTACT: '犯规：先碰到了非目标球！',
  NO_BALL_HIT: '犯规：未击中任何球！',
  EIGHT_BALL_POCKETED_EARLY: '犯规：8号球被提前打入！',
};

export function createBall(id: number, x: number, y: number): Ball {
  const colorInfo = BALL_COLORS[id] || BALL_COLORS[1];
  return {
    id,
    pos: { x, y },
    vel: { x: 0, y: 0 },
    acc: { x: 0, y: 0 },
    radius: BALL_RADIUS,
    color: colorInfo.color,
    stripe: colorInfo.stripe,
    pocketed: false,
    pocketedAt: null,
    spin: { x: 0, y: 0 },
    number: id,
  };
}
