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

  // 1. COVERED (QUÂN ÚP) PIECE - GỖ HOÀNG DƯƠNG MẬT ONG KHẮC ẤN TRẬN ĐỒ CỔ
  if (piece.isCovered) {
    return (
      <div
        className="relative flex items-center justify-center select-none w-full h-full aspect-square pointer-events-none transition-transform duration-150"
        style={{
          width: size ? `${size}px` : '100%',
          height: size ? `${size}px` : '100%',
          aspectRatio: '1 / 1',
          willChange: isSelected ? 'transform' : 'auto',
        }}
      >
        {/* Soft Contact Shadow cast on board surface - Only in 3D mode */}
        {is3D && (
          <div
            className={`absolute left-1/2 -translate-x-1/2 rounded-full pointer-events-none transition-all duration-150 ${
              isSelected
                ? '-bottom-2.5 w-[86%] h-[20%]'
                : '-bottom-1 w-[80%] h-[14%]'
            }`}
            style={{
              background: isSelected
                ? 'radial-gradient(ellipse at center, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.22) 50%, transparent 75%)'
                : 'radial-gradient(ellipse at center, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.14) 55%, transparent 75%)',
            }}
          />
        )}

        {/* Physical 3D Wooden Token Cylinder (Giảm thêm 20% độ dày: ~8.2px, căn tâm chuẩn giao điểm) */}
        <div
          className={`w-full h-full aspect-square rounded-full flex items-center justify-center relative transition-transform duration-150 pointer-events-none ${
            isLastMove ? 'ring-2 ring-amber-400' : ''
          }`}
          style={{
            background: 'radial-gradient(circle at 35% 26%, #fdf0cd 0%, #f5cf84 28%, #d99a40 65%, #ab691f 90%, #693409 100%)',
            border: is3D ? '1.8px solid #78350f' : '1.8px solid #78350f',
            boxShadow: isSelected
              ? is3D
                ? '0 2px 0 #8a4009, 0 4.5px 0 #78350f, 0 7.5px 0 #542205, 0 11.5px 15px rgba(0,0,0,0.6)'
                : 'none'
              : is3D
              ? '0 1.2px 0 #8a4009, 0 3px 0 #78350f, 0 5.5px 0 #5c2707, 0 8.2px 1px #230b01, 0 10px 12px rgba(0,0,0,0.46)'
              : 'none',
            transform: is3D
              ? isSelected
                ? 'translateY(-11px) scale(1.07)'
                : 'translateY(-4px)'
              : isSelected
              ? 'translateY(-3px) scale(1.05)'
              : 'none',
            backfaceVisibility: 'hidden',
          }}
        >
          {/* Top Bevel Highlight Rim (Ánh sáng viền vát cạnh trên) */}
          <div className="absolute inset-[1.5px] rounded-full border border-white/65 pointer-events-none" />

          {/* Gloss Specular Sheen (Vệt bóng sơn mài bán cầu trên) */}
          <div
            className="absolute inset-0 rounded-full pointer-events-none opacity-40"
            style={{
              background: 'linear-gradient(145deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.1) 32%, transparent 60%)',
            }}
          />

          {/* Recessed Lathe-Turned Dish (Lòng đĩa gờ chỉ chìm truyền thống) */}
          <div
            className="w-[80%] h-[80%] aspect-square rounded-full flex items-center justify-center relative pointer-events-none overflow-hidden"
            style={{
              border: isRed ? '2px solid #b91c1c' : '2px solid #292524',
              background: 'radial-gradient(circle at 38% 32%, #fae5b6 0%, #edd195 55%, #c98e3b 100%)',
              boxShadow: 'inset 0 3px 6px rgba(50,20,5,0.6), 0 1px 1px rgba(255,255,255,0.7)',
            }}
          >
            {/* Concentric Gold-Bronze Decorative Ring */}
            <div
              className="absolute inset-[2.5px] rounded-full pointer-events-none"
              style={{
                border: '1px dashed rgba(217, 119, 6, 0.75)',
              }}
            />

            {/* Sacred Eastern Emblem (Ấn Trận Đồ Cổ Bí Ẩn: Trống Đồng / Bát Quái Cổ Đạo) */}
            <div className="w-[66%] h-[66%] aspect-square flex items-center justify-center relative pointer-events-none">
              <svg viewBox="0 0 100 100" className="w-full h-full pointer-events-none" fill="none">
                {/* Outer concentric filigree ring */}
                <circle cx="50" cy="50" r="44" stroke="#92400e" strokeWidth="2" strokeDasharray="3.5 2.5" opacity="0.8" />
                
                {/* 8 Cardinal Sacred Rays (Tia sáng bát phương hào khí) */}
                {Array.from({ length: 8 }).map((_, i) => (
                  <line
                    key={i}
                    x1="50"
                    y1="11"
                    x2="50"
                    y2="20"
                    stroke="#b45309"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    transform={`rotate(${i * 45} 50 50)`}
                    opacity="0.9"
                  />
                ))}

                {/* Mid ring */}
                <circle cx="50" cy="50" r="28" stroke="#78350f" strokeWidth="1.8" opacity="0.75" />
                <circle cx="50" cy="50" r="23" stroke="#d97706" strokeWidth="1.2" strokeDasharray="2 2" opacity="0.9" />

                {/* Core Medallion disc */}
                <circle cx="50" cy="50" r="16" fill="#78350f" fillOpacity="0.2" stroke="#92400e" strokeWidth="1.6" />

                {/* Central Raised Golden Pearl (Ngọc tâm trận đồ) */}
                <circle cx="50" cy="50" r="9" fill="#d97706" stroke="#fef3c7" strokeWidth="1.2" />
                <circle cx="47" cy="47" r="3" fill="#ffffff" fillOpacity="0.85" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 2. UNCOVERED (QUÂN NGỬA) PIECE - GỖ HOÀNG DƯƠNG NGÀ CỔ KHẮC CHỮ SƠN MÀI
  const role = piece.trueRole;
  const hanChar = ROLE_HAN_CHARACTERS[role] ? ROLE_HAN_CHARACTERS[role][piece.color] : '?';
  const viName = ROLE_VI_NAMES[role] ? ROLE_VI_NAMES[role][piece.color] : '';

  return (
    <div
      className="relative flex items-center justify-center select-none w-full h-full aspect-square pointer-events-none transition-transform duration-150"
      style={{
        width: size ? `${size}px` : '100%',
        height: size ? `${size}px` : '100%',
        aspectRatio: '1 / 1',
        willChange: isSelected ? 'transform' : 'auto',
      }}
    >
      {/* Soft Contact Shadow cast on board surface - Only in 3D mode */}
      {is3D && (
        <div
          className={`absolute left-1/2 -translate-x-1/2 rounded-full pointer-events-none transition-all duration-150 ${
            isSelected
              ? '-bottom-2.5 w-[86%] h-[20%]'
              : '-bottom-1 w-[80%] h-[14%]'
          }`}
          style={{
            background: isSelected
              ? 'radial-gradient(ellipse at center, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.22) 50%, transparent 75%)'
              : 'radial-gradient(ellipse at center, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.14) 55%, transparent 75%)',
          }}
        />
      )}

      {/* Physical 3D Wooden Token Cylinder (Giảm thêm 20% độ dày: ~8.2px, căn tâm chuẩn giao điểm) */}
      <div
        className={`w-full h-full aspect-square rounded-full flex items-center justify-center relative transition-transform duration-150 pointer-events-none ${
          isLastMove ? 'ring-2 ring-amber-400' : ''
        } ${
          isInCheck ? 'ring-3 ring-red-500 shadow-[0_0_14px_rgba(239,68,68,0.8)] animate-pulse' : ''
        }`}
        style={{
          background: 'radial-gradient(circle at 35% 26%, #ffffff 0%, #fefcf5 25%, #f5ecdb 62%, #d8be96 90%, #8c6a38 100%)',
          border: is3D ? '1.8px solid #8c6a38' : '1.8px solid #8c6a38',
          boxShadow: isSelected
            ? is3D
              ? '0 2px 0 #b39b75, 0 4.5px 0 #9c835c, 0 7.5px 0 #695232, 0 11.5px 15px rgba(0,0,0,0.6)'
              : 'none'
            : is3D
            ? '0 1.2px 0 #b39b75, 0 3px 0 #9c835c, 0 5.5px 0 #7a633f, 0 8.2px 1px #3b2c17, 0 10px 12px rgba(0,0,0,0.46)'
            : 'none',
          transform: is3D
            ? isSelected
              ? 'translateY(-11px) scale(1.07)'
              : 'translateY(-4px)'
            : isSelected
            ? 'translateY(-3px) scale(1.05)'
            : 'none',
          backfaceVisibility: 'hidden',
        }}
      >
        {/* Top Bevel Highlight Rim (Ánh sáng viền ngà vát cạnh) */}
        <div className="absolute inset-[1.5px] rounded-full border border-white/80 pointer-events-none" />

        {/* Gloss Specular Sheen (Vệt bóng sơn mài bán cầu trên) */}
        <div
          className="absolute inset-0 rounded-full pointer-events-none opacity-35"
          style={{
            background: 'linear-gradient(145deg, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0.15) 30%, transparent 60%)',
          }}
        />

        {/* Recessed Lathe-Turned Dish (Lòng đĩa chìm khắc chữ thư pháp) */}
        <div
          className="w-[80%] h-[80%] aspect-square rounded-full flex items-center justify-center relative pointer-events-none overflow-hidden"
          style={{
            border: isRed ? '2px solid #b91c1c' : '2px solid #1c1917',
            background: 'radial-gradient(circle at 38% 32%, #ffffff 0%, #fbf6ec 58%, #ede1cb 100%)',
            boxShadow: 'inset 0 3px 6px rgba(60,40,15,0.55), 0 1px 1px rgba(255,255,255,0.85)',
          }}
        >
          {/* Subtle concentric gold-inlay ring accent */}
          <div
            className="absolute inset-[2.5px] rounded-full pointer-events-none"
            style={{
              border: isRed ? '1px solid rgba(220, 38, 38, 0.35)' : '1px solid rgba(217, 119, 6, 0.45)',
            }}
          />

          {displayMode === 'vi' ? (
            <span
              className={`font-black tracking-wider uppercase select-none leading-none pointer-events-none ${
                isRed ? 'text-[#b91c1c]' : 'text-[#18181b]'
              }`}
              style={{
                fontSize: size ? `${Math.max(6, Math.round(size * 0.28))}px` : 'clamp(6px, 3.4cqw, 18px)',
                filter: isRed
                  ? 'drop-shadow(0 1px 0px rgba(255,255,255,0.95)) drop-shadow(0 -0.8px 0.6px rgba(136,19,19,0.7))'
                  : 'drop-shadow(0 1px 0px rgba(255,255,255,0.95)) drop-shadow(0 -0.8px 0.6px rgba(0,0,0,0.75))',
              }}
            >
              {viName}
            </span>
          ) : displayMode === 'both' ? (
            <div className="flex flex-col items-center justify-center pointer-events-none leading-none">
              <span
                style={{
                  fontFamily: "'Ma Shan Zheng', 'Noto Serif', serif",
                  fontSize: size ? `${Math.max(8, Math.round(size * 0.46))}px` : 'clamp(7px, 4.8cqw, 30px)',
                  filter: isRed
                    ? 'drop-shadow(0 1.2px 0px rgba(255,255,255,0.95)) drop-shadow(0 -1px 0.8px rgba(136,19,19,0.75)) drop-shadow(0 2px 2px rgba(0,0,0,0.25))'
                    : 'drop-shadow(0 1.2px 0px rgba(255,255,255,0.95)) drop-shadow(0 -1px 0.8px rgba(0,0,0,0.8)) drop-shadow(0 2px 2px rgba(0,0,0,0.25))',
                }}
                className={`leading-none font-black select-none ${
                  isRed ? 'text-[#b91c1c]' : 'text-[#18181b]'
                }`}
              >
                {hanChar}
              </span>
              <span
                className={`font-black tracking-wider uppercase select-none leading-none mt-0.5 ${
                  isRed ? 'text-[#b91c1c]' : 'text-[#18181b]'
                }`}
                style={{
                  fontSize: size ? `${Math.max(5, Math.round(size * 0.2))}px` : 'clamp(4.5px, 2.1cqw, 11px)',
                  filter: 'drop-shadow(0 1px 0px rgba(255,255,255,0.9))',
                }}
              >
                {viName}
              </span>
            </div>
          ) : (
            <span
              style={{
                fontFamily: "'Ma Shan Zheng', 'Noto Serif', serif",
                fontSize: size ? `${Math.max(9, Math.round(size * 0.62))}px` : 'clamp(8px, 6.4cqw, 38px)',
                filter: isRed
                  ? 'drop-shadow(0 1.2px 0px rgba(255,255,255,0.95)) drop-shadow(0 -1px 0.8px rgba(136,19,19,0.75)) drop-shadow(0 2px 2px rgba(0,0,0,0.25))'
                  : 'drop-shadow(0 1.2px 0px rgba(255,255,255,0.95)) drop-shadow(0 -1px 0.8px rgba(0,0,0,0.8)) drop-shadow(0 2px 2px rgba(0,0,0,0.25))',
              }}
              className={`leading-none font-black select-none pointer-events-none ${
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

