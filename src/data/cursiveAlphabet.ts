import { CustomGlyphVariant } from '../types';

export type JoinHeight = 'baseline' | 'high' | 'break';

export interface CursiveStrokePoint {
  x: number; // Normalized to x-height (1.0 = x-height)
  y: number; // 0.0 = baseline, -1.0 = x-height, +0.75 = descender
  p?: number; // Optional pressure hint (0.4 - 1.3)
  cusp?: boolean; // Sharp corner/retraced vertex where Catmull-Rom should not smooth across
}

export interface CursiveGlyphDef {
  char: string;
  advance: number; // Horizontal advance in x-height units
  entryJoin: JoinHeight; // 'baseline' (default) | 'high' | 'break'
  exitJoin: JoinHeight; // 'baseline' | 'high' (o, v, w, b) | 'break' (capitals, punctuation)
  entryPoint: { x: number; y: number };
  exitPoint: { x: number; y: number };
  // Primary unbroken stroke(s) used in word-level spline concatenation:
  primaryStrokes: CursiveStrokePoint[][];
  // Optional alternate allograph shapes (for anti-duplication on double letters like 'll', 'ee', 'oo'):
  altPrimaryStrokes?: CursiveStrokePoint[][];
  // Delayed finishing strokes (crossbar for 't'/'f'/'x', tittle dot for 'i'/'j') drawn AFTER word spline:
  delayedStrokes?: CursiveStrokePoint[][];
}

export const CURSIVE_LOWERCASE: Record<string, CursiveGlyphDef> = {
  a: {
    char: 'a', advance: 0.95, entryJoin: 'baseline', exitJoin: 'baseline',
    entryPoint: { x: 0.05, y: -0.15 }, exitPoint: { x: 0.92, y: -0.15 },
    primaryStrokes: [[
      { x: 0.05, y: -0.15 }, { x: 0.45, y: -0.58 }, { x: 0.70, y: -0.94, cusp: true },
      { x: 0.34, y: -1.00 }, { x: 0.10, y: -0.48 }, { x: 0.38, y: 0.00 },
      { x: 0.72, y: -0.88 }, { x: 0.74, y: -0.06 }, { x: 0.92, y: -0.15 }
    ]],
    altPrimaryStrokes: [[
      { x: 0.05, y: -0.15 }, { x: 0.48, y: -0.64 }, { x: 0.66, y: -0.96, cusp: true },
      { x: 0.30, y: -0.94 }, { x: 0.12, y: -0.44 }, { x: 0.42, y: 0.02 },
      { x: 0.74, y: -0.82 }, { x: 0.76, y: -0.05 }, { x: 0.92, y: -0.15 }
    ]],
  },
  b: {
    char: 'b', advance: 0.86, entryJoin: 'baseline', exitJoin: 'high',
    entryPoint: { x: 0.05, y: -0.15 }, exitPoint: { x: 0.85, y: -0.78 },
    primaryStrokes: [[
      { x: 0.05, y: -0.15 }, { x: 0.34, y: -1.05 }, { x: 0.44, y: -1.80 },
      { x: 0.18, y: -1.56 }, { x: 0.20, y: -0.10 }, { x: 0.46, y: 0.02 },
      { x: 0.76, y: -0.42 }, { x: 0.60, y: -0.90 }, { x: 0.46, y: -0.78 }, { x: 0.85, y: -0.78 }
    ]],
  },
  c: {
    char: 'c', advance: 0.78, entryJoin: 'baseline', exitJoin: 'baseline',
    entryPoint: { x: 0.05, y: -0.15 }, exitPoint: { x: 0.76, y: -0.15 },
    primaryStrokes: [[
      { x: 0.05, y: -0.15 }, { x: 0.44, y: -0.62 }, { x: 0.66, y: -0.92 },
      { x: 0.34, y: -1.00 }, { x: 0.12, y: -0.46 }, { x: 0.42, y: 0.00 }, { x: 0.76, y: -0.15 }
    ]],
  },
  d: {
    char: 'd', advance: 0.95, entryJoin: 'baseline', exitJoin: 'baseline',
    entryPoint: { x: 0.05, y: -0.15 }, exitPoint: { x: 0.92, y: -0.15 },
    primaryStrokes: [[
      { x: 0.05, y: -0.15 }, { x: 0.45, y: -0.58 }, { x: 0.68, y: -0.92, cusp: true },
      { x: 0.32, y: -1.00 }, { x: 0.10, y: -0.46 }, { x: 0.38, y: 0.00 },
      { x: 0.68, y: -0.78 }, { x: 0.78, y: -1.82 }, { x: 0.74, y: -0.05 }, { x: 0.92, y: -0.15 }
    ]],
    altPrimaryStrokes: [[
      { x: 0.05, y: -0.15 }, { x: 0.66, y: -0.90, cusp: true }, { x: 0.30, y: -0.98 },
      { x: 0.12, y: -0.44 }, { x: 0.40, y: 0.00 }, { x: 0.72, y: -0.82 },
      { x: 0.84, y: -1.78 }, { x: 0.66, y: -1.52 }, { x: 0.75, y: -0.05 }, { x: 0.92, y: -0.15 }
    ]],
  },
  e: {
    char: 'e', advance: 0.72, entryJoin: 'baseline', exitJoin: 'baseline',
    entryPoint: { x: 0.04, y: -0.15 }, exitPoint: { x: 0.70, y: -0.15 },
    primaryStrokes: [[
      { x: 0.04, y: -0.15 }, { x: 0.42, y: -0.42 }, { x: 0.56, y: -0.78 },
      { x: 0.38, y: -1.00 }, { x: 0.14, y: -0.55 }, { x: 0.40, y: 0.00 }, { x: 0.70, y: -0.15 }
    ]],
    altPrimaryStrokes: [[
      { x: 0.04, y: -0.15 }, { x: 0.46, y: -0.50 }, { x: 0.50, y: -0.88 },
      { x: 0.28, y: -0.96 }, { x: 0.15, y: -0.45 }, { x: 0.44, y: 0.00 }, { x: 0.70, y: -0.15 }
    ]],
  },
  f: {
    char: 'f', advance: 0.72, entryJoin: 'baseline', exitJoin: 'baseline',
    entryPoint: { x: 0.05, y: -0.15 }, exitPoint: { x: 0.70, y: -0.15 },
    primaryStrokes: [[
      { x: 0.05, y: -0.15 }, { x: 0.36, y: -1.05 }, { x: 0.54, y: -1.82 },
      { x: 0.26, y: -1.65 }, { x: 0.26, y: 0.00 }, { x: 0.24, y: 0.72 },
      { x: 0.46, y: 0.60 }, { x: 0.34, y: -0.06 }, { x: 0.70, y: -0.15 }
    ]],
  },
  g: {
    char: 'g', advance: 0.90, entryJoin: 'baseline', exitJoin: 'baseline',
    entryPoint: { x: 0.05, y: -0.15 }, exitPoint: { x: 0.88, y: -0.15 },
    primaryStrokes: [[
      { x: 0.05, y: -0.15 }, { x: 0.68, y: -0.92, cusp: true }, { x: 0.32, y: -1.00 },
      { x: 0.10, y: -0.48 }, { x: 0.38, y: 0.00 }, { x: 0.70, y: -0.88 },
      { x: 0.68, y: 0.74 }, { x: 0.35, y: 0.64 }, { x: 0.60, y: -0.05 }, { x: 0.88, y: -0.15 }
    ]],
    altPrimaryStrokes: [[
      { x: 0.05, y: -0.15 }, { x: 0.65, y: -0.90, cusp: true }, { x: 0.30, y: -0.98 },
      { x: 0.12, y: -0.45 }, { x: 0.40, y: 0.00 }, { x: 0.70, y: -0.84 },
      { x: 0.64, y: 0.68 }, { x: 0.30, y: 0.55 }, { x: 0.66, y: -0.06 }, { x: 0.88, y: -0.15 }
    ]],
  },
  h: {
    char: 'h', advance: 0.95, entryJoin: 'baseline', exitJoin: 'baseline',
    entryPoint: { x: 0.05, y: -0.15 }, exitPoint: { x: 0.92, y: -0.15 },
    primaryStrokes: [[
      { x: 0.05, y: -0.15 }, { x: 0.34, y: -1.05 }, { x: 0.42, y: -1.80 },
      { x: 0.18, y: -1.55 }, { x: 0.20, y: 0.00 }, { x: 0.38, y: -0.80 },
      { x: 0.68, y: -0.96 }, { x: 0.76, y: -0.04 }, { x: 0.92, y: -0.15 }
    ]],
  },
  i: {
    char: 'i', advance: 0.48, entryJoin: 'baseline', exitJoin: 'baseline',
    entryPoint: { x: 0.04, y: -0.15 }, exitPoint: { x: 0.46, y: -0.15 },
    primaryStrokes: [[
      { x: 0.04, y: -0.15 }, { x: 0.26, y: -0.96 }, { x: 0.28, y: -0.04 }, { x: 0.46, y: -0.15 }
    ]],
    delayedStrokes: [[{ x: 0.28, y: -1.38 }]],
  },
  j: {
    char: 'j', advance: 0.56, entryJoin: 'baseline', exitJoin: 'baseline',
    entryPoint: { x: 0.04, y: -0.15 }, exitPoint: { x: 0.54, y: -0.15 },
    primaryStrokes: [[
      { x: 0.04, y: -0.15 }, { x: 0.34, y: -0.96 }, { x: 0.30, y: 0.74 },
      { x: 0.08, y: 0.60 }, { x: 0.34, y: -0.05 }, { x: 0.54, y: -0.15 }
    ]],
    delayedStrokes: [[{ x: 0.36, y: -1.38 }]],
  },
  k: {
    char: 'k', advance: 0.88, entryJoin: 'baseline', exitJoin: 'baseline',
    entryPoint: { x: 0.05, y: -0.15 }, exitPoint: { x: 0.86, y: -0.15 },
    primaryStrokes: [[
      { x: 0.05, y: -0.15 }, { x: 0.32, y: -1.05 }, { x: 0.40, y: -1.80 },
      { x: 0.16, y: -1.55 }, { x: 0.18, y: 0.00 }, { x: 0.40, y: -0.68 },
      { x: 0.64, y: -0.86 }, { x: 0.36, y: -0.45 }, { x: 0.68, y: -0.04 }, { x: 0.86, y: -0.15 }
    ]],
  },
  l: {
    char: 'l', advance: 0.52, entryJoin: 'baseline', exitJoin: 'baseline',
    entryPoint: { x: 0.04, y: -0.15 }, exitPoint: { x: 0.50, y: -0.15 },
    primaryStrokes: [[
      { x: 0.04, y: -0.15 }, { x: 0.30, y: -1.08 }, { x: 0.38, y: -1.82 },
      { x: 0.14, y: -1.58 }, { x: 0.22, y: -0.04 }, { x: 0.50, y: -0.15 }
    ]],
    altPrimaryStrokes: [[
      { x: 0.04, y: -0.15 }, { x: 0.32, y: -1.15 }, { x: 0.34, y: -1.78 },
      { x: 0.18, y: -1.50 }, { x: 0.24, y: -0.04 }, { x: 0.50, y: -0.15 }
    ]],
  },
  m: {
    char: 'm', advance: 1.35, entryJoin: 'baseline', exitJoin: 'baseline',
    entryPoint: { x: 0.05, y: -0.15 }, exitPoint: { x: 1.32, y: -0.15 },
    primaryStrokes: [[
      { x: 0.05, y: -0.15 }, { x: 0.24, y: -0.96 }, { x: 0.38, y: 0.00 },
      { x: 0.52, y: -0.78 }, { x: 0.68, y: -0.96 }, { x: 0.76, y: 0.00 },
      { x: 0.92, y: -0.78 }, { x: 1.06, y: -0.96 }, { x: 1.14, y: -0.04 }, { x: 1.32, y: -0.15 }
    ]],
  },
  n: {
    char: 'n', advance: 0.95, entryJoin: 'baseline', exitJoin: 'baseline',
    entryPoint: { x: 0.05, y: -0.15 }, exitPoint: { x: 0.92, y: -0.15 },
    primaryStrokes: [[
      { x: 0.05, y: -0.15 }, { x: 0.26, y: -0.96 }, { x: 0.38, y: 0.00 },
      { x: 0.54, y: -0.78 }, { x: 0.70, y: -0.96 }, { x: 0.76, y: -0.04 }, { x: 0.92, y: -0.15 }
    ]],
  },
  o: {
    char: 'o', advance: 0.82, entryJoin: 'baseline', exitJoin: 'high',
    entryPoint: { x: 0.05, y: -0.15 }, exitPoint: { x: 0.80, y: -0.82 },
    primaryStrokes: [[
      { x: 0.05, y: -0.15 }, { x: 0.64, y: -0.90 }, { x: 0.36, y: -1.00 },
      { x: 0.12, y: -0.50 }, { x: 0.40, y: 0.00 }, { x: 0.70, y: -0.55 },
      { x: 0.54, y: -0.90 }, { x: 0.80, y: -0.82 }
    ]],
    altPrimaryStrokes: [[
      { x: 0.05, y: -0.15 }, { x: 0.60, y: -0.88 }, { x: 0.32, y: -0.96 },
      { x: 0.14, y: -0.45 }, { x: 0.42, y: 0.02 }, { x: 0.68, y: -0.50 },
      { x: 0.58, y: -0.84 }, { x: 0.80, y: -0.82 }
    ]],
  },
  p: {
    char: 'p', advance: 0.90, entryJoin: 'baseline', exitJoin: 'baseline',
    entryPoint: { x: 0.05, y: -0.15 }, exitPoint: { x: 0.88, y: -0.15 },
    primaryStrokes: [[
      { x: 0.05, y: -0.15 }, { x: 0.28, y: -0.96 }, { x: 0.22, y: 0.72 },
      { x: 0.30, y: -0.78 }, { x: 0.68, y: -0.95 }, { x: 0.78, y: -0.45 },
      { x: 0.42, y: -0.02 }, { x: 0.88, y: -0.15 }
    ]],
  },
  q: {
    char: 'q', advance: 0.92, entryJoin: 'baseline', exitJoin: 'baseline',
    entryPoint: { x: 0.05, y: -0.15 }, exitPoint: { x: 0.90, y: -0.15 },
    primaryStrokes: [[
      { x: 0.05, y: -0.15 }, { x: 0.68, y: -0.92, cusp: true }, { x: 0.32, y: -1.00 },
      { x: 0.10, y: -0.48 }, { x: 0.38, y: 0.00 }, { x: 0.70, y: -0.88 },
      { x: 0.66, y: 0.72 }, { x: 0.84, y: 0.58 }, { x: 0.68, y: -0.05 }, { x: 0.90, y: -0.15 }
    ]],
  },
  r: {
    char: 'r', advance: 0.74, entryJoin: 'baseline', exitJoin: 'baseline',
    entryPoint: { x: 0.04, y: -0.15 }, exitPoint: { x: 0.72, y: -0.15 },
    primaryStrokes: [[
      { x: 0.04, y: -0.15 }, { x: 0.26, y: -0.98 }, { x: 0.56, y: -0.92 },
      { x: 0.56, y: -0.05 }, { x: 0.72, y: -0.15 }
    ]],
    altPrimaryStrokes: [[
      { x: 0.04, y: -0.15 }, { x: 0.24, y: -0.94 }, { x: 0.42, y: -0.78 },
      { x: 0.58, y: -0.92 }, { x: 0.54, y: -0.05 }, { x: 0.72, y: -0.15 }
    ]],
  },
  s: {
    char: 's', advance: 0.72, entryJoin: 'baseline', exitJoin: 'baseline',
    entryPoint: { x: 0.04, y: -0.15 }, exitPoint: { x: 0.70, y: -0.15 },
    primaryStrokes: [[
      { x: 0.04, y: -0.15 }, { x: 0.44, y: -1.00 }, { x: 0.62, y: -0.40 },
      { x: 0.22, y: -0.02 }, { x: 0.16, y: -0.18 }, { x: 0.70, y: -0.15 }
    ]],
    altPrimaryStrokes: [[
      { x: 0.04, y: -0.15 }, { x: 0.42, y: -0.96 }, { x: 0.58, y: -0.35 },
      { x: 0.26, y: 0.00 }, { x: 0.14, y: -0.14 }, { x: 0.70, y: -0.15 }
    ]],
  },
  t: {
    char: 't', advance: 0.62, entryJoin: 'baseline', exitJoin: 'baseline',
    entryPoint: { x: 0.04, y: -0.15 }, exitPoint: { x: 0.60, y: -0.15 },
    primaryStrokes: [[
      { x: 0.04, y: -0.15 }, { x: 0.32, y: -1.55 }, { x: 0.36, y: -0.04 }, { x: 0.60, y: -0.15 }
    ]],
    delayedStrokes: [[{ x: 0.08, y: -1.08 }, { x: 0.60, y: -1.14 }]],
  },
  u: {
    char: 'u', advance: 0.92, entryJoin: 'baseline', exitJoin: 'baseline',
    entryPoint: { x: 0.05, y: -0.15 }, exitPoint: { x: 0.90, y: -0.15 },
    primaryStrokes: [[
      { x: 0.05, y: -0.15 }, { x: 0.26, y: -0.96 }, { x: 0.28, y: -0.15 },
      { x: 0.48, y: 0.00 }, { x: 0.72, y: -0.96 }, { x: 0.74, y: -0.04 }, { x: 0.90, y: -0.15 }
    ]],
  },
  v: {
    char: 'v', advance: 0.80, entryJoin: 'baseline', exitJoin: 'high',
    entryPoint: { x: 0.05, y: -0.15 }, exitPoint: { x: 0.78, y: -0.82 },
    primaryStrokes: [[
      { x: 0.05, y: -0.15 }, { x: 0.22, y: -0.96 }, { x: 0.44, y: 0.00 },
      { x: 0.68, y: -0.88 }, { x: 0.78, y: -0.82 }
    ]],
  },
  w: {
    char: 'w', advance: 1.18, entryJoin: 'baseline', exitJoin: 'high',
    entryPoint: { x: 0.05, y: -0.15 }, exitPoint: { x: 1.16, y: -0.82 },
    primaryStrokes: [[
      { x: 0.05, y: -0.15 }, { x: 0.22, y: -0.96 }, { x: 0.36, y: 0.00 },
      { x: 0.60, y: -0.92 }, { x: 0.78, y: 0.00 }, { x: 1.04, y: -0.88 }, { x: 1.16, y: -0.82 }
    ]],
  },
  x: {
    char: 'x', advance: 0.80, entryJoin: 'baseline', exitJoin: 'baseline',
    entryPoint: { x: 0.05, y: -0.15 }, exitPoint: { x: 0.78, y: -0.15 },
    primaryStrokes: [[
      { x: 0.05, y: -0.15 }, { x: 0.20, y: -0.92 }, { x: 0.44, y: -0.45 },
      { x: 0.66, y: -0.02 }, { x: 0.78, y: -0.15 }
    ]],
    delayedStrokes: [[{ x: 0.66, y: -0.94 }, { x: 0.14, y: -0.02 }]],
  },
  y: {
    char: 'y', advance: 0.90, entryJoin: 'baseline', exitJoin: 'baseline',
    entryPoint: { x: 0.05, y: -0.15 }, exitPoint: { x: 0.88, y: -0.15 },
    primaryStrokes: [[
      { x: 0.05, y: -0.15 }, { x: 0.24, y: -0.96 }, { x: 0.28, y: -0.12 },
      { x: 0.48, y: 0.00 }, { x: 0.70, y: -0.94 }, { x: 0.66, y: 0.74 },
      { x: 0.34, y: 0.62 }, { x: 0.64, y: -0.05 }, { x: 0.88, y: -0.15 }
    ]],
  },
  z: {
    char: 'z', advance: 0.82, entryJoin: 'baseline', exitJoin: 'baseline',
    entryPoint: { x: 0.05, y: -0.15 }, exitPoint: { x: 0.80, y: -0.15 },
    primaryStrokes: [[
      { x: 0.05, y: -0.15 }, { x: 0.24, y: -0.94 }, { x: 0.68, y: -0.96 },
      { x: 0.22, y: -0.04 }, { x: 0.64, y: 0.66 }, { x: 0.34, y: 0.58 },
      { x: 0.60, y: -0.08 }, { x: 0.80, y: -0.15 }
    ]],
    delayedStrokes: [[{ x: 0.22, y: -0.50 }, { x: 0.60, y: -0.50 }]],
  },
};

export const CURSIVE_UPPERCASE: Record<string, CursiveGlyphDef> = {
  A: {
    char: 'A', advance: 1.15, entryJoin: 'break', exitJoin: 'baseline',
    entryPoint: { x: 0.15, y: -0.10 }, exitPoint: { x: 1.10, y: -0.15 },
    primaryStrokes: [[
      { x: 0.15, y: -0.10 }, { x: 0.35, y: -1.20 }, { x: 0.60, y: -1.85 },
      { x: 0.78, y: -1.40 }, { x: 0.95, y: -0.05 }, { x: 1.10, y: -0.15 }
    ]],
    delayedStrokes: [[{ x: 0.30, y: -0.80 }, { x: 0.85, y: -0.80 }]],
  },
  B: {
    char: 'B', advance: 1.12, entryJoin: 'break', exitJoin: 'break',
    entryPoint: { x: 0.22, y: -1.78 }, exitPoint: { x: 1.08, y: -0.15 },
    primaryStrokes: [
      [{ x: 0.24, y: -1.78 }, { x: 0.24, y: -0.05 }],
      [{ x: 0.22, y: -1.78 }, { x: 0.60, y: -1.82 }, { x: 0.78, y: -1.42 }, { x: 0.50, y: -0.96 }, { x: 0.82, y: -0.50 }, { x: 0.54, y: 0.00 }, { x: 0.18, y: -0.02 }]
    ],
  },
  C: {
    char: 'C', advance: 1.05, entryJoin: 'break', exitJoin: 'baseline',
    entryPoint: { x: 0.70, y: -1.75 }, exitPoint: { x: 1.00, y: -0.15 },
    primaryStrokes: [[
      { x: 0.70, y: -1.75 }, { x: 0.40, y: -1.82 }, { x: 0.18, y: -1.15 },
      { x: 0.22, y: -0.20 }, { x: 0.55, y: 0.00 }, { x: 1.00, y: -0.15 }
    ]],
  },
  D: {
    char: 'D', advance: 1.14, entryJoin: 'break', exitJoin: 'break',
    entryPoint: { x: 0.25, y: -1.78 }, exitPoint: { x: 1.10, y: -0.15 },
    primaryStrokes: [
      [{ x: 0.25, y: -1.78 }, { x: 0.25, y: -0.05 }],
      [{ x: 0.22, y: -1.78 }, { x: 0.65, y: -1.82 }, { x: 0.96, y: -1.25 }, { x: 0.90, y: -0.45 }, { x: 0.55, y: 0.00 }, { x: 0.20, y: -0.02 }]
    ],
  },
  E: {
    char: 'E', advance: 0.96, entryJoin: 'break', exitJoin: 'baseline',
    entryPoint: { x: 0.72, y: -1.65 }, exitPoint: { x: 0.88, y: -0.12 },
    primaryStrokes: [[
      { x: 0.72, y: -1.65 }, { x: 0.52, y: -1.82 }, { x: 0.24, y: -1.45 }, { x: 0.50, y: -0.98, cusp: true },
      { x: 0.20, y: -0.52 }, { x: 0.44, y: 0.00 }, { x: 0.88, y: -0.12 }
    ]],
  },
  F: {
    char: 'F', advance: 1.05, entryJoin: 'break', exitJoin: 'break',
    entryPoint: { x: 0.18, y: -1.75 }, exitPoint: { x: 0.80, y: -0.10 },
    primaryStrokes: [
      [{ x: 0.18, y: -1.75 }, { x: 0.50, y: -1.82 }, { x: 0.82, y: -1.75 }],
      [{ x: 0.48, y: -1.72 }, { x: 0.46, y: -0.05 }, { x: 0.28, y: 0.00 }, { x: 0.75, y: -0.12 }]
    ],
    delayedStrokes: [[{ x: 0.30, y: -0.92 }, { x: 0.64, y: -0.92 }]],
  },
  G: {
    char: 'G', advance: 1.15, entryJoin: 'break', exitJoin: 'baseline',
    entryPoint: { x: 0.25, y: -0.10 }, exitPoint: { x: 1.10, y: -0.15 },
    primaryStrokes: [[
      { x: 0.25, y: -0.10 }, { x: 0.48, y: -1.15 }, { x: 0.68, y: -1.80 }, { x: 0.40, y: -1.80 },
      { x: 0.20, y: -1.05 }, { x: 0.36, y: -0.02 }, { x: 0.72, y: -0.02 }, { x: 0.72, y: -0.80 }, { x: 0.98, y: -0.15 }
    ]],
  },
  H: {
    char: 'H', advance: 1.25, entryJoin: 'break', exitJoin: 'break',
    entryPoint: { x: 0.24, y: -1.78 }, exitPoint: { x: 1.20, y: -0.15 },
    primaryStrokes: [
      [{ x: 0.24, y: -1.78 }, { x: 0.24, y: -0.05 }],
      [{ x: 0.82, y: -1.78 }, { x: 0.82, y: -0.05 }, { x: 1.05, y: -0.15 }]
    ],
    delayedStrokes: [[{ x: 0.22, y: -0.90 }, { x: 0.84, y: -0.90 }]],
  },
  I: {
    char: 'I', advance: 0.85, entryJoin: 'break', exitJoin: 'baseline',
    entryPoint: { x: 0.22, y: -1.72 }, exitPoint: { x: 0.80, y: -0.15 },
    primaryStrokes: [[
      { x: 0.22, y: -1.72 }, { x: 0.52, y: -1.80 }, { x: 0.72, y: -1.72 },
      { x: 0.48, y: -1.65 }, { x: 0.46, y: -0.05 }, { x: 0.28, y: 0.00 }, { x: 0.78, y: -0.15 }
    ]],
  },
  J: {
    char: 'J', advance: 0.88, entryJoin: 'break', exitJoin: 'baseline',
    entryPoint: { x: 0.24, y: -1.75 }, exitPoint: { x: 0.85, y: -0.15 },
    primaryStrokes: [[
      { x: 0.24, y: -1.75 }, { x: 0.60, y: -1.78 }, { x: 0.46, y: -1.68 },
      { x: 0.46, y: 0.65 }, { x: 0.22, y: 0.55 }, { x: 0.50, y: -0.05 }, { x: 0.85, y: -0.15 }
    ]],
  },
  K: {
    char: 'K', advance: 1.10, entryJoin: 'break', exitJoin: 'break',
    entryPoint: { x: 0.24, y: -1.78 }, exitPoint: { x: 1.05, y: -0.15 },
    primaryStrokes: [
      [{ x: 0.24, y: -1.78 }, { x: 0.24, y: -0.05 }],
      [{ x: 0.80, y: -1.75 }, { x: 0.35, y: -0.90 }, { x: 0.80, y: -0.05 }, { x: 1.02, y: -0.15 }]
    ],
  },
  L: {
    char: 'L', advance: 0.95, entryJoin: 'break', exitJoin: 'baseline',
    entryPoint: { x: 0.35, y: -1.80 }, exitPoint: { x: 0.92, y: -0.15 },
    primaryStrokes: [[
      { x: 0.35, y: -1.80 }, { x: 0.40, y: -0.15 }, { x: 0.20, y: -0.05 },
      { x: 0.45, y: 0.00 }, { x: 0.92, y: -0.15 }
    ]],
  },
  M: {
    char: 'M', advance: 1.35, entryJoin: 'break', exitJoin: 'baseline',
    entryPoint: { x: 0.16, y: -1.40 }, exitPoint: { x: 1.32, y: -0.15 },
    primaryStrokes: [[
      { x: 0.16, y: -1.40 }, { x: 0.24, y: -1.80 }, { x: 0.42, y: -0.05 },
      { x: 0.64, y: -1.70 }, { x: 0.84, y: -0.05 },
      { x: 1.05, y: -1.60 }, { x: 1.18, y: -0.05 }, { x: 1.32, y: -0.15 }
    ]],
  },
  N: {
    char: 'N', advance: 1.18, entryJoin: 'break', exitJoin: 'baseline',
    entryPoint: { x: 0.16, y: -1.40 }, exitPoint: { x: 1.15, y: -0.15 },
    primaryStrokes: [[
      { x: 0.16, y: -1.40 }, { x: 0.24, y: -1.80 }, { x: 0.50, y: -0.05 },
      { x: 0.80, y: -1.65 }, { x: 1.00, y: -0.05 }, { x: 1.15, y: -0.15 }
    ]],
  },
  O: {
    char: 'O', advance: 1.05, entryJoin: 'break', exitJoin: 'high',
    entryPoint: { x: 0.60, y: -1.82 }, exitPoint: { x: 0.96, y: -0.82 },
    primaryStrokes: [[
      { x: 0.60, y: -1.82 }, { x: 0.22, y: -1.35 }, { x: 0.24, y: -0.45 },
      { x: 0.55, y: 0.02 }, { x: 0.86, y: -0.50 }, { x: 0.88, y: -1.45 },
      { x: 0.62, y: -1.80 }, { x: 0.52, y: -1.45 }, { x: 0.96, y: -0.82 }
    ]],
  },
  P: {
    char: 'P', advance: 1.05, entryJoin: 'break', exitJoin: 'break',
    entryPoint: { x: 0.24, y: -1.78 }, exitPoint: { x: 1.02, y: -0.15 },
    primaryStrokes: [
      [{ x: 0.24, y: -1.78 }, { x: 0.24, y: -0.05 }],
      [{ x: 0.22, y: -1.78 }, { x: 0.64, y: -1.82 }, { x: 0.84, y: -1.35 }, { x: 0.58, y: -0.90 }, { x: 0.24, y: -0.90 }]
    ],
  },
  Q: {
    char: 'Q', advance: 1.15, entryJoin: 'break', exitJoin: 'baseline',
    entryPoint: { x: 0.58, y: -1.82 }, exitPoint: { x: 1.12, y: -0.15 },
    primaryStrokes: [[
      { x: 0.58, y: -1.82 }, { x: 0.22, y: -1.35 }, { x: 0.22, y: -0.50 },
      { x: 0.52, y: 0.02 }, { x: 0.85, y: -0.50 }, { x: 0.85, y: -1.45 },
      { x: 0.58, y: -1.82 }, { x: 0.48, y: -0.15 }, { x: 0.28, y: -0.05 },
      { x: 0.65, y: 0.04 }, { x: 1.12, y: -0.15 }
    ]],
  },
  R: {
    char: 'R', advance: 1.12, entryJoin: 'break', exitJoin: 'break',
    entryPoint: { x: 0.24, y: -1.78 }, exitPoint: { x: 1.10, y: -0.15 },
    primaryStrokes: [
      [{ x: 0.24, y: -1.78 }, { x: 0.24, y: -0.05 }],
      [{ x: 0.22, y: -1.78 }, { x: 0.62, y: -1.82 }, { x: 0.82, y: -1.38 }, { x: 0.54, y: -0.92 }, { x: 0.80, y: -0.05 }, { x: 1.05, y: -0.15 }]
    ],
  },
  S: {
    char: 'S', advance: 0.95, entryJoin: 'break', exitJoin: 'break',
    entryPoint: { x: 0.20, y: -0.12 }, exitPoint: { x: 0.85, y: -0.15 },
    primaryStrokes: [[
      { x: 0.20, y: -0.12 }, { x: 0.46, y: -1.15 }, { x: 0.62, y: -1.80 },
      { x: 0.44, y: -1.78 }, { x: 0.32, y: -1.45 }, { x: 0.54, y: -0.90 },
      { x: 0.72, y: -0.42 }, { x: 0.52, y: -0.02 }, { x: 0.25, y: -0.05 }, { x: 0.85, y: -0.15 }
    ]],
  },
  T: {
    char: 'T', advance: 1.05, entryJoin: 'break', exitJoin: 'break',
    entryPoint: { x: 0.16, y: -1.78 }, exitPoint: { x: 0.75, y: -0.12 },
    primaryStrokes: [
      [{ x: 0.16, y: -1.78 }, { x: 0.50, y: -1.84 }, { x: 0.84, y: -1.76 }],
      [{ x: 0.50, y: -1.76 }, { x: 0.48, y: -0.05 }, { x: 0.32, y: 0.00 }, { x: 0.75, y: -0.12 }]
    ],
  },
  U: {
    char: 'U', advance: 1.15, entryJoin: 'break', exitJoin: 'baseline',
    entryPoint: { x: 0.18, y: -1.75 }, exitPoint: { x: 1.12, y: -0.15 },
    primaryStrokes: [[
      { x: 0.18, y: -1.75 }, { x: 0.26, y: -0.45 }, { x: 0.48, y: 0.02 },
      { x: 0.78, y: -0.40 }, { x: 0.82, y: -1.65 },
      { x: 0.82, y: -0.05 }, { x: 1.12, y: -0.15 }
    ]],
  },
  V: {
    char: 'V', advance: 1.05, entryJoin: 'break', exitJoin: 'high',
    entryPoint: { x: 0.20, y: -1.75 }, exitPoint: { x: 1.00, y: -0.80 },
    primaryStrokes: [[
      { x: 0.20, y: -1.75 }, { x: 0.35, y: -0.05 }, { x: 0.55, y: 0.00 },
      { x: 0.82, y: -1.70 }, { x: 1.00, y: -0.80 }
    ]],
  },
  W: {
    char: 'W', advance: 1.35, entryJoin: 'break', exitJoin: 'high',
    entryPoint: { x: 0.15, y: -1.75 }, exitPoint: { x: 1.30, y: -0.82 },
    primaryStrokes: [[
      { x: 0.15, y: -1.75 }, { x: 0.30, y: 0.00 }, { x: 0.60, y: -1.55 },
      { x: 0.85, y: 0.00 }, { x: 1.15, y: -1.65 }, { x: 1.30, y: -0.82 }
    ]],
  },
  X: {
    char: 'X', advance: 1.08, entryJoin: 'break', exitJoin: 'baseline',
    entryPoint: { x: 0.20, y: -1.75 }, exitPoint: { x: 1.05, y: -0.15 },
    primaryStrokes: [[
      { x: 0.20, y: -1.75 }, { x: 0.45, y: -0.90 }, { x: 0.85, y: 0.00 }, { x: 1.05, y: -0.15 }
    ]],
    delayedStrokes: [[{ x: 0.82, y: -1.75 }, { x: 0.22, y: 0.00 }]],
  },
  Y: {
    char: 'Y', advance: 1.12, entryJoin: 'break', exitJoin: 'baseline',
    entryPoint: { x: 0.18, y: -1.75 }, exitPoint: { x: 1.10, y: -0.15 },
    primaryStrokes: [[
      { x: 0.18, y: -1.75 }, { x: 0.28, y: -0.45 }, { x: 0.52, y: 0.02 },
      { x: 0.78, y: -0.40 }, { x: 0.82, y: -1.65 },
      { x: 0.82, y: 0.00 }, { x: 0.80, y: 0.72 }, { x: 0.52, y: 0.62 },
      { x: 0.80, y: -0.05 }, { x: 1.10, y: -0.15 }
    ]],
  },
  Z: {
    char: 'Z', advance: 1.02, entryJoin: 'break', exitJoin: 'baseline',
    entryPoint: { x: 0.18, y: -1.75 }, exitPoint: { x: 0.98, y: -0.15 },
    primaryStrokes: [[
      { x: 0.18, y: -1.75 }, { x: 0.50, y: -1.82 }, { x: 0.82, y: -1.65 },
      { x: 0.35, y: 0.00 }, { x: 0.78, y: 0.02 },
      { x: 0.72, y: 0.72 }, { x: 0.42, y: 0.60 },
      { x: 0.72, y: -0.05 }, { x: 0.98, y: -0.15 }
    ]],
  },
};

/**
 * Normalizes a GlyphStudio CustomGlyphVariant (280x280 pad, baseline 75%, x-height 35%)
 * into CursiveGlyphDef so user-drawn letters flow inside continuous cursive runs.
 */
export function convertCustomVariantToCursive(variant: CustomGlyphVariant): CursiveGlyphDef | null {
  if (!variant.strokes || variant.strokes.length === 0) return null;
  const boxH = variant.height === 140 ? 280 : variant.height;
  const baselineY = boxH * 0.75;
  const xHeight = boxH * 0.35;

  let minX = Infinity;
  let maxX = -Infinity;
  for (const s of variant.strokes) {
    for (const pt of s) {
      if (pt[0] < minX) minX = pt[0];
      if (pt[0] > maxX) maxX = pt[0];
    }
  }
  if (!Number.isFinite(minX) || maxX <= minX) return null;

  const normStrokes: CursiveStrokePoint[][] = variant.strokes.map((stroke) =>
    stroke.map(([px, py, p]) => ({
      x: (px - minX) / xHeight,
      y: (py - baselineY) / xHeight,
      p,
    }))
  );

  const primary = [normStrokes[0]];
  const delayed = normStrokes.length > 1 ? normStrokes.slice(1) : undefined;
  const firstPt = primary[0][0];
  const lastPt = primary[0][primary[0].length - 1];
  const advance = Math.max(0.45, (maxX - minX) / xHeight + 0.14);

  return {
    char: variant.char,
    advance,
    entryJoin: firstPt.y < -0.55 ? 'high' : 'baseline',
    exitJoin: lastPt.y < -0.55 ? 'high' : 'baseline',
    entryPoint: { x: firstPt.x, y: firstPt.y },
    exitPoint: { x: lastPt.x, y: lastPt.y },
    primaryStrokes: primary,
    delayedStrokes: delayed,
  };
}

export interface CursiveProfileConfig {
  id: string;
  label: string;
  xHeightRatio: number;         // Ratio of xHeight to fontSize
  defaultSlantDeg: number;      // Vertical forward slant
  pressureContrast: number;     // 0.0 (monoline) - 1.0 (fountain nib)
  loopWidthScale: number;       // Horizontal loop tightness
  medialSquash: number;         // 0.0 - 0.25 vertical flattening on medial m,n,u,i,r,e
  breakAfterDescenders: boolean;// Lift pen after g, j, q, y, z
  alphabet: Record<string, CursiveGlyphDef>;
}

export const PALMER_BUSINESS_LOWERCASE: Record<string, CursiveGlyphDef> = {
  a: {
    char: 'a', advance: 0.86, entryJoin: 'baseline', exitJoin: 'baseline',
    entryPoint: { x: 0.03, y: -0.12 }, exitPoint: { x: 0.84, y: -0.14 },
    primaryStrokes: [[
      { x: 0.03, y: -0.12 }, { x: 0.46, y: -0.66 }, { x: 0.64, y: -0.98 },
      { x: 0.30, y: -1.00 }, { x: 0.12, y: -0.44 }, { x: 0.36, y: 0.00 },
      { x: 0.66, y: -0.92 }, { x: 0.68, y: -0.04 }, { x: 0.84, y: -0.14 }
    ]],
    altPrimaryStrokes: [[
      { x: 0.03, y: -0.12 }, { x: 0.60, y: -0.94 }, { x: 0.26, y: -0.96 },
      { x: 0.10, y: -0.40 }, { x: 0.38, y: 0.02 }, { x: 0.65, y: -0.84 },
      { x: 0.68, y: -0.05 }, { x: 0.84, y: -0.14 }
    ]],
  },
  b: {
    char: 'b', advance: 0.80, entryJoin: 'baseline', exitJoin: 'high',
    entryPoint: { x: 0.03, y: -0.12 }, exitPoint: { x: 0.78, y: -0.84 },
    primaryStrokes: [[
      { x: 0.03, y: -0.12 }, { x: 0.36, y: -1.15 }, { x: 0.46, y: -1.86 },
      { x: 0.24, y: -1.62 }, { x: 0.20, y: -0.06 }, { x: 0.46, y: 0.02 },
      { x: 0.68, y: -0.48 }, { x: 0.56, y: -0.90 }, { x: 0.46, y: -0.82 }, { x: 0.78, y: -0.84 }
    ]],
  },
  c: {
    char: 'c', advance: 0.72, entryJoin: 'baseline', exitJoin: 'baseline',
    entryPoint: { x: 0.03, y: -0.12 }, exitPoint: { x: 0.70, y: -0.14 },
    primaryStrokes: [[
      { x: 0.03, y: -0.12 }, { x: 0.44, y: -0.70 }, { x: 0.58, y: -0.98 },
      { x: 0.32, y: -1.00 }, { x: 0.12, y: -0.42 }, { x: 0.38, y: 0.00 }, { x: 0.70, y: -0.14 }
    ]],
  },
  d: {
    char: 'd', advance: 0.86, entryJoin: 'baseline', exitJoin: 'baseline',
    entryPoint: { x: 0.03, y: -0.12 }, exitPoint: { x: 0.84, y: -0.14 },
    primaryStrokes: [[
      { x: 0.03, y: -0.12 }, { x: 0.62, y: -0.96 }, { x: 0.28, y: -1.00 },
      { x: 0.12, y: -0.42 }, { x: 0.36, y: 0.00 }, { x: 0.64, y: -0.86 },
      { x: 0.74, y: -1.84 }, { x: 0.64, y: -1.58 }, { x: 0.68, y: -0.04 }, { x: 0.84, y: -0.14 }
    ]],
  },
  e: {
    char: 'e', advance: 0.66, entryJoin: 'baseline', exitJoin: 'baseline',
    entryPoint: { x: 0.03, y: -0.12 }, exitPoint: { x: 0.64, y: -0.14 },
    primaryStrokes: [[
      { x: 0.03, y: -0.12 }, { x: 0.38, y: -0.52 }, { x: 0.50, y: -0.84 },
      { x: 0.34, y: -1.00 }, { x: 0.14, y: -0.48 }, { x: 0.36, y: 0.00 }, { x: 0.64, y: -0.14 }
    ]],
    altPrimaryStrokes: [[
      { x: 0.03, y: -0.12 }, { x: 0.44, y: -0.60 }, { x: 0.44, y: -0.94 },
      { x: 0.26, y: -0.96 }, { x: 0.16, y: -0.42 }, { x: 0.40, y: 0.00 }, { x: 0.64, y: -0.14 }
    ]],
  },
  f: {
    // Classic Palmer reversed lower belly closing onto baseline before exit
    char: 'f', advance: 0.70, entryJoin: 'baseline', exitJoin: 'baseline',
    entryPoint: { x: 0.03, y: -0.12 }, exitPoint: { x: 0.68, y: -0.14 },
    primaryStrokes: [[
      { x: 0.03, y: -0.12 }, { x: 0.36, y: -1.16 }, { x: 0.50, y: -1.86 },
      { x: 0.28, y: -1.66 }, { x: 0.28, y: 0.00 }, { x: 0.26, y: 0.76 },
      { x: 0.48, y: 0.64 }, { x: 0.46, y: 0.16 }, { x: 0.30, y: -0.06 }, { x: 0.68, y: -0.14 }
    ]],
  },
  g: {
    char: 'g', advance: 0.84, entryJoin: 'baseline', exitJoin: 'baseline',
    entryPoint: { x: 0.03, y: -0.12 }, exitPoint: { x: 0.82, y: -0.14 },
    primaryStrokes: [[
      { x: 0.03, y: -0.12 }, { x: 0.62, y: -0.96 }, { x: 0.28, y: -1.00 },
      { x: 0.10, y: -0.46 }, { x: 0.36, y: 0.00 }, { x: 0.66, y: -0.92 },
      { x: 0.62, y: 0.76 }, { x: 0.34, y: 0.66 }, { x: 0.54, y: -0.04 }, { x: 0.82, y: -0.14 }
    ]],
  },
  h: {
    char: 'h', advance: 0.88, entryJoin: 'baseline', exitJoin: 'baseline',
    entryPoint: { x: 0.03, y: -0.12 }, exitPoint: { x: 0.86, y: -0.14 },
    primaryStrokes: [[
      { x: 0.03, y: -0.12 }, { x: 0.34, y: -1.12 }, { x: 0.44, y: -1.86 },
      { x: 0.22, y: -1.60 }, { x: 0.20, y: 0.00 }, { x: 0.38, y: -0.82 },
      { x: 0.64, y: -0.98 }, { x: 0.70, y: -0.04 }, { x: 0.86, y: -0.14 }
    ]],
  },
  i: {
    char: 'i', advance: 0.44, entryJoin: 'baseline', exitJoin: 'baseline',
    entryPoint: { x: 0.03, y: -0.12 }, exitPoint: { x: 0.42, y: -0.14 },
    primaryStrokes: [[
      { x: 0.03, y: -0.12 }, { x: 0.24, y: -0.98 }, { x: 0.26, y: -0.04 }, { x: 0.42, y: -0.14 }
    ]],
    delayedStrokes: [[{ x: 0.27, y: -1.42 }]],
  },
  j: {
    char: 'j', advance: 0.52, entryJoin: 'baseline', exitJoin: 'baseline',
    entryPoint: { x: 0.03, y: -0.12 }, exitPoint: { x: 0.50, y: -0.14 },
    primaryStrokes: [[
      { x: 0.03, y: -0.12 }, { x: 0.30, y: -0.98 }, { x: 0.28, y: 0.76 },
      { x: 0.10, y: 0.62 }, { x: 0.32, y: -0.04 }, { x: 0.50, y: -0.14 }
    ]],
    delayedStrokes: [[{ x: 0.33, y: -1.42 }]],
  },
  k: {
    char: 'k', advance: 0.82, entryJoin: 'baseline', exitJoin: 'baseline',
    entryPoint: { x: 0.03, y: -0.12 }, exitPoint: { x: 0.80, y: -0.14 },
    primaryStrokes: [[
      { x: 0.03, y: -0.12 }, { x: 0.32, y: -1.14 }, { x: 0.40, y: -1.86 },
      { x: 0.18, y: -1.62 }, { x: 0.18, y: 0.00 }, { x: 0.42, y: -0.74 },
      { x: 0.60, y: -0.92 }, { x: 0.36, y: -0.46 }, { x: 0.62, y: -0.04 }, { x: 0.80, y: -0.14 }
    ]],
  },
  l: {
    char: 'l', advance: 0.48, entryJoin: 'baseline', exitJoin: 'baseline',
    entryPoint: { x: 0.03, y: -0.12 }, exitPoint: { x: 0.46, y: -0.14 },
    primaryStrokes: [[
      { x: 0.03, y: -0.12 }, { x: 0.28, y: -1.16 }, { x: 0.36, y: -1.86 },
      { x: 0.16, y: -1.62 }, { x: 0.22, y: -0.04 }, { x: 0.46, y: -0.14 }
    ]],
  },
  m: {
    char: 'm', advance: 1.24, entryJoin: 'baseline', exitJoin: 'baseline',
    entryPoint: { x: 0.03, y: -0.12 }, exitPoint: { x: 1.22, y: -0.14 },
    primaryStrokes: [[
      { x: 0.03, y: -0.12 }, { x: 0.22, y: -0.98 }, { x: 0.34, y: 0.00 },
      { x: 0.48, y: -0.80 }, { x: 0.62, y: -0.98 }, { x: 0.70, y: 0.00 },
      { x: 0.84, y: -0.80 }, { x: 0.98, y: -0.98 }, { x: 1.06, y: -0.04 }, { x: 1.22, y: -0.14 }
    ]],
  },
  n: {
    char: 'n', advance: 0.88, entryJoin: 'baseline', exitJoin: 'baseline',
    entryPoint: { x: 0.03, y: -0.12 }, exitPoint: { x: 0.86, y: -0.14 },
    primaryStrokes: [[
      { x: 0.03, y: -0.12 }, { x: 0.24, y: -0.98 }, { x: 0.36, y: 0.00 },
      { x: 0.50, y: -0.80 }, { x: 0.64, y: -0.98 }, { x: 0.70, y: -0.04 }, { x: 0.86, y: -0.14 }
    ]],
  },
  o: {
    char: 'o', advance: 0.76, entryJoin: 'baseline', exitJoin: 'high',
    entryPoint: { x: 0.03, y: -0.12 }, exitPoint: { x: 0.74, y: -0.84 },
    primaryStrokes: [[
      { x: 0.03, y: -0.12 }, { x: 0.58, y: -0.94 }, { x: 0.32, y: -1.00 },
      { x: 0.12, y: -0.46 }, { x: 0.38, y: 0.00 }, { x: 0.64, y: -0.58 },
      { x: 0.50, y: -0.92 }, { x: 0.74, y: -0.84 }
    ]],
  },
  p: {
    char: 'p', advance: 0.82, entryJoin: 'baseline', exitJoin: 'baseline',
    entryPoint: { x: 0.03, y: -0.12 }, exitPoint: { x: 0.80, y: -0.14 },
    primaryStrokes: [[
      { x: 0.03, y: -0.12 }, { x: 0.26, y: -1.00 }, { x: 0.22, y: 0.74 },
      { x: 0.28, y: -0.78 }, { x: 0.60, y: -0.96 }, { x: 0.68, y: -0.44 },
      { x: 0.38, y: -0.02 }, { x: 0.80, y: -0.14 }
    ]],
  },
  q: {
    char: 'q', advance: 0.84, entryJoin: 'baseline', exitJoin: 'baseline',
    entryPoint: { x: 0.03, y: -0.12 }, exitPoint: { x: 0.82, y: -0.14 },
    primaryStrokes: [[
      { x: 0.03, y: -0.12 }, { x: 0.62, y: -0.94 }, { x: 0.28, y: -1.00 },
      { x: 0.10, y: -0.46 }, { x: 0.36, y: 0.00 }, { x: 0.64, y: -0.90 },
      { x: 0.62, y: 0.74 }, { x: 0.78, y: 0.56 }, { x: 0.64, y: -0.04 }, { x: 0.82, y: -0.14 }
    ]],
  },
  r: {
    // Classic Palmer flat-shoulder peak slightly taller than x-height (-1.04) with sharp slant drop
    char: 'r', advance: 0.68, entryJoin: 'baseline', exitJoin: 'baseline',
    entryPoint: { x: 0.03, y: -0.12 }, exitPoint: { x: 0.66, y: -0.14 },
    primaryStrokes: [[
      { x: 0.03, y: -0.12 }, { x: 0.22, y: -1.04 }, { x: 0.36, y: -0.94 },
      { x: 0.50, y: -0.96 }, { x: 0.48, y: -0.04 }, { x: 0.66, y: -0.14 }
    ]],
  },
  s: {
    // Classic Palmer pointed needle-crest 's' with closed lower belly
    char: 's', advance: 0.68, entryJoin: 'baseline', exitJoin: 'baseline',
    entryPoint: { x: 0.03, y: -0.12 }, exitPoint: { x: 0.66, y: -0.14 },
    primaryStrokes: [[
      { x: 0.03, y: -0.12 }, { x: 0.44, y: -1.06 }, { x: 0.56, y: -0.42 },
      { x: 0.34, y: 0.00 }, { x: 0.14, y: -0.14 }, { x: 0.32, y: -0.14 }, { x: 0.66, y: -0.14 }
    ]],
  },
  t: {
    char: 't', advance: 0.56, entryJoin: 'baseline', exitJoin: 'baseline',
    entryPoint: { x: 0.03, y: -0.12 }, exitPoint: { x: 0.54, y: -0.14 },
    primaryStrokes: [[
      { x: 0.03, y: -0.12 }, { x: 0.28, y: -1.56 }, { x: 0.32, y: -0.04 }, { x: 0.54, y: -0.14 }
    ]],
    delayedStrokes: [[{ x: 0.08, y: -1.12 }, { x: 0.54, y: -1.18 }]],
  },
  u: {
    char: 'u', advance: 0.84, entryJoin: 'baseline', exitJoin: 'baseline',
    entryPoint: { x: 0.03, y: -0.12 }, exitPoint: { x: 0.82, y: -0.14 },
    primaryStrokes: [[
      { x: 0.03, y: -0.12 }, { x: 0.24, y: -0.98 }, { x: 0.26, y: -0.12 },
      { x: 0.44, y: 0.00 }, { x: 0.66, y: -0.98 }, { x: 0.68, y: -0.04 }, { x: 0.82, y: -0.14 }
    ]],
  },
  v: {
    char: 'v', advance: 0.74, entryJoin: 'baseline', exitJoin: 'high',
    entryPoint: { x: 0.03, y: -0.12 }, exitPoint: { x: 0.72, y: -0.84 },
    primaryStrokes: [[
      { x: 0.03, y: -0.12 }, { x: 0.20, y: -0.98 }, { x: 0.40, y: 0.00 },
      { x: 0.62, y: -0.90 }, { x: 0.72, y: -0.84 }
    ]],
  },
  w: {
    char: 'w', advance: 1.08, entryJoin: 'baseline', exitJoin: 'high',
    entryPoint: { x: 0.03, y: -0.12 }, exitPoint: { x: 1.06, y: -0.84 },
    primaryStrokes: [[
      { x: 0.03, y: -0.12 }, { x: 0.20, y: -0.98 }, { x: 0.34, y: 0.00 },
      { x: 0.56, y: -0.96 }, { x: 0.72, y: 0.00 }, { x: 0.96, y: -0.90 }, { x: 1.06, y: -0.84 }
    ]],
  },
  x: {
    // Classic Palmer arched first stroke + reverse crossbar slash
    char: 'x', advance: 0.76, entryJoin: 'baseline', exitJoin: 'baseline',
    entryPoint: { x: 0.03, y: -0.12 }, exitPoint: { x: 0.74, y: -0.14 },
    primaryStrokes: [[
      { x: 0.03, y: -0.12 }, { x: 0.20, y: -0.94 }, { x: 0.42, y: -0.48 },
      { x: 0.60, y: -0.02 }, { x: 0.74, y: -0.14 }
    ]],
    delayedStrokes: [[{ x: 0.62, y: -0.96 }, { x: 0.14, y: -0.02 }]],
  },
  y: {
    char: 'y', advance: 0.84, entryJoin: 'baseline', exitJoin: 'baseline',
    entryPoint: { x: 0.03, y: -0.12 }, exitPoint: { x: 0.82, y: -0.14 },
    primaryStrokes: [[
      { x: 0.03, y: -0.12 }, { x: 0.22, y: -0.98 }, { x: 0.26, y: -0.10 },
      { x: 0.44, y: 0.00 }, { x: 0.64, y: -0.96 }, { x: 0.60, y: 0.76 },
      { x: 0.32, y: 0.64 }, { x: 0.58, y: -0.04 }, { x: 0.82, y: -0.14 }
    ]],
  },
  z: {
    // Classic Palmer cursive 3-shaped 'z' with descender loop
    char: 'z', advance: 0.78, entryJoin: 'baseline', exitJoin: 'baseline',
    entryPoint: { x: 0.03, y: -0.12 }, exitPoint: { x: 0.76, y: -0.14 },
    primaryStrokes: [[
      { x: 0.03, y: -0.12 }, { x: 0.24, y: -0.98 }, { x: 0.52, y: -0.84 },
      { x: 0.36, y: -0.10 }, { x: 0.56, y: 0.72 }, { x: 0.30, y: 0.62 },
      { x: 0.54, y: -0.05 }, { x: 0.76, y: -0.14 }
    ]],
    delayedStrokes: [[{ x: 0.20, y: -0.50 }, { x: 0.58, y: -0.50 }]],
  },
};

export const FRENCH_CARREAUX_LOWERCASE: Record<string, CursiveGlyphDef> = {
  a: {
    char: 'a', advance: 1.04, entryJoin: 'baseline', exitJoin: 'baseline',
    entryPoint: { x: 0.06, y: -0.15 }, exitPoint: { x: 1.00, y: -0.15 },
    primaryStrokes: [[
      { x: 0.06, y: -0.15 }, { x: 0.50, y: -0.68 }, { x: 0.74, y: -0.96 },
      { x: 0.36, y: -1.04 }, { x: 0.12, y: -0.50 }, { x: 0.42, y: 0.02 },
      { x: 0.78, y: -0.92 }, { x: 0.80, y: -0.04 }, { x: 1.00, y: -0.15 }
    ]],
  },
  b: {
    char: 'b', advance: 0.94, entryJoin: 'baseline', exitJoin: 'high',
    entryPoint: { x: 0.06, y: -0.15 }, exitPoint: { x: 0.92, y: -0.82 },
    primaryStrokes: [[
      { x: 0.06, y: -0.15 }, { x: 0.38, y: -1.25 }, { x: 0.48, y: -2.05 },
      { x: 0.18, y: -1.80 }, { x: 0.22, y: -0.08 }, { x: 0.50, y: 0.02 },
      { x: 0.82, y: -0.44 }, { x: 0.66, y: -0.96 }, { x: 0.52, y: -0.82 }, { x: 0.92, y: -0.82 }
    ]],
  },
  c: {
    char: 'c', advance: 0.86, entryJoin: 'baseline', exitJoin: 'baseline',
    entryPoint: { x: 0.06, y: -0.15 }, exitPoint: { x: 0.84, y: -0.15 },
    primaryStrokes: [[
      { x: 0.06, y: -0.15 }, { x: 0.50, y: -0.68 }, { x: 0.72, y: -0.96 },
      { x: 0.36, y: -1.04 }, { x: 0.14, y: -0.48 }, { x: 0.46, y: 0.02 }, { x: 0.84, y: -0.15 }
    ]],
  },
  d: {
    // Authentic French Seyès unlooped straight ascender stem on 'd'
    char: 'd', advance: 1.02, entryJoin: 'baseline', exitJoin: 'baseline',
    entryPoint: { x: 0.06, y: -0.15 }, exitPoint: { x: 1.00, y: -0.15 },
    primaryStrokes: [[
      { x: 0.06, y: -0.15 }, { x: 0.72, y: -0.96 }, { x: 0.34, y: -1.04 },
      { x: 0.12, y: -0.50 }, { x: 0.42, y: 0.02 }, { x: 0.76, y: -0.85 },
      { x: 0.78, y: -1.68 }, { x: 0.80, y: -0.04 }, { x: 1.00, y: -0.15 }
    ]],
  },
  e: {
    char: 'e', advance: 0.80, entryJoin: 'baseline', exitJoin: 'baseline',
    entryPoint: { x: 0.05, y: -0.15 }, exitPoint: { x: 0.78, y: -0.15 },
    primaryStrokes: [[
      { x: 0.05, y: -0.15 }, { x: 0.48, y: -0.46 }, { x: 0.62, y: -0.82 },
      { x: 0.40, y: -1.04 }, { x: 0.16, y: -0.56 }, { x: 0.44, y: 0.02 }, { x: 0.78, y: -0.15 }
    ]],
  },
  f: {
    // Tall 3-unit ascender + deep 2-unit lower loop
    char: 'f', advance: 0.78, entryJoin: 'baseline', exitJoin: 'baseline',
    entryPoint: { x: 0.06, y: -0.15 }, exitPoint: { x: 0.76, y: -0.15 },
    primaryStrokes: [[
      { x: 0.06, y: -0.15 }, { x: 0.38, y: -1.25 }, { x: 0.54, y: -2.06 },
      { x: 0.26, y: -1.84 }, { x: 0.28, y: 0.00 }, { x: 0.28, y: 0.94 },
      { x: 0.54, y: 0.80 }, { x: 0.38, y: -0.06 }, { x: 0.76, y: -0.15 }
    ]],
  },
  g: {
    char: 'g', advance: 0.98, entryJoin: 'baseline', exitJoin: 'baseline',
    entryPoint: { x: 0.06, y: -0.15 }, exitPoint: { x: 0.96, y: -0.15 },
    primaryStrokes: [[
      { x: 0.06, y: -0.15 }, { x: 0.74, y: -0.96 }, { x: 0.36, y: -1.04 },
      { x: 0.12, y: -0.50 }, { x: 0.42, y: 0.02 }, { x: 0.76, y: -0.92 },
      { x: 0.74, y: 0.94 }, { x: 0.38, y: 0.82 }, { x: 0.68, y: -0.04 }, { x: 0.96, y: -0.15 }
    ]],
  },
  h: {
    char: 'h', advance: 1.02, entryJoin: 'baseline', exitJoin: 'baseline',
    entryPoint: { x: 0.06, y: -0.15 }, exitPoint: { x: 1.00, y: -0.15 },
    primaryStrokes: [[
      { x: 0.06, y: -0.15 }, { x: 0.36, y: -1.22 }, { x: 0.46, y: -2.05 },
      { x: 0.18, y: -1.80 }, { x: 0.22, y: 0.00 }, { x: 0.42, y: -0.84 },
      { x: 0.74, y: -1.02 }, { x: 0.82, y: -0.04 }, { x: 1.00, y: -0.15 }
    ]],
  },
  i: {
    char: 'i', advance: 0.54, entryJoin: 'baseline', exitJoin: 'baseline',
    entryPoint: { x: 0.05, y: -0.15 }, exitPoint: { x: 0.52, y: -0.15 },
    primaryStrokes: [[
      { x: 0.05, y: -0.15 }, { x: 0.28, y: -1.00 }, { x: 0.30, y: -0.04 }, { x: 0.52, y: -0.15 }
    ]],
    delayedStrokes: [[{ x: 0.30, y: -1.46 }]],
  },
  j: {
    char: 'j', advance: 0.62, entryJoin: 'baseline', exitJoin: 'baseline',
    entryPoint: { x: 0.05, y: -0.15 }, exitPoint: { x: 0.60, y: -0.15 },
    primaryStrokes: [[
      { x: 0.05, y: -0.15 }, { x: 0.36, y: -1.00 }, { x: 0.34, y: 0.94 },
      { x: 0.08, y: 0.78 }, { x: 0.38, y: -0.04 }, { x: 0.60, y: -0.15 }
    ]],
    delayedStrokes: [[{ x: 0.38, y: -1.46 }]],
  },
  k: {
    char: 'k', advance: 0.96, entryJoin: 'baseline', exitJoin: 'baseline',
    entryPoint: { x: 0.06, y: -0.15 }, exitPoint: { x: 0.94, y: -0.15 },
    primaryStrokes: [[
      { x: 0.06, y: -0.15 }, { x: 0.36, y: -1.25 }, { x: 0.44, y: -2.05 },
      { x: 0.16, y: -1.78 }, { x: 0.20, y: 0.00 }, { x: 0.48, y: -0.78 },
      { x: 0.72, y: -0.94 }, { x: 0.40, y: -0.48 }, { x: 0.74, y: -0.04 }, { x: 0.94, y: -0.15 }
    ]],
  },
  l: {
    char: 'l', advance: 0.58, entryJoin: 'baseline', exitJoin: 'baseline',
    entryPoint: { x: 0.05, y: -0.15 }, exitPoint: { x: 0.56, y: -0.15 },
    primaryStrokes: [[
      { x: 0.05, y: -0.15 }, { x: 0.32, y: -1.25 }, { x: 0.42, y: -2.05 },
      { x: 0.14, y: -1.78 }, { x: 0.24, y: -0.04 }, { x: 0.56, y: -0.15 }
    ]],
  },
  m: {
    char: 'm', advance: 1.46, entryJoin: 'baseline', exitJoin: 'baseline',
    entryPoint: { x: 0.06, y: -0.15 }, exitPoint: { x: 1.44, y: -0.15 },
    primaryStrokes: [[
      { x: 0.06, y: -0.15 }, { x: 0.28, y: -1.02 }, { x: 0.42, y: 0.00 },
      { x: 0.58, y: -0.84 }, { x: 0.74, y: -1.02 }, { x: 0.84, y: 0.00 },
      { x: 1.00, y: -0.84 }, { x: 1.16, y: -1.02 }, { x: 1.24, y: -0.04 }, { x: 1.44, y: -0.15 }
    ]],
  },
  n: {
    char: 'n', advance: 1.04, entryJoin: 'baseline', exitJoin: 'baseline',
    entryPoint: { x: 0.06, y: -0.15 }, exitPoint: { x: 1.00, y: -0.15 },
    primaryStrokes: [[
      { x: 0.06, y: -0.15 }, { x: 0.28, y: -1.02 }, { x: 0.42, y: 0.00 },
      { x: 0.58, y: -0.84 }, { x: 0.76, y: -1.02 }, { x: 0.82, y: -0.04 }, { x: 1.00, y: -0.15 }
    ]],
  },
  o: {
    char: 'o', advance: 0.90, entryJoin: 'baseline', exitJoin: 'high',
    entryPoint: { x: 0.06, y: -0.15 }, exitPoint: { x: 0.88, y: -0.84 },
    primaryStrokes: [[
      { x: 0.06, y: -0.15 }, { x: 0.72, y: -0.94 }, { x: 0.40, y: -1.04 },
      { x: 0.14, y: -0.52 }, { x: 0.44, y: 0.02 }, { x: 0.76, y: -0.54 },
      { x: 0.58, y: -0.94 }, { x: 0.88, y: -0.84 }
    ]],
  },
  p: {
    // Classic French Seyès open unlooped descender stem + rounded right arch
    char: 'p', advance: 0.98, entryJoin: 'baseline', exitJoin: 'baseline',
    entryPoint: { x: 0.06, y: -0.15 }, exitPoint: { x: 0.96, y: -0.15 },
    primaryStrokes: [[
      { x: 0.06, y: -0.15 }, { x: 0.30, y: -1.00 }, { x: 0.28, y: 0.92 },
      { x: 0.30, y: -0.78 }, { x: 0.62, y: -1.02 }, { x: 0.82, y: -0.50 },
      { x: 0.52, y: 0.00 }, { x: 0.42, y: -0.16 }, { x: 0.96, y: -0.15 }
    ]],
  },
  q: {
    char: 'q', advance: 0.98, entryJoin: 'baseline', exitJoin: 'baseline',
    entryPoint: { x: 0.06, y: -0.15 }, exitPoint: { x: 0.96, y: -0.15 },
    primaryStrokes: [[
      { x: 0.06, y: -0.15 }, { x: 0.72, y: -0.96 }, { x: 0.36, y: -1.04 },
      { x: 0.12, y: -0.50 }, { x: 0.42, y: 0.02 }, { x: 0.74, y: -0.90 },
      { x: 0.72, y: 0.94 }, { x: 0.90, y: 0.76 }, { x: 0.74, y: -0.04 }, { x: 0.96, y: -0.15 }
    ]],
  },
  r: {
    // Authentic French 'r' with miniature top-left eye loop + horizontal plateau + crisp vertical drop
    char: 'r', advance: 0.82, entryJoin: 'baseline', exitJoin: 'baseline',
    entryPoint: { x: 0.05, y: -0.15 }, exitPoint: { x: 0.80, y: -0.15 },
    primaryStrokes: [[
      { x: 0.05, y: -0.15 }, { x: 0.26, y: -1.04 }, { x: 0.16, y: -0.88 },
      { x: 0.30, y: -1.02 }, { x: 0.62, y: -1.00 }, { x: 0.60, y: -0.04 }, { x: 0.80, y: -0.15 }
    ]],
  },
  s: {
    // Round open snail-spiral French school 's'
    char: 's', advance: 0.80, entryJoin: 'baseline', exitJoin: 'baseline',
    entryPoint: { x: 0.05, y: -0.15 }, exitPoint: { x: 0.78, y: -0.15 },
    primaryStrokes: [[
      { x: 0.05, y: -0.15 }, { x: 0.46, y: -1.04 }, { x: 0.68, y: -0.44 },
      { x: 0.36, y: 0.02 }, { x: 0.18, y: -0.16 }, { x: 0.36, y: -0.22 }, { x: 0.78, y: -0.15 }
    ]],
  },
  t: {
    // Unlooped 2-unit French 't' stem
    char: 't', advance: 0.68, entryJoin: 'baseline', exitJoin: 'baseline',
    entryPoint: { x: 0.05, y: -0.15 }, exitPoint: { x: 0.66, y: -0.15 },
    primaryStrokes: [[
      { x: 0.05, y: -0.15 }, { x: 0.34, y: -1.52 }, { x: 0.36, y: -0.04 }, { x: 0.66, y: -0.15 }
    ]],
    delayedStrokes: [[{ x: 0.10, y: -1.08 }, { x: 0.62, y: -1.10 }]],
  },
  u: {
    char: 'u', advance: 0.98, entryJoin: 'baseline', exitJoin: 'baseline',
    entryPoint: { x: 0.06, y: -0.15 }, exitPoint: { x: 0.96, y: -0.15 },
    primaryStrokes: [[
      { x: 0.06, y: -0.15 }, { x: 0.28, y: -1.00 }, { x: 0.30, y: -0.15 },
      { x: 0.52, y: 0.02 }, { x: 0.76, y: -1.00 }, { x: 0.78, y: -0.04 }, { x: 0.96, y: -0.15 }
    ]],
  },
  v: {
    char: 'v', advance: 0.88, entryJoin: 'baseline', exitJoin: 'high',
    entryPoint: { x: 0.06, y: -0.15 }, exitPoint: { x: 0.86, y: -0.84 },
    primaryStrokes: [[
      { x: 0.06, y: -0.15 }, { x: 0.24, y: -1.02 }, { x: 0.48, y: 0.02 },
      { x: 0.74, y: -0.90 }, { x: 0.86, y: -0.84 }
    ]],
  },
  w: {
    char: 'w', advance: 1.28, entryJoin: 'baseline', exitJoin: 'high',
    entryPoint: { x: 0.06, y: -0.15 }, exitPoint: { x: 1.26, y: -0.84 },
    primaryStrokes: [[
      { x: 0.06, y: -0.15 }, { x: 0.24, y: -1.02 }, { x: 0.40, y: 0.02 },
      { x: 0.64, y: -0.96 }, { x: 0.86, y: 0.02 }, { x: 1.12, y: -0.90 }, { x: 1.26, y: -0.84 }
    ]],
  },
  x: {
    // Authentic French continuous opposing-crescent 'x' ):( drawn in one sweep!
    char: 'x', advance: 0.92, entryJoin: 'baseline', exitJoin: 'baseline',
    entryPoint: { x: 0.06, y: -0.15 }, exitPoint: { x: 0.90, y: -0.15 },
    primaryStrokes: [[
      { x: 0.06, y: -0.15 }, { x: 0.16, y: -0.94 }, { x: 0.44, y: -0.50 },
      { x: 0.34, y: -0.04 }, { x: 0.14, y: -0.10 }, { x: 0.44, y: -0.50 },
      { x: 0.74, y: -0.96 }, { x: 0.56, y: -0.96 }, { x: 0.44, y: -0.50 },
      { x: 0.62, y: 0.02 }, { x: 0.90, y: -0.15 }
    ]],
  },
  y: {
    char: 'y', advance: 0.98, entryJoin: 'baseline', exitJoin: 'baseline',
    entryPoint: { x: 0.06, y: -0.15 }, exitPoint: { x: 0.96, y: -0.15 },
    primaryStrokes: [[
      { x: 0.06, y: -0.15 }, { x: 0.26, y: -1.00 }, { x: 0.30, y: -0.12 },
      { x: 0.52, y: 0.02 }, { x: 0.74, y: -0.98 }, { x: 0.72, y: 0.94 },
      { x: 0.38, y: 0.80 }, { x: 0.68, y: -0.04 }, { x: 0.96, y: -0.15 }
    ]],
  },
  z: {
    // Classical French school 'z' with tiny upper step + symmetric 2-unit lower loop
    char: 'z', advance: 0.90, entryJoin: 'baseline', exitJoin: 'baseline',
    entryPoint: { x: 0.06, y: -0.15 }, exitPoint: { x: 0.88, y: -0.15 },
    primaryStrokes: [[
      { x: 0.06, y: -0.15 }, { x: 0.28, y: -1.00 }, { x: 0.64, y: -0.98 },
      { x: 0.26, y: -0.04 }, { x: 0.68, y: 0.92 }, { x: 0.36, y: 0.80 },
      { x: 0.66, y: -0.06 }, { x: 0.88, y: -0.15 }
    ]],
    delayedStrokes: [[{ x: 0.24, y: -0.50 }, { x: 0.64, y: -0.50 }]],
  },
};

export const RUSHED_MEDICAL_LOWERCASE: Record<string, CursiveGlyphDef> = {
  a: {
    char: 'a', advance: 0.88, entryJoin: 'baseline', exitJoin: 'baseline',
    entryPoint: { x: 0.04, y: -0.10 }, exitPoint: { x: 0.86, y: -0.12 },
    primaryStrokes: [[
      { x: 0.04, y: -0.10 }, { x: 0.58, y: -0.84, cusp: true }, { x: 0.28, y: -0.88 },
      { x: 0.12, y: -0.36 }, { x: 0.38, y: -0.06 }, { x: 0.66, y: -0.78 },
      { x: 0.68, y: -0.06 }, { x: 0.86, y: -0.12 }
    ]],
    altPrimaryStrokes: [
      [
        { x: 0.04, y: -0.10 }, { x: 0.52, y: -0.88, cusp: true }, { x: 0.24, y: -0.86 },
        { x: 0.14, y: -0.42 }, { x: 0.40, y: -0.07 }, { x: 0.64, y: -0.82 },
        { x: 0.66, y: -0.06 }, { x: 0.86, y: -0.12 }
      ],
      [
        { x: 0.04, y: -0.10 }, { x: 0.64, y: -0.82, cusp: true }, { x: 0.32, y: -0.90 },
        { x: 0.16, y: -0.38 }, { x: 0.36, y: -0.06 }, { x: 0.62, y: -0.76 },
        { x: 0.64, y: -0.06 }, { x: 0.84, y: -0.12 }
      ]
    ],
  },
  b: {
    char: 'b', advance: 0.82, entryJoin: 'baseline', exitJoin: 'high',
    entryPoint: { x: 0.04, y: -0.10 }, exitPoint: { x: 0.80, y: -0.68 },
    primaryStrokes: [[
      { x: 0.04, y: -0.10 }, { x: 0.36, y: -1.42 }, { x: 0.22, y: -1.28 },
      { x: 0.20, y: -0.06 }, { x: 0.44, y: -0.02 }, { x: 0.70, y: -0.44 },
      { x: 0.56, y: -0.78 }, { x: 0.80, y: -0.68 }
    ]],
  },
  c: {
    char: 'c', advance: 0.72, entryJoin: 'baseline', exitJoin: 'baseline',
    entryPoint: { x: 0.04, y: -0.10 }, exitPoint: { x: 0.70, y: -0.12 },
    primaryStrokes: [[
      { x: 0.04, y: -0.10 }, { x: 0.56, y: -0.82 }, { x: 0.26, y: -0.86 },
      { x: 0.12, y: -0.34 }, { x: 0.42, y: -0.06 }, { x: 0.70, y: -0.12 }
    ]],
    altPrimaryStrokes: [
      [
        { x: 0.04, y: -0.10 }, { x: 0.50, y: -0.86 }, { x: 0.22, y: -0.88 },
        { x: 0.14, y: -0.38 }, { x: 0.44, y: -0.06 }, { x: 0.72, y: -0.12 }
      ]
    ],
  },
  d: {
    char: 'd', advance: 0.88, entryJoin: 'baseline', exitJoin: 'baseline',
    entryPoint: { x: 0.04, y: -0.10 }, exitPoint: { x: 0.86, y: -0.12 },
    primaryStrokes: [[
      { x: 0.04, y: -0.10 }, { x: 0.60, y: -0.82, cusp: true }, { x: 0.26, y: -0.88 },
      { x: 0.12, y: -0.36 }, { x: 0.38, y: -0.06 }, { x: 0.68, y: -1.44 },
      { x: 0.68, y: -0.06 }, { x: 0.86, y: -0.12 }
    ]],
    altPrimaryStrokes: [
      [
        { x: 0.04, y: -0.10 }, { x: 0.54, y: -0.86, cusp: true }, { x: 0.22, y: -0.86 },
        { x: 0.14, y: -0.40 }, { x: 0.40, y: -0.06 }, { x: 0.66, y: -1.40 },
        { x: 0.66, y: -0.06 }, { x: 0.86, y: -0.12 }
      ]
    ],
  },
  e: {
    char: 'e', advance: 0.68, entryJoin: 'baseline', exitJoin: 'baseline',
    entryPoint: { x: 0.04, y: -0.10 }, exitPoint: { x: 0.66, y: -0.12 },
    primaryStrokes: [[
      { x: 0.04, y: -0.10 }, { x: 0.50, y: -0.66 }, { x: 0.30, y: -0.84 },
      { x: 0.14, y: -0.36 }, { x: 0.40, y: -0.06 }, { x: 0.66, y: -0.12 }
    ]],
    altPrimaryStrokes: [
      [
        { x: 0.04, y: -0.10 }, { x: 0.46, y: -0.72 }, { x: 0.26, y: -0.86 },
        { x: 0.16, y: -0.40 }, { x: 0.42, y: -0.06 }, { x: 0.68, y: -0.12 }
      ]
    ],
  },
  f: {
    char: 'f', advance: 0.70, entryJoin: 'baseline', exitJoin: 'baseline',
    entryPoint: { x: 0.04, y: -0.10 }, exitPoint: { x: 0.68, y: -0.12 },
    primaryStrokes: [[
      { x: 0.04, y: -0.10 }, { x: 0.46, y: -1.44 }, { x: 0.28, y: -1.32 },
      { x: 0.24, y: 0.48 }, { x: 0.44, y: 0.36 }, { x: 0.34, y: -0.06 }, { x: 0.68, y: -0.12 }
    ]],
  },
  g: {
    // Rapid rushed descender break
    char: 'g', advance: 0.84, entryJoin: 'baseline', exitJoin: 'break',
    entryPoint: { x: 0.04, y: -0.10 }, exitPoint: { x: 0.80, y: 0.10 },
    primaryStrokes: [[
      { x: 0.04, y: -0.10 }, { x: 0.62, y: -0.82, cusp: true }, { x: 0.28, y: -0.88 },
      { x: 0.10, y: -0.38 }, { x: 0.36, y: 0.00 }, { x: 0.64, y: -0.80 },
      { x: 0.58, y: 0.48 }, { x: 0.36, y: 0.38 }, { x: 0.80, y: 0.10 }
    ]],
  },
  h: {
    char: 'h', advance: 0.90, entryJoin: 'baseline', exitJoin: 'baseline',
    entryPoint: { x: 0.04, y: -0.10 }, exitPoint: { x: 0.88, y: -0.12 },
    primaryStrokes: [[
      { x: 0.04, y: -0.10 }, { x: 0.36, y: -1.42 }, { x: 0.22, y: -1.26 },
      { x: 0.20, y: 0.00 }, { x: 0.40, y: -0.72 }, { x: 0.66, y: -0.82 },
      { x: 0.72, y: -0.04 }, { x: 0.88, y: -0.12 }
    ]],
  },
  i: {
    char: 'i', advance: 0.46, entryJoin: 'baseline', exitJoin: 'baseline',
    entryPoint: { x: 0.04, y: -0.10 }, exitPoint: { x: 0.44, y: -0.12 },
    primaryStrokes: [[
      { x: 0.04, y: -0.10 }, { x: 0.24, y: -0.82 }, { x: 0.28, y: -0.04 }, { x: 0.44, y: -0.12 }
    ]],
    delayedStrokes: [[{ x: 0.32, y: -1.18 }]],
  },
  j: {
    char: 'j', advance: 0.54, entryJoin: 'baseline', exitJoin: 'break',
    entryPoint: { x: 0.04, y: -0.10 }, exitPoint: { x: 0.50, y: 0.08 },
    primaryStrokes: [[
      { x: 0.04, y: -0.10 }, { x: 0.30, y: -0.82 }, { x: 0.26, y: 0.48 },
      { x: 0.10, y: 0.36 }, { x: 0.50, y: 0.08 }
    ]],
    delayedStrokes: [[{ x: 0.36, y: -1.18 }]],
  },
  k: {
    char: 'k', advance: 0.84, entryJoin: 'baseline', exitJoin: 'baseline',
    entryPoint: { x: 0.04, y: -0.10 }, exitPoint: { x: 0.82, y: -0.12 },
    primaryStrokes: [[
      { x: 0.04, y: -0.10 }, { x: 0.34, y: -1.42 }, { x: 0.20, y: -1.25 },
      { x: 0.18, y: 0.00 }, { x: 0.42, y: -0.62 }, { x: 0.62, y: -0.74 },
      { x: 0.34, y: -0.38 }, { x: 0.66, y: -0.04 }, { x: 0.82, y: -0.12 }
    ]],
  },
  l: {
    char: 'l', advance: 0.48, entryJoin: 'baseline', exitJoin: 'baseline',
    entryPoint: { x: 0.04, y: -0.10 }, exitPoint: { x: 0.46, y: -0.12 },
    primaryStrokes: [[
      { x: 0.04, y: -0.10 }, { x: 0.30, y: -1.42 }, { x: 0.20, y: -1.26 },
      { x: 0.22, y: -0.04 }, { x: 0.46, y: -0.12 }
    ]],
  },
  m: {
    // Semi-flattened fast medial waves
    char: 'm', advance: 1.28, entryJoin: 'baseline', exitJoin: 'baseline',
    entryPoint: { x: 0.04, y: -0.10 }, exitPoint: { x: 1.26, y: -0.12 },
    primaryStrokes: [[
      { x: 0.04, y: -0.10 }, { x: 0.24, y: -0.76 }, { x: 0.38, y: -0.04 },
      { x: 0.56, y: -0.74 }, { x: 0.72, y: -0.04 }, { x: 0.94, y: -0.74 },
      { x: 1.08, y: -0.04 }, { x: 1.26, y: -0.12 }
    ]],
  },
  n: {
    char: 'n', advance: 0.90, entryJoin: 'baseline', exitJoin: 'baseline',
    entryPoint: { x: 0.04, y: -0.10 }, exitPoint: { x: 0.88, y: -0.12 },
    primaryStrokes: [[
      { x: 0.04, y: -0.10 }, { x: 0.26, y: -0.76 }, { x: 0.40, y: -0.04 },
      { x: 0.62, y: -0.76 }, { x: 0.74, y: -0.04 }, { x: 0.88, y: -0.12 }
    ]],
  },
  o: {
    char: 'o', advance: 0.76, entryJoin: 'baseline', exitJoin: 'high',
    entryPoint: { x: 0.04, y: -0.10 }, exitPoint: { x: 0.74, y: -0.70 },
    primaryStrokes: [[
      { x: 0.04, y: -0.10 }, { x: 0.58, y: -0.80 }, { x: 0.30, y: -0.86 },
      { x: 0.12, y: -0.40 }, { x: 0.38, y: 0.02 }, { x: 0.64, y: -0.48 },
      { x: 0.52, y: -0.78 }, { x: 0.74, y: -0.70 }
    ]],
  },
  p: {
    char: 'p', advance: 0.84, entryJoin: 'baseline', exitJoin: 'baseline',
    entryPoint: { x: 0.04, y: -0.10 }, exitPoint: { x: 0.82, y: -0.12 },
    primaryStrokes: [[
      { x: 0.04, y: -0.10 }, { x: 0.24, y: -0.80 }, { x: 0.20, y: 0.48 },
      { x: 0.28, y: -0.66 }, { x: 0.62, y: -0.80 }, { x: 0.70, y: -0.34 },
      { x: 0.40, y: -0.02 }, { x: 0.82, y: -0.12 }
    ]],
  },
  q: {
    char: 'q', advance: 0.86, entryJoin: 'baseline', exitJoin: 'break',
    entryPoint: { x: 0.04, y: -0.10 }, exitPoint: { x: 0.82, y: 0.04 },
    primaryStrokes: [[
      { x: 0.04, y: -0.10 }, { x: 0.62, y: -0.82 }, { x: 0.28, y: -0.86 },
      { x: 0.10, y: -0.38 }, { x: 0.36, y: 0.00 }, { x: 0.64, y: -0.78 },
      { x: 0.60, y: 0.48 }, { x: 0.82, y: 0.04 }
    ]],
  },
  r: {
    // Needle rapid medical 'r' (minimal shoulder, tight forward flick)
    char: 'r', advance: 0.64, entryJoin: 'baseline', exitJoin: 'baseline',
    entryPoint: { x: 0.04, y: -0.10 }, exitPoint: { x: 0.62, y: -0.12 },
    primaryStrokes: [[
      { x: 0.04, y: -0.10 }, { x: 0.26, y: -0.86 }, { x: 0.46, y: -0.74 },
      { x: 0.48, y: -0.06 }, { x: 0.62, y: -0.12 }
    ]],
    altPrimaryStrokes: [
      [
        { x: 0.04, y: -0.10 }, { x: 0.22, y: -0.92 }, { x: 0.40, y: -0.80 },
        { x: 0.44, y: -0.06 }, { x: 0.62, y: -0.12 }
      ]
    ],
  },
  s: {
    // Flattened rapid wave 's'
    char: 's', advance: 0.66, entryJoin: 'baseline', exitJoin: 'baseline',
    entryPoint: { x: 0.04, y: -0.10 }, exitPoint: { x: 0.64, y: -0.12 },
    primaryStrokes: [[
      { x: 0.04, y: -0.10 }, { x: 0.38, y: -0.86 }, { x: 0.54, y: -0.30 },
      { x: 0.22, y: -0.06 }, { x: 0.64, y: -0.12 }
    ]],
    altPrimaryStrokes: [
      [
        { x: 0.04, y: -0.10 }, { x: 0.34, y: -0.88 }, { x: 0.50, y: -0.34 },
        { x: 0.26, y: -0.06 }, { x: 0.66, y: -0.12 }
      ]
    ],
  },
  t: {
    char: 't', advance: 0.56, entryJoin: 'baseline', exitJoin: 'baseline',
    entryPoint: { x: 0.04, y: -0.10 }, exitPoint: { x: 0.54, y: -0.12 },
    primaryStrokes: [[
      { x: 0.04, y: -0.10 }, { x: 0.28, y: -1.26 }, { x: 0.32, y: -0.06 }, { x: 0.54, y: -0.12 }
    ]],
    altPrimaryStrokes: [
      [
        { x: 0.04, y: -0.10 }, { x: 0.26, y: -1.20 }, { x: 0.30, y: -0.06 }, { x: 0.52, y: -0.12 }
      ]
    ],
    delayedStrokes: [[{ x: 0.08, y: -0.92 }, { x: 0.58, y: -0.98 }]],
  },
  u: {
    char: 'u', advance: 0.86, entryJoin: 'baseline', exitJoin: 'baseline',
    entryPoint: { x: 0.04, y: -0.10 }, exitPoint: { x: 0.84, y: -0.12 },
    primaryStrokes: [[
      { x: 0.04, y: -0.10 }, { x: 0.24, y: -0.76 }, { x: 0.36, y: -0.06 },
      { x: 0.60, y: -0.76 }, { x: 0.66, y: -0.06 }, { x: 0.84, y: -0.12 }
    ]],
    altPrimaryStrokes: [
      [
        { x: 0.04, y: -0.10 }, { x: 0.22, y: -0.80 }, { x: 0.38, y: -0.06 },
        { x: 0.58, y: -0.78 }, { x: 0.64, y: -0.06 }, { x: 0.84, y: -0.12 }
      ]
    ],
  },
  v: {
    char: 'v', advance: 0.74, entryJoin: 'baseline', exitJoin: 'high',
    entryPoint: { x: 0.04, y: -0.10 }, exitPoint: { x: 0.72, y: -0.68 },
    primaryStrokes: [[
      { x: 0.04, y: -0.10 }, { x: 0.22, y: -0.78 }, { x: 0.42, y: 0.00 },
      { x: 0.64, y: -0.74 }, { x: 0.72, y: -0.68 }
    ]],
  },
  w: {
    char: 'w', advance: 1.10, entryJoin: 'baseline', exitJoin: 'high',
    entryPoint: { x: 0.04, y: -0.10 }, exitPoint: { x: 1.08, y: -0.68 },
    primaryStrokes: [[
      { x: 0.04, y: -0.10 }, { x: 0.22, y: -0.78 }, { x: 0.36, y: 0.00 },
      { x: 0.56, y: -0.74 }, { x: 0.74, y: 0.00 }, { x: 0.96, y: -0.74 }, { x: 1.08, y: -0.68 }
    ]],
  },
  x: {
    char: 'x', advance: 0.76, entryJoin: 'baseline', exitJoin: 'baseline',
    entryPoint: { x: 0.04, y: -0.10 }, exitPoint: { x: 0.74, y: -0.12 },
    primaryStrokes: [[
      { x: 0.04, y: -0.10 }, { x: 0.20, y: -0.82 }, { x: 0.62, y: -0.04 }, { x: 0.74, y: -0.12 }
    ]],
    delayedStrokes: [[{ x: 0.62, y: -0.84 }, { x: 0.14, y: -0.02 }]],
  },
  y: {
    char: 'y', advance: 0.84, entryJoin: 'baseline', exitJoin: 'break',
    entryPoint: { x: 0.04, y: -0.10 }, exitPoint: { x: 0.78, y: 0.06 },
    primaryStrokes: [[
      { x: 0.04, y: -0.10 }, { x: 0.24, y: -0.78 }, { x: 0.28, y: -0.10 },
      { x: 0.46, y: 0.00 }, { x: 0.64, y: -0.78 }, { x: 0.58, y: 0.48 },
      { x: 0.36, y: 0.36 }, { x: 0.78, y: 0.06 }
    ]],
  },
  z: {
    // Rapid STEM crossbarred 'ƶ'
    char: 'z', advance: 0.78, entryJoin: 'baseline', exitJoin: 'baseline',
    entryPoint: { x: 0.04, y: -0.10 }, exitPoint: { x: 0.76, y: -0.12 },
    primaryStrokes: [[
      { x: 0.04, y: -0.10 }, { x: 0.22, y: -0.82 }, { x: 0.62, y: -0.84 },
      { x: 0.20, y: -0.04 }, { x: 0.58, y: 0.00 }, { x: 0.76, y: -0.12 }
    ]],
    delayedStrokes: [[{ x: 0.18, y: -0.44 }, { x: 0.64, y: -0.46 }]],
  },
};

export const CURSIVE_STYLE_PROFILES: Record<string, CursiveProfileConfig> = {
  'collegiate-flow': {
    id: 'collegiate-flow',
    label: 'Collegiate Flow',
    xHeightRatio: 0.42,
    defaultSlantDeg: 12,
    pressureContrast: 0.65,
    loopWidthScale: 1.0,
    medialSquash: 0.05,
    breakAfterDescenders: false,
    alphabet: CURSIVE_LOWERCASE,
  },
  'palmer-business': {
    id: 'palmer-business',
    label: 'Palmer Business Cursive',
    xHeightRatio: 0.40,
    defaultSlantDeg: 21,
    pressureContrast: 0.55,
    loopWidthScale: 0.88,
    medialSquash: 0.04,
    breakAfterDescenders: false,
    alphabet: PALMER_BUSINESS_LOWERCASE,
  },
  'french-grands-carreaux': {
    id: 'french-grands-carreaux',
    label: 'French School (Grands Carreaux)',
    xHeightRatio: 0.36,
    defaultSlantDeg: 5,
    pressureContrast: 0.82,
    loopWidthScale: 1.06,
    medialSquash: 0.0,
    breakAfterDescenders: false,
    alphabet: FRENCH_CARREAUX_LOWERCASE,
  },
  'rushed-stem-medical': {
    id: 'rushed-stem-medical',
    label: 'Rushed STEM / Medical',
    xHeightRatio: 0.43,
    defaultSlantDeg: 17.5,
    pressureContrast: 0.42,
    loopWidthScale: 0.94,
    medialSquash: 0.18,
    breakAfterDescenders: true,
    alphabet: RUSHED_MEDICAL_LOWERCASE,
  },
};

export function getCursiveProfile(style?: string): CursiveProfileConfig {
  return CURSIVE_STYLE_PROFILES[style || 'rushed-stem-medical'] || CURSIVE_STYLE_PROFILES['rushed-stem-medical'];
}
