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
  {
    id: 'preset3',
    num: 3,
    name: 'Góc 3: Quán trà đá (32°)',
    shortLabel: 'Góc 3',
    badge: '🍵 Quán trà đá',
    elevation: 32,
    view: 'player',
    icon: '🍵',
    description: 'Nghiêng thấp cận cảnh, thưởng thức phong vị trà đá vỉa hè thơ mộng',
  },
];

const ACTIVE_PERSPECTIVE_KEY = 'co_up_active_perspective_id';

export interface CameraPerspectiveMenuProps {
  cameraElevation: number;
  setCameraElevation: (val: number) => void;
  cameraView: 'player' | 'spectator';
  setCameraView: (view: 'player' | 'spectator') => void;
  onTriggerResetSignal: () => void;
  bgScene?: string;
}

export const CameraPerspectiveMenu: React.FC<CameraPerspectiveMenuProps> = ({
  cameraElevation,
  setCameraElevation,
  cameraView,
  setCameraView,
  onTriggerResetSignal,
}) => {
  const handleSelectPreset = useCallback(
    (preset: PerspectivePreset) => {
      setCameraElevation(preset.elevation);
      setCameraView(preset.view);
      onTriggerResetSignal();
      try {
        localStorage.setItem(ACTIVE_PERSPECTIVE_KEY, preset.id);
      } catch {}
    },
    [setCameraElevation, setCameraView, onTriggerResetSignal]
  );

  return (
    <div className="flex items-center gap-0.5 bg-stone-900/95 p-0.5 rounded-lg border border-white/10 shadow-sm shrink-0">
      {PERSPECTIVE_PRESETS.map((preset) => {
        const isActive =
          Math.abs(preset.elevation - cameraElevation) <= 2 && cameraView === preset.view;
        return (
          <button
            key={preset.id}
            type="button"
            onClick={() => handleSelectPreset(preset)}
            className={`px-1.5 sm:px-2 py-0.5 rounded font-bold transition-all text-[9px] sm:text-[10px] flex items-center gap-1 ${
              isActive
                ? 'bg-amber-500 text-stone-950 shadow-sm scale-105'
                : 'text-stone-300 hover:text-white hover:bg-stone-800'
            }`}
            title={`${preset.name} - ${preset.description}`}
          >
            <span>{preset.icon}</span>
            <span>{preset.shortLabel}</span>
          </button>
        );
      })}
    </div>
  );
};
