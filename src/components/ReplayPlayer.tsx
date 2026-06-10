import { useEffect, useRef, useState } from 'react';
import type { ReplayFile, Ball, Table } from '../game/types';
import { TABLE } from '../game/constants';
import { interpolateFrames, formatDuration } from '../game/replay';
import { drawTable, drawBall, clearCanvas } from '../game/draw-helpers';
import { Play, Pause, SkipBack, SkipForward, FastForward, ChevronLeft } from 'lucide-react';

const CANVAS_W = 880;
const CANVAS_H = 480;

interface Props {
  replay: ReplayFile;
  onBack: () => void;
}

export default function ReplayPlayer({ replay, onBack }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const [progress, setProgress] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const lastTimeRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;

    const loop = (time: number) => {
      const dt = (time - lastTimeRef.current) / 1000;
      lastTimeRef.current = time;

      if (playing && replay.frames.length > 0) {
        const totalFrames = replay.frames[replay.frames.length - 1].frameIndex;
        if (totalFrames > 0) {
          const frameRate = 30;
          const delta = (dt * speed * frameRate) / totalFrames;
          setProgress((prev) => {
            const next = Math.min(1, prev + delta);
            if (next >= 1) {
              setPlaying(false);
            }
            return next;
          });
        }
      }

      const state = interpolateFrames(replay.frames, progress);
      const balls = state ? state.balls : replay.initialBalls;

      clearCanvas(ctx, CANVAS_W, CANVAS_H);
      drawTable(ctx, TABLE);
      for (const b of balls) {
        if (!b.pocketed) drawBall(ctx, b);
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [playing, progress, speed, replay]);

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    setProgress(parseFloat(e.target.value));
  };

  const skipTo = (p: number) => {
    setProgress(Math.max(0, Math.min(1, p)));
  };

  const toggleSpeed = () => {
    const speeds = [0.5, 1, 1.5, 2];
    const idx = speeds.indexOf(speed);
    setSpeed(speeds[(idx + 1) % speeds.length]);
  };

  const totalFrames = replay.frames.length > 0 ? replay.frames[replay.frames.length - 1].frameIndex : 0;
  const currentFrame = Math.round(progress * totalFrames);
  const totalDuration = replay.duration;
  const currentDuration = Math.round(progress * totalDuration);

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-5">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-800/60 hover:bg-zinc-800 border border-zinc-700/60 text-zinc-300 hover:text-amber-300 transition-all text-sm font-semibold"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>返回列表</span>
        </button>

        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 rounded-lg bg-zinc-800/60 border border-zinc-700/40">
            <span className="text-xs text-zinc-500 mr-2">模式</span>
            <span className="text-sm font-bold text-amber-300">
              {replay.mode === '8ball' ? '8 球' : '9 球'}
            </span>
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-zinc-800/60 border border-zinc-700/40">
            <span className="text-xs text-zinc-500 mr-2">胜者</span>
            <span className="text-sm font-bold text-emerald-300">
              {replay.winner?.name || '未完成'}
            </span>
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-zinc-800/60 border border-zinc-700/40">
            <span className="text-xs text-zinc-500 mr-2">总杆数</span>
            <span className="text-sm font-bold text-sky-300">{replay.shots.length}</span>
          </div>
        </div>
      </div>

      <div className="relative inline-block">
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          className="rounded-xl shadow-2xl border border-amber-900/60"
          style={{ maxWidth: '100%', height: 'auto' }}
        />
      </div>

      <div className="mt-5 rounded-2xl bg-zinc-900/60 backdrop-blur-xl border border-zinc-700/50 p-5">
        <div className="mb-4">
          <div className="flex items-center justify-between text-xs text-zinc-500 mb-2">
            <span className="font-mono">{formatDuration(currentDuration)}</span>
            <span className="font-mono">帧 {currentFrame}/{totalFrames}</span>
            <span className="font-mono">{formatDuration(totalDuration)}</span>
          </div>
          <div className="relative h-3 bg-zinc-800 rounded-full overflow-hidden border border-zinc-700/50">
            <div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-amber-600 to-amber-400 rounded-full transition-all"
              style={{ width: `${progress * 100}%` }}
            />
            <input
              type="range"
              min="0"
              max="1"
              step="0.001"
              value={progress}
              onChange={handleSeek}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          </div>
        </div>

        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => skipTo(progress - 0.1)}
            className="p-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700/50 text-zinc-300 hover:text-amber-300 transition-all"
            title="后退10%"
          >
            <SkipBack className="w-5 h-5" />
          </button>

          <button
            onClick={() => setPlaying(!playing)}
            className="p-4 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 hover:from-amber-400 hover:to-amber-600 text-zinc-900 font-bold transition-all shadow-[0_0_30px_rgba(212,168,75,0.3)] hover:scale-105 active:scale-95"
          >
            {playing ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
          </button>

          <button
            onClick={() => skipTo(progress + 0.1)}
            className="p-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700/50 text-zinc-300 hover:text-amber-300 transition-all"
            title="前进10%"
          >
            <SkipForward className="w-5 h-5" />
          </button>

          <div className="w-px h-8 bg-zinc-700 mx-2" />

          <button
            onClick={toggleSpeed}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700/50 text-zinc-300 hover:text-amber-300 transition-all"
          >
            <FastForward className="w-4 h-4" />
            <span className="font-mono font-bold">{speed}x</span>
          </button>

          <button
            onClick={() => skipTo(0)}
            className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700/50 text-zinc-300 hover:text-amber-300 transition-all text-sm font-semibold"
          >
            重新开始
          </button>
        </div>
      </div>
    </div>
  );
}
