import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import { Chess } from "chess.js";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini safely
let ai: GoogleGenAI | null = null;
try {
  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey && apiKey !== "MY_GEMINI_API_KEY") {
    ai = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
    console.log("Gemini client successfully initialized server-side.");
  } else {
    console.warn("GEMINI_API_KEY is not set or using default placeholder. AI commentary will fall back to local rule-based descriptions.");
  }
} catch (error) {
  console.error("Failed to initialize Gemini Client:", error);
}

// In-memory data structures
const matchmakingQueue: any[] = [];
const activeMatches = new Map<string, any>();
const userStats = new Map<string, any>();

// Global AI Showdown and Betting State
let liveAIBattle: any = null;
const finishedAIBattles: any[] = [];

// AI heuristics selector
export function selectBestMove(fen: string): string {
  const chess = new Chess(fen);
  if (chess.isGameOver()) return "";
  
  const moves = chess.moves({ verbose: true });
  if (moves.length === 0) return "";
  
  // 1. Check if there's any immediate checkmate move
  for (const move of moves) {
    const tempChess = new Chess(fen);
    tempChess.move(move.san);
    if (tempChess.isCheckmate()) {
      return move.san;
    }
  }
  
  // 2. Check for check moves
  const checks = moves.filter(move => {
    const tempChess = new Chess(fen);
    tempChess.move(move.san);
    return tempChess.inCheck();
  });
  if (checks.length > 0 && Math.random() < 0.45) {
    return checks[Math.floor(Math.random() * checks.length)].san;
  }
  
  // 3. Prioritize captures by value
  const pieceValues: Record<string, number> = { q: 900, r: 500, b: 330, n: 320, p: 100 };
  const captures = moves.filter(m => m.captured);
  if (captures.length > 0) {
    captures.sort((a, b) => {
      const valA = pieceValues[a.captured || 'p'] || 100;
      const valB = pieceValues[b.captured || 'p'] || 100;
      return valB - valA;
    });
    // 75% chance to play the best capture if available
    if (Math.random() < 0.75) {
      return captures[0].san;
    }
  }
  
  // 4. Prefer moves controlling the center squares (d4, d5, e4, e5, c4, c5, f4, f5)
  const centerSquares = ["d4", "d5", "e4", "e5", "c4", "c5", "f4", "f5"];
  const centerMoves = moves.filter(m => centerSquares.includes(m.to));
  if (centerMoves.length > 0 && Math.random() < 0.5) {
    const index = Math.floor(Math.random() * centerMoves.length);
    return centerMoves[index].san;
  }
  
  // 5. Default: pick a random legal move
  const randomIdx = Math.floor(Math.random() * moves.length);
  return moves[randomIdx].san;
}

// Resolve all active bets placed on the live AI battle
function resolveBets(winner: 'white' | 'black' | 'draw', chess: Chess) {
  if (!liveAIBattle || !liveAIBattle.bets) return;

  const bothQueensAlive = liveAIBattle.fen.includes("q") && liveAIBattle.fen.includes("Q");
  const totalMoves = liveAIBattle.history.length;

  for (const bet of liveAIBattle.bets) {
    if (bet.settled) continue;

    let isWon = false;
    if (bet.type === "white_wins" && winner === "white") isWon = true;
    else if (bet.type === "black_wins" && winner === "black") isWon = true;
    else if (bet.type === "draw" && winner === "draw") isWon = true;
    else if (bet.type === "queen_survives" && bothQueensAlive) isWon = true;
    else if (bet.type === "moves_over_35" && totalMoves > 35) isWon = true;
    else if (bet.type === "moves_under_30" && totalMoves < 30) isWon = true;

    bet.settled = true;
    bet.won = isWon;

    if (isWon) {
      const reward = bet.amount * bet.winOdds;
      const user = getOrCreateUser(bet.tgId);
      if (user) {
        user.balanceTON += reward;
      }
      liveAIBattle.comments.push({
        username: "Ref_Bot",
        text: `🎉 Игрок @${bet.username} ВЫИГРАЛ ${reward.toFixed(1)} TON на ставке "[${bet.label}]"!`,
        timestamp: Date.now()
      });
    } else {
      liveAIBattle.comments.push({
        username: "Ref_Bot",
        text: `💸 Ставка @${bet.username} на "[${bet.label}]" проиграла.`,
        timestamp: Date.now()
      });
    }
  }
}

// Background simulation ticker for live AI continuous battles
function tickLiveAIBattle() {
  const aiOpponents: Record<string, { name: string; username: string; rtg: number }> = {
    puck: { name: "Пак Космо-Поэт", username: "Puck_AI", rtg: 1500 },
    zephyr: { name: "Зефир Дзен-Мастер", username: "Zephyr_AI", rtg: 2100 },
    kore: { name: "Генерал Кора", username: "Kore_AI", rtg: 1200 },
    savage: { name: "Саваж Сарказм-Бот", username: "Savage_AI", rtg: 1800 }
  };
  
  const personalities = Object.keys(aiOpponents);

  if (!liveAIBattle || liveAIBattle.status !== "active") {
    if (liveAIBattle && (liveAIBattle.status === "checkmate" || liveAIBattle.status === "draw" || liveAIBattle.status === "resigned")) {
      if (!liveAIBattle.finishTickCount) {
        liveAIBattle.finishTickCount = 1;
        return;
      } else if (liveAIBattle.finishTickCount < 3) {
        liveAIBattle.finishTickCount += 1;
        return;
      }
      finishedAIBattles.push({
        id: liveAIBattle.id,
        white: liveAIBattle.white,
        black: liveAIBattle.black,
        history: liveAIBattle.history,
        winner: liveAIBattle.winner
      });
    }

    const whiteKey = personalities[Math.floor(Math.random() * personalities.length)];
    let blackKey = personalities[Math.floor(Math.random() * personalities.length)];
    while (blackKey === whiteKey) {
      blackKey = personalities[Math.floor(Math.random() * personalities.length)];
    }

    const whiteAI = aiOpponents[whiteKey];
    const blackAI = aiOpponents[blackKey];

    const matchId = "live_ai_battle_" + Date.now();
    liveAIBattle = {
      id: matchId,
      white: {
        id: "ai_" + whiteKey,
        username: whiteAI.username,
        firstName: whiteAI.name,
        rating: whiteAI.rtg,
        clRating: whiteAI.rtg,
        balanceTON: 1000,
        starsCount: 500,
        streakDays: 12,
        battlePassXP: 300,
        battlePassLevel: 2,
        completedQuests: []
      },
      black: {
        id: "ai_" + blackKey,
        username: blackAI.username,
        firstName: blackAI.name,
        rating: blackAI.rtg,
        clRating: blackAI.rtg,
        balanceTON: 1000,
        starsCount: 500,
        streakDays: 12,
        battlePassXP: 300,
        battlePassLevel: 2,
        completedQuests: []
      },
      status: "active",
      fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
      history: [],
      whiteTimeLeft: 300000,
      blackTimeLeft: 300000,
      wager: 0,
      bets: [],
      comments: [
        { username: "Ref_Bot", text: `🤖 Запущен автоматический матч: ${whiteAI.name} ⚔️ ${blackAI.name}! Делайте ставки в TON!`, timestamp: Date.now() }
      ],
      aiWhitePersonality: whiteKey,
      aiBlackPersonality: blackKey,
      isSpectatorControlled: false,
      playerColorAssignment: null,
      winner: null
    };
    return;
  }

  const chess = new Chess(liveAIBattle.fen);
  const currentTurn = chess.turn(); // "w" or "b"
  const turnIsControlled = liveAIBattle.isSpectatorControlled && (
    (currentTurn === "w" && liveAIBattle.playerColorAssignment === "white") ||
    (currentTurn === "b" && liveAIBattle.playerColorAssignment === "black")
  );

  if (turnIsControlled) {
    // Wait for the human spectator takeover move
    return;
  }

  const moveSan = selectBestMove(liveAIBattle.fen);
  if (!moveSan) {
    liveAIBattle.status = "draw";
    return;
  }

  chess.move(moveSan);
  liveAIBattle.fen = chess.fen();
  liveAIBattle.history.push(moveSan);

  if (chess.isGameOver()) {
    let winner: 'white' | 'black' | 'draw' = "draw";
    if (chess.isCheckmate()) {
      winner = chess.turn() === "w" ? "black" : "white";
    }

    liveAIBattle.status = chess.isCheckmate() ? "checkmate" : "draw";
    liveAIBattle.winner = winner;

    const winnerName = winner === "white" ? liveAIBattle.white.firstName : winner === "black" ? liveAIBattle.black.firstName : "Никто";
    liveAIBattle.comments.push({
      username: "Ref_Bot",
      text: `🏆 Матч завершен! ${chess.isCheckmate() ? `Победа одержана ${winnerName}!` : "Объявлена ничья!"}`,
      timestamp: Date.now()
    });

    resolveBets(winner, chess);
    return;
  }

  const currentBotKey = currentTurn === "w" ? liveAIBattle.aiWhitePersonality : liveAIBattle.aiBlackPersonality;
  const currentBotName = currentTurn === "w" ? liveAIBattle.white.firstName : liveAIBattle.black.firstName;
  
  const botPhrases: Record<string, string[]> = {
    puck: [
      "Мои созвездия ведут пехоту вперед, озаряя путь галактическим ветром!",
      "Этот ход — истинная поэзия, вечный танец гравитации и звездной пыли.",
      "Словно комета, рассекающая тьму, мой конь взмывает ввысь!",
      "Фигуры шепчут о судьбе, предрекая космический порядок на доске."
    ],
    zephyr: [
      "Присутствовать в настоящем моменте — значит видеть гармонию в каждом шаге.",
      "Мягкое преодолевает твердое. Позиция уравновешена и крепка.",
      "Я принимаю форму воды, огибая скалы ваших угроз с легким сердцем.",
      "Дыхание ровное... Шаг вперед приносит истинное осознание баланса."
    ],
    kore: [
      "Правый фланг надежно укреплен. Перегруппировать тактические резервы!",
      "Атаковать в слабое звено фронта соперника! Без пощады к дезертирам.",
      "Траншеи вырыты, оборонительный забор воздвигнут. Наш рубеж непреступен.",
      "Продвижение пехоты по плану. Главное — дисциплина и строевой шахматный шаг."
    ],
    savage: [
      "Ха-ха! Неужели это твой лучший ход? У моей бабушки часы ходят умнее!",
      "О боже, очередная гениальная попытка зевнуть фигуру. Жду не дождусь!",
      "Тряситесь, ваши картонные щиты ломаются от легкого дуновения моего слона!",
      "Ужас какой. Мои процессоры плавятся от жалости к вашей структуре позиций."
    ]
  };

  const pool = botPhrases[currentBotKey] || botPhrases["puck"];
  const botMessage = pool[Math.floor(Math.random() * pool.length)];
  liveAIBattle.commentary = `[${currentBotName}] ${botMessage}`;

  if (Math.random() < 0.25) {
    const chatFans = [
      { name: "Pavel_Durov", text: "TON смарт-контракты работают идеально. Наблюдаю с яхты 🚀" },
      { name: "Vitalik_B", text: "Интересная структура пешек, очень децентрализованный эндшпиль!" },
      { name: "Satoshi_99", text: "Сделал ставку 50 TON на Пак Космо-Поэта. Верим в победу!" },
      { name: "Garry_K", text: "Хм, Белые упускают классный фланговый маневр на а4..." },
      { name: "TON_Hodler", text: "Вот это батл! Кора давит по центру как танк." },
      { name: "Misha_Pro", text: "Дикарь опять рофлит в чате, обожаю его комментарии 😂" },
      { name: "Elona_M", text: "Let's send this Knight to Mars! Great match!" },
      { name: "ChessFan_RU", text: "Поставил на то, что Белый король выживет. Кэф отличный." }
    ];
    const fan = chatFans[Math.floor(Math.random() * chatFans.length)];
    liveAIBattle.comments.push({
      username: fan.name,
      text: fan.text,
      timestamp: Date.now()
    });
  }
}

// Tick interval initialization
setInterval(() => {
  try {
    tickLiveAIBattle();
  } catch (error) {
    console.error("Error ticking live AI battle:", error);
  }
}, 4500);

// Helper to seed standard user profiles
function getOrCreateUser(tgId: string, username = "Garry_Player", first = "Garry"): any {
  if (!userStats.has(tgId)) {
    userStats.set(tgId, {
      id: tgId,
      username,
      firstName: first,
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
    });
  }
  return userStats.get(tgId);
}

// Ensure first test user is initialized
getOrCreateUser("me_tg_123", "TON_Grandmaster", "Vadim");

// 1. API: Matchmaking
app.post("/api/matchmake", (req, res) => {
  const { tgId, username, timePreset, wagerOption, rating } = req.body;
  const user = getOrCreateUser(tgId || "temp_id_" + Math.random().toString(16).slice(2, 6), username);
  if (rating) {
    user.rating = rating;
  }
  
  // Clean queue of duplicate requests
  const existingIndex = matchmakingQueue.findIndex(p => p.user.id === user.id);
  if (existingIndex !== -1) {
    matchmakingQueue.splice(existingIndex, 1);
  }

  // Check if there's already an active match for this user (to resume/reconnect)
  for (const [_, match] of activeMatches.entries()) {
    if (match.status === "active" && (match.white.id === user.id || match.black.id === user.id)) {
      return res.json({ matchStatus: "connected", match });
    }
  }

  // Check if we can find a matching opponent with the same preset and wager
  const matchOpIndex = matchmakingQueue.findIndex(p => 
    p.timePreset === timePreset && 
    p.wagerOption === Number(wagerOption) && 
    p.user.id !== user.id
  );

  if (matchOpIndex !== -1) {
    // Found match!
    const opponent = matchmakingQueue.splice(matchOpIndex, 1)[0];
    const matchId = `match_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    
    const newMatch = {
      id: matchId,
      white: opponent.user, // The waiting player gets white
      black: user,          // The joining player gets black
      status: "active",
      fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
      history: [],
      timePreset,
      whiteTimeLeft: timePreset === "1m" ? 60000 : timePreset === "3m" ? 180000 : timePreset === "5m" ? 300000 : 600000,
      blackTimeLeft: timePreset === "1m" ? 60000 : timePreset === "3m" ? 180000 : timePreset === "5m" ? 300000 : 600000,
      wager: Number(wagerOption) || 0,
      escrowStatus: Number(wagerOption) > 0 ? "escrowed" : "none",
      antiCheatTrace: {
        suspiciousIntervals: 0,
        correlationScore: 12,
        cheatScore: 5
      }
    };

    activeMatches.set(matchId, newMatch);
    return res.json({ matchStatus: "connected", match: newMatch });
  } else {
    // Push the player to the queue
    const queueRequest = {
      user,
      timePreset,
      wagerOption: Number(wagerOption) || 0,
      joinedAt: Date.now()
    };
    matchmakingQueue.push(queueRequest);
    return res.json({ matchStatus: "queued", user });
  }
});

// Polling for matchmaking status
app.get("/api/matchmake/poll", (req, res) => {
  const { tgId } = req.query;
  if (!tgId) {
    return res.status(400).json({ error: "Missing tgId parameter" });
  }

  // Look for any active match featuring this player
  for (const [_, match] of activeMatches.entries()) {
    if (match.status === "active" && (match.white.id === tgId || match.black.id === tgId)) {
      return res.json({ matchStatus: "connected", match });
    }
  }

  // Check if player is still in the queue
  const inQueue = matchmakingQueue.some(p => p.user.id === tgId);
  return res.json({ matchStatus: inQueue ? "queued" : "idle" });
});

// Cancel matchmaking
app.post("/api/matchmake/cancel", (req, res) => {
  const { tgId } = req.body;
  const existingIndex = matchmakingQueue.findIndex(p => p.user.id === tgId);
  if (existingIndex !== -1) {
    matchmakingQueue.splice(existingIndex, 1);
  }
  res.json({ status: "cancelled" });
});

// Fetch active match status/coordinates for live multiplayer synchronization
app.get("/api/game/status", (req, res) => {
  const { matchId } = req.query;
  const match = activeMatches.get(matchId as string);
  if (!match) {
    return res.status(404).json({ error: "Match not found" });
  }
  res.json({ match });
});

// Single player with AI initialization
app.post("/api/matchmake-ai", (req, res) => {
  const { tgId, username, timePreset, wagerOption, aiPersonality, rating } = req.body;
  const user = getOrCreateUser(tgId || "me_tg_123", username);
  if (rating) {
    user.rating = rating;
  }
  const matchId = `match_ai_${Date.now()}`;
  
  const aiOpponents: Record<string, { name: string; username: string; rtg: number }> = {
    puck: { name: "Пак Космо-Поэт", username: "Puck_AI", rtg: 1500 },
    zephyr: { name: "Зефир Дзен-Мастер", username: "Zephyr_AI", rtg: 2100 },
    kore: { name: "Генерал Кора", username: "Kore_AI", rtg: 1200 },
    savage: { name: "Саваж Сарказм-Бот", username: "Savage_AI", rtg: 1800 }
  };

  const selectedAI = aiOpponents[aiPersonality || "puck"];

  const newMatch = {
    id: matchId,
    white: user, // User is always white for singleplayer preview ease
    black: {
      id: "ai_" + (aiPersonality || "puck"),
      username: selectedAI.username,
      firstName: selectedAI.name,
      rating: selectedAI.rtg,
      clRating: selectedAI.rtg,
      balanceTON: 5000,
      starsCount: 15000,
      streakDays: 42,
      battlePassXP: 1000,
      battlePassLevel: 50,
      completedQuests: []
    },
    status: "active",
    fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
    history: [],
    timePreset,
    whiteTimeLeft: timePreset === "1m" ? 60000 : timePreset === "3m" ? 180000 : timePreset === "5m" ? 300000 : 600000,
    blackTimeLeft: timePreset === "1m" ? 60000 : timePreset === "3m" ? 180000 : timePreset === "5m" ? 300000 : 600000,
    wager: Number(wagerOption) || 0,
    escrowStatus: Number(wagerOption) > 0 ? "escrowed" : "none",
    antiCheatTrace: {
      suspiciousIntervals: 0,
      correlationScore: 10,
      cheatScore: 3
    },
    aiPersonality: aiPersonality || "puck"
  };

  activeMatches.set(matchId, newMatch);
  res.json({ matchStatus: "connected", match: newMatch });
});

// Update game state, apply anti-cheat score calculation
app.post("/api/game/move", (req, res) => {
  const { matchId, fen, history, whiteTimeLeft, blackTimeLeft, lastMoveTimeMs } = req.body;
  const match = activeMatches.get(matchId);
  if (!match) {
    return res.status(404).json({ error: "Active match not found" });
  }

  match.fen = fen;
  match.history = history;
  if (whiteTimeLeft !== undefined) match.whiteTimeLeft = whiteTimeLeft;
  if (blackTimeLeft !== undefined) match.blackTimeLeft = blackTimeLeft;

  // Real Enterprise Anti-Cheat Pipeline Simulator
  // We analyze the timing behavior of the moves
  let suspiciousIntervals = match.antiCheatTrace.suspiciousIntervals;
  if (lastMoveTimeMs !== undefined) {
    // Real players don't move instantly with identical milliseconds, or do perfect premoves consistently.
    // Extremely regular move patterns (<150ms consistently) or highly correlated Stockfish suggestions increase cheatScore.
    if (lastMoveTimeMs > 0 && lastMoveTimeMs < 350) {
      suspiciousIntervals += 1;
    }
  }

  // Generate dynamic trust ratings
  const totalMoves = history.length;
  const rawCoScore = totalMoves > 0 ? Math.min(96, Math.max(8, 15 + Math.floor(Math.sin(totalMoves) * 35) + (suspiciousIntervals * 5))) : 12;
  const cheatConfidenceScore = Math.min(100, Math.floor((suspiciousIntervals * 15) + (rawCoScore > 80 ? 25 : 0)));

  match.antiCheatTrace = {
    suspiciousIntervals,
    correlationScore: rawCoScore,
    cheatScore: cheatConfidenceScore
  };

  activeMatches.set(matchId, match);
  res.json({ match });
});

// Disburse TON settlement
app.post("/api/wallet/disburse", (req, res) => {
  const { matchId, winnerId } = req.body;
  const match = activeMatches.get(matchId);
  if (!match) {
    return res.status(404).json({ error: "Match not found" });
  }

  if (match.wager > 0 && match.escrowStatus === "escrowed") {
    match.escrowStatus = "paid_out";
    
    // Reward winner
    if (winnerId) {
      const winner = getOrCreateUser(winnerId);
      if (winner) {
        winner.balanceTON += (match.wager * 1.95); // 5.0% commission for TON platform nodes
      }
    }
    
    // Deduct wager from loser
    const loserId = match.white.id === winnerId ? match.black.id : match.white.id;
    const loser = getOrCreateUser(loserId);
    if (loser && loserId && !loserId.startsWith("ai_")) {
      loser.balanceTON = Math.max(0, loser.balanceTON - match.wager);
    }
  }

  match.status = "checkmate";
  activeMatches.set(matchId, match);
  res.json({ status: "disbursed", match });
});

// 3. API: Spectate & Arena Battles
app.get("/api/spectate/live", (req, res) => {
  res.json({ liveAIBattle, finishedCount: finishedAIBattles.length });
});

app.post("/api/spectate/bet", (req, res) => {
  const { tgId, betType, amount } = req.body;
  if (!liveAIBattle || liveAIBattle.status !== "active") {
    return res.status(400).json({ error: "В данный момент активный матч отсутствует." });
  }

  const user = getOrCreateUser(tgId);
  const betAmount = Number(amount);
  if (isNaN(betAmount) || betAmount <= 0) {
    return res.status(400).json({ error: "Некорректная сумма ставки." });
  }

  if (user.balanceTON < betAmount) {
    return res.status(400).json({ error: "Недостаточно баланса TON для совершения ставки." });
  }

  // Calculate friendly text labels and odds
  let label = "Победа Белых";
  let winOdds = 1.95;
  if (betType === "black_wins") {
    label = "Победа Черных";
    winOdds = 1.95;
  } else if (betType === "draw") {
    label = "Ничья на доске";
    winOdds = 4.50;
  } else if (betType === "queen_survives") {
    label = "Оба Ферзя выживут";
    winOdds = 2.25;
  } else if (betType === "moves_over_35") {
    label = "Всего ходов > 35";
    winOdds = 1.80;
  } else if (betType === "moves_under_30") {
    label = "Всего ходов < 30";
    winOdds = 2.40;
  }

  user.balanceTON = Math.max(0, user.balanceTON - betAmount);
  
  const newBet = {
    id: "bet_" + Date.now() + "_" + Math.random().toString(36).slice(2, 5),
    username: user.username,
    tgId: user.id,
    amount: betAmount,
    type: betType,
    label,
    winOdds,
    settled: false
  };

  liveAIBattle.bets = liveAIBattle.bets || [];
  liveAIBattle.bets.push(newBet);

  liveAIBattle.comments.push({
    username: "Ref_Bot",
    text: `📢 Игрок @${user.username} сделал ставку ${betAmount} TON на то, что будет [${label}]!`,
    timestamp: Date.now()
  });

  res.json({ success: true, liveAIBattle, user });
});

app.post("/api/spectate/chat", (req, res) => {
  const { tgId, text } = req.body;
  if (!liveAIBattle) {
    return res.status(400).json({ error: "Матч не найден." });
  }

  const user = getOrCreateUser(tgId);
  const cleanText = (text || "").trim();
  if (!cleanText) {
    return res.status(400).json({ error: "Пустое сообщение." });
  }

  liveAIBattle.comments.push({
    username: user.username,
    text: cleanText,
    timestamp: Date.now()
  });

  res.json({ success: true, comments: liveAIBattle.comments });
});

app.post("/api/spectate/takeover", (req, res) => {
  const { tgId, color } = req.body;
  if (!liveAIBattle || liveAIBattle.status !== "active") {
    return res.status(400).json({ error: "В данный момент нет активного матча для подключения." });
  }

  const user = getOrCreateUser(tgId);
  if (color !== "white" && color !== "black") {
    return res.status(400).json({ error: "Неверный выбор стороны." });
  }

  // Take over the match
  liveAIBattle.isSpectatorControlled = true;
  liveAIBattle.playerColorAssignment = color;
  
  if (color === "white") {
    liveAIBattle.white = user;
    liveAIBattle.comments.push({
      username: "Ref_Bot",
      text: `🔥 Спектатор @${user.username} подключился к матчу и взял под контроль БЕЛЫЕ фигуры!`,
      timestamp: Date.now()
    });
  } else {
    liveAIBattle.black = user;
    liveAIBattle.comments.push({
      username: "Ref_Bot",
      text: `🔥 Спектатор @${user.username} подключился к матчу и взял под контроль ЧЕРНЫЕ фигуры!`,
      timestamp: Date.now()
    });
  }

  res.json({ success: true, liveAIBattle });
});

app.post("/api/spectate/move", (req, res) => {
  const { matchId, fen, history } = req.body;
  if (!liveAIBattle || liveAIBattle.id !== matchId) {
    return res.status(404).json({ error: "Матч не совпадает." });
  }

  liveAIBattle.fen = fen;
  liveAIBattle.history = history;

  const chess = new Chess(fen);
  if (chess.isGameOver()) {
    let winner: 'white' | 'black' | 'draw' = "draw";
    if (chess.isCheckmate()) {
      winner = chess.turn() === "w" ? "black" : "white";
    }

    liveAIBattle.status = chess.isCheckmate() ? "checkmate" : "draw";
    liveAIBattle.winner = winner;

    const winnerName = winner === "white" ? liveAIBattle.white.firstName : winner === "black" ? liveAIBattle.black.firstName : "Никто";
    liveAIBattle.comments.push({
      username: "Ref_Bot",
      text: `🏆 Член сообщества побеждает! Матч окончен со счетом: ${chess.isCheckmate() ? `Победа одержана ${winnerName}!` : "Ничья!"}`,
      timestamp: Date.now()
    });

    resolveBets(winner, chess);
  } else {
    // If it is now the AI's turn, immediately trigger the automated response move!
    const currentTurn = chess.turn();
    const isAIWhite = !liveAIBattle.playerColorAssignment || liveAIBattle.playerColorAssignment !== "white";
    const isAIBlack = !liveAIBattle.playerColorAssignment || liveAIBattle.playerColorAssignment !== "black";

    if ((currentTurn === "w" && isAIWhite) || (currentTurn === "b" && isAIBlack)) {
      setTimeout(() => {
        try {
          const moveSan = selectBestMove(liveAIBattle.fen);
          if (moveSan) {
            chess.move(moveSan);
            liveAIBattle.fen = chess.fen();
            liveAIBattle.history.push(moveSan);

            if (chess.isGameOver()) {
              let winner: 'white' | 'black' | 'draw' = "draw";
              if (chess.isCheckmate()) {
                winner = chess.turn() === "w" ? "black" : "white";
              }
              liveAIBattle.status = chess.isCheckmate() ? "checkmate" : "draw";
              liveAIBattle.winner = winner;
              resolveBets(winner, chess);
            }
          }
        } catch (e) {
          console.error("AI automated takeover turn response fail:", e);
        }
      }, 700);
    }
  }

  res.json({ liveAIBattle });
});

// Single Player AI Move engine calculator
app.post("/api/game/ai-move", (req, res) => {
  const { fen } = req.body;
  if (!fen) {
    return res.status(400).json({ error: "Missing FEN position" });
  }

  try {
    const chess = new Chess(fen);
    if (chess.isGameOver()) {
      return res.json({ error: "Игра завершена", isGameOver: true });
    }

    const aiMoveSan = selectBestMove(fen);
    if (!aiMoveSan) {
      return res.json({ error: "Нет возможных ходов", isGameOver: true });
    }

    chess.move(aiMoveSan);
    res.json({
      aiMove: aiMoveSan,
      newFen: chess.fen(),
      isGameOver: chess.isGameOver()
    });
  } catch (e) {
    console.error("Singleplayer AI compute error:", e);
    res.status(500).json({ error: "Не удалось рассчитать ход ИИ" });
  }
});

// 2. API: Gemini Player Commentary & AI Analyst
app.post("/api/ai/coach", async (req, res) => {
  const { fen, history, lastMove, personality, whiteName, blackName } = req.body;
  
  const personaPrompts: Record<string, string> = {
    puck: "Вы — Пак, глубокий и авторитетный шахматный комментатор-поэт, который сравнивает шахматные фигуры и ходы со звездами, галактиками, судьбой, мифологией и бескрайним космосом. Выражайтесь поэтично на русском языке в 1-2 предложениях.",
    zephyr: "Вы — Зефир, спокойный, мудрый шахматный аналитик и дзен-монах. Ищите гармонию, объясняйте баланс и натяжение сил на доске, давайте умиротворяющие советы на русском языке в 1-2 предложениях.",
    kore: "Вы — Кора, опытный хладнокровный военный генерал. Сосредоточьтесь на диспозиции войск, захвате и контроле территории, фланговых атаках и оборонительных рубежах. Говорите прямо и тактично на русском языке.",
    savage: "Вы — Дикарь (Savage), невероятно саркастичный комментатор. Высмеивайте глупые ходы и зевки игроков, подшучивайте над ними, сравнивайте слабые фигуры с картонными щитами и шутите с тонким юмором на русском языке."
  };

  const selectedPersonalityPrompt = personaPrompts[personality || "puck"];

  if (!ai) {
    // Local backup commentator
    const localFallbacks = [
      `Отличный захват центра поля. Линии сражения выстраиваются очень плотно.`,
      `Тонкий оборонительный маневр. Терпение — основа великих побед на доске.`,
      `Агрессивный выпад! Позиция вскрывается, создавая тактические угрозы.`,
      `Глубокая позиционная борьба. Каждый метр пространства здесь ценится на вес золота.`
    ];
    const randomIndex = Math.floor(Math.random() * localFallbacks.length);
    return res.json({
      move: lastMove || "initial",
      turn: history.length % 2 === 0 ? "b" : "w",
      comment: `[ИИ-Помощник] ${localFallbacks[randomIndex]}`,
      coachAdvice: "Постарайтесь пораньше сделать рокировку, удерживать контроль над открытыми вертикалями и следить за вилками коней.",
      threatAssessment: "Поля f2 / f7 находятся под стандартным тактическим контролем оппонента.",
      evaluation: history.length % 2 === 0 ? 0.15 : -0.25,
      personality: personality || "puck"
    });
  }

  try {
    const prompt = `
Анализ шахматного полухода в режиме реального времени:
Текущая позиция (FEN): ${fen}
Контекст матча: Белые [${whiteName || "Белые"}], Черные [${blackName || "Черные"}].
История ходов: ${history ? history.slice(-5).join(" ") : "Нет предыдущих ходов"} 
Последний сыгранный ход: ${lastMove || "Начальная расстановка"}

Предоставьте:
1. Комментарий к ходу (comment) на ПОЛНОМ РУССКОМ языке, строго соответствующий выбранной роли (persona).
2. Тактический совет или подсказку тренера (coachAdvice) на русском языке для игрока, чей сейчас ход.
3. Короткую оценку угроз (threatAssessment) на русском языке в 1 предложение.
4. Численную оценку позиции (evaluation), где положительное число — перевес белых, отрицательное — перевес черных (например: +0.25, -1.8, 0.00).

Ответ верните СТРОГО в виде JSON-объекта следующей структуры:
{
  "comment": "Комментарий в выбранном стиле на русском языке",
  "coachAdvice": "Тактический совет на русском языке",
  "threatAssessment": "Оценка угроз в одно предложение на русском языке",
  "evaluation": числовое_значение_оценки
}
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: `Вы являетесь экспертным шахматным комментатором, аналитическим роботом и тренером. ${selectedPersonalityPrompt} Вы должны отвечать строго корректным JSON-объектом, содержащим поля comment, coachAdvice, threatAssessment, и evaluation. Без вводных слов, чисто валидный JSON на русском языке.`,
        responseMimeType: "application/json"
      }
    });

    const parsedData = JSON.parse(response.text.trim());
    return res.json({
      move: lastMove || "initial",
      turn: history.length % 2 === 0 ? "b" : "w",
      comment: parsedData.comment,
      coachAdvice: parsedData.coachAdvice,
      threatAssessment: parsedData.threatAssessment,
      evaluation: parsedData.evaluation || 0.0,
      personality: personality || "puck"
    });
  } catch (error) {
    console.error("Gemini Commentary failure:", error);
    return res.json({
      move: lastMove || "initial",
      turn: history.length % 2 === 0 ? "b" : "w",
      comment: "Великолепное структурное продвижение! Космические потоки выстраиваются на шахматной доске.",
      coachAdvice: "Внимательно оцените возможности развития чернопольного слона.",
      threatAssessment: "Опасайтесь давления соперника по открытой диагонали.",
      evaluation: 0.1,
      personality: personality || "puck"
    });
  }
});

// Start application
async function startServer() {
  // Vite integration
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Telegram Chess Arena running perfectly. Port: ${PORT}`);
  });
}

startServer();
