/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { WebHaptics } from 'web-haptics';

export type VibrationType = 'covered' | 'chariot' | 'high_score' | 'tap';

// Global toggle state stored in localStorage
let isVibrationEnabled = true;
try {
  const stored = localStorage.getItem('co_up_vibration_enabled');
  if (stored !== null) {
    isVibrationEnabled = stored === 'true';
  }
} catch (_) {}

export const setVibrationEnabled = (enabled: boolean) => {
  isVibrationEnabled = enabled;
  try {
    localStorage.setItem('co_up_vibration_enabled', enabled ? 'true' : 'false');
  } catch (_) {}
};

export const getVibrationEnabled = () => isVibrationEnabled;

/**
 * Singleton WebHaptics instance (tự động kích hoạt Switch Taptic Hack trên iOS Safari
 * và điều khiển API Vibration trên Android)
 */
let webHapticsInstance: WebHaptics | null = null;
const getWebHaptics = (): WebHaptics | null => {
  if (typeof window === 'undefined') return null;
  if (!webHapticsInstance) {
    try {
      webHapticsInstance = new WebHaptics();
    } catch (_) {}
  }
  return webHapticsInstance;
};

export const initIOSHaptic = () => {
  getWebHaptics();
};

/**
 * ----------------------------------------------------------------------------------
 * PHÁT XUNG ÂM TRẦM (RUNG LOA - Acoustic Sub-bass Thump ~45Hz-60Hz)
 * Đánh trực tiếp vào màng loa ngoài của điện thoại để tạo lực dằn xúc giác,
 * kết hợp cùng bộ rung cơ học (RUNG TAY) tạo trải nghiệm song hành cực kỳ đã tay!
 * ----------------------------------------------------------------------------------
 */
let sharedAudioCtx: AudioContext | null = null;
export const playAcousticHapticThump = (frequency = 52, durationMs = 140, pulses = 1) => {
  try {
    const AudioContextClass =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    if (!sharedAudioCtx || sharedAudioCtx.state === 'suspended') {
      sharedAudioCtx = new AudioContextClass();
    }
    if (sharedAudioCtx.state === 'suspended') {
      sharedAudioCtx.resume().catch(() => {});
    }

    const ctx = sharedAudioCtx;
    for (let i = 0; i < pulses; i++) {
      const startTime = ctx.currentTime + (i * (durationMs + 70)) / 1000;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(frequency, startTime);
      osc.frequency.exponentialRampToValueAtTime(28, startTime + durationMs / 1000);

      // Attack nhanh, dốc mạnh để màng loa đập cơ học rõ rệt
      gain.gain.setValueAtTime(0.001, startTime);
      gain.gain.linearRampToValueAtTime(0.95, startTime + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + durationMs / 1000);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + durationMs / 1000 + 0.03);
    }
  } catch (_) {}
};

/**
 * ----------------------------------------------------------------------------------
 * BỘ ĐIỀU KHIỂN RUNG ĐA NỀN TẢNG (Android Web, iOS Safari, Native App)
 * ----------------------------------------------------------------------------------
 */
export const checkVibrationSupport = (): {
  isNative: boolean;
  hasWebVibrate: boolean;
  isIOSWeb: boolean;
  isAndroid: boolean;
  supportLevel: 'native_full' | 'web_dual' | 'ios_dual';
  message: string;
} => {
  if (typeof window === 'undefined') {
    return {
      isNative: false,
      hasWebVibrate: false,
      isIOSWeb: false,
      isAndroid: false,
      supportLevel: 'ios_dual',
      message: 'Không khả dụng ở chế độ SSR',
    };
  }

  const isNative = Capacitor.isNativePlatform();
  const hasWebVibrate = 'vibrate' in navigator && typeof navigator.vibrate === 'function';
  const ua = navigator.userAgent || '';
  const isIOSWeb = !isNative && /iPad|iPhone|iPod/.test(ua) && !(window as unknown as { MSStream: unknown }).MSStream;
  const isAndroid = /Android/i.test(ua);

  if (isNative) {
    return {
      isNative: true,
      hasWebVibrate,
      isIOSWeb: false,
      isAndroid,
      supportLevel: 'native_full',
      message: 'App Native (Capacitor) - Rung tay Taptic Engine & Rung loa trầm cùng lúc 100%',
    };
  }

  if (isAndroid) {
    return {
      isNative: false,
      hasWebVibrate,
      isIOSWeb: false,
      isAndroid: true,
      supportLevel: 'web_dual',
      message: 'Android Web: Kích hoạt song song CẢ RUNG TAY (motor 280ms) VÀ RUNG LOA (âm trầm màng loa).',
    };
  }

  if (isIOSWeb) {
    return {
      isNative: false,
      hasWebVibrate: false,
      isIOSWeb: true,
      isAndroid: false,
      supportLevel: 'ios_dual',
      message: 'iPhone Safari Web: Kích hoạt song song Taptic Engine (qua WebHaptics switch) VÀ RUNG LOA.',
    };
  }

  return {
    isNative: false,
    hasWebVibrate,
    isIOSWeb: false,
    isAndroid,
    supportLevel: 'web_dual',
    message: 'Thiết bị Web đã bật chế độ rung kép: Rung tay + Rung loa.',
  };
};

/**
 * Kích hoạt RUNG KÉP: CẢ RUNG TAY (Hardware Motor / Taptic Engine) LẪN RUNG LOA (Acoustic Thump)
 * - 'covered': 1 nhịp dứt khoát (Ăn / Bị ăn quân úp)
 * - 'chariot': 2 nhịp giật mạnh (Ăn / Bị ăn quân Xe)
 * - 'high_score': 3 nhịp dồn dập (Bắt tướng / Điểm cao / Thắng trận)
 * - 'tap': 1 nhịp nhẹ khi chọn cờ
 */
export const triggerDeviceVibration = (type: VibrationType) => {
  if (!isVibrationEnabled) return;

  const isNative = Capacitor.isNativePlatform();
  const webHaptics = getWebHaptics();

  // =========================================================================
  // 1. RUNG TAY PHẦN CỨNG (Hardware Motor / Taptic Engine)
  // =========================================================================

  // 1A. Nếu chạy qua App Native (Capacitor iOS IPA / Android APK)
  if (isNative) {
    try {
      switch (type) {
        case 'covered':
          Haptics.impact({ style: ImpactStyle.Heavy }).catch(() => {});
          break;
        case 'chariot':
          Haptics.impact({ style: ImpactStyle.Heavy }).catch(() => {});
          setTimeout(() => {
            Haptics.impact({ style: ImpactStyle.Heavy }).catch(() => {});
          }, 140);
          break;
        case 'high_score':
          Haptics.notification({ type: NotificationType.Success }).catch(() => {});
          setTimeout(() => {
            Haptics.impact({ style: ImpactStyle.Heavy }).catch(() => {});
          }, 150);
          setTimeout(() => {
            Haptics.impact({ style: ImpactStyle.Heavy }).catch(() => {});
          }, 300);
          break;
        case 'tap':
          Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
          break;
      }
    } catch (_) {}
  } else {
    // 1B. Nếu chạy trên Web (Vercel mobile web):
    // Dùng WebHaptics (kích hoạt WebKit Switch trên iOS và Web API trên Android)
    if (webHaptics) {
      try {
        switch (type) {
          case 'covered':
            webHaptics.trigger('heavy').catch(() => {});
            break;
          case 'chariot':
            webHaptics.trigger('warning').catch(() => {});
            break;
          case 'high_score':
            webHaptics.trigger('error').catch(() => {});
            break;
          case 'tap':
            webHaptics.trigger('selection').catch(() => {});
            break;
        }
      } catch (_) {}
    }

    // Bổ sung trực tiếp navigator.vibrate cho Android (với xung số nguyên mạnh mẽ)
    if (typeof window !== 'undefined' && 'vibrate' in navigator && typeof navigator.vibrate === 'function') {
      try {
        switch (type) {
          case 'covered':
            // Rung tay 1 cái mạnh 280ms
            navigator.vibrate(280);
            break;
          case 'chariot':
            // Rung tay 2 cái dứt khoát
            navigator.vibrate(220);
            setTimeout(() => {
              try {
                navigator.vibrate(220);
              } catch (_) {}
            }, 320);
            break;
          case 'high_score':
            // Rung tay 3 cái dồn dập
            navigator.vibrate(220);
            setTimeout(() => {
              try {
                navigator.vibrate(220);
              } catch (_) {}
            }, 310);
            setTimeout(() => {
              try {
                navigator.vibrate(300);
              } catch (_) {}
            }, 620);
            break;
          case 'tap':
            navigator.vibrate(30);
            break;
        }
      } catch (_) {}
    }
  }

  // =========================================================================
  // 2. RUNG LOA (Acoustic Sub-bass Thump) - Phát song song cho mọi thiết bị!
  // =========================================================================
  switch (type) {
    case 'covered':
      // 1 tiếng thump uy lực dằn màng loa
      playAcousticHapticThump(52, 140, 1);
      break;
    case 'chariot':
      // 2 tiếng thump liên tiếp
      playAcousticHapticThump(48, 120, 2);
      break;
    case 'high_score':
      // 3 tiếng thump dồn dập rền vang
      playAcousticHapticThump(45, 130, 3);
      break;
    case 'tap':
      playAcousticHapticThump(72, 45, 1);
      break;
  }
};
