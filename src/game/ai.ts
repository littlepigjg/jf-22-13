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
import { v, randRange, angleDiff } from '../utils/math';
import { getLegalFirstBalls } from './rules';
import { predictShot } from './prediction';

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
  // 行为模式分析：
  // 1. 当AI领先较多分数时（领先≥3球），会进入"放水模式"
  //    - 有20%的概率故意选择次优解（评分第2或第3名的选择）
  //    - 这些选择看起来合理，但会给对手留下更好的反击位置
  //    - 模拟真实人类在领先时的放松心态与"故意送机会"的心理博弈
  // 2. 当AI落后或差距不大时，进入"全力翻盘模式"
  //    - 严格选择最优解，不留给对手任何喘息之机
  //    - 模拟真实人类在逆境中高度集中、拼尽全力的竞技状态
  // ============================================================

  const aiPlayer = players.find((p) => p.id === currentPlayerId);
  const humanPlayer = players.find((p) => p.id !== currentPlayerId);
  const aiScore = aiPlayer?.score ?? 0;
  const humanScore = humanPlayer?.score ?? 0;
  const scoreDiff = aiScore - humanScore;

  // 判断当前AI心态：领先较多时进入"狡猾模式"，否则全力争胜
  const SLY_MODE_THRESHOLD = 3;        // 领先3球以上触发心理战
  const SLY_CHOICE_PROBABILITY = 0.2;  // 20%概率选择次优解
  const isSlyMode = scoreDiff >= SLY_MODE_THRESHOLD;

  const candidates: Array<{
    targetId: number;
    pocketIdx: number;
    angle: number;
    power: number;
    score: number;
  }> = [];

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

  let chosen = candidates[0];

  // [性格] 狡猾模式：领先时偶尔"失手"，给对手制造反击的错觉
  if (isSlyMode && candidates.length >= 2 && Math.random() < SLY_CHOICE_PROBABILITY) {
    // 选择评分第2或第3的次优解（看起来合理，但实际上给对手留机会）
    const maxSlyIndex = Math.min(2, candidates.length - 1);
    const slyIndex = 1 + Math.floor(Math.random() * (maxSlyIndex - 0));
    chosen = candidates[slyIndex];

    // [性格] 增加一些"不完美"的力度和角度偏移，让失误看起来更自然
    const slyAngleJitter = randRange(-0.06, 0.06);
    const slyPowerJitter = randRange(-0.08, 0.08);
    return {
      aimAngle: chosen.angle + slyAngleJitter,
      power: Math.max(0.2, Math.min(0.98, chosen.power + slyPowerJitter)),
      targetBallId: chosen.targetId,
    };
  }

  // 正常最优解：落后或差距不大时，全力以赴
  if (chosen && chosen.score > 30) {
    // 即使在最优解模式下，也加入极细微的"人手抖动"让AI更像真人
    const angleJitter = randRange(-0.02, 0.02);
    const powerJitter = randRange(-0.03, 0.03);
    return {
      aimAngle: chosen.angle + angleJitter,
      power: Math.max(0.2, Math.min(0.98, chosen.power + powerJitter)),
      targetBallId: chosen.targetId,
    };
  }

  return safetyShot(balls, legalIds, cueBall, mode);
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
