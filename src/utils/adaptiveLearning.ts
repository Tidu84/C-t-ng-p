/**
 * Adaptive Learning, Opponent Psychological Profiling & Game Memory Book
 * Combines:
 * 1. Opponent Psychological Counter (Thần Đổ Bác -> Bức Tường Thép, Thành Trì -> Ép Tinh Thần & Phá Thành, Cân Bằng)
 * 2. Game Memory & Forbidden Move Blocker (Sổ tay thế trận & Cắt bỏ nước đi tử huyệt từng thua)
 * 3. Adaptive Opponent Learning & Covered Piece Discipline (Hấp thụ tinh hoa khai cuộc của người chơi & Kỷ luật cờ úp)
 */

import { Move, Piece, PlayerColor } from '../types';
import {
  BOARD_COLS,
  BOARD_ROWS,
  DetailedMove,
  getAllLegalMoves,
  isKingInCheck,
  isSquareDefendedBy,
  simulateMove,
} from './chessRules';
import {
  isCoveredCannonDefendingOrMovingToCenter,
  isCoveredCannonTradingCoveredHorse,
  PIECE_VALUES,
} from './aiEngine';

export type OpponentStyle = 'gambler' | 'turtle' | 'balanced';
export type CounterStrategy = 'iron_wall' | 'pressure_chaos' | 'adaptive_master';

export interface OpponentProfileData {
  gamesPlayed: number;
  playerWins: number;
  aiWins: number;
  draws: number;
  // Cumulative behavioral metrics (exponentially smoothed across games)
  avgEarlyUncoverRate: number;    // 0..1: Tỷ lệ mở nắp trong 10 nước đầu
  avgRiverCrossRate: number;      // 0..1: Tỷ lệ thúc quân qua sông sớm
  avgAggressionRate: number;      // 0..1: Tỷ lệ ăn quân / đôi công
  preferredPawnCols: Record<number, number>; // Tần suất người chơi mở Tốt ở các cột 0, 2, 4, 6, 8
  detectedStyle: OpponentStyle;
  counterStrategy: CounterStrategy;
  evolutionBonusDepth: number;    // Độ sâu cộng thêm khi người chơi đánh thắng máy nhiều
  lastUpdated: number;
}

export interface LearnedBookEntry {
  uciMove: string;       // e.g. 'c6c5'
  wins: number;
  losses: number;
  learnedFromPlayer?: boolean;
  updatedAt: number;
}

export interface AdaptiveMemoryStore {
  // Map of public fog-of-war board hash -> list of forbidden UCI moves that caused AI blunders/losses
  forbiddenMoves: Record<string, string[]>;
  // Map of public fog-of-war board hash -> learned best moves (from AI wins + absorbed player wins)
  openingBook: Record<string, LearnedBookEntry[]>;
}

const PROFILE_STORAGE_KEY = 'co_up_adaptive_opponent_profile_v1';
const MEMORY_STORAGE_KEY = 'co_up_adaptive_memory_book_v1';
const MAX_BOOK_POSITIONS = 180;
const MAX_FORBIDDEN_POSITIONS = 180;

const DEFAULT_PROFILE: OpponentProfileData = {
  gamesPlayed: 0,
  playerWins: 0,
  aiWins: 0,
  draws: 0,
  avgEarlyUncoverRate: 0.5,
  avgRiverCrossRate: 0.25,
  avgAggressionRate: 0.3,
  preferredPawnCols: { 0: 1, 2: 3, 4: 4, 6: 3, 8: 1 },
  detectedStyle: 'balanced',
  counterStrategy: 'adaptive_master',
  evolutionBonusDepth: 0,
  lastUpdated: Date.now(),
};

/**
 * Strict Fog-of-War Board Hash:
 * Encodes ONLY public information (empty squares, covered lids by color, and revealed pieces).
 * Never inspects hidden trueRole of covered pieces.
 */
export function hashPublicBoard(board: (Piece | null)[][], turn: PlayerColor): string {
  const rows: string[] = [];
  for (let y = 0; y < BOARD_ROWS; y++) {
    let rowStr = '';
    let empty = 0;
    for (let x = 0; x < BOARD_COLS; x++) {
      const p = board[y]?.[x];
      if (!p) {
        empty++;
        continue;
      }
      if (empty > 0) {
        rowStr += empty;
        empty = 0;
      }
      if (p.isCovered) {
        rowStr += p.color === 'red' ? 'X' : 'x';
      } else {
        const code =
          p.trueRole === 'king'
            ? 'K'
            : p.trueRole === 'chariot'
            ? 'R'
            : p.trueRole === 'cannon'
            ? 'C'
            : p.trueRole === 'horse'
            ? 'N'
            : p.trueRole === 'advisor'
            ? 'A'
            : p.trueRole === 'elephant'
            ? 'B'
            : 'P';
        rowStr += p.color === 'red' ? code : code.toLowerCase();
      }
    }
    if (empty > 0) rowStr += empty;
    rows.push(rowStr);
  }
  return `${rows.join('/')}_${turn}`;
}

/**
 * Mirror a Red move/position (180 degrees) so AI (playing Black) can absorb Red's winning opening moves!
 */
export function mirrorBoardForBlack(board: (Piece | null)[][]): (Piece | null)[][] {
  const mirrored: (Piece | null)[][] = Array.from({ length: BOARD_ROWS }, () =>
    Array(BOARD_COLS).fill(null)
  );
  for (let y = 0; y < BOARD_ROWS; y++) {
    for (let x = 0; x < BOARD_COLS; x++) {
      const p = board[y]?.[x];
      if (p) {
        mirrored[BOARD_ROWS - 1 - y][BOARD_COLS - 1 - x] = {
          ...p,
          color: p.color === 'red' ? 'black' : 'red',
        };
      }
    }
  }
  return mirrored;
}

export function toUciToken(from: { x: number; y: number }, to: { x: number; y: number }): string {
  return `${String.fromCharCode(97 + from.x)}${9 - from.y}${String.fromCharCode(97 + to.x)}${9 - to.y}`;
}

export function mirrorUciToken(uci: string): string {
  if (uci.length < 4) return uci;
  const fx = uci.charCodeAt(0) - 97;
  const fy = 9 - Number(uci[1]);
  const tx = uci.charCodeAt(2) - 97;
  const ty = 9 - Number(uci[3]);
  return toUciToken(
    { x: BOARD_COLS - 1 - fx, y: BOARD_ROWS - 1 - fy },
    { x: BOARD_COLS - 1 - tx, y: BOARD_ROWS - 1 - ty }
  );
}

export function loadOpponentProfile(): OpponentProfileData {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return { ...DEFAULT_PROFILE };
  }
  try {
    const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_PROFILE };
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_PROFILE,
      ...parsed,
      preferredPawnCols: {
        ...DEFAULT_PROFILE.preferredPawnCols,
        ...(parsed.preferredPawnCols || {}),
      },
    };
  } catch {
    return { ...DEFAULT_PROFILE };
  }
}

export function saveOpponentProfile(profile: OpponentProfileData): void {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
  } catch {}
}

export function loadAdaptiveMemory(): AdaptiveMemoryStore {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return { forbiddenMoves: {}, openingBook: {} };
  }
  try {
    const raw = localStorage.getItem(MEMORY_STORAGE_KEY);
    if (!raw) return { forbiddenMoves: {}, openingBook: {} };
    const parsed = JSON.parse(raw);
    return {
      forbiddenMoves: parsed.forbiddenMoves || {},
      openingBook: parsed.openingBook || {},
    };
  } catch {
    return { forbiddenMoves: {}, openingBook: {} };
  }
}

export function saveAdaptiveMemory(store: AdaptiveMemoryStore): void {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
  try {
    // Keep storage bounded
    const fKeys = Object.keys(store.forbiddenMoves);
    if (fKeys.length > MAX_FORBIDDEN_POSITIONS) {
      for (const k of fKeys.slice(0, fKeys.length - MAX_FORBIDDEN_POSITIONS)) {
        delete store.forbiddenMoves[k];
      }
    }
    const bKeys = Object.keys(store.openingBook);
    if (bKeys.length > MAX_BOOK_POSITIONS) {
      for (const k of bKeys.slice(0, bKeys.length - MAX_BOOK_POSITIONS)) {
        delete store.openingBook[k];
      }
    }
    localStorage.setItem(MEMORY_STORAGE_KEY, JSON.stringify(store));
  } catch {}
}

/**
 * Analyze player's moves in the current game + historical profile to determine:
 * - OpponentStyle: 'gambler' (Thần Đổ Bác) | 'turtle' (Thành Trì) | 'balanced' (Cân Bằng)
 * - CounterStrategy: 'iron_wall' (Bức Tường Thép) | 'pressure_chaos' (Ép Tinh Thần) | 'adaptive_master'
 */
export function analyzeOpponentInRealTime(moveHistory: Move[] = []): OpponentProfileData {
  const profile = loadOpponentProfile();
  const redMoves = moveHistory.filter((m) => m.piece?.color === 'red');
  if (redMoves.length === 0) return profile;

  const sampleMoves = redMoves.slice(0, 12);
  let uncovers = 0;
  let riverCrossings = 0;
  let capturesOrChecks = 0;
  let backRankDefenses = 0;

  for (const m of sampleMoves) {
    if (m.wasCovered) uncovers++;
    if (m.to.y <= 4) riverCrossings++;
    if (m.captured || m.isCheck) capturesOrChecks++;
    if (m.from.y === 9 && (m.from.x === 2 || m.from.x === 6 || m.from.x === 3 || m.from.x === 5)) {
      backRankDefenses++;
    }
  }

  const liveUncoverRate = uncovers / sampleMoves.length;
  const liveRiverRate = riverCrossings / sampleMoves.length;
  const liveAggression = capturesOrChecks / sampleMoves.length;

  // Blend 60% live game + 40% historical habit
  const blendedUncover = profile.avgEarlyUncoverRate * 0.4 + liveUncoverRate * 0.6;
  const blendedRiver = profile.avgRiverCrossRate * 0.4 + liveRiverRate * 0.6;
  const blendedAggression = profile.avgAggressionRate * 0.4 + liveAggression * 0.6;

  let detectedStyle: OpponentStyle = 'balanced';
  let counterStrategy: CounterStrategy = 'adaptive_master';

  if (blendedRiver >= 0.32 || (blendedUncover >= 0.72 && blendedAggression >= 0.35)) {
    detectedStyle = 'gambler';
    counterStrategy = 'iron_wall';
  } else if (
    (blendedRiver <= 0.12 && blendedAggression <= 0.18 && sampleMoves.length >= 4) ||
    backRankDefenses >= 2
  ) {
    detectedStyle = 'turtle';
    counterStrategy = 'pressure_chaos';
  }

  return {
    ...profile,
    detectedStyle,
    counterStrategy,
  };
}

/**
 * Learn from a completed game (called when a match ends in Win / Loss / Draw):
 * 1. Updates OpponentProfileData (habits, preferred pawn files, style, and evolution depth bonus).
 * 2. When AI loses ('win' for player):
 *    - Identifies AI's blunder move before losing material/checkmate and adds it to `forbiddenMoves`.
 *    - Absorbs player's winning opening moves (mirrored to Black) into `openingBook`!
 * 3. When AI wins ('loss' for player):
 *    - Reinforces AI's winning opening moves in `openingBook`.
 */
export function learnFromCompletedMatch(
  resultForPlayer: 'win' | 'loss' | 'draw',
  moveHistory: Move[],
  snapshots: { board: (Piece | null)[][]; turn: PlayerColor }[] = []
): OpponentProfileData {
  const profile = loadOpponentProfile();
  const memory = loadAdaptiveMemory();

  profile.gamesPlayed += 1;
  if (resultForPlayer === 'win') profile.playerWins += 1;
  else if (resultForPlayer === 'loss') profile.aiWins += 1;
  else profile.draws += 1;

  // Evolution bonus depth: if player beats AI or holds high winrate, AI evolves deeper search (+1 to +4 plies)
  const netPlayerLead = profile.playerWins - profile.aiWins;
  if (netPlayerLead >= 3) profile.evolutionBonusDepth = 4;
  else if (netPlayerLead >= 1) profile.evolutionBonusDepth = 2;
  else if (profile.playerWins >= 1) profile.evolutionBonusDepth = 1;
  else profile.evolutionBonusDepth = 0;

  // Analyze player's moves in this game
  const redMoves = moveHistory.filter((m) => m.piece?.color === 'red');
  if (redMoves.length > 0) {
    const earlyRed = redMoves.slice(0, 10);
    const uncoverRate = earlyRed.filter((m) => m.wasCovered).length / earlyRed.length;
    const riverRate = earlyRed.filter((m) => m.to.y <= 4).length / earlyRed.length;
    const aggRate = earlyRed.filter((m) => m.captured || m.isCheck).length / earlyRed.length;

    profile.avgEarlyUncoverRate = Number((profile.avgEarlyUncoverRate * 0.65 + uncoverRate * 0.35).toFixed(3));
    profile.avgRiverCrossRate = Number((profile.avgRiverCrossRate * 0.65 + riverRate * 0.35).toFixed(3));
    profile.avgAggressionRate = Number((profile.avgAggressionRate * 0.65 + aggRate * 0.35).toFixed(3));

    // Record which pawn file the player likes to open in the first 3 moves
    for (const m of earlyRed.slice(0, 3)) {
      if (m.wasCovered && m.from.y === 6) {
        profile.preferredPawnCols[m.from.x] = (profile.preferredPawnCols[m.from.x] || 0) + 1;
      }
    }
  }

  // Classify long-term style
  if (profile.avgRiverCrossRate >= 0.3 || (profile.avgEarlyUncoverRate >= 0.7 && profile.avgAggressionRate >= 0.35)) {
    profile.detectedStyle = 'gambler';
    profile.counterStrategy = 'iron_wall';
  } else if (profile.avgRiverCrossRate <= 0.14 && profile.avgAggressionRate <= 0.2) {
    profile.detectedStyle = 'turtle';
    profile.counterStrategy = 'pressure_chaos';
  } else {
    profile.detectedStyle = 'balanced';
    profile.counterStrategy = 'adaptive_master';
  }

  // Learn from snapshots & moveHistory
  if (snapshots.length > 0 && moveHistory.length > 0) {
    const limit = Math.min(snapshots.length, moveHistory.length);

    if (resultForPlayer === 'win') {
      // 1. AI LOST: Find AI's critical mistake (blunder) and ban it in that position
      for (let i = limit - 1; i >= 0; i--) {
        const move = moveHistory[i];
        const snap = snapshots[i];
        if (!move || !snap || move.piece.color !== 'black') continue;

        // Check if immediately after this AI move, Red captured a major piece or delivered checkmate
        const nextRedMove = moveHistory[i + 1];
        const lostMajorPiece =
          nextRedMove?.captured &&
          !nextRedMove.captured.isCovered &&
          ['chariot', 'cannon', 'horse'].includes(nextRedMove.captured.trueRole);
        const isFinalFatalMove = i >= limit - 2;

        if (lostMajorPiece || isFinalFatalMove) {
          const hash = hashPublicBoard(snap.board, 'black');
          const uci = toUciToken(move.from, move.to);
          const list = memory.forbiddenMoves[hash] || [];
          if (!list.includes(uci)) {
            list.push(uci);
            memory.forbiddenMoves[hash] = list;
          }
          break;
        }
      }

      // 2. ABSORB PLAYER'S WINNING ESSENCE (Hấp thụ tinh hoa khai cuộc của đối thủ)
      // Mirror Red's first 4 moves (plies 0, 2, 4, 6) into Black's opening book
      for (let i = 0; i < Math.min(limit, 8); i++) {
        const move = moveHistory[i];
        const snap = snapshots[i];
        if (!move || !snap || move.piece.color !== 'red') continue;
        // Strict constraint: Do not learn or absorb Pawn 5 opening
        if (move.from.x === 4 && (move.from.y === 6 || move.from.y === 3)) continue;

        const mirroredBoard = mirrorBoardForBlack(snap.board);
        const hash = hashPublicBoard(mirroredBoard, 'black');
        const mirroredUci = mirrorUciToken(toUciToken(move.from, move.to));

        const entries = memory.openingBook[hash] || [];
        const existing = entries.find((e) => e.uciMove === mirroredUci);
        if (existing) {
          existing.wins += 1;
          existing.learnedFromPlayer = true;
          existing.updatedAt = Date.now();
        } else {
          entries.push({
            uciMove: mirroredUci,
            wins: 1,
            losses: 0,
            learnedFromPlayer: true,
            updatedAt: Date.now(),
          });
        }
        memory.openingBook[hash] = entries;
      }
    } else if (resultForPlayer === 'loss') {
      // AI WON: Reinforce AI's opening moves (first 10 plies)
      for (let i = 0; i < Math.min(limit, 10); i++) {
        const move = moveHistory[i];
        const snap = snapshots[i];
        if (!move || !snap || move.piece.color !== 'black') continue;
        // Strict constraint: Do not store Pawn 5 opening
        if (move.from.x === 4 && (move.from.y === 6 || move.from.y === 3)) continue;

        const hash = hashPublicBoard(snap.board, 'black');
        const uci = toUciToken(move.from, move.to);
        const entries = memory.openingBook[hash] || [];
        const existing = entries.find((e) => e.uciMove === uci);
        if (existing) {
          existing.wins += 1;
          existing.updatedAt = Date.now();
        } else {
          entries.push({
            uciMove: uci,
            wins: 1,
            losses: 0,
            updatedAt: Date.now(),
          });
        }
        memory.openingBook[hash] = entries;
      }
    }
  }

  profile.lastUpdated = Date.now();
  saveOpponentProfile(profile);
  saveAdaptiveMemory(memory);
  return profile;
}

/**
 * Filter & Prioritize `rootMoves` before passing to C++/WASM Engines (PikaJieQi / AB-JChess / JQE):
 * Enforces:
 * 1. Forbidden moves learned from past losses are removed.
 * 2. Practical Covered Piece Valuation (Định giá thực chiến quân úp):
 *    - Never sacrifice a revealed Chariot/Cannon/Horse to capture a defended covered piece (valued at Advisor/Elephant = 310).
 *    - Never trade covered Cannon for covered Horse, never pull covered Cannon to center early, never uncover Chariot while covered Pawns remain.
 * 3. Psychological Counter-Strategy ordering & filtering:
 *    - `iron_wall` (vs Gambler): prioritize solid pawn confrontation, defending hanging pieces, and punishing overextended enemy pieces.
 *    - `pressure_chaos` (vs Turtle): prioritize central control, crossing river, and attacking enemy back-rank defenders.
 */
export function selectAdaptiveRootMoves(
  board: (Piece | null)[][],
  color: PlayerColor,
  moveHistory: Move[] = [],
  rawUciMoves: string[]
): { filteredRootMoves: string[]; evolutionBonusDepth: number; profile: OpponentProfileData } {
  const profile = analyzeOpponentInRealTime(moveHistory);
  const memory = loadAdaptiveMemory();
  if (rawUciMoves.length <= 1) {
    return { filteredRootMoves: rawUciMoves, evolutionBonusDepth: profile.evolutionBonusDepth, profile };
  }

  const legalMoves = getAllLegalMoves(board, color, moveHistory);
  if (legalMoves.length <= 1) {
    return { filteredRootMoves: rawUciMoves, evolutionBonusDepth: profile.evolutionBonusDepth, profile };
  }

  const oppColor: PlayerColor = color === 'red' ? 'black' : 'red';
  const inCheckNow = isKingInCheck(board, color).inCheck;
  const boardHash = hashPublicBoard(board, color);
  const forbiddenSet = new Set(memory.forbiddenMoves[boardHash] || []);
  const bookEntries = memory.openingBook[boardHash] || [];

  // Check if AI still has safe covered pawns to open
  const pawnRow = color === 'black' ? 3 : 6;
  const hasCoveredPawns = [0, 2, 4, 6, 8].some((x) => {
    const p = board[pawnRow]?.[x];
    return p && p.color === color && p.isCovered;
  });

  // Check if opponent still has hidden Advisors/Elephants (Rule 2: Covered target = 310 pts while A/B remain in pool)
  let revealedOrCapturedOppAdvisorsElephants = 0;
  for (let y = 0; y < BOARD_ROWS; y++) {
    for (let x = 0; x < BOARD_COLS; x++) {
      const p = board[y]?.[x];
      if (p && p.color === oppColor && !p.isCovered && (p.trueRole === 'advisor' || p.trueRole === 'elephant')) {
        revealedOrCapturedOppAdvisorsElephants++;
      }
    }
  }
  for (const m of moveHistory) {
    if (
      m.captured &&
      m.captured.color === oppColor &&
      !m.captured.isCovered &&
      !m.captured.wasCoveredWhenCaptured &&
      (m.captured.trueRole === 'advisor' || m.captured.trueRole === 'elephant')
    ) {
      revealedOrCapturedOppAdvisorsElephants++;
    }
  }
  const treatOppCoveredAsLowValue = revealedOrCapturedOppAdvisorsElephants < 4;

  // Score each legal move using tactical discipline + psychological counter + learned book
  const scored: { uci: string; score: number; hardVeto: boolean }[] = [];

  for (const m of legalMoves) {
    const uci = toUciToken(m.from, m.to);
    if (!rawUciMoves.includes(uci)) continue;

    let score = 0;
    let hardVeto = false;

    // 1. Forbidden move from past defeat
    if (forbiddenSet.has(uci) && !inCheckNow) {
      hardVeto = true;
      score -= 50000;
    }

    // 2. Core Cờ Úp Discipline (only when not forced out of check)
    if (!inCheckNow) {
      // User rule: Bỏ khai cục Tốt 5 (no early Pawn 5 push in opening)
      if (moveHistory.length < 8 && m.from.x === 4 && (m.from.y === 6 || m.from.y === 3)) {
        hardVeto = true;
        score -= 30000;
      }
      // Never trade covered Cannon for covered Horse
      if (isCoveredCannonTradingCoveredHorse(m)) {
        hardVeto = true;
        score -= 40000;
      }
      // Never pull covered Cannon to center early
      if (hasCoveredPawns && isCoveredCannonDefendingOrMovingToCenter(m)) {
        hardVeto = true;
        score -= 35000;
      }
      // Never retreat Cannon 1 step aimlessly in opening
      const isRetreatOneStep =
        (color === 'black' && m.from.y === 2 && m.to.y === 1 && m.from.x === m.to.x) ||
        (color === 'red' && m.from.y === 7 && m.to.y === 8 && m.from.x === m.to.x);
      if (isRetreatOneStep && !m.captured && moveHistory.length < 16) {
        hardVeto = true;
        score -= 30000;
      }
      // Never uncover corner Chariot early while covered Pawns still exist and not capturing
      const backRow = color === 'black' ? 0 : 9;
      if (
        hasCoveredPawns &&
        m.piece.isCovered &&
        m.from.y === backRow &&
        (m.from.x === 0 || m.from.x === 8) &&
        !m.captured
      ) {
        hardVeto = true;
        score -= 25000;
      }

      // Rule 2 (Định giá thực chiến quân úp): Never sacrifice revealed major piece (Xe/Pháo/Mã) for a defended covered piece
      if (
        m.captured &&
        m.captured.isCovered &&
        !m.piece.isCovered &&
        ['chariot', 'cannon', 'horse'].includes(m.piece.trueRole) &&
        treatOppCoveredAsLowValue
      ) {
        const afterBoard = simulateMove(board, m.from, m.to);
        if (isSquareDefendedBy(afterBoard, m.to, oppColor)) {
          const attackerVal = PIECE_VALUES[m.piece.trueRole];
          const coveredTargetVal = 310; // Sĩ/Tượng baseline
          if (attackerVal > coveredTargetVal + 80) {
            hardVeto = true;
            score -= 38000;
          }
        }
      }
    }

    // 3. Learned Opening Book & Absorbed Player Essence bonus
    const bookHit = bookEntries.find((b) => b.uciMove === uci);
    if (bookHit && bookHit.wins > bookHit.losses) {
      score += 450 * (bookHit.wins - bookHit.losses) + (bookHit.learnedFromPlayer ? 200 : 0);
    }

    // 4. Opponent Habit Counter: Contest the pawn file the player just pushed or prefers
    if (m.piece.isCovered && m.from.y === pawnRow) {
      const playerFreq = profile.preferredPawnCols[m.from.x] || 0;
      score += playerFreq * 35;
      // If opponent still has covered pawn on this file, contesting it locks their lid
      const oppPawnRow = color === 'black' ? 6 : 3;
      if (board[oppPawnRow]?.[m.from.x]?.isCovered) {
        score += 140;
      }
    }

    // 5. Psychological Strategy Shaping
    if (profile.counterStrategy === 'iron_wall') {
      // Vs Gambler (Thần Đổ Bác): Punish overextended river pieces & keep solid structure
      if (m.captured && ((color === 'black' && m.to.y <= 4) || (color === 'red' && m.to.y >= 5))) {
        score += 280; // Punish invader on our half of the board
      }
      // Avoid reckless uncovered/covered leaps into defended enemy territory without capture
      const crossesRiver = (color === 'black' && m.to.y >= 5) || (color === 'red' && m.to.y <= 4);
      if (crossesRiver && !m.captured && moveHistory.length < 14) {
        const afterBoard = simulateMove(board, m.from, m.to);
        if (isSquareDefendedBy(afterBoard, m.to, oppColor)) {
          score -= 350;
        }
      }
    } else if (profile.counterStrategy === 'pressure_chaos') {
      // Vs Turtle (Thành Trì): Reward central control (col 4, 2, 6), crossing river & pressuring palace
      if (m.to.x === 4 || m.to.x === 2 || m.to.x === 6) {
        score += 95;
      }
      const crossesRiver = (color === 'black' && m.to.y >= 5) || (color === 'red' && m.to.y <= 4);
      if (crossesRiver) {
        score += 150;
      }
      // Penalize passive backward moves when not in check
      const isBackward = (color === 'black' && m.to.y < m.from.y) || (color === 'red' && m.to.y > m.from.y);
      if (isBackward && !m.captured && !inCheckNow) {
        score -= 180;
      }
    }

    // 6. Pawn Mastery ("Gặp thời một Tốt cũng thành công"): High reward for revealed Pawn advancing near enemy palace
    if (!m.piece.isCovered && m.piece.trueRole === 'soldier') {
      const inEnemyHalf = (color === 'black' && m.to.y >= 5) || (color === 'red' && m.to.y <= 4);
      if (inEnemyHalf) {
        score += 120;
        if (m.to.x >= 3 && m.to.x <= 5 && ((color === 'black' && m.to.y >= 7) || (color === 'red' && m.to.y <= 2))) {
          score += 260; // Throat-locking pawn near enemy King
        }
      }
    }

    scored.push({ uci, score, hardVeto });
  }

  // Sort moves from highest tactical/psychological score to lowest so the C++/WASM engine searches best branches first!
  scored.sort((a, b) => b.score - a.score);

  // Filter out hard-vetoed blunders ONLY if at least 1 safe legal move remains
  const safeMoves = scored.filter((s) => !s.hardVeto).map((s) => s.uci);
  const filteredRootMoves = safeMoves.length > 0 ? safeMoves : scored.map((s) => s.uci);

  return {
    filteredRootMoves,
    evolutionBonusDepth: profile.evolutionBonusDepth,
    profile,
  };
}

/**
 * Master Cờ Úp Seed Opening Book:
 * Curated classical opening lines (B3.1, B7.1, B1.1, B9.1, and safe Elephant).
 * Strictly excludes any Pawn 5 opening.
 */
export const SEED_OPENING_BOOK: Record<string, string[]> = {
  // Red opening turn (ply 0): Binh 3/7 (c3c4, g3g4), Binh 1/9 (a3a4, i3i4)
  'xxxxkxxxx/9/1x5x1/x1x1x1x1x/9/9/X1X1X1X1X/1X5X1/9/XXXXKXXXX_red': [
    'c3c4', // Binh 3 tiến 1 (thông lộ Mã/Tượng cánh trái)
    'g3g4', // Binh 7 tiến 1 (thông lộ Mã/Tượng cánh phải)
    'a3a4', // Binh 1 tiến 1 (an toàn biên)
    'i3i4', // Binh 9 tiến 1 (an toàn biên)
  ],
};

/**
 * Fast Opening Book Selector:
 * Evaluates in < 15ms during the opening phase (first 8 plies).
 * Returns an instant book move or null if out-of-book, saving CPU time!
 */
export function findOpeningBookMove(
  board: (Piece | null)[][],
  color: PlayerColor,
  moveHistory: Move[] = []
): DetailedMove | null {
  if (moveHistory.length >= 8) return null;

  const legalMoves = getAllLegalMoves(board, color, moveHistory);
  if (legalMoves.length === 0) return null;

  // Strict constraint: Bỏ khai cục Tốt 5 (no Pawn 5 opening)
  const isPawn5 = (m: DetailedMove) => m.from.x === 4 && (m.from.y === 6 || m.from.y === 3);
  const candidates = legalMoves.filter((m) => !isPawn5(m));
  if (candidates.length === 0) return null;

  const memory = loadAdaptiveMemory();
  const hash = hashPublicBoard(board, color);
  const forbiddenSet = new Set(memory.forbiddenMoves[hash] || []);

  // 1. Check Learned Opening Book from real human matches
  const learned = (memory.openingBook[hash] || []).filter(
    (e) => !forbiddenSet.has(e.uciMove) && e.wins > e.losses
  );
  if (learned.length > 0) {
    learned.sort((a, b) => (b.wins - b.losses + (b.learnedFromPlayer ? 4 : 0)) - (a.wins - a.losses + (a.learnedFromPlayer ? 4 : 0)));
    for (const entry of learned) {
      const match = candidates.find((m) => toUciToken(m.from, m.to) === entry.uciMove);
      if (match) return match;
    }
  }

  // 2. Check Seed Opening Book
  const seedMoves = SEED_OPENING_BOOK[hash];
  if (seedMoves && seedMoves.length > 0) {
    for (const uci of seedMoves) {
      if (forbiddenSet.has(uci)) continue;
      const match = candidates.find((m) => toUciToken(m.from, m.to) === uci);
      if (match) return match;
    }
  }

  // 3. Early Opening Heuristic Fallback (Plies 0 to 4):
  // Master Cờ Úp priority: B3.1, B7.1, B1.1, B9.1 or safe Elephant
  if (moveHistory.length < 4) {
    const pawnRow = color === 'red' ? 6 : 3;
    const pawnAdvanceY = color === 'red' ? 5 : 4;
    // Prefer files 2 and 6 (Binh 3/7), then files 0 and 8 (Binh 1/9)
    for (const file of [2, 6, 0, 8]) {
      const pawnMove = candidates.find(
        (m) =>
          m.from.x === file &&
          m.from.y === pawnRow &&
          m.to.x === file &&
          m.to.y === pawnAdvanceY
      );
      if (pawnMove && !forbiddenSet.has(toUciToken(pawnMove.from, pawnMove.to))) {
        return pawnMove;
      }
    }
  }

  return null;
}
