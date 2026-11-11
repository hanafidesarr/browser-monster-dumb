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
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    // Filtered noise buffer
    const bufferSize = this.ctx.sampleRate * 0.25;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(300, now);
    filter.frequency.exponentialRampToValueAtTime(1200, now + 0.12);
    filter.frequency.exponentialRampToValueAtTime(250, now + 0.25);
    filter.Q.setValueAtTime(3.5, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.4, now + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    noise.start(now);
    noise.stop(now + 0.26);
  }

  // Bat Impact (Violent bone-crunching hit)
  public playBatImpact(): void {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    // Thud
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

    // Crack / Crunch
    const bufferSize = this.ctx.sampleRate * 0.15;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.15));
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const crackFilter = this.ctx.createBiquadFilter();
    crackFilter.type = 'highpass';
    crackFilter.frequency.setValueAtTime(1200, now);

    const crackGain = this.ctx.createGain();
    crackGain.gain.setValueAtTime(0.6, now);
    crackGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    noise.connect(crackFilter);
    crackFilter.connect(crackGain);
    crackGain.connect(this.sfxGain);

    noise.start(now);
    noise.stop(now + 0.16);
  }

  // Monster Bloodcurdling Scream (FM synth screech)
  public playMonsterScream(): void {
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
}
