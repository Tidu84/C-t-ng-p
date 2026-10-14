/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Lightweight & High-Performance Background Backdrop
 * Tối ưu hóa tối đa: Sử dụng GPU-accelerated CSS, loại bỏ hoàn toàn các vòng lặp setInterval/setTimeout
 * và các SVG chibi nặng nề để đảm bảo khung hình 60-120 FPS mượt mà tuyệt đối trên mọi thiết bị.
 */

import React, { memo } from 'react';
import { BackgroundScene3D } from '../types';

interface AnimatedBackgroundBackdropProps {
  scene: BackgroundScene3D;
  imageUrl?: string;
  sceneName?: string;
  isLiteMode?: boolean;
  isWideLayout?: boolean;
}

export const AnimatedBackgroundBackdrop: React.FC<AnimatedBackgroundBackdropProps> = memo(({
  scene,
  imageUrl,
  sceneName,
  isLiteMode = false,
}) => {
  if (!imageUrl) return null;

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0 select-none">
      {/* Ảnh nền không gian quán cờ sắc nét, tối ưu hiệu năng */}
      <div className="w-full h-full relative">
        <img
          src={imageUrl}
          alt={sceneName || 'Bối cảnh bàn cờ'}
          referrerPolicy="no-referrer"
          decoding="async"
          loading="eager"
          className="w-full h-full object-cover object-center filter brightness-[0.72] contrast-[1.06]"
        />

        {/* Lớp phủ chuyển sắc nhẹ nhàng tạo chiều sâu cho bàn cờ */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse at center, rgba(18, 18, 20, 0.45) 0%, rgba(18, 18, 20, 0.82) 100%)',
          }}
        />

        {/* Hiệu ứng ánh sáng môi trường nhẹ nhàng (chỉ bật khi không ở chế độ máy yếu) */}
        {!isLiteMode && (
          <div
            className="absolute inset-0 pointer-events-none opacity-30 mix-blend-screen"
            style={{
              background:
                scene === 'ca_phe'
                  ? 'radial-gradient(circle at 75% 20%, rgba(217, 119, 6, 0.15) 0%, transparent 60%)'
                  : scene === 'hoa_vien'
                  ? 'radial-gradient(circle at 30% 25%, rgba(16, 185, 129, 0.12) 0%, transparent 55%)'
                  : 'radial-gradient(circle at 25% 35%, rgba(254, 240, 138, 0.12) 0%, transparent 50%)',
            }}
          />
        )}
      </div>
    </div>
  );
});
