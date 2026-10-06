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
export const PIECE_VALUES: Record<PieceRole, number> = {
  king: 10000,
  chariot: 1000,
  cannon: 480,
  horse: 440,
  advisor: 310,  // Powerful in Cờ Úp: once uncovered, Sĩ roams diagonally across the whole board with ZERO blockages!
  elephant: 270, // Uncovered elephants cross river (though can be blocked at the eye)
  soldier: 120,
};

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
          trueRole: piece.initialRole || 'soldier', // REDACTED! Identical to initialRole
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

  // Biến thiên giá trị theo số lượng quân úp còn lại trên bàn:
  if (coveredCount >= 10) {
    return baseAverage; // Khai cuộc: 100% giá trị tiềm năng
  } else if (coveredCount >= 5) {
    return Math.round(baseAverage * 0.85); // Trung cuộc: 85%
  } else {
    return Math.round(baseAverage * 0.65); // Tàn cuộc: 65% (mất dần giá trị)
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
      return 50; // Thưởng công năng nắp Xe (+50 điểm), tổng giá trị ~300-320 điểm, TUYỆT ĐỐI KHÔNG vượt qua quân ngửa thật (Mã 440, Pháo 480)
    case 'cannon':
      return totalPieces >= 18 ? 30 : 15; // Pháo úp có độ cơ động mở nhảy (+30 điểm)
    case 'horse':
      return -30; // Mã úp bị cản chân ban đầu
    case 'elephant':
      return 0;
    case 'advisor':
      return 0;
    case 'soldier':
    default:
      return -70; // Tốt úp chỉ đi 1 bước ngắn ban đầu
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
      // In Cờ Úp, once uncovered, Sĩ moves diagonally 1 step without ANY leg or eye blocking!
      // Extremely agile: can infiltrate enemy palace, cross river, defend, or dominate center.
      if (forwardRank >= 5) {
        score += 75; // Deep penetration into enemy territory across river!
      } else if (forwardRank >= 3 && x >= 2 && x <= 6) {
        score += 50; // Active mid-board / river control
      } else {
        score += 25; // Palace & home territory defense
      }
      break;
    }
    case 'elephant': {
      // In Cờ Úp, once uncovered, crossing river turns them into devastating raiders
      if (forwardRank >= 5) {
        score += 60; // Attacking across river!
      } else {
        score += 15; // Home defense
      }
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
        // Đã thoát khỏi nắp úp tĩnh để trở thành quân hoạt động tự do!
        val = piece.color === color ? myCoveredVal : oppCoveredVal;

        // ƯU TIÊN MỞ CÂY (Development Tempo Bonus):
        // Khi chưa ra đủ ít nhất 1 bộ Xe - Pháo - Mã ở khai cuộc, việc mở quân úp là ưu tiên số 1!
        const isOpeningPhase = totalPieces >= 22;
        const isMidgamePhase = totalPieces >= 14 && totalPieces < 22;
        const needsFullSet = piece.color === color ? !mySet.hasFullSet : !oppSet.hasFullSet;

        if (isOpeningPhase && needsFullSet) {
          val += 80; // Thưởng cực lớn cho nước mở quân để săn tìm Xe, Pháo, Mã!
          if (piece.initialRole === 'soldier') {
            if (x === 2 || x === 6) val += 60; // Binh 3 / Binh 7 thông lộ Mã & Tượng
            else if (x === 4) val += 50; // Binh 5 chiếm trung tâm khống chế tim cung
            else val += 25; // Binh biên
          } else if (piece.initialRole === 'advisor' || piece.initialRole === 'elephant') {
            val += 50; // Sĩ / Tượng lật ngửa tự do qua sông, cơ hội mở ra Xe/Pháo/Mã
          } else if (piece.initialRole === 'horse') {
            val += 40; // Khởi Mã mở quân
          } else {
            val += 25;
          }
        } else if (isOpeningPhase) {
          if (piece.initialRole === 'soldier') {
            if (x === 2 || x === 6) val += 35; // Binh 3 / Binh 7 thông lộ Mã & Tượng
            else if (x === 4) val += 30; // Binh 5 chiếm trung tâm
            else val += 15;
          } else if (piece.initialRole === 'advisor' || piece.initialRole === 'elephant') {
            val += 30; // Sĩ / Tượng lật ngửa tự do qua sông cực kỳ cơ động
          } else {
            val += 20; // Khởi Mã hoặc điều động quân khác
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

  // A. BẢO TOÀN QUÂN ÚP & TRÁNH TREO QUÂN ÚP VÔ CĂN:
  // Chỉ áp dụng cho quân úp (quân ngửa thật được bảo vệ nghiêm ngặt ở phần TACTICAL PRESERVATION phía dưới).
  for (const myP of myActivePieces) {
    if (myP.piece.trueRole === 'king' || !myP.piece.isCovered) continue;
    const attackers = oppActivePieces.filter((oppP) =>
      canPieceAttackSquare(board, { x: oppP.x, y: oppP.y }, { x: myP.x, y: myP.y }, oppP.piece)
    );

    if (attackers.length > 0) {
      const isDefended = isSquareDefendedBy(board, { x: myP.x, y: myP.y }, color);
      if (!isDefended) {
        // "Treo quân úp": bị đối thủ ngắm bắt mà không có căn giữ.
        // Phạt nhẹ có chừng mực (50-65 điểm), TUYỆT ĐỐI KHÔNG phạt nặng hơn quân ngửa thật,
        // để máy KHÔNG BAO GIỜ bỏ rơi hoặc đem Mã ngửa (440), Pháo ngửa (480) đi thí mạng chỉ để cứu quân úp!
        const penalty = isOpening ? 65 : isMidgame ? 40 : 20;
        score -= penalty;
      } else {
        score -= 8; // Có căn giữ úp, an toàn, chỉ chịu áp lực chiến thuật nhẹ
      }
    }
  }

  // B. KHÓA ÚP ĐỐI THỦ ("KHÓA NẮP & TÊ LIỆT QUÂN ÚP ĐỐI PHƯƠNG"):
  // Khi chưa ra đủ ít nhất 1 bộ Xe Pháo Mã ở khai cuộc, việc khóa nắp Tốt úp và đè quân úp đối phương
  // là ưu tiên chiến lược sống còn để kìm hãm đối phương phát triển trong khi ta tìm cách mở quân!
  const isEarlyWithoutFullSet = isOpening && !mySet.hasFullSet;

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
        score += isEarlyWithoutFullSet ? 125 : 70;
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

  // 5. Phạt trì trệ không mở quân úp khi chưa có đủ 1 bộ Xe Pháo Mã:
  if (isEarlyWithoutFullSet) {
    for (const myCov of myCoveredPieces) {
      if (myCov.y === myPawnRank && (myCov.x === 2 || myCov.x === 6)) {
        score -= 25; // Chưa mở Binh 3/7 để thông lộ
      }
    }
    if (myCoveredPieces.length >= 13) {
      score -= 30; // Còn quá nhiều quân úp nằm im
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

  // CẶP SĨ GIẰNG NHAU ("Sĩ liên hoàn" / Mutually defended Advisors in Cờ Úp):
  // When two revealed Advisors are diagonally adjacent (deltaX === 1, deltaY === 1),
  // they protect each other with unblockable diagonal steps, forming an impenetrable mobile fortress.
  const myRevealedAdvisors = myActivePieces.filter(
    (p) => !p.piece.isCovered && p.piece.trueRole === 'advisor'
  );
  if (myRevealedAdvisors.length >= 2) {
    const s1 = myRevealedAdvisors[0];
    const s2 = myRevealedAdvisors[1];
    if (Math.abs(s1.x - s2.x) === 1 && Math.abs(s1.y - s2.y) === 1) {
      let linkBonus = 110;
      // Mid-board / river control (ranks 3 to 6):
      if ((s1.y >= 3 && s1.y <= 6) || (s2.y >= 3 && s2.y <= 6)) {
        linkBonus += 70; // Hai Sĩ giằng nhau ở giữa bàn mạnh hơn cả một con Mã!
      }
      score += linkBonus;
    }
  }

  const oppRevealedAdvisors = oppActivePieces.filter(
    (p) => !p.piece.isCovered && p.piece.trueRole === 'advisor'
  );
  if (oppRevealedAdvisors.length >= 2) {
    const s1 = oppRevealedAdvisors[0];
    const s2 = oppRevealedAdvisors[1];
    if (Math.abs(s1.x - s2.x) === 1 && Math.abs(s1.y - s2.y) === 1) {
      let linkBonus = 110;
      if ((s1.y >= 3 && s1.y <= 6) || (s2.y >= 3 && s2.y <= 6)) {
        linkBonus += 70;
      }
      score -= linkBonus;
    }
  }

  // TACTICAL PRESERVATION OF REVEALED PIECES (Never hang Xe/Pháo/Mã/Sĩ/Tượng without defense):
  for (const myP of myActivePieces) {
    if (!myP.piece.isCovered && myP.piece.trueRole !== 'king') {
      const attackers = oppActivePieces.filter((oppP) =>
        canPieceAttackSquare(board, { x: oppP.x, y: oppP.y }, myP, oppP.piece)
      );
      if (attackers.length > 0) {
        const isDefended = isSquareDefendedBy(board, myP, color);
        const myVal = PIECE_VALUES[myP.piece.trueRole as PieceRole] || 200;
        if (!isDefended) {
          // Completely undefended hanging piece: fatal tactical mistake!
          score -= Math.round(myVal * 0.95);
        } else {
          // Defended piece, but check for unfavorable trade (e.g. enemy Soldier or Covered piece attacking our Horse/Cannon/Chariot):
          const lowestAttackerVal = Math.min(
            ...attackers.map((a) => (a.piece.isCovered ? 240 : PIECE_VALUES[a.piece.trueRole as PieceRole] || 120))
          );
          if (lowestAttackerVal < myVal) {
            // Net loss if traded: mất quân thật đổi lấy quân giá trị thấp hơn!
            score -= Math.round((myVal - lowestAttackerVal) * 0.85);
          } else {
            score -= 15; // Contested
          }
        }
      }
    }
  }

  for (const oppP of oppActivePieces) {
    if (!oppP.piece.isCovered && oppP.piece.trueRole !== 'king') {
      const attackers = myActivePieces.filter((myP) =>
        canPieceAttackSquare(board, { x: myP.x, y: myP.y }, oppP, myP.piece)
      );
      if (attackers.length > 0) {
        const isDefended = isSquareDefendedBy(board, oppP, opponentColor);
        const oppVal = PIECE_VALUES[oppP.piece.trueRole as PieceRole] || 200;
        if (!isDefended) {
          // Opportunity to capture opponent's hanging piece!
          score += Math.round(oppVal * 0.85);
        } else {
          const lowestAttackerVal = Math.min(
            ...attackers.map((a) => (a.piece.isCovered ? myCoveredVal : PIECE_VALUES[a.piece.trueRole as PieceRole] || 120))
          );
          if (lowestAttackerVal < oppVal) {
            score += Math.round((oppVal - lowestAttackerVal) * 0.70);
          } else {
            score += 15;
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
  const isRevealedChariot = !move.piece.isCovered && move.piece.trueRole === 'chariot';
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

    // Ăn quân úp đối phương khi chưa đủ bộ Xe Pháo Mã ở khai cuộc (chỉ ưu tiên cho quân úp đổi quân úp)
    if (isVictimHidden && isOpening && !hasFullSet && move.piece.isCovered) {
      score += 240;
    }

    // Nếu quân ngửa thật (Mã, Pháo, Xe) ăn quân úp đối phương trên ô có căn giữ:
    if (!isAttackerHidden && isVictimHidden && board && board.length > 0) {
      const isDefended = isSquareDefendedBy(board, move.to, oppColor);
      if (isDefended) {
        const attRole = move.piece.trueRole as PieceRole;
        if (attRole === 'chariot') {
          score -= 30000;
        } else if (attRole === 'cannon' || attRole === 'horse') {
          score -= 15000; // Đổi quân ngửa thật lấy quân úp có căn là sai lầm nặng
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

      // Phạt cực nặng đòn Pháo úp ăn Mã đáy (1, 0) / (7, 0) ở khai - trung cuộc khi bị góc Xe úp đối phương bắt lại:
      if ((move.piece.initialRole === 'cannon' || move.piece.trueRole === 'cannon') && move.captured.initialRole === 'horse') {
        score -= 30000; // Lọc bỏ hoàn toàn nước đi sai lầm này ở mọi cấp độ chơi!
      }
    }
  }

  // 2. Developing / uncovering moves:
  // Ưu tiên hàng đầu: Mở Tốt úp (đặc biệt là Tốt 3, Tốt 7 để thông lộ Mã; Tốt 5 tranh trung lộ; Tốt biên)
  if (move.piece.isCovered) {
    const role = move.piece.initialRole;
    if (isOpening && !hasFullSet) {
      // ƯU TIÊN MỞ ÚP HÀNG ĐẦU KHI CHƯA ĐỦ 1 BỘ XE PHÁO MÃ:
      score += 220; // Thưởng cực cao cho mọi nước mở quân úp
      if (role === 'soldier') {
        if (move.from.x === 2 || move.from.x === 6) {
          score += 160; // B3.1 & B7.1 thông lộ Mã & Tượng
        } else if (move.from.x === 4) {
          score += 130; // B5.1 tranh trung lộ
        } else {
          score += 65; // Tốt biên
        }
      } else if (role === 'elephant') {
        score += move.to.x === 4 ? 110 : 85;
      } else if (role === 'advisor') {
        score += move.to.x === 4 ? 95 : 75;
      } else if (role === 'horse') {
        score += 85;
      } else if (role === 'cannon') {
        if (move.to.x === 4) score += 90;
      } else if (role === 'chariot') {
        if (!move.captured) score -= 300; // Vẫn phạt đi Xe úp vu vơ khi còn quân úp khác
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
        } else if (move.captured.isCovered && move.captured.initialRole === 'horse') {
          score -= 30000; // Cấm kỵ: không dùng Pháo ăn Mã úp kẹt đáy ở khai cuộc
        } else {
          score += 140;
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
    if (!move.piece.isCovered) {
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

  // 4. Early King wander penalty in move ordering
  if (move.piece.trueRole === 'king' && !move.captured) {
    score -= 600; // Never choose King move in normal play unless forced
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

  // Lọc bỏ đòn Pháo ăn Mã úp và đòn Xe ngửa tự sát hoặc tham ăn Tốt úp biên / Sĩ úp khỏi Quiescence Search:
  const isEarlyPhase = allMoves.some((m) => m.piece.isCovered);
  if (isEarlyPhase && !inCheck) {
    candidateMoves = candidateMoves.filter((m) => {
      // 1. Pháo ăn Mã úp kẹt đáy
      if (
        (m.piece.initialRole === 'cannon' || m.piece.trueRole === 'cannon') &&
        m.captured?.isCovered &&
        m.captured.initialRole === 'horse'
      ) {
        return false;
      }
      // 2. Xe ngửa tự sát vào ô có căn hoặc tham ăn Tốt úp biên / Sĩ úp
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
      const isBlunderCannonForHorse =
        isOpening &&
        (move.piece.initialRole === 'cannon' || move.piece.trueRole === 'cannon') &&
        move.captured?.isCovered &&
        move.captured.initialRole === 'horse';
      const chariotEval = evaluateRevealedChariotMove(board, move, oppColor, totalBoardPieces);

      const nextBoard = simulateMove(board, move.from, move.to);
      let evalScore = minimaxSearch(nextBoard, depth - 1, alpha, beta, false, aiColor, deadline, nodeCounter);
      if (isBlunderCannonForHorse) {
        evalScore -= 20000;
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
      const isBlunderCannonForHorse =
        isOpening &&
        (move.piece.initialRole === 'cannon' || move.piece.trueRole === 'cannon') &&
        move.captured?.isCovered &&
        move.captured.initialRole === 'horse';
      const chariotEval = evaluateRevealedChariotMove(board, move, oppColor, totalBoardPieces);

      const nextBoard = simulateMove(board, move.from, move.to);
      let evalScore = minimaxSearch(nextBoard, depth - 1, alpha, beta, true, aiColor, deadline, nodeCounter);
      if (isBlunderCannonForHorse) {
        evalScore += 20000;
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

      // Cấm kỵ Xe ngửa tự sát và không tham tốt úp biên / sĩ úp
      const chariotEval = evaluateRevealedChariotMove(board, move, oppColor, rootTotalPieces);
      if (chariotEval.isFatalBlunder) {
        score -= 25000;
      } else if (chariotEval.penalty > 0) {
        score -= chariotEval.penalty;
      }

      // Cấm kỵ Pháo ăn Mã úp kẹt đáy
      const isBlunderCannonForHorse =
        (move.piece.initialRole === 'cannon' || move.piece.trueRole === 'cannon') &&
        move.captured?.isCovered &&
        move.captured.initialRole === 'horse';
      if (isBlunderCannonForHorse) {
        score -= 25000;
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
    // Chỉ chọn trong số các nước hợp lý (loại bỏ hoàn toàn các nước tự sát hoặc blunder nặng)
    const sensibleMoves = scoredMoves.filter((m) => m.score > -5000);
    const candidatePool = sensibleMoves.length > 0 ? sensibleMoves : scoredMoves;
    const topChoices = candidatePool.slice(0, Math.min(3, candidatePool.length));
    return topChoices[Math.floor(Math.random() * topChoices.length)].move;
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
        alpha,
        beta,
        false,
        aiColor,
        deadline,
        nodeCounter,
        overallBestMove
      );

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
      // 1. Không bao giờ mang Pháo giả (hoặc Pháo) đi đổi lấy Mã giả của đối thủ!
      const isEarlyGame = rootTotalPieces >= 20 || (!moveHistory || moveHistory.length <= 40);
      const isBlunderCannonForHorse =
        isEarlyGame &&
        (move.piece.initialRole === 'cannon' || move.piece.trueRole === 'cannon') &&
        move.captured?.isCovered &&
        move.captured.initialRole === 'horse';

      if (isBlunderCannonForHorse) {
        score -= 25000;
      }

      // 2. Không bao giờ mang Xe ngửa tự sát vào ô có căn hoặc tham ăn Tốt úp biên / Sĩ úp của đối thủ!
      const oppColor: PlayerColor = aiColor === 'red' ? 'black' : 'red';
      const chariotEval = evaluateRevealedChariotMove(board, move, oppColor, rootTotalPieces);
      if (chariotEval.isFatalBlunder) {
        score -= 25000;
      } else if (chariotEval.penalty > 0) {
        score -= chariotEval.penalty;
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
