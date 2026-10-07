/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Procedural Environmental Ambience Engine (Hệ thống âm thanh môi trường nhập vai)
 * Mô phỏng chân thực và sống động:
 * 1. 'vỉa hè' / 'tra_da': Tiếng đường phố xào xạc, tiếng lá xào xạc, tiếng xe cộ xa xa, tiếng đá viên lách cách trong cốc trà đá.
 * 2. 'ca_phe' / 'hoi_quan': Tiếng thìa gõ tách cà phê sứ lách cách, tiếng lầm rầm trò chuyện bàn tán cờ, giọt phin cà phê tí tách.
 * 3. 'hoa_vien': Tiếng suối nước róc rách, tiếng lá tre trúc reo trong gió, tiếng chuông gió thanh tịnh.
 * 4. 'dau_truong': Tiếng xì xào hội trường cờ đông đúc, tiếng đồng hồ thi đấu, tiếng vỗ tay tán thưởng.
 * Hoạt động 100% bằng Web Audio API ngoại tuyến, dung lượng siêu nhẹ, mượt mà và không giật lag.
 */

import { BackgroundScene3D } from '../types';
import { getSharedAudioContext, unlockAudioContext } from './sharedAudioContext';

export interface AmbienceConfig {
  enabled: boolean;
  volume: number; // 0 to 1
  scene: BackgroundScene3D;
}

class AmbienceEngine {
  private ctx: AudioContext | null = null;
  private isRunning: boolean = false;
  private enabled: boolean = true;
  private volume: number = 0.55; // Mặc định 55% theo yêu cầu người dùng
  private currentScene: BackgroundScene3D = 'tra_da';

  // Audio Nodes
  private masterGain: GainNode | null = null;
  private continuousGain: GainNode | null = null;
  private noiseSource: AudioBufferSourceNode | null = null;
  private noiseFilter: BiquadFilterNode | null = null;
  private lfoOsc: OscillatorNode | null = null;

  // Timers
  private eventIntervalTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.loadSettings();
  }

  private loadSettings() {
    if (typeof window === 'undefined') return;
    try {
      const savedEnabled = localStorage.getItem('co_up_ambience_enabled');
      if (savedEnabled !== null) {
        this.enabled = savedEnabled === 'true';
      } else {
        this.enabled = true; // Mặc định tự động bật
      }
      const savedVol = localStorage.getItem('co_up_ambience_volume');
      if (savedVol !== null) {
        const parsed = parseFloat(savedVol);
        this.volume = isNaN(parsed) || parsed <= 0 ? 0.55 : Math.max(0.1, Math.min(1, parsed));
      } else {
        this.volume = 0.55; // Mặc định 55% theo yêu cầu người dùng
      }
      const savedScene = localStorage.getItem('co_up_bg_scene') as BackgroundScene3D;
      if (savedScene && ['tra_da', 'ca_phe', 'hoa_vien', 'dau_truong', 'go_tram'].includes(savedScene)) {
        this.currentScene = savedScene;
      }
    } catch {}
  }

  public saveSettings() {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem('co_up_ambience_enabled', String(this.enabled));
      localStorage.setItem('co_up_ambience_volume', String(this.volume));
    } catch {}
  }

  public getContext(): AudioContext | null {
    const ctx = getSharedAudioContext();
    if (ctx) {
      this.ctx = ctx;
    }
    return ctx;
  }

  public resumeAudioContext(): Promise<void> {
    return unlockAudioContext();
  }

  public getConfig(): AmbienceConfig {
    return {
      enabled: this.enabled,
      volume: this.volume,
      scene: this.currentScene,
    };
  }

  public isAmbienceEnabled(): boolean {
    return this.enabled;
  }

  public isAmbienceRunning(): boolean {
    return this.isRunning;
  }

  public setEnabled(enabled: boolean) {
    this.enabled = enabled;
    this.saveSettings();
    if (!enabled) {
      this.stop();
    } else {
      this.start();
    }
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    this.saveSettings();
    if (this.masterGain && this.ctx) {
      const now = this.ctx.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
      this.masterGain.gain.linearRampToValueAtTime(this.volume, now + 0.1);
    }
  }

  public setScene(scene: BackgroundScene3D) {
    const prev = this.currentScene;
    this.currentScene = scene;
    if (this.isRunning && prev !== scene) {
      // Re-configure current scene smoothly
      this.setupContinuousLayer();
      setTimeout(() => {
        if (this.isRunning && this.enabled) {
          this.playSceneMicroEvent(this.currentScene);
        }
      }, 250);
    }
  }

  public toggle(): boolean {
    const next = !this.enabled;
    this.setEnabled(next);
    return next;
  }

  public start(scene?: BackgroundScene3D) {
    if (scene) this.currentScene = scene;
    if (!this.enabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;
    // Master Ambience Gain: Luôn khôi phục âm lượng đủ chuẩn
    if (!this.masterGain) {
      this.masterGain = ctx.createGain();
      this.masterGain.connect(ctx.destination);
    }
    this.masterGain.gain.cancelScheduledValues(now);
    this.masterGain.gain.setValueAtTime(this.volume, now);

    if (this.isRunning) {
      this.setupContinuousLayer();
      return;
    }

    this.isRunning = true;
    this.setupContinuousLayer();

    // Phát ngay một tiếng lách cách/xào xạc đặc trưng sau 250ms để người chơi nhận biết ngay không gian
    setTimeout(() => {
      if (this.isRunning && this.enabled) {
        this.playSceneMicroEvent(this.currentScene);
      }
    }, 280);

    this.scheduleNextAmbientEvent();
  }

  public stop() {
    this.isRunning = false;
    if (this.eventIntervalTimer) {
      clearTimeout(this.eventIntervalTimer);
      this.eventIntervalTimer = null;
    }

    if (this.ctx && this.masterGain) {
      const now = this.ctx.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.linearRampToValueAtTime(0.0001, now + 0.25);
      setTimeout(() => {
        this.cleanupContinuousLayer();
      }, 300);
    } else {
      this.cleanupContinuousLayer();
    }
  }

  private cleanupContinuousLayer() {
    if (this.noiseSource) {
      try {
        this.noiseSource.stop();
        this.noiseSource.disconnect();
      } catch {}
      this.noiseSource = null;
    }
    if (this.lfoOsc) {
      try {
        this.lfoOsc.stop();
        this.lfoOsc.disconnect();
      } catch {}
      this.lfoOsc = null;
    }
    if (this.noiseFilter) {
      this.noiseFilter.disconnect();
      this.noiseFilter = null;
    }
    if (this.continuousGain) {
      this.continuousGain.disconnect();
      this.continuousGain = null;
    }
  }

  /**
   * Sets up continuous background texture (street wind, coffee shop hum, water stream)
   */
  private setupContinuousLayer() {
    const ctx = this.getContext();
    if (!ctx || !this.masterGain || !this.isRunning) return;

    this.cleanupContinuousLayer();

    const now = ctx.currentTime;
    this.continuousGain = ctx.createGain();
    this.continuousGain.gain.setValueAtTime(0.001, now);
    this.continuousGain.gain.linearRampToValueAtTime(1.2, now + 0.4);
    this.continuousGain.connect(this.masterGain);

    // Looping noise buffer (3.5s organic texture)
    const bufferSize = Math.floor(ctx.sampleRate * 3.5);
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99765 * b0 + white * 0.11;
      b1 = 0.96300 * b1 + white * 0.16;
      b2 = 0.57000 * b2 + white * 0.42;
      output[i] = (b0 + b1 + b2) * 0.55;
    }

    this.noiseSource = ctx.createBufferSource();
    this.noiseSource.buffer = noiseBuffer;
    this.noiseSource.loop = true;

    this.noiseFilter = ctx.createBiquadFilter();

    // Scene-specific continuous filter settings (Tối ưu dải tần 600Hz - 2200Hz để loa điện thoại phát rõ nét)
    switch (this.currentScene) {
      case 'ca_phe': {
        // Quán cà phê: tiếng xì xào, không gian phòng ấm cúng (bandpass 750Hz)
        this.noiseFilter.type = 'bandpass';
        this.noiseFilter.frequency.setValueAtTime(750, now);
        this.noiseFilter.Q.setValueAtTime(0.9, now);
        break;
      }
      case 'hoa_vien': {
        // Hoa viên: suối nước róc rách, gió tre trúc reo (bandpass 1350Hz)
        this.noiseFilter.type = 'bandpass';
        this.noiseFilter.frequency.setValueAtTime(1350, now);
        this.noiseFilter.Q.setValueAtTime(0.85, now);
        break;
      }
      case 'dau_truong': {
        // Đấu trường: hội trường thi đấu đông đúc, xì xào (bandpass 620Hz)
        this.noiseFilter.type = 'bandpass';
        this.noiseFilter.frequency.setValueAtTime(620, now);
        this.noiseFilter.Q.setValueAtTime(1.1, now);
        break;
      }
      case 'go_tram': {
        // Phòng gỗ trầm: mộc mạc thanh tịnh (lowpass 520Hz)
        this.noiseFilter.type = 'lowpass';
        this.noiseFilter.frequency.setValueAtTime(520, now);
        this.noiseFilter.Q.setValueAtTime(1.0, now);
        break;
      }
      case 'tra_da':
      default: {
        // Vỉa hè trà đá: gió đường phố xào xạc lá cây, xe cộ xa xa (bandpass 880Hz rõ ràng trên loa máy tính & điện thoại)
        this.noiseFilter.type = 'bandpass';
        this.noiseFilter.frequency.setValueAtTime(880, now);
        this.noiseFilter.Q.setValueAtTime(0.8, now);
        break;
      }
    }

    // LFO tạo nhịp thở nhẹ nhàng cho không gian
    this.lfoOsc = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    this.lfoOsc.frequency.setValueAtTime(0.22, now);
    lfoGain.gain.setValueAtTime(120, now);

    this.lfoOsc.connect(lfoGain);
    lfoGain.connect(this.noiseFilter.frequency);

    this.noiseSource.connect(this.noiseFilter);
    this.noiseFilter.connect(this.continuousGain);

    this.noiseSource.start(now);
    this.lfoOsc.start(now);
  }

  /**
   * Periodic micro-events:
   * Giảm khoảng cách giữa các micro-event xuống 2.2s - 4.5s để người chơi luôn cảm nhận được âm thanh
   */
  private scheduleNextAmbientEvent() {
    if (!this.isRunning || !this.enabled) return;

    const delayMs = 2200 + Math.random() * 2500;
    this.eventIntervalTimer = setTimeout(() => {
      if (!this.isRunning || !this.enabled) return;
      this.playSceneMicroEvent(this.currentScene);
      this.scheduleNextAmbientEvent();
    }, delayMs);
  }

  public playSceneMicroEvent(scene: BackgroundScene3D) {
    const ctx = this.getContext();
    if (!ctx || !this.masterGain) return;

    switch (scene) {
      case 'ca_phe': {
        const rand = Math.random();
        if (rand < 0.45) {
          this.playPorcelainCupClink(ctx);
        } else if (rand < 0.75) {
          this.playCoffeeDrip(ctx);
        } else {
          this.playCafeMurmur(ctx);
        }
        break;
      }
      case 'hoa_vien': {
        const rand = Math.random();
        if (rand < 0.40) {
          this.playWaterDrop(ctx);
        } else if (rand < 0.70) {
          this.playBambooClack(ctx);
        } else {
          this.playGardenBell(ctx);
        }
        break;
      }
      case 'dau_truong': {
        const rand = Math.random();
        if (rand < 0.50) {
          this.playChessClockClick(ctx);
        } else if (rand < 0.80) {
          this.playAudienceMurmur(ctx);
        } else {
          this.playMuffledApplause(ctx);
        }
        break;
      }
      case 'go_tram': {
        this.playGardenBell(ctx);
        break;
      }
      case 'tra_da':
      default: {
        const rand = Math.random();
        if (rand < 0.50) {
          this.playTeaIceClink(ctx);
        } else if (rand < 0.80) {
          this.playBicycleBell(ctx);
        } else {
          this.playWindRustle(ctx);
        }
        break;
      }
    }
  }

  // =========================================================================
  // MICRO-SOUND SYNTHESIZERS
  // =========================================================================

  /** Vỉa hè: Tiếng đá viên va lách cách trong ly trà đá */
  private playTeaIceClink(ctx: AudioContext) {
    const now = ctx.currentTime;
    const freqs = [2100 + Math.random() * 400, 2900 + Math.random() * 500];
    freqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.05);

      gain.gain.setValueAtTime(0.58, now + idx * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.05 + 0.18);

      osc.connect(gain);
      gain.connect(this.masterGain!);

      osc.start(now + idx * 0.05);
      osc.stop(now + idx * 0.05 + 0.20);
    });
  }

  /** Vỉa hè: Tiếng chuông xe đạp kính coong xa xa trên phố */
  private playBicycleBell(ctx: AudioContext) {
    const now = ctx.currentTime;
    const baseFreq = 1950;
    // Two rapid pings "kính coong"
    [0, 0.09].forEach((offset, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(idx === 0 ? baseFreq : baseFreq * 1.15, now + offset);

      gain.gain.setValueAtTime(0.48, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.32);

      osc.connect(gain);
      gain.connect(this.masterGain!);

      osc.start(now + offset);
      osc.stop(now + offset + 0.35);
    });
  }

  /** Vỉa hè: Cơn gió thoảng xào xạc lá cây */
  private playWindRustle(ctx: AudioContext) {
    const now = ctx.currentTime;
    const bufferSize = ctx.sampleRate * 0.6;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(850, now);
    filter.frequency.exponentialRampToValueAtTime(1550, now + 0.3);
    filter.Q.setValueAtTime(1.8, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.48, now + 0.22);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain!);
    noise.start(now);
  }

  /** Quán cà phê: Tiếng thìa gõ lách cách vào tách sứ */
  private playPorcelainCupClink(ctx: AudioContext) {
    const now = ctx.currentTime;
    // Rich ceramic resonance (fundamental + high ringing harmonic)
    const tones = [
      { f: 1820, g: 0.55, d: 0.24 },
      { f: 3450, g: 0.40, d: 0.16 },
      { f: 4720, g: 0.28, d: 0.10 },
    ];
    tones.forEach((t) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(t.f, now);

      gain.gain.setValueAtTime(t.g, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + t.d);

      osc.connect(gain);
      gain.connect(this.masterGain!);

      osc.start(now);
      osc.stop(now + t.d + 0.02);
    });
  }

  /** Quán cà phê: Tiếng giọt cà phê phin tí tách */
  private playCoffeeDrip(ctx: AudioContext) {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    // Frequency drop for liquid drop bubble "tõm/tí tách"
    osc.frequency.setValueAtTime(1450, now);
    osc.frequency.exponentialRampToValueAtTime(680, now + 0.035);

    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);

    osc.connect(gain);
    gain.connect(this.masterGain!);
    osc.start(now);
    osc.stop(now + 0.05);
  }

  /** Quán cà phê: Tiếng lầm rầm trò chuyện thì thào của các cụ cờ tướng */
  private playCafeMurmur(ctx: AudioContext) {
    const now = ctx.currentTime;
    // Multi-formant vowel whisper imitation
    const vowels = [320, 680, 1420];
    vowels.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq + Math.random() * 40, now);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.18, now + 0.12);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

      osc.connect(gain);
      gain.connect(this.masterGain!);
      osc.start(now + idx * 0.02);
      osc.stop(now + 0.5);
    });
  }

  /** Hoa viên: Tiếng giọt nước róc rách */
  private playWaterDrop(ctx: AudioContext) {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1600, now);
    osc.frequency.exponentialRampToValueAtTime(900, now + 0.05);

    gain.gain.setValueAtTime(0.32, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

    osc.connect(gain);
    gain.connect(this.masterGain!);
    osc.start(now);
    osc.stop(now + 0.07);
  }

  /** Hoa viên: Tiếng cọc tre gõ nước (shishi-odoshi) */
  private playBambooClack(ctx: AudioContext) {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(460, now);
    osc.frequency.exponentialRampToValueAtTime(180, now + 0.04);

    gain.gain.setValueAtTime(0.42, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

    osc.connect(gain);
    gain.connect(this.masterGain!);
    osc.start(now);
    osc.stop(now + 0.07);
  }

  /** Hoa viên & Gỗ trầm: Tiếng chuông gió / khánh đồng thanh tịnh */
  private playGardenBell(ctx: AudioContext) {
    const now = ctx.currentTime;
    const freqs = [1056, 1320, 1584];
    freqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.04);

      gain.gain.setValueAtTime(0.28, now + idx * 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.04 + 0.55);

      osc.connect(gain);
      gain.connect(this.masterGain!);
      osc.start(now + idx * 0.04);
      osc.stop(now + idx * 0.04 + 0.60);
    });
  }

  /** Đấu trường: Tiếng nhấn đồng hồ cờ chớp (click-clack) */
  private playChessClockClick(ctx: AudioContext) {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1600, now);
    osc.frequency.exponentialRampToValueAtTime(400, now + 0.012);

    gain.gain.setValueAtTime(0.45, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.015);

    osc.connect(gain);
    gain.connect(this.masterGain!);
    osc.start(now);
    osc.stop(now + 0.02);
  }

  /** Đấu trường: Tiếng xì xào thảo luận của hội đồng khán giả */
  private playAudienceMurmur(ctx: AudioContext) {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(260, now);
    osc.frequency.linearRampToValueAtTime(290, now + 0.3);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.22, now + 0.2);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

    osc.connect(gain);
    gain.connect(this.masterGain!);
    osc.start(now);
    osc.stop(now + 0.65);
  }

  /** Đấu trường: Tiếng vỗ tay trầm lắng từ bàn bên */
  private playMuffledApplause(ctx: AudioContext) {
    const now = ctx.currentTime;
    for (let i = 0; i < 4; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(340 + Math.random() * 80, now + i * 0.07);

      gain.gain.setValueAtTime(0.25, now + i * 0.07);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.07 + 0.035);

      osc.connect(gain);
      gain.connect(this.masterGain!);
      osc.start(now + i * 0.07);
      osc.stop(now + i * 0.07 + 0.04);
    }
  }

  /** Preview function for testing in settings modal */
  public previewScene(scene: BackgroundScene3D) {
    const ctx = this.getContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    const now = ctx.currentTime;
    if (!this.masterGain) {
      this.masterGain = ctx.createGain();
      this.masterGain.connect(ctx.destination);
    }
    this.masterGain.gain.cancelScheduledValues(now);
    this.masterGain.gain.setValueAtTime(this.volume, now);

    this.playSceneMicroEvent(scene);
    setTimeout(() => {
      this.playSceneMicroEvent(scene);
    }, 350);
  }
}

export const ambience = new AmbienceEngine();
