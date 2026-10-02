/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { MoveCommentary } from '../types';
import { Sparkles, X, RefreshCw } from 'lucide-react';

interface MoveCommentaryBannerProps {
  commentary: MoveCommentary | null;
  isVisible: boolean;
  onClose: () => void;
  onRefreshComment?: () => void;
  isLoadingAi?: boolean;
  autoHideDuration?: number; // Mặc định hiển thị thoải mái trong 15000ms (15s)
}

export const MoveCommentaryBanner: React.FC<MoveCommentaryBannerProps> = ({
  commentary,
  isVisible,
  onClose,
  onRefreshComment,
  isLoadingAi = false,
  autoHideDuration = 15000,
}) => {
  const [isFadingOut, setIsFadingOut] = useState(false);

  // Hiển thị thoải mái trong 15 giây để người chơi vừa tính cờ vừa thư thái đọc lời bình
  useEffect(() => {
    if (!isVisible || !commentary) {
      setIsFadingOut(false);
      return;
    }

    setIsFadingOut(false);

    // Bắt đầu fade out nhẹ 400ms trước khi đóng hẳn
    const fadeTimer = setTimeout(() => {
      setIsFadingOut(true);
    }, Math.max(autoHideDuration - 400, 1000));

    const closeTimer = setTimeout(() => {
      onClose();
      setIsFadingOut(false);
    }, autoHideDuration);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(closeTimer);
    };
  }, [isVisible, commentary?.id, commentary?.comment, autoHideDuration, onClose]);

  if (!isVisible || !commentary) return null;

  return (
    <div
      id="move-commentary-banner"
      className={`w-full transition-all duration-300 ${
        isFadingOut ? 'opacity-0 scale-98 -translate-y-0.5' : 'opacity-100 animate-in fade-in slide-in-from-bottom-1'
      }`}
    >
      {/* 
        THANH NHẬN XÉT TINH TẾ - CĂN GIỮA & SÁT MÉP BÀN CỜ:
        Kích thước vừa vặn, hiển thị trọn vẹn câu chữ không bị cắt '...', không che quân cờ.
      */}
      <div className="w-full min-h-[30px] sm:min-h-[34px] py-1 px-2.5 sm:px-3.5 bg-[#141416]/95 border border-amber-500/40 rounded-lg sm:rounded-xl shadow-xl select-none backdrop-blur-md flex items-center justify-between gap-1.5 sm:gap-2">
        {/* Avatar nhân vật */}
        <div className="flex items-center shrink-0">
          <span
            onClick={onClose}
            className="text-base sm:text-lg md:text-xl cursor-pointer hover:scale-110 active:scale-95 transition-transform"
            title="Nhấn để ẩn ngay"
          >
            {commentary.spectatorAvatar}
          </span>
        </div>

        {/* Nội dung nhận xét: Hiển thị trọn vẹn câu nói, không bao giờ bị cắt chữ '...' */}
        <div className="flex-1 min-w-0 flex items-center justify-center text-center px-1 sm:px-2">
          <p
            onClick={onClose}
            className="text-[11.5px] sm:text-[13px] md:text-[14px] font-medium text-amber-50 cursor-pointer hover:text-white transition-colors leading-[1.3] text-center drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)] tracking-normal"
            title="Nhấn để ẩn ngay"
          >
            <span className="text-amber-400 font-serif select-none font-bold mr-0.5">“</span>
            <span>{commentary.comment}</span>
            <span className="text-amber-400 font-serif select-none font-bold ml-0.5">”</span>

            {/* Tag AI nếu có */}
            {isLoadingAi ? (
              <RefreshCw className="inline-block w-3 h-3 animate-spin text-amber-300 ml-1.5 align-middle" />
            ) : commentary.isAiGenerated ? (
              <span className="inline-flex items-center text-[9px] sm:text-[10px] md:text-[11px] font-extrabold text-amber-300 ml-1.5 bg-amber-500/20 px-1 py-0.2 rounded border border-amber-500/30 align-middle">
                <Sparkles className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-amber-300 mr-0.5" />
                <span>AI</span>
              </span>
            ) : null}
          </p>
        </div>

        {/* Nút thao tác nhanh bên phải: Hỏi câu khác & Đóng */}
        <div className="shrink-0 flex items-center gap-1 sm:gap-1.5 ml-1">
          {onRefreshComment && (
            <button
              type="button"
              onClick={onRefreshComment}
              disabled={isLoadingAi}
              className="text-stone-400 hover:text-amber-300 p-1 rounded-md transition-all cursor-pointer hover:bg-white/10 active:scale-90"
              title="Hỏi câu khác"
              aria-label="Hỏi câu khác"
            >
              <RefreshCw className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isLoadingAi ? 'animate-spin' : ''}`} />
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="text-stone-400 hover:text-stone-100 p-1 rounded-md transition-all cursor-pointer hover:bg-white/10 active:scale-90"
            title="Đóng nhận xét"
            aria-label="Đóng nhận xét"
          >
            <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
