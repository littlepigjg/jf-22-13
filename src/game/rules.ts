import type { Ball, FoulType, GameMode, Player, Shot } from './types';
import { FoulType as FoulTypeEnum } from './types';
import { FOUL_MESSAGES } from './constants';
import {
  calculateScoreAndUpdatePlayers,
  assignGroupsOnFirstPocket,
  clonePlayers,
} from './scoring';

export function getLegalFirstBalls(
  mode: GameMode,
  balls: Ball[],
  currentPlayer: Player,
  groupsAssigned: boolean,
): number[] {
  const activeBalls = balls.filter((b) => !b.pocketed && b.id !== 0);

  if (mode === '9ball') {
    if (activeBalls.length === 0) return [];
    const lowest = Math.min(...activeBalls.map((b) => b.id));
    return [lowest];
  }

  if (mode === '8ball') {
    if (!groupsAssigned) {
      return activeBalls.filter((b) => b.id !== 8).map((b) => b.id);
    }
    const group = currentPlayer.group;
    if (group === 'solid') {
      const solids = activeBalls.filter((b) => !b.stripe && b.id !== 8);
      if (solids.length > 0) return solids.map((b) => b.id);
      return [8];
    }
    if (group === 'stripe') {
      const stripes = activeBalls.filter((b) => b.stripe && b.id !== 8);
      if (stripes.length > 0) return stripes.map((b) => b.id);
      return [8];
    }
  }
  return activeBalls.map((b) => b.id);
}

export function checkFoul(
  mode: GameMode,
  balls: Ball[],
  shot: Shot,
  currentPlayer: Player,
  groupsAssigned: boolean,
): { foul: FoulType; message: string | null } {
  const legalFirstBalls = getLegalFirstBalls(mode, balls, currentPlayer, groupsAssigned);

  const cueBallPocketed = shot.pocketedBalls.includes(0);
  if (cueBallPocketed) {
    return { foul: FoulTypeEnum.CUE_BALL_POCKETED, message: FOUL_MESSAGES.CUE_BALL_POCKETED };
  }

  const firstHitId = shot.hits.length > 0 ? shot.hits[0].ballId : null;

  if (firstHitId === null) {
    return { foul: FoulTypeEnum.NO_BALL_HIT, message: FOUL_MESSAGES.NO_BALL_HIT };
  }

  if (!legalFirstBalls.includes(firstHitId)) {
    return { foul: FoulTypeEnum.WRONG_FIRST_CONTACT, message: FOUL_MESSAGES.WRONG_FIRST_CONTACT };
  }

  if (mode === '8ball') {
    const group = currentPlayer.group;
    const eightInThisShot = shot.pocketedBalls.includes(8);
    if (groupsAssigned && group) {
      const groupBallsRemaining = balls.filter(
        (b) => !b.pocketed && b.id !== 0 && b.id !== 8 && ((group === 'solid' && !b.stripe) || (group === 'stripe' && b.stripe)),
      ).length;

      if (eightInThisShot && groupBallsRemaining > 0) {
        return { foul: FoulTypeEnum.EIGHT_BALL_POCKETED_EARLY, message: FOUL_MESSAGES.EIGHT_BALL_POCKETED_EARLY };
      }
    }
  }

  return { foul: FoulTypeEnum.NONE, message: null };
}

export interface ResolveResult {
  switchTurn: boolean;
  gameOver: boolean;
  winnerId?: number;
  hintMessage: string | null;
  updatedPlayers: Player[];
  groupsAssigned: boolean;
  scoredBallIds: number[];
  scoreGained: number;
}

export function resolveShot(
  mode: GameMode,
  balls: Ball[],
  shot: Shot,
  players: Player[],
  currentPlayerId: number,
  foul: FoulType,
  groupsAssigned: boolean,
): ResolveResult {
  const hasFoul = foul !== FoulTypeEnum.NONE;
  let switchTurn = true;
  let currentPlayers = clonePlayers(players);

  const pocketedNonCue = shot.pocketedBalls.filter((id) => id !== 0);
  const currentPlayer = currentPlayers.find((p) => p.id === currentPlayerId)!;

  let groupsNowAssigned = groupsAssigned;
  let hintMessage: string | null = null;

  if (mode === '8ball' && !groupsAssigned && pocketedNonCue.length > 0 && !hasFoul) {
    const assignResult = assignGroupsOnFirstPocket(balls, pocketedNonCue, currentPlayers, currentPlayerId);
    currentPlayers = assignResult.updatedPlayers;
    groupsNowAssigned = assignResult.groupsAssigned;
    if (assignResult.hintMessage) {
      hintMessage = assignResult.hintMessage;
    }
  }

  const updatedCurrentPlayer = currentPlayers.find((p) => p.id === currentPlayerId)!;

  if (mode === '8ball') {
    const group = updatedCurrentPlayer.group;
    if (group && !hasFoul) {
      const ownGroupPocketed = pocketedNonCue.filter((id) => {
        const ball = balls.find((b) => b.id === id);
        if (!ball || ball.id === 8) return false;
        return (group === 'solid' && !ball.stripe) || (group === 'stripe' && ball.stripe);
      });

      if (ownGroupPocketed.length > 0) {
        switchTurn = false;
        hintMessage = `好球！打进 ${ownGroupPocketed.length} 颗，继续击打`;
      }
    }

    const eightBall = balls.find((b) => b.id === 8);
    if (eightBall?.pocketed) {
      const groupBallsRemaining = balls.filter(
        (b) => !b.pocketed && b.id !== 0 && b.id !== 8 && ((group === 'solid' && !b.stripe) || (group === 'stripe' && b.stripe)),
      ).length;

      if (groupBallsRemaining === 0 && !hasFoul) {
        const scoreResult = calculateScoreAndUpdatePlayers(mode, balls, shot, currentPlayers, currentPlayerId, hasFoul);
        return {
          switchTurn: false,
          gameOver: true,
          winnerId: currentPlayerId,
          hintMessage: `${currentPlayer.name} 获胜！`,
          updatedPlayers: scoreResult.updatedPlayers,
          groupsAssigned: groupsNowAssigned,
          scoredBallIds: scoreResult.scoredBallIds,
          scoreGained: scoreResult.scoreGained,
        };
      }
      if (hasFoul || groupBallsRemaining > 0) {
        const otherPlayerId = currentPlayers.find((p) => p.id !== currentPlayerId)!.id;
        return {
          switchTurn: true,
          gameOver: true,
          winnerId: otherPlayerId,
          hintMessage: `${currentPlayers.find((p) => p.id !== currentPlayerId)!.name} 获胜！`,
          updatedPlayers: currentPlayers,
          groupsAssigned: groupsNowAssigned,
          scoredBallIds: [],
          scoreGained: 0,
        };
      }
    }
  }

  if (mode === '9ball') {
    if (pocketedNonCue.includes(9) && !hasFoul) {
      const scoreResult = calculateScoreAndUpdatePlayers(mode, balls, shot, currentPlayers, currentPlayerId, hasFoul);
      return {
        switchTurn: false,
        gameOver: true,
        winnerId: currentPlayerId,
        hintMessage: `${currentPlayer.name} 获胜！`,
        updatedPlayers: scoreResult.updatedPlayers,
        groupsAssigned: groupsNowAssigned,
        scoredBallIds: scoreResult.scoredBallIds,
        scoreGained: scoreResult.scoreGained,
      };
    }

    if (pocketedNonCue.length > 0 && !hasFoul) {
      switchTurn = false;
      hintMessage = `好球！打进 ${pocketedNonCue.length} 颗，继续击打`;
    }
  }

  const scoreResult = calculateScoreAndUpdatePlayers(mode, balls, shot, currentPlayers, currentPlayerId, hasFoul);

  return {
    switchTurn,
    gameOver: false,
    hintMessage,
    updatedPlayers: scoreResult.updatedPlayers,
    groupsAssigned: groupsNowAssigned,
    scoredBallIds: scoreResult.scoredBallIds,
    scoreGained: scoreResult.scoreGained,
  };
}
