import { createNoise2D } from 'simplex-noise';

// Simple fast seeded PRNG (Aleas or mulberry32)
export function createPRNG(seed: number) {
  let s = Math.floor(seed);
  return function () {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class SeededNoise {
  private noise2D: (x: number, y: number) => number;
  private prng: () => number;
  public seed: number;

  constructor(seed: number) {
    this.seed = seed;
    this.prng = createPRNG(seed);
    this.noise2D = createNoise2D(this.prng);
  }

  public noise1D(x: number): number {
    return this.noise2D(x, 0.5);
  }

  public get2D(x: number, y: number): number {
    return this.noise2D(x, y);
  }

  public random(): number {
    return this.prng();
  }

  public randomRange(min: number, max: number): number {
    return min + this.random() * (max - min);
  }
}
