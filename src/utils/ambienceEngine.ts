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
  private volume: number = 0.20; // Mặc định 20% (nhẹ nhàng, êm dịu)
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
        this.enabled = true; // Mặc định bật đúng theo không gian quán cờ
      }
      const savedVol = localStorage.getItem('co_up_ambience_volume');
      if (savedVol !== null) {
        const parsed = parseFloat(savedVol);
        this.volume = isNaN(parsed) || parsed < 0 ? 0.20 : Math.max(0.05, Math.min(1, parsed));
      } else {
        this.volume = 0.20; // Mặc định 20% theo yêu cầu người dùng
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
    
    // Giảm âm lượng nền liên tục xuống mức thoang thoảng êm dịu (~10-15%), không còn tiếng gió rít
    const continuousLevel =
      this.currentScene === 'dau_truong' || this.currentScene === 'go_tram'
        ? 0.04
        : this.currentScene === 'ca_phe'
        ? 0.06
        : 0.10;

    this.continuousGain.gain.linearRampToValueAtTime(continuousLevel, now + 0.4);
    this.continuousGain.connect(this.masterGain);

    // Looping noise buffer (3.5s organic soft ambient texture)
    const bufferSize = Math.floor(ctx.sampleRate * 3.5);
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99765 * b0 + white * 0.06;
      b1 = 0.96300 * b1 + white * 0.09;
      b2 = 0.57000 * b2 + white * 0.20;
      output[i] = (b0 + b1 + b2) * 0.20; // Rất êm dịu, ấm áp, không bị xào xạc rít chói tai
    }

    this.noiseSource = ctx.createBufferSource();
    this.noiseSource.buffer = noiseBuffer;
    this.noiseSource.loop = true;

    this.noiseFilter = ctx.createBiquadFilter();

    // Lọc dải trầm ấm (lowpass 220Hz - 340Hz) để tạo không gian tĩnh lặng, triệt tiêu tiếng gió thổi to
    switch (this.currentScene) {
      case 'ca_phe': {
        this.noiseFilter.type = 'lowpass';
        this.noiseFilter.frequency.setValueAtTime(320, now);
        this.noiseFilter.Q.setValueAtTime(0.6, now);
        break;
      }
      case 'hoa_vien': {
        this.noiseFilter.type = 'lowpass';
        this.noiseFilter.frequency.setValueAtTime(340, now);
        this.noiseFilter.Q.setValueAtTime(0.6, now);
        break;
      }
      case 'dau_truong': {
        this.noiseFilter.type = 'lowpass';
        this.noiseFilter.frequency.setValueAtTime(240, now);
        this.noiseFilter.Q.setValueAtTime(0.5, now);
        break;
      }
      case 'go_tram': {
        this.noiseFilter.type = 'lowpass';
        this.noiseFilter.frequency.setValueAtTime(200, now);
        this.noiseFilter.Q.setValueAtTime(0.5, now);
        break;
      }
      case 'tra_da':
      default: {
        // Vỉa hè trà đá: Tiếng gió nền được triệt tiêu, chỉ còn cảm giác không gian ngoài trời êm ả
        this.noiseFilter.type = 'lowpass';
        this.noiseFilter.frequency.setValueAtTime(280, now);
        this.noiseFilter.Q.setValueAtTime(0.6, now);
        break;
      }
    }

    // LFO vi chỉnh nhẹ nhàng tạo nhịp thở rất khẽ cho không gian
    this.lfoOsc = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    this.lfoOsc.frequency.setValueAtTime(0.18, now);
    lfoGain.gain.setValueAtTime(25, now); // Giảm mạnh từ 120 xuống 25 để tránh làm gió rít lên

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
        if (rand < 0.28) {
          this.playPorcelainCupClink(ctx);
        } else if (rand < 0.48) {
          this.playCoffeeDrip(ctx);
        } else if (rand < 0.76) {
          // Tiếng xì xào bàn tán cờ của các cụ trong quán cà phê
          this.playChessWhisper(ctx);
        } else if (rand < 0.92) {
          // Xe cộ qua lại xa xa ngoài cửa kính
          this.playDistantTraffic(ctx);
        } else {
          // Thỉnh thoảng tiếng rao hàng vọng qua cửa kính
          this.playStreetVendorCry(ctx);
        }
        break;
      }
      case 'hoa_vien': {
        const rand = Math.random();
        if (rand < 0.36) {
          // Tiếng chim hót ríu rít chuyền cành trong hoa viên
          this.playBirdChirp(ctx);
        } else if (rand < 0.65) {
          this.playWaterDrop(ctx);
        } else if (rand < 0.82) {
          this.playBambooClack(ctx);
        } else if (rand < 0.94) {
          this.playGardenBell(ctx);
        } else {
          // Gió chỉ thoang thoảng rất nhẹ
          this.playWindRustle(ctx);
        }
        break;
      }
      case 'dau_truong': {
        const rand = Math.random();
        if (rand < 0.38) {
          this.playChessClockClick(ctx);
        } else if (rand < 0.70) {
          // Tiếng xì xào bàn tán của hội trường khán giả
          this.playAudienceMurmur(ctx);
        } else if (rand < 0.88) {
          this.playMuffledApplause(ctx);
        } else {
          this.playArenaGong(ctx);
        }
        break;
      }
      case 'go_tram': {
        const rand = Math.random();
        if (rand < 0.38) {
          this.playWoodenFish(ctx);
        } else if (rand < 0.70) {
          this.playSingingBowl(ctx);
        } else if (rand < 0.86) {
          this.playGardenBell(ctx);
        } else {
          this.playWaterDrop(ctx);
        }
        break;
      }
      case 'tra_da':
      default: {
        const rand = Math.random();
        if (rand < 0.28) {
          // Tiếng xì xào bàn tán nước cờ của các kỳ thủ vỉa hè
          this.playChessWhisper(ctx);
        } else if (rand < 0.48) {
          // Tiếng xe cộ xa xa trên đường phố qua lại
          this.playDistantTraffic(ctx);
        } else if (rand < 0.65) {
          // Tiếng đá viên va lách cách trong ly trà đá
          this.playTeaIceClink(ctx);
        } else if (rand < 0.78) {
          // Tiếng xe máy êm ái lướt qua ở xa
          this.playDistantMotorbikePass(ctx);
        } else if (rand < 0.86) {
          // Tiếng chim hót trên tán cây vỉa hè
          this.playBirdChirp(ctx);
        } else if (rand < 0.92) {
          // Tiếng chuông xe đạp kính coong
          this.playBicycleBell(ctx);
        } else if (rand < 0.97) {
          // Tiếng rao hàng rong ngoài phố
          this.playStreetVendorCry(ctx);
        } else {
          // Gió thoang thoảng nhẹ 20%
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

  /** Vỉa hè & Không gian cờ: Cơn gió thoang thoảng nhẹ (âm lượng 20%, ấm áp, không rít) */
  private playWindRustle(ctx: AudioContext) {
    const now = ctx.currentTime;
    const bufferSize = Math.floor(ctx.sampleRate * 0.7);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * 0.25;

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(320, now);
    filter.frequency.exponentialRampToValueAtTime(220, now + 0.6);
    filter.Q.setValueAtTime(0.7, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.06, now + 0.25); // Âm lượng chỉ ~20% thoang thoảng nhẹ nhàng
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain!);
    noise.start(now);
  }

  /** Vỉa hè & Quán cờ: Tiếng xì xào bàn tán thì thào của các kỳ thủ và khán giả xem cờ */
  private playChessWhisper(ctx: AudioContext) {
    const now = ctx.currentTime;
    // Mô phỏng âm thanh rì rầm thì thào đàm đạo nước cờ bàn bên
    const syllables = [
      { f1: 260, f2: 620, delay: 0.0, dur: 0.24, gain: 0.16 },
      { f1: 320, f2: 780, delay: 0.26, dur: 0.30, gain: 0.18 },
      { f1: 240, f2: 540, delay: 0.58, dur: 0.28, gain: 0.14 },
    ];

    syllables.forEach((s) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(s.f1, now + s.delay);
      osc.frequency.linearRampToValueAtTime(s.f1 * 0.92, now + s.delay + s.dur);

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(s.f2, now + s.delay);
      filter.Q.setValueAtTime(1.9, now + s.delay);

      gainNode.gain.setValueAtTime(0.001, now + s.delay);
      gainNode.gain.linearRampToValueAtTime(s.gain, now + s.delay + 0.06);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + s.delay + s.dur);

      osc.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(this.masterGain!);

      osc.start(now + s.delay);
      osc.stop(now + s.delay + s.dur + 0.02);
    });
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

  /** Gỗ trầm: Tiếng gõ mõ gỗ trầm ấm tĩnh tâm */
  private playWoodenFish(ctx: AudioContext) {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(480, now);
    osc.frequency.exponentialRampToValueAtTime(260, now + 0.08);

    gain.gain.setValueAtTime(0.38, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    osc.connect(gain);
    gain.connect(this.masterGain!);
    osc.start(now);
    osc.stop(now + 0.14);
  }

  /** Gỗ trầm: Tiếng chuông xoay thiền viện ngân nga sâu lắng (432Hz) */
  private playSingingBowl(ctx: AudioContext) {
    const now = ctx.currentTime;
    const harmonics = [
      { f: 432, g: 0.30, d: 2.2 },
      { f: 864, g: 0.18, d: 1.8 },
      { f: 1296, g: 0.10, d: 1.4 },
    ];
    harmonics.forEach(({ f, g, d }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, now);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(g, now + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + d);

      osc.connect(gain);
      gain.connect(this.masterGain!);
      osc.start(now);
      osc.stop(now + d + 0.05);
    });
  }

  /** Đấu trường: Tiếng chuông hiệu lệnh hội trường đấu cờ */
  private playArenaGong(ctx: AudioContext) {
    const now = ctx.currentTime;
    const freqs = [784, 1176];
    freqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.03);

      gain.gain.setValueAtTime(0.24, now + idx * 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.03 + 1.2);

      osc.connect(gain);
      gain.connect(this.masterGain!);
      osc.start(now + idx * 0.03);
      osc.stop(now + idx * 0.03 + 1.25);
    });
  }

  /** Hoa viên & Vỉa hè: Tiếng chim hót ríu rít chuyền cành trong công viên / tán cây */
  private playBirdChirp(ctx: AudioContext) {
    const now = ctx.currentTime;
    const vol = 0.36;

    const patternType = Math.random();

    if (patternType < 0.55) {
      // Kiểu 1: Hai tiếng chim hót véo von chuyền cành líu lo
      const notes = [
        { startF: 3200, peakF: 4400, endF: 3600, delay: 0.0, dur: 0.08 },
        { startF: 3600, peakF: 4850, endF: 3400, delay: 0.12, dur: 0.09 },
        { startF: 4200, peakF: 5150, endF: 3800, delay: 0.25, dur: 0.07 },
      ];

      notes.forEach((n) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';

        osc.frequency.setValueAtTime(n.startF, now + n.delay);
        osc.frequency.linearRampToValueAtTime(n.peakF, now + n.delay + n.dur * 0.4);
        osc.frequency.exponentialRampToValueAtTime(n.endF, now + n.delay + n.dur);

        gain.gain.setValueAtTime(0.001, now + n.delay);
        gain.gain.linearRampToValueAtTime(vol, now + n.delay + n.dur * 0.3);
        gain.gain.exponentialRampToValueAtTime(0.001, now + n.delay + n.dur);

        osc.connect(gain);
        gain.connect(this.masterGain!);

        osc.start(now + n.delay);
        osc.stop(now + n.delay + n.dur + 0.02);
      });
    } else {
      // Kiểu 2: Tiếng chim ríu rít nhanh với vibrato luyến láy
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const vibrato = ctx.createOscillator();
      const vibratoGain = ctx.createGain();

      osc.type = 'sine';
      vibrato.type = 'sine';
      vibrato.frequency.setValueAtTime(18, now);
      vibratoGain.gain.setValueAtTime(280, now);

      vibrato.connect(osc.frequency);

      const baseFreq = 3400 + Math.random() * 500;
      osc.frequency.setValueAtTime(baseFreq, now);
      osc.frequency.linearRampToValueAtTime(baseFreq + 650, now + 0.1);
      osc.frequency.exponentialRampToValueAtTime(baseFreq - 250, now + 0.22);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(vol * 1.05, now + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

      osc.connect(gain);
      gain.connect(this.masterGain!);

      vibrato.start(now);
      osc.start(now);
      vibrato.stop(now + 0.24);
      osc.stop(now + 0.24);
    }
  }

  /** Vỉa hè & Cà phê: Tiếng xe cộ xa xa rì rầm trên đường phố vỉa hè */
  private playDistantTraffic(ctx: AudioContext) {
    const now = ctx.currentTime;
    const dur = 2.4 + Math.random() * 0.8;

    const bufferSize = Math.floor(ctx.sampleRate * dur);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(140, now);
    filter.frequency.linearRampToValueAtTime(260, now + dur * 0.45);
    filter.frequency.linearRampToValueAtTime(120, now + dur);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.42, now + dur * 0.4);
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain!);

    noise.start(now);
    noise.stop(now + dur + 0.05);
  }

  /** Vỉa hè: Tiếng xe máy êm ái lướt qua ở xa ngoài đường (muffled distant motorbike) */
  private playDistantMotorbikePass(ctx: AudioContext) {
    const now = ctx.currentTime;
    const dur = 2.8;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(138, now);
    osc.frequency.linearRampToValueAtTime(132, now + 1.2);
    osc.frequency.exponentialRampToValueAtTime(116, now + dur);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(240, now);
    filter.frequency.linearRampToValueAtTime(320, now + 1.2);
    filter.frequency.linearRampToValueAtTime(200, now + dur);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.24, now + 1.2);
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain!);

    osc.start(now);
    osc.stop(now + dur + 0.05);
  }

  /** Vỉa hè: Tiếng còi xe xa xa nhẹ nhàng mờ ảo ngoài phố */
  private playDistantGentleHorn(ctx: AudioContext) {
    const now = ctx.currentTime;
    const vol = 0.16;

    [0, 0.12].forEach((offset) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(465, now + offset);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(680, now + offset);

      gain.gain.setValueAtTime(vol, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.09);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain!);

      osc.start(now + offset);
      osc.stop(now + offset + 0.10);
    });
  }

  /**
   * Vỉa hè & Đường phố: Tiếng rao hàng rong ngoài đường phố Việt Nam
   * (Mô phỏng chân thực ngữ điệu rao bán hàng rong: "Ai bánh mì...", "Bắp xào...", "Tào phớ...")
   * Tổng hợp âm thanh ngữ điệu tiếng người vang vọng ở xa ngoài phố qua bộ lọc formant & lọc âm xa.
   */
  public playStreetVendorCry(ctx?: AudioContext) {
    const audioCtx = ctx || this.getContext();
    if (!audioCtx || !this.masterGain) return;

    const now = audioCtx.currentTime;
    // Chọn ngẫu nhiên 1 trong 3 làn điệu rao hàng rong quen thuộc của phố phường Hà Nội / Sài Gòn
    const vendorStyle = Math.random();

    if (vendorStyle < 0.38) {
      // Kiểu 1: Ngữ điệu rao "Ai bánh mì nóng giòn đây... bánh mì đặc ruột nào..."
      // Gồm 4 âm tiết ngân vang xa với cao độ luyến láy đặc trưng
      const syllables = [
        { startF: 440, endF: 490, delay: 0.0, dur: 0.32, gain: 0.22, vowelF: 800 },
        { startF: 520, endF: 580, delay: 0.36, dur: 0.45, gain: 0.26, vowelF: 1100 },
        { startF: 480, endF: 440, delay: 0.90, dur: 0.40, gain: 0.20, vowelF: 950 },
        { startF: 390, endF: 350, delay: 1.38, dur: 0.55, gain: 0.15, vowelF: 750 },
      ];

      syllables.forEach((s) => {
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        const formantFilter = audioCtx.createBiquadFilter();
        const distanceFilter = audioCtx.createBiquadFilter();

        osc.type = 'triangle'; // Âm sắc ấm áp như giọng người
        osc.frequency.setValueAtTime(s.startF, now + s.delay);
        osc.frequency.exponentialRampToValueAtTime(s.endF, now + s.delay + s.dur);

        // Formant filter tạo cảm giác nguyên âm người ("a", "i", "o")
        formantFilter.type = 'bandpass';
        formantFilter.frequency.setValueAtTime(s.vowelF, now + s.delay);
        formantFilter.Q.setValueAtTime(2.2, now + s.delay);

        // Distance filter: mô phỏng âm thanh vọng từ xa ngoài đường qua tường/không khí
        distanceFilter.type = 'lowpass';
        distanceFilter.frequency.setValueAtTime(1600, now + s.delay);

        gainNode.gain.setValueAtTime(0.001, now + s.delay);
        gainNode.gain.linearRampToValueAtTime(s.gain, now + s.delay + s.dur * 0.25);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + s.delay + s.dur);

        osc.connect(formantFilter);
        formantFilter.connect(distanceFilter);
        distanceFilter.connect(gainNode);
        gainNode.connect(this.masterGain!);

        osc.start(now + s.delay);
        osc.stop(now + s.delay + s.dur + 0.05);
      });
    } else if (vendorStyle < 0.72) {
      // Kiểu 2: Ngữ điệu rao "Bắp xào hột vịt lộn đâyyy..." / "Tào phớ nàooo..."
      // Âm điệu luyến cao rồi ngân dài tha thiết
      const syllables = [
        { startF: 330, endF: 370, delay: 0.0, dur: 0.28, gain: 0.20, vowelF: 720 },
        { startF: 440, endF: 520, delay: 0.32, dur: 0.50, gain: 0.25, vowelF: 1250 },
        { startF: 490, endF: 380, delay: 0.88, dur: 0.65, gain: 0.18, vowelF: 880 },
      ];

      syllables.forEach((s) => {
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        const formantFilter = audioCtx.createBiquadFilter();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(s.startF, now + s.delay);
        osc.frequency.linearRampToValueAtTime(s.endF, now + s.delay + s.dur);

        formantFilter.type = 'bandpass';
        formantFilter.frequency.setValueAtTime(s.vowelF, now + s.delay);
        formantFilter.Q.setValueAtTime(2.0, now + s.delay);

        gainNode.gain.setValueAtTime(0.001, now + s.delay);
        gainNode.gain.linearRampToValueAtTime(s.gain, now + s.delay + s.dur * 0.3);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + s.delay + s.dur);

        osc.connect(formantFilter);
        formantFilter.connect(gainNode);
        gainNode.connect(this.masterGain!);

        osc.start(now + s.delay);
        osc.stop(now + s.delay + s.dur + 0.05);
      });
    } else {
      // Kiểu 3: Tiếng gõ lóc cóc / tiếng còi bóp bíp bíp quen thuộc của xe kem, xe kẹo kéo dạo
      const clackTimes = [0.0, 0.14, 0.28, 0.55, 0.69];
      clackTimes.forEach((delay, idx) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(idx % 2 === 0 ? 880 : 1050, now + delay);
        osc.frequency.exponentialRampToValueAtTime(280, now + delay + 0.06);

        gain.gain.setValueAtTime(0.19, now + delay);
        gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.07);

        osc.connect(gain);
        gain.connect(this.masterGain!);

        osc.start(now + delay);
        osc.stop(now + delay + 0.08);
      });
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
    }, 380);
  }
}

export const ambience = new AmbienceEngine();
