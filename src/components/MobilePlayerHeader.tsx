/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AI_PROFILES } from '../utils/aiProfiles';
import { PlayerColor, PlayerProfile, GameMode, AiDifficulty, Piece, PieceRole } from '../types';
import { ROLE_HAN_CHARACTERS, ROLE_VI_NAMES } from '../utils/chessRules';

interface MobilePlayerHeaderProps {
  color: PlayerColor;
  isTurn: boolean;
  profile: PlayerProfile;
  gameMode: GameMode;
  difficulty: AiDifficulty;
  capturedPieces?: Piece[];
  onOpenProfile?: () => void;
  onOpenCaptured?: () => void;
  isUser: boolean;
  wins?: number;
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

export const MobilePlayerHeader: React.FC<MobilePlayerHeaderProps> = ({
  color,
  isTurn,
  profile,
  gameMode,
  difficulty,
  capturedPieces = [],
  onOpenProfile,
  onOpenCaptured,
  isUser,
}) => {
  const isRed = color === 'red';

  const displayName = isUser
    ? profile.name
    : gameMode === 'ai'
    ? `Máy (${AI_PROFILES[difficulty].name})`
    : isRed
    ? 'Bên Đỏ'
    : 'Bên Đen';

  // Covered captures vs open captures
  const isThisUser = isUser || gameMode === 'pvp';

  // For the user, covered captures they ate are revealed!
  // For the opponent (AI), covered captures from user remain strictly secret.
  const hiddenCoveredCount = !isThisUser
    ? capturedPieces.filter((p) => p.wasCoveredWhenCaptured).length
    : 0;

  // Revealable pieces for this rack:
  // - All open captures
  // - PLUS covered captures IF this rack belongs to the user
  const visibleCaptures = capturedPieces.filter(
    (p) => !p.wasCoveredWhenCaptured || isThisUser
  );

  const sortedVisible = [...visibleCaptures].sort((a, b) => {
    const roleDiff = ROLE_ORDER[a.trueRole] - ROLE_ORDER[b.trueRole];
    if (roleDiff !== 0) return roleDiff;
    return (a.wasCoveredWhenCaptured ? 1 : 0) - (b.wasCoveredWhenCaptured ? 1 : 0);
  });

  // Show up to 5 top captures as mini chips, then a +count
  const visibleChips = sortedVisible.slice(0, 5);
  const overflowCount = sortedVisible.length - visibleChips.length;

  return (
    <div
      className={`w-full flex items-center justify-between px-2 py-0.5 sm:py-1 rounded-lg border transition-all text-xs select-none ${
        isTurn
          ? isRed
            ? 'bg-red-950/40 border-red-500/50 shadow-sm'
            : 'bg-stone-800/90 border-amber-500/50 shadow-sm'
          : 'bg-[#141416]/90 border-white/5 opacity-85'
      }`}
    >
      {/* Left: Avatar & Name & Color Tag */}
      <div className="flex items-center gap-1.5 min-w-0 shrink-0">
        <div
          onClick={isUser ? onOpenProfile : undefined}
          className={`relative ${!isUser && gameMode === 'ai' ? 'w-8 h-8 sm:w-9 sm:h-9' : 'w-5 h-5 sm:w-6 sm:h-6'} rounded-full overflow-hidden flex items-center justify-center border transition-transform shrink-0 ${
            isUser ? 'cursor-pointer hover:scale-105 active:scale-95' : ''
          } ${
            isTurn
              ? isRed
                ? 'border-red-500 ring-1 ring-red-500/30'
                : 'border-amber-400 ring-1 ring-amber-400/30'
              : 'border-white/20'
          } bg-stone-900`}
        >
          {isUser ? (
            profile.isCustomAvatar ? (
              <img src={profile.avatar} alt="avatar" className="w-full h-full object-cover" />
            ) : (
              <span className="text-[11px]">{profile.avatar}</span>
            )
          ) : gameMode === 'ai' ? (
            <img src={AI_PROFILES[difficulty].avatar} alt={AI_PROFILES[difficulty].name} className="w-full h-full object-cover" />
          ) : (
            <span className="text-[11px]">{isRed ? '🔴' : '⚫'}</span>
          )}
        </div>

        <div className="flex items-center gap-1 min-w-0">
          <span className="font-bold text-stone-200 truncate max-w-[85px] sm:max-w-[130px] text-[11px] sm:text-xs">
            {displayName}
          </span>
          <span
            className={`text-[9px] px-1 py-0.2 rounded font-bold font-mono-code shrink-0 ${
              isRed ? 'bg-red-950 text-red-400 border border-red-800/40' : 'bg-stone-800 text-stone-300 border border-stone-700/50'
            }`}
          >
            {isRed ? 'Đỏ' : 'Đen'}
          </span>
        </div>
      </div>

      {/* Center: Integrated Captured Pieces Mini-Rack */}
      <div
        onClick={capturedPieces.length > 0 ? onOpenCaptured : undefined}
        className={`flex items-center gap-1 overflow-x-auto no-scrollbar mx-1 ${
          capturedPieces.length > 0 ? 'cursor-pointer hover:opacity-90 active:scale-98 transition-all' : ''
        }`}
        title={capturedPieces.length > 0 ? 'Bấm để xem chi tiết danh sách quân đã bắt' : undefined}
      >
        {capturedPieces.length === 0 ? (
          <span className="text-[9px] text-stone-500 font-mono-code hidden xs:inline">
            Chưa ăn quân
          </span>
        ) : (
          <>
            {/* Hidden covered pieces badge (only for opponent's covered captures) */}
            {hiddenCoveredCount > 0 && (
              <div
                className="flex items-center gap-0.5 px-1 py-0.2 rounded bg-stone-800/90 border border-stone-600/50 text-stone-300 text-[9px] font-bold font-mono-code shrink-0"
                title={`${hiddenCoveredCount} quân úp của bạn bị đối phương ăn (được giữ kín bí mật)`}
              >
                <span>🛡️</span>
                <span>{hiddenCoveredCount}</span>
              </div>
            )}

            {/* Mini chips for visible captures */}
            {visibleChips.map((p, idx) => {
              const char = ROLE_HAN_CHARACTERS[p.trueRole] ? ROLE_HAN_CHARACTERS[p.trueRole][p.color] : '?';
              const isPieceRed = p.color === 'red';
              const fromCovered = Boolean(p.wasCoveredWhenCaptured);

              return (
                <div
                  key={`cap-${p.id || idx}`}
                  className={`relative w-4 h-4 sm:w-4.5 sm:h-4.5 rounded-full flex items-center justify-center shrink-0 border text-[9px] font-bold leading-none shadow-xs ${
                    fromCovered
                      ? 'border-amber-400 bg-amber-50 ring-1 ring-amber-400/60'
                      : 'border-stone-700 bg-stone-100'
                  }`}
                  style={{
                    color: isPieceRed ? '#b91c1c' : '#18181b',
                    fontFamily: "'Ma Shan Zheng', 'Noto Serif', serif",
                  }}
                  title={
                    fromCovered
                      ? `Đã ăn từ quân úp: ${ROLE_VI_NAMES[p.trueRole]?.[p.color] || p.trueRole}`
                      : `Đã ăn: ${ROLE_VI_NAMES[p.trueRole]?.[p.color] || p.trueRole}`
                  }
                >
                  {char}
                  {fromCovered && (
                    <span
                      className="absolute -top-1 -right-1 text-[7px] leading-none"
                      title="Ăn từ quân úp"
                    >
                      🛡️
                    </span>
                  )}
                </div>
              );
            })}

            {/* Overflow badge */}
            {overflowCount > 0 && (
              <span className="text-[9px] text-stone-400 font-mono-code shrink-0">
                +{overflowCount}
              </span>
            )}
          </>
        )}
      </div>

      {/* Right: Turn status indicator */}
      <div className="flex items-center gap-1 shrink-0">
        {isTurn ? (
          <span
            className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 ${
              isRed
                ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full animate-ping ${
                isRed ? 'bg-red-400' : 'bg-amber-400'
              }`}
            />
            <span>Đang đi</span>
          </span>
        ) : (
          <span className="text-[9px] text-stone-500 font-mono-code px-1">
            Chờ
          </span>
        )}
      </div>
    </div>
  );
};
