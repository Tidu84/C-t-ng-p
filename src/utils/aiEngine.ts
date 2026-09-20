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
  return board.map((row) =>
    row.map((piece) => {
      if (!piece) return null;
      if (piece.isCovered) {
        // Redact secret trueRole completely so search cannot peek.
        // PRESERVE the real piece.id so repetition tracking (consecutive checks & chases) works seamlessly!
        return {
          id: piece.id,
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
  // Balanced strategic operational bias for unrevealed pieces.
  // Kept modest (between -15 and +35) to conserve material zero-sum balance during minimax search
  // and prevent the AI from suicidally pushing pawns just to shed a negative penalty.
  switch (initialRole) {
    case 'chariot':
      return 35; // Slight positional bonus for high line-control of Xe úp
    case 'cannon':
      return totalPieces >= 18 ? 25 : 15; // Tactical long-range jumping power
    case 'horse':
      return 0;
    case 'elephant':
      return 5;
    case 'advisor':
      return 5;
    case 'soldier':
    default:
      return -10; // Slight incentive to develop soldier row
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
      score += forwardRank * 12;
      // Control rib files (columns 3 and 5)
      if (x === 3 || x === 5) {
        score += 30;
      }
      // On opponent's pawn line / throat rank
      if (forwardRank === 6 || forwardRank === 7) {
        score += 45;
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
            val += 25; // Keep home defense intact!
          } else if (y === 3 && x === 4) {
            val += 25; // Central pawn úp shields middle file
          }
        } else {
          if (y === 9 && (x === 3 || x === 5 || x === 2 || x === 6)) {
            val += 25;
          } else if (y === 6 && x === 4) {
            val += 25;
          }
        }
      } else if (piece.simulatedRevealed) {
        // Trong mô phỏng tìm kiếm, quân này đã được MỞ CÂY:
        // Đã thoát khỏi nắp úp tĩnh để trở thành quân hoạt động tự do!
        val = piece.color === color ? myCoveredVal : oppCoveredVal;

        // ƯU TIÊN MỞ CÂY (Development Tempo Bonus):
        // Mở Binh 3/7 thông đường Mã & Tượng, mở Binh 5 chiếm trung tâm, mở Sĩ/Tượng hoạt động:
        const isOpeningPhase = totalPieces >= 24;
        const isMidgamePhase = totalPieces >= 14 && totalPieces < 24;
        if (isOpeningPhase) {
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

  // A. BẢO TOÀN QUÂN ÚP & GIỮ QUÂN ("GIỮ ÚP & TRÁNH QUÂN TREO"):
  // Không để quân úp hoặc quân vừa mở của mình bị đối thủ đe dọa mà không có căn bảo vệ.
  for (const myP of myActivePieces) {
    if (myP.piece.trueRole === 'king') continue;
    const attackers = oppActivePieces.filter((oppP) =>
      canPieceAttackSquare(board, { x: oppP.x, y: oppP.y }, { x: myP.x, y: myP.y }, oppP.piece)
    );

    if (attackers.length > 0) {
      const isDefended = isSquareDefendedBy(board, { x: myP.x, y: myP.y }, color);
      if (!isDefended) {
        // "Treo quân / Treo úp": bị đối thủ ngắm bắt mà không có căn giữ!
        // Trong khai cuộc mất úp hoặc mất quân là tối kỵ (mất Pháo/Xe/quân chủ lực), phạt nặng để AI luôn giữ úp.
        const pieceVal = (myP.piece.isCovered || myP.piece.simulatedRevealed)
          ? myCoveredVal
          : getDynamicPieceValue(myP.piece.trueRole as PieceRole, totalPieces);
        const penalty = isOpening ? Math.round(pieceVal * 0.85) : isMidgame ? Math.round(pieceVal * 0.55) : 35;
        score -= penalty;
      } else {
        score -= 10; // Có căn giữ úp, an toàn, chỉ chịu áp lực chiến thuật nhẹ
      }
    }
  }

  // B. KHÓA ÚP ĐỐI THỦ ("KHÓA NẮP & TÊ LIỆT QUÂN ÚP ĐỐI PHƯƠNG"):
  // 1. Khóa Tốt úp đối phương (chặn đường tiến của Binh úp, làm tê liệt cả cánh sau):
  const oppPawnRank = opponentColor === 'black' ? 3 : 6;
  const oppPawnAdvanceY = opponentColor === 'black' ? 4 : 5;
  for (const oppCov of oppCoveredPieces) {
    if (oppCov.y === oppPawnRank) {
      const advancePos = { x: oppCov.x, y: oppPawnAdvanceY };
      const isAdvanceControlled = myActivePieces.some((myP) =>
        canPieceAttackSquare(board, { x: myP.x, y: myP.y }, advancePos, myP.piece)
      );
      if (isAdvanceControlled) {
        // Tốt úp đối phương không thể tiến lên mà không bị ăn ngay -> Khóa cứng Tốt và phong tỏa Mã/Tượng úp phía sau!
        score += isOpening ? 45 : isMidgame ? 25 : 10;
      }
    }

    // 2. Đe dọa / bắt quân úp đối phương ("Ghim ép & Bắt úp đối thủ"):
    const attackers = myActivePieces.filter((myP) =>
      canPieceAttackSquare(board, { x: myP.x, y: myP.y }, oppCov, myP.piece)
    );
    if (attackers.length > 0) {
      const isDefended = isSquareDefendedBy(board, oppCov, opponentColor);
      if (!isDefended) {
        // Bắt được quân úp treo của đối phương: phần thưởng rất lớn
        const reward = isOpening ? Math.round(oppCoveredVal * 0.70) : isMidgame ? Math.round(oppCoveredVal * 0.40) : 25;
        score += reward;
      } else {
        score += 15; // Ghim ép quân giữ của đối thủ
      }
    }
  }

  // 3. Phạt nếu Tốt úp của chính mình bị đối phương khóa:
  const myPawnRank = color === 'black' ? 3 : 6;
  const myPawnAdvanceY = color === 'black' ? 4 : 5;
  for (const myCov of myCoveredPieces) {
    if (myCov.y === myPawnRank) {
      const advancePos = { x: myCov.x, y: myPawnAdvanceY };
      const isAdvanceControlled = oppActivePieces.some((oppP) =>
        canPieceAttackSquare(board, { x: oppP.x, y: oppP.y }, advancePos, oppP.piece)
      );
      if (isAdvanceControlled) {
        score -= isOpening ? 40 : isMidgame ? 20 : 10;
      }
    }
  }

  // C. KIỂM SOÁT BỜ SÔNG (Ranks 4 & 5 - Phong tỏa trung tuyến):
  if (isOpening || isMidgame) {
    for (const myP of myActivePieces) {
      if (myP.y === 4 || myP.y === 5) {
        score += 15;
      }
    }
    for (const oppP of oppActivePieces) {
      if (oppP.y === 4 || oppP.y === 5) {
        score -= 15;
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
          score -= Math.round(myVal * 0.90);
        } else {
          // Defended piece, but check for unfavorable trade (e.g. enemy Soldier/Horse attacking our Chariot):
          const lowestAttackerVal = Math.min(
            ...attackers.map((a) => (a.piece.isCovered ? oppCoveredVal : PIECE_VALUES[a.piece.trueRole as PieceRole] || 120))
          );
          if (lowestAttackerVal < myVal) {
            // Net loss if traded!
            score -= Math.round((myVal - lowestAttackerVal) * 0.80);
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

// Move scoring heuristic (MVV-LVA: Most Valuable Victim - Least Valuable Attacker)
function scoreMoveForOrdering(
  move: DetailedMove,
  myCoveredVal = 360,
  oppCoveredVal = 360
): number {
  let score = 0;

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

    // DYNAMIC POOL PROBABILITY TRADING ("Đếm Cây"):
    // In Cờ Úp, as major pieces (Chariots, Cannons, Horses) are revealed from a player's pool,
    // their remaining covered pieces decrease in expected value (diluted with Pawns/Advisors/Elephants).
    // If our pool is degraded (myCoveredVal low) while opponent's pool is rich (oppCoveredVal high):
    // Trading our covered piece (almost certainly a pawn/advisor) for opponent's covered piece
    // (which may hide a Chariot or Cannon) is a high-EV "đổi rác lấy vàng" play!
    if (move.piece.isCovered && move.captured.isCovered) {
      const poolAdvantage = oppCoveredVal - myCoveredVal;
      score += poolAdvantage * 12;

      // Specifically for Pháo úp eating Mã úp:
      if (move.piece.initialRole === 'cannon' && move.captured.initialRole === 'horse') {
        // Trong khai cuộc (nhiều quân trên bàn), tuyệt đối không đâm Pháo ăn Mã đáy bị Xe đối phương ăn lại ngay lập tức!
        if (move.from.y === (move.piece.color === 'red' ? 7 : 2) && (move.to.y === 0 || move.to.y === 9)) {
          score -= 500; // Phạt nặng khai cuộc "tham ăn Mã đáy" mất Pháo úp
        } else if (poolAdvantage > 30) {
          // Giai đoạn sau khi pool ta hết cây lớn: đổi rác lấy vàng
          score += 450;
        } else if (poolAdvantage < -30) {
          score -= 300;
        }
      }
    }
  }

  // 2. Developing / uncovering moves:
  // Balanced ordering that champions classical Cờ Úp development (Pháo đầu, Binh 3/7, Mã chính lộ, Phi Tượng)
  if (move.piece.isCovered) {
    const role = move.piece.initialRole;
    if (role === 'soldier') {
      score += 45;
      // High priority files: 3 & 7 (open horse lines), 5 (center pawn)
      if (move.from.x === 2 || move.from.x === 6) {
        score += 45; // B3.1 & B7.1 are gold-standard development moves
      } else if (move.from.x === 4) {
        score += 35; // B5.1
      } else {
        score += 15;
      }
    } else if (role === 'chariot') {
      if (!move.captured) {
        score -= 35; // Preserve Xe úp long-range control unless capturing or necessary
      } else {
        score += 180; // High-value capture with Xe úp
      }
    } else if (role === 'cannon') {
      if (move.to.x === 4) {
        score += 75; // Pháo đầu! Vào trung lộ khống chế tim cung đối phương
      } else if (!move.captured) {
        score -= 40; // Sideways purposeless cannon shuffle loses a vital tempo
      } else if (move.captured.isCovered && move.captured.initialRole === 'horse') {
        score += (oppCoveredVal - myCoveredVal) > 30 ? 120 : 60;
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

  // 3. Early King wander penalty in move ordering
  if (move.piece.trueRole === 'king' && !move.captured) {
    score -= 600; // Never choose King move in normal play unless forced
  }

  // 4. Advancing piece forward / Active Sĩ maneuvering
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
  const candidateMoves = inCheck ? allMoves : allMoves.filter((m) => m.captured !== null);
  if (candidateMoves.length === 0) return standPat;

  const myCoveredVal = getExpectedCoveredValue(board, currentColor);
  const oppCoveredVal = getExpectedCoveredValue(board, oppColor);
  candidateMoves.sort((a, b) => scoreMoveForOrdering(b, myCoveredVal, oppCoveredVal) - scoreMoveForOrdering(a, myCoveredVal, oppCoveredVal));

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

  // Check clock every 64 nodes to avoid heavy Date.now() overhead
  if ((nodeCounter.count & 63) === 0 && Date.now() >= deadline) {
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
    return quiescenceSearch(board, alpha, beta, isMaximizing, aiColor, deadline, nodeCounter, 2);
  }

  // Move ordering: PV move first, then MVV-LVA captures and uncovering
  const oppColor: PlayerColor = currentColor === 'red' ? 'black' : 'red';
  const myCoveredVal = getExpectedCoveredValue(board, currentColor);
  const oppCoveredVal = getExpectedCoveredValue(board, oppColor);

  legalMoves.sort((a, b) => {
    if (pvMove) {
      const aIsPv = a.from.x === pvMove.from.x && a.from.y === pvMove.from.y && a.to.x === pvMove.to.x && a.to.y === pvMove.to.y;
      const bIsPv = b.from.x === pvMove.from.x && b.from.y === pvMove.from.y && b.to.x === pvMove.to.x && b.to.y === pvMove.to.y;
      if (aIsPv) return -1;
      if (bIsPv) return 1;
    }
    return scoreMoveForOrdering(b, myCoveredVal, oppCoveredVal) - scoreMoveForOrdering(a, myCoveredVal, oppCoveredVal);
  });

  let bestVal = isMaximizing ? -Infinity : Infinity;

  if (isMaximizing) {
    for (const move of legalMoves) {
      const nextBoard = simulateMove(board, move.from, move.to);
      const evalScore = minimaxSearch(nextBoard, depth - 1, alpha, beta, false, aiColor, deadline, nodeCounter);

      if (nodeCounter.timedOut) return bestVal === -Infinity ? evaluateBoard(board, aiColor) : bestVal;

      bestVal = Math.max(bestVal, evalScore);
      alpha = Math.max(alpha, evalScore);
      if (beta <= alpha) break; // Alpha-beta cutoff
    }
  } else {
    for (const move of legalMoves) {
      const nextBoard = simulateMove(board, move.from, move.to);
      const evalScore = minimaxSearch(nextBoard, depth - 1, alpha, beta, true, aiColor, deadline, nodeCounter);

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
    for (const move of legalMoves) {
      const nextBoard = simulateMove(board, move.from, move.to);
      let score = evaluateBoard(nextBoard, aiColor) + (Math.random() * 50 - 25);
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
    // Pick from top 2-3 moves to simulate a beginner human without ridiculous blunders
    const topChoices = scoredMoves.slice(0, Math.min(3, scoredMoves.length));
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

  // Initial sort of root moves using MVV-LVA and dynamic piece-counting
  const rootMyCoveredVal = getExpectedCoveredValue(board, aiColor);
  const rootOppCoveredVal = getExpectedCoveredValue(board, aiColor === 'red' ? 'black' : 'red');
  legalMoves.sort((a, b) => scoreMoveForOrdering(b, rootMyCoveredVal, rootOppCoveredVal) - scoreMoveForOrdering(a, rootMyCoveredVal, rootOppCoveredVal));

  // Iterative deepening from depth 1 to maxDepthTarget
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

      if (nodeCounter.timedOut) {
        break;
      }

      if (score > depthBestScore) {
        depthBestScore = score;
        depthBestMove = move;
      }
      alpha = Math.max(alpha, score);

      // Periodically yield to event loop so browser stays 100% smooth and responsive
      if ((i % 4 === 0) || i === legalMoves.length - 1) {
        const elapsed = (Date.now() - startTime) / 1000;
        if (onProgress) {
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
