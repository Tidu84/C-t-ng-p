/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { RefreshCw, Eye, Sparkles, Bookmark, Share2 } from 'lucide-react';
import { PlayerColor } from '../types';
import { CheckmatePattern } from '../utils/checkmatePatterns';

interface VictoryModalProps {
  winner: PlayerColor | 'draw';
  pattern: CheckmatePattern;
  moveCount: number;
  encouragingQuote?: string;
  onNewGame: () => void;
  onInspectBoard: () => void;
  onSaveMatchToHistory?: () => void;
  isSaved?: boolean;
}

export const VictoryModal: React.FC<VictoryModalProps> = ({
  winner,
  pattern,
  moveCount,
  encouragingQuote,
  onNewGame,
  onInspectBoard,
  onSaveMatchToHistory,
  isSaved = false,
}) => {
  const isDraw = winner === 'draw';
  const isRedWinner = winner === 'red';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="bg-[#18181c] border-2 border-amber-500/80 rounded-2xl max-w-lg w-full text-center shadow-[0_25px_70px_rgba(0,0,0,0.85)] relative overflow-hidden my-auto flex flex-col">
        {/* Glow ambient background orbs */}
        <div className="absolute -top-16 -left-16 w-48 h-48 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -right-16 w-48 h-48 bg-red-600/15 rounded-full blur-3xl pointer-events-none" />

        {/* Top Header Badge */}
        <div className="pt-5 px-5 sm:px-6 pb-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[11px] font-mono-code font-bold uppercase tracking-widest mb-1.5 shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>{isDraw ? 'Bất Phân Thắng Bại' : pattern.badge}</span>
          </div>

          {/* Calligraphic Checkmate Title in Vietnamese Calligraphy font */}
          <h2 className="text-3xl sm:text-4xl font-thu-phap text-amber-300 tracking-wide drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] my-1">
            {isDraw ? 'Cục: Kỳ phùng địch thủ' : pattern.name}
          </h2>

          <p className="text-xs sm:text-sm font-semibold text-stone-300">
            {isDraw ? 'Hai bên bất phân thắng bại - Thao lược ngang tài' : pattern.subtitle}
          </p>
        </div>

        {/* Checkmate Ink Wash Painting (Tranh Thủy Mặc Đen Trắng Trên Nền Giấy Trắng) */}
        <div className="relative px-4 sm:px-6 my-2">
          <div className="relative rounded-xl overflow-hidden bg-[#faf8f5] p-2 border-2 border-stone-700 shadow-xl group max-h-[220px] sm:max-h-[240px]">
            <div className="w-full h-full rounded-lg overflow-hidden border border-stone-300 relative bg-white">
              <img
                src={pattern.image}
                alt={pattern.name}
                referrerPolicy="no-referrer"
                className="w-full h-44 sm:h-48 object-cover object-center transform group-hover:scale-102 transition-transform duration-500"
              />

              {/* Red traditional seal stamp effect in corner */}
              <div className="absolute top-2 right-2 border-2 border-red-800 bg-red-800/10 text-red-800 px-1.5 py-0.5 rounded text-[10px] font-bold font-serif tracking-widest pointer-events-none rotate-3">
                KỲ ĐẠO
              </div>
            </div>

            {/* Inset Winner Ribbon */}
            <div className="mt-2 flex items-center justify-between text-left px-1">
              <div>
                <span className="text-[10px] uppercase font-mono-code tracking-wider text-stone-500 font-bold block">
                  {isDraw ? 'Kết Quả Trận Đấu' : 'Đại Cục Hoàn Tất'}
                </span>
                <span
                  className={`text-sm sm:text-base font-extrabold ${
                    isDraw ? 'text-amber-600' : isRedWinner ? 'text-red-700' : 'text-stone-900'
                  }`}
                >
                  {isDraw ? 'HÒA CỜ THỎA HIỆP!' : isRedWinner ? 'BÊN ĐỎ TOÀN THẮNG!' : 'BÊN ĐEN TOÀN THẮNG!'}
                </span>
              </div>
              <div className="px-2.5 py-1 rounded bg-stone-900 border border-stone-700 text-[11px] font-mono-code text-amber-400 font-bold shrink-0">
                {moveCount} hiệp đấu
              </div>
            </div>
          </div>
        </div>

        {/* Story & Poem Box */}
        <div className="px-5 sm:px-6 py-2 text-left flex flex-col gap-2">
          <p className="text-xs sm:text-[13px] text-stone-300 leading-relaxed">
            {isDraw
              ? 'Hai kỳ thủ đã giằng co quyết liệt từng nước biến, cẩn trọng giữ thành. Khi thế cờ cân bằng không thể phá vỡ, hòa hoãn là lựa chọn của bậc cao nhân!'
              : pattern.description}
          </p>

          <div className="bg-amber-950/30 border-l-2 border-amber-500 px-3 py-1.5 rounded-r-md">
            <p className="text-xs italic text-amber-200/90 font-serif">
              "{pattern.poem}"
            </p>
          </div>

          {/* Encouraging Quote for player */}
          {encouragingQuote && (
            <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-lg p-2 flex items-center gap-2">
              <span className="text-base">🥋</span>
              <p className="text-[11px] text-emerald-300 font-medium italic">
                "{encouragingQuote}"
              </p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="p-4 sm:px-6 sm:pb-6 pt-2 flex flex-col gap-2">
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={onNewGame}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-bold text-xs sm:text-sm shadow-lg shadow-amber-500/20 transition-all active:scale-95 uppercase tracking-wider"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Khai Cuộc Ván Mới</span>
            </button>

            {onSaveMatchToHistory && (
              <button
                onClick={onSaveMatchToHistory}
                disabled={isSaved}
                className={`flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl text-xs font-semibold border transition-all ${
                  isSaved
                    ? 'bg-emerald-950/60 border-emerald-500/60 text-emerald-300'
                    : 'bg-[#27272a] hover:bg-[#3f3f46] border-white/10 text-amber-300'
                }`}
              >
                <Bookmark className="w-3.5 h-3.5" />
                <span>{isSaved ? 'Đã lưu ván đấu' : 'Lưu ván này'}</span>
              </button>
            )}

            <button
              onClick={onInspectBoard}
              className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-[#27272a] hover:bg-[#3f3f46] border border-white/10 text-stone-300 font-semibold text-xs transition-colors"
            >
              <Eye className="w-3.5 h-3.5 text-amber-400" />
              <span>Xem thế cờ</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
