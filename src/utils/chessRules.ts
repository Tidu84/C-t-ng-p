/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Piece, PieceRole, PlayerColor, Position, Move } from '../types';

export const BOARD_COLS = 9;
export const BOARD_ROWS = 10;

// Standard starting positions for face-down and King pieces
export interface SlotConfig {
  x: number;
  y: number;
  initialRole: PieceRole;
}

export const RED_SLOTS: SlotConfig[] = [
  { x: 0, y: 9, initialRole: 'chariot' },
  { x: 1, y: 9, initialRole: 'horse' },
  { x: 2, y: 9, initialRole: 'elephant' },
  { x: 3, y: 9, initialRole: 'advisor' },
  { x: 5, y: 9, initialRole: 'advisor' },
  { x: 6, y: 9, initialRole: 'elephant' },
  { x: 7, y: 9, initialRole: 'horse' },
  { x: 8, y: 9, initialRole: 'chariot' },
  { x: 1, y: 7, initialRole: 'cannon' },
  { x: 7, y: 7, initialRole: 'cannon' },
  { x: 0, y: 6, initialRole: 'soldier' },
  { x: 2, y: 6, initialRole: 'soldier' },
  { x: 4, y: 6, initialRole: 'soldier' },
  { x: 6, y: 6, initialRole: 'soldier' },
  { x: 8, y: 6, initialRole: 'soldier' },
];

export const BLACK_SLOTS: SlotConfig[] = [
  { x: 0, y: 0, initialRole: 'chariot' },
  { x: 1, y: 0, initialRole: 'horse' },
  { x: 2, y: 0, initialRole: 'elephant' },
  { x: 3, y: 0, initialRole: 'advisor' },
  { x: 5, y: 0, initialRole: 'advisor' },
  { x: 6, y: 0, initialRole: 'elephant' },
  { x: 7, y: 0, initialRole: 'horse' },
  { x: 8, y: 0, initialRole: 'chariot' },
  { x: 1, y: 2, initialRole: 'cannon' },
  { x: 7, y: 2, initialRole: 'cannon' },
  { x: 0, y: 3, initialRole: 'soldier' },
  { x: 2, y: 3, initialRole: 'soldier' },
  { x: 4, y: 3, initialRole: 'soldier' },
  { x: 6, y: 3, initialRole: 'soldier' },
  { x: 8, y: 3, initialRole: 'soldier' },
];

// The 15 non-king pieces that get shuffled and placed face down
export const HIDDEN_PIECES_POOL: PieceRole[] = [
  'chariot', 'chariot',
  'horse', 'horse',
  'elephant', 'elephant',
  'advisor', 'advisor',
  'cannon', 'cannon',
  'soldier', 'soldier', 'soldier', 'soldier', 'soldier',
];

// Shuffle helper (Fisher-Yates)
export function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// Generate a fresh Cờ Tướng Úp board
export function initializeBoard(): (Piece | null)[][] {
  const board: (Piece | null)[][] = Array(BOARD_ROWS)
    .fill(null)
    .map(() => Array(BOARD_COLS).fill(null));

  // 1. Place Kings (Face-up)
  board[9][4] = {
    id: 'red_king',
    color: 'red',
    trueRole: 'king',
    isCovered: false,
    initialRole: 'king',
  };

  board[0][4] = {
    id: 'black_king',
    color: 'black',
    trueRole: 'king',
    isCovered: false,
    initialRole: 'king',
  };

  // 2. Shuffle and place Red face-down pieces
  const redShuffled = shuffleArray(HIDDEN_PIECES_POOL);
  RED_SLOTS.forEach((slot, index) => {
    board[slot.y][slot.x] = {
      id: `red_covered_${slot.x}_${slot.y}`,
      color: 'red',
      trueRole: redShuffled[index],
      isCovered: true,
      initialRole: slot.initialRole,
    };
  });

  // 3. Shuffle and place Black face-down pieces
  const blackShuffled = shuffleArray(HIDDEN_PIECES_POOL);
  BLACK_SLOTS.forEach((slot, index) => {
    board[slot.y][slot.x] = {
      id: `black_covered_${slot.x}_${slot.y}`,
      color: 'black',
      trueRole: blackShuffled[index],
      isCovered: true,
      initialRole: slot.initialRole,
    };
  });

  return board;
}

// Check palace bounds
export function isInPalace(x: number, y: number, color: PlayerColor): boolean {
  if (x < 3 || x > 5) return false;
  if (color === 'red') {
    return y >= 7 && y <= 9;
  } else {
    return y >= 0 && y <= 2;
  }
}

// Generate raw candidate moves for a piece at (x, y) ignoring king checks
export function getRawMoves(board: (Piece | null)[][], pos: Position): Position[] {
  const { x, y } = pos;
  const piece = board[y][x];
  if (!piece) return [];

  const moves: Position[] = [];
  const color = piece.color;

  // In Cờ Úp, if a piece is covered (or only simulated in search), its movement is governed by its initial starting role!
  // If genuinely uncovered in the real game, it moves according to its trueRole with special Cờ Úp permissions (Advisor & Elephant free roaming).
  const effectiveRole = (piece.isCovered || piece.simulatedRevealed) ? (piece.initialRole || piece.trueRole) : piece.trueRole;

  const isInsideBoard = (nx: number, ny: number) => nx >= 0 && nx < BOARD_COLS && ny >= 0 && ny < BOARD_ROWS;
  const canOccupy = (nx: number, ny: number) => {
    if (!isInsideBoard(nx, ny)) return false;
    const dest = board[ny][nx];
    return !dest || dest.color !== color;
  };

  switch (effectiveRole) {
    case 'king': {
      // Moves 1 step orthogonally within Palace
      const dirs = [
        { dx: 1, dy: 0 },
        { dx: -1, dy: 0 },
        { dx: 0, dy: 1 },
        { dx: 0, dy: -1 },
      ];
      for (const { dx, dy } of dirs) {
        const nx = x + dx;
        const ny = y + dy;
        if (isInPalace(nx, ny, color) && canOccupy(nx, ny)) {
          moves.push({ x: nx, y: ny });
        }
      }
      break;
    }

    case 'advisor': {
      if (piece.isCovered) {
        // Covered Advisor: moves 1 step diagonally within its Palace
        const dirs = [
          { dx: 1, dy: 1 },
          { dx: -1, dy: 1 },
          { dx: 1, dy: -1 },
          { dx: -1, dy: -1 },
        ];
        for (const { dx, dy } of dirs) {
          const nx = x + dx;
          const ny = y + dy;
          if (isInPalace(nx, ny, color) && canOccupy(nx, ny)) {
            moves.push({ x: nx, y: ny });
          }
        }
      } else {
        // UNCOVERED ADVISOR in Cờ Úp:
        // Famous rule: Sĩ sau khi mở ĐƯỢC PHÉP ra khỏi Cung và qua sông!
        // Moves 1 step diagonally in any direction anywhere on the board!
        const dirs = [
          { dx: 1, dy: 1 },
          { dx: -1, dy: 1 },
          { dx: 1, dy: -1 },
          { dx: -1, dy: -1 },
        ];
        for (const { dx, dy } of dirs) {
          const nx = x + dx;
          const ny = y + dy;
          if (canOccupy(nx, ny)) {
            moves.push({ x: nx, y: ny });
          }
        }
      }
      break;
    }

    case 'elephant': {
      // Moves 2 steps diagonally, blocked by eye at (x + dx/2, y + dy/2)
      const dirs = [
        { dx: 2, dy: 2 },
        { dx: -2, dy: 2 },
        { dx: 2, dy: -2 },
        { dx: -2, dy: -2 },
      ];
      for (const { dx, dy } of dirs) {
        const nx = x + dx;
        const ny = y + dy;
        const eyeX = x + dx / 2;
        const eyeY = y + dy / 2;

        if (isInsideBoard(nx, ny)) {
          // Check if eye is blocked
          if (!board[eyeY][eyeX]) {
            // In Cờ Úp, both face-down Elephant (Tượng giả) and revealed Elephant (Tượng sáng) are allowed to cross the river!
            if (canOccupy(nx, ny)) {
              moves.push({ x: nx, y: ny });
            }
          }
        }
      }
      break;
    }

    case 'horse': {
      // L-step: 1 orthogonal + 1 diagonal (or 2 steps in one dir + 1 in perpendicular)
      const horseSteps = [
        { legX: 0, legY: -1, targets: [{ dx: -1, dy: -2 }, { dx: 1, dy: -2 }] },
        { legX: 0, legY: 1, targets: [{ dx: -1, dy: 2 }, { dx: 1, dy: 2 }] },
        { legX: -1, legY: 0, targets: [{ dx: -2, dy: -1 }, { dx: -2, dy: 1 }] },
        { legX: 1, legY: 0, targets: [{ dx: 2, dy: -1 }, { dx: 2, dy: 1 }] },
      ];

      for (const { legX, legY, targets } of horseSteps) {
        const lx = x + legX;
        const ly = y + legY;
        // Check horse leg
        if (isInsideBoard(lx, ly) && !board[ly][lx]) {
          for (const { dx, dy } of targets) {
            const nx = x + dx;
            const ny = y + dy;
            if (canOccupy(nx, ny)) {
              moves.push({ x: nx, y: ny });
            }
          }
        }
      }
      break;
    }

    case 'chariot': {
      // Moves any distance orthogonally until blocked
      const dirs = [
        { dx: 1, dy: 0 },
        { dx: -1, dy: 0 },
        { dx: 0, dy: 1 },
        { dx: 0, dy: -1 },
      ];
      for (const { dx, dy } of dirs) {
        let nx = x + dx;
        let ny = y + dy;
        while (isInsideBoard(nx, ny)) {
          const dest = board[ny][nx];
          if (!dest) {
            moves.push({ x: nx, y: ny });
          } else {
            if (dest.color !== color) {
              moves.push({ x: nx, y: ny });
            }
            break; // Blocked
          }
          nx += dx;
          ny += dy;
        }
      }
      break;
    }

    case 'cannon': {
      // Moves straight without jumping, captures by jumping exactly 1 piece
      const dirs = [
        { dx: 1, dy: 0 },
        { dx: -1, dy: 0 },
        { dx: 0, dy: 1 },
        { dx: 0, dy: -1 },
      ];
      for (const { dx, dy } of dirs) {
        let nx = x + dx;
        let ny = y + dy;
        let jumped = false;

        while (isInsideBoard(nx, ny)) {
          const dest = board[ny][nx];
          if (!jumped) {
            if (!dest) {
              moves.push({ x: nx, y: ny }); // Regular non-capturing move
            } else {
              jumped = true; // Found the screen / mount (ngòi)
            }
          } else {
            if (dest) {
              if (dest.color !== color) {
                moves.push({ x: nx, y: ny }); // Capture!
              }
              break; // Cannot jump more than 1 piece
            }
          }
          nx += dx;
          ny += dy;
        }
      }
      break;
    }

    case 'soldier': {
      // Red soldiers move up (dy = -1), Black soldiers move down (dy = +1)
      const forwardDy = color === 'red' ? -1 : 1;
      const isPastRiver = color === 'red' ? y <= 4 : y >= 5;

      // Always can move 1 step forward
      const forwardY = y + forwardDy;
      if (canOccupy(x, forwardY)) {
        moves.push({ x, y: forwardY });
      }

      // FIX #1: If past river, can also move horizontally (whether covered or not)
      if (isPastRiver) {
        if (canOccupy(x - 1, y)) moves.push({ x: x - 1, y });
        if (canOccupy(x + 1, y)) moves.push({ x: x + 1, y });
      }
      break;
    }
  }

  return moves;
}

// Find position of King for a given color
export function findKing(board: (Piece | null)[][], color: PlayerColor): Position | null {
  for (let y = 0; y < BOARD_ROWS; y++) {
    for (let x = 0; x < BOARD_COLS; x++) {
      const piece = board[y][x];
      if (piece && piece.color === color && piece.trueRole === 'king') {
        return { x, y };
      }
    }
  }
  return null;
}

// Check if Kings face each other directly with no pieces in between
export function areKingsFacing(board: (Piece | null)[][]): boolean {
  const redKing = findKing(board, 'red');
  const blackKing = findKing(board, 'black');
  if (!redKing || !blackKing) return false;

  if (redKing.x !== blackKing.x) return false;

  const col = redKing.x;
  const minY = Math.min(redKing.y, blackKing.y);
  const maxY = Math.max(redKing.y, blackKing.y);

  for (let y = minY + 1; y < maxY; y++) {
    if (board[y][col] !== null) {
      return false; // Intervening piece found
    }
  }
  return true; // Directly facing!
}

// Check if a color's King is under attack with high-performance direct checks
export function isKingInCheck(board: (Piece | null)[][], color: PlayerColor): { inCheck: boolean; attackers: Position[] } {
  const kingPos = findKing(board, color);
  if (!kingPos) return { inCheck: false, attackers: [] };

  const { x: kx, y: ky } = kingPos;
  const opponentColor: PlayerColor = color === 'red' ? 'black' : 'red';
  const attackers: Position[] = [];

  // In Cờ Úp, face-down pieces or pieces uncovered only inside AI hypothetical simulation
  // cannot deliver check because their true identity is completely unknown until flipped in real game!
  const getEffectiveRole = (p: Piece) => (p.isCovered || p.simulatedRevealed ? null : p.trueRole);
  const isInside = (x: number, y: number) => x >= 0 && x < BOARD_COLS && y >= 0 && y < BOARD_ROWS;

  // 1. Direct King-facing check
  const oppKingPos = findKing(board, opponentColor);
  if (oppKingPos && oppKingPos.x === kx) {
    const minY = Math.min(ky, oppKingPos.y);
    const maxY = Math.max(ky, oppKingPos.y);
    let unobstructed = true;
    for (let y = minY + 1; y < maxY; y++) {
      if (board[y][kx] !== null) {
        unobstructed = false;
        break;
      }
    }
    if (unobstructed) {
      attackers.push(oppKingPos);
    }
  }

  // 2. Orthogonal rays (Chariot, Cannon, and adjacent King)
  const orthoDirs = [
    { dx: 1, dy: 0 },
    { dx: -1, dy: 0 },
    { dx: 0, dy: 1 },
    { dx: 0, dy: -1 },
  ];

  for (const { dx, dy } of orthoDirs) {
    let nx = kx + dx;
    let ny = ky + dy;
    let screenFound = false;

    while (isInside(nx, ny)) {
      const p = board[ny][nx];
      if (p) {
        if (!screenFound) {
          // First piece along the line
          if (p.color === opponentColor) {
            const role = getEffectiveRole(p);
            if (role === 'chariot') {
              attackers.push({ x: nx, y: ny });
            }
          }
          screenFound = true;
        } else {
          // Second piece along the line (mount / ngòi)
          if (p.color === opponentColor) {
            const role = getEffectiveRole(p);
            if (role === 'cannon') {
              attackers.push({ x: nx, y: ny });
            }
          }
          break; // Cannon can only jump one piece
        }
      }
      nx += dx;
      ny += dy;
    }
  }

  // 3. Horse checks (8 positions)
  const horseDeltas = [
    { hx: -1, hy: -2, lx: 0, ly: -1 },
    { hx: 1, hy: -2, lx: 0, ly: -1 },
    { hx: -1, hy: 2, lx: 0, ly: 1 },
    { hx: 1, hy: 2, lx: 0, ly: 1 },
    { hx: -2, hy: -1, lx: -1, ly: 0 },
    { hx: -2, hy: 1, lx: -1, ly: 0 },
    { hx: 2, hy: -1, lx: 1, ly: 0 },
    { hx: 2, hy: 1, lx: 1, ly: 0 },
  ];

  for (const { hx, hy, lx, ly } of horseDeltas) {
    const px = kx + hx;
    const py = ky + hy;
    if (isInside(px, py)) {
      const p = board[py][px];
      if (p && p.color === opponentColor && getEffectiveRole(p) === 'horse') {
        // Check leg: from horse at (px, py) towards king, leg is at (px - lx, py - ly)
        const legX = px - lx;
        const legY = py - ly;
        if (!board[legY][legX]) {
          attackers.push({ x: px, y: py });
        }
      }
    }
  }

  // 4. Soldier checks
  const soldierForwardDy = opponentColor === 'red' ? -1 : 1; // Direction enemy soldier moves
  // Enemy soldier that attacks king must be moving towards king
  const frontY = ky - soldierForwardDy; // One step behind in movement direction
  if (isInside(kx, frontY)) {
    const p = board[frontY][kx];
    if (p && p.color === opponentColor && getEffectiveRole(p) === 'soldier') {
      attackers.push({ x: kx, y: frontY });
    }
  }
  // Horizontal soldier checks (if enemy soldier is across the river)
  [-1, 1].forEach((dx) => {
    const sx = kx + dx;
    if (isInside(sx, ky)) {
      const p = board[ky][sx];
      if (p && p.color === opponentColor && getEffectiveRole(p) === 'soldier') {
        const isCrossRiver = opponentColor === 'red' ? ky <= 4 : ky >= 5;
        // FIX #2: covered soldiers cannot attack sideways while hidden
        if (isCrossRiver && !p.isCovered) {
          attackers.push({ x: sx, y: ky });
        }
      }
    }
  });

  // 5. Advisor checks (1 diagonal step)
  [
    { dx: 1, dy: 1 },
    { dx: -1, dy: 1 },
    { dx: 1, dy: -1 },
    { dx: -1, dy: -1 },
  ].forEach(({ dx, dy }) => {
    const ax = kx + dx;
    const ay = ky + dy;
    if (isInside(ax, ay)) {
      const p = board[ay][ax];
      if (p && p.color === opponentColor && getEffectiveRole(p) === 'advisor') {
        if (!p.isCovered) {
          attackers.push({ x: ax, y: ay });
        } else if (isInPalace(ax, ay, opponentColor)) {
          attackers.push({ x: ax, y: ay });
        }
      }
    }
  });

  // 6. Elephant checks (2 diagonal steps)
  [
    { dx: 2, dy: 2, ex: 1, ey: 1 },
    { dx: -2, dy: 2, ex: -1, ey: 1 },
    { dx: 2, dy: -2, ex: 1, ey: -1 },
    { dx: -2, dy: -2, ex: -1, ey: -1 },
  ].forEach(({ dx, dy, ex, ey }) => {
    const tx = kx + dx;
    const ty = ky + dy;
    if (isInside(tx, ty)) {
      const p = board[ty][tx];
      if (p && p.color === opponentColor && getEffectiveRole(p) === 'elephant') {
        // Check eye blocking
        if (!board[ky + ey][kx + ex]) {
          attackers.push({ x: tx, y: ty });
        }
      }
    }
  });

  return {
    inCheck: attackers.length > 0,
    attackers,
  };
}

// Simulate a move on a shallow cloned board
export function simulateMove(
  board: (Piece | null)[][],
  from: Position,
  to: Position
): (Piece | null)[][] {
  const nextBoard = board.map((row) => [...row]);
  const movingPiece = nextBoard[from.y][from.x];
  if (!movingPiece) return nextBoard;

  // Move piece to destination and uncover if it was covered
  const wasCovered = movingPiece.isCovered;
  nextBoard[from.y][from.x] = null;
  nextBoard[to.y][to.x] = {
    ...movingPiece,
    isCovered: false, // In Cờ Úp, moving uncovers the piece
    simulatedRevealed: wasCovered ? true : movingPiece.simulatedRevealed,
  };

  return nextBoard;
}

/**
 * Checks if a specific piece at `from` can attack the square `to` on the given board.
 */
export function getPieceOperationalRole(piece: Piece): PieceRole {
  return (piece.isCovered || piece.simulatedRevealed)
    ? (piece.initialRole || piece.trueRole)
    : piece.trueRole;
}

export function canPieceAttackSquare(
  board: (Piece | null)[][],
  from: Position,
  to: Position,
  piece: Piece
): boolean {
  if (from.x === to.x && from.y === to.y) return false;
  if (to.x < 0 || to.x >= BOARD_COLS || to.y < 0 || to.y >= BOARD_ROWS) return false;

  // In Cờ Úp, while covered pieces cannot formally 'chase' under repetition rules,
  // they physically control and defend squares according to their starting initialRole!
  // E.g., Xe úp at (0,0) physically strikes (1,0) to protect Mã úp.
  const role = getPieceOperationalRole(piece);
  const color = piece.color;

  switch (role) {
    case 'chariot': {
      if (from.x !== to.x && from.y !== to.y) return false;
      let piecesBetween = 0;
      if (from.x === to.x) {
        const minY = Math.min(from.y, to.y) + 1;
        const maxY = Math.max(from.y, to.y);
        for (let y = minY; y < maxY; y++) {
          if (board[y][from.x]) piecesBetween++;
        }
      } else {
        const minX = Math.min(from.x, to.x) + 1;
        const maxX = Math.max(from.x, to.x);
        for (let x = minX; x < maxX; x++) {
          if (board[from.y][x]) piecesBetween++;
        }
      }
      return piecesBetween === 0;
    }

    case 'cannon': {
      if (from.x !== to.x && from.y !== to.y) return false;
      let piecesBetween = 0;
      if (from.x === to.x) {
        const minY = Math.min(from.y, to.y) + 1;
        const maxY = Math.max(from.y, to.y);
        for (let y = minY; y < maxY; y++) {
          if (board[y][from.x]) piecesBetween++;
        }
      } else {
        const minX = Math.min(from.x, to.x) + 1;
        const maxX = Math.max(from.x, to.x);
        for (let x = minX; x < maxX; x++) {
          if (board[from.y][x]) piecesBetween++;
        }
      }
      return piecesBetween === 1;
    }

    case 'horse': {
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      if (Math.abs(dx) === 1 && Math.abs(dy) === 2) {
        const legY = from.y + dy / 2;
        return !board[legY][from.x];
      }
      if (Math.abs(dx) === 2 && Math.abs(dy) === 1) {
        const legX = from.x + dx / 2;
        return !board[from.y][legX];
      }
      return false;
    }

    case 'advisor': {
      const dx = Math.abs(to.x - from.x);
      const dy = Math.abs(to.y - from.y);
      if (dx === 1 && dy === 1) {
        if (piece.isCovered) {
          return isInPalace(to.x, to.y, color);
        }
        // Uncovered advisor can roam freely across the board
        return true;
      }
      return false;
    }

    case 'elephant': {
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      if (Math.abs(dx) === 2 && Math.abs(dy) === 2) {
        const eyeX = from.x + dx / 2;
        const eyeY = from.y + dy / 2;
        if (!board[eyeY][eyeX]) {
          // In Cờ Úp, both face-down Elephant (Tượng giả) and revealed Elephant are allowed to move and control squares across the river
          return true;
        }
      }
      return false;
    }

    case 'soldier': {
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const forwardDy = color === 'red' ? -1 : 1;
      if (dx === 0 && dy === forwardDy) return true;

      const isCrossRiver = color === 'red' ? from.y <= 4 : from.y >= 5;
      // FIX #2: hidden soldiers cannot attack sideways while still covered
      if (isCrossRiver && !piece.isCovered) {
        if (dy === 0 && Math.abs(dx) === 1) return true;
      }
      return false;
    }

    case 'king': {
      const dx = Math.abs(to.x - from.x);
      const dy = Math.abs(to.y - from.y);
      if ((dx === 1 && dy === 0) || (dx === 0 && dy === 1)) {
        return isInPalace(to.x, to.y, color);
      }
      return false;
    }

    default:
      return false;
  }
}

/**
 * Checks if a square is defended/protected by ANY piece of `defenderColor` (other than the piece sitting at `targetPos`).
 * If at least one friendly piece can attack this square, the piece sitting there is "có căn" (defended).
 * If no friendly piece can attack this square, the piece sitting there is "vô căn" (undefended).
 */
export function isSquareDefendedBy(
  board: (Piece | null)[][],
  targetPos: Position,
  defenderColor: PlayerColor
): boolean {
  for (let y = 0; y < BOARD_ROWS; y++) {
    for (let x = 0; x < BOARD_COLS; x++) {
      if (x === targetPos.x && y === targetPos.y) continue; // A piece cannot protect itself
      const piece = board[y][x];
      if (piece && piece.color === defenderColor) {
        if (canPieceAttackSquare(board, { x, y }, targetPos, piece)) {
          return true;
        }
      }
    }
  }
  return false;
}

export interface MoveRepetitionResult {
  isBanned: boolean;
  isCheck: boolean;
  chasedPieceIds: string[];
  consecutiveChecks: number;
  consecutiveChases: number;
  reason?: string;
}

/**
 * Evaluates repetition constraints:
 * 1. A single piece cannot deliver check more than 5 consecutive times.
 * 2. A single piece cannot chase an undefended piece more than 5 consecutive times.
 */
export function checkMoveRepetitionRules(
  board: (Piece | null)[][],
  from: Position,
  to: Position,
  moveHistory?: Move[]
): MoveRepetitionResult {
  const movingPiece = board[from.y][from.x];
  if (!movingPiece) {
    return {
      isBanned: false,
      isCheck: false,
      chasedPieceIds: [],
      consecutiveChecks: 0,
      consecutiveChases: 0,
    };
  }

  const playerColor = movingPiece.color;
  const oppColor: PlayerColor = playerColor === 'red' ? 'black' : 'red';
  const simBoard = simulateMove(board, from, to);
  const placedPiece = simBoard[to.y][to.x] || movingPiece;

  // 1. Check if this move delivers check
  const isCheck = isKingInCheck(simBoard, oppColor).inCheck;
  let pastChecks = 0;

  if (moveHistory && moveHistory.length > 0) {
    for (let i = moveHistory.length - 1; i >= 0; i--) {
      const m = moveHistory[i];
      if (m.piece.color === playerColor) {
        if (m.piece.id === movingPiece.id && m.isCheck) {
          pastChecks++;
        } else {
          break; // streak broken
        }
      }
    }
  }

  const consecutiveChecks = isCheck ? pastChecks + 1 : 0;
  const isCheckBanned = consecutiveChecks > 5;

  // 2. Check if this move chases any UNDEFENDED enemy piece (trueRole !== 'king')
  const chasedPieceIds: string[] = [];
  let maxChaseStreak = 0;
  let isChaseBanned = false;

  for (let y = 0; y < BOARD_ROWS; y++) {
    for (let x = 0; x < BOARD_COLS; x++) {
      const oppPiece = simBoard[y][x];
      if (oppPiece && oppPiece.color === oppColor && oppPiece.trueRole !== 'king') {
        // Can our placed piece capture this enemy piece?
        if (canPieceAttackSquare(simBoard, to, { x, y }, placedPiece)) {
          // Is this enemy square defended by any friendly piece of oppColor?
          const isDefended = isSquareDefendedBy(simBoard, { x, y }, oppColor);
          if (!isDefended) {
            chasedPieceIds.push(oppPiece.id);

            // Compute consecutive chases against THIS target
            let pastChases = 0;
            if (moveHistory && moveHistory.length > 0) {
              for (let i = moveHistory.length - 1; i >= 0; i--) {
                const m = moveHistory[i];
                if (m.piece.color === playerColor) {
                  if (
                    m.piece.id === movingPiece.id &&
                    m.chasedPieceIds &&
                    m.chasedPieceIds.includes(oppPiece.id)
                  ) {
                    pastChases++;
                  } else {
                    break; // streak broken
                  }
                }
              }
            }

            const currentStreak = pastChases + 1;
            if (currentStreak > maxChaseStreak) {
              maxChaseStreak = currentStreak;
            }
            if (currentStreak > 5) {
              isChaseBanned = true;
            }
          }
        }
      }
    }
  }

  const isBanned = isCheckBanned || isChaseBanned;
  let reason: string | undefined;
  if (isCheckBanned) {
    reason = 'Một cây không được chiếu tướng quá 5 lần liên tiếp!';
  } else if (isChaseBanned) {
    reason = 'Một cây không được đuổi một cây khác quá 5 lần liên tiếp khi cây đó không có cây giữ!';
  }

  return {
    isBanned,
    isCheck,
    chasedPieceIds,
    consecutiveChecks,
    consecutiveChases: maxChaseStreak,
    reason,
  };
}

// Get all legal moves for a piece, ensuring king safety and repetition rules
export function getLegalMoves(
  board: (Piece | null)[][],
  pos: Position,
  moveHistory?: Move[]
): Position[] {
  const piece = board[pos.y][pos.x];
  if (!piece) return [];

  const raw = getRawMoves(board, pos);
  return raw.filter((to) => {
    const simBoard = simulateMove(board, pos, to);
    // After our move, our own King must NOT be in check and Kings cannot face each other
    const checkState = isKingInCheck(simBoard, piece.color);
    if (checkState.inCheck) return false;

    // Enforce 5-consecutive-check and 5-consecutive-chase limits
    if (moveHistory && moveHistory.length > 0) {
      const repCheck = checkMoveRepetitionRules(board, pos, to, moveHistory);
      if (repCheck.isBanned) {
        return false;
      }
    }

    return true;
  });
}

// Get all legal moves for an entire side
export interface DetailedMove {
  from: Position;
  to: Position;
  piece: Piece;
  captured: Piece | null;
}

export function getAllLegalMoves(
  board: (Piece | null)[][],
  color: PlayerColor,
  moveHistory?: Move[]
): DetailedMove[] {
  const moves: DetailedMove[] = [];
  for (let y = 0; y < BOARD_ROWS; y++) {
    for (let x = 0; x < BOARD_COLS; x++) {
      const piece = board[y][x];
      if (piece && piece.color === color) {
        const legalTargets = getLegalMoves(board, { x, y }, moveHistory);
        for (const to of legalTargets) {
          moves.push({
            from: { x, y },
            to,
            piece,
            captured: board[to.y][to.x],
          });
        }
      }
    }
  }
  return moves;
}

// Vietnamese notation helper for moves
export const ROLE_VI_NAMES: Record<PieceRole, { red: string; black: string; short: string }> = {
  king: { red: 'Tướng', black: 'Tướng', short: 'Tg' },
  advisor: { red: 'Sĩ', black: 'Sĩ', short: 'S' },
  elephant: { red: 'Tượng', black: 'Tượng', short: 'T' },
  horse: { red: 'Mã', black: 'Mã', short: 'M' },
  chariot: { red: 'Xe', black: 'Xe', short: 'X' },
  cannon: { red: 'Pháo', black: 'Pháo', short: 'P' },
  soldier: { red: 'Tốt', black: 'Binh', short: 'B' },
};

export const ROLE_HAN_CHARACTERS: Record<PieceRole, { red: string; black: string }> = {
  king: { red: '帥', black: '將' },
  advisor: { red: '仕', black: '士' },
  elephant: { red: '相', black: '象' },
  horse: { red: '傌', black: '馬' },
  chariot: { red: '俥', black: '車' },
  cannon: { red: '炮', black: '砲' },
  soldier: { red: '兵', black: '卒' },
};

export function formatMoveNotation(
  from: Position,
  to: Position,
  piece: Piece,
  captured: Piece | null,
  wasCovered: boolean
): string {
  const roleName = ROLE_VI_NAMES[piece.trueRole].short;
  const colFrom = 9 - from.x; // Traditional 1-9 column indexing from player's view
  const colTo = 9 - to.x;
  const action = captured ? 'x' : '-';
  const prefix = wasCovered ? `[Úp] ` : '';
  const revealedSuffix = wasCovered ? ` (Mở ${ROLE_VI_NAMES[piece.trueRole].red})` : '';

  return `${prefix}${roleName}${colFrom}${action}${colTo}${revealedSuffix}`;
}
