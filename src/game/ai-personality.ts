import type { Player } from './types';
import { randRange } from '../utils/math';

// ============================================================
// 🎭 AI性格系统："狡猾的老手"
// ------------------------------------------------------------
// 行为模式分析：
// 1. 领先模式：当AI领先较多分数时，会进入"放松放水模式"
//    - 有一定概率故意选择次优解（评分第二或第三名）
//    - 次优解本身质量不能太低，至少要达到最优解的70%以上
//    - 击球时的抖动幅度略大于正常水平，模拟放松状态下的小偏差
//    - 看起来像是"这球也能打，只是没选到最好的角度"
// 2. 追赶模式：当AI落后或差距不大时，进入"全力翻盘模式"
//    - 严格选择最优解，不留给对手任何喘息之机
//    - 仅带有极细微的人手抖动，模拟高度集中的竞技状态
// ============================================================

export interface ShotCandidate {
  targetId: number;
  pocketIdx: number;
  angle: number;
  power: number;
  score: number;
}

export interface PersonalityJitter {
  angleJitter: number;
  powerJitter: number;
}

export interface PersonalityDecision {
  chosen: ShotCandidate;
  jitter: PersonalityJitter;
  usedSlyChoice: boolean;
}

// 性格配置参数
export const SLY_CONFIG = {
  // 领先多少分以上触发心理战模式
  SLY_MODE_THRESHOLD: 3,
  // 触发次优解选择的概率
  SLY_CHOICE_PROBABILITY: 0.2,
  // 次优解最低质量要求（相对于最优解的百分比）
  SLY_MIN_QUALITY_RATIO: 0.7,
  // 次优解选择范围（最多考虑前N名候选）
  SLY_MAX_CANDIDATE_INDEX: 2,
  // 放松模式下的角度抖动幅度（略大于正常模式的±0.02）
  SLY_ANGLE_JITTER_RANGE: 0.03,
  // 放松模式下的力度抖动幅度（略大于正常模式的±0.03）
  SLY_POWER_JITTER_RANGE: 0.04,
  // 正常模式下的角度抖动幅度（模拟真人细微手抖）
  NORMAL_ANGLE_JITTER_RANGE: 0.02,
  // 正常模式下的力度抖动幅度
  NORMAL_POWER_JITTER_RANGE: 0.03,
} as const;

// 判断当前AI是否处于"狡猾模式"（领先较多分数时）
export function isInSlyMode(
  players: Player[],
  currentPlayerId: number,
  threshold: number = SLY_CONFIG.SLY_MODE_THRESHOLD,
): boolean {
  const aiPlayer = players.find((p) => p.id === currentPlayerId);
  const humanPlayer = players.find((p) => p.id !== currentPlayerId);
  const aiScore = aiPlayer?.score ?? 0;
  const humanScore = humanPlayer?.score ?? 0;
  const scoreDiff = aiScore - humanScore;
  return scoreDiff >= threshold;
}

// 根据性格选择击球候选
// - 正常模式：选最优解
// - 狡猾模式：有概率选次优解，但必须满足最低质量要求
export function chooseCandidateByPersonality(
  candidates: ShotCandidate[],
  isSlyMode: boolean,
  config: typeof SLY_CONFIG = SLY_CONFIG,
): PersonalityDecision {
  if (candidates.length === 0) {
    throw new Error('No candidates to choose from');
  }

  const best = candidates[0];

  // 正常模式或不符合狡猾模式条件时，直接选最优解
  if (!isSlyMode || candidates.length < 2) {
    return {
      chosen: best,
      jitter: getNormalJitter(config),
      usedSlyChoice: false,
    };
  }

  // [性格] 狡猾模式：有概率选择次优解
  if (Math.random() < config.SLY_CHOICE_PROBABILITY) {
    // 找出所有满足质量门槛的次优解
    const minQualityScore = best.score * config.SLY_MIN_QUALITY_RATIO;
    const maxIndex = Math.min(config.SLY_MAX_CANDIDATE_INDEX, candidates.length - 1);
    const validSlyCandidates: ShotCandidate[] = [];

    for (let i = 1; i <= maxIndex; i++) {
      if (candidates[i].score >= minQualityScore) {
        validSlyCandidates.push(candidates[i]);
      }
    }

    // 如果有合格的次优解，随机选一个
    if (validSlyCandidates.length > 0) {
      const slyChoice =
        validSlyCandidates[Math.floor(Math.random() * validSlyCandidates.length)];
      return {
        chosen: slyChoice,
        jitter: getSlyJitter(config),
        usedSlyChoice: true,
      };
    }
  }

  // 默认选最优解
  return {
    chosen: best,
    jitter: getNormalJitter(config),
    usedSlyChoice: false,
  };
}

// 获取正常模式下的抖动（高度集中时的细微手抖）
export function getNormalJitter(
  config: typeof SLY_CONFIG = SLY_CONFIG,
): PersonalityJitter {
  return {
    angleJitter: randRange(
      -config.NORMAL_ANGLE_JITTER_RANGE,
      config.NORMAL_ANGLE_JITTER_RANGE,
    ),
    powerJitter: randRange(
      -config.NORMAL_POWER_JITTER_RANGE,
      config.NORMAL_POWER_JITTER_RANGE,
    ),
  };
}

// 获取狡猾模式下的抖动（放松状态下的稍大偏差）
export function getSlyJitter(
  config: typeof SLY_CONFIG = SLY_CONFIG,
): PersonalityJitter {
  return {
    angleJitter: randRange(
      -config.SLY_ANGLE_JITTER_RANGE,
      config.SLY_ANGLE_JITTER_RANGE,
    ),
    powerJitter: randRange(
      -config.SLY_POWER_JITTER_RANGE,
      config.SLY_POWER_JITTER_RANGE,
    ),
  };
}
