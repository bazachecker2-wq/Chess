import React, { useState, useEffect } from "react";
import { Brain, Sparkles, MessageCircle, RefreshCw, Volume2, ShieldCheck } from "lucide-react";
import { AICommentary } from "../types";

export interface AIAnalystProps {
  fen: string;
  history: string[];
  personality: string;
  onPersonalityChange: (p: string) => void;
  whiteName: string;
  blackName: string;
}

export default function AIAnalyst({
  fen,
  history,
  personality,
  onPersonalityChange,
  whiteName,
  blackName
}: AIAnalystProps) {
  const [commentary, setCommentary] = useState<AICommentary | null>(null);
  const [loading, setLoading] = useState(false);
  const [playingVoice, setPlayingVoice] = useState(false);

  const fetchAIAnalysis = async () => {
    if (history.length === 0) return;
    setLoading(true);
    try {
      const response = await fetch("/api/ai/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fen,
          history,
          lastMove: history[history.length - 1],
          personality,
          whiteName,
          blackName
        })
      });
      const data = await response.json();
      setCommentary(data);
    } catch (e) {
      console.error("Failed to fetch coach analysis:", e);
    } finally {
      setLoading(false);
    }
  };

  // Automatically refresh AI analysis when move history updates
  useEffect(() => {
    fetchAIAnalysis();
  }, [history.length, personality]);

  const speakCommentary = () => {
    if (!commentary) return;
    setPlayingVoice(true);
    
    // Fallback to Native TTS for premium Telegram interface
    const utterance = new SpeechSynthesisUtterance(commentary.comment);
    utterance.volume = 1.0;
    utterance.rate = 1.03;
    
    if (personality === "puck") {
      utterance.pitch = 0.85; // poetic deep
    } else if (personality === "zephyr") {
      utterance.pitch = 0.95; // peaceful monk
    } else if (personality === "kore") {
      utterance.pitch = 1.1;  // commander sharp
    } else {
      utterance.pitch = 1.25;  // sharp roast
    }

    utterance.onend = () => setPlayingVoice(false);
    utterance.onerror = () => setPlayingVoice(false);
    window.speechSynthesis.speak(utterance);
  };

  const getEvaluationBar = (evalValue: number | undefined) => {
    const value = evalValue || 0.0;
    // Normalize -5 to +5 centipawns into percentage (0 to 100)
    let percentage = 50 + (value * 10);
    percentage = Math.max(5, Math.min(95, percentage));
    return percentage;
  };

  const evalPct = getEvaluationBar(commentary?.evaluation);

  const personalities = [
    { id: "puck", name: "Пак (Космос)", color: "border-fuchsia-500/20 text-fuchsia-400" },
    { id: "zephyr", name: "Зефир (Дзен)", color: "border-sky-500/20 text-sky-400" },
    { id: "kore", name: "Кора (Генерал)", color: "border-emerald-500/20 text-emerald-400" },
    { id: "savage", name: "Саваж (Критик)", color: "border-red-500/20 text-red-400" }
  ];

  return (
    <div className="w-full rounded-2xl bg-zinc-900/30 border border-white/5 p-5 backdrop-blur-md flex flex-col gap-5">
      {/* Selector and Header */}
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-center border-b border-white/5 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-white uppercase tracking-widest">Аналитика ИИ Gemini</h3>
          </div>
          <button
            onClick={fetchAIAnalysis}
            disabled={loading || history.length === 0}
            className="px-3 py-1.5 text-xs text-zinc-400 font-bold hover:text-zinc-100 bg-zinc-950 hover:bg-zinc-800 disabled:opacity-40 transition-colors rounded-xl border border-white/5 flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} /> Обновить
          </button>
        </div>

        {/* Personality toggles */}
        <div className="flex flex-wrap gap-2 justify-center">
          {personalities.map((pers) => (
            <button
              key={pers.id}
              onClick={() => onPersonalityChange(pers.id)}
              className={`px-4 py-1.5 text-xs font-bold rounded-xl border-2 transition-all ${
                personality === pers.id
                  ? "bg-amber-500 text-[#0a0a0c] border-amber-500 shadow-md scale-105"
                  : "bg-zinc-900/50 text-zinc-400 border-transparent hover:bg-zinc-800 hover:text-zinc-200"
              }`}
            >
              {pers.name}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="py-8 flex flex-col items-center justify-center gap-3">
          <div className="w-6 h-6 rounded-full border-2 border-amber-400 border-t-transparent animate-spin" />
          <span className="text-xs uppercase font-bold tracking-widest text-zinc-500">Gemini анализирует позицию...</span>
        </div>
      ) : commentary ? (
        <div className="flex flex-col gap-4">
          {/* Main Commentary bubble */}
          <div className="p-5 rounded-2xl bg-zinc-950/60 border border-white/5 flex flex-col gap-3 relative shadow-inner">
            <div className="flex justify-between items-center">
              <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-amber-500 opacity-80">
                ОПИСАНИЕ ПАРТИИ: {personality}
              </span>
              <button
                onClick={speakCommentary}
                className={`p-2 rounded-xl transition-colors ${
                  playingVoice ? "bg-amber-500/20 text-amber-400" : "bg-zinc-900 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"
                }`}
                title="Озвучить"
              >
                <Volume2 className="w-4 h-4" />
              </button>
            </div>
            <p className="text-sm sm:text-base font-semibold leading-relaxed text-zinc-100 italic">
              "{commentary.comment}"
            </p>
          </div>

          {/* Positional Eval Bar */}
          <div className="flex flex-col gap-1.5 font-mono">
            <div className="flex justify-between items-center text-[10px] font-bold">
              <span className="text-zinc-500">ПЕРЕВЕС БЕЛЫХ</span>
              <span className="text-zinc-200 text-base">
                {commentary.evaluation !== undefined
                  ? (commentary.evaluation >= 0 ? `+${commentary.evaluation.toFixed(2)}` : commentary.evaluation.toFixed(2))
                  : "0.00"}
              </span>
              <span className="text-zinc-500">ПЕРЕВЕС ЧЕРНЫХ</span>
            </div>
            
            {/* Visual Eval Meter Bar */}
            <div className="w-full h-3 rounded-full bg-zinc-950 flex overflow-hidden border border-white/5 relative shadow-inner">
              <div 
                className="h-full bg-amber-500 flex items-center transition-all duration-700 ease-out shadow-[0_0_12px_rgba(245,158,11,0.5)]"
                style={{ width: `${evalPct}%` }}
              />
              <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-zinc-700/60" />
            </div>
          </div>

          {/* Coach Advice and Threat Assessments */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
            <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/10 flex flex-col gap-2">
              <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-2">
                <Brain className="w-4 h-4" /> Совет тренера
              </h4>
              <p className="text-sm text-zinc-300 leading-relaxed font-medium">
                {commentary.coachAdvice || "Обеспечьте безопасность центральной пешки перед продвижением структур на флангах."}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-orange-500/5 border border-orange-500/10 flex flex-col gap-2">
              <h4 className="text-xs font-bold text-orange-400 uppercase tracking-widest flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" /> Угрозы
              </h4>
              <p className="text-sm text-zinc-300 leading-relaxed font-medium">
                {commentary.threatAssessment || "Прямых угроз не зафиксировано. Продолжайте размеренное развитие пространства."}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="py-8 text-center flex flex-col items-center justify-center gap-4">
          <MessageCircle className="w-8 h-8 text-zinc-700 animate-pulse" />
          <p className="text-sm text-zinc-500 font-medium leading-relaxed max-w-sm">
            Сделайте первый ход на шахматной доске выше, чтобы узнать мнение ИИ тренера!
          </p>
        </div>
      )}
    </div>
  );
}
