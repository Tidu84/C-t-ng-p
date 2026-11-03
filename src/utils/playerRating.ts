/**
 * Player Rating & Multi-Axis Tactical Mastery System (Hồ Sơ Kỳ Lực 5 Trục)
 * Tracks:
 * 1. Elo Thực Chiến & Chuỗi Thắng theo từng cấp độ AI (Người thường / Ham chơi / Lão quái)
 * 2. Bậc Thầy Sát Cục theo từng binh chủng (Xe, Pháo, Mã, Tốt, Sĩ, Tượng, Lật nắp chiếu bí)
 * 3. Chỉ Số "Quẫy" & Lật Kèo Khi Lâm Thế Bí (Clutch / Comeback / Escape under check)
 * 4. Chỉ Số Nhân Phẩm Mở Nắp (Lucky Reveal Index)
 * 5. Chỉ Số Phong Cách 3 Trục (Sát Khí - Thủ Thành - Quái Chiêu)
 */

import { AiDifficulty, Move, Piece, PieceRole } from '../types';
import { PIECE_VALUES } from './aiEngine';
import { loadOpponentProfile } from './adaptiveLearning';

export interface DifficultyRecord {
  wins: number;
  losses: number;
  draws: number;
}

export interface PlayerRatingData {
  elo: number;
  peakElo: number;
  lastEloDelta: number;
  lastMatchHighlights: string[];
  currentStreak: number;
  bestStreak: number;
  vsDifficulty: Record<AiDifficulty, DifficultyRecord>;
  checkmateByRole: Record<PieceRole, number>;
  revealCheckmates: number; // Lật nắp chiếu cục tức thì
  clutchStats: {
    escapedChecksTotal: number;
    comebackWins: number;      // Thắng ngược sau khi kém >= 450 điểm quân lực
    grittySurvivals: number;   // Bị chiếu >= 3 lần hoặc kém quân nặng nhưng vẫn kéo >= 25 nước và có điểm (thắng/hòa)
    longestWinMoves: number;
    fastestWinMoves: number;
  };
  luckStats: {
    totalUncovers: number;
    majorUncovers: number;     // Mở ra Xe, Pháo, Mã
    minorUncovers: number;     // Mở ra Tốt, Sĩ, Tượng
    chariotsUncovered: number; // Số lần bốc trúng Xe
  };
  lastUpdated: number;
}

const RATING_STORAGE_KEY = 'co_up_player_rating_v1';

export const DEFAULT_RATING_DATA: PlayerRatingData = {
  elo: 1200,
  peakElo: 1200,
  lastEloDelta: 0,
  lastMatchHighlights: [],
  currentStreak: 0,
  bestStreak: 0,
  vsDifficulty: {
    easy: { wins: 0, losses: 0, draws: 0 },
    medium: { wins: 0, losses: 0, draws: 0 },
    hard: { wins: 0, losses: 0, draws: 0 },
  },
  checkmateByRole: {
    king: 0,
    chariot: 0,
    cannon: 0,
    horse: 0,
    advisor: 0,
    elephant: 0,
    soldier: 0,
  },
  revealCheckmates: 0,
  clutchStats: {
    escapedChecksTotal: 0,
    comebackWins: 0,
    grittySurvivals: 0,
    longestWinMoves: 0,
    fastestWinMoves: 0,
  },
  luckStats: {
    totalUncovers: 0,
    majorUncovers: 0,
    minorUncovers: 0,
    chariotsUncovered: 0,
  },
  lastUpdated: Date.now(),
};

export function loadPlayerRating(): PlayerRatingData {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return structuredClone(DEFAULT_RATING_DATA);
  }
  try {
    const raw = localStorage.getItem(RATING_STORAGE_KEY);
    if (!raw) return structuredClone(DEFAULT_RATING_DATA);
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_RATING_DATA,
      ...parsed,
      vsDifficulty: {
        easy: { ...DEFAULT_RATING_DATA.vsDifficulty.easy, ...(parsed.vsDifficulty?.easy || {}) },
        medium: { ...DEFAULT_RATING_DATA.vsDifficulty.medium, ...(parsed.vsDifficulty?.medium || {}) },
        hard: { ...DEFAULT_RATING_DATA.vsDifficulty.hard, ...(parsed.vsDifficulty?.hard || {}) },
      },
      checkmateByRole: {
        ...DEFAULT_RATING_DATA.checkmateByRole,
        ...(parsed.checkmateByRole || {}),
      },
      clutchStats: {
        ...DEFAULT_RATING_DATA.clutchStats,
        ...(parsed.clutchStats || {}),
      },
      luckStats: {
        ...DEFAULT_RATING_DATA.luckStats,
        ...(parsed.luckStats || {}),
      },
    };
  } catch {
    return structuredClone(DEFAULT_RATING_DATA);
  }
}

export function savePlayerRating(data: PlayerRatingData): void {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(RATING_STORAGE_KEY, JSON.stringify(data));
  } catch {}
}

function computeRedMaterialAdvantage(board: (Piece | null)[][]): number {
  let redScore = 0;
  let blackScore = 0;
  for (let y = 0; y < board.length; y++) {
    for (let x = 0; x < (board[y]?.length || 0); x++) {
      const p = board[y][x];
      if (!p || p.trueRole === 'king') continue;
      const val = p.isCovered ? 260 : PIECE_VALUES[p.trueRole] || 200;
      if (p.color === 'red') redScore += val;
      else blackScore += val;
    }
  }
  return redScore - blackScore;
}

export function recordMatchIntoPlayerRating(
  result: 'win' | 'loss' | 'draw',
  difficulty: AiDifficulty,
  moveHistory: Move[],
  snapshots: { board: (Piece | null)[][] }[] = []
): PlayerRatingData {
  const data = loadPlayerRating();
  const highlights: string[] = [];

  const rec = data.vsDifficulty[difficulty] || { wins: 0, losses: 0, draws: 0 };
  if (result === 'win') rec.wins += 1;
  else if (result === 'loss') rec.losses += 1;
  else rec.draws += 1;
  data.vsDifficulty[difficulty] = rec;

  const baseDelta =
    difficulty === 'hard'
      ? { win: 38, loss: -10, draw: 12 }
      : difficulty === 'medium'
      ? { win: 24, loss: -14, draw: 4 }
      : { win: 12, loss: -18, draw: -2 };

  let delta = baseDelta[result];

  if (result === 'win') {
    data.currentStreak += 1;
    if (data.currentStreak > data.bestStreak) {
      data.bestStreak = data.currentStreak;
    }
    if (data.currentStreak >= 3) {
      delta += Math.min(12, (data.currentStreak - 2) * 3);
      highlights.push(`🔥 Chuỗi thắng ${data.currentStreak} ván liên tiếp (+${Math.min(12, (data.currentStreak - 2) * 3)} điểm thưởng)`);
    }
  } else if (result === 'loss') {
    data.currentStreak = 0;
  }

  let redTimesChecked = 0;
  let worstRedDeficit = 0;

  for (let i = 0; i < moveHistory.length; i++) {
    const m = moveHistory[i];
    if (!m) continue;

    if (m.piece.color === 'red' && m.wasCovered) {
      data.luckStats.totalUncovers += 1;
      const role = m.piece.trueRole;
      if (role === 'chariot' || role === 'cannon' || role === 'horse') {
        data.luckStats.majorUncovers += 1;
        if (role === 'chariot') data.luckStats.chariotsUncovered += 1;
      } else {
        data.luckStats.minorUncovers += 1;
      }
    }

    if (m.piece.color === 'black' && m.isCheck) {
      redTimesChecked += 1;
    }
  }

  for (const snap of snapshots) {
    if (!snap?.board) continue;
    const diff = computeRedMaterialAdvantage(snap.board);
    if (diff < worstRedDeficit) {
      worstRedDeficit = diff;
    }
  }

  const escapedInMatch =
    result === 'loss' ? Math.max(0, redTimesChecked - 1) : redTimesChecked;
  data.clutchStats.escapedChecksTotal += escapedInMatch;

  const totalPlies = moveHistory.length;
  const fullTurns = Math.max(1, Math.ceil(totalPlies / 2));

  if (result === 'win' && (worstRedDeficit <= -420 || redTimesChecked >= 3)) {
    data.clutchStats.comebackWins += 1;
    delta += 10;
    highlights.push('⚡ Vua Lật Kèo: Thắng ngược dòng ngoạn mục từ thế hiểm (+10 Kỳ lực)');
  }

  if ((result === 'win' || result === 'draw') && (redTimesChecked >= 3 || worstRedDeficit <= -420) && fullTurns >= 22) {
    data.clutchStats.grittySurvivals += 1;
    highlights.push(`🛡️ Siêu Quẫy Thế Bí: Hóa giải ${redTimesChecked} đòn chiếu trong ${fullTurns} hiệp`);
  }

  if (result === 'win' && moveHistory.length > 0) {
    const finalMove = moveHistory[moveHistory.length - 1];
    if (finalMove && finalMove.piece.color === 'red') {
      const finishRole = finalMove.piece.trueRole;
      data.checkmateByRole[finishRole] = (data.checkmateByRole[finishRole] || 0) + 1;

      if (finalMove.wasCovered) {
        data.revealCheckmates += 1;
        delta += 8;
        highlights.push('🎲 Lật Nắp Đoạt Mạng: Mở nắp úp chiếu cục tức thì (+8 Kỳ lực)');
      } else if (finishRole === 'soldier') {
        delta += 6;
        highlights.push('♟️ Tốt Hóa Rồng: Dùng Tốt kết liễu Tướng địch (+6 Kỳ lực)');
      } else if (finishRole === 'advisor' || finishRole === 'elephant') {
        delta += 8;
        highlights.push('🗡️ Kỳ Binh Qua Sông: Dùng Sĩ/Tượng kết liễu đối phương (+8 Kỳ lực)');
      }
    }

    if (fullTurns > data.clutchStats.longestWinMoves) {
      data.clutchStats.longestWinMoves = fullTurns;
    }
    if (data.clutchStats.fastestWinMoves === 0 || fullTurns < data.clutchStats.fastestWinMoves) {
      data.clutchStats.fastestWinMoves = fullTurns;
    }
    if (fullTurns <= 15) {
      highlights.push(`⚔️ Tốc Chiến Tốc Thắng: Hạ gục đối thủ chỉ trong ${fullTurns} hiệp`);
    }
  }

  data.elo = Math.max(800, data.elo + delta);
  if (data.elo > data.peakElo) {
    data.peakElo = data.elo;
  }
  data.lastEloDelta = delta;
  data.lastMatchHighlights = highlights;
  data.lastUpdated = Date.now();

  savePlayerRating(data);
  return data;
}

export function getDerivedPlayerMetrics(rating: PlayerRatingData) {
  const profile = loadOpponentProfile();

  const totalMatches =
    rating.vsDifficulty.easy.wins +
    rating.vsDifficulty.easy.losses +
    rating.vsDifficulty.easy.draws +
    rating.vsDifficulty.medium.wins +
    rating.vsDifficulty.medium.losses +
    rating.vsDifficulty.medium.draws +
    rating.vsDifficulty.hard.wins +
    rating.vsDifficulty.hard.losses +
    rating.vsDifficulty.hard.draws;

  const rawClutch =
    45 +
    rating.clutchStats.comebackWins * 12 +
    rating.clutchStats.grittySurvivals * 9 +
    Math.min(30, rating.clutchStats.escapedChecksTotal * 2);
  const clutchScore = totalMatches === 0 ? 50 : Math.min(100, Math.max(20, rawClutch));

  const clutchTitle =
    clutchScore >= 85
      ? 'Vua Lật Kèo Phút 90'
      : clutchScore >= 70
      ? 'Mình Đồng Da Sắt'
      : clutchScore >= 55
      ? 'Trầm Ổn Hóa Giải'
      : 'Đang Rèn Bản Lĩnh';

  const luckRate =
    rating.luckStats.totalUncovers > 0
      ? Math.round((rating.luckStats.majorUncovers / rating.luckStats.totalUncovers) * 100)
      : 40;

  const luckTitle =
    luckRate >= 50
      ? 'Bàn Tay Vàng Đại Hồng Thủy'
      : luckRate >= 38
      ? 'Nhân Phẩm Chuẩn Thực Chiến'
      : 'Thánh Nhọ Bốc Tốt & Sĩ';

  const roleEntries: { role: PieceRole; label: string; icon: string; count: number }[] = [
    { role: 'chariot', label: 'Thiết Xa Sát (Xe)', icon: '🛞', count: rating.checkmateByRole.chariot || 0 },
    { role: 'cannon', label: 'Thần Pháo (Pháo)', icon: '💣', count: rating.checkmateByRole.cannon || 0 },
    { role: 'horse', label: 'Quất Mã (Mã)', icon: '🐎', count: rating.checkmateByRole.horse || 0 },
    { role: 'soldier', label: 'Tốt Hóa Rồng (Tốt)', icon: '♟️', count: rating.checkmateByRole.soldier || 0 },
    {
      role: 'advisor',
      label: 'Kỳ Binh Sĩ/Tượng',
      icon: '🛡️',
      count: (rating.checkmateByRole.advisor || 0) + (rating.checkmateByRole.elephant || 0),
    },
  ];
  const sortedWeapons = [...roleEntries].sort((a, b) => b.count - a.count);
  const topWeapon = sortedWeapons[0]?.count > 0 ? sortedWeapons[0] : null;

  const attackScore = Math.min(
    100,
    Math.max(25, Math.round(profile.avgRiverCrossRate * 140 + profile.avgAggressionRate * 110))
  );
  const defenseScore = Math.min(
    100,
    Math.max(30, Math.round(clutchScore * 0.65 + (1 - profile.avgRiverCrossRate) * 35))
  );
  const distinctWeaponsUsed = roleEntries.filter((r) => r.count > 0).length;
  const trickScore = Math.min(
    100,
    Math.max(
      30,
      40 +
        distinctWeaponsUsed * 10 +
        rating.revealCheckmates * 8 +
        (rating.checkmateByRole.soldier || 0) * 6 +
        (rating.checkmateByRole.advisor || 0) * 10
    )
  );

  return {
    clutchScore,
    clutchTitle,
    luckRate,
    luckTitle,
    roleEntries,
    topWeapon,
    attackScore,
    defenseScore,
    trickScore,
    detectedStyle: profile.detectedStyle,
  };
}
