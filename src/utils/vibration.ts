/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { WebHaptics } from 'web-haptics';

export type VibrationType = 'covered' | 'chariot' | 'cannon' | 'high_score' | 'tap';

let isVibrationEnabled = true;
try {
  const stored = localStorage.getItem('co_up_vibration_enabled');
  if (stored !== null) isVibrationEnabled = stored === 'true';
} catch (_) {}

export const setVibrationEnabled = (enabled: boolean) => {
  isVibrationEnabled = enabled;
  try {
    localStorage.setItem('co_up_vibration_enabled', enabled ? 'true' : 'false');
  } catch (_) {}
};

export const getVibrationEnabled = () => isVibrationEnabled;

// Singleton WebHaptics
let webHapticsInstance: WebHaptics | null = null;
const getWebHaptics = () => {
  if (typeof window === 'undefined') return null;
  if (!webHapticsInstance) {
    try {
      webHapticsInstance = new WebHaptics();
    } catch (_) {}
  }
  return webHapticsInstance;
};

import { getSharedAudioContext } from './sharedAudioContext';

export const initIOSHaptic = () => {
  getWebHaptics();
};

const playSubBassThump = (freq: number, durationMs: number, pulses = 1) => {
  try {
    const audioCtx = getSharedAudioContext();
    if (!audioCtx) return;
    if (audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }

    const now = audioCtx.currentTime;
    for (let i = 0; i < pulses; i++) {
      const start = now + (i * (durationMs + 60)) / 1000;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);
      osc.frequency.exponentialRampToValueAtTime(28, start + durationMs / 1000);

      gain.gain.setValueAtTime(0.001, start);
      gain.gain.linearRampToValueAtTime(0.95, start + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.001, start + durationMs / 1000);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start(start);
      osc.stop(start + durationMs / 1000 + 0.02);
    }
  } catch (_) {}
};

/**
 * Kích hoạt RUNG KÉP (Rung tay phần cứng + Rung loa trầm song hành):
 * - 'covered': 1 nhịp (Ăn / Bị ăn quân úp)
 * - 'chariot': 2 nhịp (Ăn / Bị ăn quân Xe)
 * - 'high_score': 3 nhịp (Bắt tướng / Điểm cao / Thắng)
 * - 'tap': 1 nhịp nhẹ khi chọn quân
 */
export const triggerDeviceVibration = (type: VibrationType, options?: { skipNavigatorVibrate?: boolean }) => {
  if (!isVibrationEnabled) return;

  // 1. Rung tay phần cứng (Hardware Motor / Taptic Engine)
  if (Capacitor.isNativePlatform()) {
    try {
      if (type === 'cannon') {
        // Pháo nổ cực mạnh: giật nòng dằn mạnh -> chấn động rền lan tỏa
        Haptics.impact({ style: ImpactStyle.Heavy }).catch(() => {});
        setTimeout(() => Haptics.impact({ style: ImpactStyle.Heavy }).catch(() => {}), 100);
        setTimeout(() => Haptics.impact({ style: ImpactStyle.Heavy }).catch(() => {}), 240);
        setTimeout(() => Haptics.impact({ style: ImpactStyle.Medium }).catch(() => {}), 450);
      } else if (type === 'covered') {
        Haptics.impact({ style: ImpactStyle.Heavy }).catch(() => {});
      } else if (type === 'chariot') {
        Haptics.impact({ style: ImpactStyle.Heavy }).catch(() => {});
        setTimeout(() => Haptics.impact({ style: ImpactStyle.Heavy }).catch(() => {}), 140);
      } else if (type === 'high_score') {
        Haptics.notification({ type: NotificationType.Success }).catch(() => {});
        setTimeout(() => Haptics.impact({ style: ImpactStyle.Heavy }).catch(() => {}), 150);
        setTimeout(() => Haptics.impact({ style: ImpactStyle.Heavy }).catch(() => {}), 300);
      } else {
        Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
      }
    } catch (_) {}
  } else {
    // Web: Ưu tiên navigator.vibrate trực tiếp trên Android / Mobile
    const hasNavigatorVibrate =
      !options?.skipNavigatorVibrate &&
      typeof navigator !== 'undefined' &&
      'vibrate' in navigator &&
      typeof navigator.vibrate === 'function';

    if (hasNavigatorVibrate) {
      try {
        if (type === 'cannon') {
          // Pháo nổ rung chấn uy lực: giật nòng 220ms -> nghỉ 60ms -> nổ tung 380ms -> nghỉ 70ms -> rền 250ms
          navigator.vibrate([220, 60, 380, 70, 250]);

          // Backup pulse dự phòng cho các dòng máy Android giới hạn pattern rung phức tạp
          setTimeout(() => {
            try {
              if (navigator.vibrate) {
                navigator.vibrate([350, 60, 240]);
              }
            } catch (_) {}
          }, 320);
        } else if (type === 'covered') {
          // 1 nhịp khi bắt quân úp
          navigator.vibrate(220);
        } else if (type === 'chariot') {
          // 2 nhịp khi bắt quân Xe: 180ms rung, 90ms nghỉ, 200ms rung
          navigator.vibrate([180, 90, 200]);
        } else if (type === 'high_score') {
          navigator.vibrate([200, 80, 200, 80, 250]);
        } else {
          navigator.vibrate(25);
        }
      } catch (_) {}
    } else {
      // iOS Safari (Không có navigator.vibrate, sử dụng WebHaptics Taptic Engine)
      const haptics = getWebHaptics();
      if (haptics) {
        try {
          if (type === 'cannon') {
            haptics.trigger('heavy').catch(() => {});
            setTimeout(() => haptics.trigger('heavy').catch(() => {}), 120);
            setTimeout(() => haptics.trigger('heavy').catch(() => {}), 300);
            setTimeout(() => haptics.trigger('medium').catch(() => {}), 520);
          } else {
            const preset =
              type === 'covered'
                ? 'heavy'
                : type === 'chariot'
                ? 'warning'
                : type === 'high_score'
                ? 'error'
                : 'selection';
            haptics.trigger(preset).catch(() => {});
          }
        } catch (_) {}
      }
    }
  }

  // 2. Rung loa (Acoustic Sub-bass Thump song hành)
  if (type === 'cannon') {
    playSubBassThump(38, 380, 2);
  } else if (type === 'covered') {
    playSubBassThump(52, 140, 1);
  } else if (type === 'chariot') {
    playSubBassThump(48, 120, 2);
  } else if (type === 'high_score') {
    playSubBassThump(45, 130, 3);
  } else {
    playSubBassThump(72, 40, 1);
  }
};
