import type { AIShotDecision, Ball, GameMode, Player, Vec2 } from './types';
import {
  PLAYFIELD_LEFT,
  PLAYFIELD_RIGHT,
  PLAYFIELD_TOP,
  PLAYFIELD_BOTTOM,
  BALL_RADIUS,
  POCKETS,
  MAX_POWER,
} from './constants';
import { v, angleDiff } from '../utils/math';
import { getLegalFirstBalls } from './rules';
import { predictShot } from './prediction';
import {
  isInSlyMode,
  chooseCandidateByPersonality,
  getNormalJitter,
  type ShotCandidate,
} from './ai-personality';

export function decideAIShot(
  mode: GameMode,
  balls: Ball[],
  currentPlayer: Player,
  groupsAssigned: boolean,
  difficulty: 'easy' | 'hard',
  players: Player[],
  currentPlayerId: number,
): AIShotDecision {
  const legalIds = getLegalFirstBalls(mode, balls, currentPlayer, groupsAssigned);
  const cueBall = balls.find((b) => b.id === 0 && !b.pocketed);
  if (!cueBall) return { aimAngle: 0, power: 0.5, targetBallId: legalIds[0] || 1 };

  const activeBalls = balls.filter((b) => !b.pocketed);

  if (difficulty === 'easy') {
    return easyStrategy(activeBalls, legalIds, cueBall);
  }
  return hardStrategy(mode, activeBalls, legalIds, cueBall, currentPlayer, groupsAssigned, players, currentPlayerId);
}

function easyStrategy(
  balls: Ball[],
  legalIds: number[],
  cueBall: Ball,
): AIShotDecision {
  const id = legalIds[Math.floor(Math.random() * legalIds.length)];
  const target = balls.find((b) => b.id === id);
  if (!target) return { aimAngle: 0, power: 0.5, targetBallId: id };

  const toTarget = v.sub(target.pos, cueBall.pos);
  let angle = v.angle(toTarget);
  angle += randRange(-0.12, 0.12);

  const dist = v.len(toTarget);
  const basePower = Math.min(0.9, 0.4 + dist / 500);
  const power = basePower + randRange(-0.1, 0.15);

  return { aimAngle: angle, power: Math.max(0.2, Math.min(0.95, power)), targetBallId: id };
}

function hardStrategy(
  mode: GameMode,
  balls: Ball[],
  legalIds: number[],
  cueBall: Ball,
  currentPlayer: Player,
  groupsAssigned: boolean,
  players: Player[],
  currentPlayerId: number,
): AIShotDecision {
  // ============================================================
  // 🎭 AI性格特征："狡猾的老手"
  // ------------------------------------------------------------
  // 心理战策略由 ai-personality.ts 模块提供，具体行为：
  // 1. 领先较多时（≥3球）：有20%概率选择次优解（质量≥最优解70%）
  //    抖动略大（角度±0.03，力度±0.04），模拟放松状态下的小偏差
  // 2. 落后或差距不大时：严格最优解，仅细微抖动（角度±0.02，力度±0.03）
  //    模拟人类在逆境中高度集中的竞技状态
  // ============================================================

  const isSly = isInSlyMode(players, currentPlayerId);

  const candidates: ShotCandidate[] = [];

  for (const targetId of legalIds) {
    const target = balls.find((b) => b.id === targetId);
    if (!target) continue;

    for (let pocketIdx = 0; pocketIdx < POCKETS.length; pocketIdx++) {
      const pocket = POCKETS[pocketIdx];
      const evaluation = evaluateShot(cueBall, target, pocket, balls, mode);
      if (evaluation === null) continue;

      candidates.push({
        targetId,
        pocketIdx,
        angle: evaluation.angle,
        power: evaluation.power,
        score: evaluation.score,
      });
    }
  }

  candidates.sort((a, b) => b.score - a.score);

  if (candidates.length === 0) {
    return safetyShot(balls, legalIds, cueBall, mode);
  }

  // 根据性格选择击球方案
  const decision = chooseCandidateByPersonality(candidates, isSly);
  const chosen = decision.chosen;

  if (chosen.score > 30) {
    const jitter = decision.jitter;
    return {
      aimAngle: chosen.angle + jitter.angleJitter,
      power: Math.max(0.2, Math.min(0.98, chosen.power + jitter.powerJitter)),
      targetBallId: chosen.targetId,
    };
  }

  // 安全球模式下也加一点自然抖动
  const safetyJitter = getNormalJitter();
  const safetyDecision = safetyShot(balls, legalIds, cueBall, mode);
  return {
    aimAngle: safetyDecision.aimAngle + safetyJitter.angleJitter,
    power: Math.max(0.2, Math.min(0.98, safetyDecision.power + safetyJitter.powerJitter)),
    targetBallId: safetyDecision.targetBallId,
  };
}

interface ShotEvaluation {
  angle: number;
  power: number;
  score: number;
}

function evaluateShot(
  cueBall: Ball,
  target: Ball,
  pocket: { pos: Vec2; radius: number },
  balls: Ball[],
  mode: GameMode,
): ShotEvaluation | null {
  const toPocket = v.sub(pocket.pos, target.pos);
  const distToPocket = v.len(toPocket);
  if (distToPocket < 1) return null;

  const aimPoint = v.sub(
    target.pos,
    v.mul(v.norm(toPocket), BALL_RADIUS * 2 * 0.98),
  );

  const toAim = v.sub(aimPoint, cueBall.pos);
  const distToTarget = v.len(toAim);
  if (distToTarget < 1) return null;

  const aimAngle = v.angle(toAim);
  const targetAngle = v.angle(toPocket);
  const idealAngle = targetAngle + Math.PI;
  const cutAngle = Math.abs(angleDiff(aimAngle, idealAngle));

  if (cutAngle > Math.PI / 2.2) return null;

  if (isPathBlocked(cueBall.pos, aimPoint, balls, target.id)) return null;
  if (isPathBlocked(target.pos, pocket.pos, balls, target.id, cueBall.id)) return null;

  let score = 100;
  const distFactor = Math.max(0, 1 - (distToTarget + distToPocket) / 1200);
  score *= 0.4 + 0.6 * distFactor;

  const cutFactor = Math.max(0, 1 - cutAngle / (Math.PI / 2));
  score *= 0.3 + 0.7 * cutFactor;

  const prediction = predictShot(balls, aimAngle, 0.6, 1, 100);
  if (prediction.firstHitBallId !== target.id) {
    score *= 0.2;
  }
  if (prediction.willPocket.includes(target.id)) {
    score += 40;
  }
  if (prediction.willPocket.includes(0)) {
    score -= 80;
  }

  if (target.id === 8 && mode === '8ball') {
    score *= 0.85;
  }

  const totalDist = distToTarget + distToPocket;
  const power = Math.min(0.95, 0.35 + totalDist / 800 + cutAngle * 0.15);

  return { angle: aimAngle, power, score };
}

function isPathBlocked(
  from: Vec2,
  to: Vec2,
  balls: Ball[],
  excludeId1: number,
  excludeId2: number = -1,
): boolean {
  const direction = v.sub(to, from);
  const length = v.len(direction);
  if (length < 1) return false;
  const dir = v.div(direction, length);

  for (const ball of balls) {
    if (ball.id === excludeId1 || ball.id === excludeId2 || ball.pocketed) continue;
    const toBall = v.sub(ball.pos, from);
    const proj = v.dot(toBall, dir);
    if (proj < -BALL_RADIUS || proj > length + BALL_RADIUS) continue;
    const perpDist = v.len(v.sub(toBall, v.mul(dir, proj)));
    if (perpDist < BALL_RADIUS * 1.9) return true;
  }
  return false;
}

function safetyShot(
  balls: Ball[],
  legalIds: number[],
  cueBall: Ball,
  mode: GameMode,
): AIShotDecision {
  let bestDecision: AIShotDecision | null = null;
  let bestSafetyScore = -Infinity;

  const targetCandidates = [...legalIds];
  if (mode === '8ball') {
    for (let i = 9; i <= 15; i++) targetCandidates.push(i);
  }

  for (const targetId of legalIds) {
    const target = balls.find((b) => b.id === targetId);
    if (!target) continue;

    const toTarget = v.sub(target.pos, cueBall.pos);
    const dist = v.len(toTarget);
    if (dist < BALL_RADIUS * 2.5) continue;

    const baseAngle = v.angle(toTarget);

    for (let offset = -0.4; offset <= 0.4; offset += 0.1) {
      const angle = baseAngle + offset;
      const power = 0.35 + Math.random() * 0.15;

      const prediction = predictShot(balls, angle, power, 2, 150);
      const lastSegment = prediction.segments[prediction.segments.length - 1];
      const cueEnd = lastSegment ? lastSegment.end : cueBall.pos;

      let score = 0;

      if (prediction.firstHitBallId === targetId) {
        score += 50;
      } else if (prediction.firstHitBallId !== null && legalIds.includes(prediction.firstHitBallId)) {
        score += 30;
      } else {
        score -= 20;
      }

      const centerX = (PLAYFIELD_LEFT + PLAYFIELD_RIGHT) / 2;
      const centerY = (PLAYFIELD_TOP + PLAYFIELD_BOTTOM) / 2;
      const distFromCenter = v.dist(cueEnd, { x: centerX, y: centerY });
      score += distFromCenter / 10;

      let minDistToOther = Infinity;
      for (const other of balls) {
        if (other.id === 0 || other.id === targetId || other.pocketed) continue;
        const d = v.dist(cueEnd, other.pos);
        minDistToOther = Math.min(minDistToOther, d);
      }
      if (minDistToOther < 150) {
        score -= (150 - minDistToOther) * 0.3;
      } else {
        score += 10;
      }

      if (prediction.willPocket.includes(0)) {
        score -= 200;
      }
      if (prediction.willPocket.includes(targetId)) {
        score -= 15;
      }

      if (score > bestSafetyScore) {
        bestSafetyScore = score;
        bestDecision = { aimAngle: angle, power, targetBallId: targetId };
      }
    }
  }

  if (bestDecision) return bestDecision;
  return easyStrategy(balls, legalIds, cueBall);
}
