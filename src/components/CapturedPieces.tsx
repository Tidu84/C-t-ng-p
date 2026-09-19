/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { LabelDisplayMode, Piece, PlayerColor } from '../types';
import { ChessPiece } from './ChessPiece';

interface CapturedPiecesProps {
  redCaptured: Piece[];    // Pieces captured by Red (i.e. Black pieces)
  blackCaptured: Piece[];  // Pieces captured by Black (i.e. Red pieces)
  displayMode: LabelDisplayMode;
}

export const CapturedPieces: React.FC<CapturedPiecesProps> = ({
  redCaptured,
  blackCaptured,
  displayMode,
}) => {
  return (
    <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-3">
      {/* Captured by Red (Black's losses) */}
      <div className="bg-stone-800/80 backdrop-blur-sm border border-stone-700/60 rounded-xl p-3 shadow-md">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-sm" />
            <span className="text-xs font-semibold uppercase tracking-wider text-red-300">
              Quân Đỏ đã bắt ({redCaptured.length})
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5 min-h-[40px] items-center p-1.5 bg-stone-900/60 rounded-lg border border-stone-800">
          {redCaptured.length === 0 ? (
            <span className="text-xs text-stone-500 italic px-2">Chưa bắt quân nào</span>
          ) : (
            redCaptured.map((piece, idx) => (
              <div key={`captured-black-${piece.id}-${idx}`} className="w-8 h-8">
                <ChessPiece piece={piece} displayMode={displayMode} size={32} />
              </div>
            ))
          )}
        </div>
      </div>

      {/* Captured by Black (Red's losses) */}
      <div className="bg-stone-800/80 backdrop-blur-sm border border-stone-700/60 rounded-xl p-3 shadow-md">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-stone-300 shadow-sm" />
            <span className="text-xs font-semibold uppercase tracking-wider text-stone-300">
              Quân Đen đã bắt ({blackCaptured.length})
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5 min-h-[40px] items-center p-1.5 bg-stone-900/60 rounded-lg border border-stone-800">
          {blackCaptured.length === 0 ? (
            <span className="text-xs text-stone-500 italic px-2">Chưa bắt quân nào</span>
          ) : (
            blackCaptured.map((piece, idx) => (
              <div key={`captured-red-${piece.id}-${idx}`} className="w-8 h-8">
                <ChessPiece piece={piece} displayMode={displayMode} size={32} />
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
