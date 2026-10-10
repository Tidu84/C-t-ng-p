/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AiThinkingStats, PieceRole, PlayerColor, Move } from '../types';
import {
  BOARD_COLS,
  BOARD_ROWS,
  DetailedMove,
  getAllLegalMoves,
  isKingInCheck,
  simulateMove,
  checkMoveRepetitionRules,
  canPieceAttackSquare,
  isSquareDefendedBy,
} from './chessRules';

// Material base values (centipawns)
// TRIẾT LÝ CHIẾN THUẬT CỜ ÚP:
// Các cây chiến khi mở ra (Xe, Pháo, Mã, Sĩ, Tượng) ĐỀU PHẢI CÓ GIÁ TRỊ CAO HƠN VIỆC MỞ CÂY ÚP!
// Cây úp chỉ mang tính may rủi (33.3% là Tốt chỉ 120 điểm), không thể đem cây chiến đi thí để mở úp!
export const PIECE_VALUES: Record<PieceRole, number> = {
  king: 10000,
  chariot: 1000,
  cannon: 520,
  horse: 460,
  advisor: 350,  // Trong Cờ Úp, Sĩ ngửa lướt chéo toàn bàn cờ không bị cản, cực mạnh & hiểm hóc!
  elephant: 310, // Tượng ngửa qua sông khống chế góc bàn cờ, giá trị chiến thuật vượt trội quân úp!
  soldier: 120,
};

/**
 * Kiểm tra xem một quân cờ đã mở có phải là QUÂN CHIẾN CHỦ LỰC (Xe, Pháo, Mã, Sĩ, Tượng) hay không.
 * Các quân này bắt buộc phải được bảo toàn, không được phép để chết không hoặc thí bừa để mở nắp úp!
 */
export function isRevealedCombatPiece(piece: any): boolean {
  if (!piece || piece.isCovered || piece.simulatedRevealed) return false;
  return (
    piece.trueRole === 'chariot' ||
    piece.trueRole === 'cannon' ||
    piece.trueRole === 'horse' ||
    piece.trueRole === 'advisor' ||
    piece.trueRole === 'elephant'
  );
}

/**
 * Kiểm tra xem bên chơi có quân chiến ngửa nào (Xe, Pháo, Mã, Sĩ, Tượng)
 * đang bị đối phương đe dọa ăn không mà không có căn giữ (hanging).
 * Trong Cờ Úp, các quân chiến ngửa có giá trị cao hơn hẳn việc mở quân úp,
 * nên nếu bị đe dọa, AI phải ưu tiên cứu quân/giữ quân trước!
 */
export function findHangingCombatPieces(
  board: (any | null)[][],
  color: PlayerColor
): { x: number; y: number; role: PieceRole; value: number }[] {
  const oppColor: PlayerColor = color === 'red' ? 'black' : 'red';
  const hanging: { x: number; y: number; role: PieceRole; value: number }[] = [];

  for (let y = 0; y < BOARD_ROWS; y++) {
    for (let x = 0; x < BOARD_COLS; x++) {
      const p = board[y][x];
      if (p && p.color === color && isRevealedCombatPiece(p)) {
        const isDefended = isSquareDefendedBy(board, { x, y }, color);
        const isAttacked = isSquareDefendedBy(board, { x, y }, oppColor);
        if (isAttacked && !isDefended) {
          hanging.push({
            x,
            y,
            role: p.trueRole as PieceRole,
            value: PIECE_VALUES[p.trueRole as PieceRole] || 300,
          });
        }
      }
    }
  }
  return hanging;
}

/**
 * Tìm các quân úp của phe `color` đang bị đối phương đe dọa ăn trực tiếp
 * mà KHÔNG CÓ CĂN GIỮ (vô căn).
 * Trong Cờ Úp, nếu một quân úp (đặc biệt Tốt úp 3/7, Tốt tâm, Tốt biên, hoặc Sĩ/Tượng úp)
 * bị đối thủ (Tượng, Mã, Pháo, Xe...) ngắm bắt mà không có căn giữ:
 * - Đây là tình huống bị đe dọa chiến thuật nghiêm trọng!
 * - Nếu không ứng phó, đối phương sẽ ăn mất quân úp ở nước sau (vừa mất quân ~360đ, vừa cho đối thủ ăn không / lật quân).
 * - Phe ta CẦN ƯU TIÊN:
 *   1. Tiến tốt thoát đòn / lật nắp úp (nếu là Tốt úp bị đe dọa).
 *   2. Cản mắt tượng / cản chân mã / chặn đường ăn của quân địch.
 *   3. Lên quân giữ căn bảo vệ quân úp.
 *   4. Bắt quân đang đe dọa.
 */
export function findHangingCoveredPieces(
  board: (any | null)[][],
  color: PlayerColor
): { x: number; y: number; initialRole?: PieceRole; value: number }[] {
  const oppColor: PlayerColor = color === 'red' ? 'black' : 'red';
  const hanging: { x: number; y: number; initialRole?: PieceRole; value: number }[] = [];

  for (let y = 0; y < BOARD_ROWS; y++) {
    for (let x = 0; x < BOARD_COLS; x++) {
      const p = board[y][x];
      if (p && p.color === color && (p.isCovered || p.simulatedRevealed)) {
        const isAttacked = isSquareDefendedBy(board, { x, y }, oppColor);
        if (isAttacked) {
          const isDefended = isSquareDefendedBy(board, { x, y }, color);
          if (!isDefended) {
            hanging.push({
              x,
              y,
              initialRole: p.initialRole,
              value: 360 + getCoverMobilityBonus(p.initialRole),
            });
          }
        }
      }
    }
  }

  return hanging;
}

/**
 * Tìm các Xe đang hoạt động của đối thủ (Xe sáng đã lật hoặc Xe úp đã xuất động khỏi góc).
 * Trong khai cuộc Cờ Úp, khi đối phương đã "ra được Xe" (X9-8, X1-2, hoành xe X1.1/X9.1...):
 * Xe là hỏa lực tối thượng kiểm soát các lộ thông, đè ép hàng quân và săn bắt quân úp.
 */
export function getOpponentActiveChariots(
  board: (any | null)[][],
  oppColor: PlayerColor
): { x: number; y: number; piece: any }[] {
  const chariots: { x: number; y: number; piece: any }[] = [];
  const homeBackRank = oppColor === 'red' ? 9 : 0;
  for (let y = 0; y < BOARD_ROWS; y++) {
    for (let x = 0; x < BOARD_COLS; x++) {
      const p = board[y][x];
      if (p && p.color === oppColor) {
        // Chỉ coi là Xe thật khi đã mở ra và đúng là Xe ngửa thật (p.trueRole === 'chariot')!
        // Tuyệt đối không coi Xe úp hay quân mở từ ô Xe úp (90% là tốt/sĩ) là Xe thật!
        const isRevealedChariot = !p.isCovered && !p.simulatedRevealed && p.trueRole === 'chariot';
        if (isRevealedChariot) {
          chariots.push({ x, y, piece: p });
        }
      }
    }
  }
  return chariots;
}

/**
 * Tìm các quân úp của phe `color` đang bị Xe đối phương trực tiếp ngắm ăn / đe dọa.
 * "đéo hiểu bạn chỉnh logic kiểu gì mà khi tôi ra được xe thì máy không giữ úp thế?"
 * "Tại khai cục này, lẽ ra phải lên mã để mong là tốt, giữ tốt khi bị xe nhìn"
 * Nếu có quân úp bị Xe đối phương ngắm bắt:
 * - BẮT BUỘC PHẢI GIỮ ÚP:
 *   1. Tiến tốt thoát đòn (nếu an toàn).
 *   2. Lên Mã giữ Tốt / giữ Pháo (M8.7 / M2.3).
 *   3. Lên Sĩ / Tượng giữ căn hoặc chắn đường Xe.
 *   4. Xuất Xe đối kháng.
 * - Tuyệt đối không được bỏ mặc quân úp bị Xe nhìn để đi mở Tốt biên hay đi quân vu vơ!
 */
export function findCoveredPiecesThreatenedByChariot(
  board: (any | null)[][],
  color: PlayerColor
): { x: number; y: number; piece: any; chariotPos: { x: number; y: number }; isDefended: boolean }[] {
  const oppColor: PlayerColor = color === 'red' ? 'black' : 'red';
  const oppChariots = getOpponentActiveChariots(board, oppColor);
  if (oppChariots.length === 0) return [];

  const threatened: { x: number; y: number; piece: any; chariotPos: { x: number; y: number }; isDefended: boolean }[] = [];
  for (let y = 0; y < BOARD_ROWS; y++) {
    for (let x = 0; x < BOARD_COLS; x++) {
      const p = board[y][x];
      if (p && p.color === color && (p.isCovered || p.simulatedRevealed)) {
        for (const c of oppChariots) {
          if (canPieceAttackSquare(board, { x: c.x, y: c.y }, { x, y }, c.piece)) {
            const isDefended = isSquareDefendedBy(board, { x, y }, color);
            threatened.push({ x, y, piece: p, chariotPos: { x: c.x, y: c.y }, isDefended });
            break;
          }
        }
      }
    }
  }
  return threatened;
}

/**
 * Strict Fog-of-War Board Sanitizer.
 * Completely redacts the trueRole and ID of any covered piece before the AI or Hint engine searches.
 * Neither the AI, minimax search, heuristics, nor any node in the search tree can EVER peek at hidden pieces!
 */
export function sanitizeBoardForAi(board: (any | null)[][]): (any | null)[][] {
  return board.map((row, y) =>
    row.map((piece, x) => {
      if (!piece) return null;
      if (piece.isCovered) {
        // Redact secret trueRole completely so search cannot peek.
        // Anonymize ID as ${piece.color}_covered_${x}_${y} so AI has ZERO hidden information
        return {
          id: `${piece.color}_covered_${x}_${y}`,
          color: piece.color,
          trueRole: 'soldier', // Redacted to standard soldier so search never hallucinates that opening a corner piece produces a real 1100-point Chariot
          isCovered: true,
          initialRole: piece.initialRole,
          simulatedRevealed: false,
        };
      }
      return { ...piece, simulatedRevealed: false };
    })
  );
}

/**
 * Dynamically computes the fair mathematical expected value of any remaining unrevealed piece for a player.
 * Based on publicly observable revealed/captured pieces (the exact method human grandmasters use to count pieces).
 * ALL covered pieces of the same color receive the exact same average value — ZERO cheating or discriminating!
 *
 * BIẾN THIÊN GIÁ TRỊ QUÂN ÚP THEO GIAI ĐOẠN (Opening -> Midgame -> Endgame):
 * - Khai cuộc (>= 10 quân úp): Tất cả quân úp đều có tiềm năng chiến lược tối đa (100% pool value).
 * - Trung cuộc (5 - 9 quân úp): Các quân chủ lực dần xuất đầu lộ diện; giá trị quân úp còn lại giảm dần (85%).
 * - Tàn cuộc (<= 4 quân úp): Quân úp "dần mất giá trị khi các quân đã mở ra gần hết rồi" (65%),
 *   nhường chỗ cho ưu thế quyết định của các quân ngửa cơ động (Xe, Mã, Pháo, Tốt qua sông).
 */
export function getExpectedCoveredValue(
  board: (any | null)[][],
  color: PlayerColor,
  moveHistory?: Move[]
): number {
  const poolCounts: Record<PieceRole, number> = {
    chariot: 2,
    cannon: 2,
    horse: 2,
    elephant: 2,
    advisor: 2,
    soldier: 5,
    king: 0,
  };

  let coveredCount = 0;
  for (let y = 0; y < BOARD_ROWS; y++) {
    for (let x = 0; x < BOARD_COLS; x++) {
      const p = board[y][x];
      if (p && p.color === color) {
        if (p.isCovered) {
          coveredCount++;
        } else if (!p.simulatedRevealed && p.trueRole !== 'king') {
          if (poolCounts[p.trueRole as PieceRole] > 0) {
            poolCounts[p.trueRole as PieceRole]--;
          }
        }
      }
    }
  }

  // Deduct captured revealed pieces from moveHistory
  if (moveHistory) {
    for (const m of moveHistory) {
      if (m.captured && m.captured.color === color && !m.captured.isCovered && m.captured.trueRole !== 'king') {
        if (poolCounts[m.captured.trueRole as PieceRole] > 0) {
          poolCounts[m.captured.trueRole as PieceRole]--;
        }
      }
    }
  }

  if (coveredCount <= 0) return 150;

  let totalValue = 0;
  let remainingCount = 0;
  (Object.keys(poolCounts) as PieceRole[]).forEach((role) => {
    const count = poolCounts[role];
    if (count > 0) {
      totalValue += count * PIECE_VALUES[role];
      remainingCount += count;
    }
  });

  const baseAverage = remainingCount > 0 ? Math.round(totalValue / remainingCount) : 150;

  // TRIẾT LÝ QUAN TRỌNG:
  // Xe (1000) > Pháo (520) > Mã (460) > Sĩ (350) > Tượng (310) ĐỀU CAO HƠN QUÂN ÚP!
  // Quân úp chỉ là xác suất bí mật chưa rõ (33.3% là Tốt chỉ đáng 120 điểm),
  // do đó giá trị kỳ vọng của quân úp không bao giờ được vượt quá quân Tượng (310) hay Sĩ (350).
  if (coveredCount >= 10) {
    // Khai cuộc: Tối đa 230 điểm (thấp hơn hẳn Tượng 310, Sĩ 350, Mã 460, Pháo 520, Xe 1000)
    return Math.min(230, Math.round(baseAverage * 0.65));
  } else if (coveredCount >= 5) {
    // Trung cuộc: Tối đa 180 điểm
    return Math.min(180, Math.round(baseAverage * 0.52));
  } else {
    // Tàn cuộc: Tối đa 130 điểm (gần bằng giá trị con Tốt ngửa 120 điểm)
    return Math.min(130, Math.round(baseAverage * 0.38));
  }
}

export interface SetStatus {
  hasChariot: boolean;
  hasCannon: boolean;
  hasHorse: boolean;
  hasFullSet: boolean;
  chariotCount: number;
  cannonCount: number;
  horseCount: number;
}

/**
 * Kiểm tra xem bên chơi đã xuất hiện đủ ít nhất 1 bộ "Xe - Pháo - Mã" ngửa trên bàn cờ hay chưa.
 * Trong Cờ Úp, khi chưa ra đủ ít nhất 1 bộ Xe Pháo Mã thì nhiệm vụ tối thượng của khai cuộc là:
 * 1. ƯU TIÊN MỞ ÚP: Chủ động mở các quân úp (đặc biệt Tốt 3/7, Tốt 5, Sĩ/Tượng) để săn tìm Xe/Pháo/Mã.
 * 2. ƯU TIÊN KHÓA ÚP ĐỐI THỦ: Khóa nắp hàng Tốt úp, ghim ép và đè các quân úp của địch để kìm hãm đối phương phát triển.
 */
export function hasRevealedFullSet(board: (any | null)[][], color: PlayerColor): SetStatus {
  let chariotCount = 0;
  let cannonCount = 0;
  let horseCount = 0;

  for (let y = 0; y < BOARD_ROWS; y++) {
    for (let x = 0; x < BOARD_COLS; x++) {
      const p = board[y][x];
      // Chỉ tính quân đã ngửa công khai trên bàn cờ thật, không tính quân úp hay giả lập trong cây tìm kiếm
      if (p && p.color === color && !p.isCovered && !p.simulatedRevealed) {
        if (p.trueRole === 'chariot') chariotCount++;
        else if (p.trueRole === 'cannon') cannonCount++;
        else if (p.trueRole === 'horse') horseCount++;
      }
    }
  }

  return {
    hasChariot: chariotCount >= 1,
    hasCannon: cannonCount >= 1,
    hasHorse: horseCount >= 1,
    hasFullSet: chariotCount >= 1 && cannonCount >= 1 && horseCount >= 1,
    chariotCount,
    cannonCount,
    horseCount,
  };
}

/**
 * Calculates dynamic piece value based on board density (number of remaining pieces).
 * Ancient Xiangqi & Cờ Úp proverb: "Pháo đầu cuộc, Mã tàn cuộc"
 * - In opening/early midgame (20-32 pieces): Abundant hurdles/screens give Cannon immense tactical dominance,
 *   while Horses are constantly blocked ("vấp chân mã").
 * - In endgame (<14 pieces): When obstacles are cleared, Horses gallop freely while Cannons lack firing screens.
 */
export function getDynamicPieceValue(role: PieceRole, totalPieces: number): number {
  if (role === 'cannon') {
    if (totalPieces >= 24) return 570;
    if (totalPieces >= 18) return 520;
    if (totalPieces >= 12) return 450;
    return 390; // Late endgame, few screens
  }
  if (role === 'horse') {
    if (totalPieces >= 24) return 380; // Blocked in dense crowd
    if (totalPieces >= 18) return 410;
    if (totalPieces >= 12) return 450;
    return 490; // High mobility endgame
  }
  if (role === 'advisor') {
    // In Cờ Úp, revealed Sĩ is unblockable (moves diagonally without any leg or eye block).
    // In late midgame / endgame, roaming Sĩ is extraordinarily agile and dangerous for attack & defense!
    if (totalPieces <= 16) return 360;
    if (totalPieces <= 22) return 335;
    return 310;
  }
  return PIECE_VALUES[role] || 100;
}

/**
 * Calculates the operational cover mobility bonus of an unrevealed piece based on its initialRole.
 * In Cờ Úp, while a piece remains covered, its operational power on the board is governed by its starting role:
 * - A piece at the Chariot slot (Xe úp) moves with the immense line-control of a Chariot (950).
 * - A piece at the Cannon slot (Pháo úp) threatens jump attacks like a Cannon (570) across abundant screens.
 * - A piece at the Horse slot (Mã úp) has 0 legal moves on turn 1 and is severely blocked by adjacent pawns/advisors.
 * - A piece at the Soldier slot (Tốt úp) only moves 1 single step (120).
 *
 * Pháo úp is vastly superior to Mã úp (620 vs 300) in both range and initiative.
 */
export function getCoverMobilityBonus(initialRole?: PieceRole, totalPieces = 32): number {
  switch (initialRole) {
    case 'chariot':
      return 50; // Giữ giá trị cơ động của Xe úp nhưng vẫn dưới Xe đã lật
    case 'cannon':
      return totalPieces >= 18 ? 30 : 15;
    case 'horse':
      return -30;
    case 'elephant':
    case 'advisor':
      return 0;
    case 'soldier':
    default:
      return -70;
  }
}

/**
 * Kiểm tra xem một bên còn quân úp nào trên hàng Tốt (y=3 với Đen, y=6 với Đỏ) hay không.
 * Triết lý Cờ Úp đỉnh cao: Ưu tiên mở những cây úp ở hàng tốt trước khi mở những cây ở hàng dưới.
 */
export function hasCoveredPawnsOnPawnRow(board: (any | null)[][], color: PlayerColor): boolean {
  const pawnRank = color === 'black' ? 3 : 6;
  for (let x = 0; x < BOARD_COLS; x++) {
    const p = board[pawnRank][x];
    if (p && p.color === color && p.isCovered) {
      return true;
    }
  }
  return false;
}

/** Opening preference for which covered movement slots to reveal first. */
function getOpeningRevealPriority(role?: PieceRole, file = 4): number {
  switch (role) {
    case 'soldier':
      // Hàng Tốt: Ưu tiên tuyệt đối khi khai cuộc (B3/B7 > B5 > B1/B9)
      return 650 + (file === 2 || file === 6 ? 120 : file === 4 ? 80 : 30);
    case 'horse':
      return 120;
    case 'advisor':
      return 70;
    case 'elephant':
      return 60;
    case 'cannon':
      return 40;
    case 'chariot':
      return -150;
    default:
      return 0;
  }
}

// Positional bonuses based on board coordinates
function getPositionalBonus(
  role: PieceRole,
  color: PlayerColor,
  x: number,
  y: number,
  isCovered: boolean,
  totalPieces = 32
): number {
  if (isCovered) return 0;

  // Normalized rank (0 = home back rank, 9 = opponent back rank)
  const forwardRank = color === 'black' ? y : 9 - y;
  let score = 0;

  // Central presence bonus (columns 3, 4, 5)
  const distFromCenter = Math.abs(4 - x);
  score += (4 - distFromCenter) * 6;

  switch (role) {
    case 'soldier': {
      if (forwardRank < 5) {
        // Not crossed river yet: files 2, 4, 6 get development incentive
        score += forwardRank * 10;
        if (x === 2 || x === 4 || x === 6) {
          score += 12;
        }
      } else {
        // Crossed river: exponentially more lethal
        score += 100 + (forwardRank - 5) * 35;
        // In or near palace throat (x in 3, 4, 5 and forwardRank in 6, 7, 8)
        if (distFromCenter <= 1 && forwardRank >= 6 && forwardRank <= 8) {
          score += 65;
        }
      }
      break;
    }
    case 'horse': {
      // Horses thrive in center (x=2, 3, 5, 6) and forward ranks; avoid rim (x=0, 8)
      if (x === 0 || x === 8) {
        score -= 90; // "Mã biên nan đắc thế" - severe penalty for rim horse
      } else {
        score += forwardRank * 15;
        if (x === 2 || x === 6) {
          score += 25; // Good development outpost
        }
      }
      // Optimal forward river ranks
      if (forwardRank >= 3 && forwardRank <= 6) {
        score += 30;
      }
      break;
    }
    case 'chariot': {
      // Chariots control vertical lines and 7th rank (forwardRank 7)
      score += forwardRank * 10;
      // "Xe biên nan đắc thế": Xe dạt ra biên (cột 0 hoặc cột 8) ở khai - trung cuộc bị hạn chế tầm hoạt động
      if (x === 0 || x === 8) {
        score -= totalPieces >= 18 ? 65 : 40;
      }
      // Control rib files (columns 3 and 5) across active battlefield (ranks 2 to 7)
      if ((x === 3 || x === 5) && forwardRank >= 2 && forwardRank <= 7) {
        score += 35;
      }
      // On opponent's pawn line / throat rank on active files (columns 1 to 7)
      if ((forwardRank === 6 || forwardRank === 7) && x >= 1 && x <= 7) {
        score += 45;
      }
      // Tránh Xe lọt đáy cung đối thủ một mình khi không chiếu sát ở khai - trung cuộc
      if (forwardRank >= 8 && (x >= 3 && x <= 5) && totalPieces >= 18) {
        score -= 50;
      }
      break;
    }
    case 'cannon': {
      // Central cannon (Pháo đầu) dominates the game!
      if (x === 4) {
        if (forwardRank === 2 || forwardRank === 7) {
          score += 65; // Classic Pháo đầu position
        } else if (forwardRank >= 2 && forwardRank <= 6) {
          score += 45;
        }
      }
      // Mid-board cannons are dangerous
      if (forwardRank >= 2 && forwardRank <= 5) {
        score += 20;
      }
      break;
    }
    case 'advisor': {
      // A revealed Sĩ is useful, but score it as a strong piece only when its diagonal
      // actually combines with a revealed Tượng (see the crossing-control bonus below).
      score += forwardRank >= 5 ? 20 : forwardRank >= 3 && x >= 2 && x <= 6 ? 12 : 8;
      break;
    }
    case 'elephant': {
      // Tượng receives only a modest solo positional bonus; crossing control is evaluated as a pair.
      score += forwardRank >= 5 ? 18 : 8;
      break;
    }
    case 'king': {
      // King must stay safe in palace. Moving King away in opening/midgame is suicidal ("Tướng đi dạo / thượng lầu")
      if (totalPieces >= 18) {
        if (forwardRank > 0 || x !== 4) {
          score -= 750; // Severe penalty: never move king in opening unless in forced check!
        }
      } else {
        score -= forwardRank * 35;
      }
      break;
    }
  }

  return score;
}

function hasAdvisorElephantCrossing(
  board: (any | null)[][],
  advisor: { x: number; y: number; piece: any },
  elephant: { x: number; y: number; piece: any }
): boolean {
  // A Sĩ controls the next diagonal point; a Tượng three diagonal steps away can
  // control that same point if its eye is clear. Reward the intersecting line once.
  for (const dx of [-1, 1]) {
    for (const dy of [-1, 1]) {
      const target = { x: advisor.x + dx, y: advisor.y + dy };
      if (target.x < 0 || target.x >= BOARD_COLS || target.y < 0 || target.y >= BOARD_ROWS) continue;
      if (target.x === elephant.x && target.y === elephant.y) continue;
      if (
        canPieceAttackSquare(board, { x: advisor.x, y: advisor.y }, target, advisor.piece) &&
        canPieceAttackSquare(board, { x: elephant.x, y: elephant.y }, target, elephant.piece)
      ) {
        return true;
      }
    }
  }
  return false;
}

// Evaluate board position from color's perspective
export function evaluateBoard(board: (any | null)[][], color: PlayerColor): number {
  let score = 0;
  let myKingSafety = 0;
  let oppKingSafety = 0;

  const opponentColor: PlayerColor = color === 'red' ? 'black' : 'red';
  const myCoveredVal = getExpectedCoveredValue(board, color);
  const oppCoveredVal = getExpectedCoveredValue(board, opponentColor);
  const mySet = hasRevealedFullSet(board, color);
  const oppSet = hasRevealedFullSet(board, opponentColor);

  let totalPieces = 0;
  for (let y = 0; y < BOARD_ROWS; y++) {
    for (let x = 0; x < BOARD_COLS; x++) {
      if (board[y][x]) totalPieces++;
    }
  }

  const myActivePieces: { x: number; y: number; piece: any }[] = [];
  const oppActivePieces: { x: number; y: number; piece: any }[] = [];
  const myCoveredPieces: { x: number; y: number; initialRole?: PieceRole }[] = [];
  const oppCoveredPieces: { x: number; y: number; initialRole?: PieceRole }[] = [];

  for (let y = 0; y < BOARD_ROWS; y++) {
    for (let x = 0; x < BOARD_COLS; x++) {
      const piece = board[y][x];
      if (!piece) continue;

      let val = 0;
      if (piece.isCovered) {
        // STRICT FOG OF WAR & PROPER COVER VALUATION:
        // 1. Intrinsic expected value from the unrevealed pool:
        const baseVal = piece.color === color ? myCoveredVal : oppCoveredVal;
        // 2. Operational mobility value of the cover itself:
        // Xe úp moves with the full power of a Chariot (950), Pháo úp with Cannon (570 in opening),
        // whereas Mã úp (-60) is blocked and Tốt úp (-160) has only 1-step mobility!
        val = baseVal + getCoverMobilityBonus(piece.initialRole, totalPieces);

        if (piece.color === color) {
          myCoveredPieces.push({ x, y, initialRole: piece.initialRole });
          myActivePieces.push({ x, y, piece });
        } else {
          oppCoveredPieces.push({ x, y, initialRole: piece.initialRole });
          oppActivePieces.push({ x, y, piece });
        }

        // Positional value for covered pieces: palace fortress and center pawn
        if (piece.color === 'black') {
          // Home palace protectors: Sĩ úp at (3,0), (5,0), Tượng úp at (2,0), (6,0)
          if (y === 0 && (x === 3 || x === 5 || x === 2 || x === 6)) {
            val += 25; // Thưởng điểm giữ đáy (+25 điểm) cho Sĩ/Tượng xuất phát
          } else if (y === 3 && x === 4) {
            val += 20; // Thưởng điểm giữ trục lộ (+20 điểm) cho quân úp Tốt đầu ngăn Pháo đầu sớm
          }
        } else {
          if (y === 9 && (x === 3 || x === 5 || x === 2 || x === 6)) {
            val += 25;
          } else if (y === 6 && x === 4) {
            val += 20;
          }
        }
      } else if (piece.simulatedRevealed) {
        // Trong mô phỏng tìm kiếm, quân này đã được MỞ CÂY:
        // Quân đã được mở trong nhánh mô phỏng; danh tính thật vẫn bị ẩn với AI.
        val = piece.color === color ? myCoveredVal : oppCoveredVal;

        const pieceOppColor: PlayerColor = piece.color === 'red' ? 'black' : 'red';
        const isAttackedByOpp = isSquareDefendedBy(board, { x, y }, pieceOppColor);
        const hasFriendlyRoot = isSquareDefendedBy(board, { x, y }, piece.color);

        // ƯU TIÊN MỞ CÂY HÀNG TỐT TRƯỚC HÀNG DƯỚI (Development Tempo Bonus):
        // Mở những cây úp ở hàng tốt trước khi mở những cây ở hàng dưới
        const isOpeningPhase = totalPieces >= 20;
        const isMidgamePhase = totalPieces >= 14 && totalPieces < 20;
        const sidePawnRank = piece.color === 'black' ? 3 : 6;
        const sideCoveredPawns = (piece.color === color ? myCoveredPieces : oppCoveredPieces).filter(
          (cp) => cp.y === sidePawnRank
        );

        if (isOpeningPhase) {
          if (piece.initialRole === 'soldier') {
            // Mở quân hàng Tốt: Thưởng mạnh phát triển thế trận khai cuộc
            // "Mở Tốt 3 & Tốt 7, cả Tốt biên cũng phải ưu tiên mở trước, kể cả Tốt 5"
            if (!isAttackedByOpp || hasFriendlyRoot) {
              let soldierOpeningBonus = 80;
              if (x === 2 || x === 6) soldierOpeningBonus += 35; // B3/B7: thông lộ Mã & Tượng (+115)
              else if (x === 4) soldierOpeningBonus += 25; // B5: tranh trung lộ (+105)
              else soldierOpeningBonus += 20; // B1/B9: Tốt biên mở cánh (+100)

              // TRANH TIÊN KHÓA NẮP:
              // "Phải tranh thủ mở những con tốt mà đối thủ chưa kịp mở chứ?"
              // Nếu ở cột x này, quân Tốt đối diện của đối thủ VẪN CÒN ĐANG ÚP (đối thủ chưa kịp mở):
              // Thưởng thêm điểm vì ta đã tranh thủ mở trước để kiểm soát bờ sông và chuẩn bị khóa nắp đối phương!
              const oppPawnRank = piece.color === 'black' ? 6 : 3;
              const oppPawnOnThisCol = board[oppPawnRank] && board[oppPawnRank][x];
              const hasOtherCoveredOppPawns = [0, 2, 4, 6, 8].some((col) => {
                const p = board[oppPawnRank] && board[oppPawnRank][col];
                return p && p.isCovered;
              });

              if (oppPawnOnThisCol && oppPawnOnThisCol.isCovered) {
                soldierOpeningBonus += 60; // Tranh tiên mở trước ở lộ đối thủ chưa kịp mở!
                if (x === 0 || x === 8) {
                  soldierOpeningBonus += 40; // Tốt biên khóa nắp đối phương và mở đường góc xe đáy!
                }
              } else if (hasOtherCoveredOppPawns) {
                // Cột này đối phương đã mở rồi, trong khi các cột khác đối phương vẫn còn Tốt úp:
                // Mở ở cột đã mở không khóa được nắp đối thủ, mất cơ hội tranh tiên ở các lộ khác:
                soldierOpeningBonus -= 50;
              }
              val += soldierOpeningBonus;
            }
          } else {
            // Mở quân không phải hàng tốt (Sĩ, Tượng, Mã, Xe ở hàng đáy):
            const isPalaceMove =
              (piece.color === 'black' && y <= 2 && x >= 3 && x <= 5) ||
              (piece.color === 'red' && y >= 7 && x >= 3 && x <= 5);
            const forwardRank = piece.color === 'black' ? y : 9 - y;
            const isAdvancedCombat = forwardRank >= 5 || (piece.initialRole === 'cannon' && (forwardRank >= 2 || x === 4));
            if (sideCoveredPawns.length > 0 && !isPalaceMove && !isAdvancedCombat) {
              // Phạt rất nặng mở quân hàng đáy khi hàng tốt vẫn còn nắp úp chưa mở:
              // "Để nguyên thì nó là xe, nhưng chỉ cần di chuyển mở nắp ra thì nó 90% không còn là xe nữa đâu"
              val -= piece.initialRole === 'chariot' ? 350 : 220;
            } else {
              // Khi hàng tốt đã mở hết hoặc nước củng cố cung/bảo vệ Tướng:
              switch (piece.initialRole) {
                case 'chariot': val += 45; break;
                case 'cannon': val += 35; break;
                case 'horse': val += 25; break;
                case 'advisor': val += isPalaceMove ? 50 : 15; break;
                case 'elephant': val += 15; break;
                default: break;
              }
            }
          }
        } else if (isMidgamePhase) {
          val += 15;
        } else {
          val += 5; // Tàn cuộc: mở nắp không còn quan trọng bằng thế công sát
        }

        const forwardRank = piece.color === 'black' ? y : 9 - y;
        if (forwardRank >= 5) {
          val += 20; // Advanced presence qua sông
        }

        if (piece.color === color) {
          myActivePieces.push({ x, y, piece });
        } else {
          oppActivePieces.push({ x, y, piece });
        }
      } else {
        // Real revealed piece: dynamic value based on game phase ("Pháo đầu cuộc, Mã tàn cuộc")
        val = getDynamicPieceValue(piece.trueRole as PieceRole, totalPieces);
        val += getPositionalBonus(piece.trueRole, piece.color, x, y, false, totalPieces);

        // CẤM KỴ: Tốt ngửa dâng vào mồm Tốt úp đối diện ở hàng tốt!
        // "Tự nhiên lại ấn tốt biên thật lên cho đối thủ có cơ hội mở úp là sao?"
        if (piece.trueRole === 'soldier') {
          const oppPawnRank = piece.color === 'black' ? 6 : 3;
          const myCrossRank = piece.color === 'black' ? 5 : 4;
          if (y === myCrossRank) {
            const oppFrontPawn = board[oppPawnRank] && board[oppPawnRank][x];
            if (oppFrontPawn && oppFrontPawn.color !== piece.color && oppFrontPawn.isCovered) {
              val -= 1000; // Phạt rất nặng Tốt ngửa dâng mạng cho Tốt úp đối thủ ăn mở nắp!
            }
          }
        }

        if (piece.color === color) {
          myActivePieces.push({ x, y, piece });
        } else {
          oppActivePieces.push({ x, y, piece });
        }
      }

      if (piece.color === color) {
        score += val;
        // Piece defending king (defenders in palace or revealed Sĩ/Tượng, excluding the King itself!)
        const isPalaceDefender =
          piece.trueRole !== 'king' &&
          ((piece.color === 'black' && y <= 2 && x >= 3 && x <= 5) ||
          (piece.color === 'red' && y >= 7 && x >= 3 && x <= 5));
        if (isPalaceDefender) {
          myKingSafety += 18;
        }
      } else {
        score -= val;
        const isPalaceDefender =
          piece.trueRole !== 'king' &&
          ((piece.color === 'black' && y <= 2 && x >= 3 && x <= 5) ||
          (piece.color === 'red' && y >= 7 && x >= 3 && x <= 5));
        if (isPalaceDefender) {
          oppKingSafety += 18;
        }
      }
    }
  }

  score += myKingSafety - oppKingSafety;

  // =========================================================================
  // TRIẾT LÝ CHIẾN THUẬT CỜ ÚP ĐỈNH CAO:
  // 1. BIẾN THIÊN GIÁ TRỊ QUÂN ÚP: Khai cuộc tiềm năng cực lớn (~364), dần mất giá trị khi các quân đã mở gần hết.
  // 2. ƯU TIÊN MỞ CÂY: Mở Binh 3/7 thông lộ Mã & Tượng, mở Binh 5 chiếm trung lộ, mở Sĩ/Tượng lật quân cơ động.
  // 3. GIỮ ÚP: Bảo toàn quân úp có căn giữ, tuyệt đối không để quân úp bị ăn không ("mất úp").
  // 4. KHÓA ÚP ĐỐI THỦ: Khóa đường tiến của Tốt úp đối thủ, chặn chân Mã/mắt Tượng, làm tê liệt các nắp chưa mở.
  // =========================================================================
  const totalCovered = myCoveredPieces.length + oppCoveredPieces.length;
  const isOpening = totalCovered >= 10 || totalPieces >= 24;
  const isMidgame = !isOpening && (totalCovered >= 5 || totalPieces >= 14);
  const isEarlyWithoutFullSet = isOpening && !mySet.hasFullSet;

  // A. BẢO TOÀN QUÂN ÚP & TRÁNH TREO QUÂN ÚP VÔ CĂN:
  // Chỉ áp dụng cho quân úp (quân ngửa thật được bảo vệ nghiêm ngặt ở phần TACTICAL PRESERVATION phía dưới).
  for (const myP of myActivePieces) {
    if (myP.piece.trueRole === 'king' || (!myP.piece.isCovered && !myP.piece.simulatedRevealed)) continue;
    const attackers = oppActivePieces.filter((oppP) =>
      canPieceAttackSquare(board, { x: oppP.x, y: oppP.y }, { x: myP.x, y: myP.y }, oppP.piece)
    );

    if (attackers.length > 0) {
      const isDefended = isSquareDefendedBy(board, { x: myP.x, y: myP.y }, color);
      const hasChariotAttacker = attackers.some(
        (a) => a.piece.trueRole === 'chariot' || a.piece.initialRole === 'chariot'
      );
      if (!isDefended) {
        // "Treo quân úp": bị đối thủ ngắm bắt mà không có căn giữ.
        // Nguy cơ mất trắng quân úp ở nước tiếp theo (~360 điểm vật chất + mở nắp cho đối thủ).
        // Nếu bị Xe ngắm bắt: nguy cơ mất quân cận kề (Xe tầm xa ăn càn xuyên bàn), phạt cực nặng!
        const penalty = hasChariotAttacker
          ? (isOpening ? 650 : isMidgame ? 450 : 250)
          : (isOpening ? 420 : isMidgame ? 300 : 180);
        score -= penalty;
      } else {
        // Có căn giữ nhưng bị Xe ngắm trực tiếp (áp lực ghim ép cực lớn):
        score -= hasChariotAttacker ? 90 : (isEarlyWithoutFullSet ? 20 : 8);
      }
    }
  }

  // B. KHÓA ÚP ĐỐI THỦ ("KHÓA NẮP & TÊ LIỆT QUÂN ÚP ĐỐI PHƯƠNG"):
  // Khi chưa ra đủ ít nhất 1 bộ Xe Pháo Mã ở khai cuộc, việc khóa nắp Tốt úp và đè quân úp đối phương
  // là ưu tiên chiến lược sống còn để kìm hãm đối phương phát triển trong khi ta tìm cách mở quân!
  // 1. Khóa Tốt úp đối phương (chặn đường tiến của Binh úp, làm tê liệt cả cánh sau):
  const oppPawnRank = opponentColor === 'black' ? 3 : 6;
  const oppPawnAdvanceY = opponentColor === 'black' ? 4 : 5;
  for (const oppCov of oppCoveredPieces) {
    if (oppCov.y === oppPawnRank) {
      const advancePos = { x: oppCov.x, y: oppPawnAdvanceY };
      const isOccupiedByUs = myActivePieces.some((myP) => myP.x === advancePos.x && myP.y === advancePos.y);
      const isAdvanceControlled = myActivePieces.some((myP) =>
        canPieceAttackSquare(board, { x: myP.x, y: myP.y }, advancePos, myP.piece)
      );

      const isFlankPawn = oppCov.x === 0 || oppCov.x === 8;
      if (isOccupiedByUs) {
        // Chiếm đóng trực tiếp nắp mở của Tốt úp đối phương (Tốt biên giảm thưởng để tránh hút quân ra biên)
        score += isFlankPawn ? 15 : isEarlyWithoutFullSet ? 90 : isOpening ? 50 : 25;
      } else if (isAdvanceControlled) {
        // Khóa nắp hàng Tốt úp: Tốt úp đối phương không thể tiến lên
        score += isFlankPawn ? 10 : isEarlyWithoutFullSet ? 65 : isOpening ? 35 : isMidgame ? 20 : 10;
      }
    }

    // 2. Đè và ghim ép quân úp đối phương ("Pressure & Pinning"):
    const attackers = myActivePieces.filter((myP) =>
      canPieceAttackSquare(board, { x: myP.x, y: myP.y }, oppCov, myP.piece)
    );
    if (attackers.length > 0) {
      const isDefended = isSquareDefendedBy(board, oppCov, opponentColor);
      const isFlankPawn = oppCov.initialRole === 'soldier' && (oppCov.x === 0 || oppCov.x === 8);
      const isAdvisor = oppCov.initialRole === 'advisor';

      if (isFlankPawn) {
        // Tốt úp biên: không có giá trị chiến lược trung tâm, tuyệt đối không thưởng lớn để tránh kéo quân (đặc biệt Xe ngửa) dạt biên
        score += isDefended ? 5 : 15;
      } else if (isAdvisor) {
        // Sĩ úp: không khuyến khích đơn độc uy hiếp nắp sĩ đáy khi chưa có thế công sát cung tổng lực
        score += isDefended ? 10 : 25;
      } else if (!isDefended) {
        // Đè Tốt tâm (Binh 3/5/7), Mã úp, Pháo úp đối thủ vô căn:
        // Áp lực chiến thuật đe dọa quân úp vô căn (+35 đến +50 điểm):
        // Không cộng quá lớn để khi AI thực sự ĂN quân điểm số sẽ tăng mạnh, khuyến khích AI ăn quân ngay!
        score += isOpening ? 50 : isMidgame ? 35 : 20;
      } else {
        // Ghim ép quân giữ của đối thủ:
        score += isEarlyWithoutFullSet ? 50 : 25;
      }
    }
  }

  // 3. Khống chế mắt Tượng & chân Mã úp của đối phương:
  if (isEarlyWithoutFullSet) {
    const oppHorseDeployY = opponentColor === 'black' ? 2 : 7;
    for (const hx of [1, 7]) {
      const deployPos = { x: hx, y: oppHorseDeployY };
      const isControlled = myActivePieces.some((myP) =>
        canPieceAttackSquare(board, { x: myP.x, y: myP.y }, deployPos, myP.piece)
      );
      if (isControlled) {
        score += 35; // Khóa chân triển khai Mã úp đối thủ
      }
    }
  }

  // 4. Phạt nếu Tốt úp của chính mình bị đối phương khóa:
  const myPawnRank = color === 'black' ? 3 : 6;
  const myPawnAdvanceY = color === 'black' ? 4 : 5;
  for (const myCov of myCoveredPieces) {
    if (myCov.y === myPawnRank) {
      const advancePos = { x: myCov.x, y: myPawnAdvanceY };
      const isOccupiedByOpp = oppActivePieces.some((oppP) => oppP.x === advancePos.x && oppP.y === advancePos.y);
      const isAdvanceControlled = oppActivePieces.some((oppP) =>
        canPieceAttackSquare(board, { x: oppP.x, y: oppP.y }, advancePos, oppP.piece)
      );
      if (isOccupiedByOpp) {
        score -= isEarlyWithoutFullSet ? 80 : isOpening ? 45 : 20;
      } else if (isAdvanceControlled) {
        score -= isEarlyWithoutFullSet ? 60 : isOpening ? 30 : isMidgame ? 20 : 10;
      }
    }
  }

  // 5. ƯU TIÊN MỞ CÂY HÀNG TỐT TRƯỚC HÀNG DƯỚI (TRIẾT LÝ KHAI CỤC CỜ ÚP):
  // Phạt việc để các cây úp ở hàng Tốt nằm im chưa mở khi đang ở khai cuộc:
  if (isOpening) {
    for (const myCov of myCoveredPieces) {
      if (myCov.y === myPawnRank) {
        if (myCov.x === 2 || myCov.x === 6) {
          score -= 30; // Chưa mở Binh 3/7 thông lộ Mã & Tượng
        } else if (myCov.x === 4) {
          score -= 25; // Chưa mở Binh 5 chiếm trung lộ
        } else {
          score -= 15; // Chưa mở Binh 1/9 biên
        }
      }
    }
    for (const oppCov of oppCoveredPieces) {
      if (oppCov.y === oppPawnRank) {
        if (oppCov.x === 2 || oppCov.x === 6) {
          score += 30;
        } else if (oppCov.x === 4) {
          score += 25;
        } else {
          score += 15;
        }
      }
    }
    if (myCoveredPieces.length >= 13) {
      score -= 20; // Còn quá nhiều quân úp nằm im
    }
  }

  // C. KIỂM SOÁT BỜ SÔNG (Ranks 4 & 5 - River Dominance):
  // Ưu tiên chiếm giữ tuyến Hà ngăn chặn quân úp đối phương vượt sông (+20 điểm)
  if (isOpening || isMidgame) {
    for (const myP of myActivePieces) {
      if (myP.y === 4 || myP.y === 5) {
        score += 20;
      }
    }
    for (const oppP of oppActivePieces) {
      if (oppP.y === 4 || oppP.y === 5) {
        score -= 20;
      }
    }
  }

  // Reward Sĩ/Tượng only when their revealed diagonal controls intersect.
  const myRevealedAdvisors = myActivePieces.filter(
    (p) => !p.piece.isCovered && !p.piece.simulatedRevealed && p.piece.trueRole === 'advisor'
  );
  const myRevealedElephants = myActivePieces.filter(
    (p) => !p.piece.isCovered && !p.piece.simulatedRevealed && p.piece.trueRole === 'elephant'
  );
  if (myRevealedAdvisors.some((advisor) => myRevealedElephants.some((elephant) => hasAdvisorElephantCrossing(board, advisor, elephant)))) {
    score += 100;
  }

  const oppRevealedAdvisors = oppActivePieces.filter(
    (p) => !p.piece.isCovered && !p.piece.simulatedRevealed && p.piece.trueRole === 'advisor'
  );
  const oppRevealedElephants = oppActivePieces.filter(
    (p) => !p.piece.isCovered && !p.piece.simulatedRevealed && p.piece.trueRole === 'elephant'
  );
  if (oppRevealedAdvisors.some((advisor) => oppRevealedElephants.some((elephant) => hasAdvisorElephantCrossing(board, advisor, elephant)))) {
    score -= 100;
  }

  // TACTICAL PRESERVATION OF REVEALED COMBAT PIECES:
  // "Mã, pháo, xe, sĩ, tượng đều phải có giá trị cao hơn là việc mở cây úp bạn ạ."
  // Tuyệt đối không để quân chiến ngửa bị bắt không hoặc thí bừa để mở úp!
  for (const myP of myActivePieces) {
    if (!myP.piece.isCovered && !myP.piece.simulatedRevealed && myP.piece.trueRole !== 'king') {
      const attackers = oppActivePieces.filter((oppP) =>
        canPieceAttackSquare(board, { x: oppP.x, y: oppP.y }, myP, oppP.piece)
      );
      if (attackers.length > 0) {
        const isDefended = isSquareDefendedBy(board, myP, color);
        const myVal = PIECE_VALUES[myP.piece.trueRole as PieceRole] || 200;
        const isCombat = isRevealedCombatPiece(myP.piece);

        if (!isDefended) {
          // Quân chiến ngửa bị treo không có căn giữ: Phạt cực nặng (1.55x giá trị quân)!
          // Mất Mã (-713), mất Pháo (-806), mất Xe (-1550), mất Sĩ (-542), mất Tượng (-480)
          score -= Math.round(myVal * (isCombat ? 1.55 : 1.1));
        } else {
          // Có căn nhưng bị quân giá trị thấp hơn (Tốt, Quân úp, hoặc quân chiến nhỏ hơn) đe dọa:
          const lowestAttackerVal = Math.min(
            ...attackers.map((a) => (a.piece.isCovered ? 200 : PIECE_VALUES[a.piece.trueRole as PieceRole] || 120))
          );
          if (lowestAttackerVal < myVal) {
            // Net loss if traded: mất cây chiến đổi lấy quân giá trị thấp hơn!
            score -= Math.round((myVal - lowestAttackerVal) * 1.25);
          } else {
            score -= 15; // Contested
          }
        }
      }
    }
  }

  for (const oppP of oppActivePieces) {
    if (!oppP.piece.isCovered && !oppP.piece.simulatedRevealed && oppP.piece.trueRole !== 'king') {
      const attackers = myActivePieces.filter((myP) =>
        canPieceAttackSquare(board, { x: myP.x, y: myP.y }, oppP, myP.piece)
      );
      if (attackers.length > 0) {
        const isDefended = isSquareDefendedBy(board, oppP, opponentColor);
        const oppVal = PIECE_VALUES[oppP.piece.trueRole as PieceRole] || 200;
        if (!isDefended) {
          // Áp lực tấn công quân đối phương đang bị treo vô căn (tactical threat pressure):
          // Chỉ thưởng một mức tượng trưng (+30 đến +60 điểm) để khuyến khích tạo thế dọa bắt quân,
          // TUYỆT ĐỐI không cộng trước 85% giá trị quân vì nếu cộng trước thì khi AI thực sự ĂN quân
          // sẽ không thấy tăng điểm bao nhiêu, dẫn đến AI "bỏ qua không ăn" để đi mở quân úp khác!
          score += Math.min(60, Math.round(oppVal * 0.06));
        } else {
          const lowestAttackerVal = Math.min(
            ...attackers.map((a) => (a.piece.isCovered ? myCoveredVal : PIECE_VALUES[a.piece.trueRole as PieceRole] || 120))
          );
          if (lowestAttackerVal < oppVal) {
            score += Math.min(60, Math.round((oppVal - lowestAttackerVal) * 0.08));
          } else {
            score += 10;
          }
        }
      }
    }
  }

  // Check state pressure (immediate King safety)
  const myCheck = isKingInCheck(board, color);
  if (myCheck.inCheck) score -= 140;

  const oppCheck = isKingInCheck(board, opponentColor);
  if (oppCheck.inCheck) score += 55;

  return score;
}

/**
 * Đánh giá chuyên sâu cho nước đi của XE NGỬA (Revealed Chariot):
 * Trong Cờ Tướng và Cờ Úp, Xe ngửa là quân chủ lực mạnh nhất (1000 điểm).
 * Các nguyên tắc cốt tử:
 * 1. "Tuyệt đối không thí Xe đổi úp có căn": Mang Xe ngửa đâm vào quân úp (hoặc quân nhỏ) có căn giữ của đối thủ
 *    -> Tự sát chết Xe (Blunder -25000).
 * 2. "Xe ngửa tham Tốt úp biên": Xe ngửa dạt ra biên (cột 0 hoặc cột 8) để ăn Tốt úp biên ở khai - trung cuộc,
 *    làm mất 2-3 nước tiên, bỏ bê trung lộ và bị cô lập ngoài rìa bàn cờ (Penalty -1500).
 * 3. "Xe ngửa lao vào góc ăn Sĩ úp": Xe đơn độc đâm sâu xuống đáy cung ăn Sĩ úp khi không có thế chiếu sát,
 *    bị kẹt trong cung hiểm và mất tiên (Penalty -1500).
 * 4. "Xe dạt biên vô nghĩa": Xe ngửa đi vào cột 0 hoặc cột 8 khi không ăn quân ở khai cuộc (Penalty -250).
 */
export function evaluateRevealedChariotMove(
  board: (any | null)[][],
  move: DetailedMove,
  oppColor: PlayerColor,
  totalPieces: number
): { penalty: number; isFatalBlunder: boolean } {
  const isRevealedChariot = !move.piece.isCovered && !move.piece.simulatedRevealed && move.piece.trueRole === 'chariot';
  if (!isRevealedChariot) return { penalty: 0, isFatalBlunder: false };

  const nextBoard = simulateMove(board, move.from, move.to);
  const isDefended =
    isSquareDefendedBy(board, move.to, oppColor) ||
    isSquareDefendedBy(nextBoard, move.to, oppColor);

  if (move.captured) {
    const isVictimCovered = move.captured.isCovered || move.captured.simulatedRevealed;
    const victimRole = move.captured.initialRole || move.captured.trueRole;

    // 1. Thí Xe ngửa vào ô có căn giữ (Suicidal sacrifice on defended square):
    if (isDefended) {
      const victimTrueRole = move.captured.trueRole as PieceRole;
      const victimVal = isVictimCovered ? 350 : (PIECE_VALUES[victimTrueRole] || 100);
      if (isVictimCovered || victimVal < 800) {
        return { penalty: 25000, isFatalBlunder: true };
      }
    }

    // 2. Xe ngửa tham ăn Tốt úp biên (Flank pawn úp at x=0 or x=8):
    if (isVictimCovered && victimRole === 'soldier' && (move.to.x === 0 || move.to.x === 8)) {
      if (totalPieces >= 14) {
        return { penalty: 1500, isFatalBlunder: false };
      }
    }

    // 3. Xe ngửa lao vào góc ăn Sĩ úp (Advisor úp in palace):
    if (isVictimCovered && victimRole === 'advisor') {
      const inCheck = isKingInCheck(nextBoard, oppColor).inCheck;
      if (totalPieces >= 14 && !inCheck) {
        return { penalty: 1500, isFatalBlunder: false };
      }
    }
  } else {
    // Nước đi không ăn quân của Xe ngửa:
    // Tránh việc Xe ngửa tự ý dạt ra biên (cột 0 hoặc cột 8) ở khai - trung cuộc
    if ((move.to.x === 0 || move.to.x === 8) && totalPieces >= 18) {
      return { penalty: 250, isFatalBlunder: false };
    }

    // Tránh Xe ngửa đơn độc lao xuống góc đáy cung đối thủ khi không có chiếu
    const oppBackRank = oppColor === 'black' ? 0 : 9;
    if (move.to.y === oppBackRank && (move.to.x === 3 || move.to.x === 5) && totalPieces >= 18) {
      const inCheck = isKingInCheck(nextBoard, oppColor).inCheck;
      if (!inCheck) {
        return { penalty: 400, isFatalBlunder: false };
      }
    }
  }

  return { penalty: 0, isFatalBlunder: false };
}

/**
 * Đánh giá tính an toàn tuyệt đối khi MỞ QUÂN ÚP (đặc biệt các cây úp hàng Tốt / hàng trên):
 * NGUYÊN TẮC CỐT TỬ CỦA KỲ THỦ CỜ ÚP:
 * "Khi mở cây úp hàng trên, cũng tránh việc mở ra là bị ăn ngay khi chưa có căn!"
 * Nếu ô đích đến (move.to) đang bị đối phương nhắm đánh/tấn công MÀ bên mình KHÔNG CÓ CĂN GIỮ:
 * -> Quân vừa mở ra sẽ bị đối phương ăn không ngay tức khắc (free capture)!
 * -> Nếu lật ra Xe, Pháo, Mã, Sĩ, Tượng thì coi như dâng biếu quân chiến (Đại thảm họa);
 *    kể cả lật ra Tốt cũng mất quân & mất tiên.
 */
export function evaluateCoveredMoveSafety(
  board: (any | null)[][],
  move: DetailedMove,
  oppColor: PlayerColor
): { isFatalBlunder: boolean; penalty: number } {
  if (!move.piece.isCovered) return { isFatalBlunder: false, penalty: 0 };

  // NẾU LÀ NƯỚC ĂN QUÂN (move.captured):
  // Ăn bất kỳ quân nào của đối phương (Xe, Pháo, Mã, Sĩ, Tượng, Tốt ngửa hay quân úp) đều là nước ăn quân có giá trị,
  // đồng thời lật mở nắp úp tạo ưu thế -> Tuyệt đối KHÔNG PHẢI BLUNDER!
  if (move.captured) {
    return { isFatalBlunder: false, penalty: 0 };
  }

  const myColor = move.piece.color;
  const nextBoard = simulateMove(board, move.from, move.to);

  // 1. Kiểm tra xem ô đích đến (move.to) có bị đối thủ tấn công/nhắm ăn không:
  const isAttackedByOpp = isSquareDefendedBy(nextBoard, move.to, oppColor);
  if (!isAttackedByOpp) {
    return { isFatalBlunder: false, penalty: 0 };
  }

  // 2. Ô đích đến bị đối thủ đe dọa: Kiểm tra xem bên mình CÓ CĂN GIỮ KHÔNG?
  const hasFriendlyRoot = isSquareDefendedBy(nextBoard, move.to, myColor);

  if (!hasFriendlyRoot) {
    // HOÀN TOÀN CHƯA CÓ CĂN GIỮ (VÔ CĂN) KHI MỞ QUÂN VÀO Ô TRỐNG:
    // "Khi mở cây úp hàng trên, cũng tránh việc mở ra là bị ăn ngay khi chưa có căn" -> ĐẠI BLUNDER TỰ SÁT (-25000 điểm)!
    return { isFatalBlunder: true, penalty: 25000 };
  }

  // 3. Có căn giữ, nhưng ô đích đến đang bị đối phương dòm ngó:
  return { isFatalBlunder: false, penalty: 120 };
}

/**
 * CẤM KỴ TUYỆT ĐỐI CỜ ÚP: DÂNG QUÂN CHO QUÂN ÚP ĐỐI PHƯƠNG ĂN ĐỂ ĐỐI THỦ MỞ NẮP!
 * "Tự nhiên lại ấn tốt biên thật lên cho đối thủ có cơ hội mở úp là sao?"
 * - Khi đi một quân (kể cả Tốt ngửa thật) vào ô bị quân úp đối thủ ăn được:
 *   1. Nếu ô đích đến KHÔNG CÓ CĂN BẢO VỆ: Đây là nước tự sát dâng quân biếu đối thủ mở nắp (Blunder cực nặng -30000)!
 *   2. TÌNH HUỐNG TỐT NGỬA DÂNG VÀO MỒM TỐT ÚP:
 *      Khi Tốt ngửa (đặc biệt Tốt biên ngửa) ở rank 4, Tốt úp đối phương ở rank 6.
 *      Đang đứng yên khóa nắp đối thủ ở bờ sông, tự nhiên ấn Tốt lên rank 5 dâng cho Tốt úp đối thủ ăn mở nắp!
 *      Đối thủ ăn Tốt của mình và lật nắp mở úp (có thể mở ra Xe, Pháo, Mã hoặc thông lộ), trong khi nếu mình đứng im thì Tốt úp đối thủ bị khóa chặt không dám lên!
 *      Kể cả ô rank 5 có căn sau lưng (Xe, Pháo giữ), việc tự nạp Tốt cho quân úp đối phương ăn mở nắp là sai lầm chiến thuật cực kỳ nghiêm trọng (-25000 điểm)!
 *   3. CÂY CHIẾN NGỬA (Xe, Pháo, Mã, Sĩ, Tượng) DÂNG VÀO Ô BỊ QUÂN ÚP ĐỐI THỦ ĂN:
 *      Quân úp ăn đổi cây chiến ngửa của ta là "đổi rác lấy vàng" cho đối thủ (-25000 điểm)!
 */
export function evaluateSacrificeToOpponentCoveredPiece(
  board: (any | null)[][],
  move: DetailedMove,
  oppColor: PlayerColor
): { isFatalBlunder: boolean; penalty: number } {
  if (move.captured) {
    return { isFatalBlunder: false, penalty: 0 };
  }

  const nextBoard = simulateMove(board, move.from, move.to);
  const myColor = move.piece.color;

  for (let y = 0; y < BOARD_ROWS; y++) {
    for (let x = 0; x < BOARD_COLS; x++) {
      const oppP = nextBoard[y][x];
      if (oppP && oppP.color === oppColor && oppP.isCovered) {
        if (canPieceAttackSquare(nextBoard, { x, y }, move.to, oppP)) {
          const isDefendedByMe = isSquareDefendedBy(nextBoard, move.to, myColor);

          // 1. Ô đích đến vô căn: Dâng không quân cho quân úp đối phương ăn mở nắp
          if (!isDefendedByMe) {
            return { isFatalBlunder: true, penalty: 30000 };
          }

          // 2. Tốt ngửa thật dâng vào mồm Tốt úp đối phương ("Ấn tốt biên thật lên cho đối thủ mở úp")
          const isMyPawn = !move.piece.isCovered && move.piece.trueRole === 'soldier';
          const isOppPawnSlot = oppP.initialRole === 'soldier';
          if (isMyPawn && isOppPawnSlot) {
            return { isFatalBlunder: true, penalty: 25000 };
          }

          // 3. Cây chiến ngửa dâng vào ô bị quân úp đối phương ăn
          if (!move.piece.isCovered && isRevealedCombatPiece(move.piece)) {
            return { isFatalBlunder: true, penalty: 25000 };
          }
        }
      }
    }
  }

  return { isFatalBlunder: false, penalty: 0 };
}

/**
 * Đánh giá cơ hội ăn quân đối phương (đặc biệt là quân ngửa không có căn giữ):
 * GIẢI QUYẾT TRIỆT ĐỂ VẤN ĐỀ:
 * "Tại sao máy nhìn thấy xe ngửa của tôi, rõ ràng là không có căn mà lại không ăn?"
 * "Tại sao khi quân xe của tôi nằm trong khả năng ăn của máy, lại còn không có căn giữ mà máy lại bỏ qua, không ăn nhỉ?"
 *
 * Trong Cờ Tướng và Cờ Úp:
 * - Khi quân Xe ngửa của đối thủ (1000 điểm) nằm trong tầm ăn và KHÔNG CÓ CĂN GIỮ (vô căn):
 *   Đây là cơ hội chiến thuật số 1 (Free Chariot)! AI PHẢI ĂN NGAY LẬP TỨC!
 *   Ưu tiên này đè bẹp mọi nước mở úp hay đi quân chiến thuật khác!
 * - Khi Xe ngửa đối thủ có căn nhưng ta ăn bằng quân giá trị nhỏ hơn (Tốt, Sĩ, Tượng, Mã, Pháo, Quân úp):
 *   Đổi quân lời to (Positive material exchange), AI cũng phải ưu tiên ăn!
 * - Tương tự với Pháo ngửa (520) và Mã ngửa (460) không có căn: AI phải chớp thời cơ ăn ngay!
 */
export function evaluateCaptureBonus(
  board: (any | null)[][],
  move: DetailedMove,
  oppColor: PlayerColor
): number {
  if (!move.captured) return 0;

  const isVictimCovered = move.captured.isCovered || move.captured.simulatedRevealed;
  const victimRole: PieceRole = isVictimCovered
    ? (move.captured.initialRole || 'soldier')
    : (move.captured.trueRole as PieceRole);
  const victimVal = isVictimCovered ? 250 : (PIECE_VALUES[victimRole] || 120);

  const isAttackerCovered = move.piece.isCovered || move.piece.simulatedRevealed;
  const attackerRole: PieceRole = isAttackerCovered
    ? (move.piece.initialRole || 'soldier')
    : (move.piece.trueRole as PieceRole);
  const attackerVal = isAttackerCovered ? 250 : (PIECE_VALUES[attackerRole] || 120);

  // Kiểm tra xem quân bị ăn có căn giữ không (trên bàn cờ trước khi ăn)
  const isVictimDefended = isSquareDefendedBy(board, move.to, oppColor);
  const nextBoard = simulateMove(board, move.from, move.to);
  const isAttackerSafeAfter = !isSquareDefendedBy(nextBoard, move.to, oppColor);

  let bonus = 0;

  // 1. ĂN QUÂN CHIẾN NGỬA CỦA ĐỐI THỦ (Xe, Pháo, Mã, Sĩ, Tượng):
  if (!isVictimCovered) {
    if (victimRole === 'chariot') {
      if (!isVictimDefended) {
        // ĂN XE NGỬA VÔ CĂN (Free Chariot capture!):
        // Thưởng cực lớn (+6500 điểm) để tuyệt đối không bao giờ bỏ qua!
        bonus += 6500;
        if (isAttackerSafeAfter) {
          bonus += 1500; // Ăn xong an toàn tuyệt đối
        }
      } else {
        // Xe đối thủ có căn: nếu quân ta ăn là quân giá trị <= 1000 (Tốt, Sĩ, Tượng, Mã, Pháo, Quân úp, hoặc Xe đổi Xe):
        if (attackerVal <= 1000) {
          bonus += 3000 + (1000 - attackerVal) * 3;
        }
      }
    } else if (victimRole === 'cannon' || victimRole === 'horse') {
      if (!isVictimDefended) {
        // Ăn Pháo / Mã ngửa không có căn:
        bonus += 3800;
        if (isAttackerSafeAfter) bonus += 1000;
      } else if (attackerVal < victimVal) {
        // Đổi lời (VD: Tốt/quân úp ăn Pháo/Mã có căn):
        bonus += 1800 + (victimVal - attackerVal) * 2;
      } else if (attackerVal === victimVal) {
        bonus += 600; // Đổi ngang Pháo lấy Pháo, Mã lấy Mã
      }
    } else if (victimRole === 'advisor' || victimRole === 'elephant') {
      if (!isVictimDefended) {
        bonus += 2400;
        if (isAttackerSafeAfter) bonus += 600;
      } else if (attackerVal < victimVal) {
        bonus += 1000;
      }
    } else if (victimRole === 'soldier') {
      if (!isVictimDefended) {
        bonus += 1600;
        if (isAttackerSafeAfter) bonus += 400;
      } else if (attackerVal <= victimVal) {
        bonus += 350;
      }
    }
  } else {
    // 2. ĂN QUÂN ÚP ĐỐI THỦ:
    if (!isVictimDefended) {
      // Ăn quân úp vô căn: lời nguyên một quân úp (~360đ) + mở nắp úp + diệt tiềm năng đối phương!
      bonus += 1800;
      if (isAttackerSafeAfter) {
        bonus += 500;
      }
    } else {
      bonus += 450;
    }
  }

  return bonus;
}

/**
 * Đánh giá nước Tướng thượng lầu ăn quân khi có quân khác ăn thay:
 * Trong Cờ Tướng & Cờ Úp:
 * "Tướng bất xuất cung / Tướng không thượng lầu".
 * Nếu một quân đối phương xâm nhập cung (như vào ô (4,1) trước mặt Tướng hoặc các ô trong cung):
 * - Nếu dùng Sĩ / Sĩ úp / Tượng úp / Mã... ăn lên: vừa bắt giặc, vừa mở nắp úp, vừa giữ Tướng an toàn dưới đáy!
 * - Nếu dùng Tướng ăn lên: Tướng bị lôi lên lầu 2, tim cung hở toang hoác, mất thế phòng ngự, bỏ lỡ cơ hội mở úp!
 * -> PHẠT CỰC NẶNG nước Tướng ăn lên nếu có quân đồng minh khác có thể ăn thay!
 */
export function evaluatePalaceCaptureTactics(
  move: DetailedMove,
  allLegalMoves: DetailedMove[]
): number {
  if (!move.captured) return 0;
  let bonus = 0;
  const isPalace =
    move.piece.color === 'black'
      ? move.to.y <= 2 && move.to.x >= 3 && move.to.x <= 5
      : move.to.y >= 7 && move.to.x >= 3 && move.to.x <= 5;

  if (isPalace) {
    if (move.piece.trueRole === 'king') {
      // Tướng ăn quân trong cung:
      // Kiểm tra xem có quân đồng minh nào khác (đặc biệt Sĩ, Sĩ úp, Tượng, Mã...) cũng có thể ăn được quân này không:
      const canOtherPieceCapture = allLegalMoves.some(
        (m) => m.piece.trueRole !== 'king' && m.to.x === move.to.x && m.to.y === move.to.y
      );
      if (canOtherPieceCapture) {
        // Có quân khác ăn được mà lại lôi Tướng lên ăn: Đại sai lầm chiến thuật (-3500 điểm)!
        bonus -= 3500;
      }
    } else {
      // Quân khác (đặc biệt Sĩ, Sĩ úp, Tượng úp...) ăn quân địch xâm nhập cung:
      // Thưởng rất lớn (+1400 điểm): Vừa bảo vệ Tướng ở đáy, vừa diệt địch, vừa mở nắp cờ úp!
      bonus += 1400;
      if (move.piece.isCovered) {
        bonus += 500; // Thêm điểm vì mở được nắp úp quý giá!
      }
    }
  }

  return bonus;
}

// Move scoring heuristic (MVV-LVA: Most Valuable Victim - Least Valuable Attacker)
function scoreMoveForOrdering(
  move: DetailedMove,
  myCoveredVal = 360,
  oppCoveredVal = 360,
  hasFullSet = false,
  isOpening = true,
  board?: (any | null)[][],
  totalPieces = 32
): number {
  let score = 0;
  const oppColor: PlayerColor = move.piece.color === 'red' ? 'black' : 'red';

  // Định hướng chiến thuật chuyên biệt cho Xe ngửa (Revealed Chariot):
  if (board && board.length > 0) {
    const chariotEval = evaluateRevealedChariotMove(board, move, oppColor, totalPieces);
    if (chariotEval.isFatalBlunder) {
      score -= 30000;
    } else if (chariotEval.penalty > 0) {
      score -= chariotEval.penalty;
    }

    // CẤM KỴ: Mở cây úp hàng trên vào ô bị ăn ngay khi chưa có căn giữ:
    if (move.piece.isCovered) {
      const coveredSafety = evaluateCoveredMoveSafety(board, move, oppColor);
      if (coveredSafety.isFatalBlunder) {
        score -= 30000;
      } else if (coveredSafety.penalty > 0) {
        score -= coveredSafety.penalty;
      }
    }

    // CẤM KỴ: Dâng quân (đặc biệt Tốt ngửa thật) vào ô bị quân úp đối phương ăn mở nắp:
    const sacrificeEval = evaluateSacrificeToOpponentCoveredPiece(board, move, oppColor);
    if (sacrificeEval.isFatalBlunder) {
      score -= 35000;
    } else if (sacrificeEval.penalty > 0) {
      score -= sacrificeEval.penalty;
    }
  }

  // 1. Captures
  if (move.captured) {
    const isVictimHidden = move.captured.isCovered || move.captured.simulatedRevealed;
    const isAttackerHidden = move.piece.isCovered || move.piece.simulatedRevealed;

    const victimVal = isVictimHidden
      ? oppCoveredVal + getCoverMobilityBonus(move.captured.initialRole)
      : PIECE_VALUES[move.captured.trueRole as PieceRole] || 100;
    const attackerVal = isAttackerHidden
      ? myCoveredVal + getCoverMobilityBonus(move.piece.initialRole)
      : PIECE_VALUES[move.piece.trueRole as PieceRole] || 100;

    // MVV-LVA formula: Most Valuable Victim - Least Valuable Attacker
    score += 10000 + victimVal * 10 - attackerVal;

    // ƯU TIÊN HÀNG ĐẦU CHO ĂN XE NGỬA VÔ CĂN & CÁC CÂY CHIẾN VÔ CĂN:
    if (!isVictimHidden && board && board.length > 0) {
      const isVictimDefended = isSquareDefendedBy(board, move.to, oppColor);
      if (!isVictimDefended) {
        if (move.captured.trueRole === 'chariot') {
          score += 35000; // Đưa nước ăn Xe ngửa vô căn lên vị trí số 1 tuyệt đối
        } else if (move.captured.trueRole === 'cannon' || move.captured.trueRole === 'horse') {
          score += 18000;
        } else if (move.captured.trueRole === 'advisor' || move.captured.trueRole === 'elephant') {
          score += 12000;
        }
      }
    }

    // Ăn quân úp đối phương khi chưa đủ bộ Xe Pháo Mã ở khai cuộc (chỉ ưu tiên cho quân úp đổi quân úp)
    if (isVictimHidden && isOpening && !hasFullSet && move.piece.isCovered) {
      score += 240;
    }

    // Nếu quân ngửa thật (Xe, Pháo, Mã, Sĩ, Tượng) ăn quân úp đối phương trên ô có căn giữ:
    if (!isAttackerHidden && isVictimHidden && board && board.length > 0) {
      const isDefended = isSquareDefendedBy(board, move.to, oppColor);
      if (isDefended) {
        const attRole = move.piece.trueRole as PieceRole;
        if (attRole === 'chariot') {
          score -= 30000;
        } else if (attRole === 'cannon' || attRole === 'horse') {
          score -= 15000; // Đổi quân ngửa thật lấy quân úp có căn là sai lầm nặng
        } else if (attRole === 'advisor' || attRole === 'elephant') {
          score -= 12000; // Sĩ/Tượng ngửa đổi quân úp có căn cũng là sai lầm nặng
        }
      }
    }

    // DYNAMIC POOL PROBABILITY TRADING ("Đếm Cây"):
    // In Cờ Úp, as major pieces (Chariots, Cannons, Horses) are revealed from a player's pool,
    // their remaining covered pieces decrease in expected value (diluted with Pawns/Advisors/Elephants).
    // If our pool is degraded (myCoveredVal low) while opponent's pool is rich (oppCoveredVal high):
    // Trading our covered piece (almost certainly a pawn/advisor) for opponent's covered piece
    // (which may hide a Chariot or Cannon) is a high-EV "đổi rác lấy vàng" play!
    if (move.piece.isCovered && move.captured.isCovered) {
      const poolAdvantage = oppCoveredVal - myCoveredVal;
      // Khi poolAdvantage > 0 (Rọ mình đã cạn cây to, rọ địch còn nhiều hàng xịn):
      // AI được cộng thưởng điểm rất lớn (poolAdvantage * 12 + 450) cho các nước chủ động mang quân úp (kể cả Pháo úp) đi đập vào quân úp đối phương ("đổi rác lấy vàng").
      // Khi poolAdvantage <= 0: AI quý con Pháo úp, giữ lại để kiểm soát bàn cờ và mở Tốt 3/7 trước.
      if (poolAdvantage > 0) {
        score += poolAdvantage * 12 + 450;
      } else {
        score += poolAdvantage * 12;
      }
    }
  }

  // Ưu tiên chạy thoát quân chiến ngửa (Xe, Pháo, Mã, Sĩ, Tượng) nếu đang bị bắt không có căn:
  if (board && board.length > 0 && !move.piece.isCovered && !move.piece.simulatedRevealed && isRevealedCombatPiece(move.piece)) {
    const wasDefended = isSquareDefendedBy(board, move.from, move.piece.color);
    const wasAttacked = isSquareDefendedBy(board, move.from, oppColor);
    if (wasAttacked && !wasDefended) {
      const willBeAttacked = isSquareDefendedBy(board, move.to, oppColor);
      const willBeDefended = isSquareDefendedBy(board, move.to, move.piece.color);
      if (!willBeAttacked || willBeDefended) {
        score += 6000; // Ưu tiên hàng đầu cho việc bảo toàn cây chiến ngửa!
      }
    }
  }

  // Ưu tiên chạy thoát / tiến tốt thoát đòn cho quân úp nếu đang bị bắt không có căn:
  // "Tôi lên tượng nhìn vào tốt úp 3 của đối thủ -> máy phải tiến tốt thoát đòn hoặc ứng cứu"
  // "khi tôi ra được xe thì máy không giữ úp thế? -> phải giữ úp khi bị xe nhìn!"
  if (board && board.length > 0 && (move.piece.isCovered || move.piece.simulatedRevealed)) {
    const wasDefended = isSquareDefendedBy(board, move.from, move.piece.color);
    const wasAttacked = isSquareDefendedBy(board, move.from, oppColor);
    if (wasAttacked && !wasDefended) {
      const willBeAttacked = isSquareDefendedBy(board, move.to, oppColor);
      const willBeDefended = isSquareDefendedBy(board, move.to, move.piece.color);
      if (!willBeAttacked || willBeDefended) {
        score += 3500; // Ưu tiên thoát hiểm và mở nắp khi quân úp đang bị đối phương đe dọa trực tiếp!
      }
    }
  }

  // GIỮ ÚP KHI BỊ XE NHÌN: Kiểm tra nếu nước đi này cứu hoặc giữ căn cho quân úp đang bị Xe địch đe dọa
  if (board && board.length > 0) {
    const oppChariots = getOpponentActiveChariots(board, oppColor);
    if (oppChariots.length > 0) {
      const threatenedByChariotBefore = findCoveredPiecesThreatenedByChariot(board, move.piece.color);
      if (threatenedByChariotBefore.length > 0) {
        const nextB = simulateMove(board, move.from, move.to);
        const threatenedByChariotAfter = findCoveredPiecesThreatenedByChariot(nextB, move.piece.color);
        const isSaved = threatenedByChariotAfter.length < threatenedByChariotBefore.length ||
          (threatenedByChariotBefore.some((p) => !p.isDefended) && threatenedByChariotAfter.every((p) => p.isDefended));
        if (isSaved) {
          score += 3600; // Thưởng cực cao cho nước giữ úp thành công trước đòn Xe đối thủ!
        }
      }
    }
  }

  // 2. Developing / uncovering moves:
  // TRIẾT LÝ MỞ QUÂN KHAI CỤC:
  // Ưu tiên mở những cây úp ở hàng tốt trước khi mở những cây ở hàng dưới!
  if (move.piece.isCovered) {
    const role = move.piece.initialRole;
    const myPawnRank = move.piece.color === 'black' ? 3 : 6;
    const myBottomRank = move.piece.color === 'black' ? 0 : 9;
    const myCannonRank = move.piece.color === 'black' ? 2 : 7;
    const isPawnRowMove = move.from.y === myPawnRank;
    const isBottomRowMove = move.from.y === myBottomRank;
    const isCannonRowMove = move.from.y === myCannonRank;

    const hasPawnRowCovers =
      board && board.length > 0 ? hasCoveredPawnsOnPawnRow(board, move.piece.color) : true;
    const oppChariots = board && board.length > 0 ? getOpponentActiveChariots(board, oppColor) : [];

    if (isOpening) {
      if (isPawnRowMove) {
        // Nước mở cây hàng Tốt: Ưu tiên phát triển khai cuộc số 1!
        // "Mở Tốt 3 & Tốt 7, cả Tốt biên cũng phải ưu tiên mở trước, kể cả Tốt 5 nếu cần chứ"
        let pawnOpeningScore = 320;
        if (move.from.x === 2 || move.from.x === 6) {
          pawnOpeningScore += 90; // Binh 3 & 7: thông lộ Mã & Tượng (+410)
        } else if (move.from.x === 4) {
          pawnOpeningScore += 70; // Binh 5: tranh trung lộ (+390)
        } else {
          pawnOpeningScore += 60;  // Binh biên 1 & 9: mở biên (+380)
        }

        // TRANH TIÊN KHÓA NẮP & THOÁT ĐÒN:
        // "Phải tranh thủ mở những con tốt mà đối thủ chưa kịp mở chứ?"
        if (board && board.length > 0) {
          const isThreatened = isSquareDefendedBy(board, move.from, oppColor);
          if (isThreatened) {
            // Nước tiến tốt thoát đòn khi đang bị đối phương (Tượng, Pháo, Mã, Xe...) đe dọa ăn trực tiếp!
            // Tuyệt đối không phạt vì đối thủ đã mở hay chưa, mà thưởng rất lớn để ưu tiên số 1!
            pawnOpeningScore += 600;
          } else {
            const oppPawnRank = move.piece.color === 'black' ? 6 : 3;
            const oppPawnAtCol = board[oppPawnRank] && board[oppPawnRank][move.from.x];
            const hasOtherCoveredOppPawns = [0, 2, 4, 6, 8].some((col) => {
              const p = board[oppPawnRank] && board[oppPawnRank][col];
              return p && p.isCovered;
            });

            if (oppPawnAtCol && oppPawnAtCol.isCovered) {
              pawnOpeningScore += 180; // Tranh thủ mở trước ở lộ đối thủ chưa kịp mở (+180 điểm)!
              if ((move.from.x === 0 || move.from.x === 8) && oppChariots.length === 0) {
                pawnOpeningScore += 120; // Tốt biên khóa nắp & thông góc xe đáy (chỉ khi đối thủ chưa ra Xe!)
              }
            } else if (hasOtherCoveredOppPawns) {
              pawnOpeningScore -= 150; // Cột này đối thủ đã mở rồi, mất thời cơ khóa nắp ở các lộ khác
            }
          }
        }
        score += pawnOpeningScore;
      } else if (hasPawnRowCovers) {
        // Nếu VẪN CÒN cây úp ở hàng Tốt mà lại đi mở cây ở hàng dưới hoặc hàng pháo:
        if (isBottomRowMove) {
          if (!move.captured) {
            if (move.piece.initialRole === 'chariot') {
              // Phạt cực nặng mở Xe úp: "Để nguyên thì nó là xe, di chuyển mở nắp thì 90% không còn là xe nữa"!
              score -= 3500;
            } else {
              // Phạt nặng mở Mã úp, Sĩ úp, Tượng úp khi hàng tốt chưa mở hết
              score -= 2500;
            }
          } else {
            score += 200;
          }
        } else if (isCannonRowMove) {
          if (!move.captured && move.to.x !== 4) {
            score -= 2000; // Phạt lướt pháo úp ngang khi hàng tốt chưa mở
          } else if (move.to.x === 4) {
            score += 120; // Pháo vào đầu chiếm trung lộ
          }
        }
      } else if (!hasFullSet) {
        // Khi hàng Tốt ĐÃ MỞ HẾT: mở các quân cơ động tiếp theo
        score += 100 + getOpeningRevealPriority(role, move.from.x);
      } else {
        if (role === 'chariot') score += 90;
        else if (role === 'cannon') score += 70;
        else if (role === 'horse') score += 50;
        else if (role === 'advisor') score += 20;
        else if (role === 'elephant') score += 15;
      }
    } else {
      if (role === 'soldier') {
        score += 120; // Động lực lớn mở Tốt úp
        if (move.from.x === 2 || move.from.x === 6) {
          score += 80; // B3.1 & B7.1 thông lộ Mã & Tượng
        } else if (move.from.x === 4) {
          score += 65; // B5.1 tranh trung lộ
        } else {
          score += 35; // Tốt biên
        }
      } else if (role === 'chariot') {
        if (!move.captured) {
          score -= 320; // Phạt nặng nước đi mở Xe úp vu vơ (-320 điểm): không tự ý đi Xe úp vào ô trống khi còn quân úp khác
        } else {
          score += 180; // High-value capture with Xe úp
        }
      } else if (role === 'cannon') {
        if (move.to.x === 4) {
          score += 75; // Pháo đầu! Vào trung lộ khống chế tim cung đối phương
        } else if (!move.captured) {
          score -= 40; // Sideways purposeless cannon shuffle loses a vital tempo
        } else {
          score += 260; // Thưởng điểm ăn quân với Pháo
        }
      } else if (role === 'horse') {
        if (move.to.x === 0 || move.to.x === 8) {
          score -= 80; // "Mã biên nan đắc thế" - heavily penalize rim horse
        } else {
          score += 60; // Developing horse into central outpost (x=2 or 6)
        }
      } else if (role === 'elephant') {
        if (move.to.x === 4) {
          score += 45; // Phi tượng vào giữa củng cố trung lộ và liên hoàn
        } else {
          score += 25;
        }
      } else if (role === 'advisor') {
        if (move.to.x === 4) {
          score += 40; // Sĩ lên trung tâm bảo vệ tướng và lật quân
        } else {
          score += 25;
        }
      }
    }
  } else {
    // Quân ĐÃ NGỬA:
    if (!move.piece.isCovered && !move.piece.simulatedRevealed) {
      if (move.piece.trueRole === 'chariot') {
        // Xe ngửa chiếm lộ trung tâm (lộ 4, 6, 2, 7) hoặc kiểm soát tuyến Hà: thưởng nước đi phát triển
        if (!move.captured) {
          if (move.to.x >= 2 && move.to.x <= 6) {
            score += 45; // Chiếm trung tâm & lộ sườn
          }
          if (move.to.y === 4 || move.to.y === 5) {
            score += 40; // Kiểm soát bờ sông
          }
        }
      } else if (isOpening && !hasFullSet && !move.captured) {
        // Các quân nhỏ khác đi vu vơ không ăn quân / không chiếu khi chưa ra bộ Xe Pháo Mã:
        score -= 85; // Dành nước đi để mở úp hoặc khóa nắp đối phương!
      }
    }
  }

  // 3. KHÓA ÚP ĐỐI THỦ: Nước đi khóa nắp hoặc đè quân úp đối phương
  if (board) {
    const oppColor: PlayerColor = move.piece.color === 'red' ? 'black' : 'red';
    const oppPawnRank = oppColor === 'black' ? 3 : 6;
    const oppPawnAdvanceY = oppColor === 'black' ? 4 : 5;

    // A. Khóa nắp Tốt úp đối phương
    if (move.to.y === oppPawnAdvanceY) {
      const oppPawnAtCol = board[oppPawnRank] && board[oppPawnRank][move.to.x];
      if (oppPawnAtCol && oppPawnAtCol.isCovered) {
        score += (!hasFullSet && isOpening) ? 140 : 60;
      }
    }

    // B. Đè úp: Nước đi uy hiếp / áp sát hàng quân úp đối phương ở các lộ trung tâm (tránh dạt biên x=0, 8)
    if (
      ((oppColor === 'black' && move.to.y <= 3) || (oppColor === 'red' && move.to.y >= 6)) &&
      move.to.x >= 1 && move.to.x <= 7
    ) {
      score += (!hasFullSet && isOpening) ? 60 : 25;
    }
  }

  // 4. Palace Defense and King capture ordering heuristics
  if (move.captured) {
    const isPalace =
      move.piece.color === 'black'
        ? move.to.y <= 2 && move.to.x >= 3 && move.to.x <= 5
        : move.to.y >= 7 && move.to.x >= 3 && move.to.x <= 5;
    if (isPalace) {
      if (move.piece.trueRole === 'king') {
        if (board && board.length > 0) {
          const hasOtherDefender = isSquareDefendedBy(board, move.to, move.piece.color);
          if (hasOtherDefender) {
            score -= 4000; // Cấm kỵ: Tướng thượng lầu ăn quân khi có Sĩ/quân khác bảo vệ
          }
        }
      } else {
        score += move.piece.isCovered ? 2000 : 1500; // Ưu tiên hàng đầu cho Sĩ/quân úp ăn lên mở nắp
      }
    }
  }

  if (move.piece.trueRole === 'king' && !move.captured) {
    score -= isOpening ? 6000 : 800; // Never choose King move in opening unless forced
  }

  // 5. Advancing piece forward / Active Sĩ maneuvering
  if (!move.piece.isCovered && move.piece.trueRole === 'advisor') {
    // Uncovered Sĩ is exceptionally agile: encourage active diagonal movement & central control
    score += 25;
  }

  const forwardStep = move.piece.color === 'black' ? move.to.y - move.from.y : move.from.y - move.to.y;
  if (forwardStep > 0) {
    score += forwardStep * 10;
  }

  return score;
}

// Simple transposition / position cache
const transpositionTable = new Map<string, { depth: number; score: number; flag: 'exact' | 'lower' | 'upper' }>();

function getBoardHash(board: (any | null)[][], turn: PlayerColor): string {
  let hash = turn === 'red' ? 'R:' : 'B:';
  for (let y = 0; y < BOARD_ROWS; y++) {
    for (let x = 0; x < BOARD_COLS; x++) {
      const p = board[y][x];
      if (p) {
        // Strict Fog-of-War:
        // - If covered, hash observable initialRole (e.g. c_c for cannon, c_r for chariot, etc.)
        // - If simulatedRevealed during search, hash as 'rev'
        // - If revealed on actual board, hash trueRole!
        // NEVER leak hidden trueRole of unrevealed pieces!
        const roleChar = p.isCovered ? `c_${p.initialRole}` : p.simulatedRevealed ? 'rev' : p.trueRole[0];
        hash += `${x}${y}${p.color[0]}${roleChar};`;
      }
    }
  }
  return hash;
}

// Quiescence Search: resolves active captures to eliminate the Horizon Effect and prevent leaving pieces hanging
function quiescenceSearch(
  board: (any | null)[][],
  alpha: number,
  beta: number,
  isMaximizing: boolean,
  aiColor: PlayerColor,
  deadline: number,
  nodeCounter: { count: number; timedOut: boolean },
  qsDepth: number
): number {
  nodeCounter.count++;
  if ((nodeCounter.count & 63) === 0 && Date.now() >= deadline) {
    nodeCounter.timedOut = true;
    return evaluateBoard(board, aiColor);
  }

  const standPat = evaluateBoard(board, aiColor);
  if (qsDepth <= 0) return standPat;

  const currentColor: PlayerColor = isMaximizing ? aiColor : aiColor === 'red' ? 'black' : 'red';
  const oppColor: PlayerColor = currentColor === 'red' ? 'black' : 'red';
  const inCheck = isKingInCheck(board, currentColor).inCheck;

  // When NOT in check, a player may stand pat (choose not to capture)
  if (!inCheck) {
    if (isMaximizing) {
      if (standPat >= beta) return beta;
      if (standPat > alpha) alpha = standPat;
    } else {
      if (standPat <= alpha) return alpha;
      if (standPat < beta) beta = standPat;
    }
  }

  const allMoves = getAllLegalMoves(board, currentColor);
  if (allMoves.length === 0) {
    // Checkmate or stalemate in quiescence search
    if (inCheck) {
      return isMaximizing ? -25000 : 25000;
    }
    return 0;
  }

  // If in check, must consider all evasions; otherwise only consider captures
  let candidateMoves = inCheck ? allMoves : allMoves.filter((m) => m.captured !== null);
  if (candidateMoves.length === 0) return standPat;

  let totalBoardPieces = 0;
  for (let y = 0; y < BOARD_ROWS; y++) {
    for (let x = 0; x < BOARD_COLS; x++) {
      if (board[y][x]) totalBoardPieces++;
    }
  }

  // Lọc bỏ đòn Xe ngửa tự sát hoặc tham ăn Tốt úp biên / Sĩ úp khỏi Quiescence Search:
  const isEarlyPhase = allMoves.some((m) => m.piece.isCovered);
  if (isEarlyPhase && !inCheck) {
    candidateMoves = candidateMoves.filter((m) => {
      // Xe ngửa tự sát vào ô có căn hoặc tham ăn Tốt úp biên / Sĩ úp
      const chariotCheck = evaluateRevealedChariotMove(board, m, oppColor, totalBoardPieces);
      if (chariotCheck.isFatalBlunder || chariotCheck.penalty >= 1000) {
        return false;
      }
      return true;
    });
    if (candidateMoves.length === 0) return standPat;
  }

  const myCoveredVal = getExpectedCoveredValue(board, currentColor);
  const oppCoveredVal = getExpectedCoveredValue(board, oppColor);
  candidateMoves.sort(
    (a, b) =>
      scoreMoveForOrdering(b, myCoveredVal, oppCoveredVal, false, isEarlyPhase, board, totalBoardPieces) -
      scoreMoveForOrdering(a, myCoveredVal, oppCoveredVal, false, isEarlyPhase, board, totalBoardPieces)
  );

  let bestVal = inCheck ? (isMaximizing ? -Infinity : Infinity) : standPat;

  if (isMaximizing) {
    for (const move of candidateMoves) {
      const nextBoard = simulateMove(board, move.from, move.to);
      const score = quiescenceSearch(nextBoard, alpha, beta, false, aiColor, deadline, nodeCounter, qsDepth - 1);
      if (nodeCounter.timedOut) return bestVal;
      bestVal = Math.max(bestVal, score);
      alpha = Math.max(alpha, score);
      if (beta <= alpha) break;
    }
    return bestVal;
  } else {
    for (const move of candidateMoves) {
      const nextBoard = simulateMove(board, move.from, move.to);
      const score = quiescenceSearch(nextBoard, alpha, beta, true, aiColor, deadline, nodeCounter, qsDepth - 1);
      if (nodeCounter.timedOut) return bestVal;
      bestVal = Math.min(bestVal, score);
      beta = Math.min(beta, score);
      if (beta <= alpha) break;
    }
    return bestVal;
  }
}

// Fast Minimax with Alpha-Beta Pruning and Quiescence Search
function minimaxSearch(
  board: (any | null)[][],
  depth: number,
  alpha: number,
  beta: number,
  isMaximizing: boolean,
  aiColor: PlayerColor,
  deadline: number,
  nodeCounter: { count: number; timedOut: boolean },
  pvMove?: DetailedMove | null
): number {
  nodeCounter.count++;

  // Check clock every 128 nodes to avoid heavy Date.now() overhead on mobile CPUs
  if ((nodeCounter.count & 127) === 0 && Date.now() >= deadline) {
    nodeCounter.timedOut = true;
    return evaluateBoard(board, aiColor);
  }

  const currentColor: PlayerColor = isMaximizing ? aiColor : aiColor === 'red' ? 'black' : 'red';

  // Transposition lookup
  const boardKey = getBoardHash(board, currentColor);
  const cached = transpositionTable.get(boardKey);
  if (cached && cached.depth >= depth) {
    if (cached.flag === 'exact') return cached.score;
    if (cached.flag === 'lower' && cached.score >= beta) return cached.score;
    if (cached.flag === 'upper' && cached.score <= alpha) return cached.score;
  }

  const legalMoves = getAllLegalMoves(board, currentColor);

  // Terminal state: Checkmate or Stalemate
  if (legalMoves.length === 0) {
    const inCheck = isKingInCheck(board, currentColor).inCheck;
    if (inCheck) {
      return isMaximizing ? -25000 + depth : 25000 - depth;
    }
    return 0; // Stalemate / draw
  }

  // Leaf reached: do quiescence search on captures to eliminate the Horizon Effect
  if (depth <= 0) {
    return quiescenceSearch(board, alpha, beta, isMaximizing, aiColor, deadline, nodeCounter, 4);
  }

  // Move ordering: PV move first, then MVV-LVA captures and uncovering
  const oppColor: PlayerColor = currentColor === 'red' ? 'black' : 'red';
  const myCoveredVal = getExpectedCoveredValue(board, currentColor);
  const oppCoveredVal = getExpectedCoveredValue(board, oppColor);
  const mySet = hasRevealedFullSet(board, currentColor);
  let totalBoardPieces = 0;
  for (let y = 0; y < BOARD_ROWS; y++) {
    for (let x = 0; x < BOARD_COLS; x++) {
      if (board[y][x]) totalBoardPieces++;
    }
  }
  const isOpening = totalBoardPieces >= 22;

  legalMoves.sort((a, b) => {
    if (pvMove) {
      const aIsPv = a.from.x === pvMove.from.x && a.from.y === pvMove.from.y && a.to.x === pvMove.to.x && a.to.y === pvMove.to.y;
      const bIsPv = b.from.x === pvMove.from.x && b.from.y === pvMove.from.y && b.to.x === pvMove.to.x && b.to.y === pvMove.to.y;
      if (aIsPv) return -1;
      if (bIsPv) return 1;
    }
    return (
      scoreMoveForOrdering(b, myCoveredVal, oppCoveredVal, mySet.hasFullSet, isOpening, board, totalBoardPieces) -
      scoreMoveForOrdering(a, myCoveredVal, oppCoveredVal, mySet.hasFullSet, isOpening, board, totalBoardPieces)
    );
  });

  let bestVal = isMaximizing ? -Infinity : Infinity;

  if (isMaximizing) {
    for (const move of legalMoves) {
      const chariotEval = evaluateRevealedChariotMove(board, move, oppColor, totalBoardPieces);

      const nextBoard = simulateMove(board, move.from, move.to);
      let evalScore = minimaxSearch(nextBoard, depth - 1, alpha, beta, false, aiColor, deadline, nodeCounter);
      evalScore += evaluateCaptureBonus(board, move, oppColor);
      evalScore += evaluatePalaceCaptureTactics(move, legalMoves);
      if (move.piece.trueRole === 'king' && !move.captured) {
        const inCheckCur = isKingInCheck(board, currentColor).inCheck;
        if (!inCheckCur) {
          evalScore -= isOpening ? 6000 : 2500;
        }
      }
      if (chariotEval.isFatalBlunder) {
        evalScore -= 25000;
      } else if (chariotEval.penalty > 0) {
        evalScore -= chariotEval.penalty;
      }

      if (nodeCounter.timedOut) return bestVal === -Infinity ? evaluateBoard(board, aiColor) : bestVal;

      bestVal = Math.max(bestVal, evalScore);
      alpha = Math.max(alpha, evalScore);
      if (beta <= alpha) break; // Alpha-beta cutoff
    }
  } else {
    for (const move of legalMoves) {
      const chariotEval = evaluateRevealedChariotMove(board, move, oppColor, totalBoardPieces);

      const nextBoard = simulateMove(board, move.from, move.to);
      let evalScore = minimaxSearch(nextBoard, depth - 1, alpha, beta, true, aiColor, deadline, nodeCounter);
      evalScore -= evaluateCaptureBonus(board, move, oppColor);
      evalScore -= evaluatePalaceCaptureTactics(move, legalMoves);
      if (move.piece.trueRole === 'king' && !move.captured) {
        const inCheckCur = isKingInCheck(board, currentColor).inCheck;
        if (!inCheckCur) {
          evalScore += isOpening ? 6000 : 2500;
        }
      }
      if (chariotEval.isFatalBlunder) {
        evalScore += 25000;
      } else if (chariotEval.penalty > 0) {
        evalScore += chariotEval.penalty;
      }

      if (nodeCounter.timedOut) return bestVal === Infinity ? evaluateBoard(board, aiColor) : bestVal;

      bestVal = Math.min(bestVal, evalScore);
      beta = Math.min(beta, evalScore);
      if (beta <= alpha) break; // Alpha-beta cutoff
    }
  }

  // Cache position
  if (transpositionTable.size < 30000 && !nodeCounter.timedOut) {
    transpositionTable.set(boardKey, {
      depth,
      score: bestVal,
      flag: bestVal <= alpha ? 'upper' : bestVal >= beta ? 'lower' : 'exact',
    });
  }

  return bestVal;
}

/**
 * Iterative Deepening Search with Non-Blocking Event-Loop Yielding
 * Guarantees responsive UI and never hangs the browser.
 */
export async function searchBestMoveAsync(
  rawBoard: (any | null)[][],
  aiColor: PlayerColor,
  difficulty: 'easy' | 'medium' | 'hard',
  maxTimeSeconds: number,
  onProgress?: (stats: AiThinkingStats) => void,
  moveHistory?: Move[]
): Promise<DetailedMove | null> {
  // STRICT FOG OF WAR:
  // Sanitize board completely so neither AI search, nor heuristics, nor move generation can ever know what is under any face-down piece!
  const board = sanitizeBoardForAi(rawBoard);
  const legalMoves = getAllLegalMoves(board, aiColor, moveHistory);
  if (legalMoves.length === 0) return null;

  // Easy mode: swift 1-ply tactical search with slight human-like evaluation variance (no random moves!)
  if (difficulty === 'easy') {
    const scoredMoves: { move: DetailedMove; score: number }[] = [];
    const oppColor: PlayerColor = aiColor === 'red' ? 'black' : 'red';
    let rootTotalPieces = 0;
    for (let y = 0; y < BOARD_ROWS; y++) {
      for (let x = 0; x < BOARD_COLS; x++) {
        if (board[y][x]) rootTotalPieces++;
      }
    }

    for (const move of legalMoves) {
      const nextBoard = simulateMove(board, move.from, move.to);
      let score = evaluateBoard(nextBoard, aiColor) + (Math.random() * 50 - 25);

      // Thưởng lớn cho việc ăn quân chiến ngửa đối phương (đặc biệt Xe ngửa không có căn):
      const captureBonus = evaluateCaptureBonus(board, move, oppColor);
      score += captureBonus;
      score += evaluatePalaceCaptureTactics(move, legalMoves);

      // Cấm kỵ Xe ngửa tự sát và không tham tốt úp biên / sĩ úp
      const chariotEval = evaluateRevealedChariotMove(board, move, oppColor, rootTotalPieces);
      if (chariotEval.isFatalBlunder) {
        score -= 25000;
      } else if (chariotEval.penalty > 0) {
        score -= chariotEval.penalty;
      }

      // CẤM KỴ: Mở cây úp hàng trên vào ô bị ăn ngay khi chưa có căn giữ!
      // "Khi mở cây úp hàng trên, cũng tránh việc mở ra là bị ăn ngay khi chưa có căn chứ bạn"
      const coveredSafety = evaluateCoveredMoveSafety(board, move, oppColor);
      if (coveredSafety.isFatalBlunder) {
        score -= 25000; // Loại bỏ hoàn toàn nước mở quân tự sát này
      } else if (coveredSafety.penalty > 0) {
        score -= coveredSafety.penalty;
      }

      // BẢO VỆ & GIỮ CÁC CÂY CHIẾN KHI MỞ RA RỒI (Xe, Pháo, Mã, Sĩ, Tượng):
      // "Mã, pháo, xe, sĩ, tượng đều phải có giá trị cao hơn là việc mở cây úp bạn ạ."
      const hangingCombatPiecesBefore = findHangingCombatPieces(board, aiColor);
      const hangingCombatPiecesAfter = findHangingCombatPieces(nextBoard, aiColor);

      // Nếu đang có cây chiến bị đối thủ dọa ăn mà THỰC SỰ CÓ THỂ CỨU ĐƯỢC nhưng lại bỏ mặc để đi mở quân úp khác:
      const canSaveCombatPiece = hangingCombatPiecesBefore.length > 0 && legalMoves.some((m) => {
        const testB = simulateMove(board, m.from, m.to);
        return findHangingCombatPieces(testB, aiColor).length < hangingCombatPiecesBefore.length;
      });

      if (canSaveCombatPiece && move.piece.isCovered && !move.captured) {
        score -= 4000; // Phạt nặng: có nước cứu quân mà lại bỏ mặc để đi mở úp!
      }

      // BẢO VỆ QUÂN ÚP BỊ ĐE DỌA (ĐẶC BIỆT TỐT ÚP 3/7 BỊ TƯỢNG, MÃ, PHÁO NGẮM BẮT):
      // "Tôi lên tượng nhìn vào tốt úp 3 của đối thủ, vậy mà nó lại bỏ úp để đi nước khác là sao?"
      const hangingCoveredPiecesBefore = findHangingCoveredPieces(board, aiColor);
      const hangingCoveredPiecesAfter = findHangingCoveredPieces(nextBoard, aiColor);

      const canSaveCoveredPiece = hangingCoveredPiecesBefore.length > 0 && legalMoves.some((m) => {
        const testB = simulateMove(board, m.from, m.to);
        return findHangingCoveredPieces(testB, aiColor).length < hangingCoveredPiecesBefore.length;
      });

      if (canSaveCoveredPiece && hangingCoveredPiecesAfter.length >= hangingCoveredPiecesBefore.length) {
        // Có nước cứu quân úp (tiến tốt thoát đòn, cản mắt tượng/chân mã, lên căn...) mà lại bỏ úp đi nước khác:
        score -= 4000;
      } else if (hangingCoveredPiecesBefore.length > 0 && hangingCoveredPiecesAfter.length < hangingCoveredPiecesBefore.length) {
        score += 650; // Thưởng điểm cứu nguy quân úp thành công!
      }

      // BẢO VỆ QUÂN ÚP KHI ĐỐI PHƯƠNG RA XE ("GIỮ ÚP KHI BỊ XE NHÌN"):
      // "đéo hiểu bạn chỉnh logic kiểu gì mà khi tôi ra được xe thì máy không giữ úp thế?"
      // "Tại khai cục này, lẽ ra phải lên mã để mong là tốt, giữ tốt khi bị xe nhìn"
      const oppChariots = getOpponentActiveChariots(board, oppColor);
      const coveredThreatenedByChariotBefore = findCoveredPiecesThreatenedByChariot(board, aiColor);
      const coveredThreatenedByChariotAfter = findCoveredPiecesThreatenedByChariot(nextBoard, aiColor);

      if (coveredThreatenedByChariotBefore.length > 0) {
        const canDefendOrSaveFromChariot = legalMoves.some((m) => {
          const testB = simulateMove(board, m.from, m.to);
          const after = findCoveredPiecesThreatenedByChariot(testB, aiColor);
          return after.length < coveredThreatenedByChariotBefore.length ||
            after.every((p) => p.isDefended);
        });

        const isSaved = coveredThreatenedByChariotAfter.length < coveredThreatenedByChariotBefore.length ||
          (coveredThreatenedByChariotBefore.some((p) => !p.isDefended) && coveredThreatenedByChariotAfter.every((p) => p.isDefended));

        if (canDefendOrSaveFromChariot && !isSaved) {
          // Có nước giữ úp trước Xe đối thủ mà lại bỏ mặc để đi nước khác:
          score -= 4500;
        } else if (isSaved) {
          // Nước giữ úp / cứu úp trước Xe đối phương thành công:
          score += 750;
        }
      }

      // CẤM KỴ: Tuyệt đối không bao giờ đi Tướng ở khai - trung cuộc khi TƯỚNG CHƯA BỊ CHIẾU:
      const inCheckNow = isKingInCheck(board, aiColor).inCheck;
      if (move.piece.trueRole === 'king' && !inCheckNow && !move.captured) {
        score -= 6000;
      }
      if (hangingCombatPiecesAfter.length > hangingCombatPiecesBefore.length) {
        const isCapturingChariot = move.captured && !move.captured.isCovered && move.captured.trueRole === 'chariot';
        if (!isCapturingChariot) {
          const hangingDiff = hangingCombatPiecesAfter.length - hangingCombatPiecesBefore.length;
          score -= Math.min(1200, hangingDiff * 600);
        }
      }
      if (hangingCombatPiecesBefore.length > 0 && hangingCombatPiecesAfter.length < hangingCombatPiecesBefore.length) {
        score += 350; // Thưởng điểm cứu nguy cho cây chiến thành công!
      }

      // TRIẾT LÝ KHAI CỤC: ƯU TIÊN MỞ CÂY HÀNG TỐT TRƯỚC HÀNG DƯỚI (Khi cây chiến an toàn & ô mở CÓ CĂN GIỮ)
      // "Mở Tốt 3 & Tốt 7, cả Tốt biên cũng phải ưu tiên mở trước, kể cả Tốt 5 nếu cần chứ"
      const myPawnRank = aiColor === 'black' ? 3 : 6;
      const myBottomRank = aiColor === 'black' ? 0 : 9;
      const myCannonRank = aiColor === 'black' ? 2 : 7;
      const hasPawnCovers = hasCoveredPawnsOnPawnRow(board, aiColor);
      if (rootTotalPieces >= 20 && hasPawnCovers && move.piece.isCovered && !move.captured && hangingCombatPiecesAfter.length === 0 && !coveredSafety.isFatalBlunder) {
        if (move.from.y === myPawnRank) {
          // Tất cả các cây hàng Tốt (Binh 3 & 7, Binh 5, Binh biên 1 & 9) đều được ưu tiên mở hàng đầu:
          if (move.from.x === 2 || move.from.x === 6) {
            score += 650; // Binh 3 & 7: thông lộ Mã & Tượng
          } else if (move.from.x === 4) {
            score += 600; // Binh 5: tranh trung lộ
          } else {
            score += 550;  // Binh biên 1 & 9: mở cánh
          }

          // TRANH TIÊN KHÓA NẮP & THOÁT ĐÒN:
          const isPawnThreatened = isSquareDefendedBy(board, move.from, oppColor);
          if (isPawnThreatened) {
            score += 800; // Tiến tốt thoát đòn khi đang bị đối phương dòm ngó!
          } else {
            const oppPawnRank = aiColor === 'black' ? 6 : 3;
            const oppPawnAtCol = board[oppPawnRank] && board[oppPawnRank][move.from.x];
            if (oppPawnAtCol && oppPawnAtCol.isCovered) {
              score += 300; // Tranh thủ mở trước ở lộ đối thủ chưa kịp mở (+300 điểm)!
              if (move.from.x === 0 || move.from.x === 8) {
                score += 150; // Tốt biên khóa nắp & thông góc xe đáy
              }
            }
          }
        } else if (move.from.y === myBottomRank && !move.captured) {
          // Khi hàng tốt vẫn còn cây úp chưa mở:
          // "Để nguyên thì nó là xe, nhưng chỉ cần di chuyển mở nắp ra thì nó 90% không còn là xe nữa đâu"
          // "Đầu tiên là nước mở mã giả là xe, đây là nước đi không ưu tiên mở úp hàng tốt đầu tiên"
          const isSavingRealChariotThreat = coveredThreatenedByChariotBefore.length > 0 &&
            coveredThreatenedByChariotAfter.length < coveredThreatenedByChariotBefore.length;

          if (isSavingRealChariotThreat && move.piece.initialRole === 'horse') {
            score += 500; // Chỉ lên Mã nếu có quân úp đang thực sự bị Xe ngửa thật dòm ngó
          } else if (move.piece.initialRole === 'chariot') {
            // Phạt cực nặng mở Xe úp: Tuyệt đối không ảo tưởng xe giả là xe thật khi mở ra!
            score -= 3500;
          } else {
            // Phạt rất nặng việc mở cây hàng đáy (Mã, Sĩ, Tượng úp) khi hàng tốt còn nắp:
            score -= 2500;
          }
        } else if (move.from.y === myCannonRank && !move.captured && move.to.x !== 4) {
          score -= 2000;
        }
      }

      if (moveHistory && moveHistory.length > 0) {
        const rep = checkMoveRepetitionRules(board, move.from, move.to, moveHistory);
        if (rep.isCheck && rep.consecutiveChecks >= 2) {
          score -= rep.consecutiveChecks * 500;
        }
        if (rep.consecutiveChases >= 2) {
          score -= rep.consecutiveChases * 350;
        }
      }
      scoredMoves.push({ move, score });
    }
    scoredMoves.sort((a, b) => b.score - a.score);
    // Nếu có cơ hội ăn quân chiến ngửa vô căn (đặc biệt là Xe ngửa): chọn ngay lập tức, không bốc thăm ngẫu nhiên!
    const bestMoveCandidate = scoredMoves[0];
    if (bestMoveCandidate && bestMoveCandidate.score >= 4000) {
      return bestMoveCandidate.move;
    }
    // Chỉ chọn trong các nước có điểm số tiệm cận nước tốt nhất (chênh lệch không quá 60 điểm)
    // Tuyệt đối không chọn nước bị rớt điểm xa (như nước sót / blunder)
    const bestScore = scoredMoves[0]?.score ?? 0;
    const topTierMoves = scoredMoves.filter((m) => bestScore - m.score <= 60 && m.score > -5000);
    const candidatePool = topTierMoves.length > 0 ? topTierMoves.slice(0, 3) : scoredMoves.slice(0, 1);
    return candidatePool[Math.floor(Math.random() * candidatePool.length)].move;
  }

  // Clear cache periodically
  if (transpositionTable.size > 25000) {
    transpositionTable.clear();
  }

  const startTime = Date.now();
  // Safe ceiling: maximum time allowed by user (e.g. 15s)
  const timeLimitMs = Math.min(maxTimeSeconds, 15) * 1000;
  const deadline = startTime + Math.max(1200, timeLimitMs - 300);

  // Target depth: 4 for hard, 3 for medium, 2 for easy
  const maxDepthTarget = difficulty === 'hard' ? 4 : difficulty === 'medium' ? 3 : 2;
  let overallBestMove: DetailedMove = legalMoves[0];
  let overallBestScore = -Infinity;
  const nodeCounter = { count: 0, timedOut: false };

  // Initial sort of root moves using MVV-LVA, opening uncovering priority, and dynamic piece-counting
  const rootMyCoveredVal = getExpectedCoveredValue(board, aiColor);
  const rootOppCoveredVal = getExpectedCoveredValue(board, aiColor === 'red' ? 'black' : 'red');
  const rootMySet = hasRevealedFullSet(board, aiColor);
  let rootTotalPieces = 0;
  for (let y = 0; y < BOARD_ROWS; y++) {
    for (let x = 0; x < BOARD_COLS; x++) {
      if (board[y][x]) rootTotalPieces++;
    }
  }
  const rootIsOpening = rootTotalPieces >= 22;
  legalMoves.sort(
    (a, b) =>
      scoreMoveForOrdering(b, rootMyCoveredVal, rootOppCoveredVal, rootMySet.hasFullSet, rootIsOpening, board, rootTotalPieces) -
      scoreMoveForOrdering(a, rootMyCoveredVal, rootOppCoveredVal, rootMySet.hasFullSet, rootIsOpening, board, rootTotalPieces)
  );

  // Iterative deepening from depth 1 to maxDepthTarget
  let lastYieldTime = 0;
  let lastProgressCallbackTime = 0;
  for (let currentDepth = 1; currentDepth <= maxDepthTarget; currentDepth++) {
    // Check if we already spent substantial time before starting a deeper ply
    if (Date.now() - startTime >= Math.min(timeLimitMs * 0.7, 3500)) {
      break;
    }

    let depthBestMove: DetailedMove | null = null;
    let depthBestScore = -Infinity;
    let alpha = -Infinity;
    const beta = Infinity;
    nodeCounter.timedOut = false;

    // Search each root move
    for (let i = 0; i < legalMoves.length; i++) {
      const move = legalMoves[i];

      if (Date.now() >= deadline) {
        nodeCounter.timedOut = true;
        break;
      }

      const nextBoard = simulateMove(board, move.from, move.to);
      let score = minimaxSearch(
        nextBoard,
        currentDepth - 1,
        -Infinity,
        Infinity,
        false,
        aiColor,
        deadline,
        nodeCounter,
        overallBestMove
      );

      const oppColor: PlayerColor = aiColor === 'red' ? 'black' : 'red';

      // Thưởng lớn cho việc ăn quân chiến ngửa đối phương (đặc biệt Xe ngửa không có căn):
      const captureBonus = evaluateCaptureBonus(board, move, oppColor);
      score += captureBonus;
      score += evaluatePalaceCaptureTactics(move, legalMoves);

      // Repetition & check addiction deterrent:
      // Repeating checks without forced mate is heavily penalized so AI doesn't stall or loop checks
      if (moveHistory && moveHistory.length > 0) {
        const rep = checkMoveRepetitionRules(board, move.from, move.to, moveHistory);
        if (rep.isCheck && rep.consecutiveChecks >= 2) {
          score -= rep.consecutiveChecks * 600;
          if (rep.consecutiveChecks >= 4) {
            score -= 10000;
          }
        }
        if (rep.consecutiveChases >= 2) {
          score -= rep.consecutiveChases * 400;
          if (rep.consecutiveChases >= 4) {
            score -= 8000;
          }
        }
      }

      // CẤM KỴ TUYỆT ĐỐI KHAI CUỘC (20 NƯỚC ĐẦU):
      // Không bao giờ mang Xe ngửa tự sát vào ô có căn hoặc tham ăn Tốt úp biên / Sĩ úp của đối thủ!
      const chariotEval = evaluateRevealedChariotMove(board, move, oppColor, rootTotalPieces);
      if (chariotEval.isFatalBlunder) {
        score -= 25000;
      } else if (chariotEval.penalty > 0) {
        score -= chariotEval.penalty;
      }

      // CẤM KỴ: Mở cây úp hàng trên vào ô bị ăn ngay khi chưa có căn giữ!
      // "Khi mở cây úp hàng trên, cũng tránh việc mở ra là bị ăn ngay khi chưa có căn chứ bạn"
      const coveredSafety = evaluateCoveredMoveSafety(board, move, oppColor);
      if (coveredSafety.isFatalBlunder) {
        score -= 25000; // Loại bỏ hoàn toàn nước mở quân tự sát này
      } else if (coveredSafety.penalty > 0) {
        score -= coveredSafety.penalty;
      }

      // BẢO VỆ & GIỮ CÁC CÂY CHIẾN KHI MỞ RA RỒI (Xe, Pháo, Mã, Sĩ, Tượng):
      // "Mã, pháo, xe, sĩ, tượng đều phải có giá trị cao hơn là việc mở cây úp bạn ạ."
      const hangingCombatPiecesBefore = findHangingCombatPieces(board, aiColor);
      const hangingCombatPiecesAfter = findHangingCombatPieces(nextBoard, aiColor);

      // Nếu đang có cây chiến bị đối thủ dọa ăn mà THỰC SỰ CÓ THỂ CỨU ĐƯỢC nhưng lại bỏ mặc để đi mở quân úp khác:
      const canSaveCombatPiece = hangingCombatPiecesBefore.length > 0 && legalMoves.some((m) => {
        const testB = simulateMove(board, m.from, m.to);
        return findHangingCombatPieces(testB, aiColor).length < hangingCombatPiecesBefore.length;
      });

      if (canSaveCombatPiece && move.piece.isCovered && !move.captured) {
        score -= 4000; // Phạt nặng: có nước cứu quân mà lại bỏ mặc để đi mở úp!
      }

      // BẢO VỆ QUÂN ÚP BỊ ĐE DỌA (ĐẶC BIỆT TỐT ÚP 3/7 BỊ TƯỢNG, MÃ, PHÁO NGẮM BẮT):
      // "Tôi lên tượng nhìn vào tốt úp 3 của đối thủ, vậy mà nó lại bỏ úp để đi nước khác là sao?"
      const hangingCoveredPiecesBefore = findHangingCoveredPieces(board, aiColor);
      const hangingCoveredPiecesAfter = findHangingCoveredPieces(nextBoard, aiColor);

      const canSaveCoveredPiece = hangingCoveredPiecesBefore.length > 0 && legalMoves.some((m) => {
        const testB = simulateMove(board, m.from, m.to);
        return findHangingCoveredPieces(testB, aiColor).length < hangingCoveredPiecesBefore.length;
      });

      if (canSaveCoveredPiece && hangingCoveredPiecesAfter.length >= hangingCoveredPiecesBefore.length) {
        // Có nước cứu quân úp (tiến tốt thoát đòn, cản mắt tượng/chân mã, lên căn...) mà lại bỏ úp đi nước khác:
        score -= 4000;
      } else if (hangingCoveredPiecesBefore.length > 0 && hangingCoveredPiecesAfter.length < hangingCoveredPiecesBefore.length) {
        score += 650; // Thưởng điểm cứu nguy quân úp thành công!
      }

      // BẢO VỆ QUÂN ÚP KHI ĐỐI PHƯƠNG RA XE ("GIỮ ÚP KHI BỊ XE NHÌN"):
      // "đéo hiểu bạn chỉnh logic kiểu gì mà khi tôi ra được xe thì máy không giữ úp thế?"
      // "Tại khai cục này, lẽ ra phải lên mã để mong là tốt, giữ tốt khi bị xe nhìn"
      const oppChariots = getOpponentActiveChariots(board, oppColor);
      const coveredThreatenedByChariotBefore = findCoveredPiecesThreatenedByChariot(board, aiColor);
      const coveredThreatenedByChariotAfter = findCoveredPiecesThreatenedByChariot(nextBoard, aiColor);

      if (coveredThreatenedByChariotBefore.length > 0) {
        const canDefendOrSaveFromChariot = legalMoves.some((m) => {
          const testB = simulateMove(board, m.from, m.to);
          const after = findCoveredPiecesThreatenedByChariot(testB, aiColor);
          return after.length < coveredThreatenedByChariotBefore.length ||
            after.every((p) => p.isDefended);
        });

        const isSaved = coveredThreatenedByChariotAfter.length < coveredThreatenedByChariotBefore.length ||
          (coveredThreatenedByChariotBefore.some((p) => !p.isDefended) && coveredThreatenedByChariotAfter.every((p) => p.isDefended));

        if (canDefendOrSaveFromChariot && !isSaved) {
          // Có nước giữ úp trước Xe đối thủ mà lại bỏ mặc để đi nước khác:
          score -= 4500;
        } else if (isSaved) {
          // Nước giữ úp / cứu úp trước Xe đối phương thành công:
          score += 750;
        }
      }

      // CẤM KỴ: Tuyệt đối không bao giờ đi Tướng ở khai - trung cuộc khi TƯỚNG CHƯA BỊ CHIẾU:
      const inCheckNow = isKingInCheck(board, aiColor).inCheck;
      if (move.piece.trueRole === 'king' && !inCheckNow && !move.captured) {
        score -= 6000;
      }
      if (hangingCombatPiecesAfter.length > hangingCombatPiecesBefore.length) {
        const isCapturingChariot = move.captured && !move.captured.isCovered && move.captured.trueRole === 'chariot';
        if (!isCapturingChariot) {
          const hangingDiff = hangingCombatPiecesAfter.length - hangingCombatPiecesBefore.length;
          score -= Math.min(1200, hangingDiff * 600);
        }
      }
      if (hangingCombatPiecesBefore.length > 0 && hangingCombatPiecesAfter.length < hangingCombatPiecesBefore.length) {
        score += 350; // Thưởng điểm cứu nguy cho cây chiến thành công!
      }

      // 4. TRIẾT LÝ KHAI CỤC: ƯU TIÊN MỞ CÂY HÀNG TỐT TRƯỚC HÀNG DƯỚI (Khi cây chiến an toàn & ô mở CÓ CĂN GIỮ)
      // "Mở Tốt 3 & Tốt 7, cả Tốt biên cũng phải ưu tiên mở trước, kể cả Tốt 5 nếu cần chứ"
      const myPawnRank = aiColor === 'black' ? 3 : 6;
      const myBottomRank = aiColor === 'black' ? 0 : 9;
      const myCannonRank = aiColor === 'black' ? 2 : 7;
      const hasPawnCovers = hasCoveredPawnsOnPawnRow(board, aiColor);
      if (rootIsOpening && hasPawnCovers && move.piece.isCovered && !move.captured && hangingCombatPiecesAfter.length === 0 && !coveredSafety.isFatalBlunder) {
        if (move.from.y === myPawnRank) {
          // Tất cả các cây hàng Tốt (Binh 3 & 7, Binh 5, Binh biên 1 & 9) đều được ưu tiên mở hàng đầu:
          if (move.from.x === 2 || move.from.x === 6) {
            score += 650; // Binh 3 & 7: thông lộ Mã & Tượng
          } else if (move.from.x === 4) {
            score += 600; // Binh 5: tranh trung lộ
          } else {
            score += 550;  // Binh biên 1 & 9: mở cánh
          }

          // TRANH TIÊN KHÓA NẮP & THOÁT ĐÒN:
          const isPawnThreatened = isSquareDefendedBy(board, move.from, oppColor);
          if (isPawnThreatened) {
            score += 800; // Tiến tốt thoát đòn khi đang bị đối phương dòm ngó!
          } else {
            const oppPawnRank = aiColor === 'black' ? 6 : 3;
            const oppPawnAtCol = board[oppPawnRank] && board[oppPawnRank][move.from.x];
            if (oppPawnAtCol && oppPawnAtCol.isCovered) {
              score += 300; // Tranh thủ mở trước ở lộ đối thủ chưa kịp mở (+300 điểm)!
              if (move.from.x === 0 || move.from.x === 8) {
                score += 150; // Tốt biên khóa nắp & thông góc xe đáy
              }
            }
          }
        } else if (move.from.y === myBottomRank && !move.captured) {
          // Khi hàng tốt vẫn còn cây úp chưa mở:
          // "Để nguyên thì nó là xe, nhưng chỉ cần di chuyển mở nắp ra thì nó 90% không còn là xe nữa đâu"
          // "Đầu tiên là nước mở mã giả là xe, đây là nước đi không ưu tiên mở úp hàng tốt đầu tiên"
          const isSavingRealChariotThreat = coveredThreatenedByChariotBefore.length > 0 &&
            coveredThreatenedByChariotAfter.length < coveredThreatenedByChariotBefore.length;

          if (isSavingRealChariotThreat && move.piece.initialRole === 'horse') {
            score += 500; // Chỉ lên Mã nếu có quân úp đang thực sự bị Xe ngửa thật dòm ngó
          } else if (move.piece.initialRole === 'chariot') {
            // Phạt cực nặng mở Xe úp: Tuyệt đối không ảo tưởng xe giả là xe thật khi mở ra!
            score -= 3500;
          } else {
            // Phạt rất nặng việc mở cây hàng đáy (Mã, Sĩ, Tượng úp) khi hàng tốt còn nắp:
            score -= 2500;
          }
        } else if (move.from.y === myCannonRank && !move.captured && move.to.x !== 4) {
          score -= 2000;
        }
      }

      if (nodeCounter.timedOut) {
        break;
      }

      if (score > depthBestScore) {
        depthBestScore = score;
        depthBestMove = move;
      }
      alpha = Math.max(alpha, score);

      // Periodically yield to event loop every 60ms so mobile browser (Poco M4 Pro) remains silky smooth at 60/90Hz
      const now = Date.now();
      if (now - lastYieldTime >= 60 || i === legalMoves.length - 1) {
        lastYieldTime = now;
        if (onProgress && (now - lastProgressCallbackTime >= 250 || i === legalMoves.length - 1)) {
          lastProgressCallbackTime = now;
          const elapsed = (now - startTime) / 1000;
          onProgress({
            depth: currentDepth,
            nodes: nodeCounter.count,
            score: depthBestScore === -Infinity ? overallBestScore : depthBestScore,
            timeSpent: Math.round(elapsed * 10) / 10,
            maxTime: maxTimeSeconds,
          });
        }
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    }

    // Only adopt this depth's findings if not timed out halfway
    if (!nodeCounter.timedOut && depthBestMove) {
      overallBestMove = depthBestMove;
      overallBestScore = depthBestScore;

      // Re-order root moves so best move is searched first next depth
      legalMoves.sort((a, b) => {
        if (a === overallBestMove) return -1;
        if (b === overallBestMove) return 1;
        return 0;
      });

      // Immediate finish on checkmate
      if (overallBestScore >= 20000 || overallBestScore <= -20000) {
        break;
      }
    } else {
      break; // Timeout reached, use result from previous completed depth
    }
  }

  // Ensure minimum natural human-like pause (at least 250ms) so piece animation doesn't jitter
  const elapsedTotal = Date.now() - startTime;
  if (elapsedTotal < 250) {
    await new Promise((r) => setTimeout(r, 250 - elapsedTotal));
  }

  return overallBestMove;
}
