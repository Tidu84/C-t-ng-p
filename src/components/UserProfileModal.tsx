/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { User, Upload, Check, X, Camera, Sparkles, Award } from 'lucide-react';
import { PlayerProfile, PlayerStats, getPlayerRank } from '../types';
import { getDerivedPlayerMetrics, loadPlayerRating } from '../utils/playerRating';

export const DEFAULT_AVATARS = [
  { id: 'cat', emoji: '🐱', label: 'Mèo Kỳ Vương', bg: 'from-amber-500 to-orange-600' },
  { id: 'elder', emoji: '🧓', label: 'Lão Tướng', bg: 'from-stone-600 to-stone-800' },
  { id: 'cool', emoji: '😎', label: 'Cao Thủ Phố', bg: 'from-blue-600 to-indigo-800' },
  { id: 'tea', emoji: '☕', label: 'Bác Ba Quán Cóc', bg: 'from-amber-700 to-yellow-800' },
  { id: 'ninja', emoji: '🥷', label: 'Thích Khách Úp', bg: 'from-zinc-700 to-zinc-950' },
  { id: 'tiger', emoji: '🐯', label: 'Mãnh Hổ Soái', bg: 'from-red-600 to-amber-700' },
  { id: 'panda', emoji: '🐼', label: 'Trúc Lâm Kỳ Hiệp', bg: 'from-emerald-700 to-teal-900' },
  { id: 'dragon', emoji: '🐉', label: 'Hoàng Long', bg: 'from-yellow-600 to-red-800' },
];

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: PlayerProfile;
  stats?: PlayerStats;
  onSaveProfile: (profile: PlayerProfile) => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  profile,
  stats = { wins: 0, losses: 0, draws: 0 },
  onSaveProfile,
}) => {
  const [name, setName] = useState<string>(profile.name);
  const [selectedAvatar, setSelectedAvatar] = useState<string>(profile.avatar);
  const [isCustom, setIsCustom] = useState<boolean>(Boolean(profile.isCustomAvatar));
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const rank = getPlayerRank(stats.wins);
  const totalGames = stats.wins + stats.losses + stats.draws;
  const winRate = totalGames > 0 ? Math.round((stats.wins / totalGames) * 100) : 0;
  const rating = loadPlayerRating();
  const metrics = getDerivedPlayerMetrics(rating);

  // Handle image upload and auto-resize with canvas
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Resize down to 128x128 center-cropped
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 128;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const size = Math.min(img.width, img.height);
        const startX = (img.width - size) / 2;
        const startY = (img.height - size) / 2;

        ctx.drawImage(img, startX, startY, size, size, 0, 0, 128, 128);
        const resizedDataUrl = canvas.toDataURL('image/jpeg', 0.85);

        setSelectedAvatar(resizedDataUrl);
        setIsCustom(true);
      };
      if (typeof event.target?.result === 'string') {
        img.src = event.target.result;
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSelectDefault = (emoji: string) => {
    setSelectedAvatar(emoji);
    setIsCustom(false);
  };

  const handleSave = () => {
    const trimmedName = name.trim() || 'Kỳ Thủ Vô Danh';
    onSaveProfile({
      name: trimmedName,
      avatar: selectedAvatar,
      isCustomAvatar: isCustom,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#18181c] border border-amber-500/50 rounded-2xl max-w-md w-full max-h-[92dvh] overflow-y-auto p-4 sm:p-6 shadow-2xl relative flex flex-col gap-3.5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/40">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base text-stone-100">Hồ Sơ Kỳ Thủ</h3>
              <p className="text-[11px] text-stone-400">Tùy biến tên gọi & hình đại diện trên bàn cờ</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-white/10 text-stone-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Avatar Preview */}
        <div className="flex items-center gap-4 bg-[#121214] p-3.5 rounded-xl border border-white/10">
          <div className="relative">
            <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-amber-400 shadow-md bg-stone-800 flex items-center justify-center text-3xl">
              {isCustom ? (
                <img
                  src={selectedAvatar}
                  alt="Custom Avatar"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span>{selectedAvatar}</span>
              )}
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-amber-500 text-stone-950 flex items-center justify-center shadow-lg hover:bg-amber-400 transition-colors"
              title="Tải ảnh từ máy"
            >
              <Camera className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex-1">
            <label className="block text-[11px] font-mono-code uppercase text-amber-400/90 font-bold mb-1">
              Tên kỳ thủ (không bắt buộc)
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nhập tên của bạn..."
              maxLength={20}
              className="w-full bg-stone-900 border border-white/20 rounded-lg px-3 py-1.5 text-sm text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-500 transition-colors"
            />
          </div>
        </div>

        {/* Player Rank & Achievements Card (Danh hiệu kỳ thủ) */}
        <div className="bg-[#121214] p-3 rounded-xl border border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-stone-400">Danh hiệu:</span>
                <span className={`text-xs font-black px-1.5 py-0.5 rounded border ${rank.badgeClass}`}>{rank.title}</span>
                {rank.stars > 0 && (
                  <span className="text-amber-400 text-xs">{'★'.repeat(rank.stars)}</span>
                )}
              </div>
              <p className="text-[10px] text-stone-500">
                Thắng: <b className="text-emerald-400">{stats.wins}</b> &bull; Bại: <b className="text-red-400">{stats.losses}</b> &bull; Hòa: <b className="text-stone-300">{stats.draws}</b> (Tỉ lệ thắng: {winRate}%)
              </p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-stone-500 block">Tổng số ván</span>
            <span className="text-xs font-mono-code font-bold text-amber-300">{totalGames} ván • {rating.elo} Elo</span>
          </div>
        </div>

        {/* 5-Axis Tactical Mastery & Psychological Stats */}
        <div className="bg-[#121214] p-3 rounded-xl border border-amber-500/25 flex flex-col gap-2.5 text-xs">
          <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
            <span className="font-bold text-amber-300 uppercase tracking-wider text-[10px]">
              ⚔️ Hồ Sơ Kỳ Lực & Chỉ Số Thực Chiến
            </span>
            <span className="text-[10px] text-stone-400">
              Kỷ lục thắng thông: <b className="text-amber-400">{rating.bestStreak} ván</b>
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-stone-900/90 p-2 rounded-lg border border-white/5">
              <div className="flex justify-between text-[10px] mb-1">
                <span className="text-red-300 font-semibold">🔥 Sát Khí</span>
                <span className="font-mono-code text-red-400 font-bold">{metrics.attackScore}</span>
              </div>
              <div className="w-full h-1.5 bg-stone-800 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-red-600 to-orange-400" style={{ width: `${metrics.attackScore}%` }} />
              </div>
            </div>
            <div className="bg-stone-900/90 p-2 rounded-lg border border-white/5">
              <div className="flex justify-between text-[10px] mb-1">
                <span className="text-sky-300 font-semibold">🛡️ Thủ Thành</span>
                <span className="font-mono-code text-sky-400 font-bold">{metrics.defenseScore}</span>
              </div>
              <div className="w-full h-1.5 bg-stone-800 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-sky-600 to-cyan-400" style={{ width: `${metrics.defenseScore}%` }} />
              </div>
            </div>
            <div className="bg-stone-900/90 p-2 rounded-lg border border-white/5">
              <div className="flex justify-between text-[10px] mb-1">
                <span className="text-purple-300 font-semibold">⚡ Quái Chiêu</span>
                <span className="font-mono-code text-purple-400 font-bold">{metrics.trickScore}</span>
              </div>
              <div className="w-full h-1.5 bg-stone-800 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-purple-600 to-pink-400" style={{ width: `${metrics.trickScore}%` }} />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-stone-900/80 p-2 rounded-lg border border-emerald-500/20">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-stone-400">Chỉ số Quẫy thế bí</span>
                <span className="text-xs font-mono-code font-black text-emerald-400">{metrics.clutchScore}/100</span>
              </div>
              <div className="text-[10px] font-bold text-emerald-300 truncate mt-0.5">{metrics.clutchTitle}</div>
              <div className="text-[9px] text-stone-500 mt-0.5">
                Thoát chiếu: <b className="text-stone-300">{rating.clutchStats.escapedChecksTotal}</b> &bull; Lật kèo: <b className="text-amber-300">{rating.clutchStats.comebackWins}</b>
              </div>
            </div>
            <div className="bg-stone-900/80 p-2 rounded-lg border border-amber-500/20">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-stone-400">Nhân phẩm mở nắp</span>
                <span className="text-xs font-mono-code font-black text-amber-400">{metrics.luckRate}%</span>
              </div>
              <div className="text-[10px] font-bold text-amber-300 truncate mt-0.5">{metrics.luckTitle}</div>
              <div className="text-[9px] text-stone-500 mt-0.5">
                Bốc trúng Xe: <b className="text-red-300">{rating.luckStats.chariotsUncovered}</b> &bull; Quân lớn: <b className="text-stone-300">{rating.luckStats.majorUncovers}/{rating.luckStats.totalUncovers}</b>
              </div>
            </div>
          </div>
          <div className="bg-stone-900/70 p-2 rounded-lg border border-white/5">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] text-stone-400 font-semibold">Tuyệt kỹ sát cục theo binh chủng:</span>
              {rating.revealCheckmates > 0 && (
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  🎲 Lật nắp chiếu bí: {rating.revealCheckmates}
                </span>
              )}
            </div>
            <div className="grid grid-cols-5 gap-1 text-center">
              {metrics.roleEntries.map((item) => (
                <div key={item.role} className="bg-stone-950/80 py-1 px-1 rounded border border-white/5">
                  <div className="text-sm leading-none">{item.icon}</div>
                  <div className="text-[10px] font-mono-code font-bold text-amber-300 mt-0.5">{item.count}</div>
                  <div className="text-[8px] text-stone-400 truncate">{item.label.split(' ')[0]}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
        {/* Default Funny Avatars Selection */}
        <div>
          <label className="block text-xs font-semibold text-stone-300 mb-2 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Chọn Avatar ngộ nghĩnh hoặc tải ảnh tự do:</span>
          </label>

          <div className="grid grid-cols-4 gap-2">
            {DEFAULT_AVATARS.map((av) => {
              const isCurrent = !isCustom && selectedAvatar === av.emoji;
              return (
                <button
                  key={av.id}
                  onClick={() => handleSelectDefault(av.emoji)}
                  className={`flex flex-col items-center justify-center p-2 rounded-xl border transition-all ${
                    isCurrent
                      ? 'border-amber-400 bg-amber-500/20 shadow-md shadow-amber-500/10 scale-105'
                      : 'border-white/10 bg-stone-900/80 hover:border-white/30 hover:bg-stone-800'
                  }`}
                >
                  <span className="text-2xl mb-1">{av.emoji}</span>
                  <span className="text-[10px] text-stone-300 font-medium truncate w-full text-center">
                    {av.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Upload Custom Image Button */}
        <div className="flex items-center justify-between bg-stone-900/50 p-2.5 rounded-xl border border-white/10 text-xs">
          <div className="flex items-center gap-2 text-stone-300">
            <Upload className="w-4 h-4 text-amber-400" />
            <span>Ảnh từ điện thoại / máy tính</span>
          </div>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-amber-300 border border-amber-500/40 font-semibold text-xs transition-colors"
          >
            Chọn tệp ảnh
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageUpload}
          />
        </div>

        {/* Save button */}
        <button
          onClick={handleSave}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-sm shadow-lg shadow-amber-500/20 transition-all active:scale-95 uppercase tracking-wider mt-1"
        >
          <Check className="w-4 h-4" />
          <span>Lưu Hồ Sơ</span>
        </button>
      </div>
    </div>
  );
};
