import { useGameStore } from '../stores/useGameStore';
import { getLegalFirstBalls } from '../game/rules';
import { BALL_COLORS } from '../game/constants';
import type { GameMode } from '../game/types';

export default function HUD() {
  const currentPlayerId = useGameStore((s) => s.currentPlayerId);
  const players = useGameStore((s) => s.players);
  const balls = useGameStore((s) => s.balls);
  const mode = useGameStore((s) => s.mode);
  const groupsAssigned = useGameStore((s) => s.groupsAssigned);
  const targetBallHint = useGameStore((s) => s.targetBallHint);
  const turnNumber = useGameStore((s) => s.turnNumber);
  const phase = useGameStore((s) => s.phase);

  const currentPlayer = players.find((p) => p.id === currentPlayerId);

  const legalIds = currentPlayer
    ? getLegalFirstBalls(mode, balls, currentPlayer, groupsAssigned)
    : [];

  const player1 = players[0];
  const player2 = players[1];

  return (
    <div className="w-full max-w-[880px] mx-auto space-y-3">
      <div className="grid grid-cols-2 gap-4">
        <PlayerCard
          player={player1}
          active={currentPlayerId === 0}
          mode={mode}
          balls={balls}
        />
        <PlayerCard
          player={player2}
          active={currentPlayerId === 1}
          mode={mode}
          balls={balls}
          reverse
        />
      </div>

      <div className="flex items-center justify-between gap-4 px-4 py-3 rounded-xl bg-black/40 backdrop-blur-md border border-amber-700/30">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          <span className="text-amber-200/80 text-sm">
            回合 <span className="font-bold text-amber-300">{turnNumber}</span>
          </span>
          <span className="text-zinc-500 text-xs">·</span>
          <span className="text-zinc-400 text-sm">
            阶段：<span className="text-zinc-200">{phaseLabel(phase)}</span>
          </span>
        </div>

        <div className="flex items-center gap-3">
          {legalIds.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-zinc-400 text-sm">目标球：</span>
              <div className="flex gap-1">
                {legalIds.slice(0, 4).map((id) => (
                  <LegalBallPill key={id} id={id} />
                ))}
                {legalIds.length > 4 && (
                  <span className="text-zinc-500 text-xs">+{legalIds.length - 4}</span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {targetBallHint && (
        <div className="px-4 py-2 rounded-lg bg-emerald-900/30 border border-emerald-700/40 text-emerald-300 text-sm text-center">
          {targetBallHint}
        </div>
      )}
    </div>
  );
}

function PlayerCard({
  player,
  active,
  mode,
  balls,
  reverse = false,
}: {
  player?: { id: number; name: string; isAI: boolean; group?: 'solid' | 'stripe' | null; score: number; aiDifficulty?: 'easy' | 'hard' };
  active: boolean;
  mode: GameMode;
  balls: { id: number; pocketed: boolean; stripe: boolean }[];
  reverse?: boolean;
}) {
  if (!player) return null;

  const group = player.group;
  const remaining = balls.filter(
    (b) => !b.pocketed && b.id !== 0 && b.id !== 8 && (
      mode === '9ball' ? true :
      group === 'solid' ? !b.stripe :
      group === 'stripe' ? b.stripe :
      true
    ),
  ).length;

  const pocketed = balls.filter(
    (b) => b.pocketed && b.id !== 0 && b.id !== 8 && (
      mode === '9ball' ? true :
      group === 'solid' ? !b.stripe :
      group === 'stripe' ? b.stripe :
      false
    ),
  );

  return (
    <div
      className={`relative p-4 rounded-xl border transition-all duration-300 ${
        active
          ? 'bg-gradient-to-br from-amber-900/40 to-amber-950/60 border-amber-500/60 shadow-[0_0_30px_rgba(212,168,75,0.15)]'
          : 'bg-zinc-900/50 border-zinc-700/40 opacity-80'
      }`}
    >
      {active && (
        <div className={`absolute top-2 ${reverse ? 'left-2' : 'right-2'} w-2 h-2 rounded-full bg-emerald-400 animate-ping`} />
      )}
      <div className="flex items-center justify-between mb-3">
        <div className={`flex items-center gap-2 ${reverse ? 'flex-row-reverse' : ''}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
            player.isAI
              ? 'bg-gradient-to-br from-rose-600 to-rose-800 text-rose-100'
              : 'bg-gradient-to-br from-sky-600 to-sky-800 text-sky-100'
          }`}>
            {player.isAI ? 'AI' : player.id + 1}
          </div>
          <div className={reverse ? 'text-right' : ''}>
            <div className="font-bold text-zinc-100">{player.name}</div>
            {player.isAI && player.aiDifficulty && (
              <div className="text-xs text-rose-300/70">
                {player.aiDifficulty === 'easy' ? '简单难度' : '困难难度'}
              </div>
            )}
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-amber-400 font-serif">
            {mode === '8ball' ? (group ? (pocketed.length > 0 ? pocketed.length : 0) : '-') : player.score}
          </div>
          {mode === '8ball' && group && (
            <div className="text-xs text-zinc-400">{group === 'solid' ? '全色球' : '半色球'}</div>
          )}
        </div>
      </div>

      {mode === '8ball' && group && (
        <div className="flex flex-wrap gap-1 mt-2">
          {Array.from({ length: 7 }).map((_, i) => {
            const ballId = group === 'solid' ? i + 1 : i + 9;
            const isPocketed = balls.find((b) => b.id === ballId)?.pocketed;
            return (
              <MiniBall
                key={ballId}
                id={ballId}
                pocketed={!!isPocketed}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

function MiniBall({ id, pocketed }: { id: number; pocketed: boolean }) {
  const info = BALL_COLORS[id];
  if (!info) return null;
  return (
    <div
      className={`relative w-5 h-5 rounded-full border border-black/30 flex items-center justify-center text-[8px] font-bold transition-all ${
        pocketed ? 'opacity-30 scale-90 grayscale' : ''
      }`}
      style={{
        background: info.stripe
          ? `linear-gradient(to bottom, ${info.color} 25%, #F5F0E0 25%, #F5F0E0 75%, ${info.color} 75%)`
          : info.color,
        color: id === 8 ? '#fff' : '#111',
      }}
    >
      {id > 8 ? id - 8 : id}
    </div>
  );
}

function LegalBallPill({ id }: { id: number }) {
  const info = BALL_COLORS[id];
  if (!info) return null;
  return (
    <div
      className="w-6 h-6 rounded-full border-2 border-amber-400/70 flex items-center justify-center text-[9px] font-bold shadow-md"
      style={{
        background: info.stripe
          ? `linear-gradient(to bottom, ${info.color} 25%, #F5F0E0 25%, #F5F0E0 75%, ${info.color} 75%)`
          : info.color,
        color: id === 8 ? '#fff' : '#111',
      }}
    >
      {id > 8 ? id - 8 : id}
    </div>
  );
}

function phaseLabel(p: string): string {
  switch (p) {
    case 'aiming': return '瞄准中';
    case 'charging': return '蓄力中';
    case 'shooting': return '出杆';
    case 'simulating': return '球体运动中';
    case 'resolving': return '判定中';
    case 'gameover': return '比赛结束';
    default: return '准备中';
  }
}
