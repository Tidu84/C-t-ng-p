/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';
import { LabelDisplayMode, Piece, PlayerColor } from '../types';
import { ROLE_HAN_CHARACTERS, ROLE_VI_NAMES } from '../utils/chessRules';

interface ChessPieceProps {
  piece: Piece;
  isSelected?: boolean;
  isLastMove?: boolean;
  isInCheck?: boolean;
  displayMode?: LabelDisplayMode;
  size?: number; // in pixels (default 48-56px responsive)
}

export const ChessPiece: React.FC<ChessPieceProps> = ({
  piece,
  isSelected = false,
  isLastMove = false,
  isInCheck = false,
  displayMode = 'both',
  size,
}) => {
  const isRed = piece.color === 'red';
  const role = piece.trueRole;

  const hanChar = ROLE_HAN_CHARACTERS[role] ? ROLE_HAN_CHARACTERS[role][piece.color] : '?';
  const viName = ROLE_VI_NAMES[role] ? ROLE_VI_NAMES[role][piece.color] : '';

  // COVERED (QUÂN ÚP) PIECE RENDERING
  if (piece.isCovered) {
    return (
      <div
        className={`relative flex items-center justify-center rounded-full select-none cursor-pointer transition-transform duration-150 ${
          isSelected ? 'scale-110' : 'hover:scale-105'
        }`}
        style={{
          width: size ? `${size}px` : '100%',
          height: size ? `${size}px` : '100%',
          aspectRatio: '1/1',
        }}
      >
        {/* Outer wooden beveled token */}
        <div
          className={`w-full h-full rounded-full flex items-center justify-center relative shadow-lg ${
            isRed
              ? 'bg-gradient-to-br from-amber-800 via-amber-900 to-stone-950 border-2 border-amber-600/70 shadow-amber-950/80'
              : 'bg-gradient-to-br from-stone-800 via-stone-900 to-black border-2 border-stone-600/70 shadow-stone-950/80'
          } ${
            isSelected
              ? 'ring-4 ring-amber-400 ring-offset-2 ring-offset-stone-900 shadow-amber-500/50 shadow-xl'
              : ''
          } ${
            isLastMove
              ? 'ring-2 ring-emerald-400/80'
              : ''
          }`}
        >
          {/* Inner decorative groove circle */}
          <div
            className={`w-[84%] h-[84%] rounded-full border border-dashed flex flex-col items-center justify-center relative ${
              isRed
                ? 'border-amber-500/50 bg-radial from-amber-900/60 to-stone-950/90 text-amber-300'
                : 'border-stone-500/50 bg-radial from-stone-800/60 to-black/90 text-stone-300'
            }`}
          >
            {/* Center covered motif badge */}
            <div className="relative flex flex-col items-center justify-center">
              <svg
                viewBox="0 0 24 24"
                className={`w-5 h-5 md:w-6 md:h-6 opacity-75 ${
                  isRed ? 'text-amber-400' : 'text-stone-300'
                }`}
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                {/* Traditional geometric octagon badge */}
                <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86" />
                <circle cx="12" cy="12" r="3" fill="currentColor" fillOpacity="0.4" />
              </svg>
              <span className="text-[10px] md:text-[11px] font-bold tracking-wider uppercase mt-0.5 opacity-90">
                ÚP
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // UNCOVERED (QUÂN NGỬA) PIECE RENDERING
  return (
    <motion.div
      initial={{ rotateY: 90, scale: 0.8 }}
      animate={{ rotateY: 0, scale: 1 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      className={`relative flex items-center justify-center rounded-full select-none cursor-pointer transition-transform duration-150 ${
        isSelected ? 'scale-110' : 'hover:scale-105'
      }`}
      style={{
        width: size ? `${size}px` : '100%',
        height: size ? `${size}px` : '100%',
        aspectRatio: '1/1',
      }}
    >
      {/* 3D wooden token appearance */}
      <div
        className={`w-full h-full rounded-full flex items-center justify-center relative shadow-lg ${
          isRed
            ? 'bg-gradient-to-br from-amber-100 via-amber-200 to-amber-300 border-2 border-red-700/80 shadow-red-950/60'
            : 'bg-gradient-to-br from-stone-100 via-stone-200 to-stone-300 border-2 border-stone-800/80 shadow-stone-950/60'
        } ${
          isSelected
            ? 'ring-4 ring-amber-400 ring-offset-2 ring-offset-stone-900 shadow-amber-500/50 shadow-xl'
            : ''
        } ${
          isLastMove
            ? 'ring-2 ring-emerald-500'
            : ''
        } ${
          isInCheck
            ? 'ring-4 ring-red-500 animate-pulse'
            : ''
        }`}
      >
        {/* Inner concentric ring */}
        <div
          className={`w-[85%] h-[85%] rounded-full border flex flex-col items-center justify-center relative ${
            isRed
              ? 'border-red-600/40 bg-gradient-to-b from-amber-50 to-amber-100/90'
              : 'border-stone-700/40 bg-gradient-to-b from-stone-50 to-stone-100/90'
          }`}
        >
          {/* Chinese Calligraphy Character */}
          {displayMode !== 'vi' && (
            <span
              style={{ fontFamily: "'Ma Shan Zheng', 'Noto Serif', serif" }}
              className={`leading-none font-bold ${
                isRed ? 'text-red-700 drop-shadow-sm' : 'text-stone-900 drop-shadow-sm'
              } ${
                displayMode === 'han'
                  ? 'text-2xl sm:text-3xl md:text-3xl'
                  : 'text-xl sm:text-2xl md:text-2xl -mt-1'
              }`}
            >
              {hanChar}
            </span>
          )}

          {/* Vietnamese Name */}
          {displayMode !== 'han' && (
            <span
              className={`font-semibold tracking-tight uppercase ${
                isRed ? 'text-red-800' : 'text-stone-800'
              } ${
                displayMode === 'vi'
                  ? 'text-sm sm:text-base font-bold'
                  : 'text-[9px] sm:text-[10px] -mt-0.5'
              }`}
            >
              {viName}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
};
