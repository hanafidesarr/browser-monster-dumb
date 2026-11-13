import { SettingsManager } from './SettingsManager.ts';

export class AudioManager {
  private static instance: AudioManager;
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private ambientOsc1: OscillatorNode | null = null;
  private ambientOsc2: OscillatorNode | null = null;
  private ambientGain: GainNode | null = null;
  private isMuted: boolean = false;
  private isInitialized: boolean = false;

  // Pocong Screaming Audio (loaded from user supplied pocong_scream.mp3)
  private pocongAudioBuffer: AudioBuffer | null = null;
  private isPocongAudioLoading: boolean = false;
  private lastPocongScreamTime: number = 0;

  private constructor() {}

  public static getInstance(): AudioManager {
    if (!AudioManager.instance) {
      AudioManager.instance = new AudioManager();
    }
    return AudioManager.instance;
  }

  public init(): void {
    if (this.isInitialized) return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();

      this.masterGain = this.ctx.createGain();
      this.sfxGain = this.ctx.createGain();
      this.musicGain = this.ctx.createGain();

      this.sfxGain.connect(this.masterGain);
      this.musicGain.connect(this.masterGain);
      this.masterGain.connect(this.ctx.destination);

      this.updateVolumes();
      this.isInitialized = true;
      this.loadPocongAudio();
    } catch (e) {
      console.warn('Web Audio not available:', e);
    }
  }

  public resume(): void {
    if (!this.ctx) this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public updateVolumes(): void {
    if (!this.masterGain || !this.sfxGain || !this.musicGain) return;
    const s = SettingsManager.getInstance().settings;
    const master = s.masterVolume / 100;
    const sfx = s.sfxVolume / 100;
    const music = s.musicVolume / 100;

    const now = this.ctx?.currentTime || 0;
    this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : master, now);
    this.sfxGain.gain.setValueAtTime(sfx, now);
    this.musicGain.gain.setValueAtTime(music * 0.4, now);
  }

  public startAmbience(): void {
    if (!this.ctx || !this.musicGain) return;
    if (this.ambientOsc1) return; // already playing

    const now = this.ctx.currentTime;
    
    // Sub-bass drone
    this.ambientOsc1 = this.ctx.createOscillator();
    this.ambientOsc1.type = 'sawtooth';
    this.ambientOsc1.frequency.setValueAtTime(45, now);

    const filter1 = this.ctx.createBiquadFilter();
    filter1.type = 'lowpass';
    filter1.frequency.setValueAtTime(90, now);

    this.ambientGain = this.ctx.createGain();
    this.ambientGain.gain.setValueAtTime(0.35, now);

    this.ambientOsc1.connect(filter1);
    filter1.connect(this.ambientGain);
    this.ambientGain.connect(this.musicGain);
    this.ambientOsc1.start();

    // Eerie wind / slow harmonic wave
    this.ambientOsc2 = this.ctx.createOscillator();
    this.ambientOsc2.type = 'sine';
    this.ambientOsc2.frequency.setValueAtTime(65, now);

    const filter2 = this.ctx.createBiquadFilter();
    filter2.type = 'bandpass';
    filter2.frequency.setValueAtTime(120, now);
    filter2.Q.setValueAtTime(4, now);

    this.ambientOsc2.connect(filter2);
    filter2.connect(this.ambientGain);
    this.ambientOsc2.start();
  }

  public stopAmbience(): void {
    if (this.ambientOsc1) {
      try { this.ambientOsc1.stop(); this.ambientOsc1.disconnect(); } catch (_) {}
      this.ambientOsc1 = null;
    }
    if (this.ambientOsc2) {
      try { this.ambientOsc2.stop(); this.ambientOsc2.disconnect(); } catch (_) {}
      this.ambientOsc2 = null;
    }
  }

  // Player Footstep (Light concrete thud)
  public playPlayerFootstep(isRunning: boolean = false): void {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(isRunning ? 95 : 80, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + 0.08);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(250, now);

    gain.gain.setValueAtTime(isRunning ? 0.22 : 0.14, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.1);
  }

  // Pocong Hop Landing Thud with Distance Attenuation (Heavy thump on moist earth)
  public playMonsterFootstep(distance: number): void {
    this.playPocongHop(distance);
  }

  public playPocongHop(distance: number): void {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    // Volume decreases with distance (audible up to 30m in the silent night)
    const maxDist = 30;
    const factor = Math.max(0, 1 - distance / maxDist);
    if (factor <= 0.01) return;

    // Sub-bass heavy earth impact thud
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(80, now);
    osc.frequency.exponentialRampToValueAtTime(26, now + 0.22);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(220, now);

    const vol = factor * 0.75;
    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.26);

    // Eerie cloth rustle on landing impact
    const rustleSize = Math.floor(this.ctx.sampleRate * 0.12);
    const rustleBuf = this.ctx.createBuffer(1, rustleSize, this.ctx.sampleRate);
    const rData = rustleBuf.getChannelData(0);
    for (let i = 0; i < rustleSize; i++) {
      rData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (rustleSize * 0.2));
    }
    const rustleSource = this.ctx.createBufferSource();
    rustleSource.buffer = rustleBuf;

    const rustleFilter = this.ctx.createBiquadFilter();
    rustleFilter.type = 'bandpass';
    rustleFilter.frequency.setValueAtTime(600, now);
    rustleFilter.Q.setValueAtTime(2.0, now);

    const rustleGain = this.ctx.createGain();
    rustleGain.gain.setValueAtTime(factor * 0.25, now);
    rustleGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    rustleSource.connect(rustleFilter);
    rustleFilter.connect(rustleGain);
    rustleGain.connect(this.sfxGain);

    rustleSource.start(now);
    rustleSource.stop(now + 0.13);
  }

  // Baseball Bat Swing Whoosh
  public playBatSwing(): void {
    this.playWeaponSwing('standard');
  }

  // Weapon Swing Whoosh depending on swing type
  public playWeaponSwing(type: 'standard' | 'heavy' | 'fast' | 'overhead' = 'standard'): void {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    const duration = type === 'heavy' ? 0.38 : type === 'fast' ? 0.18 : 0.25;
    const bufferSize = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';

    if (type === 'heavy' || type === 'overhead') {
      filter.frequency.setValueAtTime(180, now);
      filter.frequency.exponentialRampToValueAtTime(750, now + duration * 0.45);
      filter.frequency.exponentialRampToValueAtTime(160, now + duration);
      filter.Q.setValueAtTime(2.5, now);
    } else if (type === 'fast') {
      filter.frequency.setValueAtTime(600, now);
      filter.frequency.exponentialRampToValueAtTime(2200, now + duration * 0.45);
      filter.frequency.exponentialRampToValueAtTime(450, now + duration);
      filter.Q.setValueAtTime(4.0, now);
    } else {
      filter.frequency.setValueAtTime(300, now);
      filter.frequency.exponentialRampToValueAtTime(1200, now + duration * 0.45);
      filter.frequency.exponentialRampToValueAtTime(250, now + duration);
      filter.Q.setValueAtTime(3.5, now);
    }

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(type === 'heavy' ? 0.55 : 0.4, now + duration * 0.4);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    noise.start(now);
    noise.stop(now + duration + 0.02);
  }

  // Bat Impact (Violent bone-crunching hit)
  public playBatImpact(): void {
    this.playWeaponImpact('bat');
  }

  // Generic or weapon-specific impact sound
  public playWeaponImpact(sound: 'bat' | 'metallic' | 'slap' | 'wooden' | 'boing' | 'fan'): void {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    switch (sound) {
      case 'metallic': {
        // High-pitched ringing frying pan / metal sign "TENGGG!"
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const metalGain = this.ctx.createGain();
        const bandpass = this.ctx.createBiquadFilter();

        osc1.type = 'triangle';
        osc1.frequency.setValueAtTime(820, now);
        osc1.frequency.exponentialRampToValueAtTime(380, now + 0.45);

        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(1240, now);
        osc2.frequency.exponentialRampToValueAtTime(620, now + 0.55);

        bandpass.type = 'bandpass';
        bandpass.frequency.setValueAtTime(950, now);
        bandpass.Q.setValueAtTime(8, now);

        metalGain.gain.setValueAtTime(0.9, now);
        metalGain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

        osc1.connect(bandpass);
        osc2.connect(bandpass);
        bandpass.connect(metalGain);
        metalGain.connect(this.sfxGain);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 0.65);
        osc2.stop(now + 0.65);

        // Low iron thud
        const thud = this.ctx.createOscillator();
        const thudGain = this.ctx.createGain();
        thud.type = 'square';
        thud.frequency.setValueAtTime(140, now);
        thud.frequency.exponentialRampToValueAtTime(45, now + 0.15);
        thudGain.gain.setValueAtTime(0.6, now);
        thudGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
        thud.connect(thudGain);
        thudGain.connect(this.sfxGain);
        thud.start(now);
        thud.stop(now + 0.2);
        break;
      }

      case 'slap': {
        // Slipper or broom: sharp snappy slap "PLAAK!"
        const bufferSize = Math.floor(this.ctx.sampleRate * 0.12);
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.2));
        }
        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1800, now);
        filter.Q.setValueAtTime(2.0, now);

        const slapGain = this.ctx.createGain();
        slapGain.gain.setValueAtTime(0.95, now);
        slapGain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

        noise.connect(filter);
        filter.connect(slapGain);
        slapGain.connect(this.sfxGain);

        noise.start(now);
        noise.stop(now + 0.15);
        break;
      }

      case 'boing': {
        // Toy hammer: cartoon bouncing spring "BOOOING!"
        const osc = this.ctx.createOscillator();
        const lfo = this.ctx.createOscillator();
        const lfoGain = this.ctx.createGain();
        const boingGain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(180, now);
        osc.frequency.exponentialRampToValueAtTime(560, now + 0.35);

        lfo.type = 'sine';
        lfo.frequency.setValueAtTime(22, now); // 22Hz cartoon spring vibrato
        lfoGain.gain.setValueAtTime(45, now);
        lfo.connect(osc.frequency);

        boingGain.gain.setValueAtTime(0.85, now);
        boingGain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

        osc.connect(boingGain);
        boingGain.connect(this.sfxGain);

        lfo.start(now);
        osc.start(now);
        lfo.stop(now + 0.5);
        osc.stop(now + 0.5);
        break;
      }

      case 'wooden': {
        // Wooden chair: heavy hollow wooden thud & crack
        const osc = this.ctx.createOscillator();
        const thudGain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.exponentialRampToValueAtTime(60, now + 0.25);
        thudGain.gain.setValueAtTime(0.95, now);
        thudGain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
        osc.connect(thudGain);
        thudGain.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 0.3);
        break;
      }

      case 'fan': {
        // Electric fan: rattling mechanical clatter + heavy impact
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(160, now);
        osc.frequency.linearRampToValueAtTime(75, now + 0.22);
        gain.gain.setValueAtTime(0.7, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 0.3);
        break;
      }

      case 'bat':
      default: {
        // Standard bone-crunching bat hit
        const osc = this.ctx.createOscillator();
        osc.type = 'square';
        osc.frequency.setValueAtTime(180, now);
        osc.frequency.exponentialRampToValueAtTime(40, now + 0.2);

        const lowpass = this.ctx.createBiquadFilter();
        lowpass.type = 'lowpass';
        lowpass.frequency.setValueAtTime(350, now);

        const thudGain = this.ctx.createGain();
        thudGain.gain.setValueAtTime(0.8, now);
        thudGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

        osc.connect(lowpass);
        lowpass.connect(thudGain);
        thudGain.connect(this.sfxGain);

        osc.start(now);
        osc.stop(now + 0.26);
        break;
      }
    }
  }

  // Weapon Pickup Chime (Joyful ascending 3-note retro jingle)
  public playPickupWeapon(): void {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
    notes.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);

      gain.gain.setValueAtTime(0.35, now + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.22);

      osc.connect(gain);
      gain.connect(this.sfxGain!);

      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 0.25);
    });
  }

  // Load supplied Pocong Scream audio asset (/Users/hanafidesar/.../pocong_scream.mp3)
  public async loadPocongAudio(): Promise<void> {
    if (this.pocongAudioBuffer || this.isPocongAudioLoading) return;
    this.isPocongAudioLoading = true;

    const candidateUrls = [
      './audio/pocong_scream.mp3',
      './pocong_scream.mp3',
      '/audio/pocong_scream.mp3',
      '/pocong_scream.mp3',
    ];

    for (const url of candidateUrls) {
      try {
        const resp = await fetch(url);
        if (resp.ok) {
          const ab = await resp.arrayBuffer();
          if (!this.ctx) this.init();
          if (this.ctx) {
            this.pocongAudioBuffer = await this.ctx.decodeAudioData(ab);
            this.isPocongAudioLoading = false;
            return;
          }
        }
      } catch (_) {
        // Fallback to next candidate path
      }
    }
    this.isPocongAudioLoading = false;
  }

  // Play supplied Pocong scream audio (with anti-overlap cooldown & graceful fallback)
  public playPocongScream(force: boolean = false): void {
    if (!this.ctx || !this.sfxGain) {
      this.init();
      if (!this.ctx || !this.sfxGain) return;
    }
    this.resume();

    const now = this.ctx.currentTime;
    if (!force && (now - this.lastPocongScreamTime < 0.85)) {
      return; // Avoid repeated overlapping playback
    }
    this.lastPocongScreamTime = now;

    if (this.pocongAudioBuffer) {
      try {
        const source = this.ctx.createBufferSource();
        source.buffer = this.pocongAudioBuffer;

        const gainNode = this.ctx.createGain();
        gainNode.gain.setValueAtTime(1.0, now);

        source.connect(gainNode);
        gainNode.connect(this.sfxGain);
        source.start(now);
        return;
      } catch (err) {
        console.warn('Error playing pocong scream buffer:', err);
      }
    }

    // Graceful fallback to synthesized monster scream if audio buffer is not ready or failed
    this.playSyntheticMonsterScream();
  }

  // Standard monster scream event routed to Pocong sound
  public playMonsterScream(): void {
    this.playPocongScream(false);
  }

  // Monster Bloodcurdling Scream (FM synth screech fallback)
  private playSyntheticMonsterScream(): void {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    const carrier = this.ctx.createOscillator();
    const modulator = this.ctx.createOscillator();
    const modGain = this.ctx.createGain();
    const mainGain = this.ctx.createGain();
    const distortionFilter = this.ctx.createBiquadFilter();

    carrier.type = 'sawtooth';
    carrier.frequency.setValueAtTime(380, now);
    carrier.frequency.exponentialRampToValueAtTime(750, now + 0.3);
    carrier.frequency.exponentialRampToValueAtTime(260, now + 1.2);

    modulator.type = 'sine';
    modulator.frequency.setValueAtTime(45, now);
    modulator.frequency.linearRampToValueAtTime(80, now + 0.5);

    modGain.gain.setValueAtTime(300, now);
    modGain.gain.exponentialRampToValueAtTime(80, now + 1.2);

    modulator.connect(carrier.frequency);

    distortionFilter.type = 'peaking';
    distortionFilter.frequency.setValueAtTime(1400, now);
    distortionFilter.gain.setValueAtTime(12, now);
    distortionFilter.Q.setValueAtTime(3, now);

    mainGain.gain.setValueAtTime(0.7, now);
    mainGain.gain.linearRampToValueAtTime(0.85, now + 0.3);
    mainGain.gain.exponentialRampToValueAtTime(0.001, now + 1.3);

    carrier.connect(distortionFilter);
    distortionFilter.connect(mainGain);
    mainGain.connect(this.sfxGain);

    carrier.start(now);
    modulator.start(now);
    carrier.stop(now + 1.35);
    modulator.stop(now + 1.35);
  }

  // Jumpscare / Caught Horror Stinger
  public playCaughtStinger(): void {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    // Cluster dissonant chords
    const freqs = [110, 116.5, 123.5, 220, 233];
    freqs.forEach((f) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(f, now);
      osc.frequency.exponentialRampToValueAtTime(f * 0.7, now + 1.2);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.3);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 1.35);
    });
  }

  // Level Complete Fanfare / Release
  public playLevelComplete(): void {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    const chords = [
      { time: 0, f: [261.63, 329.63, 392.0] },      // C
      { time: 0.35, f: [349.23, 440.0, 523.25] },   // F
      { time: 0.75, f: [392.0, 493.88, 587.33, 783.99] }, // G resolved
    ];

    chords.forEach((c) => {
      c.f.forEach((freq) => {
        if (!this.ctx || !this.sfxGain) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + c.time);

        gain.gain.setValueAtTime(0.12, now + c.time);
        gain.gain.exponentialRampToValueAtTime(0.001, now + c.time + 0.8);

        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now + c.time);
        osc.stop(now + c.time + 0.85);
      });
    });
  }

  // UI Click sound
  public playUiClick(): void {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(300, now + 0.04);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.05);
  }

  // Wooden Bridge Creak Sound (Unstable Bridge Type B)
  private lastCreakTime: number = 0;
  public playWoodCreak(): void {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    if (now - this.lastCreakTime < 0.35) return; // throttle creaks
    this.lastCreakTime = now;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140 + Math.random() * 60, now);
    osc.frequency.linearRampToValueAtTime(80 + Math.random() * 40, now + 0.18);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(450, now);
    filter.Q.setValueAtTime(4.0, now);

    gain.gain.setValueAtTime(0.22, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.24);
  }

  // Recoverable Fall Impact Sound (Landing on lower floor)
  public playFallImpact(): void {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.exponentialRampToValueAtTime(35, now + 0.25);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(260, now);

    gain.gain.setValueAtTime(0.65, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.32);
  }

  // Fatal Fall Sound (Falling into void / death pit)
  public playFatalFall(): void {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    // Wind rush and deep descending drone
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + 1.2);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(600, now);
    filter.frequency.linearRampToValueAtTime(120, now + 1.2);

    gain.gain.setValueAtTime(0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.3);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 1.35);
  }
}
