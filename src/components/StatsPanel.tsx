import React, { useState } from "react";
import { Trophy, Star } from "lucide-react";
import { UserProfile, Clan } from "../types";

interface StatsPanelProps {
  user: UserProfile;
  onProfileChange?: (updated: UserProfile) => void;
  onShowToast?: (msg: string, type?: "success" | "info" | "error") => void;
}

export default function StatsPanel({ user, onProfileChange, onShowToast }: StatsPanelProps) {
  const [activeTab, setActiveTab] = useState<"leaderboard" | "clans" | "battlepass" | "achievements">("leaderboard");

  const clans: Clan[] = [
    { id: "clan_ton_knights", name: "TON Knights", tag: "TNK", rating: 1840, membersCount: 42, trophies: 1250 },
    { id: "clan_tg_kings", name: "Telegram Kings", tag: "TGK", rating: 1620, membersCount: 35, trophies: 840 },
    { id: "clan_ether_rooks", name: "Ethereum Rooks", tag: "ETH", rating: 1450, membersCount: 18, trophies: 410 },
    { id: "clan_sol_builders", name: "Solana Builders", tag: "SOL", rating: 1200, membersCount: 12, trophies: 190 }
  ];

  const leaderboard = [
    { rank: 1, name: "Pavel_Durov", rtg: 2854, TON: 4200.5, clan: "TGK" },
    { rank: 2, name: "Garry_K", rtg: 2790, TON: 2150.0, clan: "TNK" },
    { rank: 3, name: "Magnus_Carl", rtg: 2750, TON: 1950.0, clan: "TNK" },
    { rank: 4, name: user.username, rtg: user.rating, TON: user.balanceTON, clan: user.clanId ? clans.find(c => c.id === user.clanId)?.tag || "TNK" : "TNK" }, // Linked to user current rating dynamically
    { rank: 5, name: "Satoshi_N", rtg: 1410, TON: 120.5, clan: "SOL" },
    { rank: 6, name: "Vitalic_B", rtg: 1390, TON: 85.0, clan: "ETH" }
  ];

  const initialMilestones = [
    { id: "1", title: "Первая кровь", desc: "Выиграйте матч быстрее чем за 1 минуту или со ставкой от 5 TON", xp: 150, done: user.completedQuests.includes("1") || user.completedQuests.includes("first_win") },
    { id: "2", title: "Дзен-Мастер", desc: "Сыграйте 3 матча, используя озвучку дзен-монаха Зефира", xp: 200, done: user.completedQuests.includes("2") || user.completedQuests.includes("fast_bullet") },
    { id: "3", title: "Проверенный смарт-рефери", desc: "Успешно завершите выплату ставки TON на базе эскроу-протокола", xp: 350, done: user.completedQuests.includes("3") },
    { id: "4", title: "Шахматный Хайроллер", desc: "Установите размер ставки в 100 TON в быстром рапид-матче", xp: 500, done: user.completedQuests.includes("4") }
  ];

  const battlePassTiers = [
    { tier: 1, xpReq: 100, reward: "Рамка «Космическая пыль»", premiumReward: "⭐️ 50 Звёзд Telegram", unlocked: user.battlePassLevel >= 1 },
    { tier: 2, xpReq: 200, reward: "Набор золотых фигур", premiumReward: "Золотой аватар коня", unlocked: user.battlePassLevel >= 2 },
    { tier: 3, xpReq: 300, reward: "Голос Саважа ИИ в партиях", premiumReward: "⭐️ 100 Звёзд Telegram", unlocked: user.battlePassLevel >= 3 },
    { tier: 4, xpReq: 400, reward: "Статусный баннер профиля", premiumReward: "Снижение комиссии (-2%)", unlocked: user.battlePassLevel >= 4 },
    { tier: 5, xpReq: 500, reward: "Тема доски «Бездна»", premiumReward: "Свой шаблон Смарт-Контракта", unlocked: user.battlePassLevel >= 5 }
  ];

  const handleJoinClan = (clan: Clan) => {
    if (onProfileChange) {
      onProfileChange({
        ...user,
        clanId: clan.id,
        clanName: clan.name
      });
      if (onShowToast) {
        onShowToast(`⚔️ Вы успешно вступили в клан [${clan.name}]!`, "success");
      } else {
        alert(`⚔️ Вы успешно вступили в шахматный клан [${clan.name}]!`);
      }
    }
  };

  const handleClaimAchievement = (id: string, xpReward: number) => {
    if (onProfileChange) {
      let newXP = user.battlePassXP + xpReward;
      let newLevel = user.battlePassLevel;
      while (newXP >= 500) {
        newXP -= 1000; // corrected bp levelling rate 500 -> level up
        newXP = Math.max(0, newXP);
        newLevel += 1;
      }
      
      onProfileChange({
        ...user,
        battlePassXP: Math.min(500, user.battlePassXP + xpReward),
        battlePassLevel: user.battlePassXP + xpReward >= 500 ? user.battlePassLevel + 1 : user.battlePassLevel,
        completedQuests: [...user.completedQuests, id]
      });
      if (onShowToast) {
        onShowToast(`🎉 Квест выполнен! Вам начислено +${xpReward} XP опыта!`, "success");
      } else {
        alert(`🎉 Квест выполнен! Вам начислено +${xpReward} XP опыта!`);
      }
    }
  };

  return (
    <div className="w-full rounded-xl bg-black/40 border border-white/5 p-4 backdrop-blur-md flex flex-col gap-4">
      {/* Category Tabs */}
      <div className="flex border-b border-white/5 overflow-x-auto gap-1 py-1 no-scrollbar justify-between">
        <button
          onClick={() => setActiveTab("leaderboard")}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg shrink-0 transition-all ${
            activeTab === "leaderboard"
              ? "bg-amber-500/10 text-amber-300 border border-amber-500/30"
              : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          Рейтинг игроков
        </button>
        <button
          onClick={() => setActiveTab("clans")}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg shrink-0 transition-all ${
            activeTab === "clans"
              ? "bg-amber-500/10 text-amber-300 border border-amber-500/30"
              : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          Клановые Войны
        </button>
        <button
          onClick={() => setActiveTab("battlepass")}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg shrink-0 transition-all ${
            activeTab === "battlepass"
              ? "bg-amber-500/10 text-amber-300 border border-amber-500/30"
              : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          Боевой Пропуск
        </button>
        <button
          onClick={() => setActiveTab("achievements")}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg shrink-0 transition-all ${
            activeTab === "achievements"
              ? "bg-amber-500/10 text-amber-300 border border-amber-500/30"
              : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          Достижения
        </button>
      </div>

      {/* Tab Contents */}
      <div className="mt-1">
        {/* LEADERBOARD VIEW */}
        {activeTab === "leaderboard" && (
          <div className="flex flex-col gap-2 font-sans">
            <div className="flex justify-between items-center text-[10px] font-mono text-zinc-500 uppercase px-2 mb-1.5 font-bold">
              <span>Место / Шахматист</span>
              <div className="flex gap-8">
                <span>Рейтинг</span>
                <span className="w-16 text-right">На кону TON</span>
              </div>
            </div>

            <div className="space-y-1.5">
              {leaderboard.map((player) => {
                const isMe = player.name === user.username;
                return (
                  <div
                    key={player.name}
                    className={`flex justify-between items-center px-3 py-2 rounded-lg border transition-all ${
                      isMe 
                        ? "bg-amber-500/10 border-amber-500/40 text-amber-200 font-semibold" 
                        : "bg-zinc-950/55 border-white/5 text-zinc-300"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                       <span className={`w-4 text-xs font-bold font-mono ${player.rank === 1 ? "text-yellow-400" : player.rank === 2 ? "text-zinc-400" : player.rank === 3 ? "text-amber-600" : "text-zinc-500"}`}>
                        #{player.rank}
                      </span>
                      <span className="text-xs font-semibold flex items-center gap-1.5 truncate max-w-28 md:max-w-40">
                        {player.name}
                        <span className="text-[8px] font-mono bg-zinc-900 border border-white/5 text-zinc-400 px-1 py-0.5 rounded uppercase font-bold text-[7px]">
                          {player.clan}
                        </span>
                      </span>
                    </div>
                    
                    <div className="flex gap-8 font-mono text-xs items-center">
                      <span className="font-bold text-zinc-200">{player.rtg}</span>
                      <span className="w-16 text-right text-emerald-400 font-bold">{player.TON.toFixed(1)} TON</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* CLANS VIEW */}
        {activeTab === "clans" && (
          <div className="flex flex-col gap-3 font-sans">
            <p className="text-[11px] text-zinc-400 leading-relaxed font-sans border-b border-white/5 pb-2">
              Вступайте в активные шахматные кланы Telegram, чтобы сражаться в еженедельных лигах Арены и делать командные взносы в TON. Лидирующие кланы делят автоматический пул смарт-контракта!
            </p>

            <div className="space-y-1.5">
              {clans.map((clan) => {
                const joined = clan.id === user.clanId;
                return (
                  <div
                    key={clan.id}
                    className={`flex justify-between items-center px-3 py-2 bg-zinc-950/50 rounded-lg border ${
                      joined ? "border-amber-500/30 bg-amber-500/5" : "border-white/5"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-white/10 flex items-center justify-center text-zinc-400 font-bold text-xs uppercase font-mono">
                        {clan.tag}
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
                          {clan.name}
                          {joined && (
                            <span className="text-[8px] font-mono text-amber-400 uppercase font-bold bg-amber-500/10 px-1 rounded border border-amber-500/25">
                              Мой Клан
                            </span>
                          )}
                        </div>
                        <div className="text-[9px] text-zinc-500 font-mono">
                          {clan.membersCount} участников • Активно в лигах
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex flex-col items-end text-right font-mono">
                        <span className="text-xs font-bold text-zinc-200 flex items-center gap-1">
                          <Trophy className="w-3.5 h-3.5 text-yellow-500" /> {clan.trophies}
                        </span>
                        <span className="text-[9px] text-zinc-500">Рейтинг: {clan.rating}</span>
                      </div>
                      {!joined && onProfileChange && (
                        <button
                          onClick={() => handleJoinClan(clan)}
                          className="px-2.5 py-1 text-[10px] font-bold font-mono text-amber-400 hover:text-neutral-950 bg-amber-500/10 hover:bg-amber-400 border border-amber-500/20 text-center rounded-lg transition-all"
                        >
                          Вступить
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* BATTLE PASS VIEW */}
        {activeTab === "battlepass" && (
          <div className="flex flex-col gap-3 font-sans">
            {/* XP Status header */}
            <div className="p-3 bg-zinc-950/80 border border-white/5 rounded-xl flex justify-between items-center relative overflow-hidden">
              <div className="z-10 flex flex-col gap-1">
                <span className="text-[9px] font-mono font-bold tracking-widest text-amber-500 uppercase">Сезон 1: Космическое противостояние</span>
                <span className="text-sm font-black text-zinc-100 flex items-center gap-1.5">
                  <Star className="w-4 h-4 text-amber-400 animate-spin" /> Уровень пропуска {user.battlePassLevel}
                </span>
                <span className="text-[10px] text-zinc-400 font-mono font-bold">Опыт профиля: {user.battlePassXP}/500</span>
              </div>
              
              {/* Progress Circle visual representation */}
              <div className="w-11 h-11 rounded-full border-4 border-amber-500/20 border-r-amber-500 flex items-center justify-center font-mono font-bold text-xs text-zinc-200 shadow-inner">
                {Math.round((user.battlePassXP / 500) * 100)}%
              </div>
            </div>

            {/* Reward tracks */}
            <div className="space-y-1.5 mt-1 font-sans">
              <div className="flex justify-between items-center text-[10px] font-mono font-bold text-zinc-500 uppercase px-1 mb-1">
                <span>Уровень</span>
                <div className="flex gap-16">
                  <span>Обычные</span>
                  <span className="w-24 text-right">⭐️ Премиум</span>
                </div>
              </div>

              {battlePassTiers.map((tier) => (
                <div
                  key={tier.tier}
                  className={`flex justify-between items-center px-3 py-2 rounded-lg border ${
                    tier.unlocked ? "bg-zinc-950/60 border-emerald-500/10 text-zinc-300" : "bg-black/80 border-white/5 text-zinc-500 opacity-60"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`w-5 text-xs font-mono font-black ${tier.unlocked ? "text-amber-400" : "text-zinc-600"}`}>
                      Ур. {tier.tier}
                    </span>
                  </div>
                  
                  <div className="flex justify-between w-full ml-6 text-xs font-mono items-center gap-4">
                    <span className={`truncate max-w-24 md:max-w-36 ${tier.unlocked ? "text-zinc-300 font-semibold" : "text-zinc-600"}`}>
                      {tier.reward}
                    </span>
                    <span className={`text-right w-24 truncate ${tier.unlocked ? "text-yellow-400 font-bold" : "text-zinc-600"}`}>
                      {tier.premiumReward}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ACHIEVEMENTS VIEW */}
        {activeTab === "achievements" && (
          <div className="flex flex-col gap-3 font-sans">
            <div className="grid grid-cols-1 gap-2">
              {initialMilestones.map((ms) => (
                <div
                  key={ms.id}
                  className={`flex gap-3 p-3 bg-zinc-950/45 rounded-xl border transition-all ${
                    ms.done 
                    ? "border-emerald-500/15 bg-emerald-500/5 hover:bg-emerald-500/10" 
                    : "border-white/5 opacity-80"
                  }`}
                >
                  <div className="shrink-0">
                    <div className={`w-8 h-8 rounded-lg border flex items-center justify-center font-mono font-black text-sm ${
                      ms.done ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-zinc-900 border-white/5 text-zinc-500"
                    }`}>
                      {ms.done ? "🏆" : "🔒"}
                    </div>
                  </div>

                  <div className="flex flex-col gap-1 flex-1">
                    <div className="flex justify-between items-center w-full">
                      <span className="text-xs font-bold text-zinc-100">{ms.title}</span>
                      <span className="text-[10px] text-amber-300 font-bold font-mono">+{ms.xp} Опыт</span>
                    </div>
                    <p className="text-[10px] text-zinc-400 leading-relaxed font-sans">{ms.desc}</p>
                    
                    {!ms.done && onProfileChange && (
                      <button
                        onClick={() => handleClaimAchievement(ms.id, ms.xp)}
                        className="mt-2 self-start px-3 py-1 text-[9px] font-bold font-mono text-emerald-400 hover:text-neutral-950 bg-emerald-500/10 hover:bg-emerald-400 border border-emerald-500/20 rounded transition-all"
                      >
                        Завершить квест ⚡
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
