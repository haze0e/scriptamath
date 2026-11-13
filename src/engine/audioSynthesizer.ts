/**
 * audioSynthesizer.ts
 * 
 * Procedural Web Audio API sound engine that synthesizes realistic,
 * organic handwriting sounds (pencil scratch, fountain pen nib friction, ballpoint glide)
 * in real-time without requiring any external audio files or network requests.
 */

import { PenStyle } from '../types';

class WritingAudioSynthesizer {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private masterGain: GainNode | null = null;
  private noiseBuffers: Map<string, AudioBuffer> = new Map();

  constructor() {
    // AudioContext will be lazily initialized on first user gesture
  }

  private initContext(): boolean {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      return true;
    }

    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return false;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.25, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
      this.generateNoiseBuffers();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Pre-generates short noise buffers with subtle grain texture
   */
  private generateNoiseBuffers() {
    if (!this.ctx) return;

    const sampleRate = this.ctx.sampleRate;
    const duration = 0.5; // 500ms pool
    const frameCount = sampleRate * duration;

    // 1. White / Pink noise buffer for paper grain friction
    const noiseBuffer = this.ctx.createBuffer(1, frameCount, sampleRate);
    const data = noiseBuffer.getChannelData(0);

    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < frameCount; i++) {
      const white = Math.random() * 2 - 1;
      // Pink noise filter approximation (Paul Kellet's algorithm)
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      data[i] = (b0 + b1 + b2 + white * 0.5362) * 0.2;
    }

    this.noiseBuffers.set('grain', noiseBuffer);
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(muted ? 0 : 0.25, this.ctx.currentTime);
    }
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  /**
   * Plays a physical writing stroke sound matched to pen type
   */
  public playStrokeSound(penStyle: PenStyle = 'ballpoint', intensity = 1.0) {
    if (this.isMuted || intensity <= 0) return;
    if (!this.initContext() || !this.ctx || !this.masterGain) return;
    // Do not allocate and queue nodes if AudioContext is still suspended by browser autoplay policy
    if (this.ctx.state !== 'running') return;

    const grainBuffer = this.noiseBuffers.get('grain');
    if (!grainBuffer) return;

    const now = this.ctx.currentTime;
    const safeIntensity = Math.max(0.01, intensity);

    // Stroke duration between 40ms and 110ms with natural variation
    const strokeDuration = 0.04 + Math.random() * 0.07;
    const randomOffset = Math.random() * (grainBuffer.duration - strokeDuration - 0.01);

    // Create buffer source
    const source = this.ctx.createBufferSource();
    source.buffer = grainBuffer;

    // Filter tuned to pen mechanics
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';

    // Gain envelope node
    const gainNode = this.ctx.createGain();

    if (penStyle === 'fountain') {
      // Crisp metallic nib scratching on textured cotton bond
      filter.frequency.setValueAtTime(2800 + (Math.random() - 0.5) * 600, now);
      filter.Q.setValueAtTime(4.2, now);
      gainNode.gain.setValueAtTime(0.001, now);
      gainNode.gain.linearRampToValueAtTime(Math.max(0.002, 0.35 * safeIntensity), now + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + strokeDuration);
    } else if (penStyle === 'gel') {
      // Smooth rollerball ink glide with muffled friction
      filter.frequency.setValueAtTime(1600 + (Math.random() - 0.5) * 400, now);
      filter.Q.setValueAtTime(2.0, now);
      gainNode.gain.setValueAtTime(0.001, now);
      gainNode.gain.linearRampToValueAtTime(Math.max(0.002, 0.22 * safeIntensity), now + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + strokeDuration);
    } else {
      // Standard ballpoint / pencil graphite resistance
      filter.frequency.setValueAtTime(2200 + (Math.random() - 0.5) * 500, now);
      filter.Q.setValueAtTime(3.0, now);
      gainNode.gain.setValueAtTime(0.001, now);
      gainNode.gain.linearRampToValueAtTime(Math.max(0.002, 0.28 * safeIntensity), now + 0.012);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + strokeDuration);
    }

    // Connect audio graph: Source -> Bandpass Filter -> Stroke Envelope -> Master Gain -> Output
    source.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.masterGain);

    source.onended = () => {
      source.disconnect();
      filter.disconnect();
      gainNode.disconnect();
    };

    source.start(now, Math.max(0, randomOffset), strokeDuration);
  }
}

export const writingAudio = new WritingAudioSynthesizer();
