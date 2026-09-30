/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type VibrationType = 'covered' | 'chariot' | 'high_score' | 'tap';

/**
 * Điều khiển hiệu ứng rung phản hồi (Haptic Vibration) trên thiết bị:
 * - 'covered': Rung 1 cái khi bị ăn / ăn quân úp (180ms)
 * - 'chariot': Rung 2 cái khi bị ăn / ăn quân Xe (140ms - 90ms - 160ms)
 * - 'high_score': Rung 3 cái khi điểm cao / bắt tướng / chiến thắng (120ms - 80ms - 150ms - 80ms - 220ms)
 * - 'tap': Rung nhẹ khi chạm chọn quân cờ (15ms)
 */
export const triggerDeviceVibration = (type: VibrationType) => {
  if (typeof window === 'undefined' || !('vibrate' in navigator)) return;
  try {
    switch (type) {
      case 'covered':
        // Rung 1 cái khi ăn quân úp
        navigator.vibrate(180);
        break;
      case 'chariot':
        // Rung 2 cái khi ăn quân Xe
        navigator.vibrate([140, 90, 160]);
        break;
      case 'high_score':
        // Rung 3 cái khi điểm cao / bắt tướng / chiến thắng
        navigator.vibrate([120, 80, 150, 80, 220]);
        break;
      case 'tap':
        navigator.vibrate(15);
        break;
    }
  } catch (_) {}
};
