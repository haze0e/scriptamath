/**
 * strokeBiometrics.ts — Biomechanical Handwriting Parameter Extraction
 *
 * Analyzes raw pointer stroke coordinates (x, y, t, pressure) drawn on
 * the Style Lab canvas to extract authentic neuromotor metrics:
 * - Downstroke slant angle (median arctan of downward segments)
 * - Stroke weight & nib pressure profile
 * - Baseline undulation / waviness (RMSE against regression line)
 * - Intra-word velocity dynamics (acceleration & flick gradients)
 * - Curvature / loop chaos (topological ascender & descender warping)
 */

import { HandwritingStyleSettings, PenSettings, CustomPersonaProfile } from '../types';

export interface StrokePoint {
  x: number;
  y: number;
  t: number;
  pressure?: number;
}

export type RawStroke = StrokePoint[];

export interface BiometricAnalysisResult {
  slantAngle: number;
  strokeWidth: number;
  baselineWave: number;
  intraWordVelocity: number;
  loopWarp: number;
  flyingDotChaos: number;
  letterSpacing: number;
  wordSpacing: number;
  humanVariance: number;
  totalStrokes: number;
  totalPoints: number;
  detectedStyleTag: 'Cursive Flow' | 'College Print' | 'STEM Slanted' | 'Upright Blueprint' | 'Speed Scribble';
  confidence: number; // 0.0 to 1.0
}

/**
 * Robust median calculation helper
 */
function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Extracts biomechanical handwriting metrics from drawn strokes
 */
export function analyzeStrokes(strokes: RawStroke[]): BiometricAnalysisResult {
  let totalPoints = 0;
  const downstrokeAngles: number[] = [];
  const velocities: number[] = [];
  const pressures: number[] = [];
  const baselinePoints: { x: number; y: number }[] = [];
  let curvatureChanges: number[] = [];

  for (const stroke of strokes) {
    if (stroke.length < 2) continue;
    totalPoints += stroke.length;

    let maxY = stroke[0].y;
    let maxXAtMaxY = stroke[0].x;

    for (let i = 0; i < stroke.length - 1; i++) {
      const p1 = stroke[i];
      const p2 = stroke[i + 1];

      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const dt = Math.max(1, p2.t - p1.t);
      const dist = Math.hypot(dx, dy);

      // Track bottom-most contact point (baseline extrema)
      if (p2.y > maxY) {
        maxY = p2.y;
        maxXAtMaxY = p2.x;
      }

      // 1. Downward stroke slant analysis (dy > 3.0px)
      if (dy > 2.5) {
        const angleRad = Math.atan2(dx, dy); // 0 = straight down, >0 = forward slant (/)
        const angleDeg = (angleRad * 180) / Math.PI;
        // Exclude wild horizontal sweeps (limit to -20° to +40°)
        if (angleDeg >= -20 && angleDeg <= 40) {
          downstrokeAngles.push(angleDeg);
        }
      }

      // 2. Velocity and pressure
      const v = dist / dt; // px per ms
      if (Number.isFinite(v) && v > 0.01 && v < 20) {
        velocities.push(v);
      }
      if (p1.pressure !== undefined && p1.pressure > 0.05) {
        pressures.push(p1.pressure);
      }

      // 3. Curvature direction changes
      if (i > 0) {
        const p0 = stroke[i - 1];
        const v1x = p1.x - p0.x;
        const v1y = p1.y - p0.y;
        const v2x = p2.x - p1.x;
        const v2y = p2.y - p1.y;
        const heading1 = Math.atan2(v1y, v1x);
        const heading2 = Math.atan2(v2y, v2x);
        let dHeading = Math.abs(heading2 - heading1);
        if (dHeading > Math.PI) dHeading = 2 * Math.PI - dHeading;
        curvatureChanges.push(dHeading);
      }
    }

    baselinePoints.push({ x: maxXAtMaxY, y: maxY });
  }

  // ── 1. Slant Angle ──────────────────────────────────────────────────────────
  let rawSlant = downstrokeAngles.length > 0 ? median(downstrokeAngles) : 5.0;
  // Restrict to realistic human handwriting range (-3° to +22°)
  const slantAngle = Math.round(Math.max(-3, Math.min(22, rawSlant)) * 10) / 10;

  // ── 2. Stroke Width & Nib Calibration ──────────────────────────────────────
  let strokeWidth = 1.6;
  if (pressures.length > 5) {
    const medPressure = median(pressures);
    // Typical stylus pressure: 0.2 (light) to 0.8 (heavy)
    strokeWidth = +(1.3 + medPressure * 0.9).toFixed(2);
  } else if (velocities.length > 5) {
    const medV = median(velocities);
    // Fast writing tends to create finer strokes
    if (medV > 1.2) strokeWidth = 1.45;
    else if (medV < 0.4) strokeWidth = 1.85;
    else strokeWidth = 1.65;
  }

  // ── 3. Baseline Waviness / Drift ───────────────────────────────────────────
  let baselineWave = 0.35;
  if (baselinePoints.length >= 3) {
    // Sort by x
    baselinePoints.sort((a, b) => a.x - b.x);
    // Linear regression y on x
    const n = baselinePoints.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
    for (const pt of baselinePoints) {
      sumX += pt.x;
      sumY += pt.y;
      sumXY += pt.x * pt.y;
      sumXX += pt.x * pt.x;
    }
    const denom = n * sumXX - sumX * sumX;
    const slope = denom !== 0 ? (n * sumXY - sumX * sumY) / denom : 0;
    const intercept = (sumY - slope * sumX) / n;

    let varianceSum = 0;
    for (const pt of baselinePoints) {
      const expectedY = slope * pt.x + intercept;
      varianceSum += (pt.y - expectedY) ** 2;
    }
    const rmse = Math.sqrt(varianceSum / n);
    // Normalize RMSE: 1px -> 0.15 wave, 12px -> 0.65 wave
    baselineWave = +(Math.max(0.15, Math.min(0.70, 0.15 + (rmse / 15) * 0.55))).toFixed(2);
  }

  // ── 4. Intra-Word Velocity Dynamics ────────────────────────────────────────
  let intraWordVelocity = 0.50;
  if (velocities.length > 10) {
    const sortedV = [...velocities].sort((a, b) => a - b);
    const p90 = sortedV[Math.floor(sortedV.length * 0.9)];
    const p50 = sortedV[Math.floor(sortedV.length * 0.5)];
    const ratio = p50 > 0 ? p90 / p50 : 2.0;
    // ratio: 1.5 (very steady) to 4.0 (very flick-heavy)
    intraWordVelocity = +(Math.max(0.25, Math.min(0.85, 0.25 + ((ratio - 1.5) / 2.5) * 0.60))).toFixed(2);
  }

  // ── 5. Curvature & Loop Warp ───────────────────────────────────────────────
  let loopWarp = 0.42;
  if (curvatureChanges.length > 10) {
    const medCurv = median(curvatureChanges);
    loopWarp = +(Math.max(0.20, Math.min(0.72, 0.20 + (medCurv / 1.5) * 0.52))).toFixed(2);
  }

  const flyingDotChaos = +(0.20 + baselineWave * 0.50).toFixed(2);
  const letterSpacing = slantAngle > 12 ? -0.2 : slantAngle < 2 ? 0.4 : 0.1;
  const wordSpacing = slantAngle > 14 ? 0.95 : 1.05;

  // Master variance mapping
  const humanVariance = +(Math.max(1.0, Math.min(9.5, (baselineWave * 6 + loopWarp * 6)))).toFixed(1);

  // Style classification
  let detectedStyleTag: BiometricAnalysisResult['detectedStyleTag'] = 'STEM Slanted';
  if (slantAngle >= 14) {
    detectedStyleTag = 'Speed Scribble';
  } else if (slantAngle >= 8) {
    detectedStyleTag = 'Cursive Flow';
  } else if (slantAngle <= 2 && baselineWave < 0.28) {
    detectedStyleTag = 'Upright Blueprint';
  } else {
    detectedStyleTag = 'College Print';
  }

  // Confidence estimation based on sample length
  const strokeScore = Math.min(1, strokes.length / 4);
  const pointScore = Math.min(1, totalPoints / 60);
  const confidence = +(strokeScore * 0.4 + pointScore * 0.6).toFixed(2);

  return {
    slantAngle,
    strokeWidth,
    baselineWave,
    intraWordVelocity,
    loopWarp,
    flyingDotChaos,
    letterSpacing,
    wordSpacing,
    humanVariance,
    totalStrokes: strokes.length,
    totalPoints,
    detectedStyleTag,
    confidence,
  };
}

/**
 * Creates a complete CustomPersonaProfile from analyzed stroke biometrics
 */
export function createPersonaFromBiometrics(
  name: string,
  analysis: BiometricAnalysisResult,
  options?: {
    baseFontFamily?: string;
    penStyle?: 'ballpoint' | 'gel' | 'fountain';
    inkColorHex?: string;
  }
): CustomPersonaProfile {
  const personaId = `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const fontFamily = options?.baseFontFamily || (analysis.slantAngle > 10 ? 'Caveat' : 'ChiteshHandwriting');
  const penStyle = options?.penStyle || 'ballpoint';
  const bodyColorHex = options?.inkColorHex || '#182b5e';

  return {
    id: personaId,
    name: name.trim() || 'My Calibrated Handwriting',
    subtitle: `${analysis.detectedStyleTag} · Slant ${analysis.slantAngle > 0 ? `+${analysis.slantAngle}°` : `${analysis.slantAngle}°`} · Nib ${analysis.strokeWidth}px`,
    description: `Biometrically calibrated via Style Lab on ${new Date().toLocaleDateString()}: slant ${analysis.slantAngle}°, baseline wave ${Math.round(analysis.baselineWave * 100)}%, stroke weight ${analysis.strokeWidth}px.`,
    badge: 'Style Lab Clone',
    createdAt: Date.now(),
    handwriting: {
      persona: personaId,
      fontFamily,
      fontSize: 27,
      slantAngle: analysis.slantAngle,
      letterSpacing: analysis.letterSpacing,
      wordSpacing: analysis.wordSpacing,
      loopWarp: analysis.loopWarp,
      ligatureRate: analysis.slantAngle > 10 ? 0.65 : 0.45,
      flyingDotChaos: analysis.flyingDotChaos,
      sharedCrossbar: true,
      antiDuplication: true,
      intraWordVelocity: analysis.intraWordVelocity,
      marginSqueezeRate: analysis.slantAngle > 12 ? 0.50 : 0.30,
      baselineWave: analysis.baselineWave,
      marginWander: +(analysis.baselineWave * 0.9).toFixed(2),
      handFatigue: +(0.15 + analysis.baselineWave * 0.30).toFixed(2),
      scratchOutRate: analysis.humanVariance > 7 ? 0.008 : 0.002,
      humanVariance: analysis.humanVariance,
      crossedZ: true,
      tableLines: false,
      answerBubbleStyle: 'box',
      showAnswerCheckmarks: analysis.slantAngle < 6,
    },
    pen: {
      bodyColorPreset: 'blue',
      bodyColorHex,
      headingColorPreset: 'blue',
      headingColorHex: '#122046',
      penStyle,
      strokeWidth: analysis.strokeWidth,
      headingUnderline: 'single',
      drySkips: true,
      inkPooling: true,
    },
  };
}
