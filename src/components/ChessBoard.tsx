import React, { useState, useEffect, useRef } from "react";
import { Chess, Move } from "chess.js";
import { motion, AnimatePresence } from "motion/react";
import { AlertTriangle, RotateCcw, ShieldCheck, Flag, Lightbulb } from "lucide-react";
import { Chessboard as ChessboardBase } from "react-chessboard";
const Chessboard = ChessboardBase as any;

// Web Audio API Procedural Sound Synthesizer
class SoundController {
  private ctx: AudioContext | null = null;

  private initCtx() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  playMove() {
    try {
      this.initCtx();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = "sine";
      osc.frequency.setValueAtTime(155, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(85, this.ctx.currentTime + 0.08);

      gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.08);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.08);
    } catch (e) {
      console.warn("Sound play bypassed:", e);
    }
  }

  playCapture() {
    try {
      this.initCtx();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const noise = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(320, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(140, this.ctx.currentTime + 0.12);

      noise.type = "sawtooth";
      noise.frequency.setValueAtTime(450, this.ctx.currentTime);
      noise.frequency.exponentialRampToValueAtTime(15, this.ctx.currentTime + 0.07);

      gain.gain.setValueAtTime(0.28, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.12);

      osc.connect(gain);
      noise.connect(gain);
      gain.connect(this.ctx.destination);
      
      osc.start();
      noise.start();
      osc.stop(this.ctx.currentTime + 0.12);
      noise.stop(this.ctx.currentTime + 0.07);
    } catch (e) {
      console.warn("Capture sound failed:", e);
    }
  }

  playCheck() {
    try {
      this.initCtx();
      if (!this.ctx) return;
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc1.frequency.setValueAtTime(550, this.ctx.currentTime);
      osc2.frequency.setValueAtTime(680, this.ctx.currentTime);

      gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.28);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.ctx.destination);

      osc1.start();
      osc2.start();
      osc1.stop(this.ctx.currentTime + 0.28);
      osc2.stop(this.ctx.currentTime + 0.28);
    } catch (e) {
      console.warn("Check sound failed:", e);
    }
  }
}

const synthSounds = new SoundController();

interface ChessBoardProps {
  fen: string;
  history: string[];
  whiteName: string;
  whiteRating: number;
  blackName: string;
  blackRating: number;
  playerColor: "white" | "black";
  isAIGame: boolean;
  onMove: (newFen: string, sanMove: string, moveTimeMs: number) => void;
  activeMatchId: string;
  whiteTimeSec: number;
  blackTimeSec: number;
}

export default function ChessBoard({
  fen,
  history,
  whiteName,
  whiteRating,
  blackName,
  blackRating,
  playerColor,
  isAIGame,
  onMove,
  activeMatchId,
  whiteTimeSec,
  blackTimeSec
}: ChessBoardProps) {
  const [chess] = useState<Chess>(() => new Chess(fen));
  const [boardFen, setBoardFen] = useState(fen);

  const [moveSquares, setMoveSquares] = useState<Record<string, React.CSSProperties>>({});
  const [optionSquares, setOptionSquares] = useState<Record<string, React.CSSProperties>>({});
  const [hintSquares, setHintSquares] = useState<Record<string, React.CSSProperties>>({});
  const [isHintLoading, setIsHintLoading] = useState(false);

  const requestHint = async () => {
    if (chess.isGameOver()) return;
    setIsHintLoading(true);
    setHintSquares({});
    try {
      const response = await fetch("/api/game/ai-move", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fen: chess.fen() })
      });
      if (response.ok) {
        const data = await response.json();
        if (data.aiMove) {
          // Temporarily make the move to see from/to squares, then undo
          const temp = new Chess(chess.fen());
          const move = temp.move(data.aiMove);
          if (move) {
            setHintSquares({
              [move.from]: { backgroundColor: "rgba(16, 185, 129, 0.6)" },
              [move.to]: { backgroundColor: "rgba(16, 185, 129, 0.6)" }
            });
            setTimeout(() => setHintSquares({}), 3000);
          }
        }
      }
    } catch (error) {
      console.error("Hint request failed:", error);
    } finally {
      setIsHintLoading(false);
    }
  };

  const [boardShakeType, setBoardShakeType] = useState<"capture" | "check" | null>(null);
  const triggerBoardShake = (type: "capture" | "check") => {
    setBoardShakeType(type);
    setTimeout(() => setBoardShakeType(null), 300);
  };

  // Clocks
  const [whiteLeft, setWhiteLeft] = useState(whiteTimeSec * 1000);
  const [blackLeft, setBlackLeft] = useState(blackTimeSec * 1000);
  const lastTickRef = useRef<number | null>(null);

  // Sync state if FEN updates from server
  useEffect(() => {
    if (fen && fen !== boardFen) {
      chess.load(fen);
      setBoardFen(fen);
      
      // Physical tactile feedback when FEN updates externally (e.g., from opponent/AI)
      const hList = chess.history({ verbose: true }) as Move[];
      const lastEl = hList.length > 0 ? hList[hList.length - 1] : null;
      
      if (lastEl) {
        setMoveSquares({
          [lastEl.from]: { backgroundColor: "rgba(255, 255, 0, 0.4)" },
          [lastEl.to]: { backgroundColor: "rgba(255, 255, 0, 0.4)" },
        });
      }

      if (chess.inCheck()) {
        synthSounds.playCheck();
        triggerBoardShake("check");
      } else {
        if (lastEl && lastEl.captured) {
          synthSounds.playCapture();
          triggerBoardShake("capture");
        } else {
          synthSounds.playMove();
        }
      }
    }
  }, [fen, chess, boardFen]);

  // Sync times
  useEffect(() => {
    setWhiteLeft(whiteTimeSec * 1000);
    setBlackLeft(blackTimeSec * 1000);
  }, [whiteTimeSec, blackTimeSec]);

  // Game timer loop
  useEffect(() => {
    const interval = setInterval(() => {
      if (chess.isGameOver()) return;

      const now = Date.now();
      const elapsed = lastTickRef.current ? now - lastTickRef.current : 100;
      lastTickRef.current = now;

      if (chess.turn() === "w") {
        setWhiteLeft(prev => Math.max(0, prev - elapsed));
      } else {
        setBlackLeft(prev => Math.max(0, prev - elapsed));
      }
    }, 100);

    lastTickRef.current = Date.now();
    return () => clearInterval(interval);
  }, [chess, history]);

  // Format time (mm:ss)
  const formatTime = (ms: number) => {
    const mins = Math.floor(ms / 60000);
    const secs = Math.floor((ms % 60000) / 1000);
    const tenths = Math.floor((ms % 1000) / 100);
    
    const secStr = secs < 10 ? `0${secs}` : `${secs}`;
    if (ms < 10000) {
      return `${mins}:${secStr}.${tenths}`;
    }
    return `${mins}:${secStr}`;
  };

  const currentTurn = chess.turn();

  // Highlight valid moves for a selected piece
  const getMoveOptions = (square: string) => {
    const isMyTurn = (currentTurn === "w" && playerColor === "white") || 
                     (currentTurn === "b" && playerColor === "black");
    
    if (!isMyTurn) return;

    const moves = chess.moves({
      square,
      verbose: true,
    }) as Move[];

    if (moves.length === 0) {
      setOptionSquares({});
      return;
    }

    const newSquares: Record<string, React.CSSProperties> = {};
    moves.map((move) => {
      newSquares[move.to] = {
        background:
          chess.get(move.to as any) &&
          chess.get(move.to as any).color !== chess.get(square as any).color
            ? "radial-gradient(circle, rgba(0,0,0,.1) 85%, transparent 85%)"
            : "radial-gradient(circle, rgba(0,0,0,.1) 25%, transparent 25%)",
        borderRadius: "50%",
      };
      return move;
    });
    newSquares[square] = {
      background: "rgba(255, 255, 0, 0.4)",
    };
    setOptionSquares(newSquares);
  };

  const [moveFrom, setMoveFrom] = useState<string | null>(null);

  const onSquareClick = ({ square }: { square: string }) => {
    const isMyTurn = (currentTurn === "w" && playerColor === "white") || 
                     (currentTurn === "b" && playerColor === "black");
    if (!isMyTurn) return;

    if (!moveFrom) {
      if (chess.get(square as any) && chess.get(square as any).color === currentTurn) {
        setMoveFrom(square);
        getMoveOptions(square);
      }
    } else {
      const moveSuccess = handlePieceDrop({ sourceSquare: moveFrom, targetSquare: square, piece: "" });
      if (!moveSuccess) {
        if (chess.get(square as any) && chess.get(square as any).color === currentTurn) {
          setMoveFrom(square);
          getMoveOptions(square);
        } else {
          setMoveFrom(null);
          setOptionSquares({});
        }
      } else {
        setMoveFrom(null);
      }
    }
  };

  const onPieceDragBegin = ({ square }: { square: string }) => {
    setMoveFrom(square);
    getMoveOptions(square);
  };

  const onPieceDragEnd = () => {
    setOptionSquares({});
  };

  const handlePieceDrop = ({ sourceSquare, targetSquare }: { sourceSquare: string, targetSquare: string, piece: string }) => {
    setOptionSquares({});
    setMoveFrom(null);
    if (chess.isGameOver()) return false;

    // Check if it's player's turn
    const isMyTurn = (currentTurn === "w" && playerColor === "white") || 
                     (currentTurn === "b" && playerColor === "black");
    
    if (!isMyTurn) return false;

    try {
      const moveTimeMs = lastTickRef.current ? Date.now() - lastTickRef.current : 500;
      const move = chess.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: "q" // always promote to queen for simplicity
      });

      if (move) {
        setMoveSquares({
          [move.from]: { backgroundColor: "rgba(255, 255, 0, 0.4)" },
          [move.to]: { backgroundColor: "rgba(255, 255, 0, 0.4)" },
        });

        if (move.captured) {
          synthSounds.playCapture();
          triggerBoardShake("capture");
        } else if (chess.inCheck()) {
          synthSounds.playCheck();
          triggerBoardShake("check");
        } else {
          synthSounds.playMove();
        }

        const nextF = chess.fen();
        setBoardFen(nextF);
        onMove(nextF, move.san, moveTimeMs);
        return true;
      }
    } catch (err) {
      // Invalid move
      return false;
    }
    return false;
  };

  const resignMatch = () => {
    chess.reset();
    synthSounds.playCheck();
    onMove(chess.fen(), "Resigned", 1);
  };

  return (
    <div className="w-full flex flex-col gap-4 font-sans max-w-[480px] mx-auto">
      
      {/* Black Player Banner (Opponent / AI Bot) */}
      <div className="flex justify-between items-center px-4 py-3 rounded-2xl bg-zinc-900/60 border border-white/10 backdrop-blur-md shadow-sm">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full ${
            isAIGame 
              ? "bg-purple-500/10 border border-purple-500/35 text-purple-400" 
              : "bg-zinc-800 border border-zinc-700 text-zinc-300"
          } flex items-center justify-center font-bold text-lg shadow-inner`}>
            {isAIGame ? "🤖" : blackName[0]?.toUpperCase() || "A"}
          </div>
          <div>
            <div className="text-sm font-bold text-zinc-100 flex items-center gap-2 leading-none">
              {blackName}
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 bg-zinc-900 border border-white/10 text-zinc-400 rounded-md">
                {blackRating}
              </span>
              {isAIGame && (
                <span className="text-[9px] font-bold text-purple-400 bg-purple-500/15 border border-purple-500/20 px-1.5 py-0.5 rounded-md font-mono uppercase animate-pulse">
                  ИИ БОТ
                </span>
              )}
            </div>
            <div className="text-[10px] text-zinc-500 font-mono mt-1 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500/80" /> Гарант смарт-контракта TON
            </div>
          </div>
        </div>

        {/* Timer */}
        <div className={`px-3 py-1.5 min-w-[70px] text-center rounded-xl border-2 font-mono text-lg font-black transition-all ${
          currentTurn === "b" && !chess.isGameOver()
            ? "bg-amber-500/15 text-amber-400 border-amber-500/40 shadow-[0_0_20px_rgba(245,158,11,0.15)]" 
            : "bg-zinc-950/80 text-zinc-400 border-white/5"
        }`}>
          {formatTime(blackLeft)}
        </div>
      </div>

      {/* Main Beautiful Chessboard Component */}
      <motion.div 
        animate={
          boardShakeType === "capture" 
            ? { scale: [1, 0.98, 1.02, 1], rotate: [0, -1, 1, 0] } 
            : boardShakeType === "check" 
              ? { x: [-5, 5, -5, 5, 0], y: [-2, 2, -2, 2, 0] } 
              : { x: 0, y: 0, scale: 1, rotate: 0 }
        }
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="w-full aspect-square rounded-xl overflow-hidden shadow-[0_20px_40px_rgba(0,0,0,0.4)] relative border-4 border-[#121214] bg-neutral-900"
      >
        <Chessboard 
          options={{
            position: boardFen,
            onPieceDrop: handlePieceDrop as any,
            // react-chessboard v5 changed the interface to options obj
            boardOrientation: playerColor,
            animationDurationInMs: 250,
            darkSquareStyle: { backgroundColor: "#769656" },
            lightSquareStyle: { backgroundColor: "#eeeed2" },
            squareStyles: { ...moveSquares, ...hintSquares, ...optionSquares },
            boardStyle: { borderRadius: "0px" },
            onSquareClick: onSquareClick as any,
            onPieceDrag: onPieceDragBegin as any
          }}
        />
      </motion.div>

      {/* White Player Banner (Current User) */}
      <div className="flex justify-between items-center px-4 py-3 rounded-2xl bg-zinc-900/60 border border-white/10 backdrop-blur-md shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-amber-500/15 border border-amber-500/35 flex items-center justify-center text-amber-400 font-black text-lg shadow-inner">
            👤
          </div>
          <div>
            <div className="text-sm font-bold text-zinc-100 flex items-center gap-2 leading-none">
              {whiteName}
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 bg-amber-500/15 text-amber-300 border border-amber-500/25 rounded-md">
                {whiteRating}
              </span>
            </div>
            <div className="text-[10px] text-zinc-500 font-mono mt-1">
              ⚡ Внутренний пинг • Ваша партия
            </div>
          </div>
        </div>

        {/* Timer */}
        <div className={`px-3 py-1.5 min-w-[70px] text-center rounded-xl border-2 font-mono text-lg font-black transition-all ${
          currentTurn === "w" && !chess.isGameOver()
            ? "bg-amber-500/15 text-amber-400 border-amber-500/40 shadow-[0_0_20px_rgba(245,158,11,0.15)]" 
            : "bg-zinc-950/80 text-zinc-400 border-white/5"
        }`}>
          {formatTime(whiteLeft)}
        </div>
      </div>

      {/* Modern Controls */}
      <div className="flex gap-2 justify-center py-2">
        <button
          onClick={resignMatch}
          title="Сдаться"
          className="flex-1 max-w-[140px] flex justify-center items-center gap-1.5 px-3 py-3 text-xs sm:text-sm font-bold text-white bg-red-500/15 hover:bg-red-500/30 border border-red-500/30 hover:border-red-500/60 transition-all rounded-xl cursor-pointer"
        >
          <Flag className="w-4 h-4" /> Сдаться
        </button>
        <button
          onClick={requestHint}
          disabled={isHintLoading}
          title="Подсказка хода"
          className="flex-1 max-w-[140px] flex justify-center items-center gap-1.5 px-3 py-3 text-xs sm:text-sm font-bold text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 hover:border-emerald-500/40 transition-all rounded-xl cursor-pointer disabled:opacity-50"
        >
          <Lightbulb className={`w-4 h-4 ${isHintLoading ? "animate-pulse" : ""}`} /> Подсказка
        </button>
        <button
          onClick={() => {
            chess.reset();
            synthSounds.playMove();
            setBoardFen(chess.fen());
            setHintSquares({});
            onMove(chess.fen(), "Restarted", 0);
          }}
          title="Сброс"
          className="flex-1 max-w-[140px] flex justify-center items-center gap-1.5 px-3 py-3 text-xs sm:text-sm font-bold text-zinc-100 bg-zinc-800 hover:bg-zinc-700 border border-white/10 hover:border-white/20 transition-all rounded-xl cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" /> Сброс
        </button>
      </div>

      {/* Game status display (Checkmate/Draw/etc) */}
      {chess.isGameOver() && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-amber-500/10 border-2 border-amber-500/20 p-5 rounded-2xl flex flex-col items-center justify-center text-center gap-3 shadow-[0_10px_30px_rgba(245,158,11,0.1)] mt-2"
        >
          <AlertTriangle className="w-8 h-8 text-amber-400" />
          <div>
            <div className="font-mono font-black text-amber-400 text-sm uppercase tracking-widest">МАТЧ ЗАВЕРШЕН</div>
            <div className="text-white text-lg font-bold mt-1.5">
              {chess.isCheckmate() ? "🏆 Шах и мат!" : chess.isDraw() ? "⚡ Партия завершилась ничьей" : "Игра прекращена"}
            </div>
            <div className="text-xs text-zinc-400 font-sans mt-2 max-w-xs mx-auto leading-relaxed">
              Рейтинги и ставки TON обновлены.
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
