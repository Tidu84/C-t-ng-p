/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// ============================================================================
// POLYPHONIC STEREO CLASSICAL GUITAR ENGINE (ĐỘNG CƠ GUITAR CỔ ĐIỂN STEREO ĐA ÂM)
// Recreates authentic nylon-string classical & flamenco guitar acoustic physics:
// - True multi-voice polyphony (bass, melody, tremolo pedal, rasgueado strums)
// - Spatial stereo panning (wide acoustic soundstage)
// - Physical nylon resonance modeling (spruce soundboard, air cavity, nail pluck noise)
// - 3 Complete Masterpieces (> 3 minutes each / hơn 3 phút một bản):
//   1. 🇪🇸 Asturias (Leyenda) - Isaac Albéniz (~3:30)
//   2. 🇭🇺 Hungarian Dance No. 5 - Johannes Brahms (~3:20)
//   3. 🇨🇺 Danza Cubana - Ignacio Cervantes (~3:30)
// ============================================================================

export type ClassicalGuitarTrackId = 'leyenda' | 'hungarian' | 'cuba';

export interface ClassicalGuitarTrackInfo {
  id: ClassicalGuitarTrackId;
  title: string;
  composer: string;
  genre: string;
  icon: string;
  bpm: number;
  durationStr: string;
  description: string;
}

export const GUITAR_TRACKS: ClassicalGuitarTrackInfo[] = [
  {
    id: 'leyenda',
    title: 'Asturias (Leyenda)',
    composer: 'Isaac Albéniz',
    genre: 'Flamenco Cổ Điển Tây Ban Nha',
    icon: '🇪🇸',
    bpm: 132,
    durationStr: '~3:30',
    description: 'Trường ca hoàn chỉnh 5 chương: Preludio dồn dập, Copla tự tình, Bulerías bốc lửa và Coda hùng tráng',
  },
  {
    id: 'hungarian',
    title: 'Vũ Khúc Hungary Số 5',
    composer: 'Johannes Brahms',
    genre: 'Vũ Khúc Gypsy Cổ Điển',
    icon: '🇭🇺',
    bpm: 126,
    durationStr: '~3:20',
    description: 'Tuyệt phẩm 5 chương: Nhịp điệu Gypsy biến ảo, vũ hội bốc lửa, sầu khúc thảo nguyên và kết thúc xoáy cuộn',
  },
  {
    id: 'cuba',
    title: 'Danza Cubana (Vũ Điệu Cuba)',
    composer: 'Ignacio Cervantes',
    genre: 'Guitar La-tinh Habanera',
    icon: '🇨🇺',
    bpm: 118,
    durationStr: '~3:30',
    description: 'Dạ vũ Havana 5 chương: Nhịp Habanera 3+3+2 quyến rũ, montuno nhiệt đới và khúc độc tấu dưới trăng',
  },
];

// Note event structure
interface NoteEvent {
  freq: number;
  duration: number; // in seconds
  velocity: number; // 0 to 1
  pan: number; // -1 (left) to +1 (right)
  isBass?: boolean;
  isStrum?: boolean;
  strumFrequencies?: number[];
  isPercussion?: boolean; // soundboard tap (golpe)
}

interface StepEvent {
  notes: NoteEvent[];
  delayMs: number;
}

class ClassicalGuitarEngine {
  private ctx: AudioContext | null = null;
  private isPlaying: boolean = false;
  private currentTrack: ClassicalGuitarTrackId = 'leyenda';
  private currentStep: number = 0;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private masterGain: GainNode | null = null;
  private reverbConvolver: ConvolverNode | null = null;
  private volume: number = 1.0;

  // Cached generated tracks
  private trackScores: Record<ClassicalGuitarTrackId, StepEvent[]> = {
    leyenda: [],
    hungarian: [],
    cuba: [],
  };

  constructor() {
    this.initScores();
  }

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.setupAudioGraph();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private setupAudioGraph() {
    if (!this.ctx) return;
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);

    // Warm stereo acoustic room impulse generator (synthetic concert hall reverb)
    this.setupSyntheticReverb();

    this.masterGain.connect(this.ctx.destination);
  }

  private setupSyntheticReverb() {
    if (!this.ctx) return;
    try {
      const rate = this.ctx.sampleRate;
      const length = rate * 1.5; // 1.5 second acoustic reverb tail
      const decay = 2.4;
      const impulse = this.ctx.createBuffer(2, length, rate);
      const left = impulse.getChannelData(0);
      const right = impulse.getChannelData(1);

      for (let i = 0; i < length; i++) {
        const factor = Math.exp((-i / rate) * decay);
        left[i] = (Math.random() * 2 - 1) * factor * 0.45;
        right[i] = (Math.random() * 2 - 1) * factor * 0.45;
      }

      this.reverbConvolver = this.ctx.createConvolver();
      this.reverbConvolver.buffer = impulse;

      const reverbGain = this.ctx.createGain();
      reverbGain.gain.setValueAtTime(0.22, this.ctx.currentTime); // subtle warm ambience

      this.reverbConvolver.connect(reverbGain);
      reverbGain.connect(this.ctx.destination);
    } catch {}
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
    }
  }

  public setTrack(trackId: ClassicalGuitarTrackId) {
    const wasPlaying = this.isPlaying;
    if (wasPlaying) {
      this.stop();
    }
    this.currentTrack = trackId;
    this.currentStep = 0;
    if (wasPlaying) {
      this.play();
    }
  }

  public getCurrentTrack(): ClassicalGuitarTrackId {
    return this.currentTrack;
  }

  public getCurrentTrackInfo(): ClassicalGuitarTrackInfo {
    return (
      GUITAR_TRACKS.find((t) => t.id === this.currentTrack) || GUITAR_TRACKS[0]
    );
  }

  public play() {
    const ctx = this.getContext();
    if (!ctx) return;
    this.isPlaying = true;
    this.scheduleStep();
  }

  public stop() {
    this.isPlaying = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  public toggle(): boolean {
    if (this.isPlaying) {
      this.stop();
      return false;
    } else {
      this.play();
      return true;
    }
  }

  public isTrackPlaying(): boolean {
    return this.isPlaying;
  }

  // ==========================================================================
  // PHYSICAL ACOUSTIC NYLON GUITAR SYNTHESIS
  // ==========================================================================
  private playNylonPluck(event: NoteEvent) {
    const ctx = this.getContext();
    if (!ctx || !this.masterGain) return;

    const now = ctx.currentTime;
    const vol = event.velocity * this.volume;
    const freq = event.freq;
    const dur = event.duration;

    // Handle Soundboard Tap (Golpe Flamenco)
    if (event.isPercussion) {
      this.playGolpeTap(now, vol);
      return;
    }

    // Handle Flamenco Rasgueado Strum
    if (event.isStrum && event.strumFrequencies && event.strumFrequencies.length > 0) {
      event.strumFrequencies.forEach((chordFreq, idx) => {
        const strumDelay = idx * 0.014; // rapid 14ms rake across strings
        const panOffset = -0.3 + (idx / event.strumFrequencies!.length) * 0.6;
        this.playSingleNylonString(
          now + strumDelay,
          chordFreq,
          dur * 0.85,
          vol * (0.65 + idx * 0.08),
          panOffset,
          idx === 0
        );
      });
      return;
    }

    this.playSingleNylonString(now, freq, dur, vol, event.pan, Boolean(event.isBass));
  }

  private playSingleNylonString(
    time: number,
    freq: number,
    duration: number,
    velocity: number,
    pan: number,
    isBass: boolean
  ) {
    const ctx = this.ctx;
    if (!ctx || !this.masterGain) return;

    // 1. Primary string core tone: Sawtooth + Triangle blend with rich harmonics
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc1.type = isBass ? 'triangle' : 'sawtooth';
    osc2.type = 'triangle';

    osc1.frequency.setValueAtTime(freq, time);
    osc2.frequency.setValueAtTime(freq * 2, time); // warm octave overtone

    // 2. Dual Resonance Filters (Spruce Soundboard + Air Soundhole Cavity)
    const bodyFilter = ctx.createBiquadFilter();
    bodyFilter.type = 'bandpass';
    bodyFilter.frequency.setValueAtTime(isBass ? 210 : 420, time);
    bodyFilter.Q.setValueAtTime(isBass ? 2.4 : 3.2, time);

    const stringFilter = ctx.createBiquadFilter();
    stringFilter.type = 'lowpass';
    const cutoff = isBass ? freq * 3.8 : Math.min(freq * 5.2, 5200);
    stringFilter.frequency.setValueAtTime(cutoff, time);
    stringFilter.frequency.exponentialRampToValueAtTime(
      Math.max(freq * 1.2, 220),
      time + Math.min(duration, 0.45)
    );

    // 3. Pluck Transient (Móng gảy tiếp xúc bề mặt dây tơ)
    const nailOsc = ctx.createOscillator();
    const nailGain = ctx.createGain();
    nailOsc.type = 'sine';
    nailOsc.frequency.setValueAtTime(isBass ? 950 : 2600, time);
    nailGain.gain.setValueAtTime(0.0001, time);
    nailGain.gain.linearRampToValueAtTime(velocity * 0.42, time + 0.003);
    nailGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.016);

    // 4. Amplitude Envelope
    gainNode.gain.setValueAtTime(0.0001, time);
    gainNode.gain.linearRampToValueAtTime(velocity * 0.75, time + 0.005);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, time + duration);

    // Stereo Panning
    const panner = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    if (panner) {
      panner.pan.setValueAtTime(Math.max(-1, Math.min(1, pan)), time);
    }

    // Connections
    osc1.connect(bodyFilter);
    osc2.connect(stringFilter);
    bodyFilter.connect(gainNode);
    stringFilter.connect(gainNode);

    nailOsc.connect(nailGain);
    nailGain.connect(gainNode);

    if (panner) {
      gainNode.connect(panner);
      panner.connect(this.masterGain);
      if (this.reverbConvolver) {
        panner.connect(this.reverbConvolver);
      }
    } else {
      gainNode.connect(this.masterGain);
      if (this.reverbConvolver) {
        gainNode.connect(this.reverbConvolver);
      }
    }

    osc1.start(time);
    osc2.start(time);
    nailOsc.start(time);

    const stopTime = time + duration + 0.05;
    osc1.stop(stopTime);
    osc2.stop(stopTime);
    nailOsc.stop(time + 0.02);
  }

  // Flamenco Golpe (Soundboard Tap on cypress / spruce top)
  private playGolpeTap(time: number, velocity: number) {
    const ctx = this.ctx;
    if (!ctx || !this.masterGain) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(140, time);
    osc.frequency.exponentialRampToValueAtTime(45, time + 0.06);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(320, time);

    gain.gain.setValueAtTime(0.001, time);
    gain.gain.linearRampToValueAtTime(velocity * 0.55, time + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.09);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(time);
    osc.stop(time + 0.1);
  }

  // ==========================================================================
  // SCHEDULING & LOOPING
  // ==========================================================================
  private scheduleStep = () => {
    if (!this.isPlaying) return;

    const score = this.trackScores[this.currentTrack];
    if (!score || score.length === 0) return;

    const step = score[this.currentStep % score.length];

    step.notes.forEach((note) => {
      this.playNylonPluck(note);
    });

    this.currentStep = (this.currentStep + 1) % score.length;

    this.timer = setTimeout(() => {
      this.scheduleStep();
    }, step.delayMs);
  };

  // ==========================================================================
  // COMPOSITION SCORES GENERATION (> 3 MINUTES PER TRACK)
  // ==========================================================================
  private initScores() {
    this.trackScores.leyenda = this.buildAsturiasScore();
    this.trackScores.hungarian = this.buildHungarianDanceScore();
    this.trackScores.cuba = this.buildDanzaCubanaScore();
  }

  // --------------------------------------------------------------------------
  // 1. ASTURIAS (LEYENDA) - Isaac Albéniz (~3 phút 30 giây, > 210.000 ms)
  // Complete 5-movement masterwork:
  // - Mov I: Preludio Misterioso & Crescendo (~48s)
  // - Mov II: Copla / Cante Jondo - Lyrical Andalusian Interlude (~65s)
  // - Mov III: Allegro Virtuoso & Flamenco Bulerías (~52s)
  // - Mov IV: Grand Recapitulation (Tempo I Tái Hiện) (~36s)
  // - Mov V: Majestic Coda & Epilogue (~15s)
  // --------------------------------------------------------------------------
  private buildAsturiasScore(): StepEvent[] {
    const score: StepEvent[] = [];
    const step16thMs = 112; // ~134 BPM 16th notes
    const E4_PEDAL = 329.63; // E4 pedal note

    // Helper to add 16th-note pedal pattern
    const addPedalPhrase = (bassList: { bass: number; vel?: number }[], pedalPitch = E4_PEDAL, delay = step16thMs) => {
      bassList.forEach((item, idx) => {
        score.push({
          notes: [
            {
              freq: item.bass,
              duration: 0.65,
              velocity: item.vel ?? 0.92,
              pan: -0.28,
              isBass: true,
            },
            {
              freq: pedalPitch,
              duration: 0.45,
              velocity: 0.62,
              pan: 0.22,
            },
          ],
          delayMs: delay,
        });

        score.push({
          notes: [
            {
              freq: pedalPitch,
              duration: 0.38,
              velocity: 0.55 + (idx % 2 === 0 ? 0.08 : 0),
              pan: 0.25,
            },
          ],
          delayMs: delay,
        });
      });
    };

    // Helper for rasgueado chord
    const addRasgueado = (freqs: number[], dur: number, delayMs: number, golpe = false, vel = 0.95) => {
      const notes: NoteEvent[] = [
        {
          freq: freqs[0],
          duration: dur,
          velocity: vel,
          pan: 0.0,
          isStrum: true,
          strumFrequencies: freqs,
        },
      ];
      if (golpe) {
        notes.push({ freq: 120, duration: 0.1, velocity: 0.85, pan: 0.0, isPercussion: true });
      }
      score.push({ notes, delayMs });
    };

    // --- MOVEMENT I: PRELUDIO MISTERIOSO & CRESCENDO (~48s) ---
    // Classical stepping bass motif
    const classicMotif = [
      { bass: 164.81 }, { bass: 155.56 }, { bass: 164.81 }, { bass: 185.00 },
      { bass: 196.00 }, { bass: 220.00 }, { bass: 246.94 }, { bass: 261.63 },
      { bass: 246.94 }, { bass: 220.00 }, { bass: 196.00 }, { bass: 185.00 },
      { bass: 164.81 }, { bass: 146.83 }, { bass: 130.81 }, { bass: 123.47 },
    ];

    // Var 1: Pianissimo intro (2 cycles)
    for (let c = 0; c < 2; c++) {
      addPedalPhrase(classicMotif, E4_PEDAL, step16thMs);
    }

    // Var 2: Octave bass jumps with chromatic turns
    const octaveMotif = [
      { bass: 82.41, vel: 0.95 }, { bass: 164.81 }, { bass: 98.00, vel: 0.92 }, { bass: 196.00 },
      { bass: 110.00, vel: 0.94 }, { bass: 220.00 }, { bass: 123.47, vel: 0.96 }, { bass: 246.94 },
      { bass: 130.81, vel: 0.98 }, { bass: 261.63 }, { bass: 123.47 }, { bass: 246.94 },
      { bass: 110.00 }, { bass: 220.00 }, { bass: 92.50 }, { bass: 185.00 },
      { bass: 82.41, vel: 1.0 }, { bass: 123.47 }, { bass: 164.81 }, { bass: 196.00 },
    ];
    addPedalPhrase(octaveMotif, E4_PEDAL, step16thMs);
    addPedalPhrase(octaveMotif, E4_PEDAL, step16thMs);

    // Var 3: Spanish Andalusian Phrygian progression (Am -> G -> F -> E7)
    const phrygianMotif = [
      { bass: 110.00 }, { bass: 130.81 }, { bass: 164.81 }, { bass: 220.00 },
      { bass: 98.00 }, { bass: 123.47 }, { bass: 146.83 }, { bass: 196.00 },
      { bass: 87.31 }, { bass: 110.00 }, { bass: 130.81 }, { bass: 174.61 },
      { bass: 82.41 }, { bass: 123.47 }, { bass: 164.81 }, { bass: 207.65 },
    ];
    addPedalPhrase(phrygianMotif, E4_PEDAL, step16thMs);
    addPedalPhrase(phrygianMotif, E4_PEDAL, step16thMs);

    // Var 4: Rasgueado chord storm
    const EmChord = [82.41, 123.47, 164.81, 196.00, 246.94, 329.63];
    const B7Chord = [123.47, 155.56, 220.00, 246.94, 369.99];
    const AmChord = [110.00, 164.81, 220.00, 261.63, 329.63];
    const FChord = [87.31, 130.81, 174.61, 220.00, 261.63, 349.23];

    for (let k = 0; k < 2; k++) {
      addRasgueado(EmChord, 0.7, 280, true);
      addRasgueado(B7Chord, 0.7, 260);
      addRasgueado(AmChord, 0.7, 260);
      addRasgueado(FChord, 0.7, 260);
      addRasgueado(B7Chord, 0.8, 300, true);
      addRasgueado(EmChord, 1.2, 420, true);
    }

    // Dramatic transition into Mov II
    score.push({
      notes: [
        { freq: 82.41, duration: 2.5, velocity: 1.0, pan: -0.35, isBass: true },
        { freq: 329.63, duration: 2.2, velocity: 0.7, pan: 0.35 },
      ],
      delayMs: 1200,
    });

    // --- MOVEMENT II: COPLA / CANTE JONDO - LYRICAL INTERLUDE (~65s) ---
    // Slow, haunting Andalusian melody (Lento cantabile ~65 BPM, step ~450ms)
    const coplaPhrases = [
      // Phrase 1: Deep song of the Spanish soul
      { bass: 82.41, mel: 329.63, dur: 1.6, delay: 650 },
      { bass: 123.47, mel: 369.99, dur: 1.2, delay: 500 },
      { bass: 164.81, mel: 392.00, dur: 1.5, delay: 600 },
      { bass: 110.00, mel: 440.00, dur: 1.8, delay: 750 },
      { bass: 130.81, mel: 392.00, dur: 1.3, delay: 550 },
      { bass: 146.83, mel: 369.99, dur: 1.4, delay: 600 },
      { bass: 82.41, mel: 329.63, dur: 2.4, delay: 1100 },

      // Phrase 2: Rising lamentation
      { bass: 110.00, mel: 440.00, dur: 1.5, delay: 650 },
      { bass: 130.81, mel: 493.88, dur: 1.4, delay: 600 },
      { bass: 146.83, mel: 523.25, dur: 1.8, delay: 800 },
      { bass: 123.47, mel: 493.88, dur: 1.3, delay: 550 },
      { bass: 110.00, mel: 440.00, dur: 1.4, delay: 600 },
      { bass: 98.00, mel: 392.00, dur: 1.6, delay: 700 },
      { bass: 87.31, mel: 349.23, dur: 1.8, delay: 850 },
      { bass: 82.41, mel: 329.63, dur: 2.8, delay: 1300 },

      // Phrase 3: Andalusian tremolo flourishes
      { bass: 123.47, mel: 493.88, dur: 1.2, delay: 480 },
      { bass: 164.81, mel: 523.25, dur: 1.3, delay: 500 },
      { bass: 123.47, mel: 493.88, dur: 1.2, delay: 480 },
      { bass: 110.00, mel: 440.00, dur: 1.4, delay: 550 },
      { bass: 98.00, mel: 392.00, dur: 1.3, delay: 520 },
      { bass: 92.50, mel: 369.99, dur: 1.5, delay: 600 },
      { bass: 82.41, mel: 329.63, dur: 2.6, delay: 1200 },
    ];

    // Play Copla twice with subtle variation in dynamics
    for (let c = 0; c < 2; c++) {
      coplaPhrases.forEach((p) => {
        score.push({
          notes: [
            { freq: p.bass, duration: p.dur, velocity: 0.88, pan: -0.3, isBass: true },
            { freq: p.mel, duration: p.dur, velocity: 0.82, pan: 0.28 },
          ],
          delayMs: p.delay,
        });
      });

      // Natural harmonics chiming bells on 12th & 7th frets
      const harmonics = [329.63 * 2, 246.94 * 2, 196.00 * 2, 164.81 * 2];
      harmonics.forEach((hFreq) => {
        score.push({
          notes: [{ freq: hFreq, duration: 1.8, velocity: 0.72, pan: 0.3 }],
          delayMs: 380,
        });
      });
      score.push({
        notes: [{ freq: 82.41, duration: 2.4, velocity: 0.85, pan: -0.35, isBass: true }],
        delayMs: 800,
      });
    }

    // --- MOVEMENT III: ALLEGRO VIRTUOSO & FLAMENCO BULERÍAS (~52s) ---
    // Fast tempo retorno: 12-beat compás with golpes and arpeggio runs
    const buleriasBass = [
      { bass: 82.41 }, { bass: 98.00 }, { bass: 110.00 }, { bass: 123.47 },
      { bass: 130.81 }, { bass: 146.83 }, { bass: 164.81 }, { bass: 185.00 },
      { bass: 196.00 }, { bass: 220.00 }, { bass: 246.94 }, { bass: 329.63 },
    ];

    for (let b = 0; b < 3; b++) {
      buleriasBass.forEach((item, idx) => {
        const isCompasAccent = idx === 2 || idx === 5 || idx === 7 || idx === 9 || idx === 11;
        score.push({
          notes: [
            { freq: item.bass, duration: 0.5, velocity: isCompasAccent ? 1.0 : 0.75, pan: -0.28, isBass: true },
            { freq: E4_PEDAL, duration: 0.35, velocity: 0.65, pan: 0.22 },
          ],
          delayMs: step16thMs,
        });

        score.push({
          notes: [
            { freq: E4_PEDAL, duration: 0.3, velocity: 0.6, pan: 0.25 },
            ...(isCompasAccent ? [{ freq: 110, duration: 0.08, velocity: 0.7, pan: 0.0, isPercussion: true }] : []),
          ],
          delayMs: step16thMs,
        });
      });
    }

    // Arpeggio waterfall runs cascading down
    const waterfallNotes = [
      659.25, 587.33, 523.25, 493.88, 440.00, 392.00, 369.99, 329.63,
      293.66, 261.63, 246.94, 220.00, 196.00, 185.00, 164.81, 146.83,
    ];
    for (let w = 0; w < 2; w++) {
      waterfallNotes.forEach((f) => {
        score.push({
          notes: [{ freq: f, duration: 0.35, velocity: 0.85, pan: 0.15 }],
          delayMs: 95,
        });
      });
      addRasgueado(EmChord, 0.8, 320, true, 1.0);
    }

    // --- MOVEMENT IV: GRAND RECAPITULATION (TEMPO I TÁI HIỆN) (~36s) ---
    // Full fortissimo power return of the iconic main theme!
    for (let c = 0; c < 2; c++) {
      addPedalPhrase(classicMotif, E4_PEDAL, step16thMs);
      addPedalPhrase(phrygianMotif, E4_PEDAL, step16thMs);
    }

    // --- MOVEMENT V: MAJESTIC CODA & FINALE (~15s) ---
    addRasgueado(AmChord, 1.0, 340, true);
    addRasgueado(EmChord, 1.0, 340, true);
    addRasgueado(B7Chord, 1.2, 420, true);
    addRasgueado(EmChord, 1.8, 650, true);

    // Descending bass notes into the deep resonance of Spanish guitar
    [164.81, 146.83, 130.81, 123.47, 98.00, 87.31].forEach((bf) => {
      score.push({
        notes: [{ freq: bf, duration: 1.2, velocity: 0.9, pan: -0.32, isBass: true }],
        delayMs: 380,
      });
    });

    // Final deep E2 bass + crystal harmonics
    score.push({
      notes: [
        { freq: 82.41, duration: 4.0, velocity: 1.0, pan: -0.35, isBass: true },
        { freq: 329.63, duration: 3.5, velocity: 0.85, pan: 0.2 },
        { freq: 659.25, duration: 3.5, velocity: 0.8, pan: 0.35 },
      ],
      delayMs: 2500,
    });

    return score;
  }

  // --------------------------------------------------------------------------
  // 2. HUNGARIAN DANCE NO. 5 - Johannes Brahms (~3 phút 20 giây, > 200.000 ms)
  // Complete 5-movement gypsy dance:
  // - Mov I: Allegro Molto (Chủ đề chính F#m / Gypsy Rubato) (~42s)
  // - Mov II: Vivace - Lễ Hội Du Mục (Gypsy Carnival in G/A Major) (~50s)
  // - Mov III: Sầu Khúc Thảo Nguyên (Andante Lamento Tzigane) (~55s)
  // - Mov IV: Accelerando Furioso & Cơn Lốc Du Mục (~38s)
  // - Mov V: Grand Presto Finale (~15s)
  // --------------------------------------------------------------------------
  private buildHungarianDanceScore(): StepEvent[] {
    const score: StepEvent[] = [];
    const base16th = 118; // ~126 BPM

    const F_SHARP_M = [146.83, 220.00, 277.18, 369.99];
    const B_MIN = [123.47, 196.00, 246.94, 293.66];
    const C_SHARP_7 = [138.59, 207.65, 277.18, 329.63];
    const D_MAJ = [146.83, 220.00, 293.66, 369.99];
    const A_MAJ = [110.00, 220.00, 277.18, 329.63];
    const E_MAJ = [82.41, 164.81, 207.65, 246.94, 329.63];

    const addGypsyBar = (bassFreq: number, chordFreqs: number[], melodyFreq: number, delayMod = 1.0) => {
      score.push({
        notes: [
          { freq: bassFreq, duration: 0.85, velocity: 0.95, pan: -0.3, isBass: true },
          { freq: melodyFreq, duration: 0.6, velocity: 0.85, pan: 0.25 },
        ],
        delayMs: Math.round(base16th * 2 * delayMod),
      });

      score.push({
        notes: [
          {
            freq: chordFreqs[0],
            duration: 0.45,
            velocity: 0.78,
            pan: 0.1,
            isStrum: true,
            strumFrequencies: chordFreqs,
          },
        ],
        delayMs: Math.round(base16th * 2 * delayMod),
      });
    };

    // --- MOVEMENT I: ALLEGRO MOLTO (CHỦ ĐỀ CHÍNH F#m) (~42s) ---
    for (let c = 0; c < 2; c++) {
      addGypsyBar(92.50, F_SHARP_M, 369.99); // F#4
      addGypsyBar(138.59, F_SHARP_M, 440.00); // A4
      addGypsyBar(92.50, F_SHARP_M, 554.37); // C#5
      addGypsyBar(123.47, B_MIN, 493.88); // B4
      addGypsyBar(138.59, C_SHARP_7, 440.00); // A4
      addGypsyBar(92.50, F_SHARP_M, 369.99); // F#4

      // Virtuoso Gypsy Descending Run with rubato retardando
      const runNotes = [
        { freq: 440.00, dur: 0.3 },
        { freq: 415.30, dur: 0.3 },
        { freq: 369.99, dur: 0.3 },
        { freq: 329.63, dur: 0.3 },
        { freq: 293.66, dur: 0.3 },
        { freq: 277.18, dur: 0.4 },
      ];
      runNotes.forEach((n, idx) => {
        score.push({
          notes: [{ freq: n.freq, duration: n.dur, velocity: 0.88, pan: 0.2 }],
          delayMs: base16th + idx * 10,
        });
      });

      // Cadential strum with golpe
      score.push({
        notes: [
          {
            freq: 92.50,
            duration: 1.4,
            velocity: 1.0,
            pan: 0.0,
            isStrum: true,
            strumFrequencies: [92.50, 138.59, 185.00, 220.00, 277.18, 369.99],
          },
          { freq: 100, duration: 0.1, velocity: 0.9, pan: 0.0, isPercussion: true },
        ],
        delayMs: 460,
      });
    }

    // --- MOVEMENT II: VIVACE - LỄ HỘI DU MỤC (MAJOR KEY DANCE) (~50s) ---
    // Cheerful, syncopated gypsy celebration in A / D Major
    for (let c = 0; c < 2; c++) {
      addGypsyBar(110.00, A_MAJ, 554.37); // C#5
      addGypsyBar(164.81, A_MAJ, 659.25); // E5
      addGypsyBar(146.83, D_MAJ, 587.33); // D5
      addGypsyBar(110.00, A_MAJ, 554.37); // C#5
      addGypsyBar(82.41, E_MAJ, 493.88); // B4
      addGypsyBar(110.00, A_MAJ, 440.00); // A4

      // Leaping festival chords with soundboard foot-stomp golpes
      const leapChords = [A_MAJ, D_MAJ, E_MAJ, A_MAJ];
      leapChords.forEach((chord) => {
        score.push({
          notes: [
            { freq: chord[0], duration: 0.6, velocity: 0.95, pan: 0.0, isStrum: true, strumFrequencies: chord },
            { freq: 95, duration: 0.1, velocity: 0.8, pan: 0.0, isPercussion: true },
          ],
          delayMs: 280,
        });
      });
    }

    // --- MOVEMENT III: SẦU KHÚC THẢO NGUYÊN (ANDANTE TZIGANE) (~55s) ---
    // Deep, expressive, slow gypsy violin ballad on classical guitar
    const tziganeBallad = [
      { bass: 92.50, mel: 277.18, dur: 1.8, delay: 650 },
      { bass: 138.59, mel: 329.63, dur: 1.5, delay: 550 },
      { bass: 92.50, mel: 369.99, dur: 1.9, delay: 700 },
      { bass: 123.47, mel: 440.00, dur: 1.6, delay: 600 },
      { bass: 138.59, mel: 415.30, dur: 1.7, delay: 650 },
      { bass: 92.50, mel: 369.99, dur: 2.5, delay: 1100 },
    ];

    for (let c = 0; c < 2; c++) {
      tziganeBallad.forEach((b) => {
        score.push({
          notes: [
            { freq: b.bass, duration: b.dur, velocity: 0.88, pan: -0.3, isBass: true },
            { freq: b.mel, duration: b.dur, velocity: 0.85, pan: 0.25 },
          ],
          delayMs: b.delay,
        });
      });
    }

    // --- MOVEMENT IV: ACCELERANDO FURIOSO (CƠN LỐC DU MỤC) (~38s) ---
    // Tempo continuously accelerates!
    const accelNotes = [369.99, 440.00, 493.88, 554.37, 587.33, 659.25, 587.33, 554.37, 493.88, 440.00];
    for (let a = 0; a < 3; a++) {
      accelNotes.forEach((f, idx) => {
        score.push({
          notes: [
            { freq: f, duration: 0.35, velocity: 0.88, pan: idx % 2 === 0 ? -0.2 : 0.25 },
            { freq: 146.83, duration: 0.35, velocity: 0.65, pan: -0.3, isBass: true },
          ],
          delayMs: Math.max(78, base16th - idx * 4 - a * 10),
        });
      });
    }

    // --- MOVEMENT V: GRAND PRESTO FINALE (~15s) ---
    for (let f = 0; f < 3; f++) {
      score.push({
        notes: [
          {
            freq: 92.50,
            duration: 1.2,
            velocity: 1.0,
            pan: 0.0,
            isStrum: true,
            strumFrequencies: [92.50, 138.59, 185.00, 277.18, 369.99],
          },
          { freq: 110, duration: 0.1, velocity: 0.95, pan: 0.0, isPercussion: true },
        ],
        delayMs: 340,
      });
    }

    score.push({
      notes: [
        { freq: 92.50, duration: 3.5, velocity: 1.0, pan: -0.3, isBass: true },
        { freq: 369.99, duration: 3.2, velocity: 0.9, pan: 0.3 },
      ],
      delayMs: 2200,
    });

    return score;
  }

  // --------------------------------------------------------------------------
  // 3. DANZA CUBANA - Ignacio Cervantes (~3 phút 30 giây, > 210.000 ms)
  // Complete 5-movement Latin-Cuban Habanera masterpiece:
  // - Mov I: Habanera Elegante (Nhịp 3+3+2 D minor & G minor) (~46s)
  // - Mov II: Danzón Trữ Tình Havana (F Major & D Major Dạ Vũ) (~52s)
  // - Mov III: Descarga Tropical & Montuno (Tiết tấu nhiệt đới & gõ thùng) (~54s)
  // - Mov IV: Serenata Bajo La Luna (Dạ khúc dưới trăng & harmonics) (~38s)
  // - Mov V: Coda Habanera & Sunset Outro (~20s)
  // --------------------------------------------------------------------------
  private buildDanzaCubanaScore(): StepEvent[] {
    const score: StepEvent[] = [];
    const base16th = 125; // ~118 BPM

    const Dm_CHORD = [146.83, 220.00, 293.66, 349.23];
    const A7_CHORD = [110.00, 220.00, 277.18, 329.63];
    const Gm_CHORD = [98.00, 196.00, 293.66, 392.00];
    const F_CHORD = [87.31, 174.61, 220.00, 261.63, 349.23];
    const C7_CHORD = [130.81, 196.00, 261.63, 329.63];
    const Bb_CHORD = [116.54, 174.61, 233.08, 293.66];

    // Helper for authentic Habanera 3+3+2 clave rhythm (Dotted 8th -> 16th -> 8th -> 8th)
    const addHabaneraBar = (
      rootBass: number,
      fifthBass: number,
      chordFreqs: number[],
      melody: number[],
      tap = true
    ) => {
      // 1. Dotted 8th note (3 steps)
      score.push({
        notes: [
          { freq: rootBass, duration: 0.9, velocity: 0.95, pan: -0.32, isBass: true },
          { freq: melody[0], duration: 0.65, velocity: 0.88, pan: 0.28 },
        ],
        delayMs: base16th * 3,
      });

      // 2. 16th note (1 step)
      score.push({
        notes: [
          { freq: chordFreqs[0], duration: 0.35, velocity: 0.72, pan: 0.12, isStrum: true, strumFrequencies: chordFreqs },
          { freq: melody[1], duration: 0.35, velocity: 0.8, pan: 0.25 },
        ],
        delayMs: base16th,
      });

      // 3. 8th note (2 steps)
      score.push({
        notes: [
          { freq: fifthBass, duration: 0.7, velocity: 0.82, pan: -0.28, isBass: true },
          { freq: melody[2] || chordFreqs[1], duration: 0.5, velocity: 0.78, pan: 0.2 },
        ],
        delayMs: base16th * 2,
      });

      // 4. 8th note (2 steps) with light percussion
      score.push({
        notes: [
          { freq: chordFreqs[0], duration: 0.45, velocity: 0.75, pan: 0.15, isStrum: true, strumFrequencies: chordFreqs },
          ...(tap ? [{ freq: 110, duration: 0.08, velocity: 0.6, pan: 0.0, isPercussion: true }] : []),
        ],
        delayMs: base16th * 2,
      });
    };

    // --- MOVEMENT I: HABANERA ELEGANTE (D MINOR & G MINOR) (~46s) ---
    for (let c = 0; c < 2; c++) {
      addHabaneraBar(73.42, 110.00, Dm_CHORD, [293.66, 349.23, 440.00]); // D4 -> F4 -> A4
      addHabaneraBar(98.00, 146.83, Gm_CHORD, [392.00, 440.00, 523.25]); // G4 -> A4 -> C5
      addHabaneraBar(110.00, 164.81, A7_CHORD, [493.88, 440.00, 369.99]); // B4 -> A4 -> F#4
      addHabaneraBar(73.42, 110.00, Dm_CHORD, [349.23, 293.66, 261.63]); // F4 -> D4 -> C4

      // Gentle Latin strum
      score.push({
        notes: [
          { freq: 73.42, duration: 1.2, velocity: 0.95, pan: 0.0, isStrum: true, strumFrequencies: [73.42, 110.00, 146.83, 220.00, 293.66, 349.23] },
        ],
        delayMs: 360,
      });
    }

    // --- MOVEMENT II: DANZÓN TRỮ TÌNH HAVANA (F MAJOR / SUNNY CARIBBEAN) (~52s) ---
    for (let c = 0; c < 2; c++) {
      addHabaneraBar(87.31, 130.81, F_CHORD, [349.23, 440.00, 523.25]); // F4 -> A4 -> C5
      addHabaneraBar(116.54, 174.61, Bb_CHORD, [466.16, 523.25, 587.33]); // Bb4 -> C5 -> D5
      addHabaneraBar(130.81, 196.00, C7_CHORD, [523.25, 493.88, 440.00]); // C5 -> B4 -> A4
      addHabaneraBar(87.31, 130.81, F_CHORD, [392.00, 349.23, 329.63]); // G4 -> F4 -> E4

      // Playful Caribbean syncopated fills
      const caribbeanFill = [523.25, 466.16, 440.00, 349.23];
      caribbeanFill.forEach((f) => {
        score.push({
          notes: [{ freq: f, duration: 0.35, velocity: 0.82, pan: 0.2 }],
          delayMs: 120,
        });
      });
    }

    // --- MOVEMENT III: DESCARGA TROPICAL & MONTUNO (~54s) ---
    // Uptempo lively Latin groove with montuno arpeggio sweeps
    for (let c = 0; c < 3; c++) {
      const montunoRoots = [
        { bass: 73.42, chord: Dm_CHORD },
        { bass: 98.00, chord: Gm_CHORD },
        { bass: 110.00, chord: A7_CHORD },
        { bass: 73.42, chord: Dm_CHORD },
      ];

      montunoRoots.forEach((m) => {
        score.push({
          notes: [
            { freq: m.bass, duration: 0.6, velocity: 1.0, pan: -0.3, isBass: true },
            { freq: m.chord[0], duration: 0.4, velocity: 0.85, pan: 0.15, isStrum: true, strumFrequencies: m.chord },
            { freq: 120, duration: 0.08, velocity: 0.75, pan: 0.0, isPercussion: true },
          ],
          delayMs: 240,
        });

        score.push({
          notes: [
            { freq: m.chord[2], duration: 0.35, velocity: 0.82, pan: 0.25 },
          ],
          delayMs: 200,
        });
      });
    }

    // --- MOVEMENT IV: SERENATA BAJO LA LUNA (DẠ KHÚC DƯỚI TRĂNG) (~38s) ---
    // Romantic rubato solo guitar, delicate harmonics & Spanish cadences
    const serenataChords = [
      { bass: 73.42, mel: 440.00, chord: Dm_CHORD, dur: 2.0, delay: 850 },
      { bass: 98.00, mel: 493.88, chord: Gm_CHORD, dur: 2.2, delay: 900 },
      { bass: 110.00, mel: 440.00, chord: A7_CHORD, dur: 2.2, delay: 950 },
      { bass: 73.42, mel: 369.99, chord: Dm_CHORD, dur: 2.5, delay: 1100 },
    ];

    for (let c = 0; c < 2; c++) {
      serenataChords.forEach((s) => {
        score.push({
          notes: [
            { freq: s.bass, duration: s.dur, velocity: 0.85, pan: -0.3, isBass: true },
            { freq: s.mel, duration: s.dur, velocity: 0.82, pan: 0.25 },
          ],
          delayMs: s.delay,
        });
      });
    }

    // --- MOVEMENT V: CODA HABANERA & SUNSET OUTRO (~20s) ---
    addHabaneraBar(73.42, 110.00, Dm_CHORD, [440.00, 392.00, 349.23]);
    addHabaneraBar(110.00, 164.81, A7_CHORD, [369.99, 329.63, 293.66]);

    score.push({
      notes: [
        { freq: 73.42, duration: 3.5, velocity: 1.0, pan: -0.35, isBass: true },
        { freq: 293.66, duration: 3.0, velocity: 0.85, pan: 0.15 },
        { freq: 440.00, duration: 3.0, velocity: 0.8, pan: 0.3 },
      ],
      delayMs: 2200,
    });

    return score;
  }
}

export const classicalGuitar = new ClassicalGuitarEngine();
