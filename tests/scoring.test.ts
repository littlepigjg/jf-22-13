import { describe, it, expect } from 'vitest';
import type { Ball, Player, Shot } from '../src/game/types';
import { FoulType } from '../src/game/types';
import { BALL_COLORS, BALL_RADIUS } from '../src/game/constants';
import { calculateScoreAndUpdatePlayers } from '../src/game/scoring';
import { resolveShot } from '../src/game/rules';

function makeBall(id: number, pocketed = false): Ball {
  const conf = BALL_COLORS[id] || { color: '#ffffff', stripe: false };
  return {
    id,
    number: id,
    pos: { x: 0, y: 0 },
    vel: { x: 0, y: 0 },
    acc: { x: 0, y: 0 },
    spin: { x: 0, y: 0 },
    color: conf.color,
    stripe: conf.stripe,
    radius: BALL_RADIUS,
    pocketed,
    pocketedAt: pocketed ? Date.now() : undefined,
  };
}

function makePlayers(): Player[] {
  return [
    { id: 0, name: '玩家1', isAI: false, score: 0, group: null },
    { id: 1, name: '玩家2', isAI: false, score: 0, group: null },
  ];
}

function makeShot(opts: Partial<Shot> = {}): Shot {
  return {
    aimAngle: 0,
    power: 0.5,
    playerId: 0,
    timestamp: Date.now(),
    hits: [],
    pocketedBalls: [],
    foul: FoulType.NONE,
    ...opts,
  };
}

describe('计分模块 - calculateScoreAndUpdatePlayers', () => {
  it('9球模式 - 一杆打进5颗普通球，分数正确累加5分', () => {
    const balls = [
      makeBall(0),
      makeBall(1, true),
      makeBall(2, true),
      makeBall(3, true),
      makeBall(4, true),
      makeBall(5, true),
      makeBall(6),
      makeBall(7),
      makeBall(8),
      makeBall(9),
    ];
    const players = makePlayers();
    const shot = makeShot({ pocketedBalls: [1, 2, 3, 4, 5], playerId: 0 });

    const result = calculateScoreAndUpdatePlayers('9ball', balls, shot, players, 0, false);

    expect(result.scoreGained).toBe(5);
    expect(result.scoredBallIds).toEqual([1, 2, 3, 4, 5]);
    expect(result.updatedPlayers[0].score).toBe(5);
    expect(result.updatedPlayers[1].score).toBe(0);
  });

  it('9球模式 - 9号球进袋不计入普通分数（直接判胜）', () => {
    const balls = [
      makeBall(0),
      makeBall(5, true),
      makeBall(9, true),
    ];
    const players = makePlayers();
    const shot = makeShot({ pocketedBalls: [5, 9], playerId: 0 });

    const result = calculateScoreAndUpdatePlayers('9ball', balls, shot, players, 0, false);

    expect(result.scoreGained).toBe(1);
    expect(result.scoredBallIds).toEqual([5]);
    expect(balls.find((b) => b.id === 9)?.pocketed).toBe(true);
  });

  it('9球模式 - 犯规时打进5颗球，分数加0', () => {
    const balls = [
      makeBall(0),
      makeBall(1, true),
      makeBall(2, true),
      makeBall(3, true),
    ];
    const players = makePlayers();
    const shot = makeShot({ pocketedBalls: [1, 2, 3], playerId: 0 });

    const result = calculateScoreAndUpdatePlayers(
      '9ball',
      balls,
      shot,
      players,
      0,
      true,
    );

    expect(result.scoreGained).toBe(0);
    expect(result.updatedPlayers[0].score).toBe(0);
  });

  it('8球模式 - 未分花色时打进3颗球，全部计入分数', () => {
    const balls = [
      makeBall(0),
      makeBall(1, true),
      makeBall(9, true),
      makeBall(2, true),
    ];
    const players = makePlayers();
    const shot = makeShot({ pocketedBalls: [1, 9, 2], playerId: 0 });

    const result = calculateScoreAndUpdatePlayers('8ball', balls, shot, players, 0, false);

    expect(result.scoreGained).toBe(3);
    expect(result.updatedPlayers[0].score).toBe(3);
  });

  it('8球模式 - 分配全色后打进3颗半色不计分，打进全色球正确计分', () => {
    const balls = [
      makeBall(0),
      makeBall(1, true),
      makeBall(9, true),
      makeBall(10, true),
      makeBall(3, true),
    ];
    const players = makePlayers();
    players[0].group = 'solid';
    players[1].group = 'stripe';
    const shot = makeShot({ pocketedBalls: [1, 9, 10, 3], playerId: 0 });

    const result = calculateScoreAndUpdatePlayers('8ball', balls, shot, players, 0, false);

    expect(result.scoreGained).toBe(2);
    expect(result.scoredBallIds).toEqual([1, 3]);
    expect(result.updatedPlayers[0].score).toBe(2);
  });

  it('8球模式 - 8号球不计入普通分数', () => {
    const balls = [
      makeBall(0),
      makeBall(1, true),
      makeBall(8, true),
    ];
    const players = makePlayers();
    players[0].group = 'solid';
    players[1].group = 'stripe';
    const shot = makeShot({ pocketedBalls: [1, 8], playerId: 0 });

    const result = calculateScoreAndUpdatePlayers('8ball', balls, shot, players, 0, false);

    expect(result.scoreGained).toBe(1);
    expect(result.scoredBallIds).toEqual([1]);
  });

  it('返回的 updatedPlayers 是新引用，不修改原数组对象', () => {
    const balls = [makeBall(0), makeBall(5, true)];
    const players = makePlayers();
    players[0].score = 10;
    const originalPlayer0 = players[0];
    const shot = makeShot({ pocketedBalls: [5], playerId: 0 });

    const result = calculateScoreAndUpdatePlayers('9ball', balls, shot, players, 0, false);

    expect(result.updatedPlayers).not.toBe(players);
    expect(result.updatedPlayers[0]).not.toBe(originalPlayer0);
    expect(originalPlayer0.score).toBe(10);
  });
});

describe('规则判定 - resolveShot（一杆多球场景）', () => {
  it('9球模式 - 一杆连续进1,2,3,4号球，连击不换回合且累计4分', () => {
    const balls = [
      makeBall(0),
      makeBall(1, true),
      makeBall(2, true),
      makeBall(3, true),
      makeBall(4, true),
      makeBall(5),
      makeBall(6),
      makeBall(7),
      makeBall(8),
      makeBall(9),
    ];
    const players = makePlayers();
    const shot = makeShot({
      pocketedBalls: [1, 2, 3, 4],
      playerId: 0,
      hits: [{ ballId: 1, timestamp: 0 }],
    });

    const result = resolveShot('9ball', balls, shot, players, 0, FoulType.NONE, false);

    expect(result.switchTurn).toBe(false);
    expect(result.gameOver).toBe(false);
    expect(result.scoreGained).toBe(4);
    expect(result.updatedPlayers[0].score).toBe(4);
  });

  it('9球模式 - 一杆连进7颗(1-7)，7分且不换回合，8和9留在台上', () => {
    const balls = [
      makeBall(0),
      makeBall(1, true),
      makeBall(2, true),
      makeBall(3, true),
      makeBall(4, true),
      makeBall(5, true),
      makeBall(6, true),
      makeBall(7, true),
      makeBall(8),
      makeBall(9),
    ];
    const players = makePlayers();
    const shot = makeShot({
      pocketedBalls: [1, 2, 3, 4, 5, 6, 7],
      playerId: 0,
      hits: [{ ballId: 1, timestamp: 0 }],
    });

    const result = resolveShot('9ball', balls, shot, players, 0, FoulType.NONE, false);

    expect(result.scoreGained).toBe(7);
    expect(result.updatedPlayers[0].score).toBe(7);
    expect(result.switchTurn).toBe(false);
  });

  it('9球模式 - 合法打进9号球直接判胜，同时1分计入', () => {
    const balls = [
      makeBall(0),
      makeBall(5, true),
      makeBall(9, true),
    ];
    const players = makePlayers();
    const shot = makeShot({
      pocketedBalls: [5, 9],
      playerId: 0,
      hits: [{ ballId: 5, timestamp: 0 }],
    });

    const result = resolveShot('9ball', balls, shot, players, 0, FoulType.NONE, false);

    expect(result.gameOver).toBe(true);
    expect(result.winnerId).toBe(0);
    expect(result.scoreGained).toBe(1);
    expect(result.updatedPlayers[0].score).toBe(1);
  });

  it('9球模式 - 白球落袋犯规，进了5颗球也不计分且换回合', () => {
    const balls = [
      makeBall(0, true),
      makeBall(1, true),
      makeBall(2, true),
      makeBall(3, true),
      makeBall(4, true),
      makeBall(5, true),
      makeBall(6),
    ];
    const players = makePlayers();
    const shot = makeShot({
      pocketedBalls: [0, 1, 2, 3, 4, 5],
      playerId: 0,
      hits: [{ ballId: 1, timestamp: 0 }],
    });

    const result = resolveShot(
      '9ball',
      balls,
      shot,
      players,
      0,
      FoulType.CUE_BALL_POCKETED,
      false,
    );

    expect(result.switchTurn).toBe(true);
    expect(result.scoreGained).toBe(0);
    expect(result.updatedPlayers[0].score).toBe(0);
  });

  it('长连击验证 - 连续3杆各进3颗，累计9分且始终不换回合', () => {
    const balls = Array.from({ length: 10 }, (_, i) => makeBall(i));
    let players = makePlayers();

    const pocketedRounds = [
      [1, 2, 3],
      [4, 5, 6],
      [7, 8],
    ];

    let expectedScore = 0;

    for (let round = 0; round < pocketedRounds.length; round++) {
      const pocketed = pocketedRounds[round];
      pocketed.forEach((id) => {
        const b = balls.find((bb) => bb.id === id);
        if (b) b.pocketed = true;
      });
      const shot = makeShot({
        pocketedBalls: pocketed,
        playerId: 0,
        hits: [{ ballId: Math.min(...pocketed), timestamp: round }],
      });

      const result = resolveShot('9ball', balls, shot, players, 0, FoulType.NONE, false);
      players = result.updatedPlayers;
      expectedScore += pocketed.length;

      expect(result.updatedPlayers[0].score).toBe(expectedScore);
      if (round < pocketedRounds.length - 1) {
        expect(result.switchTurn).toBe(false);
      }
    }

    expect(players[0].score).toBe(8);
  });

  it('8球模式 - 合法打进8号球且花色已清，直接获胜并计入本杆分数', () => {
    const balls = [
      makeBall(0),
      makeBall(1, true),
      makeBall(2, true),
      makeBall(7, true),
      makeBall(8, true),
      makeBall(9),
      makeBall(15),
    ];
    const players = makePlayers();
    players[0].group = 'solid';
    players[1].group = 'stripe';
    const shot = makeShot({
      pocketedBalls: [7, 8],
      playerId: 0,
      hits: [{ ballId: 7, timestamp: 0 }],
    });

    const result = resolveShot('8ball', balls, shot, players, 0, FoulType.NONE, true);

    expect(result.gameOver).toBe(true);
    expect(result.winnerId).toBe(0);
    expect(result.scoreGained).toBe(1);
  });
});
