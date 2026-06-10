import { useGameStore } from '../stores/useGameStore';

export default function PowerBar() {
  const power = useGameStore((s) => s.power);
  const isCharging = useGameStore((s) => s.isCharging);
  const phase = useGameStore((s) => s.phase);

  const visible = isCharging || phase === 'charging' || power > 0;

  const color = (() => {
    if (power < 0.4) return '#4ade80';
    if (power < 0.75) return '#facc15';
    return '#ef4444';
  })();

  return (
    <div className={`transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-60'}`}>
      <div className="text-amber-300 text-xs font-bold mb-2 tracking-widest text-center">POWER</div>
      <div className="relative w-10 h-64 rounded-full bg-zinc-900/80 border-2 border-amber-700/50 overflow-hidden shadow-inner">
        <div
          className="absolute bottom-0 left-0 right-0 rounded-b-full transition-all duration-75"
          style={{
            height: `${Math.max(2, power * 100)}%`,
            background: `linear-gradient(to top, #22c55e 0%, #22c55e 30%, #eab308 55%, #ef4444 85%, #b91c1c 100%)`,
            boxShadow: `inset 0 -6px 12px rgba(0,0,0,0.4), 0 0 18px ${color}70`,
          }}
        />

        <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-0.5 bg-white/10" />

        {[0.25, 0.5, 0.75].map((mark) => (
          <div
            key={mark}
            className="absolute left-0 right-0 h-0.5 bg-white/15"
            style={{ bottom: `${mark * 100}%` }}
          />
        ))}

        <div className="absolute -top-1 left-0 right-0 flex justify-center">
          <div className="text-[10px] text-rose-300/70 font-bold">MAX</div>
        </div>
        <div className="absolute -bottom-1 left-0 right-0 flex justify-center">
          <div className="text-[10px] text-emerald-300/70 font-bold">MIN</div>
        </div>
      </div>

      <div className="mt-3 text-center">
        <div
          className="text-2xl font-bold font-mono"
          style={{ color }}
        >
          {Math.round(power * 100)}
        </div>
        <div className="text-[10px] text-zinc-500 uppercase tracking-wider">%</div>
      </div>
    </div>
  );
}
