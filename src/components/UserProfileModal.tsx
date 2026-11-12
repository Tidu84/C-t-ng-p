/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  User,
  Upload,
  X,
  Camera,
  Database,
  LogOut,
  LogIn,
  Lock,
  AlertCircle,
  CheckCircle,
  UserPlus,
  History,
} from 'lucide-react';
import { PlayerProfile, PlayerStats, getPlayerRank } from '../types';
import { getDerivedPlayerMetrics, loadPlayerRating } from '../utils/playerRating';
import {
  syncPlayerProfileToCloud,
  fetchPlayerAccountFromCloud,
} from '../utils/firebaseSync';

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

interface RegisteredAccount {
  username: string;
  passwordHash: string;
  avatar: string;
  isCustomAvatar?: boolean;
  createdAt: number;
}

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: PlayerProfile;
  stats?: PlayerStats;
  onSaveProfile: (profile: PlayerProfile) => void;
  onLogout?: () => void;
  onOpenDatabase?: () => void;
  onOpenHistory?: () => void;
}

const SUPREME_HASH = '86a33b9867987cb57404ae674872ec1c99b0b7e7e3243079d386cee4a5d74e55';

// Helper to hash passwords using SHA-256
async function sha256Hex(str: string): Promise<string> {
  const buffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// Local accounts storage
function getRegisteredAccounts(): RegisteredAccount[] {
  try {
    const raw = localStorage.getItem('co_up_registered_accounts');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveRegisteredAccounts(accounts: RegisteredAccount[]): void {
  try {
    localStorage.setItem('co_up_registered_accounts', JSON.stringify(accounts));
  } catch {}
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  profile,
  stats = { wins: 0, losses: 0, draws: 0 },
  onSaveProfile,
  onLogout,
  onOpenDatabase,
  onOpenHistory,
}) => {
  const isProfileActive =
    profile.isLoggedIn !== undefined
      ? Boolean(profile.isLoggedIn)
      : Boolean(profile.name && profile.name.trim() !== '' && profile.name !== 'Vô danh khách');

  const [activeTab, setActiveTab] = useState<'profile' | 'login' | 'register'>(
    isProfileActive ? 'profile' : 'login'
  );

  const [name, setName] = useState<string>(profile.name || '');
  const [selectedAvatar, setSelectedAvatar] = useState<string>(profile.avatar || '🐱');
  const [isCustom, setIsCustom] = useState<boolean>(Boolean(profile.isCustomAvatar));
  const [isAdmin, setIsAdmin] = useState<boolean>(Boolean(profile.isAdmin));

  // Login Form States
  const [loginUsername, setLoginUsername] = useState<string>('');
  const [loginPassword, setLoginPassword] = useState<string>('');

  // Register Form States
  const [regUsername, setRegUsername] = useState<string>('');
  const [regPassword, setRegPassword] = useState<string>('');
  const [regConfirmPassword, setRegConfirmPassword] = useState<string>('');

  const [authMsg, setAuthMsg] = useState<{ text: string; isError: boolean } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      const logged =
        profile.isLoggedIn !== undefined
          ? Boolean(profile.isLoggedIn)
          : Boolean(profile.name && profile.name.trim() !== '' && profile.name !== 'Vô danh khách');
      setActiveTab(logged ? 'profile' : 'login');
      setName(profile.name || '');
      setSelectedAvatar(profile.avatar || '🐱');
      setIsCustom(Boolean(profile.isCustomAvatar));
      setIsAdmin(Boolean(profile.isAdmin));
      setLoginUsername(profile.name && profile.name !== 'Vô danh khách' ? profile.name : '');
      setLoginPassword('');
      setRegUsername('');
      setRegPassword('');
      setRegConfirmPassword('');
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

  const isCurrentlyLoggedIn = isProfileActive || Boolean(name && name !== 'Vô danh khách');

  // Auto-save on closing via the X button
  const handleClose = () => {
    if (isCurrentlyLoggedIn && activeTab === 'profile') {
      const trimmed = name.trim() || profile.name || 'Kỳ thủ';
      onSaveProfile({
        name: trimmed,
        avatar: selectedAvatar,
        isCustomAvatar: isCustom,
        isAdmin: effectiveAdmin,
        isLoggedIn: true,
      });
    }
    onClose();
  };

  // Handle image upload and auto-resize with canvas and immediately auto-save
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

        if (isCurrentlyLoggedIn && activeTab === 'profile') {
          onSaveProfile({
            name: name.trim() || profile.name || 'Kỳ thủ',
            avatar: resizedDataUrl,
            isCustomAvatar: true,
            isAdmin: effectiveAdmin,
            isLoggedIn: true,
          });
        }
      };
      if (typeof event.target?.result === 'string') {
        img.src = event.target.result;
      }
    };
    reader.readAsDataURL(file);
  };

  // Select default avatar and immediately auto-save
  const handleSelectDefault = (emoji: string) => {
    setSelectedAvatar(emoji);
    setIsCustom(false);

    if (isCurrentlyLoggedIn && activeTab === 'profile') {
      onSaveProfile({
        name: name.trim() || profile.name || 'Kỳ thủ',
        avatar: emoji,
        isCustomAvatar: false,
        isAdmin: effectiveAdmin,
        isLoggedIn: true,
      });
    }
  };

  // Login handler
  const handleLoginSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmedUser = loginUsername.trim();
    if (!trimmedUser) {
      setAuthMsg({ text: 'Vui lòng nhập tên kỳ thủ / tài khoản.', isError: true });
      return;
    }
    if (!loginPassword) {
      setAuthMsg({ text: 'Vui lòng nhập mật khẩu.', isError: true });
      return;
    }

    setIsSubmitting(true);
    setAuthMsg(null);

    try {
      const hash = await sha256Hex(loginPassword);

      // Backend admin verification
      if (trimmedUser.toLowerCase() === 'tidu') {
        if (hash === SUPREME_HASH) {
          const newProfile: PlayerProfile = {
            name: 'Tidu',
            avatar: selectedAvatar,
            isCustomAvatar: isCustom,
            isAdmin: true,
            isLoggedIn: true,
          };
          setIsAdmin(true);
          setName('Tidu');
          setActiveTab('profile');
          setLoginPassword('');
          onSaveProfile(newProfile);
          setAuthMsg({ text: 'Đăng nhập thành công!', isError: false });
        } else {
          setAuthMsg({ text: 'Mật khẩu không chính xác.', isError: true });
        }
        setIsSubmitting(false);
        return;
      }

      // Check local registered accounts
      const accounts = getRegisteredAccounts();
      const existing = accounts.find(
        (a) => a.username.toLowerCase() === trimmedUser.toLowerCase()
      );

      if (existing) {
        if (existing.passwordHash === hash) {
          const newProfile: PlayerProfile = {
            name: existing.username,
            avatar: existing.avatar || selectedAvatar,
            isCustomAvatar: Boolean(existing.isCustomAvatar),
            isAdmin: false,
            isLoggedIn: true,
          };
          setIsAdmin(false);
          setName(existing.username);
          setSelectedAvatar(existing.avatar || selectedAvatar);
          setIsCustom(Boolean(existing.isCustomAvatar));
          setActiveTab('profile');
          setLoginPassword('');
          onSaveProfile(newProfile);
          // Sync to Firebase Cloud in background
          syncPlayerProfileToCloud(newProfile, hash, stats).catch(() => {});
          setAuthMsg({ text: `Chào mừng ${existing.username} quay trở lại!`, isError: false });
        } else {
          setAuthMsg({ text: 'Mật khẩu không chính xác.', isError: true });
        }
      } else {
        // Query Firebase Cloud account
        const cloudAcc = await fetchPlayerAccountFromCloud(trimmedUser);
        if (cloudAcc) {
          if (cloudAcc.passwordHash === hash) {
            // Cache locally for offline availability
            const newAcc: RegisteredAccount = {
              username: cloudAcc.username,
              passwordHash: cloudAcc.passwordHash,
              avatar: cloudAcc.avatar,
              isCustomAvatar: cloudAcc.isCustomAvatar,
              createdAt: cloudAcc.updatedAt || Date.now(),
            };
            accounts.push(newAcc);
            saveRegisteredAccounts(accounts);

            const newProfile: PlayerProfile = {
              name: cloudAcc.username,
              avatar: cloudAcc.avatar || selectedAvatar,
              isCustomAvatar: Boolean(cloudAcc.isCustomAvatar),
              isAdmin: Boolean(cloudAcc.isAdmin),
              isLoggedIn: true,
            };
            setIsAdmin(Boolean(cloudAcc.isAdmin));
            setName(cloudAcc.username);
            setSelectedAvatar(cloudAcc.avatar || selectedAvatar);
            setIsCustom(Boolean(cloudAcc.isCustomAvatar));
            setActiveTab('profile');
            setLoginPassword('');
            onSaveProfile(newProfile);
            setAuthMsg({ text: `Chào mừng ${cloudAcc.username} quay trở lại!`, isError: false });
          } else {
            setAuthMsg({ text: 'Mật khẩu không chính xác.', isError: true });
          }
        } else {
          setAuthMsg({
            text: 'Tên kỳ thủ không tồn tại. Vui lòng kiểm tra lại hoặc chuyển sang tab Đăng Ký.',
            isError: true,
          });
        }
      }
    } catch {
      setAuthMsg({ text: 'Lỗi xác thực hệ thống.', isError: true });
    }
    setIsSubmitting(false);
  };

  // Register handler
  const handleRegisterSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmedUser = regUsername.trim();
    if (!trimmedUser || trimmedUser.length < 2) {
      setAuthMsg({ text: 'Tên kỳ thủ phải có ít nhất 2 ký tự.', isError: true });
      return;
    }
    if (trimmedUser.toLowerCase() === 'tidu') {
      setAuthMsg({ text: 'Tên tài khoản này đã được hệ thống bảo lưu.', isError: true });
      return;
    }
    if (!regPassword || regPassword.length < 4) {
      setAuthMsg({ text: 'Mật khẩu phải có ít nhất 4 ký tự.', isError: true });
      return;
    }
    if (regPassword !== regConfirmPassword) {
      setAuthMsg({ text: 'Mật khẩu xác nhận không khớp.', isError: true });
      return;
    }

    setIsSubmitting(true);
    setAuthMsg(null);

    try {
      const accounts = getRegisteredAccounts();
      const existing = accounts.find(
        (a) => a.username.toLowerCase() === trimmedUser.toLowerCase()
      );
      if (existing) {
        setAuthMsg({ text: 'Tên kỳ thủ đã tồn tại. Vui lòng chọn tên khác hoặc Đăng Nhập.', isError: true });
        setIsSubmitting(false);
        return;
      }

      // Check if username already registered in Firebase Cloud
      const cloudExisting = await fetchPlayerAccountFromCloud(trimmedUser);
      if (cloudExisting) {
        setAuthMsg({ text: 'Tên kỳ thủ đã tồn tại trên Cloud. Vui lòng chọn tên khác hoặc Đăng Nhập.', isError: true });
        setIsSubmitting(false);
        return;
      }

      const hash = await sha256Hex(regPassword);
      const newAcc: RegisteredAccount = {
        username: trimmedUser,
        passwordHash: hash,
        avatar: selectedAvatar,
        isCustomAvatar: isCustom,
        createdAt: Date.now(),
      };

      accounts.push(newAcc);
      saveRegisteredAccounts(accounts);

      const newProfile: PlayerProfile = {
        name: trimmedUser,
        avatar: selectedAvatar,
        isCustomAvatar: isCustom,
        isAdmin: false,
        isLoggedIn: true,
      };

      // Sync to Firebase Cloud
      syncPlayerProfileToCloud(newProfile, hash, stats).catch(() => {});

      setIsAdmin(false);
      setName(trimmedUser);
      setActiveTab('profile');
      setRegPassword('');
      setRegConfirmPassword('');
      onSaveProfile(newProfile);
      setAuthMsg({ text: 'Đăng ký tài khoản thành công! Đã tự động lưu trên Cloud.', isError: false });
    } catch {
      setAuthMsg({ text: 'Lỗi tạo tài khoản mới.', isError: true });
    }
    setIsSubmitting(false);
  };

  // Single Logout handler
  const handleLogoutClick = () => {
    setIsAdmin(false);
    setName('');
    setLoginUsername('');
    setLoginPassword('');
    setRegUsername('');
    setRegPassword('');
    setRegConfirmPassword('');
    setActiveTab('login');
    setAuthMsg({ text: 'Đã đăng xuất tài khoản.', isError: false });
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
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-amber-300">Hồ Sơ Kỳ Thủ</h2>
              <p className="text-[11px] text-stone-400">Đăng ký, đăng nhập và quản lý thông tin thi đấu</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition-colors"
            title="Đóng (tự động lưu hồ sơ)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs: Hồ Sơ | Đăng Nhập | Đăng Ký */}
        <div className="flex items-center bg-stone-900/90 p-1 rounded-xl border border-white/10 gap-1 text-xs font-semibold">
          {isCurrentlyLoggedIn && (
            <button
              type="button"
              onClick={() => {
                setActiveTab('profile');
                setAuthMsg(null);
              }}
              className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'profile'
                  ? 'bg-amber-500 text-stone-950 font-bold shadow-sm'
                  : 'text-stone-300 hover:text-white hover:bg-stone-800'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Hồ Sơ</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              setActiveTab('login');
              setAuthMsg(null);
            }}
            className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'login'
                ? 'bg-amber-500 text-stone-950 font-bold shadow-sm'
                : 'text-stone-300 hover:text-white hover:bg-stone-800'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Đăng Nhập</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('register');
              setAuthMsg(null);
            }}
            className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'register'
                ? 'bg-amber-500 text-stone-950 font-bold shadow-sm'
                : 'text-stone-300 hover:text-white hover:bg-stone-800'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Đăng Ký</span>
          </button>
        </div>

        {/* Feedback Message */}
        {authMsg && (
          <div
            className={`flex items-center gap-2 p-2 rounded-lg text-xs font-medium border ${
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

        {/* ======================================================== */}
        {/* TAB 1: ĐĂNG NHẬP (LOGIN)                                  */}
        {/* ======================================================== */}
        {activeTab === 'login' && (
          <form onSubmit={handleLoginSubmit} className="space-y-3.5 animate-fade-in">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-stone-300 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-amber-400" /> Tên Kỳ Thủ / Tài Khoản
              </label>
              <input
                type="text"
                value={loginUsername}
                onChange={(e) => setLoginUsername(e.target.value)}
                maxLength={20}
                placeholder="Nhập tên tài khoản của bạn..."
                className="w-full px-3 py-2 rounded-xl bg-stone-900/90 border border-stone-800 text-sm text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-500 transition-colors"
                autoFocus
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-stone-300 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-amber-400" /> Mật Khẩu
              </label>
              <input
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="Nhập mật khẩu..."
                className="w-full px-3 py-2 rounded-xl bg-stone-900/90 border border-stone-800 text-sm text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-500 transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-stone-950 font-bold text-sm shadow-lg shadow-amber-500/20 transition-all active:scale-95 uppercase tracking-wider disabled:opacity-50 mt-1"
            >
              <LogIn className="w-4 h-4" />
              <span>Đăng Nhập</span>
            </button>

            <div className="text-center text-xs text-stone-400 pt-1 flex items-center justify-between">
              <span>
                Chưa có tài khoản?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('register');
                    setAuthMsg(null);
                  }}
                  className="text-amber-400 hover:underline font-bold"
                >
                  Đăng ký ngay
                </button>
              </span>
              {onOpenHistory && (
                <button
                  type="button"
                  onClick={() => {
                    handleClose();
                    onOpenHistory();
                  }}
                  className="text-stone-400 hover:text-amber-300 text-xs inline-flex items-center gap-1 transition-colors"
                >
                  <History className="w-3.5 h-3.5 text-amber-400" />
                  <span>Lịch sử ván đấu</span>
                </button>
              )}
            </div>
          </form>
        )}

        {/* ======================================================== */}
        {/* TAB 2: ĐĂNG KÝ (REGISTER)                                */}
        {/* ======================================================== */}
        {activeTab === 'register' && (
          <form onSubmit={handleRegisterSubmit} className="space-y-3 animate-fade-in">
            {/* Avatar Selection for Registration */}
            <div className="flex items-center gap-3 bg-stone-900/60 p-2.5 rounded-xl border border-white/10">
              <div className="relative group">
                <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-amber-400 flex items-center justify-center bg-stone-950 text-2xl shadow-lg shadow-black/60">
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
                <div className="text-xs font-bold text-stone-200">Ảnh Đại Diện</div>
                <p className="text-[10px] text-stone-400">Chọn biểu tượng bên dưới hoặc bấm máy ảnh</p>
              </div>
            </div>

            {/* Avatar mini list */}
            <div className="grid grid-cols-4 gap-1.5">
              {DEFAULT_AVATARS.map((av) => {
                const isCur = !isCustom && selectedAvatar === av.emoji;
                return (
                  <button
                    type="button"
                    key={av.id}
                    onClick={() => handleSelectDefault(av.emoji)}
                    className={`p-1.5 rounded-lg border text-center transition-all ${
                      isCur
                        ? 'border-amber-400 bg-amber-500/20 shadow scale-105'
                        : 'border-white/10 bg-stone-900/80 hover:bg-stone-800'
                    }`}
                  >
                    <span className="text-lg">{av.emoji}</span>
                    <span className="text-[9px] block text-stone-300 truncate">{av.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-stone-300 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-amber-400" /> Tên Kỳ Thủ Mới
              </label>
              <input
                type="text"
                value={regUsername}
                onChange={(e) => setRegUsername(e.target.value)}
                maxLength={20}
                placeholder="Nhập tên kỳ thủ (tối thiểu 2 ký tự)..."
                className="w-full px-3 py-2 rounded-xl bg-stone-900/90 border border-stone-800 text-sm text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-500 transition-colors"
                autoFocus
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-stone-300 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-amber-400" /> Mật Khẩu
              </label>
              <input
                type="password"
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                placeholder="Nhập mật khẩu (tối thiểu 4 ký tự)..."
                className="w-full px-3 py-2 rounded-xl bg-stone-900/90 border border-stone-800 text-sm text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-500 transition-colors"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-stone-300 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-amber-400" /> Xác Nhận Mật Khẩu
              </label>
              <input
                type="password"
                value={regConfirmPassword}
                onChange={(e) => setRegConfirmPassword(e.target.value)}
                placeholder="Nhập lại mật khẩu..."
                className="w-full px-3 py-2 rounded-xl bg-stone-900/90 border border-stone-800 text-sm text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-500 transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-stone-950 font-bold text-sm shadow-lg shadow-amber-500/20 transition-all active:scale-95 uppercase tracking-wider disabled:opacity-50 mt-1"
            >
              <UserPlus className="w-4 h-4" />
              <span>Đăng Ký Tài Khoản</span>
            </button>

            <div className="text-center text-xs text-stone-400 pt-0.5">
              Đã có tài khoản?{' '}
              <button
                type="button"
                onClick={() => {
                  setActiveTab('login');
                  setAuthMsg(null);
                }}
                className="text-amber-400 hover:underline font-bold"
              >
                Đăng nhập
              </button>
            </div>
          </form>
        )}

        {/* ======================================================== */}
        {/* TAB 3: HỒ SƠ KỲ THỦ (PROFILE MANAGEMENT)                 */}
        {/* ======================================================== */}
        {activeTab === 'profile' && isCurrentlyLoggedIn && (
          <div className="space-y-3.5 animate-fade-in">
            {/* The SINGLE Clean Logout Bar */}
            <div className="flex items-center justify-between bg-stone-900/80 px-3.5 py-2 rounded-xl border border-red-500/25 shadow-sm">
              <div className="flex items-center gap-2 text-xs">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-stone-300 text-xs">
                  Đang đăng nhập: <strong className="text-amber-300 font-bold">{name || profile.name}</strong>
                </span>
              </div>
              <button
                type="button"
                onClick={handleLogoutClick}
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-red-950/70 hover:bg-red-900 text-red-300 hover:text-red-100 border border-red-700/70 text-xs font-bold transition-all shadow-sm active:scale-95"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Đăng Xuất</span>
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
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-stone-800 text-amber-300 border border-amber-500/40 uppercase tracking-wider">
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

            {/* DISCREET ADMIN DATABASE ACCESS BUTTON (NO SUPREME BRANDING) */}
            {effectiveAdmin && onOpenDatabase && (
              <button
                type="button"
                onClick={() => {
                  handleClose();
                  onOpenDatabase();
                }}
                className="w-full py-2 rounded-xl bg-stone-900/90 hover:bg-stone-800 text-amber-300 border border-amber-500/30 text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-sm active:scale-95"
              >
                <Database className="w-4 h-4 text-amber-400" />
                <span>Quản Lý Dữ Liệu (Database Inspector)</span>
              </button>
            )}

            {/* MATCH HISTORY ACTION BUTTON */}
            {onOpenHistory && (
              <button
                type="button"
                onClick={() => {
                  handleClose();
                  onOpenHistory();
                }}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500/15 via-amber-500/20 to-amber-500/15 hover:from-amber-500/25 hover:to-amber-500/25 text-amber-300 border border-amber-500/40 text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-sm active:scale-95"
              >
                <History className="w-4 h-4 text-amber-400" />
                <span>Lịch Sử Thi Đấu</span>
              </button>
            )}

            {/* Input Player Name - Automatically saves on blur and on close */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-stone-300">Tên Kỳ Thủ</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={() => {
                  if (isCurrentlyLoggedIn && activeTab === 'profile') {
                    const trimmed = name.trim() || profile.name || 'Kỳ thủ';
                    onSaveProfile({
                      name: trimmed,
                      avatar: selectedAvatar,
                      isCustomAvatar: isCustom,
                      isAdmin: effectiveAdmin,
                      isLoggedIn: true,
                    });
                  }
                }}
                maxLength={20}
                placeholder="Nhập tên của bạn"
                className="w-full px-3 py-2 rounded-xl bg-stone-900/90 border border-stone-800 text-sm text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-500 transition-colors"
              />
            </div>

            {/* Default Avatars Grid - Automatically saves on click */}
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

            {/* Upload Custom Image Button - Automatically saves on upload */}
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
            </div>
          </div>
        )}

        {/* Hidden File Input for Custom Avatar */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleImageUpload}
        />
      </div>
    </div>
  );
};
