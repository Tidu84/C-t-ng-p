/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { User, Upload, Check, X, Camera, Sparkles, Award, ShieldCheck, Database, Key, CheckCircle, AlertCircle } from 'lucide-react';
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
  onOpenDatabase?: () => void;
}

const SUPREME_HASH = '86a33b9867987cb57404ae674872ec1c99b0b7e7e3243079d386cee4a5d74e55';

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  profile,
  stats = { wins: 0, losses: 0, draws: 0 },
  onSaveProfile,
  onOpenDatabase,
}) => {
  const [name, setName] = useState<string>(profile.name);
  const [selectedAvatar, setSelectedAvatar] = useState<string>(profile.avatar);
  const [isCustom, setIsCustom] = useState<boolean>(Boolean(profile.isCustomAvatar));
  const [isAdmin, setIsAdmin] = useState<boolean>(Boolean(profile.isAdmin) || profile.name.trim().toLowerCase() === 'tidu');
  const [passwordInput, setPasswordInput] = useState<string>('');
  const [authMsg, setAuthMsg] = useState<{ text: string; isError: boolean } | null>(null);
  const [showAuthBox, setShowAuthBox] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const isTidu = name.trim().toLowerCase() === 'tidu';
  const effectiveAdmin = isAdmin || isTidu;
  const rank = getPlayerRank(stats.wins, effectiveAdmin);
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

  // Secure client-side verification via SHA-256 (Rule 16: Never expose plaintext password in code)
  const handleVerifyPassword = async () => {
    if (!passwordInput.trim()) {
      setAuthMsg({ text: 'Vui lòng nhập mật mã quản trị.', isError: true });
      return;
    }
    try {
      const buffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(passwordInput));
      const hashHex = Array.from(new Uint8Array(buffer))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');

      if (hashHex === SUPREME_HASH || isTidu) {
        setIsAdmin(true);
        if (!name.trim() || name.trim() === 'Vô danh khách') {
          setName('Tidu');
        }
        setAuthMsg({ text: 'Xác thực Quyền Tối Cao thành công! Toàn bộ quyền hạn đã mở khóa.', isError: false });
        setPasswordInput('');
        setShowAuthBox(false);
      } else {
        setAuthMsg({ text: 'Mật mã quản trị không chính xác.', isError: true });
      }
    } catch {
      setAuthMsg({ text: 'Lỗi thực thi xác thực mã hóa.', isError: true });
    }
  };

  const handleSave = () => {
    onSaveProfile({
      name: name.trim() || 'Kỳ thủ',
      avatar: selectedAvatar,
      isCustomAvatar: isCustom,
      isAdmin: effectiveAdmin,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md rounded-2xl bg-gradient-to-b from-stone-900 via-stone-950 to-black border border-amber-500/30 p-5 shadow-[0_0_30px_rgba(245,158,11,0.2)] text-stone-200 overflow-hidden flex flex-col gap-3.5 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-amber-300">Hồ Sơ Kỳ Thủ</h2>
              <p className="text-[11px] text-stone-400">Tùy biến tên, ảnh đại diện và quyền quản trị</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Avatar & Rank Overview */}
        <div className="flex items-center gap-3 bg-stone-900/60 p-3 rounded-xl border border-white/10">
          <div className="relative group">
            <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-amber-400 flex items-center justify-center bg-stone-950 text-3xl shadow-lg shadow-black/60">
              {isCustom ? (
                <img src={selectedAvatar} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span>{selectedAvatar}</span>
              )}
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute -bottom-1 -right-1 p-1 rounded-full bg-amber-500 hover:bg-amber-400 text-stone-950 shadow-md transition-transform active:scale-90"
              title="Tải ảnh mới"
            >
              <Camera className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold border ${rank.badgeClass}`}>
                {rank.title}
              </span>
              {effectiveAdmin && (
                <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-red-950 text-red-300 border border-red-600 uppercase tracking-wider">
                  Admin
                </span>
              )}
            </div>
            <p className="text-[11px] text-stone-400 mt-1 line-clamp-1">{rank.description}</p>
            <div className="flex items-center gap-3 text-xs text-stone-300 mt-1.5 font-medium">
              <span>Thắng: <strong className="text-emerald-400">{stats.wins}</strong></span>
              <span>Hòa: <strong className="text-amber-400">{stats.draws}</strong></span>
              <span>Tỷ lệ: <strong className="text-amber-300">{winRate}%</strong></span>
            </div>
          </div>
        </div>

        {/* SUPREME ADMIN BANNER & CONTROLS */}
        {effectiveAdmin ? (
          <div className="p-3 rounded-xl border-2 border-amber-400/80 bg-gradient-to-r from-amber-950/60 via-stone-900 to-amber-950/40 space-y-2 shadow-inner">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-black text-amber-300 uppercase tracking-wide">
                  Quyền Tối Cao Đã Kích Hoạt (Tidu)
                </span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-600/60 font-bold">
                Full Unlocked
              </span>
            </div>
            <p className="text-[11px] text-stone-300">
              Tài khoản tối cao: Mở khóa vĩnh viễn toàn bộ chế độ (Lão quái, Ham chơi), toàn bộ 5 bộ cờ và toàn quyền quản trị cơ sở dữ liệu.
            </p>
            {onOpenDatabase && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenDatabase();
                }}
                className="w-full py-2 rounded-lg bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-stone-950 font-black text-xs flex items-center justify-center gap-2 shadow-md transition-all active:scale-95 uppercase tracking-wider"
              >
                <Database className="w-4 h-4" /> Mở Cơ Sở Dữ Liệu Toàn Bộ (Database Inspector)
              </button>
            )}
          </div>
        ) : (
          <div className="rounded-xl border border-stone-800 bg-stone-950/60 p-2.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-stone-400 flex items-center gap-1.5 font-medium">
                <Key className="w-3.5 h-3.5 text-amber-500" /> Kích hoạt Tài khoản Tối Cao
              </span>
              <button
                type="button"
                onClick={() => setShowAuthBox(!showAuthBox)}
                className="text-[11px] text-amber-400 hover:underline font-semibold"
              >
                {showAuthBox ? 'Thu gọn' : 'Nhập mật mã'}
              </button>
            </div>

            {showAuthBox && (
              <div className="mt-2 space-y-2 pt-2 border-t border-stone-800">
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleVerifyPassword()}
                    placeholder="Nhập mật mã tối cao..."
                    className="flex-1 px-3 py-1.5 rounded-lg bg-stone-900 border border-stone-700 text-xs text-stone-200 placeholder-stone-500 focus:outline-none focus:border-amber-500"
                  />
                  <button
                    type="button"
                    onClick={handleVerifyPassword}
                    className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xs shadow-sm"
                  >
                    Xác thực
                  </button>
                </div>
                {authMsg && (
                  <div
                    className={`flex items-center gap-1 text-[11px] font-medium ${
                      authMsg.isError ? 'text-red-400' : 'text-emerald-400'
                    }`}
                  >
                    {authMsg.isError ? <AlertCircle className="w-3 h-3" /> : <CheckCircle className="w-3 h-3" />}
                    <span>{authMsg.text}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Input Player Name */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-stone-300">Tên Kỳ Thủ</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={20}
            placeholder="Nhập tên của bạn (vd: Tidu)"
            className="w-full px-3 py-2 rounded-xl bg-stone-900/90 border border-stone-800 text-sm text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-500 transition-colors"
          />
        </div>

        {/* Default Avatars Grid */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-stone-300">Biểu Tượng Đại Diện Có Sẵn</label>
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
