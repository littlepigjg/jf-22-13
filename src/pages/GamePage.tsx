import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../stores/useGameStore';
import GameCanvas from '../components/GameCanvas';
import HUD from '../components/HUD';
import PowerBar from '../components/PowerBar';
import {
  Home, RotateCcw, Save, Eye, EyeOff } from 'lucide-react';
import { FoulType } from '../game/types';

export default function GamePage() {
  const navigate = useNavigate();

  const phase = useGameStore((s) => s.phase);
  const winner = useGameStore((s) => s.winner);
  const showAimLine = useGameStore((s) => s.showAimLine);
  const foul = useGameStore((s) => s.foul);
  const replayRecording = useGameStore((s) => s.replayRecording);
  const backToMenu = useGameStore((s) => s.backToMenu);
  const resetGame = useGameStore((s) => s.resetGame);
  const saveReplayToStorage = useGameStore((s) => s.saveReplayToStorage);
  const setShowAimLine = useGameStore((s) => s.setShowAimLine);
  const startGame = useGameStore((s) => s.startGame);
  const mode = useGameStore((s) => s.mode);
  const playMode = useGameStore((s) => s.playMode);
  const selectedAIDifficulty = useGameStore((s) => s.selectedAIDifficulty);
  const balls = useGameStore((s) => s.balls);

  useEffect(() => {
    if (balls.length === 0) {
      navigate('/');
    }
  }, [balls.length, navigate]);

  const handleBackToMenu = () => {
    backToMenu();
    navigate('/');
  };

  const handleReset = () => {
    startGame(mode, playMode, selectedAIDifficulty);
  };

  const handleSaveReplay = () => {
    const ok = saveReplayToStorage();
    if (ok) {
      alert('回放已保存！');
    } else {
      alert('保存失败，请确保比赛已结束。');
    }
  };

  const isGameOver = phase === 'gameover';
  const hasFoul = foul !== FoulType.NONE && foul !== undefined;

  return (
    <div className="min-h-screen w-full bg-[#0a0f0a] relative overflow-hidden">
      <div className="absolute inset-0 opacity-30 pointer-events-none">
        <div className="absolute top-[5%] right-[5%] w-40 h-40 rounded-full bg-amber-500/10 blur-3xl" />
        <div className="absolute bottom-[10%] left-[8%] w-36 h-36 rounded-full bg-emerald-500/10 blur-3xl" />
      </div>

      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-[1100px]">
          <div className="flex items-center justify-between mb-5 px-2">
            <button
              onClick={handleBackToMenu}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-800/60 hover:bg-zinc-800 border border-zinc-700/60 text-zinc-300 hover:text-amber-300 transition-all text-sm font-semibold"
            >
              <Home className="w-4 h-4" />
              <span>返回菜单</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowAimLine(!showAimLine)}
                className={`p-2.5 rounded-xl border transition-all ${
                  showAimLine
                    ? 'bg-amber-900/40 border-amber-600/50 text-amber-300'
                    : 'bg-zinc-800/60 border-zinc-700/60 text-zinc-400 hover:text-amber-300'
                }`}
                title={showAimLine ? '关闭瞄准线' : '显示瞄准线'}
              >
                {showAimLine ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </button>

              <button
                onClick={handleReset}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-800/60 hover:bg-zinc-800 border border-zinc-700/60 text-zinc-300 hover:text-amber-300 transition-all text-sm font-semibold"
              >
                <RotateCcw className="w-4 h-4" />
                <span>重置对局</span>
              </button>

              <button
                onClick={handleSaveReplay}
                disabled={!isGameOver && !replayRecording}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all text-sm font-semibold ${
                  isGameOver
                    ? 'bg-gradient-to-br from-amber-500/20 to-amber-700/30 border-amber-500/50 text-amber-300 hover:from-amber-500/30 hover:to-amber-700/40 shadow-[0_0_20px_rgba(212,168,75,0.15)]'
                    : 'bg-zinc-800/40 border-zinc-700/40 text-zinc-500 cursor-not-allowed'
                }`}
              >
                <Save className="w-4 h-4" />
                <span>{isGameOver ? '保存回放' : '录制中...'}</span>
              </button>
            </div>
          </div>

          <div className="flex items-start gap-5 justify-center">
            <div className="flex flex-col gap-4">
              <GameCanvas />
              <HUD />

              {isGameOver && winner && (
                <div className="mt-4 rounded-2xl bg-gradient-to-br from-amber-900/50 via-amber-950/70 to-zinc-900/50 backdrop-blur-xl border border-amber-600/40 p-6 shadow-2xl text-center">
                  <div className="text-5xl mb-3">🏆</div>
                  <div className="text-3xl font-serif font-black bg-gradient-to-b from-amber-300 to-amber-500 bg-clip-text text-transparent mb-2">
                    {winner.name} 获胜！
                  </div>
                  <div className="text-zinc-400 text-sm mb-5">
                    共进行 {useGameStore.getState().turnNumber} 回合
                  </div>
                  <div className="flex items-center justify-center gap-3">
                    <button
                      onClick={handleReset}
                      className="px-6 py-3 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 hover:from-emerald-400 hover:to-emerald-600 text-zinc-900 font-bold transition-all shadow-lg hover:scale-105 active:scale-95"
                    >
                      再来一局
                    </button>
                    <button
                      onClick={handleSaveReplay}
                      className="px-6 py-3 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 hover:from-amber-400 hover:to-amber-600 text-zinc-900 font-bold transition-all shadow-lg hover:scale-105 active:scale-95"
                    >
                      保存回放
                    </button>
                    <button
                      onClick={handleBackToMenu}
                      className="px-6 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold transition-all border border-zinc-600"
                    >
                      返回菜单
                    </button>
                  </div>
                  {hasFoul && (
                    <div className="mt-4 text-rose-400 text-sm">本局存在犯规判罚</div>
                  )}
                </div>
              )}
            </div>

            <div className="flex-shrink-0 pt-2">
              <PowerBar />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
