/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';
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

export const ChessPiece: React.FC<ChessPieceProps> = ({
  piece,
  isSelected = false,
  isLastMove = false,
  isInCheck = false,
  displayMode = 'both',
  size,
  is3D = false,
}) => {
  const isRed = piece.color === 'red';

  // 1. COVERED (QUÂN ÚP) PIECE - GỖ HOÀNG DƯƠNG VÀNG ÓNG, KHỐI TRỤ 3D NỔI RÕ ĐỘ DÀY
  // Tuyệt đối giữ kín danh tính quân úp (Fog of War) - không truy cập trueRole khi quân đang úp!
  if (piece.isCovered) {
    return (
      <div
        className="relative flex items-center justify-center select-none w-full h-full pointer-events-none transition-transform duration-200"
        style={{
          width: size ? `${size}px` : '100%',
          height: size ? `${size}px` : '100%',
          aspectRatio: '1/1',
        }}
      >
        {/* Contact Shadow cast on board surface */}
        <div
          className={`absolute left-1/2 -translate-x-1/2 rounded-full pointer-events-none transition-all duration-200 ${
            isSelected
              ? '-bottom-4 w-[92%] h-[24%] bg-black/70 blur-[5px]'
              : '-bottom-1.5 w-[85%] h-[20%] bg-black/50 blur-[3px]'
          }`}
        />

        {/* Physical 3D Wooden Cylinder Block (Khối gỗ trụ tròn dày dặn, nhìn rõ độ dày thành gỗ) */}
        <div
          className={`w-full h-full rounded-full flex items-center justify-center relative transition-all duration-200 pointer-events-none ${
            isSelected
              ? '-translate-y-4 sm:-translate-y-5 scale-[1.12] ring-3 ring-emerald-400 ring-offset-2 ring-offset-amber-950/80 z-30'
              : 'hover:scale-[1.02]'
          } ${isLastMove ? 'ring-2 ring-amber-400 ring-offset-1 ring-offset-stone-900' : ''}`}
          style={{
            // Màu gỗ hoàng dương / dẻ gai mật ong vàng sẫm ấm áp
            background: 'radial-gradient(circle at 38% 30%, #fae8be 0%, #f3d18e 35%, #dba554 75%, #b67c2d 100%)',
            border: '2px solid #92400e',
            // Physical 3D cylinder extrusion edge (6 lớp thành gỗ tạo độ dày 3D thực tế)
            boxShadow: isSelected
              ? '0 1px 0 #b45309, 0 2px 0 #92400e, 0 3px 0 #78350f, 0 4px 0 #60280b, 0 16px 28px rgba(0,0,0,0.65)'
              : is3D
              ? 'inset 0 2px 2px rgba(255,255,255,0.9), inset 0 -2px 3px rgba(0,0,0,0.35), 0 1px 0 #b45309, 0 2px 0 #9a470b, 0 3px 0 #853a08, 0 4px 0 #702f06, 0 5px 0 #5c2504, 0 6px 0 #451a03, 0 8px 12px rgba(0,0,0,0.55), 0 2px 4px rgba(0,0,0,0.35)'
              : 'inset 0 2px 2px rgba(255,255,255,0.85), inset 0 -2px 3px rgba(0,0,0,0.3), 0 1px 0 #b45309, 0 2px 0 #92400e, 0 3px 0 #78350f, 0 4px 0 #5c2508, 0 6px 8px rgba(0,0,0,0.45)',
          }}
        >
          {/* Top Bevel Highlight Rim (Ánh vát mép viền trên của quân cờ gỗ) */}
          <div className="absolute inset-[2px] rounded-full border border-white/50 pointer-events-none" />

          {/* Circular Engraved Groove Ring (Đường rãnh chỉ tròn khắc chìm trên mặt gỗ) */}
          <div
            className="w-[78%] h-[78%] rounded-full flex items-center justify-center relative transition-colors pointer-events-none"
            style={{
              border: isRed ? '1.8px solid #b91c1c' : '1.8px solid #292524',
              boxShadow: isRed
                ? 'inset 0 1px 1px rgba(185,28,28,0.35), 0 1px 1px rgba(255,255,255,0.7)'
                : 'inset 0 1px 1px rgba(41,37,36,0.35), 0 1px 1px rgba(255,255,255,0.7)',
              background: 'radial-gradient(circle at 40% 36%, #fae6b8 0%, #edd195 55%, #d6a457 100%)',
            }}
          >
            {/* Tâm gỗ mịn màng sạch sẽ không chữ theo đúng ảnh mẫu thực tế quân Úp */}
            <div className="w-[64%] h-[64%] rounded-full opacity-30 bg-[radial-gradient(ellipse_at_center,_#92400e_0%,_transparent_80%)] pointer-events-none" />
          </div>
        </div>
      </div>
    );
  }

  // 2. UNCOVERED (QUÂN NGỬA) PIECE - GỖ BẠCH DƯƠNG TRẮNG NGÀ, KHỐI TRỤ 3D NỔI RÕ
  const role = piece.trueRole;
  const hanChar = ROLE_HAN_CHARACTERS[role] ? ROLE_HAN_CHARACTERS[role][piece.color] : '?';
  const viName = ROLE_VI_NAMES[role] ? ROLE_VI_NAMES[role][piece.color] : '';

  return (
    <motion.div
      initial={{ scale: 0.85 }}
      animate={{ scale: 1 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      className="relative flex items-center justify-center select-none w-full h-full pointer-events-none transition-transform duration-200"
      style={{
        width: size ? `${size}px` : '100%',
        height: size ? `${size}px` : '100%',
        aspectRatio: '1/1',
      }}
    >
      {/* Contact Shadow cast on board surface */}
      <div
        className={`absolute left-1/2 -translate-x-1/2 rounded-full pointer-events-none transition-all duration-200 ${
          isSelected
            ? '-bottom-4 w-[92%] h-[24%] bg-black/70 blur-[5px]'
            : '-bottom-1.5 w-[85%] h-[20%] bg-black/50 blur-[3px]'
        }`}
      />

      {/* Physical 3D Wooden Cylinder Block (Màu gỗ trắng ngà cao cấp, nổi khối trụ tròn) */}
      <div
        className={`w-full h-full rounded-full flex items-center justify-center relative transition-all duration-200 pointer-events-none ${
          isSelected
            ? '-translate-y-4 sm:-translate-y-5 scale-[1.12] ring-3 ring-emerald-400 ring-offset-2 ring-offset-stone-900 z-30'
            : 'hover:scale-[1.02]'
        } ${isLastMove ? 'ring-2 ring-amber-400 ring-offset-1 ring-offset-stone-900' : ''} ${
          isInCheck ? 'ring-4 ring-red-500 animate-pulse' : ''
        }`}
        style={{
          // MÀU GỖ TRẮNG NGÀ SÁNG (Khác biệt hoàn toàn với màu vàng sẫm của quân úp)
          background: 'radial-gradient(circle at 38% 30%, #ffffff 0%, #faf6ec 40%, #ede2cb 78%, #cfbe99 100%)',
          border: '2px solid #a89a77',
          // Physical 3D cylinder extrusion edge (Thành gỗ trắng ngà nổi cao 6-8px)
          boxShadow: isSelected
            ? '0 1px 0 #d6cbb5, 0 2px 0 #baa988, 0 3px 0 #9c8a68, 0 4px 0 #827150, 0 16px 28px rgba(0,0,0,0.65)'
            : is3D
            ? 'inset 0 2px 2px rgba(255,255,255,0.95), inset 0 -2px 3px rgba(0,0,0,0.25), 0 1px 0 #d6cbb5, 0 2px 0 #c2b49b, 0 3px 0 #ad9e82, 0 4px 0 #94866b, 0 5px 0 #7a6d54, 0 6px 0 #5f543e, 0 8px 12px rgba(0,0,0,0.55), 0 2px 4px rgba(0,0,0,0.35)'
            : 'inset 0 2px 2px rgba(255,255,255,0.95), inset 0 -2px 3px rgba(0,0,0,0.22), 0 1px 0 #d6cbb5, 0 2px 0 #c2b49b, 0 3px 0 #ad9e82, 0 4px 0 #827150, 0 6px 8px rgba(0,0,0,0.45)',
        }}
      >
        {/* Top Bevel Highlight Rim */}
        <div className="absolute inset-[2px] rounded-full border border-white/70 pointer-events-none" />

        {/* Inner Concentric Engraved Ring (Đường chỉ tròn khắc rãnh bao quanh ký hiệu) */}
        <div
          className="w-[78%] h-[78%] rounded-full flex items-center justify-center relative pointer-events-none"
          style={{
            border: isRed ? '1.8px solid #b91c1c' : '1.8px solid #292524',
            boxShadow: isRed
              ? 'inset 0 1px 1.5px rgba(185,28,28,0.28), 0 1px 1px rgba(255,255,255,0.8)'
              : 'inset 0 1px 1.5px rgba(41,37,36,0.28), 0 1px 1px rgba(255,255,255,0.8)',
            background: 'radial-gradient(circle at 40% 36%, #ffffff 0%, #faf4e7 55%, #eae0ca 100%)',
          }}
        >
          {/* Ký hiệu quân cờ nằm gọn gàng tuyệt đối ngay giữa vòng tròn */}
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
                  ? '0 1px 1px rgba(255,255,255,0.9), 0 -1px 0 rgba(185,28,28,0.4)'
                  : '0 1px 1px rgba(255,255,255,0.9), 0 -1px 0 rgba(0,0,0,0.5)',
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
    </motion.div>
  );
};
