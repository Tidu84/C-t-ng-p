/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Cánh tay thật đặt trên bàn ngoài bàn cờ (Realistic Hand Prop on Table Margin).
 * Đặt một cánh tay thật tự nhiên ở mép bàn bên ngoài bàn cờ (không che bất kỳ ô cờ nào).
 * Người chơi có thể chủ động ẩn/hiện bất cứ lúc nào với 1 cú nhấp.
 */

import React, { useState } from 'react';
import imgSingleArm from '../assets/images/single_arm_realistic.png';

interface OpponentArmsPropProps {
  isThinking?: boolean;
  is3D?: boolean;
  className?: string;
}

const STORAGE_KEY = 'co_up_show_single_arm';

export const OpponentArmsProp: React.FC<OpponentArmsPropProps> = React.memo(({
  isThinking = false,
  is3D = true,
  className = '',
}) => {
  const [isVisible, setIsVisible] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });

  const toggleVisibility = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsVisible((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, String(next));
      } catch {}
      return next;
    });
  };

  if (!isVisible) {
    return (
      <div className="absolute bottom-2 left-2 z-20 hidden md:block">
        <button
          type="button"
          onClick={toggleVisibility}
          className="px-2 py-0.5 rounded text-[10px] bg-stone-900/80 hover:bg-stone-800 text-stone-300 border border-stone-700/60 shadow transition-all flex items-center gap-1 backdrop-blur-sm"
          title="Hiện cánh tay đặt trên bàn bên cạnh bàn cờ"
        >
          <span>✋ Đặt tay lên bàn</span>
        </button>
      </div>
    );
  }

  return (
    // Đặt hoàn toàn ở mép ngoài bàn cờ bên trái, không đè lên bất kỳ ô cờ hay quân cờ nào
    <div
      className={`absolute bottom-3 sm:bottom-6 md:bottom-8 left-0 sm:left-1 pointer-events-none z-20 select-none hidden md:block transition-all duration-300 ease-out ${className}`}
      style={{
        width: 'clamp(110px, 14vw, 175px)',
      }}
    >
      <div className="relative w-full group pointer-events-auto">
        {/* Nút ẩn nhỏ tinh tế khi hover vào cánh tay */}
        <button
          type="button"
          onClick={toggleVisibility}
          className="absolute -top-2 left-1 z-30 w-4 h-4 rounded-full bg-stone-900/90 hover:bg-stone-800 text-stone-400 hover:text-white border border-stone-700 text-[9px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow"
          title="Ẩn cánh tay khỏi bàn"
        >
          ✕
        </button>

        {/* Cánh tay thật đặt thảnh thơi trên mặt bàn gỗ bên ngoài bàn cờ */}
        <div
          className={`w-full transition-transform duration-500 pointer-events-none ${
            isThinking ? 'scale-[1.02] -translate-y-0.5' : 'scale-100'
          }`}
        >
          <img
            src={imgSingleArm}
            alt="Cánh tay đặt trên bàn quán nước"
            className="w-full h-auto object-contain"
            style={{
              filter: 'drop-shadow(0 10px 18px rgba(0, 0, 0, 0.75)) contrast(1.05) brightness(0.96)',
            }}
          />
        </div>
      </div>
    </div>
  );
});
