import React, { useState, useEffect } from "react";
import { Chess } from "chess.js";
import { 
  Trophy, 
  Sparkles, 
  Users, 
  Coins, 
  Gamepad2, 
  RefreshCw, 
  ChevronRight, 
  Flame, 
  Star, 
  Send,
  Zap,
  Play,
  Tv
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { GameTimePreset, GameWagerPreset, UserProfile, GameState } from "./types";
import ChessBoard from "./components/ChessBoard";
import AIAnalyst from "./components/AIAnalyst";
import WalletModal from "./components/WalletModal";
import AntiCheatModule from "./components/AntiCheatModule";
import StatsPanel from "./components/StatsPanel";
import SpectatePanel from "./components/SpectatePanel";
import ArenaLobby from "./components/ArenaLobby";
import ArenaMatch from "./components/ArenaMatch";

export default function App() {
  // Navigation tabs (Active Arena vs Social & Stats)
  const [currentView, setCurrentView] = useState<"arena" | "spectate" | "social">("arena");
  const [profileExpanded, setProfileExpanded] = useState(false);

  // User details
  const [profile, setProfile] = useState<UserProfile>(() => {
    const defaultProfile: UserProfile = {
      id: "me_tg_123",
      username: "TON_Grandmaster",
      firstName: "Vadim",
      lastName: "Pro",
      photoUrl: "🥷",
      rating: 1450,
      clRating: 1200,
      clanId: "clan_ton_knights",
      clanName: "TON Knights",
      balanceTON: 250.0,
      starsCount: 850,
      streakDays: 4,
      battlePassXP: 450,
      battlePassLevel: 3,
      completedQuests: ["first_win", "fast_bullet"]
    };

    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("telegram_chess_profile_v3");
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch (e) {
          console.error("Failed to parse stored profile", e);
        }
      }

      // Check Telegram WebApp
      if ((window as any).Telegram?.WebApp) {
        try {
          const tg = (window as any).Telegram.WebApp;
          tg.ready();
          const user = tg.initDataUnsafe?.user;
          if (user) {
            const updated = {
              ...defaultProfile,
              id: String(user.id),
              username: user.username || `player_${user.id}`,
              firstName: user.first_name || "Игрок",
            };
            localStorage.setItem("telegram_chess_profile_v3", JSON.stringify(updated));
            return updated;
          }
        } catch (e) {
          console.error("Telegram WebApp initialization error", e);
        }
      }
    }
    return defaultProfile;
  });

  // Synchronize profile changes to localStorage automatically!
  useEffect(() => {
    localStorage.setItem("telegram_chess_profile_v3", JSON.stringify(profile));
  }, [profile]);

  // Wallet states
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);

  // Tonkeeper Transaction Signing states
  const [showTonkeeperTxConfirm, setShowTonkeeperTxConfirm] = useState(false);
  const [signingTx, setSigningTx] = useState(false);
  const [txWagerAmount, setTxWagerAmount] = useState<number>(0);
  const [afterTxAccepted, setAfterTxAccepted] = useState<any>(null);

  // Match configurations
  const [timePreset, setTimePreset] = useState<GameTimePreset>("3m");
  const [wager, setWager] = useState<GameWagerPreset>(0);
  const [aiPersonality, setAiPersonality] = useState<string>("puck");

  // Custom Toast Notification State
  const [toast, setToast] = useState<{ message: string; type: "success" | "info" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "info" | "error" = "info") => {
    setToast({ message, type });
  };

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 3500);
      return () => clearTimeout(t);
    }
  }, [toast]);

  // Game/Matchmaking progression states
  const [isSearching, setIsSearching] = useState(false);
  const [searchTimer, setSearchTimer] = useState(0);
  const [activeMatch, setActiveMatch] = useState<GameState | null>(null);
  const [isAIGame, setIsAIGame] = useState(true);

  // Logs for live activity feed
  const [gameHistory, setGameHistory] = useState<string[]>([]);
  const [moveTimes, setMoveTimes] = useState<number[]>([]);
  const [lastMoveSan, setLastMoveSan] = useState<string | null>(null);
  const [isAiThinking, setIsAiThinking] = useState(false);

  // Track search, polling and synchronizations
  useEffect(() => {
    let timerInterval: any;
    let pollInterval: any;

    if (isSearching) {
      // Advance counter
      timerInterval = setInterval(() => {
        setSearchTimer(prev => prev + 1);
      }, 1000);

      // Real poll lookup of matchmaking state
      pollInterval = setInterval(async () => {
        try {
          const response = await fetch(`/api/matchmake/poll?tgId=${profile.username}`);
          const data = await response.json();
          
          if (data.matchStatus === "connected" && data.match) {
            setIsSearching(false);
            setSearchTimer(0);
            setActiveMatch(data.match);
            setIsAIGame(false);
            setGameHistory(data.match.history || []);
            setMoveTimes([]);
            setLastMoveSan(null);
          }
        } catch (e) {
          console.error("Matchmaking poll error:", e);
        }
      }, 1500);
    } else {
      setSearchTimer(0);
    }

    return () => {
      clearInterval(timerInterval);
      clearInterval(pollInterval);
    };
  }, [isSearching, profile.username]);

  // Periodic polling for active game state in multiplayer matches to handle opponent moves
  useEffect(() => {
    let gamePollInterval: any;

    if (activeMatch && !isAIGame && activeMatch.status === "active") {
      gamePollInterval = setInterval(async () => {
        try {
          const response = await fetch(`/api/game/status?matchId=${activeMatch.id}`);
          if (response.ok) {
            const data = await response.json();
            if (data.match) {
              const serverMatch = data.match;
              // Synchronize state if FEN or history updated on the server
              if (serverMatch.fen !== activeMatch.fen || serverMatch.history.length !== gameHistory.length) {
                setActiveMatch(serverMatch);
                setGameHistory(serverMatch.history || []);
                if (serverMatch.history && serverMatch.history.length > 0) {
                  setLastMoveSan(serverMatch.history[serverMatch.history.length - 1]);
                }
              }
            }
          }
        } catch (e) {
          console.error("Active game peer update tracking failed:", e);
        }
      }, 1800);
    }

    return () => clearInterval(gamePollInterval);
  }, [activeMatch, isAIGame, gameHistory.length]);

  // Automated trigger to compute AI move if it is the computer's turn
  useEffect(() => {
    if (!activeMatch || !isAIGame || activeMatch.status !== "active") return;

    try {
      const chessObj = new Chess(activeMatch.fen);
      if (chessObj.isGameOver()) return;

      const currentTurn = chessObj.turn(); // "w" or "b"
      const playerColor = (activeMatch.white.id === profile.id || activeMatch.white.id === profile.username) ? "white" : "black";
      const isAiTurn = (currentTurn === "w" && playerColor === "black") || 
                       (currentTurn === "b" && playerColor === "white");

      if (isAiTurn) {
        setIsAiThinking(true);
        const timer = setTimeout(async () => {
          try {
            const aiResponse = await fetch("/api/game/ai-move", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ fen: activeMatch.fen })
            });
            if (aiResponse.ok) {
              const aiData = await aiResponse.json();
              if (aiData.aiMove) {
                const updatedHistory = [...(activeMatch.history || []), aiData.aiMove];
                setGameHistory(updatedHistory);
                setLastMoveSan(aiData.aiMove);

                const moveSync = await fetch("/api/game/move", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    matchId: activeMatch.id,
                    fen: aiData.newFen,
                    history: updatedHistory,
                    lastMoveTimeMs: 400
                  })
                });
                if (moveSync.ok) {
                  const syncData = await moveSync.json();
                  if (syncData.match) {
                    setActiveMatch(syncData.match);
                  }
                } else {
                  setActiveMatch({
                    ...activeMatch,
                    fen: aiData.newFen,
                    history: updatedHistory
                  });
                }
              }
            }
          } catch (e) {
            console.error("AI automated move trigger failed:", e);
          } finally {
            setIsAiThinking(false);
          }
        }, 1000);

        return () => clearTimeout(timer);
      }
    } catch (e) {
      console.error("Failed to parse board FEN for turn verification:", e);
    }
  }, [activeMatch?.fen, isAIGame, profile.id, profile.username]);

  const startMatchmaker = async () => {
    if (wager > 0 && !walletConnected) {
      showToast("Пожалуйста, подключите кошелек TON, чтобы сделать ставку на этот матч!", "error");
      return;
    }

    const executeQueue = async () => {
      setIsSearching(true);
      setSearchTimer(0);
      try {
        const response = await fetch("/api/matchmake", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tgId: profile.username, // Use username for straightforward local dual-tab pairing
            username: profile.username,
            timePreset,
            wagerOption: wager,
            rating: profile.rating
          })
        });
        const data = await response.json();
        if (data.matchStatus === "connected" && data.match) {
          setIsSearching(false);
          setActiveMatch(data.match);
          setIsAIGame(false);
          setGameHistory(data.match.history || []);
          setMoveTimes([]);
          setLastMoveSan(null);
        }
      } catch (e) {
        console.error("Matchmaking init failure:", e);
      }
    };

    if (wager > 0) {
      setTxWagerAmount(wager);
      setAfterTxAccepted(() => async () => {
        await executeQueue();
      });
      setShowTonkeeperTxConfirm(true);
    } else {
      await executeQueue();
    }
  };

  const cancelMatchmaking = async () => {
    setIsSearching(false);
    setSearchTimer(0);
    try {
      await fetch("/api/matchmake/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tgId: profile.username })
      });
    } catch (e) {
      console.error("Matchmaking cancel error:", e);
    }
  };

  const startAIGame = async () => {
    if (wager > 0 && !walletConnected) {
      showToast("Пожалуйста, подключите кошелек TON, чтобы сделать ставку на этот матч!", "error");
      return;
    }

    const executeAIBoot = async () => {
      setIsAIGame(true);
      try {
        const response = await fetch("/api/matchmake-ai", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tgId: profile.id,
            username: profile.username,
            timePreset,
            wagerOption: wager,
            aiPersonality,
            rating: profile.rating
          })
        });
        const data = await response.json();
        if (data.match) {
          setActiveMatch(data.match);
          setGameHistory([]);
          setMoveTimes([]);
          setLastMoveSan(null);
        }
      } catch (e) {
        console.error("Failed to connect with AI profile:", e);
      }
    };

    if (wager > 0) {
      setTxWagerAmount(wager);
      setAfterTxAccepted(() => async () => {
        await executeAIBoot();
      });
      setShowTonkeeperTxConfirm(true);
    } else {
      await executeAIBoot();
    }
  };

  const handlePieceMove = async (newFen: string, sanMove: string, moveDurationMs: number) => {
    if (!activeMatch) return;
    
    // Add moves and intervals
    const updatedHistory = [...gameHistory, sanMove];
    const updatedMoveTimes = [...moveTimes, moveDurationMs];
    setGameHistory(updatedHistory);
    setMoveTimes(updatedMoveTimes);
    setLastMoveSan(sanMove);

    // If sandbox / local game reset
    if (sanMove === "Restarted") {
      setGameHistory([]);
      setMoveTimes([]);
      setLastMoveSan(null);
      activeMatch.fen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
      activeMatch.history = [];
      setActiveMatch({ ...activeMatch });
      return;
    }

    // Call server move endpoint and update anti-cheat analysis
    try {
      const response = await fetch("/api/game/move", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchId: activeMatch.id,
          fen: newFen,
          history: updatedHistory,
          lastMoveTimeMs: moveDurationMs
        })
      });
      const data = await response.json();
      if (data.match) {
        setActiveMatch(data.match);
      }

      // If it's an AI game, ask the backend for the AI move
      if (isAIGame && !data.match.fen.includes("GameOver")) {
         setTimeout(async () => {
           try {
             const aiResp = await fetch("/api/game/ai-move", {
               method: "POST",
               headers: { "Content-Type": "application/json" },
               body: JSON.stringify({ fen: newFen })
             });
             const aiData = await aiResp.json();
             if (aiData.aiMove && aiData.newFen) {
                const freshHistory = [...updatedHistory, aiData.aiMove];
                setGameHistory(freshHistory);
                setLastMoveSan(aiData.aiMove);
                setActiveMatch(prev => prev ? { ...prev, fen: aiData.newFen, history: freshHistory } : null);
                
                // Store AI's move too
                fetch("/api/game/move", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    matchId: activeMatch.id,
                    fen: aiData.newFen,
                    history: freshHistory,
                    lastMoveTimeMs: 700
                  })
                });
             }
           } catch (e) {
             console.error("AI failed to fetch move");
           }
         }, 800);
      }

    } catch (error) {
      console.error("Failed to sync move with backend server:", error);
    }
  };

  const handleWalletLinked = (connected: boolean, address: string | null) => {
    setWalletConnected(connected);
    setWalletAddress(address);
  };

  const handleFaucetClaim = () => {
    setProfile(prev => ({
      ...prev,
      balanceTON: prev.balanceTON + 50.0,
      starsCount: prev.starsCount + 100
    }));
  };

  const inviteFriendLine = () => {
    const text = `Сыграем на TON Шахматной арене со ставками! Мой ник: ${profile.username}. Подключайся! https://t.me/telegram_chess_arena_bot/play`;
    navigator.clipboard.writeText(text);
    showToast("Ссылка-приглашение на матч успешно скопирована! Поделитесь ей в чатах Telegram.", "success");
  };

  const timePresetsList: { preset: GameTimePreset; name: string; desc: string }[] = [
    { preset: "1m", name: "Пуля (Bullet)", desc: "Быстрые решения" },
    { preset: "3m", name: "Блиц (Blitz)", desc: "Стандартный блиц" },
    { preset: "5m", name: "Рапид (Rapid)", desc: "Тактический фокус" },
    { preset: "10m", name: "Классика", desc: "Глубокое размышление" }
  ];

  const currentMatchWager = activeMatch?.wager || 0;
  const currentSuspicious = activeMatch?.antiCheatTrace?.suspiciousIntervals || 0;
  const currentCorr = activeMatch?.antiCheatTrace?.correlationScore || 12;
  const currentCheat = activeMatch?.antiCheatTrace?.cheatScore || 0;

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-zinc-100 flex flex-col antialiased selection:bg-amber-400 selection:text-neutral-900 font-sans">
      
      {/* Symmetrical Header Profile Stats */}
      <header className="z-20 sticky top-0 bg-[#0a0a0c]/80 border-b border-white/5 backdrop-blur-xl px-4 py-3 sm:px-8 sm:py-4 flex justify-between items-center transition-all">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="relative select-none">
            <span className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-zinc-900 border border-white/10 flex items-center justify-center text-xl sm:text-2xl shadow-xl">
              {profile.photoUrl || "👤"}
            </span>
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-[#0a0a0c] rounded-full" />
          </div>
          <div>
            <div className="text-base font-bold text-zinc-100 flex items-center gap-2 leading-none">
              <span className="truncate max-w-[120px] sm:max-w-[200px]">{profile.firstName}</span>
              <span className="text-[10px] uppercase font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20 tracking-wide">
                ★ {profile.lastName || "Pro"}
              </span>
            </div>
            <div className="text-xs text-zinc-400 mt-1.5 flex items-center gap-2 sm:gap-3">
              <span className="flex items-center gap-1 text-zinc-300 font-medium">
                RTG <strong className="text-white font-mono">{profile.rating}</strong>
              </span>
              <span className="w-1 h-1 rounded-full bg-zinc-700" />
              <span className="flex items-center gap-1 font-mono text-emerald-400 font-bold">
                <Coins className="w-3.5 h-3.5" /> {profile.balanceTON} TON
              </span>
            </div>
          </div>
        </div>

        {/* Action controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Daily streak indicator */}
          <div className="flex items-center gap-1.5 bg-orange-500/10 text-orange-400 border border-orange-500/20 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold">
            <Flame className="w-4 h-4 fill-orange-500" />
            {profile.streakDays}
          </div>

          {/* Connected state indicators */}
          {walletConnected ? (
            <div className="flex items-center gap-1.5 text-[10px] sm:text-xs font-bold uppercase border border-emerald-500/20 text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-xl">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="hidden sm:inline">TON Wallet</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-[10px] sm:text-xs font-bold uppercase border border-white/5 text-zinc-500 bg-zinc-900/50 px-3 py-1.5 rounded-xl">
              <span className="w-2 h-2 rounded-full bg-zinc-600" />
              <span className="hidden sm:inline">No Wallet</span>
            </div>
          )}
        </div>
      </header>

      {/* Main Switch tab controls */}
      <div className="flex justify-center border-b border-white/5 bg-[#0a0a0c] text-xs sm:text-sm font-bold uppercase tracking-wider overflow-x-auto hide-scrollbar">
        <button
          onClick={() => setCurrentView("arena")}
          className={`px-6 py-4 text-center border-b-2 transition-all whitespace-nowrap ${
            currentView === "arena"
              ? "border-amber-400 text-amber-400 bg-amber-400/5"
              : "border-transparent text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.02]"
          }`}
        >
          ⚔️ Игровая Арена
        </button>
        <button
          onClick={() => setCurrentView("spectate")}
          className={`px-6 py-4 text-center border-b-2 transition-all whitespace-nowrap ${
            currentView === "spectate"
              ? "border-amber-400 text-amber-400 bg-amber-400/5"
              : "border-transparent text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.02]"
          }`}
        >
          🤖 ИИ-Тренер
        </button>
      </div>

      {/* Primary viewport stage */}
      <main className={`flex-1 w-full mx-auto p-4 sm:p-6 flex flex-col gap-4 sm:gap-6 ${
        !activeMatch ? "pb-28 md:pb-12" : "pb-12"
      } ${currentView === "spectate" ? "max-w-7xl" : "max-w-xl"}`}>
        <AnimatePresence mode="wait">
          {currentView === "arena" ? (
            <motion.div
              key="arena"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className="flex flex-col gap-5"
            >
              {!activeMatch && !isSearching ? (
                <ArenaLobby
                  profile={profile}
                  setProfile={setProfile}
                  profileExpanded={profileExpanded}
                  setProfileExpanded={setProfileExpanded}
                  timePreset={timePreset}
                  setTimePreset={setTimePreset}
                  wager={wager}
                  setWager={setWager}
                  walletConnected={walletConnected}
                  handleWalletLinked={handleWalletLinked}
                  handleFaucetClaim={handleFaucetClaim}
                  startMatchmaker={startMatchmaker}
                  startAIGame={startAIGame}
                />
              ) : isSearching ? (
                /* 2. MATCHMAKING SCREEN QUEUE */
                <div className="py-24 flex flex-col items-center justify-center gap-8 bg-zinc-900/40 rounded-3xl border border-white/5 backdrop-blur-md shadow-2xl">
                  
                  {/* Dynamic pulse ripple animation */}
                  <div className="relative flex items-center justify-center">
                    <div className="absolute w-36 h-36 bg-amber-500/10 rounded-full animate-ping" />
                    <div className="absolute w-28 h-28 bg-amber-500/20 border border-amber-500/30 rounded-full animate-pulse" />
                    <div className="w-20 h-20 bg-amber-500 flex items-center justify-center shadow-lg rounded-full z-10">
                      <Gamepad2 className="w-8 h-8 text-neutral-900 animate-spin" />
                    </div>
                  </div>

                  <div className="text-center space-y-3 font-sans px-6">
                    <h3 className="text-xl font-bold tracking-wide text-white">Поиск...</h3>
                    <p className="text-sm text-zinc-400 max-w-sm leading-relaxed mx-auto">
                      Ищем подходящего соперника ({timePreset === "1m" ? "1 мин" : timePreset === "3m" ? "3 мин" : timePreset === "5m" ? "5 мин" : "10 мин"}).<br/>
                      Ставка: <strong className="text-emerald-400">{wager === 0 ? "ОТСУТСТВУЕТ" : `${wager} TON`}</strong>
                    </p>
                    <div className="inline-block px-4 py-2 bg-zinc-950 border border-white/5 rounded-xl font-mono text-zinc-400 text-sm mt-2">
                      Время: {searchTimer} сек
                    </div>
                  </div>

                  <button
                    onClick={cancelMatchmaking}
                    className="mt-4 py-3 px-8 bg-zinc-900 hover:bg-red-500/20 text-sm font-bold text-red-400 hover:text-red-300 border border-white/5 hover:border-red-500/30 transition-all rounded-xl cursor-pointer"
                  >
                    Отменить
                  </button>
                </div>
              ) : (
                <ArenaMatch
                  activeMatch={activeMatch}
                  setActiveMatch={setActiveMatch}
                  profileId={profile.id}
                  profileUsername={profile.username}
                  isAIGame={isAIGame}
                  gameHistory={gameHistory}
                  aiPersonality={aiPersonality}
                  setAiPersonality={setAiPersonality}
                  handlePieceMove={handlePieceMove}
                  timePreset={timePreset}
                />
              )}
            </motion.div>
          ) : currentView === "spectate" ? (
            /* SPECTATE VIEW */
            <motion.div
              key="spectate"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
            >
              <SpectatePanel
                profile={profile}
                setProfile={setProfile}
                walletConnected={walletConnected}
                onShowToast={showToast}
              />
            </motion.div>
          ) : (
            /* SOCIAL & CLAN VIEW */
            <motion.div
              key="social"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
            >
              <StatsPanel user={profile} onProfileChange={setProfile} onShowToast={showToast} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Mobile Glassmorphic Bottom Navigation Dock */}
      {!activeMatch && (
        <div className="md:hidden fixed bottom-4 left-4 right-4 z-40 bg-neutral-950/80 border border-white/10 backdrop-blur-lg rounded-2xl flex items-center justify-around py-2.5 px-1.5 shadow-[0_12px_40px_rgba(0,0,0,0.85)]">
          <button
            onClick={() => setCurrentView("arena")}
            className={`flex flex-col items-center gap-1 flex-1 py-1 px-2 rounded-xl transition-all ${
              currentView === "arena" 
                ? "text-amber-300 bg-amber-400/10 font-bold scale-[1.03]" 
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <span className="text-lg leading-none">⚔️</span>
            <span className="text-[9px] font-mono uppercase font-bold tracking-tight">Арена</span>
          </button>
          <button
            onClick={() => setCurrentView("spectate")}
            className={`flex flex-col items-center gap-1 flex-1 py-1 px-2 rounded-xl transition-all relative ${
              currentView === "spectate" 
                ? "text-amber-300 bg-amber-400/10 font-bold scale-[1.03]" 
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <span className="text-lg leading-none">🤖</span>
            <span className="text-[9px] font-mono uppercase font-bold tracking-tight">ИИ Стрим</span>
          </button>
          <button
            onClick={() => setCurrentView("social")}
            className={`flex flex-col items-center gap-1 flex-1 py-1 px-2 rounded-xl transition-all ${
              currentView === "social" 
                ? "text-amber-300 bg-amber-400/10 font-bold scale-[1.03]" 
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <span className="text-lg leading-none">⭐️</span>
            <span className="text-[9px] font-mono uppercase font-bold tracking-tight">Кланы</span>
          </button>
        </div>
      )}

      {/* Floating Tonkeeper Transaction Sign Authenticator Popup */}
      <AnimatePresence>
        {showTonkeeperTxConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-sm rounded-2xl bg-zinc-900 border-2 border-sky-500/30 p-5 shadow-[0_20px_50px_rgba(14,165,233,0.25)] flex flex-col gap-4 font-sans text-left"
            >
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🛡️</span>
                  <div>
                    <h3 className="text-xs font-bold text-sky-400 font-mono tracking-wider uppercase">Tonkeeper Authenticator</h3>
                    <p className="text-[8px] text-zinc-500 font-mono">TON Connect Bridge Security</p>
                  </div>
                </div>
                {!signingTx && (
                  <button
                    onClick={() => setShowTonkeeperTxConfirm(false)}
                    className="text-zinc-500 hover:text-zinc-300 font-mono text-xs cursor-pointer"
                  >
                    Отмена
                  </button>
                )}
              </div>

              <div className="bg-black/60 p-3 rounded-xl border border-white/5 flex flex-col gap-2 font-mono text-xs">
                <div className="flex justify-between items-center text-[9px] text-zinc-500 uppercase font-black">
                  <span>Объект вызова</span>
                  <span>Смарт-Контракт</span>
                </div>
                <div className="text-zinc-100 font-bold text-[11px] truncate">
                  TON Chess Escrow Manager v3.4
                </div>
                <div className="flex justify-between items-center border-t border-white/5 pt-2 text-[9px] text-zinc-500 uppercase font-black">
                  <span>Ставка на кону</span>
                  <span>Комиссия сети</span>
                </div>
                <div className="flex justify-between items-center text-zinc-100">
                  <span className="text-sm font-black text-emerald-400">-{txWagerAmount.toFixed(1)} TON</span>
                  <span className="text-[10px] text-zinc-400">≈ 0.009 TON</span>
                </div>
              </div>

              <div className="text-center font-sans">
                {signingTx ? (
                  <div className="py-4 flex flex-col items-center justify-center gap-3">
                    <RefreshCw className="w-6 h-6 text-sky-400 animate-spin" />
                    <span className="text-xs text-sky-300 font-mono font-bold animate-pulse">
                      Подписание транзакции в приложении Tonkeeper...
                    </span>
                    <p className="text-[9px] text-zinc-500 max-w-xs leading-tight">
                      Отправка криптографической подписи в распределенный реестр TON Blockchain Mainnet. Пожалуйста, подождите.
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-1 py-1 text-center">
                    <p className="text-xs text-zinc-300 leading-normal">
                      Для регистрации ставки <span className="font-bold text-emerald-400">{txWagerAmount} TON</span> требуется ваша авторизация в Tonkeeper.
                    </p>
                    <p className="text-[10px] text-zinc-400 mt-1">
                      Баланс после операции: <strong className="text-emerald-300 font-mono">{(profile.balanceTON - txWagerAmount).toFixed(1)} TON</strong>
                    </p>
                  </div>
                )}
              </div>

              {!signingTx && (
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowTonkeeperTxConfirm(false)}
                    className="flex-1 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 font-bold text-xs font-mono transition-all border border-white/5 cursor-pointer"
                  >
                    Отклонить
                  </button>
                  <button
                    onClick={async () => {
                      setSigningTx(true);
                      setTimeout(() => {
                        setProfile(prev => ({
                          ...prev,
                          balanceTON: parseFloat((prev.balanceTON - txWagerAmount).toFixed(2))
                        }));
                        setSigningTx(false);
                        setShowTonkeeperTxConfirm(false);
                        showToast(`Транзакция ${txWagerAmount} TON подтверждена через Tonkeeper!`, "success");
                        if (afterTxAccepted) {
                          afterTxAccepted();
                        }
                      }, 1600);
                    }}
                    className="flex-1 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-550 hover:to-blue-750 text-white font-black text-xs font-sans transition-all shadow-[0_4px_15px_rgba(14,165,233,0.3)] hover:scale-[1.02] cursor-pointer"
                  >
                    Подписать в Tonkeeper ⚡
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Absolute Beautiful Custom Floating Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -40, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-3 rounded-2xl bg-zinc-900/90 border border-white/10 backdrop-blur-xl shadow-[0_20px_50px_rgba(0,0,0,0.85)] max-w-sm w-[90%]"
          >
            <span className="text-base select-none">
              {toast.type === "success" ? "🎉" : toast.type === "error" ? "⚠️" : "⚡"}
            </span>
            <span className="text-xs font-semibold text-zinc-100 flex-1 leading-normal font-sans">
              {toast.message}
            </span>
            <button 
              onClick={() => setToast(null)}
              className="text-zinc-500 hover:text-zinc-300 text-[10px] font-mono font-bold ml-1.5 uppercase tracking-wider cursor-pointer"
            >
              Ок
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
