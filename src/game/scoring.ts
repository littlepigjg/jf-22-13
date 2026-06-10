import type { Ball, GameMode, Player, Shot } from './types';

export interface ScoreResult {
  scoredBallIds: number[];
  scoreGained: number;
  updatedPlayers: Player[];
}

export function calculateScoreAndUpdatePlayers(
  mode: GameMode,
  balls: Ball[],
  shot: Shot,
  players: Player[],
  currentPlayerId: number,
  foul: boolean,
): ScoreResult {
  const pocketedNonCue = shot.pocketedBalls.filter((id) => id !== 0);
  const currentPlayer = players.find((p) => p.id === currentPlayerId)!;
  const group = currentPlayer.group;

  const scoredBallIds: number[] = [];

  for (const id of pocketedNonCue) {
    if (shouldCountScore(mode, balls, id, group)) {
      scoredBallIds.push(id);
    }
  }

  const scoreGained = foul ? 0 : scoredBallIds.length;

  const updatedPlayers = players.map((p) => {
    if (p.id === currentPlayerId) {
      return { ...p, score: p.score + scoreGained };
    }
    return { ...p };
  });

  return {
    scoredBallIds,
    scoreGained,
    updatedPlayers,
  };
}

function shouldCountScore(
  mode: GameMode,
  balls: Ball[],
  ballId: number,
  group: 'solid' | 'stripe' | null | undefined,
): boolean {
  const ball = balls.find((b) => b.id === ballId);
  if (!ball) return false;

  if (mode === '8ball') {
    if (ballId === 8) return false;
    if (!group) return true;
    if (group === 'solid') return !ball.stripe;
    return ball.stripe;
  }

  if (mode === '9ball') {
    return ballId !== 9;
  }

  return false;
}

export function assignGroupsOnFirstPocket(
  balls: Ball[],
  pocketedNonCue: number[],
  players: Player[],
  currentPlayerId: number,
): {
  updatedPlayers: Player[];
  groupsAssigned: boolean;
  hintMessage: string | null;
} {
  if (pocketedNonCue.length === 0) {
    return { updatedPlayers: players, groupsAssigned: false, hintMessage: null };
  }

  const firstPocketed = pocketedNonCue[0];
  const ball = balls.find((b) => b.id === firstPocketed);
  if (!ball || ball.id === 8) {
    return { updatedPlayers: players, groupsAssigned: false, hintMessage: null };
  }

  const currentPlayer = players.find((p) => p.id === currentPlayerId)!;
  const otherPlayer = players.find((p) => p.id !== currentPlayerId)!;

  if (currentPlayer.group || otherPlayer.group) {
    return { updatedPlayers: players, groupsAssigned: true, hintMessage: null };
  }

  const p1Group: 'solid' | 'stripe' = ball.stripe ? 'stripe' : 'solid';
  const p2Group: 'solid' | 'stripe' = p1Group === 'solid' ? 'stripe' : 'solid';

  const updatedPlayers = players.map((p) => {
    if (p.id === currentPlayerId) return { ...p, group: p1Group };
    return { ...p, group: p2Group };
  });

  const name = currentPlayer.name;
  const groupLabel = p1Group === 'solid' ? '全色球' : '半色球';

  return {
    updatedPlayers,
    groupsAssigned: true,
    hintMessage: `${name} 已分配：${groupLabel}`,
  };
}

export function countPocketedBallsByGroup(
  balls: Ball[],
  group: 'solid' | 'stripe' | null | undefined,
): { remaining: number; pocketed: Ball[] } {
  const active = balls.filter(
    (b) => b.id !== 0 && b.id !== 8 && (
      !group ? true :
      group === 'solid' ? !b.stripe : b.stripe
    ),
  );

  const remaining = active.filter((b) => !b.pocketed).length;
  const pocketed = active.filter((b) => b.pocketed);

  return { remaining, pocketed };
}

export function clonePlayers(players: Player[]): Player[] {
  return players.map((p) => ({
    ...p,
    group: p.group,
    aiDifficulty: p.aiDifficulty,
  }));
}
