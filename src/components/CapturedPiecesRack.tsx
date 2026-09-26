/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { LabelDisplayMode, Piece, PlayerColor, PieceRole } from '../types';
import { ChessPiece } from './ChessPiece';

interface CapturedPiecesRackProps {
  playerColor: PlayerColor;
  capturedPieces: Piece[];
  displayMode: LabelDisplayMode;
  side: 'top' | 'bottom';
}

export const CapturedPiecesRack: React.FC<CapturedPiecesRackProps> = ({
  playerColor,
  capturedPieces,
  displayMode,
}) => {
  const isRed = playerColor === 'red';

  // Covered pieces captured by this player
  const coveredCaptures = capturedPieces.filter((p) => p.wasCoveredWhenCaptured);
  const coveredCount = coveredCaptures.length;

  // Open pieces captured by this player
  const openCaptures = capturedPieces.filter((p) => !p.wasCoveredWhenCaptured);

  // Sort open pieces by value hierarchy
  const ROLE_ORDER: Record<PieceRole, number> = {
    king: 0,
    chariot: 1,
    cannon: 2,
    horse: 3,
    elephant: 4,
    advisor: 5,
    soldier: 6,
  };

  const sortedOpenCaptures = [...openCaptures].sort(
    (a, b) => ROLE_ORDER[a.trueRole] - ROLE_ORDER[b.trueRole]
  );

  const isEmpty = capturedPieces.length === 0;
  if (isEmpty) return null;

  return (
    <div
      className={`w-full px-2 py-0.5 rounded-md flex items-center justify-between gap-1.5 transition-all text-[9px] ${
        isRed
          ? 'bg-red-950/20 text-red-300'
          : 'bg-stone-900/40 text-stone-400'
      }`}
    >
      {/* Side Label & Count */}
      <div className="flex items-center gap-1 shrink-0">
        <span
          className={`w-1.5 h-1.5 rounded-full ${
            isRed ? 'bg-red-500' : 'bg-stone-400'
          }`}
        />
        <span className="font-semibold font-mono-code">
          {isRed ? 'Đỏ' : 'Đen'} ăn ({capturedPieces.length}):
        </span>
      </div>

      {/* Pieces Lineup: Aligned directly to this player's side of the board */}
      <div className="flex-1 flex items-center justify-end gap-1 overflow-x-auto no-scrollbar">
        {/* Face-down piece summary */}
        {coveredCount > 0 && (
          <div
            className="flex items-center gap-0.5 px-1 py-0.2 rounded bg-stone-950/80 border border-amber-600/40 shrink-0"
            title={`Đã ăn ${coveredCount} quân úp`}
          >
            <div className="w-3.5 h-3.5 rounded-full bg-gradient-to-br from-[#8d5b4c] to-[#38231c] border border-amber-500/70 flex items-center justify-center shrink-0">
              <span className="text-[6px] text-amber-300 font-bold leading-none">Ú</span>
            </div>
            <span className="text-[9px] font-bold text-amber-400 font-mono-code">
              ×{coveredCount}
            </span>
          </div>
        )}

        {coveredCount > 0 && sortedOpenCaptures.length > 0 && (
          <span className="text-stone-700 text-[9px] shrink-0">|</span>
        )}

        {/* Revealed pieces displayed in mini chips */}
        {sortedOpenCaptures.map((piece, idx) => (
          <div
            key={`open-cap-${piece.id}-${idx}`}
            className="w-4 h-4 sm:w-5 sm:h-5 shrink-0 transition-transform hover:scale-110"
            title={`Quân ${isRed ? 'Đỏ' : 'Đen'} ăn được`}
          >
            <ChessPiece piece={piece} displayMode={displayMode} size={18} />
          </div>
        ))}
      </div>
    </div>
  );
};
