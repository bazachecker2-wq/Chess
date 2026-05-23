export type GameTimePreset = '1m' | '3m' | '5m' | '10m' | '30m';
export type GameWagerPreset = 0 | 1 | 5 | 10 | 25 | 100; // in TON

export interface UserProfile {
  id: string; // Telegram ID
  username: string;
  firstName: string;
  lastName?: string;
  photoUrl?: string;
  rating: number;
  clRating: number; // Clan rating
  clanId?: string;
  clanName?: string;
  balanceTON: number;
  starsCount: number;
  streakDays: number;
  battlePassXP: number;
  battlePassLevel: number;
  completedQuests: string[];
}

export interface Clan {
  id: string;
  name: string;
  tag: string;
  rating: number;
  membersCount: number;
  trophies: number;
}

export type MatchStatus = 'waiting' | 'matchmaking' | 'active' | 'checkmate' | 'draw' | 'resigned' | 'timeout' | 'aborted';

export interface GameState {
  id: string;
  white: UserProfile;
  black: UserProfile;
  fen: string;
  history: string[]; // LAN/SAN moves
  status: MatchStatus;
  winner?: 'white' | 'black' | 'draw';
  timePreset: GameTimePreset;
  whiteTimeLeft: number; // ms
  blackTimeLeft: number; // ms
  wager: number; // in TON
  escrowStatus: 'none' | 'escrowed' | 'paid_out' | 'refunded' | 'disputed';
  antiCheatTrace: {
    suspiciousIntervals: number;
    correlationScore: number;
    cheatScore: number;
  };
}

export interface AICommentary {
  move: string;
  turn: 'w' | 'b';
  comment: string;
  coachAdvice?: string;
  threatAssessment?: string;
  evaluation?: number; // centipawns or mate in x
  personality?: string;
}

export interface AntiCheatReport {
  moveNumber: number;
  timeDifferenceMs: number;
  engineMatch: boolean;
  behavioralMetric: number;
  suspicionConfidence: number;
}
