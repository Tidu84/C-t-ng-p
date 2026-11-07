/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  User,
  Upload,
  Check,
  X,
  Camera,
  ShieldCheck,
  Database,
  LogOut,
  LogIn,
  Lock,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
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
  onLogout?: () => void;
  onOpenDatabase?: () => void;
}

const SUPREME_HASH = '86a33b9867987cb57404ae674872ec1c99b0b7e7e3243079d386cee4a5d74e55';

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  profile,
  stats = { wins: 0, losses: 0, draws: 0 },
  onSaveProfile,
  onLogout,
  onOpenDatabase,
}) => {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    if (profile.isLoggedIn !== undefined) return Boolean(profile.isLoggedIn);
    return Boolean(profile.name && profile.name.trim() !== '' && profile.name !== 'Vô danh khách');
  });

  const [name, setName] = useState<string>(profile.name || '');
  const [selectedAvatar, setSelectedAvatar] = useState<string>(profile.avatar || '🐱');
  const [isCustom, setIsCustom] = useState<boolean>(Boolean(profile.isCustomAvatar));
  const [isAdmin, setIsAdmin] = useState<boolean>(Boolean(profile.isAdmin));

  // Login Form States
  const [loginName, setLoginName] = useState<string>(
    profile.name && profile.name !== 'Vô danh khách' ? profile.name : ''
  );
  const [passwordInput, setPasswordInput] = useState<string>('');
  const [authMsg, setAuthMsg] = useState<{ text: string; isError: boolean } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      const logged =
        profile.isLoggedIn !== undefined
          ? Boolean(profile.isLoggedIn)
          : Boolean(profile.name && profile.name.trim() !== '' && profile.name !== 'Vô danh khách');
      setIsLoggedIn(logged);
      setName(profile.name || '');
      setSelectedAvatar(profile.avatar || '🐱');
      setIsCustom(Boolean(profile.isCustomAvatar));
      setIsAdmin(Boolean(profile.isAdmin));
      setLoginName(profile.name && profile.name !== 'Vô danh khách' ? profile.name : '');
      setPasswordInput('');
      setAuthMsg(null);
    }
  }, [isOpen, profile]);

  if (!isOpen) return null;

  const effectiveAdmin = Boolean(isAdmin);
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

  // Standard Login Handler
  // Only username 'Tidu' with matching secret password hash gets Admin privileges.
  // Other users log in as normal players.
  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmedName = loginName.trim();
    if (!trimmedName) {
      setAuthMsg({ text: 'Vui lòng nhập tên kỳ thủ.', isError: true });
      return;
    }

    setIsSubmitting(true);
    setAuthMsg(null);

    const isTargetAdmin = trimmedName.toLowerCase() === 'tidu';

    if (isTargetAdmin) {
      if (!passwordInput.trim()) {
        setAuthMsg({ text: 'Tài khoản Quản trị viên yêu cầu mật khẩu.', isError: true });
        setIsSubmitting(false);
        return;
      }
      try {
        const buffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(passwordInput));
        const hashHex = Array.from(new Uint8Array(buffer))
          .map((b) => b.toString(16).padStart(2, '0'))
          .join('');

        if (hashHex === SUPREME_HASH) {
          const newProfile: PlayerProfile = {
            name: 'Tidu',
            avatar: selectedAvatar,
            isCustomAvatar: isCustom,
            isAdmin: true,
            isLoggedIn: true,
          };
          setIsAdmin(true);
          setName('Tidu');
          setIsLoggedIn(true);
          setPasswordInput('');
          onSaveProfile(newProfile);
          setAuthMsg({ text: 'Đăng nhập Quản trị viên Tối cao thành công!', isError: false });
        } else {
          setAuthMsg({ text: 'Mật khẩu quản trị viên không chính xác.', isError: true });
        }
      } catch {
        setAuthMsg({ text: 'Lỗi xác thực mã hóa hệ thống.', isError: true });
      }
    } else {
      // Normal player login
      const newProfile: PlayerProfile = {
        name: trimmedName,
        avatar: selectedAvatar,
        isCustomAvatar: isCustom,
        isAdmin: false,
        isLoggedIn: true,
      };
      setIsAdmin(false);
      setName(trimmedName);
      setIsLoggedIn(true);
      setPasswordInput('');
      onSaveProfile(newProfile);
      setAuthMsg({ text: `Chào mừng kỳ thủ ${trimmedName}!`, isError: false });
    }
    setIsSubmitting(false);
  };

  // Save changes to current logged-in profile
  const handleSave = () => {
    const trimmed = name.trim() || 'Kỳ thủ';
    const updatedProfile: PlayerProfile = {
      name: trimmed,
      avatar: selectedAvatar,
      isCustomAvatar: isCustom,
      isAdmin: effectiveAdmin,
      isLoggedIn: true,
    };
    onSaveProfile(updatedProfile);
    onClose();
  };

  // Logout Handler
  const handleLogoutClick = () => {
    setIsLoggedIn(false);
    setIsAdmin(false);
    setName('');
    setLoginName('');
    setPasswordInput('');
    setAuthMsg(null);
    if (onLogout) {
      onLogout();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md rounded-2xl bg-gradient-to-b from-stone-900 via-stone-950 to-black border border-amber-500/30 p-5 shadow-[0_0_30px_rgba(245,158,11,0.2)] text-stone-200 overflow-hidden flex flex-col gap-3.5 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400">
              {isLoggedIn ? <User className="w-5 h-5" /> : <LogIn className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-base font-bold text-amber-300">
                {isLoggedIn ? 'Hồ Sơ Kỳ Thủ' : 'Đăng Nhập Kỳ Thủ'}
              </h2>
              <p className="text-[11px] text-stone-400">
                {isLoggedIn
                  ? 'Tùy biến tên, ảnh đại diện và quản lý tài khoản'
                  : 'Đăng nhập để ghi nhận ván đấu và cấp bậc kỳ nghệ'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ======================================================== */}
        {/* VIEW 1: NOT LOGGED IN / LOGIN FORM                      */}
        {/* ======================================================== */}
        {!isLoggedIn ? (
          <form onSubmit={handleLogin} className="space-y-3.5">
            {/* Avatar Preview & Selection */}
            <div className="flex items-center gap-3 bg-stone-900/60 p-3 rounded-xl border border-white/10">
              <div className="relative group">
                <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-amber-400 flex items-center justify-center bg-stone-950 text-2xl shadow-lg shadow-black/60">
                  {isCustom ? (
                    <img src={selectedAvatar} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <span>{selectedAvatar}</span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute -bottom-1 -right-1 p-1 rounded-full bg-amber-500 hover:bg-amber-400 text-stone-950 shadow-md transition-transform active:scale-90"
                  title="Tải ảnh mới"
                >
                  <Camera className="w-3 h-3" />
                </button>
              </div>

              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-stone-200">Chọn Đại Diện & Nhập Tên</div>
                <p className="text-[11px] text-stone-400 mt-0.5">
                  Chọn hình đại diện bên dưới hoặc bấm biểu tượng máy ảnh để tải ảnh cá nhân.
                </p>
              </div>
            </div>

            {/* Input Name */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-stone-300 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-amber-400" /> Tên Kỳ Thủ / Tài Khoản
              </label>
              <input
                type="text"
                value={loginName}
                onChange={(e) => setLoginName(e.target.value)}
                maxLength={20}
                placeholder="Nhập tên của bạn (vd: Nam, Kỳ Thủ Phố, Tidu...)"
                className="w-full px-3 py-2 rounded-xl bg-stone-900/90 border border-stone-800 text-sm text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-500 transition-colors"
                autoFocus
              />
            </div>

            {/* Input Password */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-stone-300 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-amber-400" /> Mật Khẩu
              </label>
              <input
                type="password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="Nhập mật khẩu (chỉ bắt buộc cho Admin)..."
                className="w-full px-3 py-2 rounded-xl bg-stone-900/90 border border-stone-800 text-sm text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-500 transition-colors"
              />
              <p className="text-[10px] text-stone-500 italic">
                * Người chơi thông thường không cần mật khẩu. Chỉ tài khoản Quản trị mới cần mật khẩu xác thực.
              </p>
            </div>

            {/* Avatar Quick Picker */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-stone-300">Biểu Tượng Đại Diện Có Sẵn</label>
              <div className="grid grid-cols-4 gap-2">
                {DEFAULT_AVATARS.map((av) => {
                  const isCurrent = !isCustom && selectedAvatar === av.emoji;
                  return (
                    <button
                      type="button"
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

            {/* Upload File Input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageUpload}
            />

            {/* Error / Feedback Message */}
            {authMsg && (
              <div
                className={`flex items-center gap-1.5 p-2 rounded-lg text-xs font-medium border ${
                  authMsg.isError
                    ? 'bg-red-950/40 text-red-300 border-red-800/60'
                    : 'bg-emerald-950/40 text-emerald-300 border-emerald-800/60'
                }`}
              >
                {authMsg.isError ? (
                  <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                ) : (
                  <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                )}
                <span>{authMsg.text}</span>
              </div>
            )}

            {/* Action Buttons */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-stone-950 font-bold text-sm shadow-lg shadow-amber-500/20 transition-all active:scale-95 uppercase tracking-wider disabled:opacity-50"
            >
              <LogIn className="w-4 h-4" />
              <span>Đăng Nhập</span>
            </button>
          </form>
        ) : (
          /* ======================================================== */
          /* VIEW 2: LOGGED IN / PROFILE MANAGEMENT                   */
          /* ======================================================== */
          <div className="space-y-3.5">
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
                  type="button"
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
                  <span>
                    Thắng: <strong className="text-emerald-400">{stats.wins}</strong>
                  </span>
                  <span>
                    Hòa: <strong className="text-amber-400">{stats.draws}</strong>
                  </span>
                  <span>
                    Tỷ lệ: <strong className="text-amber-300">{winRate}%</strong>
                  </span>
                </div>
              </div>
            </div>

            {/* ONLY DISPLAYED WHEN ADMIN IS LOGGED IN */}
            {effectiveAdmin && (
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
                  Tài khoản tối cao: Toàn quyền quản trị cơ sở dữ liệu, kiểm tra toàn bộ hồ sơ và mở khóa tất cả chế độ.
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
            )}

            {/* Input Player Name */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-stone-300">Tên Kỳ Thủ</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={20}
                placeholder="Nhập tên của bạn"
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
                      type="button"
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
                type="button"
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

            {/* Bottom Actions: Đăng Xuất & Lưu Hồ Sơ */}
            <div className="flex items-center gap-2.5 pt-1">
              <button
                type="button"
                onClick={handleLogoutClick}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-stone-900 hover:bg-red-950/50 text-red-400 hover:text-red-300 border border-stone-800 hover:border-red-800/80 font-bold text-xs shadow transition-all active:scale-95"
              >
                <LogOut className="w-4 h-4" />
                <span>Đăng Xuất</span>
              </button>

              <button
                type="button"
                onClick={handleSave}
                className="flex-[2] flex items-center justify-center gap-2 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition-all active:scale-95 uppercase tracking-wider"
              >
                <Check className="w-4 h-4" />
                <span>Lưu Hồ Sơ</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
