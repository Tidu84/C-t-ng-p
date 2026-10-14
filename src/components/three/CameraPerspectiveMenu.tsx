/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * CameraPerspectiveMenu: Bộ 3 nút chọn Góc nhìn 3D chuẩn xác, tức thì cho Bàn cờ Cờ Úp
 * - Góc 1: Trực diện (72°) - Từ trên cao nhìn xuống bao quát toàn bàn cờ
 * - Góc 2: Chuẩn kỳ thủ (52°) - Ngồi trước bàn cờ gỗ tự nhiên, ngắm rõ quân cờ
 * - Góc 3: Quán trà đá / Toàn cảnh (32°) - Nghiêng thấp cận cảnh, hòa vào không gian quán
 */

import React, { useCallback } from 'react';

export interface PerspectivePreset {
  id: 'preset1' | 'preset2' | 'preset3';
  num: 1 | 2 | 3;
  name: string;
  shortLabel: string;
  badge: string;
  elevation: number;
  view: 'player' | 'spectator';
  icon: string;
  description: string;
}

export const ACTIVE_PERSPECTIVE_KEY = 'co_up_active_perspective_id';
export const CAMERA_VIEW_KEY = 'co_up_3d_camera';

export const PERSPECTIVE_PRESETS: PerspectivePreset[] = [
  {
    id: 'preset1',
    num: 1,
    name: 'Góc 1: Trực diện (72°)',
    shortLabel: 'Góc 1',
    badge: '📐 Trực diện',
    elevation: 72,
    view: 'player',
    icon: '📐',
    description: 'Từ trên cao nhìn xuống bao quát 9x10 ô cờ, chuẩn tính toán nước đi',
  },
  {
    id: 'preset2',
    num: 2,
    name: 'Góc 2: Chuẩn kỳ thủ (52°)',
    shortLabel: 'Góc 2',
    badge: '👑 Kỳ thủ',
    elevation: 52,
    view: 'player',
    icon: '👑',
    description: 'Ngồi trực diện bàn cờ gỗ tự nhiên, nhìn rõ chiều cao và độ nổi quân cờ',
  },
];

export interface CameraPerspectiveMenuProps {
  cameraElevation: number;
  setCameraElevation: (val: number) => void;
  cameraView: 'player' | 'spectator';
  setCameraView: (view: 'player' | 'spectator') => void;
  onTriggerResetSignal: () => void;
  bgScene?: string;
  vertical?: boolean;
  activePresetId?: 'preset1' | 'preset2' | 'custom';
  onSelectPreset?: (id: 'preset1' | 'preset2' | 'custom') => void;
  hasUnsavedPose?: boolean;
  hasSavedPose?: boolean;
  onOpenCustomPose?: () => void;
  onSaveCurrentPose?: () => void;
}

export const CameraPerspectiveMenu: React.FC<CameraPerspectiveMenuProps> = ({
  cameraElevation,
  setCameraElevation,
  cameraView,
  setCameraView,
  onTriggerResetSignal,
  vertical = false,
  activePresetId,
  onSelectPreset,
  hasUnsavedPose = false,
  hasSavedPose = false,
  onOpenCustomPose,
  onSaveCurrentPose,
}) => {
  const handleSelectPreset = useCallback(
    (preset: PerspectivePreset) => {
      setCameraElevation(preset.elevation);
      setCameraView(preset.view);
      onTriggerResetSignal();
      onSelectPreset?.(preset.id);
      try {
        localStorage.setItem(ACTIVE_PERSPECTIVE_KEY, preset.id);
        localStorage.setItem(CAMERA_VIEW_KEY, preset.view);
      } catch {}
    },
    [setCameraElevation, setCameraView, onTriggerResetSignal, onSelectPreset]
  );

  return (
    <div
      className={
        vertical
          ? 'flex flex-col gap-0.5 w-full bg-stone-900/90 p-0.5 rounded border border-white/10 shadow-sm shrink-0'
          : 'flex items-center gap-0.5 bg-stone-900/95 p-0.5 rounded-lg border border-white/10 shadow-sm shrink-0'
      }
    >
      {PERSPECTIVE_PRESETS.map((preset) => {
        const isActive =
          activePresetId === preset.id ||
          (!activePresetId &&
            Math.abs(preset.elevation - cameraElevation) <= 2 &&
            cameraView === preset.view);
        return (
          <button
            key={preset.id}
            type="button"
            onClick={() => handleSelectPreset(preset)}
            className={
              vertical
                ? `px-1.5 py-0.5 rounded font-bold transition-all text-[9px] flex items-center gap-1 w-full justify-start ${
                    isActive
                      ? 'bg-amber-500 text-stone-950 shadow-sm'
                      : 'text-stone-300 hover:text-white hover:bg-stone-800'
                  }`
                : `px-1.5 sm:px-2 py-0.5 rounded font-bold transition-all text-[9px] sm:text-[10px] flex items-center gap-1 ${
                    isActive
                      ? 'bg-amber-500 text-stone-950 shadow-sm scale-105'
                      : 'text-stone-300 hover:text-white hover:bg-stone-800'
                  }`
            }
            title={`${preset.name} - ${preset.description}`}
          >
            <span className="text-[10px] shrink-0">{preset.icon}</span>
            <span className="truncate">{preset.shortLabel}</span>
          </button>
        );
      })}

      {/* Nút "Góc tôi" để MỞ góc nhìn bạn đã lưu */}
      <button
        type="button"
        onClick={onOpenCustomPose}
        className={
          vertical
            ? `px-1.5 py-0.5 rounded font-bold transition-all text-[9px] flex items-center gap-1 w-full justify-start ${
                activePresetId === 'custom'
                  ? 'bg-amber-500 text-stone-950 shadow-sm'
                  : hasSavedPose
                  ? 'text-amber-300 hover:text-white hover:bg-stone-800'
                  : 'text-stone-500 hover:text-stone-400 opacity-60'
              }`
            : `px-1.5 sm:px-2 py-0.5 rounded font-bold transition-all text-[9px] sm:text-[10px] flex items-center gap-1 ${
                activePresetId === 'custom'
                  ? 'bg-amber-500 text-stone-950 shadow-sm scale-105'
                  : hasSavedPose
                  ? 'text-amber-300 hover:text-white hover:bg-stone-800'
                  : 'text-stone-500 hover:text-stone-400 opacity-60'
              }`
        }
        title={
          hasSavedPose
            ? 'Mở góc nhìn tùy chỉnh bạn đã lưu'
            : 'Chưa có góc lưu. Bạn hãy chỉnh góc ưng ý rồi bấm "Lưu góc"'
        }
      >
        <span className="text-[10px] shrink-0">⭐</span>
        <span className="truncate font-semibold">Góc tôi</span>
      </button>

      {/* Nút "Lưu góc" để LƯU LẠI đúng góc nhìn đang chỉnh */}
      <button
        type="button"
        onClick={onSaveCurrentPose}
        className={
          vertical
            ? `px-1.5 py-0.5 rounded font-bold transition-all text-[9px] flex items-center gap-1 w-full justify-start ${
                hasUnsavedPose
                  ? 'bg-amber-600 text-stone-950 ring-1 ring-amber-400 animate-pulse shadow-md font-extrabold'
                  : 'text-stone-300 hover:text-amber-300 hover:bg-stone-800'
              }`
            : `px-1.5 sm:px-2 py-0.5 rounded font-bold transition-all text-[9px] sm:text-[10px] flex items-center gap-1 ${
                hasUnsavedPose
                  ? 'bg-amber-600 text-stone-950 ring-1 ring-amber-400 animate-pulse shadow-md font-extrabold'
                  : 'text-stone-300 hover:text-amber-300 hover:bg-stone-800'
              }`
        }
        title="Lưu lại đúng góc nhìn bạn đang chỉnh hiện tại"
      >
        <span className="text-[10px] shrink-0">💾</span>
        <span className="truncate">Lưu góc</span>
      </button>
    </div>
  );
};
