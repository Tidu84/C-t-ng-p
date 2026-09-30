/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

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
 * ----------------------------------------------------------------------------------
 * iOS SAFARI 17.4+ & iOS 18+ TAPTIC ENGINE HACK (qua <input type="checkbox" switch>)
 * Apple Safari trên iOS không hỗ trợ navigator.vibrate, nhưng từ iOS 17.4 trở lên,
 * WebKit hỗ trợ thẻ <input type="checkbox" switch>. Khi thẻ <label> liên kết với nó
 * được click, WebKit kích hoạt trực tiếp bộ rung phần cứng Taptic Engine của iPhone!
 * ----------------------------------------------------------------------------------
 */
let iosHapticLabel: HTMLLabelElement | null = null;
let isIOSHapticInitialized = false;

export const initIOSHaptic = () => {
  if (typeof document === 'undefined' || isIOSHapticInitialized) return;
  try {
    let label = document.getElementById('ios-haptic-trigger-label') as HTMLLabelElement | null;
    if (!label) {
      const container = document.createElement('div');
      container.setAttribute('aria-hidden', 'true');
      container.style.cssText =
        'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;opacity:0.001;pointer-events:none;z-index:-9999;overflow:hidden;';

      const input = document.createElement('input');
      input.type = 'checkbox';
      input.setAttribute('switch', '');
      input.id = 'ios-haptic-switch-input';
      input.style.cssText = 'position:absolute;opacity:0.001;';

      label = document.createElement('label');
      label.htmlFor = 'ios-haptic-switch-input';
      label.id = 'ios-haptic-trigger-label';
      label.textContent = 'haptic';
      label.style.cssText = 'position:absolute;display:block;width:1px;height:1px;';

      container.appendChild(input);
      container.appendChild(label);
      document.body.appendChild(container);
    }
    iosHapticLabel = label;
    isIOSHapticInitialized = true;
  } catch (_) {}
};

const triggerIOSSwitchHaptic = (count = 1) => {
  if (typeof document === 'undefined') return;
  initIOSHaptic();
  const label = iosHapticLabel || (document.getElementById('ios-haptic-trigger-label') as HTMLLabelElement | null);
  if (!label) return;

  for (let i = 0; i < count; i++) {
    setTimeout(() => {
      try {
        label.click();
      } catch (_) {}
    }, i * 160);
  }
};

/**
 * ----------------------------------------------------------------------------------
 * PHÁT XUNG ÂM TRẦM SIÊU THẤP (45Hz - 60Hz Acoustic Sub-bass Thump)
 * Dành cho mọi máy iPhone / iPad trên Web Safari: Tạo xung âm thanh cực trầm
 * làm rung màng loa ngoài của máy, tạo cảm giác chấn động cơ học trong lòng bàn tay.
 * ----------------------------------------------------------------------------------
 */
let sharedAudioCtx: AudioContext | null = null;
const playAcousticHapticThump = (frequency = 50, durationMs = 140, pulses = 1) => {
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

      gain.gain.setValueAtTime(0.001, startTime);
      gain.gain.linearRampToValueAtTime(1.0, startTime + 0.015);
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
  supportLevel: 'native_full' | 'web_supported' | 'ios_safari_enhanced';
  message: string;
} => {
  if (typeof window === 'undefined') {
    return {
      isNative: false,
      hasWebVibrate: false,
      isIOSWeb: false,
      isAndroid: false,
      supportLevel: 'ios_safari_enhanced',
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
      message: 'App Native (Capacitor) - Bộ rung Taptic Engine / Motor hoạt động 100%',
    };
  }

  if (hasWebVibrate) {
    return {
      isNative: false,
      hasWebVibrate: true,
      isIOSWeb: false,
      isAndroid,
      supportLevel: 'web_supported',
      message: isAndroid
        ? 'Android Web: Đã tối ưu xung rung 280ms cho Chrome. (Lưu ý: Bật "Rung khi chạm" trong Cài đặt máy)'
        : 'Trình duyệt Web hỗ trợ bộ rung Vibration API.',
    };
  }

  if (isIOSWeb) {
    return {
      isNative: false,
      hasWebVibrate: false,
      isIOSWeb: true,
      isAndroid: false,
      supportLevel: 'ios_safari_enhanced',
      message:
        'iPhone Safari Web: Đã bật chế độ Taptic Hack (iOS 17.4+) và xung âm trầm màng loa ngoài.',
    };
  }

  return {
    isNative: false,
    hasWebVibrate: false,
    isIOSWeb: false,
    isAndroid,
    supportLevel: 'ios_safari_enhanced',
    message: 'Thiết bị Web đã kích hoạt chế độ hỗ trợ âm trầm rung thay thế.',
  };
};

/**
 * Kích hoạt rung cho thiết bị:
 * - 'covered': Rung 1 nhịp khi bị ăn / ăn quân úp
 * - 'chariot': Rung 2 nhịp khi bị ăn / ăn quân xe
 * - 'high_score': Rung 3 nhịp khi điểm cao / bắt tướng / thắng cờ
 * - 'tap': Rung nhẹ 1 cái khi chạm chọn quân cờ
 */
export const triggerDeviceVibration = (type: VibrationType) => {
  if (!isVibrationEnabled) return;

  const isNative = Capacitor.isNativePlatform();

  // 1. CAPACITOR NATIVE (Khi chạy trong file IPA / APK)
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
      return;
    } catch (_) {}
  }

  // 2. ANDROID WEB (Chrome / Samsung Internet / Cốc Cốc trên Android)
  if (typeof window !== 'undefined' && 'vibrate' in navigator && typeof navigator.vibrate === 'function') {
    try {
      // Lưu ý: Nhiều hãng Android (Samsung OneUI, Xiaomi MIUI, Oppo) yêu cầu xung rung
      // tối thiểu từ 200ms - 280ms thì cục rung cơ học mới kịp thắng quán tính để quay.
      // Dùng số nguyên trực tiếp kèm setTimeout để tránh lỗi thiết bị không nhận mảng array.
      switch (type) {
        case 'covered':
          // Rung 1 nhịp 280ms
          navigator.vibrate(280);
          break;

        case 'chariot':
          // Rung 2 nhịp rõ ràng (220ms - nghỉ 100ms - 220ms)
          navigator.vibrate(220);
          setTimeout(() => {
            try {
              navigator.vibrate(220);
            } catch (_) {}
          }, 320);
          break;

        case 'high_score':
          // Rung 3 nhịp dồn dập (220ms - nghỉ 90ms - 220ms - nghỉ 90ms - 300ms)
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
          navigator.vibrate(35);
          break;
      }
    } catch (_) {}
  }

  // 3. IPHONE SAFARI / iOS WEB
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent || '' : '';
  const isIOS = /iPad|iPhone|iPod/.test(ua);
  if (isIOS) {
    // 3a. Kích hoạt iOS 17.4+ Switch Taptic Hack
    switch (type) {
      case 'covered':
        triggerIOSSwitchHaptic(1);
        playAcousticHapticThump(52, 140, 1);
        break;
      case 'chariot':
        triggerIOSSwitchHaptic(2);
        playAcousticHapticThump(48, 120, 2);
        break;
      case 'high_score':
        triggerIOSSwitchHaptic(3);
        playAcousticHapticThump(45, 130, 3);
        break;
      case 'tap':
        triggerIOSSwitchHaptic(1);
        playAcousticHapticThump(70, 45, 1);
        break;
    }
  }
};
