import { useNavigate } from 'react-router-dom';
import { CircleDot, Trophy, Users, Bot, ChevronRight, Play, BookOpenCheck } from 'lucide-react';
import { useGameStore } from '../stores/useGameStore';
import type { GameMode, PlayMode } from '../game/types';
import { loadSettings, saveSettings } from '../utils/storage';
import { useEffect, useState } from 'react';

export default function MainMenu() {
  const navigate = useNavigate();
  const startGame = useGameStore((s) => s.startGame);
  const setSelectedGameMode = useGameStore((s) => s.setSelectedGameMode);
  const setSelectedPlayMode = useGameStore((s) => s.setSelectedPlayMode);
  const setSelectedAIDifficulty = useGameStore((s) => s.setSelectedAIDifficulty);
  const setMenuTab = useGameStore((s) => s.setMenuTab);

  const [mode, setMode] = useState<GameMode>('8ball');
  const [playMode, setPlayMode] = useState<PlayMode>('pve');
  const [difficulty, setDifficulty] = useState<'easy' | 'hard'>('easy');

  useEffect(() => {
    const s = loadSettings();
    setDifficulty(s.aiDifficulty);
  }, []);

  const handleStart = () => {
    setSelectedGameMode(mode);
    setSelectedPlayMode(playMode);
    setSelectedAIDifficulty(difficulty);
    saveSettings({ aiDifficulty: difficulty });
    startGame(mode, playMode, difficulty);
    navigate('/game');
  };

  const gotoReplays = () => {
    setMenuTab('replays');
    navigate('/replays');
  };

  return (
    <div className="min-h-screen w-full relative overflow-hidden bg-[#0a0f0a]">
      <div className="absolute inset-0 opacity-25 pointer-events-none">
        <div className="absolute top-[10%] left-[15%] w-32 h-32 rounded-full bg-amber-400/20 blur-3xl animate-pulse" />
        <div className="absolute bottom-[15%] right-[20%] w-40 h-40 rounded-full bg-emerald-500/20 blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-[40%] right-[10%] w-28 h-28 rounded-full bg-rose-500/15 blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      <div className="absolute inset-0 opacity-[0.04] pointer-events-none"
           style={{
             backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)',
             backgroundSize: '20px 20px',
           }} />

      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-6 py-12">
        <div className="text-center mb-14">
          <div className="flex items-center justify-center gap-3 mb-4">
            <CircleDot className="w-10 h-10 text-amber-400" />
            <h1 className="text-6xl md:text-7xl font-serif font-black tracking-wide bg-gradient-to-b from-amber-300 via-amber-400 to-amber-600 bg-clip-text text-transparent drop-shadow-[0_2px_12px_rgba(212,168,75,0.3)]">
              2D BILLIARDS
            </h1>
          </div>
          <p className="text-zinc-500 tracking-[0.3em] text-sm uppercase">俯视角台球 · 8球 & 9球</p>
          <div className="mt-6 flex justify-center gap-2">
            {[0,1,2,3,4].map(i => (
              <div key={i}
                   className="w-3 h-3 rounded-full border border-black/30"
                   style={{
                     background: ['#F5D033','#1E40AF','#DC2626','#4C1D95','#0F0F0F'][i]
                   }} />
            ))}
          </div>
        </div>

        <div className="w-full max-w-md space-y-6">
          <div className="rounded-2xl bg-zinc-900/60 backdrop-blur-xl border border-zinc-700/50 p-6 shadow-2xl">
            <div className="text-xs uppercase tracking-widest text-zinc-500 mb-4 font-bold">游戏模式</div>
            <div className="grid grid-cols-2 gap-3 mb-6">
              <ModeCard
                active={mode === '8ball'}
                onClick={() => setMode('8ball')}
                title="8 球"
                desc="全色/半色"
                icon={<Trophy className="w-5 h-5" />}
              />
              <ModeCard
                active={mode === '9ball'}
                onClick={() => setMode('9ball')}
                title="9 球"
                desc="按数字顺序"
                icon={<CircleDot className="w-5 h-5" />}
              />
            </div>

            <div className="text-xs uppercase tracking-widest text-zinc-500 mb-4 font-bold">对战模式</div>
            <div className="grid grid-cols-2 gap-3 mb-6">
              <ModeCard
                active={playMode === 'pve'}
                onClick={() => setPlayMode('pve')}
                title="人机对战"
                desc="挑战 AI"
                icon={<Bot className="w-5 h-5" />}
              />
              <ModeCard
                active={playMode === 'pvp'}
                onClick={() => setPlayMode('pvp')}
                title="本地双人"
                desc="轮流击球"
                icon={<Users className="w-5 h-5" />}
              />
            </div>

            {playMode === 'pve' && (
              <>
                <div className="text-xs uppercase tracking-widest text-zinc-500 mb-4 font-bold">AI 难度</div>
                <div className="grid grid-cols-2 gap-3 mb-2">
                  <DifficultyCard
                    active={difficulty === 'easy'}
                    onClick={() => setDifficulty('easy')}
                    title="简单"
                    desc="入门友好"
                  />
                  <DifficultyCard
                    active={difficulty === 'hard'}
                    onClick={() => setDifficulty('hard')}
                    title="困难"
                    desc="会做安全球"
                  />
                </div>
              </>
            )}
          </div>

          <button
            onClick={handleStart}
            className="w-full group relative rounded-xl py-5 bg-gradient-to-br from-amber-500 via-amber-600 to-amber-700 hover:from-amber-400 hover:to-amber-600 text-zinc-900 font-black text-xl tracking-wider shadow-[0_0_40px_rgba(212,168,75,0.3)] transition-all hover:shadow-[0_0_60px_rgba(212,168,75,0.5)] hover:scale-[1.02] active:scale-[0.98] border border-amber-300/50 flex items-center justify-center gap-3"
          >
            <Play className="w-6 h-6" />
            <span>开始对局</span>
            <ChevronRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
          </button>

          <button
            onClick={gotoReplays}
            className="w-full rounded-xl py-3.5 bg-zinc-800/60 hover:bg-zinc-800 border border-zinc-700/60 text-zinc-300 hover:text-amber-300 font-semibold tracking-wider transition-all flex items-center justify-center gap-2 hover:border-amber-600/50"
          >
            <BookOpenCheck className="w-5 h-5" />
            <span>查看历史回放</span>
          </button>
        </div>

        <div className="mt-14 text-center text-zinc-600 text-xs space-y-1">
          <div>操作：鼠标瞄准 · 按住左键蓄力 · 松开击球</div>
          <div>自由球时：点击桌面任意位置放置白球</div>
        </div>
      </div>
    </div>
  );
}

function ModeCard({
  active, onClick, title, desc, icon,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  desc: string;
  icon: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`relative p-4 rounded-xl border-2 text-left transition-all ${
        active
          ? 'bg-gradient-to-br from-amber-900/40 to-amber-950/60 border-amber-500/70 text-amber-200 shadow-[0_0_20px_rgba(212,168,75,0.2)]'
          : 'bg-zinc-800/30 border-zinc-700/40 text-zinc-400 hover:border-zinc-600 hover:bg-zinc-800/50'
      }`}
    >
      <div className={`mb-2 ${active ? 'text-amber-400' : ''}`}>{icon}</div>
      <div className="font-bold text-base">{title}</div>
      <div className="text-[11px] opacity-70 mt-0.5">{desc}</div>
      {active && (
        <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
      )}
    </button>
  );
}

function DifficultyCard({
  active, onClick, title, desc,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  desc: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`p-3 rounded-xl border-2 text-left transition-all ${
        active
          ? active && title === '困难'
            ? 'bg-gradient-to-br from-rose-900/40 to-rose-950/60 border-rose-500/70 text-rose-200 shadow-[0_0_20px_rgba(244,63,94,0.15)]'
            : 'bg-gradient-to-br from-emerald-900/40 to-emerald-950/60 border-emerald-500/70 text-emerald-200 shadow-[0_0_20px_rgba(16,185,129,0.15)]'
          : 'bg-zinc-800/30 border-zinc-700/40 text-zinc-400 hover:border-zinc-600'
      }`}
    >
      <div className="font-bold text-sm">{title}</div>
      <div className="text-[11px] opacity-70 mt-0.5">{desc}</div>
    </button>
  );
}
