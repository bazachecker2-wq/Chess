import React from "react";
import { GameState } from "../types";
import { Zap } from "lucide-react";
import ChessBoard from "./ChessBoard";
import AIAnalyst from "./AIAnalyst";
import AntiCheatModule from "./AntiCheatModule";

interface ArenaMatchProps {
  activeMatch: GameState;
  setActiveMatch: (match: GameState | null) => void;
  profileId: string;
  profileUsername: string;
  isAIGame: boolean;
  gameHistory: string[];
  aiPersonality: string;
  setAiPersonality: (pers: string) => void;
  handlePieceMove: (newFen: string, sanMove: string, moveDurationMs: number) => void;
  timePreset: string;
}

export default function ArenaMatch({
  activeMatch,
  setActiveMatch,
  profileId,
  profileUsername,
  isAIGame,
  gameHistory,
  aiPersonality,
  setAiPersonality,
  handlePieceMove,
  timePreset,
}: ArenaMatchProps) {
  const currentMatchWager = activeMatch.wager || 0;
  const currentSuspicious = activeMatch.antiCheatTrace?.suspiciousIntervals || 0;
  const currentCorr = activeMatch.antiCheatTrace?.correlationScore || 12;
  const currentCheat = activeMatch.antiCheatTrace?.cheatScore || 0;

  const whiteTimeSec = timePreset === "1m" ? 60 : timePreset === "3m" ? 180 : timePreset === "5m" ? 300 : 600;
  const blackTimeSec = whiteTimeSec;

  return (
    <div className="flex flex-col gap-5">
      {/* Escrow contract lockup banner details */}
      {currentMatchWager > 0 && (
        <div className="px-5 py-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex justify-between items-center">
          <span className="text-xs uppercase font-bold text-emerald-400 flex items-center gap-2">
            <Zap className="w-4 h-4 animate-bounce" /> Эскроу
          </span>
          <span className="text-sm font-bold text-emerald-300 font-mono">
            {(currentMatchWager * 2).toFixed(1)} TON (Пул)
          </span>
        </div>
      )}

      <ChessBoard
        fen={activeMatch.fen}
        history={gameHistory}
        whiteName={activeMatch.white.firstName}
        whiteRating={activeMatch.white.rating}
        blackName={activeMatch.black.firstName}
        blackRating={activeMatch.black.rating}
        playerColor={
          activeMatch.white.id === profileId || activeMatch.white.id === profileUsername
            ? "white"
            : "black"
        }
        isAIGame={isAIGame}
        onMove={handlePieceMove}
        activeMatchId={activeMatch.id}
        whiteTimeSec={whiteTimeSec}
        blackTimeSec={blackTimeSec}
      />

      {/* Gemini commentators bubble coach */}
      <AIAnalyst
        fen={activeMatch.fen}
        history={gameHistory}
        personality={aiPersonality}
        onPersonalityChange={setAiPersonality}
        whiteName={activeMatch.white.firstName}
        blackName={activeMatch.black.firstName}
      />

      {/* Enterprise Anti-Cheat widget */}
      <AntiCheatModule
        suspiciousIntervals={currentSuspicious}
        correlationScore={currentCorr}
        cheatScore={currentCheat}
        movesCount={gameHistory.length}
      />

      {/* Close board state back to menu */}
      <button
        onClick={() => {
          setActiveMatch(null);
        }}
        className="w-full py-3.5 mt-2 text-sm font-sans font-bold text-red-500 bg-red-500/10 hover:bg-red-500/20 rounded-xl border border-red-500/20 hover:border-red-500/40 transition-all text-center cursor-pointer shadow-lg"
      >
        Выйти в главное меню (Сдаться)
      </button>
    </div>
  );
}
