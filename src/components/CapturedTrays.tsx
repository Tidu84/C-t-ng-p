/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { LabelDisplayMode, Piece, PlayerColor } from '../types';
import { ChessPiece } from './ChessPiece';
import { Eye, EyeOff, ShieldAlert, Sparkles } from 'lucide-react';

interface CapturedTraysProps {
  capturedByRed: Piece[];
  capturedByBlack: Piece[];
  displayMode: LabelDisplayMode;
  userColor?: PlayerColor;
  gameMode: 'ai' | 'pvp';
}

export const CapturedTrays: React.FC<CapturedTraysProps> = ({
  capturedByRed,
  capturedByBlack,
  displayMode,
  userColor = 'red',
  gameMode,
}) => {
  // Peeking state for covered pieces (id of piece being peeked by the capturer)
  const [peekedPieceId, setPeekedPieceId] = useState<string | null>(null);

  const allCaptured = [
    ...capturedByRed.map((p) => ({ ...p, capturedBy: 'red' as PlayerColor })),
    ...capturedByBlack.map((p) => ({ ...p, capturedBy: 'black' as PlayerColor })),
  ];

  const coveredCaptures = allCaptured.filter((p) => p.wasCoveredWhenCaptured);
  const openCaptures = allCaptured.filter((p) => !p.wasCoveredWhenCaptured);

  const canUserPeek = (piece: Piece & { capturedBy: PlayerColor }) => {
    if (gameMode === 'ai') {
      // In AI mode, the user (Red) can peek at pieces they captured
      return piece.capturedBy === userColor;
    }
    // In PvP mode, either player can tap to peek their own captured piece
    return true;
  };

  return (
    <div className="w-full flex flex-col md:flex-row gap-4 items-stretch justify-between">
      {/* LEFT TRAY: Quân Úp Bị Ăn (Úp xuống - bên trái bàn cờ) */}
      <div className="flex-1 bg-stone-900/90 border border-stone-800 rounded-xl p-3 shadow-lg flex flex-col">
        <div className="flex items-center justify-between pb-2 border-b border-stone-800/80 mb-2.5">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
            <span className="font-mono-code text-[11px] uppercase tracking-wider text-amber-300 font-bold">
              Ngăn Trái // Quân Úp Bị Bắt ({coveredCaptures.length})
            </span>
          </div>
          <span className="text-[10px] text-stone-400 bg-stone-800 px-2 py-0.5 rounded font-mono-code">
            Úp bí mật
          </span>
        </div>

        <p className="text-[11px] text-stone-400 mb-2 italic">
          Quân úp khi bị ăn được úp xuống để tính số lượng. Chỉ người ăn mới được xem quân.
        </p>

        {coveredCaptures.length === 0 ? (
          <div className="flex-1 flex items-center justify-center p-3 text-[11px] text-stone-400 italic bg-stone-950/40 rounded-lg border border-stone-900 min-h-[56px]">
            Chưa có quân úp nào bị ăn
          </div>
        ) : (
          <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-4 lg:grid-cols-5 gap-2 p-2 bg-stone-950/60 rounded-lg border border-stone-900 min-h-[56px]">
            {coveredCaptures.map((piece, idx) => {
              const userAllowed = canUserPeek(piece);
              const isPeeked = peekedPieceId === `${piece.id}-${idx}`;

              return (
                <div
                  key={`covered-cap-${piece.id}-${idx}`}
                  onClick={() => {
                    if (userAllowed) {
                      setPeekedPieceId(isPeeked ? null : `${piece.id}-${idx}`);
                    }
                  }}
                  className={`relative group flex flex-col items-center justify-center p-1 rounded-lg border transition-all ${
                    userAllowed ? 'cursor-pointer hover:border-amber-500/60' : 'cursor-default'
                  } ${
                    isPeeked
                      ? 'bg-amber-950/40 border-amber-500'
                      : 'bg-stone-900/60 border-stone-800'
                  }`}
                  title={
                    userAllowed
                      ? 'Nhấn để xem bí mật quân cờ'
                      : 'Quân này do đối phương ăn, chỉ đối phương biết!'
                  }
                >
                  <div className="w-8 h-8 relative">
                    {/* Render piece: if peeked, show true role face up; else show face-down cover */}
                    <ChessPiece
                      piece={{
                        ...piece,
                        isCovered: !isPeeked,
                      }}
                      displayMode={displayMode}
                      size={32}
                    />
                  </div>

                  <div className="mt-1 flex items-center gap-1 text-[9px] text-stone-400 font-mono-code">
                    <span>{piece.capturedBy === 'red' ? 'Đỏ ăn' : 'Đen ăn'}</span>
                    {userAllowed && (
                      <span className="text-amber-400">
                        {isPeeked ? <EyeOff className="w-2.5 h-2.5" /> : <Eye className="w-2.5 h-2.5" />}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* RIGHT TRAY: Quân Ngửa Bị Ăn (Hiển thị ngửa mặt - bên phải bàn cờ) */}
      <div className="flex-1 bg-stone-900/90 border border-stone-800 rounded-xl p-3 shadow-lg flex flex-col">
        <div className="flex items-center justify-between pb-2 border-b border-stone-800/80 mb-2.5">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
            <span className="font-mono-code text-[11px] uppercase tracking-wider text-stone-200 font-bold">
              Ngăn Phải // Quân Ngửa Bị Bắt ({openCaptures.length})
            </span>
          </div>
          <span className="text-[10px] text-stone-400 bg-stone-800 px-2 py-0.5 rounded font-mono-code">
            Công khai
          </span>
        </div>

        <p className="text-[11px] text-stone-400 mb-2 italic">
          Quân đã lật ngửa khi bị ăn được xếp bên phải để cả hai người cùng quan sát.
        </p>

        {openCaptures.length === 0 ? (
          <div className="flex-1 flex items-center justify-center p-3 text-[11px] text-stone-400 italic bg-stone-950/40 rounded-lg border border-stone-900 min-h-[56px]">
            Chưa có quân ngửa nào bị ăn
          </div>
        ) : (
          <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-4 lg:grid-cols-5 gap-2 p-2 bg-stone-950/60 rounded-lg border border-stone-900 min-h-[56px]">
            {openCaptures.map((piece, idx) => (
              <div
                key={`open-cap-${piece.id}-${idx}`}
                className="flex flex-col items-center justify-center p-1 rounded-lg bg-stone-900/60 border border-stone-800"
              >
                <div className="w-8 h-8">
                  <ChessPiece
                    piece={{
                      ...piece,
                      isCovered: false,
                    }}
                    displayMode={displayMode}
                    size={32}
                  />
                </div>
                <span className="mt-1 text-[9px] text-stone-400 font-mono-code">
                  {piece.capturedBy === 'red' ? 'Đỏ bắt' : 'Đen bắt'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
