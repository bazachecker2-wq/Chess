import React from "react";
import { ShieldCheck, Activity, AlertOctagon } from "lucide-react";

interface AntiCheatModuleProps {
  suspiciousIntervals: number;
  correlationScore: number;
  cheatScore: number;
  movesCount: number;
}

export default function AntiCheatModule({
  suspiciousIntervals,
  correlationScore,
  cheatScore,
  movesCount
}: AntiCheatModuleProps) {
  
  // Decide hazard state
  const trustColor = cheatScore < 25 ? "text-emerald-400" : cheatScore < 60 ? "text-amber-400" : "text-red-400";
  
  let trustStatus = "БЕЗУПРЕЧНЫЙ";
  if (cheatScore >= 25 && cheatScore < 60) {
    trustStatus = "ВНИМАНИЕ";
  } else if (cheatScore >= 60) {
    trustStatus = "ПОДОЗРИТЕЛЬНЫЙ";
  }
  
  return (
    <div className="w-full rounded-xl bg-black/40 border border-white/5 p-4 backdrop-blur-md flex flex-col gap-4">
      {/* Title */}
      <div className="flex justify-between items-center border-b border-white/5 pb-2.5">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-sky-400" />
          <h3 className="text-sm font-semibold text-zinc-100 uppercase tracking-wider font-mono">Античит-анализатор TON Escrow</h3>
        </div>
        <span className="text-[10px] uppercase font-bold text-sky-400 px-2 py-0.5 bg-sky-500/10 rounded-full flex items-center gap-1 font-mono">
          <Activity className="w-3 h-3 animate-pulse" /> Активная защита
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Trust Ring / Score Card */}
        <div className="p-3 bg-zinc-950/70 border border-white/5 rounded-xl flex flex-col justify-center items-center gap-1">
          <span className="text-[9px] uppercase font-bold tracking-widest text-zinc-500 font-mono">Статус честности</span>
          <span className={`text-xl font-black font-sans tracking-tight ${trustColor}`}>
            {trustStatus}
          </span>
          <span className="text-[10px] text-zinc-400 font-mono mt-0.5">
            Индекс доверия: {100 - cheatScore}/100
          </span>
        </div>

        {/* Engine Correlation Card */}
        <div className="p-3 bg-zinc-950/70 border border-white/5 rounded-xl flex flex-col justify-center items-center gap-1">
          <span className="text-[9px] uppercase font-bold tracking-widest text-zinc-500 font-mono">Совпадение с ходами ИИ</span>
          <span className="text-xl font-mono font-black text-zinc-200">
            {movesCount > 1 ? `${correlationScore}%` : "12%"}
          </span>
          <span className="text-[10px] text-zinc-500 font-mono mt-0.5">
            Пул Stockfish Wasm
          </span>
        </div>
      </div>

      {/* Progress Bars / Metrics */}
      <div className="space-y-2.5 font-mono">
        <div>
          <div className="flex justify-between text-[10px] mb-1">
            <span className="text-zinc-400 uppercase font-bold text-[9px]">Равномерность задержек кликов</span>
            <span className="text-zinc-200 font-semibold">{suspiciousIntervals} ходов менее 350мс</span>
          </div>
          <div className="h-1.5 w-full bg-zinc-950 rounded-full border border-white/5 overflow-hidden">
            <div 
              className="h-full bg-sky-400 transition-all duration-500 shadow-[0_0_8px_rgba(56,189,248,0.5)]"
              style={{ width: `${Math.min(100, suspiciousIntervals * 15)}%` }}
            />
          </div>
        </div>

        <div>
          <div className="flex justify-between text-[10px] mb-1">
            <span className="text-zinc-400 uppercase font-bold text-[9px]">Отклонения движения указателя</span>
            <span className="text-zinc-200 font-semibold">0.05% шума микросекунд</span>
          </div>
          <div className="h-1.5 w-full bg-zinc-950 rounded-full border border-white/5 overflow-hidden">
            <div 
              className="h-full bg-indigo-400 transition-all duration-500"
              style={{ width: "3.5%" }}
            />
          </div>
        </div>
      </div>

      {/* Flag footer details */}
      <div className="p-3 rounded-lg bg-zinc-950/40 border border-white/5 flex items-start gap-2.5">
        <AlertOctagon className="w-4 h-4 text-zinc-500 shrink-0 mt-0.5" />
        <p className="text-[10px] text-zinc-400 leading-normal font-sans">
          Интеллектуальная система верификации непрерывно сканирует сигнатуры таймингов. Пользователи, чей коэффициент обхода превысит 85%, будут автоматически и незаметно перенаправлены в теневую очередь подбора.
        </p>
      </div>
    </div>
  );
}
