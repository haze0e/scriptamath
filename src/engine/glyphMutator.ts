import opentype from 'opentype.js';
import { HandwritingStyleSettings, AllographLibrary } from '../types';
import { SeededNoise } from './noise';

export interface GlyphDrawOptions {
  fontSize: number;
  wordIndex: number;
  charIndexInWord: number;
  wordLength: number;
  isFirstChar: boolean;
  isLastChar: boolean;
  prevChar: string | null;
  nextChar: string | null;
  lineProgress: number; // 0 to 1 down the page for hand fatigue
  handwriting: HandwritingStyleSettings;
  allographs?: AllographLibrary;
  skipTittle?: boolean;
  skipCrossbar?: boolean;
  isSharedCrossbar?: boolean;
  inkColor?: string;
  extraSlant?: number; // Biomechanical wrist cluster slant angle
}

export interface MutatedGlyphResult {
  path: opentype.Path;
  advanceWidth: number;
  bbox: { x1: number; y1: number; x2: number; y2: number };
  exitPoint: { x: number; y: number } | null;
  entryPoint: { x: number; y: number } | null;
  stemTop?: { x: number; y: number };
  tittleBase?: { x: number; y: number };
  crossbarCenter?: { x: number; y: number };
  inkPoolingPoints?: Array<{ x: number; y: number }>;
}

// Helper to determine letter anatomy
const ASCENDER_CHARS = new Set(['b', 'd', 'f', 'h', 'k', 'l', 't', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9']);
const DESCENDER_CHARS = new Set(['g', 'j', 'p', 'q', 'y', 'f', 'Q']);
const CORE_CHARS = new Set(['a', 'c', 'e', 'm', 'n', 'o', 'r', 's', 'u', 'v', 'w', 'x', 'z']);
const MEDIAL_RUNNERS = new Set(['m', 'n', 'u', 'i', 'r', 'e', 'c', 'o', 'a', 's']);
const LIFT_OFF_CHARS = new Set(['e', 'y', 'g', 'd', 's', 't', 'n', 'r', 'a', 'o']);

/**
 * Pushes or pulls path vertices along their edge normals to organically 
 * vary stroke fullness, open/close loops, and alter font blotchiness.
 */
export function morphContourNormals(
  commands: opentype.PathCommand[],
  noise: SeededNoise,
  charSeed: number,
  intensity: number,
  pixelScale: number = 1.0
): opentype.PathCommand[] {
  const result: opentype.PathCommand[] = [];
  let contourStart: { x: number; y: number } | null = null;
  const scaledScale = Math.min(1.0, Math.max(0.25, pixelScale));
  
  for (let i = 0; i < commands.length; i++) {
    const cmd = commands[i];
    if (cmd.type === 'M') {
      contourStart = { x: cmd.x, y: cmd.y };
      result.push(cmd);
      continue;
    }
    if (cmd.type === 'Z') {
      const lastOut = result[result.length - 1];
      if (
        contourStart &&
        lastOut &&
        'x' in lastOut &&
        'y' in lastOut &&
        commands[i - 1] &&
        'x' in commands[i - 1] &&
        'y' in commands[i - 1] &&
        Math.hypot((commands[i - 1] as any).x - contourStart.x, (commands[i - 1] as any).y - contourStart.y) < 0.5
      ) {
        (lastOut as any).x = contourStart.x;
        (lastOut as any).y = contourStart.y;
      }
      result.push(cmd);
      continue;
    }
    
    const prev = commands[i - 1];
    if (!prev || !('x' in prev) || !('y' in prev) || !('x' in cmd) || !('y' in cmd)) {
      result.push(cmd);
      continue;
    }
    
    // Compute tangent vector
    const dx = cmd.x - prev.x;
    const dy = cmd.y - prev.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    
    if (len < 0.5) {
      result.push(cmd);
      continue;
    }
    
    // Perpendicular normal vector (-dy, dx)
    const nx = -dy / len;
    const ny = dx / len;
    
    // Unique noise value per vertex based on position and character instance
    const n = noise.get2D(cmd.x * 0.08 + charSeed, cmd.y * 0.08 + charSeed);
    // Displace outward or inward scaled proportionally to font size
    const displacement = n * intensity * 1.5 * scaledScale;
    
    if (cmd.type === 'L') {
      result.push({
        type: 'L',
        x: cmd.x + nx * displacement,
        y: cmd.y + ny * displacement
      });
    } else if (cmd.type === 'Q') {
      result.push({
        type: 'Q',
        x1: cmd.x1 + nx * displacement * 0.7,
        y1: cmd.y1 + ny * displacement * 0.7,
        x: cmd.x + nx * displacement,
        y: cmd.y + ny * displacement
      });
    } else if (cmd.type === 'C') {
      result.push({
        type: 'C',
        x1: cmd.x1 + nx * displacement * 0.7,
        y1: cmd.y1 + ny * displacement * 0.7,
        x2: cmd.x2 + nx * displacement * 0.9,
        y2: cmd.y2 + ny * displacement * 0.9,
        x: cmd.x + nx * displacement,
        y: cmd.y + ny * displacement
      });
    }
  }
  
  return result;
}

export class GlyphMutator {
  private noise: SeededNoise;
  private archetypeHistoryMap: Map<string, number[]> = new Map();
  private allographHistoryMap: Map<string, number[]> = new Map();

  constructor(noise: SeededNoise) {
    this.noise = noise;
  }

  public reset(noise: SeededNoise) {
    this.noise = noise;
    this.archetypeHistoryMap.clear();
    this.allographHistoryMap.clear();
  }

  /**
   * Mutates an opentype.js glyph according to biomechanical parameters and physics rules.
   */
  public mutateGlyph(
    font: opentype.Font,
    char: string,
    x: number,
    y: number,
    options: GlyphDrawOptions
  ): MutatedGlyphResult {
    const {
      fontSize,
      charIndexInWord,
      wordLength,
      isFirstChar,
      isLastChar,
      prevChar,
      lineProgress,
      handwriting,
    } = options;

    // Check for custom user-drawn allograph variant from Glyph Studio
    if (options.allographs && options.allographs[char]?.length) {
      const variantIdx = this.sampleAllographVariant(char, options.allographs);
      const customVariant = variantIdx !== null ? options.allographs[char][variantIdx] : null;
      if (customVariant && customVariant.strokes.length > 0) {
        const customPath = new opentype.Path();
        const boxH = customVariant.height === 140 ? 280 : customVariant.height;
        const scale = fontSize / (boxH * 0.72);
        const baselineOffset = boxH * 0.75;
        const baselineNoise = this.noise.noise1D(x * 0.01 + y * 0.005) * (handwriting.baselineWave ?? 0.35) * 4.0;
        let minX = Infinity, maxX = -Infinity;
        for (const stroke of customVariant.strokes) {
          for (const pt of stroke) {
            if (pt[0] < minX) minX = pt[0];
            if (pt[0] > maxX) maxX = pt[0];
          }
        }
        const leftPad = Number.isFinite(minX) ? minX : 0;
        for (const stroke of customVariant.strokes) {
          if (stroke.length === 0) continue;
          customPath.moveTo(x + (stroke[0][0] - leftPad) * scale, y + baselineNoise + (stroke[0][1] - baselineOffset) * scale);
          for (let s = 1; s < stroke.length; s++) {
            customPath.lineTo(x + (stroke[s][0] - leftPad) * scale, y + baselineNoise + (stroke[s][1] - baselineOffset) * scale);
          }
        }
        customPath.fill = null as unknown as string;
        customPath.stroke = options.inkColor || '#1b3b8c';
        customPath.strokeWidth = Math.max(1.4, (fontSize / 28) * 1.8);
        const advW = Number.isFinite(maxX - minX) && maxX > minX ? (maxX - minX) * scale + fontSize * 0.12 : fontSize * 0.58;
        return {
          path: customPath,
          advanceWidth: advW,
          bbox: { x1: x, y1: y + baselineNoise - fontSize * 0.75, x2: x + advW, y2: y + baselineNoise },
          exitPoint: null,
          entryPoint: null,
        };
      }
    }

    const glyph = font.charToGlyph(char);
    const glyphPath = glyph.getPath(x, y, fontSize);
    const unitsPerEm = font.unitsPerEm > 0 ? font.unitsPerEm : 1000;
    const advanceWidth = glyph.advanceWidth ? (glyph.advanceWidth * fontSize) / unitsPerEm : fontSize * 0.55;

    // Check if character is identical to previous character (Anti-Duplication Rule)
    const isConsecutiveIdentical = prevChar === char && handwriting.antiDuplication;

    // Intra-word velocity physics factors
    let scaleX = 1.0;
    let scaleY = 1.0;
    // Base global slant from handwriting settings (e.g. 16° for boy, 4° for girl) + wrist cluster slant
    let tiltAngleDeg = (options.extraSlant || 0) + (handwriting.slantAngle !== undefined ? handwriting.slantAngle : 0);

    // Fatigue factor increases slant and loosening down the page
    const fatigue = (handwriting.handFatigue || 0) * lineProgress * 0.18;

    // 4 Discrete Biomechanical Allograph Archetypes per character
    const recentArchetypes = this.archetypeHistoryMap.get(char) || [];
    const lastArch = recentArchetypes.length > 0 ? recentArchetypes[0] : -1;
    let archetype = Math.floor(this.noise.random() * 4);

    // Archetype weighting based on persona
    if (handwriting.persona === 'girl-neat-cursive') {
      // Girl's hand favors Round & Open (0) and Curved C-Stem (2)
      if (this.noise.random() < 0.65) {
        archetype = this.noise.random() < 0.55 ? 0 : 2;
      }
    } else if (handwriting.persona === 'boy-stem-cursive' || handwriting.persona === 'exam-prep-rushed') {
      // Boy's rushed hand favors Fast & Angular (1) and S-Stem / Trailing (3)
      if (this.noise.random() < 0.65) {
        archetype = this.noise.random() < 0.60 ? 1 : 3;
      }
    }

    if (archetype === lastArch) {
      archetype = (archetype + 1 + Math.floor(this.noise.random() * 3)) % 4;
    }
    this.archetypeHistoryMap.set(char, [archetype]);

    let curveCStem = false;
    let curveSStem = false;

    if (archetype === 0) {
      // Archetype 0: Round & Open (+7% width, -4% height)
      scaleX *= 1.07;
      scaleY *= 0.96;
    } else if (archetype === 1) {
      // Archetype 1: Fast & Angular (-8% width, +5° forward slant)
      scaleX *= 0.92;
      tiltAngleDeg += 5.0;
    } else if (archetype === 2) {
      // Archetype 2: Curved C-Stem (vertical stems gently bow rightward)
      curveCStem = true;
    } else if (archetype === 3) {
      // Archetype 3: Curved S-Stem / Trailing (upright entry curving to forward slant + exit flick)
      curveSStem = true;
      tiltAngleDeg -= 2.0;
    }

    if (isFirstChar) {
      // Initial Letter Boost: focus, larger, more upright
      const boost = 0.04 + 0.04 * handwriting.intraWordVelocity;
      scaleX *= 1.0 + boost;
      scaleY *= 1.0 + boost;
      tiltAngleDeg -= 1.5;
    } else if (charIndexInWord > 1 && charIndexInWord < wordLength - 1 && wordLength >= 4) {
      // Mid-word acceleration: letters flatten slightly in Y, stretch in X, tilt right
      const accel = handwriting.intraWordVelocity * 0.5;
      scaleY *= 1.0 - 0.06 * accel;
      scaleX *= 1.0 + 0.05 * accel;
      tiltAngleDeg += (2.5 + fatigue * 10) * accel;
    }

    if (isLastChar && wordLength > 2) {
      // Last letter flick readiness
      tiltAngleDeg += 1.0;
    }

    // Anti-duplication counter-warp:
    if (isConsecutiveIdentical) {
      scaleY *= 0.91;
      scaleX *= 1.08;
      tiltAngleDeg += 3.5;
    }

    // Medial Slurring: fast-handwriting wave for interior runner letters in words >= 7 chars
    const isMedialRunner =
      wordLength >= 7 &&
      charIndexInWord >= 2 &&
      charIndexInWord <= wordLength - 3 &&
      MEDIAL_RUNNERS.has(char.toLowerCase());

    if (isMedialRunner) {
      // Progressively compress vertical x-height (0.90 down to 0.82)
      // while stretching horizontal advance (1.06 up to 1.12)
      const mid = (wordLength - 1) / 2;
      const centerRatio = 1.0 - Math.min(1.0, Math.abs(charIndexInWord - mid) / mid);
      scaleY *= 0.90 - 0.08 * centerRatio;
      scaleX *= 1.06 + 0.06 * centerRatio;
    }

    // Digits: 8% taller than lowercase text
    const isDigit = char >= '0' && char <= '9';
    if (isDigit) {
      scaleY *= 1.08;
      scaleX *= 1.02;
    }

    // Baseline wave noise
    const baselineNoise = this.noise.noise1D(x * 0.01 + y * 0.005) * handwriting.baselineWave * 4.0;
    let finalBaselineY = y + baselineNoise;

    // Sub-baseline hang & bounce on numeric digits
    if (isDigit) {
      // ±1.5px baseline bounce
      finalBaselineY += (this.noise.random() - 0.5) * 3.0;
      // 3, 4, 5, 7, 9 dip 2px-3px below the blue ruled line
      if (char === '3' || char === '4' || char === '5' || char === '7' || char === '9') {
        finalBaselineY += 2.0 + this.noise.random() * 1.0;
      }
    }

    // Compute original bounding box of glyph
    const bbox = glyphPath.getBoundingBox();
    const glyphHeight = Math.max(1, bbox.y2 - bbox.y1);
    const glyphWidth = Math.max(1, bbox.x2 - bbox.x1);
    const ascenderThreshold = bbox.y1 + glyphHeight * 0.35;
    const descenderThreshold = bbox.y2 - glyphHeight * 0.35;

    // Extract raw Bezier commands and apply 3-Zone Anatomical Deformation Grid
    const warpAmount = handwriting.loopWarp;
    const commands: opentype.PathCommand[] = [];

    // Track potential entry/exit terminals and key anatomy points
    let entryPoint: { x: number; y: number } | null = null;
    let exitPoint: { x: number; y: number } | null = null;
    let stemTop: { x: number; y: number } | undefined;
    let crossbarCenter: { x: number; y: number } | undefined;
    let tittleBase: { x: number; y: number } | undefined;

    // Separate tittle suppression:
    // If char is 'i' or 'j', we identify the detached dot contour (commands that are isolated near the top)
    const isTittleChar = char === 'i' || char === 'j';
    let inTittleContour = false;
    let inCrossbarContour = false;

    // Extract contours for crossbar, tittle, and inner counter loops ("blind loops")
    const contourMap = new Map<number, { centerX: number; centerY: number; minX: number; maxX: number; minY: number; maxY: number }>();
    let cIdx = 0;
    let minX = 999999, maxX = -999999, minY = 999999, maxY = -999999;
    let sumX = 0, sumY = 0, count = 0;

    for (const cmd of glyphPath.commands) {
      if (cmd.type === 'M') {
        if (cIdx > 0) {
          contourMap.set(cIdx, {
            centerX: count > 0 ? sumX / count : x + advanceWidth * 0.5,
            centerY: count > 0 ? sumY / count : finalBaselineY,
            minX, maxX, minY, maxY,
          });
        }
        cIdx++;
        minX = 999999; maxX = -999999; minY = 999999; maxY = -999999;
        sumX = 0; sumY = 0; count = 0;
      }
      if ('x' in cmd && cmd.x !== undefined) {
        minX = Math.min(minX, cmd.x);
        maxX = Math.max(maxX, cmd.x);
        sumX += cmd.x;
        count++;
      }
      if ('y' in cmd && cmd.y !== undefined) {
        minY = Math.min(minY, cmd.y);
        maxY = Math.max(maxY, cmd.y);
        sumY += cmd.y;
      }
    }
    if (cIdx > 0) {
      contourMap.set(cIdx, {
        centerX: count > 0 ? sumX / count : x + advanceWidth * 0.5,
        centerY: count > 0 ? sumY / count : finalBaselineY,
        minX, maxX, minY, maxY,
      });
    }

    // Separate crossbar contour detection when sharedCrossbar is active
    let crossbarContourIndex = -1;
    if (options.isSharedCrossbar && (char === 't' || char === 'f')) {
      const crossbarTargetY = bbox.y1 + glyphHeight * 0.38;
      for (const [idx, c] of contourMap.entries()) {
        const cWidth = c.maxX - c.minX;
        const cHeight = c.maxY - c.minY;
        if (cWidth > cHeight * 1.3 && Math.abs(c.centerY - crossbarTargetY) < glyphHeight * 0.28) {
          crossbarContourIndex = idx;
          crossbarCenter = { x: c.centerX, y: c.centerY };
          break;
        }
      }
    }

    // First pass for i/j dot contour detection
    let tittleContourIndex = -1;
    if (isTittleChar && handwriting.flyingDotChaos > 0 && contourMap.size >= 2) {
      let dotCandidate: { index: number; minX: number; maxX: number; minY: number; maxY: number; centerX: number } | null = null;
      for (const [idx, c] of contourMap.entries()) {
        if (!dotCandidate || c.maxY < dotCandidate.maxY) {
          dotCandidate = { index: idx, ...c };
        }
      }
      if (dotCandidate && dotCandidate.maxY < bbox.y1 + glyphHeight * 0.45 && (dotCandidate.maxY - dotCandidate.minY) < glyphHeight * 0.40) {
        tittleContourIndex = dotCandidate.index;
        tittleBase = { x: dotCandidate.centerX, y: dotCandidate.minY };
      }
    }

    // Transform coordinate helper with Dual-Frequency Deformation & Inner Loop Pinching
    let currentContour = 0;
    const pixelScale = (fontSize || 28) / 28;
    const spatialSeed = ((Math.floor(x * 7.3) ^ Math.floor(y * 13.7)) & 0xffff) * 0.01;
    const charSeedOffset = (charIndexInWord * 17.3) + (wordLength * 5.1) + spatialSeed;
    const ENCLOSED_CHARS = new Set(['e', 'a', 'o', 'd', 'g', 'p', 'b', 'q', '6', '8', '9', '0']);

    // Precalculate contour shifts and pinches once per glyph so transformPoint NEVER calls random() inside vertex loops!
    const numContours = Math.max(8, contourMap.size + 1);
    const contourShiftX: number[] = [0];
    const contourShiftY: number[] = [0];
    const contourPinch: number[] = [1.0];
    for (let ci = 1; ci < numContours; ci++) {
      contourShiftX.push((this.noise.random() - 0.5) * 2.0 * warpAmount * pixelScale);
      contourShiftY.push((this.noise.random() - 0.5) * 1.8 * warpAmount * pixelScale);
      contourPinch.push(1.0 - (this.noise.random() * 0.35 * warpAmount));
    }

    const stemCenterX = x + advanceWidth * 0.45;
    const crossbarZoneMinY = bbox.y1 + glyphHeight * 0.18;
    const crossbarZoneMaxY = bbox.y1 + glyphHeight * 0.55;

    const transformPoint = (
      px: number,
      py: number,
      isControlPoint = false
    ): [number, number] => {
      if (
        options.isSharedCrossbar &&
        crossbarContourIndex === -1 &&
        (char === 't' || char === 'f') &&
        py >= crossbarZoneMinY &&
        py <= crossbarZoneMaxY &&
        Math.abs(px - stemCenterX) > glyphWidth * 0.22
      ) {
        // Retract protruding crossbar arms into the vertical stem so drawSharedCrossbar replaces them cleanly
        px = stemCenterX + (px - stemCenterX) * 0.18;
      }

      // Base center relative coordinates
      const relX = px - x;
      const relY = py - finalBaselineY;

      // 3-Zone warping
      let zScaleX = scaleX;
      let zScaleY = scaleY;
      let zTilt = tiltAngleDeg + fatigue * 8;
      let noiseX = 0;
      let noiseY = 0;

      // Non-linear quadratic stem curvature for Archetype 2 (Curved C-Stem)
      if (curveCStem) {
        const normY = relY / (fontSize || 28);
        noiseX += 3.5 * Math.pow(normY, 2) * pixelScale;
      }
      // Non-linear inflection for Archetype 3 (Curved S-Stem)
      if (curveSStem) {
        const normY = relY / (fontSize || 28);
        zTilt += normY * 7.0;
      }

      if (ASCENDER_CHARS.has(char) && py < ascenderThreshold) {
        // Ascender zone: top 35% of b, d, f, h, k, l, t
        const ascWarp = this.noise.noise1D(px * 0.05 + py * 0.03) * warpAmount;
        zTilt += ascWarp * 6.0; // tilt ±6°
        zScaleY *= 1.0 + (this.noise.noise1D(px * 0.02) * 0.25 - 0.08) * warpAmount;
      } else if (DESCENDER_CHARS.has(char) && py > descenderThreshold) {
        // Descender zone: bottom 35% of g, j, p, q, y, f
        const descWarp = this.noise.noise1D(px * 0.04 + py * 0.04) * warpAmount;
        zScaleY *= 1.0 + (descWarp * 0.35 - 0.05) * warpAmount;
        zTilt += descWarp * 4.0;
      }

      // Dual-Frequency Topological Deformation:
      // 1. Low-frequency posture bend (warps top vs bottom halves differently)
      const lowFreqX = this.noise.get2D(px * 0.015 + charSeedOffset, py * 0.015) * 2.8 * warpAmount * pixelScale;
      const lowFreqY = this.noise.get2D(px * 0.015 + 50, py * 0.015 + charSeedOffset) * 2.2 * warpAmount * pixelScale;

      // 2. High-frequency control point jitter (alters loop roundness and cusp sharpness)
      const handleFactor = isControlPoint ? 1.35 : 0.65;
      const phaseOffset = currentContour * 4.3 + charSeedOffset;
      const highFreqX = this.noise.get2D(px * 0.09 + phaseOffset, py * 0.09) * 2.4 * warpAmount * handleFactor * pixelScale;
      const highFreqY = this.noise.get2D(px * 0.09 + 23.1, py * 0.09 + phaseOffset) * 2.0 * warpAmount * handleFactor * pixelScale;

      noiseX += lowFreqX + highFreqX;
      noiseY += lowFreqY + highFreqY;

      // 3. Inner Counter-Loop Pinching ("Blind Loops")
      // Uses pre-calculated smooth shifts so neighboring Bezier vertices never jump apart randomly
      if (currentContour >= 2 && ENCLOSED_CHARS.has(char)) {
        const cInfo = contourMap.get(currentContour);
        if (cInfo) {
          const pinch = contourPinch[currentContour] ?? 0.85;
          const shiftX = contourShiftX[currentContour] ?? 0;
          const shiftY = contourShiftY[currentContour] ?? 0;
          noiseX += (cInfo.centerX - px) * (1 - pinch) + shiftX;
          noiseY += (cInfo.centerY - py) * (1 - pinch) + shiftY;
        }
      }

      // Convert tilt angle to shear
      const rad = (zTilt * Math.PI) / 180;
      const shearedX = relX * zScaleX + Math.sin(rad) * -relY + noiseX;
      const shearedY = relY * zScaleY + noiseY;

      return [x + shearedX, finalBaselineY + shearedY];
    };

    if (crossbarCenter) {
      const [ccx, ccy] = transformPoint(crossbarCenter.x, crossbarCenter.y, false);
      crossbarCenter = { x: ccx, y: ccy };
    } else if (char === 't' || char === 'f') {
      crossbarCenter = {
        x: x + advanceWidth * 0.45,
        y: finalBaselineY - fontSize * 0.45,
      };
    }

    if (tittleBase) {
      const [tx, ty] = transformPoint(tittleBase.x, tittleBase.y, false);
      tittleBase = { x: tx, y: ty };
    }

    // Calculate Anatomical Entry & Exit Anchors from character classification & bounding box
    const BASELINE_ENTRY = new Set(['i', 'u', 'w', 't', 'r', 's', 'e', 'l', 'b', 'h', 'k', 'p']);
    const MID_BOWL_ENTRY = new Set(['a', 'c', 'd', 'g', 'o', 'q']);
    const BASELINE_EXIT = new Set(['a', 'c', 'd', 'e', 'h', 'i', 'k', 'l', 'm', 'n', 'r', 't', 'u']);
    const DESCENDER_EXIT = new Set(['g', 'j', 'y', 'q']);

    if (BASELINE_ENTRY.has(char)) {
      entryPoint = { x: bbox.x1 + glyphWidth * 0.10, y: finalBaselineY - fontSize * 0.18 };
    } else if (MID_BOWL_ENTRY.has(char)) {
      entryPoint = { x: bbox.x2 - glyphWidth * 0.15, y: finalBaselineY - fontSize * 0.38 };
    } else {
      entryPoint = { x: bbox.x1 + glyphWidth * 0.12, y: finalBaselineY - fontSize * 0.22 };
    }

    if (BASELINE_EXIT.has(char)) {
      exitPoint = { x: bbox.x2 - glyphWidth * 0.08, y: finalBaselineY - fontSize * 0.12 };
    } else if (DESCENDER_EXIT.has(char)) {
      exitPoint = { x: bbox.x2 - glyphWidth * 0.15, y: finalBaselineY + fontSize * 0.05 };
    } else {
      exitPoint = { x: bbox.x2 - glyphWidth * 0.10, y: finalBaselineY - fontSize * 0.15 };
    }

    if (entryPoint) {
      const [ex, ey] = transformPoint(entryPoint.x, entryPoint.y, false);
      entryPoint = { x: ex, y: ey };
    }
    if (exitPoint) {
      const [ex, ey] = transformPoint(exitPoint.x, exitPoint.y, false);
      exitPoint = { x: ex, y: ey };
    }

    // Now process all commands
    currentContour = 0;
    for (let i = 0; i < glyphPath.commands.length; i++) {
      const cmd = glyphPath.commands[i];

      if (cmd.type === 'M') {
        currentContour++;
        if (currentContour === tittleContourIndex && isTittleChar && handwriting.flyingDotChaos > 0) {
          inTittleContour = true;
          continue;
        } else {
          inTittleContour = false;
        }
        if (currentContour === crossbarContourIndex && options.isSharedCrossbar && (char === 't' || char === 'f')) {
          inCrossbarContour = true;
          continue;
        } else {
          inCrossbarContour = false;
        }

        const [nx, ny] = transformPoint(cmd.x, cmd.y, false);
        commands.push({ type: 'M', x: nx, y: ny });
      } else if (inTittleContour || inCrossbarContour) {
        // Skip dot contour or suppressed crossbar contour
        continue;
      } else if (cmd.type === 'L') {
        const [nx, ny] = transformPoint(cmd.x, cmd.y, false);
        commands.push({ type: 'L', x: nx, y: ny });

        if (char === 't' || char === 'f') {
          if (!stemTop || ny < stemTop.y) {
            stemTop = { x: nx, y: ny };
          }
        }
      } else if (cmd.type === 'C') {
        const [nx1, ny1] = transformPoint(cmd.x1, cmd.y1, true);
        const [nx2, ny2] = transformPoint(cmd.x2, cmd.y2, true);
        const [nx, ny] = transformPoint(cmd.x, cmd.y, false);
        commands.push({ type: 'C', x1: nx1, y1: ny1, x2: nx2, y2: ny2, x: nx, y: ny });
      } else if (cmd.type === 'Q') {
        const [nx1, ny1] = transformPoint(cmd.x1, cmd.y1, true);
        const [nx, ny] = transformPoint(cmd.x, cmd.y, false);
        commands.push({ type: 'Q', x1: nx1, y1: ny1, x: nx, y: ny });
      } else if (cmd.type === 'Z') {
        commands.push({ type: 'Z' });
      }
    }

    // Real vertex scan over mutated commands for precise entry & exit points
    const isHighExitChar = char === 'o' || char === 'v' || char === 'w' || char === 'b';
    const entryMinY = isHighExitChar ? finalBaselineY - 0.60 * fontSize : finalBaselineY - 0.55 * fontSize;
    const entryMaxY = isHighExitChar ? finalBaselineY - 0.30 * fontSize : finalBaselineY + 0.05 * fontSize;

    const exitMinY = isHighExitChar ? finalBaselineY - 0.60 * fontSize : finalBaselineY - 0.45 * fontSize;
    const exitMaxY = isHighExitChar ? finalBaselineY - 0.30 * fontSize : finalBaselineY + 0.08 * fontSize;

    let scanEntryX = Infinity;
    let scanEntryY = finalBaselineY - fontSize * 0.18;
    let scanExitX = -Infinity;
    let scanExitY = finalBaselineY - fontSize * 0.12;

    for (const cmd of commands) {
      if ('x' in cmd && 'y' in cmd && typeof cmd.x === 'number' && typeof cmd.y === 'number') {
        if (cmd.y >= entryMinY && cmd.y <= entryMaxY) {
          if (cmd.x < scanEntryX) {
            scanEntryX = cmd.x;
            scanEntryY = cmd.y;
          }
        }
        if (cmd.y >= exitMinY && cmd.y <= exitMaxY) {
          if (cmd.x > scanExitX) {
            scanExitX = cmd.x;
            scanExitY = cmd.y;
          }
        }
      }
    }

    if (Number.isFinite(scanEntryX)) {
      entryPoint = { x: scanEntryX, y: scanEntryY };
    }
    if (Number.isFinite(scanExitX)) {
      exitPoint = { x: scanExitX, y: scanExitY };
    }

    // Mid-Word "Fast Slurring" Smoothing:
    // Blend Bezier control points 20% toward midpoint of neighbors to smooth sharp cusps into slurred waves
    if (isMedialRunner && commands.length > 2) {
      interface PointRef {
        x: number;
        y: number;
        assign: (nx: number, ny: number) => void;
      }
      let contourPoints: PointRef[] = [];

      const smoothContour = (pts: PointRef[]) => {
        if (pts.length < 3) return;
        const n = pts.length;
        const orig = pts.map((p) => ({ x: p.x, y: p.y }));
        for (let j = 1; j < n - 1; j++) {
          const sx = 0.8 * orig[j].x + 0.1 * (orig[j - 1].x + orig[j + 1].x);
          const sy = 0.8 * orig[j].y + 0.1 * (orig[j - 1].y + orig[j + 1].y);
          pts[j].assign(sx, sy);
        }
      };

      for (const cmd of commands) {
        if (cmd.type === 'M') {
          if (contourPoints.length > 0) {
            smoothContour(contourPoints);
            contourPoints = [];
          }
          contourPoints.push({
            x: cmd.x,
            y: cmd.y,
            assign: (nx, ny) => {
              cmd.x = nx;
              cmd.y = ny;
            },
          });
        } else if (cmd.type === 'L') {
          contourPoints.push({
            x: cmd.x,
            y: cmd.y,
            assign: (nx, ny) => {
              cmd.x = nx;
              cmd.y = ny;
            },
          });
        } else if (cmd.type === 'Q') {
          contourPoints.push({
            x: cmd.x1,
            y: cmd.y1,
            assign: (nx, ny) => {
              cmd.x1 = nx;
              cmd.y1 = ny;
            },
          });
          contourPoints.push({
            x: cmd.x,
            y: cmd.y,
            assign: (nx, ny) => {
              cmd.x = nx;
              cmd.y = ny;
            },
          });
        } else if (cmd.type === 'C') {
          contourPoints.push({
            x: cmd.x1,
            y: cmd.y1,
            assign: (nx, ny) => {
              cmd.x1 = nx;
              cmd.y1 = ny;
            },
          });
          contourPoints.push({
            x: cmd.x2,
            y: cmd.y2,
            assign: (nx, ny) => {
              cmd.x2 = nx;
              cmd.y2 = ny;
            },
          });
          contourPoints.push({
            x: cmd.x,
            y: cmd.y,
            assign: (nx, ny) => {
              cmd.x = nx;
              cmd.y = ny;
            },
          });
        } else if (cmd.type === 'Z') {
          if (contourPoints.length > 0) {
            smoothContour(contourPoints);
            contourPoints = [];
          }
        }
      }
      if (contourPoints.length > 0) {
        smoothContour(contourPoints);
      }
    }



    // Section 4: Vertex-Normal Pinch and Swell
    // Morph path vertices along edge normals to organically vary stroke fullness,
    // open/close loops, and dynamically break repeated font blotches on 's', '2', 'y', '4'
    const finalCommands = morphContourNormals(
      commands,
      this.noise,
      charSeedOffset + char.charCodeAt(0) * 11.3,
      handwriting.antiDuplication ? 1.0 : 0.65,
      pixelScale
    );

    // Collect sharp turnaround vertices for microscopic ballpoint ink pooling
    const inkPoolingPoints: Array<{ x: number; y: number }> = [];
    let prevVector: { dx: number; dy: number } | null = null;
    let prevPos: { x: number; y: number } | null = null;

    for (const c of finalCommands) {
      if (c.type === 'M') {
        prevPos = { x: c.x, y: c.y };
        prevVector = null;
        inkPoolingPoints.push({ x: c.x, y: c.y });
      } else if (c.type === 'L' || c.type === 'C' || c.type === 'Q') {
        const curPos = { x: c.x, y: c.y };
        if (prevPos) {
          const dx = curPos.x - prevPos.x;
          const dy = curPos.y - prevPos.y;
          const len = Math.sqrt(dx * dx + dy * dy);
          if (len > 1.5) {
            const curVector = { dx: dx / len, dy: dy / len };
            if (prevVector) {
              const dot = prevVector.dx * curVector.dx + prevVector.dy * curVector.dy;
              if (dot < -0.34) {
                // Angle > 110 deg (sharp hairpin turnaround)
                inkPoolingPoints.push({ x: prevPos.x, y: prevPos.y });
              }
            }
            prevVector = curVector;
          }
        }
        prevPos = curPos;
      }
    }

    const mutatedPath = new opentype.Path();
    mutatedPath.commands = finalCommands;
    mutatedPath.fill = options.inkColor || '#1b3b8c';

    // Approximate crossbar center for t or f (fallback only)
    if ((char === 't' || char === 'f') && !crossbarCenter) {
      crossbarCenter = {
        x: x + advanceWidth * 0.45,
        y: finalBaselineY - fontSize * 0.45,
      };
    }

    return {
      path: mutatedPath,
      advanceWidth: advanceWidth * scaleX,
      bbox: {
        x1: bbox.x1,
        y1: bbox.y1 + baselineNoise,
        x2: bbox.x2,
        y2: bbox.y2 + baselineNoise,
      },
      exitPoint,
      entryPoint,
      stemTop,
      crossbarCenter,
      tittleBase: tittleContourIndex !== -1 ? tittleBase : undefined,
      inkPoolingPoints,
    };
  }

  /**
   * Procedurally renders a Flying Tittle (i or j dot).
   * In fast human writing, the dot drifts 2-9px right, varies ±4px vertically,
   * and morphs between a circular ink blob and a 15°-35° flick/dash!
   */
  public drawFlyingTittle(
    ctx: CanvasRenderingContext2D,
    basePos: { x: number; y: number },
    fontSize: number,
    inkColor: string,
    chaos: number
  ) {
    if (chaos <= 0) return;

    // Hand momentum drift to the right: 2px - 9px (scaled by font size)
    const scale = fontSize / 28;
    const driftX = (2.0 + this.noise.random() * 7.0 * chaos) * scale;
    const driftY = ((this.noise.random() - 0.5) * 8.0 * chaos) * scale;

    const dotX = basePos.x + driftX;
    const dotY = basePos.y + driftY;

    // 50% chance of flick/dash vs ink blob
    const isDash = this.noise.random() < 0.55 * chaos;

    ctx.save();
    ctx.fillStyle = inkColor;
    ctx.strokeStyle = inkColor;
    ctx.lineWidth = Math.max(1.2, 1.8 * scale);
    ctx.lineCap = 'round';

    if (isDash) {
      // 15°–35° rapid flick dash
      const angleDeg = 15 + this.noise.random() * 25;
      const angleRad = (angleDeg * Math.PI) / 180;
      const dashLength = (2.5 + this.noise.random() * 4.5) * scale;

      ctx.beginPath();
      ctx.moveTo(dotX - Math.cos(angleRad) * dashLength * 0.5, dotY - Math.sin(angleRad) * dashLength * 0.5);
      ctx.lineTo(dotX + Math.cos(angleRad) * dashLength * 0.5, dotY + Math.sin(angleRad) * dashLength * 0.5);
      ctx.stroke();
    } else {
      // Ink blob with slight organic imperfection
      const radius = (1.1 + this.noise.random() * 1.0) * scale;
      ctx.beginPath();
      ctx.arc(dotX, dotY, radius, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  /**
   * Procedurally draws a Shared Double-tt / ff / tf Crossbar.
   * Suppresses individual crossbars and draws one continuous hand-swept stroke slicing across both stems at a slight upward tilt!
   */
  public drawSharedCrossbar(
    ctx: CanvasRenderingContext2D,
    stem1Pos: { x: number; y: number },
    stem2Pos: { x: number; y: number },
    fontSize: number,
    inkColor: string
  ) {
    ctx.save();
    ctx.strokeStyle = inkColor;
    ctx.lineWidth = Math.max(1.4, (fontSize / 28) * 1.7);
    ctx.lineCap = 'round';

    // Extend left of stem 1 and right of stem 2
    const overhangLeft = fontSize * 0.16 + this.noise.random() * 3;
    const overhangRight = fontSize * 0.22 + this.noise.random() * 4;

    const startX = stem1Pos.x - overhangLeft;
    const endX = stem2Pos.x + overhangRight;

    // Slight upward tilt (-1° to -4° in canvas coords)
    const tiltOffset = (this.noise.random() * 3.5 + 1.5) * (fontSize / 28);
    const startY = stem1Pos.y + tiltOffset * 0.5;
    const endY = stem2Pos.y - tiltOffset * 0.5;

    // Hand-swept slight curvature via quadratic bezier
    const midX = (startX + endX) * 0.5;
    const midY = (startY + endY) * 0.5 + (this.noise.random() - 0.5) * 2;

    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.quadraticCurveTo(midX, midY, endX, endY);
    ctx.stroke();

    ctx.restore();
  }

  /**
   * Procedurally draws a Pseudo-Cursive Coarticulation Bridge (Air-Drag Stroke).
   * For common high-speed bigrams (th, he, in, er, an, re, on, at, en, nd, ou, ea),
   * draws a thin, low-opacity (25%-45% alpha) connecting quadratic Bezier ligature.
   */
  public drawCoarticulationLigature(
    ctx: CanvasRenderingContext2D,
    exitPt: { x: number; y: number },
    entryPt: { x: number; y: number },
    inkColor: string,
    ligatureRate: number,
    stemWidth?: number
  ) {
    if (this.noise.random() > ligatureRate) return;

    // Check distance - only draw if reasonably close (e.g. adjacent characters)
    const dx = entryPt.x - exitPt.x;
    const dy = entryPt.y - exitPt.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 2 || dist > 55) return;

    ctx.save();
    ctx.globalAlpha = 0.60 + this.noise.random() * 0.22;
    ctx.strokeStyle = inkColor;
    ctx.lineWidth = stemWidth ? Math.max(0.8, stemWidth * 0.65) : 1.15;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Smooth cubic Bezier tangent continuity with concave downward dip
    const cp1x = exitPt.x + dx * 0.35;
    const cp1y = exitPt.y + (dy > 0 ? dy * 0.45 : 2.5);
    const cp2x = exitPt.x + dx * 0.70;
    const cp2y = entryPt.y + (dy < 0 ? -dy * 0.35 : 2.5);

    ctx.beginPath();
    ctx.moveTo(exitPt.x, exitPt.y);
    ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, entryPt.x, entryPt.y);
    ctx.stroke();

    ctx.restore();
  }

  /**
   * Samples a custom allograph variant ensuring no variant repeats within a 4-char window.
   */
  public sampleAllographVariant(char: string, allographs: AllographLibrary): number | null {
    const list = allographs[char];
    if (!list || list.length === 0) return null;
    if (list.length === 1) return 0;

    const history = this.allographHistoryMap.get(char) || [];
    // Available variant indices not in recent history
    const forbidden = new Set(history.slice(-3));
    const candidates: number[] = [];

    for (let i = 0; i < list.length; i++) {
      if (!forbidden.has(i)) {
        candidates.push(i);
      }
    }

    const pool = candidates.length > 0 ? candidates : Array.from({ length: list.length }, (_, i) => i);
    const chosen = pool[Math.floor(this.noise.random() * pool.length)];

    history.push(chosen);
    if (history.length > 10) history.shift();
    this.allographHistoryMap.set(char, history);

    return chosen;
  }

  /**
   * Word-Initial Touch-Down Micro-Hook:
   * 25% probability, ultra-faint (20%-35% alpha, 3-5px long) approach stroke
   * leading into entryPoint from bottom-left where moving ballpoint tip first grazes paper.
   */
  public drawTouchDownHook(
    ctx: CanvasRenderingContext2D,
    entryPoint: { x: number; y: number },
    fontSize: number,
    inkColor: string
  ) {
    const scale = fontSize / 28;
    const hookLen = (3.0 + this.noise.random() * 2.0) * scale;
    const angleRad = (35 + this.noise.random() * 20) * (Math.PI / 180); // 35°–55°

    const startX = entryPoint.x - Math.cos(angleRad) * hookLen;
    const startY = entryPoint.y + Math.sin(angleRad) * hookLen;

    ctx.save();
    ctx.strokeStyle = inkColor;
    ctx.globalAlpha = 0.20 + this.noise.random() * 0.15; // 20% - 35% alpha
    ctx.lineWidth = Math.max(0.6, 0.9 * scale);
    ctx.lineCap = 'round';

    ctx.beginPath();
    ctx.moveTo(startX, startY);
    // Slight curve into entryPoint
    const midX = (startX + entryPoint.x) * 0.5 - 0.5 * scale;
    const midY = (startY + entryPoint.y) * 0.5 + 0.5 * scale;
    ctx.quadraticCurveTo(midX, midY, entryPoint.x, entryPoint.y);
    ctx.stroke();

    ctx.restore();
  }

  /**
   * Word-Final Lift-Off Taper:
   * On final character of word, especially e, y, g, d, s, t, n, r, a, o:
   * Quadratic Bezier tail flick from exitPoint (5-11px rightward/upward)
   * drawn as 4 micro-segments whose lineWidth tapers from 1.5px to 0.3px
   * and whose globalAlpha fades from 0.75 to 0.05.
   */
  public drawLiftOffTaper(
    ctx: CanvasRenderingContext2D,
    exitPoint: { x: number; y: number },
    fontSize: number,
    inkColor: string
  ) {
    const scale = fontSize / 28;
    const flickLenX = (5.0 + this.noise.random() * 6.0) * scale; // 5px - 11px
    const flickLenY = (2.5 + this.noise.random() * 4.5) * scale; // upward

    const endX = exitPoint.x + flickLenX;
    const endY = exitPoint.y - flickLenY;
    const ctrlX = exitPoint.x + flickLenX * 0.55;
    const ctrlY = exitPoint.y + (this.noise.random() - 0.3) * 2.0 * scale;

    ctx.save();
    ctx.strokeStyle = inkColor;
    ctx.lineCap = 'round';

    // 4 micro-segments along the quadratic curve
    const steps = 4;
    let prevX = exitPoint.x;
    let prevY = exitPoint.y;

    for (let k = 1; k <= steps; k++) {
      const t = k / steps;
      // B(t) = (1-t)^2 P0 + 2(1-t)t P1 + t^2 P2
      const curX = Math.pow(1 - t, 2) * exitPoint.x + 2 * (1 - t) * t * ctrlX + Math.pow(t, 2) * endX;
      const curY = Math.pow(1 - t, 2) * exitPoint.y + 2 * (1 - t) * t * ctrlY + Math.pow(t, 2) * endY;

      // lineWidth tapers 1.5px down to 0.3px
      const segWidth = (1.5 - (1.5 - 0.3) * (k / steps)) * scale;
      // globalAlpha fades 0.75 down to 0.05
      const segAlpha = 0.75 - (0.75 - 0.05) * (k / steps);

      ctx.lineWidth = Math.max(0.3, segWidth);
      ctx.globalAlpha = Math.max(0.04, segAlpha);

      ctx.beginPath();
      ctx.moveTo(prevX, prevY);
      ctx.lineTo(curX, curY);
      ctx.stroke();

      prevX = curX;
      prevY = curY;
    }

    ctx.restore();
  }

  /**
   * STEM Crossbarred 'z' / 'Z' (ƶ):
   * Hand-drawn horizontal waist strike across 'z' to prevent confusion with digit '2'.
   * Modeled directly from Chitesh's calculus & PDE assignment notes!
   */
  public drawCrossedZ(
    ctx: CanvasRenderingContext2D,
    charX: number,
    charY: number,
    advanceWidth: number,
    fontSize: number,
    inkColor: string,
    isUpper = false
  ) {
    const scale = fontSize / 28;
    const midX = charX + advanceWidth * 0.48 + (this.noise.random() - 0.5) * 1.5 * scale;
    // Waist of z is located ~26% of fontSize above baseline for lowercase, ~36% for uppercase
    const midY = charY - fontSize * (isUpper ? 0.36 : 0.26) + (this.noise.random() - 0.5) * 1.2 * scale;
    const barWidth = Math.max(8 * scale, advanceWidth * 0.52);
    const halfW = barWidth * 0.5;

    // Slight organic upward slant (+2° to +5°) typical of fast right-handed handwriting
    const slantDeltaY = (0.8 + this.noise.random() * 0.8) * scale;
    const x1 = midX - halfW;
    const y1 = midY + slantDeltaY * 0.5;
    const x2 = midX + halfW;
    const y2 = midY - slantDeltaY * 0.5;

    ctx.save();
    ctx.strokeStyle = inkColor;
    ctx.lineCap = 'round';
    ctx.lineWidth = Math.max(1.0, 1.45 * scale);
    ctx.globalAlpha = 0.88;

    // Draw slightly curved hand stroke
    const ctrlX = midX + (this.noise.random() - 0.5) * 1.5 * scale;
    const ctrlY = (y1 + y2) * 0.5 + (this.noise.random() - 0.5) * 0.8 * scale;

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.quadraticCurveTo(ctrlX, ctrlY, x2, y2);
    ctx.stroke();

    // Subtle downstroke pressure pass
    ctx.lineWidth = Math.max(0.6, 0.9 * scale);
    ctx.globalAlpha = 0.35;
    ctx.beginPath();
    ctx.moveTo(x1 + 0.3, y1 + 0.3);
    ctx.quadraticCurveTo(ctrlX + 0.3, ctrlY + 0.3, x2 + 0.3, y2 + 0.3);
    ctx.stroke();

    ctx.restore();
  }
}
