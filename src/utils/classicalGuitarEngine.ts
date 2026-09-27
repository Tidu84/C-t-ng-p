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
// - 3 Iconic Masterpieces:
//   1. 🇪🇸 Asturias (Leyenda) - Isaac Albéniz
//   2. 🇭🇺 Hungarian Dance No. 5 - Johannes Brahms
//   3. 🇨🇺 Danza Cubana - Ignacio Cervantes
// ============================================================================

export type ClassicalGuitarTrackId = 'leyenda' | 'hungarian' | 'cuba';

export interface ClassicalGuitarTrackInfo {
  id: ClassicalGuitarTrackId;
  title: string;
  composer: string;
  genre: string;
  icon: string;
  bpm: number;
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
    description: 'Nốt trầm dồn dập, nốt Mi ngân liên hồi và quạt chả Rasgueado bốc lửa',
  },
  {
    id: 'hungarian',
    title: 'Vũ Khúc Hungary Số 5',
    composer: 'Johannes Brahms',
    genre: 'Vũ Khúc Gypsy Cổ Điển',
    icon: '🇭🇺',
    bpm: 126,
    description: 'Tiết tấu biến hóa lúc trầm tư lúc bùng nổ, rải ngón réo rắt lôi cuốn',
  },
  {
    id: 'cuba',
    title: 'Danza Cubana (Vũ Điệu Cuba)',
    composer: 'Ignacio Cervantes',
    genre: 'Guitar La-tinh Nồng Cháy',
    icon: '🇨🇺',
    bpm: 118,
    description: 'Giai điệu Habanera nhịp 3+3+2 say đắm, hợp âm ấm áp và gõ thùng sống động',
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
    // Resonance frequency of Spanish classical guitar soundboard (approx 380 - 460Hz)
    bodyFilter.frequency.setValueAtTime(isBass ? 210 : 420, time);
    bodyFilter.Q.setValueAtTime(isBass ? 2.4 : 3.2, time);

    const stringFilter = ctx.createBiquadFilter();
    stringFilter.type = 'lowpass';
    // Dynamic damping: high frequencies decay rapidly in nylon strings
    const cutoff = isBass ? freq * 3.8 : Math.min(freq * 5.2, 5200);
    stringFilter.frequency.setValueAtTime(cutoff, time);
    stringFilter.frequency.exponentialRampToValueAtTime(
      Math.max(freq * 1.2, 220),
      time + Math.min(duration, 0.45)
    );

    // 3. Pluck Transient (Móng gảy tiếp xúc bề mặt dây tơ - Fingernail / Plectrum strike)
    const nailOsc = ctx.createOscillator();
    const nailGain = ctx.createGain();
    nailOsc.type = 'sine';
    nailOsc.frequency.setValueAtTime(isBass ? 950 : 2600, time);
    nailGain.gain.setValueAtTime(0.0001, time);
    nailGain.gain.linearRampToValueAtTime(velocity * 0.42, time + 0.003);
    nailGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.016);

    // 4. Amplitude Envelope (Quick attack, exponential decay with natural sustain)
    gainNode.gain.setValueAtTime(0.0001, time);
    gainNode.gain.linearRampToValueAtTime(velocity * 0.75, time + 0.005);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, time + duration);

    // 5. Stereo Panner for authentic spatial acoustic imaging
    let panner: StereoPannerNode | null = null;
    if (ctx.createStereoPanner) {
      try {
        panner = ctx.createStereoPanner();
        panner.pan.setValueAtTime(Math.max(-0.85, Math.min(0.85, pan)), time);
      } catch {}
    }

    // Connect audio nodes
    osc1.connect(stringFilter);
    osc2.connect(stringFilter);
    stringFilter.connect(bodyFilter);
    bodyFilter.connect(gainNode);

    nailOsc.connect(nailGain);

    if (panner) {
      gainNode.connect(panner);
      nailGain.connect(panner);
      panner.connect(this.masterGain);
      if (this.reverbConvolver) {
        panner.connect(this.reverbConvolver);
      }
    } else {
      gainNode.connect(this.masterGain);
      nailGain.connect(this.masterGain);
      if (this.reverbConvolver) {
        gainNode.connect(this.reverbConvolver);
      }
    }

    osc1.start(time);
    osc2.start(time);
    nailOsc.start(time);

    const stopTime = time + duration + 0.08;
    osc1.stop(stopTime);
    osc2.stop(stopTime);
    nailOsc.stop(time + 0.02);
  }

  // Flamenco Soundboard Golpe (Gõ thùng đàn gỗ)
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
  // COMPOSITION SCORES GENERATION
  // ==========================================================================
  private initScores() {
    this.trackScores.leyenda = this.buildAsturiasScore();
    this.trackScores.hungarian = this.buildHungarianDanceScore();
    this.trackScores.cuba = this.buildDanzaCubanaScore();
  }

  // --- 1. ASTURIAS (LEYENDA) - Isaac Albéniz ---
  // Key: E minor / A minor, 16th-note relentless pedal on E4 (329.63Hz)
  // Dynamic Spanish progression with fiery rasgueado chords!
  private buildAsturiasScore(): StepEvent[] {
    const score: StepEvent[] = [];
    const step16thMs = 112; // ~134 BPM 16th notes

    const E4_PEDAL = 329.63; // E4 pedal note

    // Iconic bass motif notes
    const bassMotif = [
      { bass: 164.81 }, // E3
      { bass: 155.56 }, // D#3
      { bass: 164.81 }, // E3
      { bass: 185.00 }, // F#3
      { bass: 196.00 }, // G3
      { bass: 220.00 }, // A3
      { bass: 246.94 }, // B3
      { bass: 261.63 }, // C4
      { bass: 246.94 }, // B3
      { bass: 220.00 }, // A3
      { bass: 196.00 }, // G3
      { bass: 185.00 }, // F#3
      { bass: 164.81 }, // E3
      { bass: 146.83 }, // D3
      { bass: 130.81 }, // C3
      { bass: 123.47 }, // B2
    ];

    // Part A: 2 cycles of the intense pedal theme
    for (let c = 0; c < 2; c++) {
      bassMotif.forEach((item, idx) => {
        // Beat: Bass Note + Treble Pedal
        score.push({
          notes: [
            {
              freq: item.bass,
              duration: 0.65,
              velocity: 0.92,
              pan: -0.28, // Bass on the left
              isBass: true,
            },
            {
              freq: E4_PEDAL,
              duration: 0.45,
              velocity: 0.65,
              pan: 0.22, // Pedal on the right
            },
          ],
          delayMs: step16thMs,
        });

        // 16th Subdivision: Just the pedal note on high E
        score.push({
          notes: [
            {
              freq: E4_PEDAL,
              duration: 0.38,
              velocity: 0.58 + (idx % 2 === 0 ? 0.08 : 0),
              pan: 0.25,
            },
          ],
          delayMs: step16thMs,
        });
      });
    }

    // Part B: Fiery Flamenco Rasgueado Chords & Golpe!
    const rasgueadoChords = [
      // Em chord [E2, B2, E3, G3, B3, E4]
      { freqs: [82.41, 123.47, 164.81, 196.0, 246.94, 329.63], dur: 0.9, delay: 280 },
      // B7 chord [B2, D#3, A3, B3, F#4]
      { freqs: [123.47, 155.56, 220.0, 246.94, 369.99], dur: 0.8, delay: 260 },
      // Am chord [A2, E3, A3, C4, E4]
      { freqs: [110.0, 164.81, 220.0, 261.63, 329.63], dur: 0.8, delay: 260 },
      // Em chord with percussive golpe
      { freqs: [82.41, 123.47, 164.81, 196.0, 246.94], dur: 1.2, delay: 380, golpe: true },
    ];

    rasgueadoChords.forEach((chord) => {
      const notes: NoteEvent[] = [
        {
          freq: chord.freqs[0],
          duration: chord.dur,
          velocity: 0.95,
          pan: 0.0,
          isStrum: true,
          strumFrequencies: chord.freqs,
        },
      ];
      if (chord.golpe) {
        notes.push({
          freq: 120,
          duration: 0.1,
          velocity: 0.85,
          pan: 0.0,
          isPercussion: true,
        });
      }
      score.push({
        notes,
        delayMs: chord.delay,
      });
    });

    // Dramatic pause and deep bass resonance
    score.push({
      notes: [
        {
          freq: 82.41, // Low E2 bass
          duration: 2.2,
          velocity: 1.0,
          pan: -0.32,
          isBass: true,
        },
        {
          freq: 329.63, // High E4 harmonic
          duration: 2.0,
          velocity: 0.75,
          pan: 0.32,
        },
      ],
      delayMs: 650,
    });

    return score;
  }

  // --- 2. HUNGARIAN DANCE NO. 5 - Johannes Brahms ---
  // Key: F# minor / E minor, Allegro vivace with gypsy rubato
  private buildHungarianDanceScore(): StepEvent[] {
    const score: StepEvent[] = [];
    const base16th = 118; // ~126 BPM

    // Gypsy rhythmic accompaniment: Bass Note -> Chord Strum -> Chord Strum
    const addGypsyBar = (bassFreq: number, chordFreqs: number[], melodyFreq: number) => {
      // Beat 1: Strong Bass + Melody start
      score.push({
        notes: [
          { freq: bassFreq, duration: 0.85, velocity: 0.95, pan: -0.3, isBass: true },
          { freq: melodyFreq, duration: 0.6, velocity: 0.85, pan: 0.25 },
        ],
        delayMs: base16th * 2,
      });

      // Beat 2: Gypsy rhythm chord strum
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
        delayMs: base16th * 2,
      });
    };

    // Melody phrase 1: The famous opening theme
    // F#m chord: [F#2, C#3, F#3, A3, C#4]
    const F_SHARP_M = [146.83, 220.0, 277.18, 369.99];
    const B_MIN = [123.47, 196.0, 246.94, 293.66];
    const C_SHARP_7 = [138.59, 207.65, 277.18, 329.63];

    addGypsyBar(92.5, F_SHARP_M, 369.99); // F#4
    addGypsyBar(138.59, F_SHARP_M, 440.0); // A4
    addGypsyBar(92.5, F_SHARP_M, 554.37); // C#5
    addGypsyBar(123.47, B_MIN, 493.88); // B4

    // Virtuoso Fast Descending Gypsy Run (Trill / Scale)
    const runNotes = [
      { freq: 440.0, dur: 0.3 }, // A4
      { freq: 415.3, dur: 0.3 }, // G#4
      { freq: 369.99, dur: 0.3 }, // F#4
      { freq: 329.63, dur: 0.3 }, // E4
      { freq: 293.66, dur: 0.3 }, // D4
      { freq: 277.18, dur: 0.4 }, // C#4
    ];

    runNotes.forEach((n) => {
      score.push({
        notes: [{ freq: n.freq, duration: n.dur, velocity: 0.88, pan: 0.2 }],
        delayMs: base16th,
      });
    });

    // Passionate cadential strum with golpe!
    score.push({
      notes: [
        {
          freq: 92.5,
          duration: 1.4,
          velocity: 1.0,
          pan: 0.0,
          isStrum: true,
          strumFrequencies: [92.5, 138.59, 185.0, 220.0, 277.18, 369.99],
        },
        { freq: 100, duration: 0.1, velocity: 0.9, pan: 0.0, isPercussion: true },
      ],
      delayMs: 420,
    });

    // Accelerando section (bốc lửa hơn!)
    const accelNotes = [369.99, 440.0, 493.88, 554.37, 587.33, 554.37, 493.88, 440.0];
    accelNotes.forEach((f, idx) => {
      score.push({
        notes: [
          { freq: f, duration: 0.35, velocity: 0.85 + (idx % 2) * 0.1, pan: idx % 2 === 0 ? -0.15 : 0.25 },
          { freq: 146.83, duration: 0.35, velocity: 0.6, pan: -0.25, isBass: true },
        ],
        delayMs: Math.max(90, base16th - idx * 4), // dynamic accelerando
      });
    });

    return score;
  }

  // --- 3. DANZA CUBANA - Ignacio Cervantes / Latin Guitar ---
  // Key: D minor, Afro-Cuban Habanera syncopation (3+3+2 clave)
  private buildDanzaCubanaScore(): StepEvent[] {
    const score: StepEvent[] = [];
    const base16th = 125; // ~118 BPM

    // Habanera bass pattern: Dotted 8th (3), 16th (1), 8th (2), 8th (2)
    const Dm_CHORD = [146.83, 220.0, 293.66, 349.23];
    const A7_CHORD = [110.0, 220.0, 277.18, 329.63];
    const Gm_CHORD = [98.0, 196.0, 293.66, 392.0];

    const addHabaneraBar = (
      rootBass: number,
      fifthBass: number,
      chordFreqs: number[],
      melody: number[]
    ) => {
      // 1. Dotted 8th note (3 steps)
      score.push({
        notes: [
          { freq: rootBass, duration: 0.9, velocity: 0.95, pan: -0.32, isBass: true },
          { freq: melody[0], duration: 0.6, velocity: 0.88, pan: 0.28 },
        ],
        delayMs: base16th * 3,
      });

      // 2. 16th note (1 step)
      score.push({
        notes: [
          {
            freq: chordFreqs[0],
            duration: 0.35,
            velocity: 0.72,
            pan: 0.12,
            isStrum: true,
            strumFrequencies: chordFreqs,
          },
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
          {
            freq: chordFreqs[0],
            duration: 0.45,
            velocity: 0.75,
            pan: 0.15,
            isStrum: true,
            strumFrequencies: chordFreqs,
          },
          { freq: 110, duration: 0.08, velocity: 0.6, pan: 0.0, isPercussion: true },
        ],
        delayMs: base16th * 2,
      });
    };

    // Cycle 1: Dm
    addHabaneraBar(73.42, 110.0, Dm_CHORD, [293.66, 349.23, 440.0]); // D4 -> F4 -> A4
    // Cycle 2: Gm
    addHabaneraBar(98.0, 146.83, Gm_CHORD, [392.0, 440.0, 523.25]); // G4 -> A4 -> C5
    // Cycle 3: A7
    addHabaneraBar(110.0, 164.81, A7_CHORD, [493.88, 440.0, 369.99]); // B4 -> A4 -> F#4
    // Cycle 4: Dm resolution with flourish
    addHabaneraBar(73.42, 110.0, Dm_CHORD, [349.23, 293.66, 261.63]); // F4 -> D4 -> C4

    // Energetic Latin strum burst
    score.push({
      notes: [
        {
          freq: 73.42,
          duration: 1.5,
          velocity: 1.0,
          pan: 0.0,
          isStrum: true,
          strumFrequencies: [73.42, 110.0, 146.83, 220.0, 293.66, 349.23],
        },
      ],
      delayMs: 400,
    });

    return score;
  }
}

export const classicalGuitar = new ClassicalGuitarEngine();
