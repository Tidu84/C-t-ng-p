/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Move, Piece, PlayerColor } from '../types';

export type Board = (Piece | null)[][];

/** Snapshot of the game BEFORE a move, used by the undo stack. */
export interface HistorySnapshot {
  board: Board;
  turn: PlayerColor;
  capturedByRed: Piece[];
  capturedByBlack: Piece[];
  lastMove: Move | null;
}

const cloneBoard = (board: Board): Board => board.map((row) => [...row]);

/** Turn a recorded captured piece back into the piece that stood on the board. */
function restoreCapturedPiece(captured: Piece): Piece {
  const { wasCoveredWhenCaptured, capturedBy: _capturedBy, ...rest } = captured;
  return { ...rest, isCovered: wasCoveredWhenCaptured ?? captured.isCovered };
}

/**
 * Rebuild the starting board by undoing `moves` backwards from `finalBoard`.
 * Used for old saved games that did not store `initialBoard`.
 * Returns null if the move list does not match the board.
 */
export function rebuildInitialBoard(finalBoard: Board, moves: Move[]): Board | null {
  const board = cloneBoard(finalBoard);
  for (let i = moves.length - 1; i >= 0; i--) {
    const m = moves[i];
    const piece = board[m.to.y]?.[m.to.x];
    if (!piece || piece.id !== m.piece.id || board[m.from.y]?.[m.from.x]) return null;
    board[m.from.y][m.from.x] = { ...piece, isCovered: m.wasCovered };
    board[m.to.y][m.to.x] = m.captured ? restoreCapturedPiece(m.captured) : null;
  }
  return board;
}

/**
 * Replay `moves` from `initialBoard` and return the undo stack (one snapshot before each move),
 * mirroring what executeMove records. Returns null if a move does not fit the board, or if
 * `expectedFinalBoard` is given and the replayed position does not match it.
 */
export function rebuildHistoryStack(
  initialBoard: Board,
  moves: Move[],
  expectedFinalBoard?: Board
): HistorySnapshot[] | null {
  let board = cloneBoard(initialBoard);
  let capturedByRed: Piece[] = [];
  let capturedByBlack: Piece[] = [];
  let lastMove: Move | null = null;
  const stack: HistorySnapshot[] = [];

  for (const m of moves) {
    const piece = board[m.from.y]?.[m.from.x];
    if (!piece || piece.id !== m.piece.id) return null;
    stack.push({ board: cloneBoard(board), turn: piece.color, capturedByRed, capturedByBlack, lastMove });

    board = cloneBoard(board);
    board[m.from.y][m.from.x] = null;
    board[m.to.y][m.to.x] = { ...piece, isCovered: false };
    if (m.captured) {
      if (piece.color === 'red') capturedByRed = [...capturedByRed, m.captured];
      else capturedByBlack = [...capturedByBlack, m.captured];
    }
    lastMove = m;
  }
  if (expectedFinalBoard && !boardsMatch(board, expectedFinalBoard)) return null;
  return stack;
}

/** Positions + identities match (used to sanity-check a rebuilt history against the saved board). */
export function boardsMatch(a: Board, b: Board): boolean {
  for (let y = 0; y < a.length; y++) {
    for (let x = 0; x < a[y].length; x++) {
      const pa = a[y][x];
      const pb = b[y]?.[x] ?? null;
      if (!pa || !pb) {
        if (pa !== pb) return false;
      } else if (pa.id !== pb.id || pa.isCovered !== pb.isCovered) {
        return false;
      }
    }
  }
  return true;
}
