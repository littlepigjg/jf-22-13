import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loadReplays, deleteReplay, getReplay } from '../utils/storage';
import type { ReplayFile } from '../game/types';
import { formatDuration, formatTimestamp } from '../game/replay';
import { Trash2, Play, ArrowLeft, Clock, Trophy, Disc3 } from 'lucide-react';

export default function ReplayList() {
  const navigate = useNavigate();
  const [replays, setReplays] = useState<ReplayFile[]>([]);
  const [playingId, setPlayingId] = useState<string | null>(null);

  useEffect(() => {
    setReplays(loadReplays());
  }, []);

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteReplay(id);
    setReplays(loadReplays());
  };

  const handlePlay = (id: string) => {
    setPlayingId(id);
    const r = getReplay(id);
    if (r) {
      navigate(`/replays/${id}`);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#0a0f0a] py-10 px-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate('/')}
            className="p-3 rounded-xl bg-zinc-800/60 hover:bg-zinc-800 border border-zinc-700/60 text-zinc-300 hover:text-amber-300 transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl font-serif font-bold bg-gradient-to-b from-amber-300 to-amber-500 bg-clip-text text-transparent">
              历史回放
            </h1>
            <p className="text-zinc-500 text-sm mt-1">
              共 {replays.length} 场对局记录
            </p>
          </div>
        </div>

        {replays.length === 0 ? (
          <div className="rounded-2xl bg-zinc-900/60 backdrop-blur-xl border border-zinc-700/50 p-16 text-center">
            <Disc3 className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
            <div className="text-zinc-500 text-lg font-semibold mb-2">暂无回放记录</div>
            <div className="text-zinc-600 text-sm">完成对局后可在结算页面保存回放</div>
            <button
              onClick={() => navigate('/')}
              className="mt-8 px-6 py-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-zinc-900 font-bold transition-all"
            >
              返回主页开始游戏
            </button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {replays.map((r, idx) => (
              <div
                key={r.id}
                className="group relative rounded-2xl bg-zinc-900/60 backdrop-blur-xl border border-zinc-700/50 p-5 hover:border-amber-600/40 transition-all cursor-pointer overflow-hidden"
                onClick={() => handlePlay(r.id)}
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-amber-500/10 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity" />

                <div className="relative flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-600 to-amber-800 flex items-center justify-center text-amber-100 font-black text-lg font-serif">
                      #{idx + 1}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-zinc-800 text-zinc-400 border border-zinc-700">
                          {r.mode === '8ball' ? '8 球' : '9 球'}
                        </span>
                        <span className="text-zinc-500 text-xs flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDuration(r.duration)}
                        </span>
                      </div>
                      <div className="text-[11px] text-zinc-600">
                        {formatTimestamp(r.timestamp)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      className={`p-2 rounded-lg transition-all ${
                        playingId === r.id
                          ? 'bg-amber-600 text-zinc-900'
                          : 'bg-zinc-800/60 text-zinc-400 hover:bg-emerald-700/50 hover:text-emerald-200'
                      }`}
                      title="播放回放"
                    >
                      <Play className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => handleDelete(r.id, e)}
                      className="p-2 rounded-lg bg-zinc-800/60 text-zinc-400 hover:bg-rose-800/50 hover:text-rose-300 transition-all"
                      title="删除"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="relative border-t border-zinc-800 pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    {r.players.map((p) => (
                      <div
                        key={p.id}
                        className={`px-3 py-2 rounded-lg border ${
                          r.winner?.id === p.id
                            ? 'bg-amber-950/40 border-amber-600/40'
                            : 'bg-zinc-800/30 border-zinc-700/30'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          {r.winner?.id === p.id && (
                            <Trophy className="w-3.5 h-3.5 text-amber-400" />
                          )}
                          <span className={`text-sm font-bold ${r.winner?.id === p.id ? 'text-amber-300' : 'text-zinc-400'}`}>
                            {p.name}
                          </span>
                        </div>
                        <div className="text-[10px] text-zinc-600">
                          得分：{p.score}
                          {p.isAI && <span className="ml-1">· AI</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="text-[10px] text-zinc-600 mt-3">
                    共 {r.shots.length} 杆击球 · {r.frames.length} 帧数据
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
