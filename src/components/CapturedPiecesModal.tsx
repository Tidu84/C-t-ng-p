/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { X, Shield, Swords, Lock, Eye } from 'lucide-react';
import { Piece, PlayerColor, GameMode, PlayerProfile, AiDifficulty, PieceRole } from '../types';
import { ROLE_HAN_CHARACTERS, ROLE_VI_NAMES } from '../utils/chessRules';
import { AI_PROFILES } from '../utils/aiProfiles';

interface CapturedPiecesModalProps {
  isOpen: boolean;
  onClose: () => void;
  capturedByRed: Piece[];
  capturedByBlack: Piece[];
  userColor: PlayerColor;
  gameMode: GameMode;
  playerProfile: PlayerProfile;
  difficulty: AiDifficulty;
}

const ROLE_ORDER: Record<PieceRole, number> = {
  king: 0,
  chariot: 1,
  cannon: 2,
  horse: 3,
  elephant: 4,
  advisor: 5,
  soldier: 6,
};

export const CapturedPiecesModal: React.FC<CapturedPiecesModalProps> = ({
  isOpen,
  onClose,
  capturedByRed,
  capturedByBlack,
  userColor,
  gameMode,
  playerProfile,
  difficulty,
}) => {
  if (!isOpen) return null;

  const renderSideSection = (sideColor: PlayerColor, capturedPieces: Piece[]) => {
    const isRed = sideColor === 'red';
    const isThisUser = gameMode === 'pvp' ? true : sideColor === userColor;

    const displayName = isThisUser
      ? playerProfile.name
      : gameMode === 'ai'
      ? `Máy (${AI_PROFILES[difficulty].name})`
      : isRed
      ? 'Bên Đỏ'
      : 'Bên Đen';

    // Separate open captures vs covered captures
    const openCaptures = capturedPieces
      .filter((p) => !p.wasCoveredWhenCaptured)
      .sort((a, b) => ROLE_ORDER[a.trueRole] - ROLE_ORDER[b.trueRole]);

    const coveredCaptures = capturedPieces.filter((p) => p.wasCoveredWhenCaptured);

    return (
      <div className="flex-1 bg-stone-900/95 border border-white/10 rounded-xl p-3 sm:p-4 flex flex-col gap-3 min-w-[280px]">
        {/* Header of Side */}
        <div className="flex items-center justify-between border-b border-white/10 pb-2">
          <div className="flex items-center gap-2">
            <span
              className={`w-3 h-3 rounded-full ${
                isRed ? 'bg-red-500 shadow-sm shadow-red-500/50' : 'bg-stone-300 shadow-sm shadow-stone-300/50'
              }`}
            />
            <span className="font-bold text-stone-200 text-sm">{displayName}</span>
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded font-mono-code font-bold ${
                isRed ? 'bg-red-950 text-red-400 border border-red-800/40' : 'bg-stone-800 text-stone-300 border border-stone-700/50'
              }`}
            >
              {isRed ? 'Bên Đỏ' : 'Bên Đen'}
            </span>
          </div>
          <span className="text-xs font-mono-code text-stone-400">
            Tổng ăn: <b className="text-amber-400">{capturedPieces.length}</b>
          </span>
        </div>

        {/* 1. Open Captures Section */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-stone-300">
            <Swords className="w-3.5 h-3.5 text-amber-400" />
            <span>Quân ăn từ thế ngửa ({openCaptures.length})</span>
          </div>

          {openCaptures.length === 0 ? (
            <p className="text-[11px] text-stone-500 italic pl-5">Chưa ăn quân ngửa nào</p>
          ) : (
            <div className="flex flex-wrap gap-1.5 pl-1">
              {openCaptures.map((p, idx) => {
                const char = ROLE_HAN_CHARACTERS[p.trueRole] ? ROLE_HAN_CHARACTERS[p.trueRole][p.color] : '?';
                const isPieceRed = p.color === 'red';
                const roleVi = ROLE_VI_NAMES[p.trueRole]?.[p.color] || p.trueRole;

                return (
                  <div
                    key={`open-${p.id || idx}`}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg bg-stone-800/80 border border-stone-700/60 shadow-xs"
                    title={`Đã ăn: ${roleVi}`}
                  >
                    <div
                      className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 border border-stone-600 bg-stone-100 text-[10px] font-bold leading-none"
                      style={{
                        color: isPieceRed ? '#b91c1c' : '#18181b',
                        fontFamily: "'Ma Shan Zheng', 'Noto Serif', serif",
                      }}
                    >
                      {char}
                    </div>
                    <span className="text-[11px] font-medium text-stone-200">{roleVi}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 2. Covered Captures Section */}
        <div className="flex flex-col gap-1.5 pt-2 border-t border-white/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-300">
              <Shield className="w-3.5 h-3.5 text-amber-400" />
              <span>Quân ăn từ thế úp ({coveredCaptures.length})</span>
            </div>
            {isThisUser ? (
              <span className="text-[9px] text-emerald-400 font-mono-code flex items-center gap-1">
                <Eye className="w-3 h-3" /> Đã lật xem
              </span>
            ) : (
              <span className="text-[9px] text-stone-400 font-mono-code flex items-center gap-1">
                <Lock className="w-3 h-3 text-amber-500" /> Bảo mật
              </span>
            )}
          </div>

          {coveredCaptures.length === 0 ? (
            <p className="text-[11px] text-stone-500 italic pl-5">Chưa ăn quân úp nào</p>
          ) : isThisUser ? (
            // User captures: revealed!
            <div className="flex flex-col gap-1 pl-1">
              <div className="flex flex-wrap gap-1.5">
                {coveredCaptures
                  .sort((a, b) => ROLE_ORDER[a.trueRole] - ROLE_ORDER[b.trueRole])
                  .map((p, idx) => {
                    const char = ROLE_HAN_CHARACTERS[p.trueRole] ? ROLE_HAN_CHARACTERS[p.trueRole][p.color] : '?';
                    const isPieceRed = p.color === 'red';
                    const roleVi = ROLE_VI_NAMES[p.trueRole]?.[p.color] || p.trueRole;

                    return (
                      <div
                        key={`cov-${p.id || idx}`}
                        className="flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-950/40 border border-amber-600/50 shadow-xs"
                        title={`Ăn từ quân úp của đối phương: ${roleVi}`}
                      >
                        <div
                          className="relative w-5 h-5 rounded-full flex items-center justify-center shrink-0 border border-amber-400 bg-amber-50 text-[10px] font-bold leading-none ring-1 ring-amber-400/60"
                          style={{
                            color: isPieceRed ? '#b91c1c' : '#18181b',
                            fontFamily: "'Ma Shan Zheng', 'Noto Serif', serif",
                          }}
                        >
                          {char}
                          <span className="absolute -top-1 -right-1 text-[7px] leading-none">🛡️</span>
                        </div>
                        <span className="text-[11px] font-bold text-amber-200">{roleVi}</span>
                      </div>
                    );
                  })}
              </div>
              <p className="text-[10px] text-emerald-400/80 italic mt-1">
                💡 Bạn được phép lật xem danh tính khi ăn thành công quân úp của đối phương.
              </p>
            </div>
          ) : (
            // Opponent captures: completely hidden!
            <div className="flex flex-col gap-1 pl-1">
              <div className="flex flex-wrap gap-1.5">
                {coveredCaptures.map((_, idx) => (
                  <div
                    key={`hidden-${idx}`}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg bg-stone-800/60 border border-stone-700/40 text-stone-400 text-xs shadow-xs"
                    title="Đối phương ăn quân úp của bạn (quân này được giữ kín, tuyệt đối không tiết lộ)"
                  >
                    <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 border border-stone-600 bg-stone-900 text-[11px] font-mono font-bold text-amber-400">
                      ?
                    </div>
                    <span className="text-[10px] font-mono-code text-stone-400">Quân úp #{idx + 1}</span>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-stone-400 italic mt-1">
                🔒 Quân úp của bạn bị đối phương ăn được giữ kín danh tính theo đúng luật Cờ Úp.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 animate-fade-in">
      <div className="relative w-full max-w-2xl bg-[#141416] border border-amber-500/30 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-stone-900 via-stone-800 to-stone-900 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300">
              <Swords className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-stone-100 text-sm sm:text-base">Danh Sách Quân Đã Bắt</h3>
              <p className="text-[10px] text-stone-400 font-mono-code">
                Bảo mật quân úp &bull; Lật xem quân úp đối phương khi tự ăn
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-stone-800/80 hover:bg-stone-700 text-stone-300 hover:text-white flex items-center justify-center transition-colors border border-white/10"
            aria-label="Đóng"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body: Two columns for Red & Black */}
        <div className="p-3 sm:p-4 overflow-y-auto flex flex-col md:flex-row gap-3">
          {renderSideSection('red', capturedByRed)}
          {renderSideSection('black', capturedByBlack)}
        </div>

        {/* Modal Footer */}
        <div className="px-4 py-2.5 bg-stone-900/90 border-t border-white/10 flex items-center justify-between text-[11px] text-stone-400">
          <span className="flex items-center gap-1.5">
            <span className="text-amber-400">🛡️</span>
            <span>Các quân còn úp trên bàn cờ luôn được giữ bí mật 100%.</span>
          </span>
          <button
            onClick={onClose}
            className="px-3 py-1 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-lg text-xs font-semibold border border-white/10 transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
