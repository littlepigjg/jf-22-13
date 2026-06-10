import type { Ball, GameMode, GamePhase, Player, ReplayFile, ReplayFrame, Shot } from './types';

let frameBuffer: ReplayFrame[] = [];
let shotBuffer: Shot[] = [];
let initialBallsSnapshot: Ball[] | null = null;
let startTime = 0;
let frameCounter = 0;
let isRecording = false;

export function startRecording(balls: Ball[]): void {
  frameBuffer = [];
  shotBuffer = [];
  initialBallsSnapshot = JSON.parse(JSON.stringify(balls));
  startTime = Date.now();
  frameCounter = 0;
  isRecording = true;
}

export function stopRecording(): void {
  isRecording = false;
}

export function recordFrame(
  balls: Ball[],
  phase: GamePhase,
  currentPlayerId: number,
): void {
  if (!isRecording) return;

  if (frameCounter % 2 === 0) {
    const frame: ReplayFrame = {
      frameIndex: frameCounter,
      balls: balls.map((b) => ({
        id: b.id,
        pos: { ...b.pos },
        vel: { ...b.vel },
        acc: { ...b.acc },
        radius: b.radius,
        color: b.color,
        stripe: b.stripe,
        pocketed: b.pocketed,
        pocketedAt: b.pocketedAt,
        spin: { ...b.spin },
        number: b.number,
      })),
      phase,
      currentPlayerId,
    };
    frameBuffer.push(frame);
  }
  frameCounter++;
}

export function recordShot(shot: Shot): void {
  if (!isRecording) return;
  shotBuffer.push(JSON.parse(JSON.stringify(shot)));
}

export function generateReplay(
  mode: GameMode,
  players: Player[],
  winner: Player | null,
): ReplayFile | null {
  if (!initialBallsSnapshot) return null;

  const id = `replay_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
  const replay: ReplayFile = {
    id,
    timestamp: Date.now(),
    duration: Date.now() - startTime,
    mode,
    players: JSON.parse(JSON.stringify(players)),
    winner: winner ? JSON.parse(JSON.stringify(winner)) : null,
    initialBalls: initialBallsSnapshot,
    shots: shotBuffer,
    frames: frameBuffer,
  };
  return replay;
}

export function interpolateFrames(
  frames: ReplayFrame[],
  progress: number,
): { balls: Ball[]; phase: GamePhase; currentPlayerId: number } | null {
  if (frames.length === 0) return null;

  const totalFrames = frames[frames.length - 1].frameIndex;
  if (totalFrames <= 0) {
    return {
      balls: JSON.parse(JSON.stringify(frames[0].balls)),
      phase: frames[0].phase,
      currentPlayerId: frames[0].currentPlayerId,
    };
  }

  const targetFrameIdx = progress * totalFrames;

  let before = frames[0];
  let after = frames[frames.length - 1];
  for (let i = 0; i < frames.length - 1; i++) {
    if (frames[i].frameIndex <= targetFrameIdx && frames[i + 1].frameIndex >= targetFrameIdx) {
      before = frames[i];
      after = frames[i + 1];
      break;
    }
  }

  const span = after.frameIndex - before.frameIndex;
  const t = span === 0 ? 0 : (targetFrameIdx - before.frameIndex) / span;

  const balls: Ball[] = before.balls.map((bb, idx) => {
    const ab = after.balls[idx] || bb;
    return {
      ...bb,
      pos: {
        x: bb.pos.x + (ab.pos.x - bb.pos.x) * t,
        y: bb.pos.y + (ab.pos.y - bb.pos.y) * t,
      },
      pocketed: t < 0.5 ? bb.pocketed : ab.pocketed,
    };
  });

  return {
    balls,
    phase: after.phase,
    currentPlayerId: after.currentPlayerId,
  };
}

export function formatDuration(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, '0')}`;
}

export function formatTimestamp(ts: number): string {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  const hh = d.getHours().toString().padStart(2, '0');
  const mm = d.getMinutes().toString().padStart(2, '0');
  return `${y}-${m}-${day} ${hh}:${mm}`;
}
