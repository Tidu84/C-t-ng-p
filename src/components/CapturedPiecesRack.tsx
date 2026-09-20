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

  return (
    <div
      className={`w-full max-w-[590px] px-2.5 py-1 rounded-lg border flex items-center justify-between gap-2 transition-all ${
        isRed
          ? 'bg-stone-900/90 border-red-950/60 shadow-sm'
          : 'bg-stone-900/90 border-stone-800 shadow-sm'
      }`}
    >
      {/* Side Label & Count */}
      <div className="flex items-center gap-1.5 shrink-0">
        <span
          className={`w-2 h-2 rounded-full ${
            isRed ? 'bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.6)]' : 'bg-stone-400'
          }`}
        />
        <span
          className={`text-[10px] font-bold uppercase tracking-wider font-mono-code ${
            isRed ? 'text-red-300' : 'text-stone-300'
          }`}
        >
          {isRed ? 'Đỏ ăn được' : 'Đen ăn được'} ({capturedPieces.length}):
        </span>
      </div>

      {/* Pieces Lineup: Aligned directly to this player's side of the board */}
      <div className="flex-1 flex items-center justify-end gap-1.5 overflow-x-auto py-0.5 no-scrollbar">
        {isEmpty ? (
          <span className="text-[10px] text-stone-500 italic font-mono-code">
            Chưa bắt quân
          </span>
        ) : (
          <>
            {/* Nếu là ăn úp thì chỉ cần báo hình quân úp x số lượng là được */}
            {coveredCount > 0 && (
              <div
                className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-stone-950/80 border border-amber-600/50 shrink-0 shadow-inner group relative"
                title={`Đã ăn ${coveredCount} quân úp bí mật`}
              >
                {/* Face-down piece visual emblem */}
                <div className="w-5 h-5 rounded-full bg-gradient-to-br from-[#8d5b4c] via-[#5c3a30] to-[#38231c] border border-amber-500/70 shadow-sm flex items-center justify-center shrink-0">
                  <div className="w-3.5 h-3.5 rounded-full border border-dashed border-amber-400/50 flex items-center justify-center">
                    <span className="text-[7px] text-amber-300 font-bold font-serif leading-none">
                      ÚP
                    </span>
                  </div>
                </div>

                <span className="text-[11px] font-bold text-amber-400 font-mono-code">
                  ×{coveredCount}
                </span>
              </div>
            )}

            {/* Separator if both covered and open exist */}
            {coveredCount > 0 && sortedOpenCaptures.length > 0 && (
              <span className="text-stone-700 text-[10px] shrink-0">|</span>
            )}

            {/* Revealed / Open captured pieces displayed in a straight row */}
            {sortedOpenCaptures.map((piece, idx) => (
              <div
                key={`open-cap-${piece.id}-${idx}`}
                className="w-6 h-6 shrink-0 transition-transform hover:scale-110"
                title={`Quân ${isRed ? 'Đỏ' : 'Đen'} ăn được`}
              >
                <ChessPiece piece={piece} displayMode={displayMode} size={24} />
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
};
