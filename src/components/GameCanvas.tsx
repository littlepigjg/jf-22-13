import { useEffect, useRef } from 'react';
import { useGameStore } from '../stores/useGameStore';
import type { Ball, Table } from '../game/types';
import {
  BALL_RADIUS,
  PLAYFIELD_LEFT,
  PLAYFIELD_RIGHT,
  PLAYFIELD_TOP,
  PLAYFIELD_BOTTOM,
} from '../game/constants';
import { v } from '../utils/math';
import { predictShot } from '../game/prediction';
import { drawTable, drawBall, clearCanvas, roundRect } from '../game/draw-helpers';

const CANVAS_W = 880;
const CANVAS_H = 480;

export default function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(performance.now());
  const mouseRef = useRef({ x: 0, y: 0 });
  const animRef = useRef({ cueShrink: 0 });

  const phase = useGameStore((s) => s.phase);
  const balls = useGameStore((s) => s.balls);
  const table = useGameStore((s) => s.table);
  const aimAngle = useGameStore((s) => s.aimAngle);
  const power = useGameStore((s) => s.power);
  const isCharging = useGameStore((s) => s.isCharging);
  const showAimLine = useGameStore((s) => s.showAimLine);
  const freeBall = useGameStore((s) => s.freeBall);
  const foul = useGameStore((s) => s.foul);
  const foulMessage = useGameStore((s) => s.foulMessage);
  const winner = useGameStore((s) => s.winner);
  const currentPlayerId = useGameStore((s) => s.currentPlayerId);
  const players = useGameStore((s) => s.players);

  const setAimAngle = useGameStore((s) => s.setAimAngle);
  const startCharge = useGameStore((s) => s.startCharge);
  const updateCharge = useGameStore((s) => s.updateCharge);
  const releaseShot = useGameStore((s) => s.releaseShot);
  const simulateStep = useGameStore((s) => s.simulateStep);
  const resolveTurn = useGameStore((s) => s.resolveTurn);
  const aiTakeTurn = useGameStore((s) => s.aiTakeTurn);
  const placeFreeBall = useGameStore((s) => s.placeFreeBall);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;

    let lastAITime = 0;

    const loop = (time: number) => {
      const dt = Math.min(0.05, (time - lastTimeRef.current) / 1000);
      lastTimeRef.current = time;

      const curPhase = useGameStore.getState().phase;
      const curBalls = useGameStore.getState().balls;

      if (curPhase === 'charging') {
        updateCharge(dt);
        animRef.current.cueShrink = Math.min(0.6, power * 0.5);
      } else {
        animRef.current.cueShrink *= 0.9;
      }

      if (curPhase === 'simulating') {
        simulateStep();
      }

      if (curPhase === 'resolving') {
        resolveTurn();
      }

      if (curPhase === 'aiming' && !freeBall) {
        const curPlayer = players.find((p) => p.id === currentPlayerId);
        if (curPlayer?.isAI && time - lastAITime > 800) {
          lastAITime = time;
          aiTakeTurn();
        }
      }

      draw(ctx, curBalls, table);

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [balls.length, freeBall, currentPlayerId, players]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const toLocal = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const sx = canvas.width / rect.width;
      const sy = canvas.height / rect.height;
      return {
        x: (e.clientX - rect.left) * sx,
        y: (e.clientY - rect.top) * sy,
      };
    };

    const onMove = (e: MouseEvent) => {
      const pt = toLocal(e);
      mouseRef.current = pt;
      const cue = balls.find((b) => b.id === 0);
      if (cue && !freeBall) {
        const dx = pt.x - cue.pos.x;
        const dy = pt.y - cue.pos.y;
        if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
          setAimAngle(Math.atan2(dy, dx));
        }
      }
    };

    const onDown = (e: MouseEvent) => {
      const pt = toLocal(e);
      if (freeBall) {
        placeFreeBall(pt.x, pt.y);
        return;
      }
      if (phase === 'aiming') {
        const curPlayer = players.find((p) => p.id === currentPlayerId);
        if (!curPlayer?.isAI) {
          startCharge();
        }
      }
    };

    const onUp = () => {
      if (isCharging) {
        releaseShot();
      }
    };

    canvas.addEventListener('mousemove', onMove);
    canvas.addEventListener('mousedown', onDown);
    window.addEventListener('mouseup', onUp);
    return () => {
      canvas.removeEventListener('mousemove', onMove);
      canvas.removeEventListener('mousedown', onDown);
      window.removeEventListener('mouseup', onUp);
    };
  }, [balls, phase, freeBall, isCharging, currentPlayerId, players]);

  const draw = (ctx: CanvasRenderingContext2D, curBalls: Ball[], t: Table) => {
    ctx.fillStyle = '#0a0f0a';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    drawTable(ctx, t);

    if (showAimLine && phase === 'aiming' && !freeBall) {
      const activePower = power > 0 ? power : 0.5;
      const prediction = predictShot(curBalls, aimAngle, activePower, 1, 120);
      drawAimLine(ctx, curBalls, prediction);
    }

    if (freeBall) {
      drawFreeBallHint(ctx);
    }

    for (const b of curBalls) {
      if (!b.pocketed) drawBall(ctx, b);
    }

    if (phase === 'aiming' && !freeBall) {
      const cue = curBalls.find((bb) => bb.id === 0);
      const curPlayer = players.find((p) => p.id === currentPlayerId);
      if (cue && !curPlayer?.isAI) {
        drawCue(ctx, cue, aimAngle, power);
      }
    }

    if (foulMessage && phase !== 'gameover') {
      drawFoulBanner(ctx, foulMessage);
    }

    if (winner) {
      drawWinnerBanner(ctx, winner.name);
    }
  };

  const drawCue = (ctx: CanvasRenderingContext2D, cue: Ball, angle: number, pwr: number) => {
    const shrink = animRef.current.cueShrink;
    const dist = BALL_RADIUS * 2 + 18 - shrink * 50;
    const startX = cue.pos.x + Math.cos(angle + Math.PI) * dist;
    const startY = cue.pos.y + Math.sin(angle + Math.PI) * dist;
    const endX = startX + Math.cos(angle + Math.PI) * 220;
    const endY = startY + Math.sin(angle + Math.PI) * 220;

    ctx.save();
    ctx.strokeStyle = '#f7f1e0';
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.stroke();

    const tipLen = 30;
    const tipEndX = cue.pos.x + Math.cos(angle + Math.PI) * (BALL_RADIUS + 2);
    const tipEndY = cue.pos.y + Math.sin(angle + Math.PI) * (BALL_RADIUS + 2);
    const tipStartX = startX + Math.cos(angle) * 8;
    const tipStartY = startY + Math.sin(angle) * 8;
    ctx.strokeStyle = '#2a6a3f';
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.moveTo(tipStartX, tipStartY);
    ctx.lineTo(tipEndX, tipEndY);
    ctx.stroke();

    const tipTipX = cue.pos.x + Math.cos(angle + Math.PI) * (BALL_RADIUS + 1);
    const tipTipY = cue.pos.y + Math.sin(angle + Math.PI) * (BALL_RADIUS + 1);
    ctx.strokeStyle = '#11331f';
    ctx.lineWidth = 11;
    ctx.beginPath();
    ctx.moveTo(tipEndX, tipEndY);
    ctx.lineTo(tipTipX, tipTipY);
    ctx.stroke();

    const buttEndX = endX;
    const buttEndY = endY;
    ctx.strokeStyle = '#3d2817';
    ctx.lineWidth = 12;
    ctx.beginPath();
    ctx.moveTo(startX + Math.cos(angle + Math.PI) * 40, startY + Math.sin(angle + Math.PI) * 40);
    ctx.lineTo(buttEndX, buttEndY);
    ctx.stroke();

    ctx.strokeStyle = '#d4a84b';
    ctx.lineWidth = 2;
    for (let i = 1; i <= 3; i++) {
      const tt = 50 + i * 35;
      const x1 = startX + Math.cos(angle + Math.PI) * tt;
      const y1 = startY + Math.sin(angle + Math.PI) * tt;
      const x2 = x1 + Math.cos(angle + Math.PI) * 4;
      const y2 = y1 + Math.sin(angle + Math.PI) * 4;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }

    ctx.restore();
  };

  const drawAimLine = (ctx: CanvasRenderingContext2D, curBalls: Ball[], prediction: ReturnType<typeof predictShot>) => {
    const cue = curBalls.find((b) => b.id === 0);
    if (!cue) return;

    for (let i = 0; i < prediction.segments.length; i++) {
      const seg = prediction.segments[i];
      if (!seg.isCuePath) continue;

      ctx.save();
      ctx.strokeStyle = seg.isSolid ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.3)';
      ctx.lineWidth = 1.8;
      ctx.setLineDash(seg.isSolid ? [] : [6, 6]);
      ctx.lineDashOffset = 0;
      ctx.beginPath();
      ctx.moveTo(seg.start.x, seg.start.y);
      ctx.lineTo(seg.end.x, seg.end.y);
      ctx.stroke();
      ctx.restore();
    }

    if (prediction.targetBallPath) {
      ctx.save();
      ctx.strokeStyle = 'rgba(245,208,51,0.6)';
      ctx.lineWidth = 1.6;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(prediction.targetBallPath.start.x, prediction.targetBallPath.start.y);
      ctx.lineTo(prediction.targetBallPath.end.x, prediction.targetBallPath.end.y);
      ctx.stroke();
      ctx.restore();
    }

    if (prediction.willPocket.length > 0) {
      ctx.save();
      ctx.fillStyle = 'rgba(74,222,128,0.85)';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'left';
      const ids = prediction.willPocket.filter((i) => i !== 0).join(', ');
      if (ids) {
        ctx.fillText(`预测进球: ${ids}号`, cue.pos.x + 20, cue.pos.y - 25);
      }
      if (prediction.willPocket.includes(0)) {
        ctx.fillStyle = 'rgba(248,113,113,0.9)';
        ctx.fillText('⚠ 白球可能落袋', cue.pos.x + 20, cue.pos.y - 45);
      }
      ctx.restore();
    }
  };

  const drawFreeBallHint = (ctx: CanvasRenderingContext2D) => {
    ctx.save();
    ctx.fillStyle = 'rgba(245,208,75,0.1)';
    ctx.fillRect(PLAYFIELD_LEFT, PLAYFIELD_TOP, PLAYFIELD_RIGHT - PLAYFIELD_LEFT, PLAYFIELD_BOTTOM - PLAYFIELD_TOP);
    ctx.strokeStyle = 'rgba(245,208,75,0.7)';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 4]);
    ctx.strokeRect(PLAYFIELD_LEFT, PLAYFIELD_TOP, PLAYFIELD_RIGHT - PLAYFIELD_LEFT, PLAYFIELD_BOTTOM - PLAYFIELD_TOP);
    ctx.setLineDash([]);

    ctx.fillStyle = 'rgba(245,208,75,0.95)';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('自由球：点击任意位置放置白球', CANVAS_W / 2, CANVAS_H - 18);
    ctx.restore();
  };

  const drawFoulBanner = (ctx: CanvasRenderingContext2D, msg: string) => {
    ctx.save();
    const w = 400;
    const h = 44;
    const x = (CANVAS_W - w) / 2;
    const y = 70;
    ctx.fillStyle = 'rgba(127,29,29,0.92)';
    roundRect(ctx, x, y, w, h, 10);
    ctx.fill();
    ctx.strokeStyle = 'rgba(248,113,113,0.8)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#fecaca';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(msg, x + w / 2, y + h / 2);
    ctx.restore();
  };

  const drawWinnerBanner = (ctx: CanvasRenderingContext2D, name: string) => {
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    const w = 420;
    const h = 120;
    const x = (CANVAS_W - w) / 2;
    const y = (CANVAS_H - h) / 2;
    const grad = ctx.createLinearGradient(x, y, x, y + h);
    grad.addColorStop(0, '#2a1a0e');
    grad.addColorStop(1, '#5a3a1f');
    ctx.fillStyle = grad;
    roundRect(ctx, x, y, w, h, 16);
    ctx.fill();
    ctx.strokeStyle = '#d4a84b';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.fillStyle = '#d4a84b';
    ctx.font = 'bold 36px "Playfair Display", serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${name} 获胜！`, x + w / 2, y + h / 2 + 10);
    ctx.restore();
  };

  return (
    <div className="relative inline-block">
      <canvas
        ref={canvasRef}
        width={CANVAS_W}
        height={CANVAS_H}
        className="rounded-xl shadow-2xl border border-amber-900/60 cursor-crosshair"
        style={{ maxWidth: '100%', height: 'auto' }}
      />
    </div>
  );
}
