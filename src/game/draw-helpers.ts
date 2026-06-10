import type { Ball, Table } from './types';
import {
  BALL_RADIUS,
  TABLE_BORDER,
  CUSHION_WIDTH,
} from './constants';

export function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16),
  };
}

export function rgbToHex(r: number, g: number, b: number): string {
  const t = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return `#${t(r)}${t(g)}${t(b)}`;
}

export function lighten(hex: string, pct: number): string {
  const { r, g, b } = hexToRgb(hex);
  return rgbToHex(r + (255 - r) * pct, g + (255 - g) * pct, b + (255 - b) * pct);
}

export function darken(hex: string, pct: number): string {
  const { r, g, b } = hexToRgb(hex);
  return rgbToHex(r * (1 - pct), g * (1 - pct), b * (1 - pct));
}

export function drawTable(ctx: CanvasRenderingContext2D, t: Table): void {
  const bx = t.x - TABLE_BORDER;
  const by = t.y - TABLE_BORDER;
  const bw = t.width + TABLE_BORDER * 2;
  const bh = t.height + TABLE_BORDER * 2;

  const grad = ctx.createLinearGradient(bx, by, bx, by + bh);
  grad.addColorStop(0, '#5a3a1f');
  grad.addColorStop(0.5, '#3d2817');
  grad.addColorStop(1, '#2a1a0e');
  ctx.fillStyle = grad;
  roundRect(ctx, bx, by, bw, bh, 18);
  ctx.fill();

  ctx.strokeStyle = '#d4a84b';
  ctx.lineWidth = 3;
  roundRect(ctx, bx + 3, by + 3, bw - 6, bh - 6, 16);
  ctx.stroke();

  ctx.save();
  ctx.beginPath();
  roundRect(ctx, t.x, t.y, t.width, t.height, 8);
  ctx.clip();

  const feltGrad = ctx.createRadialGradient(
    t.x + t.width / 2,
    t.y + t.height / 2,
    50,
    t.x + t.width / 2,
    t.y + t.height / 2,
    Math.max(t.width, t.height),
  );
  feltGrad.addColorStop(0, '#257a50');
  feltGrad.addColorStop(0.7, '#1a5f3c');
  feltGrad.addColorStop(1, '#12452b');
  ctx.fillStyle = feltGrad;
  ctx.fillRect(t.x, t.y, t.width, t.height);

  ctx.globalAlpha = 0.06;
  for (let y = t.y; y < t.y + t.height; y += 3) {
    ctx.strokeStyle = y % 6 === 0 ? '#000' : '#fff';
    ctx.beginPath();
    ctx.moveTo(t.x, y);
    ctx.lineTo(t.x + t.width, y);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  ctx.restore();

  ctx.fillStyle = '#0a0805';
  for (const p of t.pockets) {
    ctx.beginPath();
    ctx.arc(p.pos.x, p.pos.y, p.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#1a0f05';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  ctx.strokeStyle = '#0e2a1a';
  ctx.lineWidth = CUSHION_WIDTH;
  roundRect(
    ctx,
    t.x + CUSHION_WIDTH / 2,
    t.y + CUSHION_WIDTH / 2,
    t.width - CUSHION_WIDTH,
    t.height - CUSHION_WIDTH,
    4,
  );
  ctx.stroke();

  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  const headX = t.x + t.width * 0.25;
  ctx.moveTo(headX, t.y + CUSHION_WIDTH);
  ctx.lineTo(headX, t.y + t.height - CUSHION_WIDTH);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.beginPath();
  ctx.arc(headX, (t.y + t.height) / 2, BALL_RADIUS * 3, -Math.PI / 2.2, Math.PI / 2.2);
  ctx.stroke();
}

export function drawBall(ctx: CanvasRenderingContext2D, b: Ball): void {
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur = 6;
  ctx.shadowOffsetX = 2;
  ctx.shadowOffsetY = 3;

  const grad = ctx.createRadialGradient(
    b.pos.x - b.radius * 0.35,
    b.pos.y - b.radius * 0.35,
    1,
    b.pos.x,
    b.pos.y,
    b.radius,
  );
  grad.addColorStop(0, lighten(b.color, 0.5));
  grad.addColorStop(0.45, b.color);
  grad.addColorStop(1, darken(b.color, 0.4));

  ctx.beginPath();
  ctx.arc(b.pos.x, b.pos.y, b.radius, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();

  ctx.shadowColor = 'transparent';

  if (b.stripe) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(b.pos.x, b.pos.y, b.radius, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = '#F5F0E0';
    ctx.fillRect(b.pos.x - b.radius, b.pos.y - b.radius * 0.45, b.radius * 2, b.radius * 0.9);
    ctx.restore();

    ctx.beginPath();
    ctx.arc(b.pos.x, b.pos.y, b.radius, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 0.8;
    ctx.stroke();
  }

  if (b.id !== 0 && b.number !== undefined) {
    ctx.fillStyle = '#F5F0E0';
    ctx.beginPath();
    ctx.arc(b.pos.x, b.pos.y, b.radius * 0.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = b.id === 8 ? '#000' : '#1a1a1a';
    ctx.font = `bold ${Math.floor(b.radius * 0.8)}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(b.id), b.pos.x, b.pos.y + 0.5);
  }

  ctx.beginPath();
  ctx.arc(b.pos.x - b.radius * 0.35, b.pos.y - b.radius * 0.35, b.radius * 0.25, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.fill();

  ctx.restore();
}

export function clearCanvas(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  ctx.fillStyle = '#0a0f0a';
  ctx.fillRect(0, 0, w, h);
}
