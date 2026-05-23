import React, { useState, useEffect, useRef } from "react";
import { 
  Tv, 
  Coins, 
  Users, 
  Send, 
  ShieldCheck, 
  Sword, 
  Sparkles, 
  Activity, 
  TrendingUp, 
  Flame,
  ArrowRight
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { UserProfile } from "../types";
import ChessBoard from "./ChessBoard";

interface SpectatePanelProps {
  profile: UserProfile;
  setProfile: (profile: UserProfile) => void;
  walletConnected: boolean;
  onShowToast?: (msg: string, type?: "success" | "info" | "error") => void;
}

export default function SpectatePanel({ profile, setProfile, walletConnected, onShowToast }: SpectatePanelProps) {
  const [liveBattle, setLiveBattle] = useState<any>(null);
  const [betType, setBetType] = useState<string>("white_wins");
  const [betAmount, setBetAmount] = useState<number>(5);
  const [chatText, setChatText] = useState<string>("");
  const [takeoverColor, setTakeoverColor] = useState<"white" | "black" | null>(null);
  const [myBets, setMyBets] = useState<any[]>([]);
  const [finishedHistoryCount, setFinishedHistoryCount] = useState<number>(0);
  const [mobileTab, setMobileTab] = useState<"game" | "bets">("game");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Poll for live showdown state
  useEffect(() => {
    const fetchLiveBattleState = async () => {
      try {
        const response = await fetch("/api/spectate/live");
        if (response.ok) {
          const data = await response.json();
          setLiveBattle(data.liveAIBattle);
          setFinishedHistoryCount(data.finishedCount);
        }
      } catch (e) {
        console.error("Failed to poll spectate stream:", e);
      }
    };

    fetchLiveBattleState();
    const interval = setInterval(fetchLiveBattleState, 2200);
    return () => clearInterval(interval);
  }, []);

  // Sync users' own betting slips from the active battle
  useEffect(() => {
    if (liveBattle && liveBattle.bets) {
      const filtered = liveBattle.bets.filter((b: any) => b.tgId === profile.id);
      setMyBets(filtered);
    }
  }, [liveBattle, profile.id]);

  // Handle placing bets on events inside matching
  const placeBet = async () => {
    if (betAmount <= 0) return;
    if (profile.balanceTON < betAmount) {
      if (onShowToast) {
        onShowToast("Недостаточно баланса TON для совершения ставки. Получите TON в панели 'Кошелек'!", "error");
      } else {
        alert("Недостаточно баланса TON для совершения ставки. Получите TON в панели 'Кошелек'!");
      }
      return;
    }

    try {
      const response = await fetch("/api/spectate/bet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tgId: profile.id,
          betType,
          amount: betAmount
        })
      });

      if (response.ok) {
        const data = await response.json();
        setLiveBattle(data.liveAIBattle);
        // Update user state local balance
        setProfile({
          ...profile,
          balanceTON: data.user.balanceTON
        });
        if (onShowToast) {
          onShowToast(`🎉 Ваша ставка на "${getBetLabel(betType)}" в размере ${betAmount} TON принята!`, "success");
        } else {
          alert(`🎉 Ваша ставка на "${getBetLabel(betType)}" в размере ${betAmount} TON принята!`);
        }
      } else {
        const err = await response.json();
        if (onShowToast) {
          onShowToast(err.error || "Ошибка регистрации ставки", "error");
        } else {
          alert(err.error || "Ошибка регистрации ставки");
        }
      }
    } catch (e) {
      console.error("Bet placement error:", e);
    }
  };

  const getBetLabel = (type: string) => {
    if (type === "white_wins") return "Победа Белых (ИИ)";
    if (type === "black_wins") return "Победа Черных (ИИ)";
    if (type === "draw") return "Ничья на доске";
    if (type === "queen_survives") return "Оба Ферзя выживают";
    if (type === "moves_over_35") return "Всего ходов > 35";
    if (type === "moves_under_30") return "Всего ходов < 30";
    return "";
  };

  // Chat message submit
  const sendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatText.trim() || !liveBattle) return;

    try {
      const response = await fetch("/api/spectate/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tgId: profile.id,
          text: chatText
        })
      });

      if (response.ok) {
        const data = await response.json();
        setLiveBattle({
          ...liveBattle,
          comments: data.comments
        });
        setChatText("");
        setTimeout(() => {
          if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
          }
        }, 100);
      }
    } catch (e) {
      console.error("Chat sending error:", e);
    }
  };

  // Custom takeover controls to play vs chess engine on spectators board
  const takeoverControl = async (color: "white" | "black") => {
    try {
      const response = await fetch("/api/spectate/takeover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tgId: profile.id,
          color
        })
      });

      if (response.ok) {
        const data = await response.json();
        setLiveBattle(data.liveAIBattle);
        setTakeoverColor(color);
        if (onShowToast) {
          onShowToast(`🔥 Вы перехватили управление за ${color === "white" ? "БЕЛЫХ" : "ЧЕРНЫХ"}! Сделайте ваш ход.`, "success");
        } else {
          alert(`🔥 Вы успешно перехватили управление за ${color === "white" ? "БЕЛЫХ" : "ЧЕРНЫХ"}! Сделайте ваш ход на шахматной доске.`);
        }
      }
    } catch (e) {
      console.error("Takeover execution fail:", e);
    }
  };

  // Receive move from the interactive ChessBoard of takeover game
  const handleTakeoverMove = async (newFen: string, sanMove: string) => {
    if (!liveBattle || !takeoverColor) return;

    // Fast-optimistic history and FEN sync
    const updatedHistory = [...(liveBattle.history || []), sanMove];
    
    try {
      const response = await fetch("/api/spectate/move", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchId: liveBattle.id,
          fen: newFen,
          history: updatedHistory
        })
      });

      if (response.ok) {
        const data = await response.json();
        setLiveBattle(data.liveAIBattle);
      }
    } catch (e) {
      console.error("Failed to commit takeover move:", e);
    }
  };

  // Reset takeover control and return matching back to fully autonomous AI agents
  const surrenderTakeoverToBot = () => {
    setTakeoverColor(null);
    if (onShowToast) {
      onShowToast("🤖 Управление возвращено ИИ-агентам. Наблюдайте за продолжением битвы!", "success");
    } else {
      alert("🤖 Вы передали управление обратно ИИ-агентам. Наблюдайте за продолжением битвы в реальном времени!");
    }
  };

  if (!liveBattle) {
    return (
      <div className="flex-1 py-16 flex flex-col items-center justify-center text-zinc-400">
        <Activity className="w-12 h-12 text-amber-500 animate-spin mb-4" />
        <span className="text-sm font-semibold tracking-wide uppercase font-mono">Подключение к стриму Арены...</span>
        <span className="text-xs text-zinc-600 mt-2">Инициализация бесконечных ИИ-сражений</span>
      </div>
    );
  }

  const whitePlayer = liveBattle.white;
  const blackPlayer = liveBattle.black;
  const isOpponentTurn = 
    (liveBattle.fen.split(" ")[1] === "w" && takeoverColor === "black") ||
    (liveBattle.fen.split(" ")[1] === "b" && takeoverColor === "white");

  return (
    <div className="flex-1 max-w-7xl mx-auto px-1 py-1.5 sm:px-4 sm:py-6 flex flex-col gap-3 font-sans">
      
      {/* Mobile-only Spectate Sub-tabs */}
      <div className="lg:hidden flex bg-black/55 p-1 rounded-2xl border border-white/5 gap-1 font-mono">
        <button
          onClick={() => setMobileTab("game")}
          className={`flex-1 py-2.5 text-center text-xs font-bold uppercase rounded-xl transition-all ${
            mobileTab === "game"
              ? "bg-gradient-to-r from-amber-500 to-amber-600 text-neutral-950 font-black shadow-md"
              : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          📺 ИИ Стрим
        </button>
        <button
          onClick={() => setMobileTab("bets")}
          className={`flex-1 py-2.5 text-center text-xs font-bold uppercase rounded-xl transition-all relative ${
            mobileTab === "bets"
              ? "bg-gradient-to-r from-amber-500 to-amber-600 text-neutral-950 font-black shadow-md"
              : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          🗳️ Ставки и Чат
          {liveBattle.bets?.length > 0 && (
            <span className="absolute top-2 right-4 w-2 h-2 bg-emerald-500 rounded-full border border-neutral-950 animate-pulse" />
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
        
        {/* LEFT: Chess Board and Showdown details */}
        <div className={`lg:col-span-7 flex flex-col gap-6 ${mobileTab === "game" ? "flex" : "hidden lg:flex"}`}>
        
        {/* Arena Header Status ticker */}
        <div className="bg-neutral-900/60 border border-white/5 rounded-2xl p-4 backdrop-blur-md flex items-center justify-between shadow-xl">
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <Tv className="w-4 h-4 animate-pulse" />
              <div className="absolute top-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-neutral-900" />
            </div>
            <div>
              <div className="text-xs font-bold uppercase font-mono tracking-wider text-amber-400 flex items-center gap-1.5 leading-none">
                ШОУДАУН ИИ • В ЭФИРЕ
              </div>
              <div className="text-[10px] text-zinc-400 mt-1">
                Всего завершено матчей: <strong className="text-amber-500 font-mono">{finishedHistoryCount}</strong>
              </div>
            </div>
          </div>

          <div className="text-right">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] uppercase font-bold font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
              ● {liveBattle.bets?.length || 0} ставок в TON
            </span>
          </div>
        </div>

        {/* Live Chess board wrapped for spectating */}
        <div className="relative">
          {takeoverColor ? (
            <div className="mb-2 bg-emerald-500/10 border border-emerald-500/25 rounded-xl p-3 flex justify-between items-center text-xs text-emerald-300">
              <span className="font-semibold flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                ⚡ Вы перехватили управление за {takeoverColor === "white" ? "БЕЛЫХ" : "ЧЕРНЫХ"}!
              </span>
              <button 
                onClick={surrenderTakeoverToBot}
                className="px-2.5 py-1 bg-zinc-800 text-zinc-300 rounded font-bold hover:bg-zinc-700 transition"
              >
                Вернуть ИИ
              </button>
            </div>
          ) : (
            <div className="mb-2 bg-amber-400/5 border border-amber-400/15 rounded-xl p-2.5 text-[11px] text-zinc-400 text-center italic">
              Режим обсерватории: два автономных ИИ бота играют друг против друга. Вы можете подключиться к матчу в любой момент!
            </div>
          )}

          <ChessBoard
            fen={liveBattle.fen}
            history={liveBattle.history || []}
            whiteName={whitePlayer.firstName}
            whiteRating={whitePlayer.rating}
            blackName={blackPlayer.firstName}
            blackRating={blackPlayer.rating}
            playerColor={takeoverColor || "white"}
            isAIGame={!takeoverColor}
            onMove={handleTakeoverMove}
            activeMatchId={liveBattle.id}
            whiteTimeSec={300}
            blackTimeSec={300}
          />
        </div>

        {/* AI Commentary and Personalities Box */}
        {liveBattle.commentary && (
          <div className="bg-neutral-900/60 border border-white/5 rounded-2xl p-4 backdrop-blur-md shadow-lg relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-amber-500" />
            <div className="text-[10px] font-mono uppercase font-semibold text-zinc-500 tracking-wider mb-1 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-500" /> Комментарий Арены
            </div>
            <p className="text-sm text-zinc-200 mt-1 italic leading-relaxed">
              &ldquo;{liveBattle.commentary}&rdquo;
            </p>
          </div>
        )}

        {/* Takeover Control Block */}
        {!takeoverColor && liveBattle.status === "active" && (
          <div className="bg-neutral-900/40 border border-white/5 rounded-2xl p-4 text-center">
            <h4 className="text-xs font-bold uppercase tracking-wider font-mono text-zinc-400 mb-3 flex items-center justify-center gap-2">
              <Sword className="w-4 h-4 text-amber-500" /> ПЕРЕХВАТ УПРАВЛЕНИЯ В МАТЧЕ
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => takeoverControl("white")}
                className="flex items-center justify-center gap-2 py-2.5 px-4 bg-white/10 hover:bg-white/15 border border-white/10 rounded-xl text-xs font-bold font-mono text-zinc-100 transition-all shadow-md active:scale-95"
              >
                🎮 За Белых ({whitePlayer.firstName.split(" ")[0]})
              </button>
              <button
                onClick={() => takeoverControl("black")}
                className="flex items-center justify-center gap-2 py-2.5 px-4 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700/60 rounded-xl text-xs font-bold font-mono text-zinc-300 transition-all shadow-md active:scale-95"
              >
                🎮 За Черных ({blackPlayer.firstName.split(" ")[0]})
              </button>
            </div>
          </div>
        )}

      </div>

        {/* RIGHT: Bets, Odds & Live Match Chat */}
        <div className={`lg:col-span-5 flex flex-col gap-6 ${mobileTab === "bets" ? "flex" : "hidden lg:flex"}`}>
        
        {/* Betting Slate escrow card */}
        <div className="bg-neutral-900/60 border border-white/5 rounded-3xl p-5 backdrop-blur-md shadow-2xl flex flex-col gap-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5">
            <Coins className="w-24 h-24 text-amber-500" />
          </div>

          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-amber-400" />
              <h3 className="text-sm font-bold uppercase font-mono tracking-wider text-zinc-100">Ставки на События</h3>
            </div>
            <span className="text-[10px] text-zinc-500 leading-none">Escrow Smart Contracts</span>
          </div>

          {/* Quick Odds selectors */}
          <div className="grid grid-cols-2 gap-2 mt-1">
            <button
              onClick={() => setBetType("white_wins")}
              className={`p-2.5 rounded-xl border text-left transition-all ${
                betType === "white_wins"
                  ? "border-amber-400 bg-amber-400/10 text-amber-300"
                  : "border-white/5 bg-neutral-950/40 text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <div className="text-[10px] text-zinc-500 uppercase font-mono">Победа Белых</div>
              <div className="text-xs font-bold flex justify-between items-center mt-1">
                <span>ИИ Белые</span>
                <span className="text-amber-400 font-mono text-[11px]">1.95x</span>
              </div>
            </button>

            <button
              onClick={() => setBetType("black_wins")}
              className={`p-2.5 rounded-xl border text-left transition-all ${
                betType === "black_wins"
                  ? "border-amber-400 bg-amber-400/10 text-amber-300"
                  : "border-white/5 bg-neutral-950/40 text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <div className="text-[10px] text-zinc-500 uppercase font-mono">Победа Черных</div>
              <div className="text-xs font-bold flex justify-between items-center mt-1">
                <span>ИИ Черные</span>
                <span className="text-amber-400 font-mono text-[11px]">1.95x</span>
              </div>
            </button>

            <button
              onClick={() => setBetType("draw")}
              className={`p-2.5 rounded-xl border text-left transition-all col-span-2 ${
                betType === "draw"
                  ? "border-amber-400 bg-amber-400/10 text-amber-300"
                  : "border-white/5 bg-neutral-950/40 text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <div className="text-[10px] text-zinc-500 uppercase font-mono">Мирный Аутком</div>
              <div className="text-xs font-bold flex justify-between items-center mt-1">
                <span>Ничья на доске (Пат / Реприз)</span>
                <span className="text-amber-400 font-mono text-[11px]">4.50x</span>
              </div>
            </button>

            <button
              onClick={() => setBetType("queen_survives")}
              className={`p-2.5 rounded-xl border text-left transition-all ${
                betType === "queen_survives"
                  ? "border-amber-400 bg-amber-400/10 text-amber-300"
                  : "border-white/5 bg-neutral-950/40 text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <div className="text-[10px] text-zinc-500 uppercase font-mono">В финале матча</div>
              <div className="text-xs font-bold flex justify-between items-center mt-1">
                <span>Ферзи выживут</span>
                <span className="text-amber-400 font-mono text-[11px]">2.25x</span>
              </div>
            </button>

            <button
              onClick={() => setBetType("moves_over_35")}
              className={`p-2.5 rounded-xl border text-left transition-all ${
                betType === "moves_over_35"
                  ? "border-amber-400 bg-amber-400/10 text-amber-300"
                  : "border-white/5 bg-neutral-950/40 text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <div className="text-[10px] text-zinc-500 uppercase font-mono">Продолжительность</div>
              <div className="text-xs font-bold flex justify-between items-center mt-1">
                <span>Ходов &gt; 35</span>
                <span className="text-amber-400 font-mono text-[11px]">1.80x</span>
              </div>
            </button>
          </div>

          {/* TON amount chooser */}
          <div className="mt-2">
            <label className="text-[10px] font-mono text-zinc-500 uppercase block mb-1.5">Размер ставки (TON)</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={betAmount}
                onChange={(e) => setBetAmount(Math.max(1, Number(e.target.value)))}
                className="bg-neutral-950/80 border border-white/5 rounded-xl px-4 py-2.5 font-mono text-xs text-amber-300 font-bold w-24 focus:outline-none focus:border-amber-500/50"
              />
              <div className="flex-1 flex gap-1.5">
                {[5, 10, 25, 50].map((amt) => (
                  <button
                    key={amt}
                    onClick={() => setBetAmount(amt)}
                    className={`flex-1 py-2.5 bg-neutral-950/50 hover:bg-neutral-950 border text-xs font-mono font-semibold rounded-xl text-zinc-400 transition-all ${
                      betAmount === amt ? "border-amber-500/50 text-amber-400 bg-amber-500/5" : "border-white/5"
                    }`}
                  >
                    +{amt}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button
            onClick={placeBet}
            disabled={liveBattle.status !== "active"}
            className="w-full mt-2 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-neutral-950 font-bold font-mono text-xs rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 active:scale-[0.98]"
          >
            <Coins className="w-4 h-4 fill-neutral-950" /> Подтвердить ставку на Смарт-Контракт
          </button>

          {/* User's registered bets slips for the current show */}
          {myBets.length > 0 && (
            <div className="border-t border-white/5 pt-3.5 mt-1.5">
              <span className="text-[10px] uppercase font-mono font-bold text-zinc-500 tracking-wider mb-2 block">Ваши ставки на этот матч:</span>
              <div className="flex flex-col gap-1.5">
                {myBets.map((bet: any) => (
                  <div key={bet.id} className="flex justify-between items-center text-xs bg-neutral-950/60 border border-white/5 px-3 py-2 rounded-xl">
                    <span className="text-zinc-300 flex items-center gap-1">
                      🗳️ <strong>{bet.label}</strong>
                    </span>
                    <span className="font-mono text-[11px] text-amber-400 font-bold">
                      {bet.amount} TON ({bet.winOdds}x)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Live Chat stream and bot feeds */}
        <div className="bg-neutral-900/60 border border-white/5 rounded-3xl p-5 backdrop-blur-md shadow-2xl flex flex-col h-[320px]">
          <div className="flex items-center gap-2 border-b border-white/5 pb-3 mb-3 shrink-0">
            <Users className="w-4 h-4 text-zinc-400" />
            <h3 className="text-xs font-bold uppercase font-mono text-zinc-300 tracking-wider">Чат Наблюдателей</h3>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse ml-auto" />
            <span className="text-[10px] text-zinc-500 font-mono uppercase">{liveBattle.comments?.length || 0} сообщений</span>
          </div>

          <div 
            ref={scrollRef}
            className="flex-1 overflow-y-auto space-y-2.5 pr-1 text-xs select-none scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent"
          >
            {liveBattle.comments && liveBattle.comments.map((msg: any, idx: number) => {
              const isRefBot = msg.username === "Ref_Bot";
              
              return (
                <div 
                  key={idx} 
                  className={`p-2 rounded-xl border text-xs max-w-[95%] transition-all ${
                    isRefBot 
                      ? "bg-amber-500/10 border-amber-500/20 text-zinc-200 font-sans" 
                      : "bg-neutral-950/40 border-white/5 text-zinc-300"
                  }`}
                >
                  <div className="font-bold font-mono text-[10px] text-zinc-400 hover:text-amber-400 cursor-pointer flex items-center gap-1.5 leading-none mb-1">
                    {isRefBot ? "🤖 " : msg.username === "Ref_Bot" ? "@Ref_Bot" : `@${msg.username}`}
                    {isRefBot && <span className="text-[8px] bg-amber-500/20 text-amber-300 px-1 py-0.2 rounded font-sans font-bold uppercase border border-amber-500/30">АРБИТР</span>}
                  </div>
                  <p className="leading-relaxed font-sans">{msg.text}</p>
                </div>
              );
            })}
          </div>

          <form onSubmit={sendChat} className="flex gap-2 mt-3.5 pt-3 border-t border-white/5 shrink-0">
            <input
              type="text"
              value={chatText}
              onChange={(e) => setChatText(e.target.value)}
              placeholder="Обсудить матч или дать совет..."
              className="flex-1 bg-neutral-950/80 border border-white/5 placeholder-zinc-600 rounded-xl px-4 py-2 text-xs focus:outline-none focus:border-amber-500/40 text-zinc-200"
            />
            <button
              type="submit"
              className="p-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-mono rounded-xl border border-zinc-700/60 transition"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>

      </div>

    </div>

    </div>
  );
}