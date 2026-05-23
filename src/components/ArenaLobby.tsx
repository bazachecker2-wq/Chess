import React from "react";
import { UserProfile, GameTimePreset, GameWagerPreset } from "../types";
import { Gamepad2, Sparkles } from "lucide-react";
import WalletModal from "./WalletModal";
import { motion, AnimatePresence } from "motion/react";

interface ArenaLobbyProps {
  profile: UserProfile;
  setProfile: (profile: UserProfile) => void;
  profileExpanded: boolean;
  setProfileExpanded: (expanded: boolean) => void;
  timePreset: GameTimePreset;
  setTimePreset: (time: GameTimePreset) => void;
  wager: GameWagerPreset;
  setWager: (wager: GameWagerPreset) => void;
  walletConnected: boolean;
  handleWalletLinked: (connected: boolean, address: string | null) => void;
  handleFaucetClaim: () => void;
  startMatchmaker: () => void;
  startAIGame: () => void;
}

export default function ArenaLobby({
  profile,
  setProfile,
  profileExpanded,
  setProfileExpanded,
  timePreset,
  setTimePreset,
  wager,
  setWager,
  walletConnected,
  handleWalletLinked,
  handleFaucetClaim,
  startMatchmaker,
  startAIGame,
}: ArenaLobbyProps) {
  const timePresetsList: { preset: GameTimePreset; name: string; desc: string }[] = [
    { preset: "1m", name: "Пуля (Bullet)", desc: "Быстрые решения" },
    { preset: "3m", name: "Блиц (Blitz)", desc: "Стандартный блиц" },
    { preset: "5m", name: "Рапид (Rapid)", desc: "Тактический фокус" },
    { preset: "10m", name: "Классика", desc: "Глубокое размышление" }
  ];

  return (
    <div className="flex flex-col gap-5">
      {/* Hero Intro banner */}
      <div className="p-6 rounded-2xl bg-zinc-900/50 border border-white/5 backdrop-blur-md flex flex-col gap-2 relative overflow-hidden text-center">
        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full filter blur-3xl" />
        <span className="text-[10px] sm:text-xs font-bold tracking-widest text-amber-500 uppercase">Матчмейкинг Арена</span>
        <h2 className="text-xl sm:text-2xl font-bold text-white leading-tight mt-1">Шахматы на TON<br/><span className="text-zinc-400">PvP И Эскроу смарт-контракты</span></h2>
      </div>

      {/* Personalize Your Profile accordion */}
      <div className="rounded-2xl bg-zinc-900/30 border border-white/5 overflow-hidden transition-all duration-300">
        <button
          onClick={() => setProfileExpanded(!profileExpanded)}
          className="w-full text-left p-5 flex items-center justify-between hover:bg-zinc-800/50 transition-colors"
        >
          <div className="flex items-center gap-3 text-sm font-bold text-zinc-100">
            <span className="p-2 rounded-lg bg-zinc-800 text-amber-400"><Sparkles className="w-5 h-5"/></span>
            <span>Настройки профиля</span>
          </div>
          <span className="text-xs text-zinc-500 font-bold bg-zinc-800 px-3 py-1.5 rounded-lg">
            {profileExpanded ? "Скрыть" : "Настроить"}
          </span>
        </button>
        
        <AnimatePresence>
          {profileExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="px-5 pb-6 flex flex-col gap-5 border-t border-white/5 bg-zinc-900/20"
            >
              <p className="text-xs text-zinc-400 leading-relaxed mt-4">
                Настройте ваш игровой профиль перед выходом на арену. Все изменения сохранятся в вашем локальном кошельке.
              </p>

              {/* AVATAR EMOJI SELECTION GRID */}
              <div className="flex flex-col gap-2.5">
                <span className="text-xs text-zinc-400 font-bold uppercase tracking-wider">Иконка</span>
                <div className="flex flex-wrap gap-2">
                  {["👤", "🥷", "👑", "🧙", "👾", "🦄", "🚀", "♟️", "⚔️", "🏆", "💎", "🦁"].map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setProfile({ ...profile, photoUrl: emoji })}
                      className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl transition-all border cursor-pointer ${
                        (profile.photoUrl || "👤") === emoji
                          ? "bg-zinc-100 border-zinc-100 text-[#0a0a0c] scale-110 shadow-lg"
                          : "bg-zinc-900 border-white/5 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                <div>
                  <label className="text-xs text-zinc-400 font-bold uppercase">Никнейм (@ID)</label>
                  <input
                    type="text"
                    value={profile.username}
                    onChange={(e) => setProfile({ ...profile, username: e.target.value })}
                    className="w-full mt-2 px-4 py-3 text-sm text-zinc-100 bg-zinc-950 border border-white/10 rounded-xl focus:outline-none focus:border-amber-500/50 font-mono transition-colors"
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-400 font-bold uppercase">Отображаемое имя</label>
                  <input
                    type="text"
                    value={profile.firstName}
                    onChange={(e) => setProfile({ ...profile, firstName: e.target.value })}
                    className="w-full mt-2 px-4 py-3 text-sm text-zinc-100 bg-zinc-950 border border-white/10 rounded-xl focus:outline-none focus:border-amber-500/50 transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-zinc-400 font-bold uppercase">Текущий рейтинг</label>
                  <div className="flex items-center gap-3 mt-2 bg-zinc-950 px-4 py-3 border border-white/10 rounded-xl focus-within:border-amber-500/50 transition-colors">
                    <input
                      type="range"
                      min="400"
                      max="3000"
                      step="50"
                      value={profile.rating}
                      onChange={(e) => setProfile({ ...profile, rating: parseInt(e.target.value) || 1400 })}
                      className="accent-amber-500 cursor-pointer h-1.5 w-full bg-zinc-800 rounded-lg appearance-none"
                    />
                    <span className="text-sm font-black text-amber-400 w-12 text-right">
                      {profile.rating}
                    </span>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-zinc-400 font-bold uppercase">Баланс TON</label>
                  <input
                    type="number"
                    value={profile.balanceTON}
                    onChange={(e) => setProfile({ ...profile, balanceTON: Math.max(0, parseFloat(e.target.value) || 0) })}
                    className="w-full mt-2 px-4 py-3 text-sm text-zinc-100 bg-zinc-950 border border-white/10 rounded-xl focus:outline-none focus:border-amber-500/50 transition-colors font-mono"
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 1. Bullet / Blitz time presets */}
      <div className="flex flex-col gap-3 bg-zinc-900/30 border border-white/5 rounded-2xl p-5">
        <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1">Формат времени</h3>
        <div className="grid grid-cols-2 gap-3">
          {timePresetsList.map((presetObj) => (
            <button
              key={presetObj.preset}
              onClick={() => setTimePreset(presetObj.preset)}
              className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all cursor-pointer ${
                timePreset === presetObj.preset
                  ? "bg-zinc-100 text-zinc-900 border-zinc-100 shadow-[0_5px_20px_rgba(255,255,255,0.1)] scale-[1.02]"
                  : "bg-zinc-900/50 text-zinc-400 border-white/5 hover:border-zinc-700 hover:text-zinc-200"
              }`}
            >
              <div className="text-left">
                <span className="text-sm font-bold block">{presetObj.name}</span>
                <span className="text-xs opacity-70 mt-0.5">{presetObj.desc}</span>
              </div>
              <span className="text-sm font-black font-mono">{presetObj.preset === "1m" ? "1M" : presetObj.preset === "3m" ? "3M" : presetObj.preset === "5m" ? "5M" : "10M"}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Escrow Staking Slider / Config */}
      <WalletModal
        balanceTON={profile.balanceTON}
        starsCount={profile.starsCount}
        currentWager={wager}
        onWagerChange={setWager}
        onWalletStatusChange={handleWalletLinked}
        onFaucetClaim={handleFaucetClaim}
      />

      {/* Launch actions */}
      <div className="flex flex-col gap-3 mt-2">
        <button
          onClick={startMatchmaker}
          className="w-full py-4 px-6 bg-amber-500 hover:bg-amber-400 text-neutral-950 text-base font-black rounded-2xl shadow-xl transition-all flex items-center justify-center gap-3 group cursor-pointer"
        >
          <Gamepad2 className="w-6 h-6" /> НАЧАТЬ ПОИСК СОПЕРНИКА
        </button>
        <button
          onClick={startAIGame}
          className="w-full py-4 px-6 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-base font-bold rounded-2xl border border-white/5 transition-all flex items-center justify-center gap-3 cursor-pointer"
        >
          🤖 Тренировка с ИИ
        </button>
      </div>
    </div>
  );
}
