/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { PlayerColor, PlayerProfile, GameMode, AiDifficulty, getPlayerRank } from '../types';
import { Bot, User, Edit3, Award } from 'lucide-react';

interface MobilePlayerHeaderProps {
  color: PlayerColor;
  isTurn: boolean;
  profile: PlayerProfile;
  gameMode: GameMode;
  difficulty: AiDifficulty;
  capturedCount: number;
  coveredCapturedCount: number;
  onOpenProfile?: () => void;
  isUser: boolean;
  wins?: number;
}

export const MobilePlayerHeader: React.FC<MobilePlayerHeaderProps> = ({
  color,
  isTurn,
  profile,
  gameMode,
  difficulty,
  capturedCount,
  coveredCapturedCount,
  onOpenProfile,
  isUser,
  wins = 0,
}) => {
  const isRed = color === 'red';

  const userRank = getPlayerRank(wins);

  const displayName = isUser
    ? profile.name
    : gameMode === 'ai'
    ? `Máy (${difficulty === 'easy' ? 'Tập sự' : difficulty === 'medium' ? 'Kỳ thủ' : 'Cao thủ'})`
    : color === 'red'
    ? 'Bên Đỏ (P1)'
    : 'Bên Đen (P2)';

  const avatarContent = isUser ? (
    profile.isCustomAvatar ? (
      <img
        src={profile.avatar}
        alt="avatar"
        className="w-full h-full object-cover"
      />
    ) : (
      <span className="text-xl">{profile.avatar}</span>
    )
  ) : gameMode === 'ai' ? (
    <span className="text-xl">🤖</span>
  ) : (
    <span className="text-xl">{isRed ? '🔴' : '⚫'}</span>
  );

  return (
    <div
      className={`w-full max-w-[590px] flex items-center justify-between px-3 py-1.5 rounded-xl border transition-all ${
        isTurn
          ? isRed
            ? 'bg-red-950/40 border-red-500/50 shadow-md shadow-red-950/30'
            : 'bg-stone-800/80 border-amber-500/50 shadow-md shadow-amber-950/20'
          : 'bg-[#18181c]/70 border-white/5 opacity-85'
      }`}
    >
      {/* Left: Avatar & Name */}
      <div className="flex items-center gap-2.5">
        <div
          onClick={isUser ? onOpenProfile : undefined}
          className={`relative w-9 h-9 rounded-full overflow-hidden flex items-center justify-center border-2 transition-transform ${
            isUser ? 'cursor-pointer hover:scale-105 active:scale-95' : ''
          } ${
            isTurn
              ? isRed
                ? 'border-red-500 ring-2 ring-red-500/30'
                : 'border-amber-400 ring-2 ring-amber-400/30'
              : 'border-white/20'
          } bg-stone-900`}
        >
          {avatarContent}
          {isUser && (
            <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 flex items-center justify-center transition-opacity">
              <Edit3 className="w-3 h-3 text-white" />
            </div>
          )}
        </div>

        <div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-bold text-stone-200 truncate max-w-[110px] sm:max-w-[160px]">
              {displayName}
            </span>
            {isUser && (
              <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${userRank.badgeClass} flex items-center gap-0.5 shrink-0`}>
                <Award className="w-2.5 h-2.5" />
                <span>{userRank.title}</span>
                {userRank.stars > 0 && (
                  <span className="text-amber-400 text-[8px]">{'★'.repeat(userRank.stars)}</span>
                )}
              </span>
            )}
            {isUser && (
              <button
                onClick={onOpenProfile}
                className="text-stone-400 hover:text-amber-400 p-0.5 transition-colors"
                title="Sửa tên & avatar"
              >
                <Edit3 className="w-2.5 h-2.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1 text-[10px] text-stone-400 font-mono-code">
            <span className={`font-semibold ${isRed ? 'text-red-400' : 'text-stone-300'}`}>
              {isRed ? 'Phe Đỏ' : 'Phe Đen'}
            </span>
            <span>&bull;</span>
            <span>Ăn {capturedCount} ({coveredCapturedCount} úp)</span>
          </div>
        </div>
      </div>

      {/* Right: Turn status pill */}
      <div className="flex items-center gap-1.5">
        {isTurn ? (
          <span
            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 animate-pulse ${
              isRed
                ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isRed ? 'bg-red-400' : 'bg-amber-400'
              }`}
            />
            Đang đi
          </span>
        ) : (
          <span className="text-[10px] text-stone-500 font-mono-code">
            Chờ đối thủ
          </span>
        )}
      </div>
    </div>
  );
};
