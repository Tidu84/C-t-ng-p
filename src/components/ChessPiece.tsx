/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { LabelDisplayMode, Piece } from '../types';
import { ROLE_HAN_CHARACTERS, ROLE_VI_NAMES } from '../utils/chessRules';

interface ChessPieceProps {
  piece: Piece;
  isSelected?: boolean;
  isLastMove?: boolean;
  isInCheck?: boolean;
  displayMode?: LabelDisplayMode;
  size?: number;
  is3D?: boolean;
}

const ChessPieceComponent: React.FC<ChessPieceProps> = ({
  piece,
  isSelected = false,
  isLastMove = false,
  isInCheck = false,
  displayMode = 'both',
  size,
  is3D = false,
}) => {
  const isRed = piece.color === 'red';

  // 1. COVERED (QUÂN ÚP) PIECE - GỖ HOÀNG DƯƠNG VÀNG ÓNG
  if (piece.isCovered) {
    return (
      <div
        className="relative flex items-center justify-center select-none w-full h-full pointer-events-none transition-transform duration-150"
        style={{
          width: size ? `${size}px` : '100%',
          height: size ? `${size}px` : '100%',
          aspectRatio: '1/1',
          willChange: isSelected ? 'transform' : 'auto',
        }}
      >
        {/* Contact Shadow cast on board surface - GPU friendly radial gradient instead of expensive CSS blur filter */}
        <div
          className={`absolute left-1/2 -translate-x-1/2 rounded-full pointer-events-none transition-all duration-150 ${
            isSelected
              ? '-bottom-2.5 w-[90%] h-[20%]'
              : '-bottom-1 w-[82%] h-[16%]'
          }`}
          style={{
            background: isSelected
              ? 'radial-gradient(ellipse at center, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.2) 55%, transparent 75%)'
              : 'radial-gradient(ellipse at center, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.15) 50%, transparent 75%)',
          }}
        />

        {/* Physical Wooden Token Cylinder */}
        <div
          className={`w-full h-full rounded-full flex items-center justify-center relative transition-transform duration-150 pointer-events-none ${
            isSelected
              ? '-translate-y-3 sm:-translate-y-4 scale-[1.08] ring-2 ring-emerald-400 z-30'
              : ''
          } ${isLastMove ? 'ring-2 ring-amber-400' : ''}`}
          style={{
            background: 'radial-gradient(circle at 38% 30%, #fae8be 0%, #f3d18e 40%, #dba554 80%, #b67c2d 100%)',
            border: '2px solid #92400e',
            boxShadow: isSelected
              ? '0 3px 0 #78350f, 0 10px 18px rgba(0,0,0,0.6)'
              : is3D
              ? '0 2px 0 #853a08, 0 4px 0 #5c2504, 0 6px 10px rgba(0,0,0,0.45)'
              : '0 2px 0 #853a08, 0 3px 6px rgba(0,0,0,0.35)',
            transform: 'translateZ(0)',
            backfaceVisibility: 'hidden',
          }}
        >
          {/* Top Bevel Highlight Rim */}
          <div className="absolute inset-[1.5px] rounded-full border border-white/50 pointer-events-none" />

          {/* Circular Engraved Groove Ring */}
          <div
            className="w-[78%] h-[78%] rounded-full flex items-center justify-center relative pointer-events-none"
            style={{
              border: isRed ? '1.5px solid #b91c1c' : '1.5px solid #292524',
              background: 'radial-gradient(circle at 40% 36%, #fae6b8 0%, #edd195 55%, #d6a457 100%)',
            }}
          >
            <div className="w-[60%] h-[60%] rounded-full opacity-25 bg-[#92400e] pointer-events-none" />
          </div>
        </div>
      </div>
    );
  }

  // 2. UNCOVERED (QUÂN NGỬA) PIECE - GỖ TRẮNG NGÀ
  const role = piece.trueRole;
  const hanChar = ROLE_HAN_CHARACTERS[role] ? ROLE_HAN_CHARACTERS[role][piece.color] : '?';
  const viName = ROLE_VI_NAMES[role] ? ROLE_VI_NAMES[role][piece.color] : '';

  return (
    <div
      className="relative flex items-center justify-center select-none w-full h-full pointer-events-none transition-transform duration-150"
      style={{
        width: size ? `${size}px` : '100%',
        height: size ? `${size}px` : '100%',
        aspectRatio: '1/1',
        willChange: isSelected ? 'transform' : 'auto',
      }}
    >
      {/* Contact Shadow cast on board surface - GPU friendly radial gradient instead of expensive CSS blur filter */}
      <div
        className={`absolute left-1/2 -translate-x-1/2 rounded-full pointer-events-none transition-all duration-150 ${
          isSelected
            ? '-bottom-2.5 w-[90%] h-[20%]'
            : '-bottom-1 w-[82%] h-[16%]'
        }`}
        style={{
          background: isSelected
            ? 'radial-gradient(ellipse at center, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.2) 55%, transparent 75%)'
            : 'radial-gradient(ellipse at center, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.15) 50%, transparent 75%)',
        }}
      />

      {/* Physical Wooden Token Cylinder */}
      <div
        className={`w-full h-full rounded-full flex items-center justify-center relative transition-transform duration-150 pointer-events-none ${
          isSelected
            ? '-translate-y-3 sm:-translate-y-4 scale-[1.08] ring-2 ring-emerald-400 z-30'
            : ''
        } ${isLastMove ? 'ring-2 ring-amber-400' : ''} ${
          isInCheck ? 'ring-3 ring-red-500 animate-pulse' : ''
        }`}
        style={{
          background: 'radial-gradient(circle at 38% 30%, #ffffff 0%, #faf6ec 45%, #ede2cb 80%, #cfbe99 100%)',
          border: '2px solid #a89a77',
          boxShadow: isSelected
            ? '0 3px 0 #827150, 0 10px 18px rgba(0,0,0,0.6)'
            : is3D
            ? '0 2px 0 #ad9e82, 0 4px 0 #7a6d54, 0 6px 10px rgba(0,0,0,0.45)'
            : '0 2px 0 #ad9e82, 0 3px 6px rgba(0,0,0,0.35)',
          transform: 'translateZ(0)',
          backfaceVisibility: 'hidden',
        }}
      >
        {/* Top Bevel Highlight Rim */}
        <div className="absolute inset-[1.5px] rounded-full border border-white/60 pointer-events-none" />

        {/* Inner Concentric Engraved Ring */}
        <div
          className="w-[78%] h-[78%] rounded-full flex items-center justify-center relative pointer-events-none"
          style={{
            border: isRed ? '1.5px solid #b91c1c' : '1.5px solid #292524',
            background: 'radial-gradient(circle at 40% 36%, #ffffff 0%, #faf4e7 60%, #eae0ca 100%)',
          }}
        >
          {displayMode === 'vi' ? (
            <span
              className={`font-black tracking-tight uppercase select-none leading-none pointer-events-none ${
                isRed ? 'text-[#b91c1c]' : 'text-[#18181b]'
              } text-[13px] sm:text-sm md:text-base`}
              style={{
                textShadow: '0 1px 1px rgba(255,255,255,0.9)',
              }}
            >
              {viName}
            </span>
          ) : (
            <span
              style={{
                fontFamily: "'Ma Shan Zheng', 'Noto Serif', serif",
                textShadow: isRed
                  ? '0 1px 1px rgba(255,255,255,0.9)'
                  : '0 1px 1px rgba(255,255,255,0.9)',
              }}
              className={`leading-none font-extrabold select-none pointer-events-none text-2xl sm:text-3xl md:text-[34px] ${
                isRed ? 'text-[#b91c1c]' : 'text-[#18181b]'
              }`}
            >
              {hanChar}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export const ChessPiece = React.memo(ChessPieceComponent, (prev, next) => {
  return (
    prev.piece.id === next.piece.id &&
    prev.piece.isCovered === next.piece.isCovered &&
    prev.piece.trueRole === next.piece.trueRole &&
    prev.piece.color === next.piece.color &&
    prev.isSelected === next.isSelected &&
    prev.isLastMove === next.isLastMove &&
    prev.isInCheck === next.isInCheck &&
    prev.displayMode === next.displayMode &&
    prev.size === next.size &&
    prev.is3D === next.is3D
  );
});
