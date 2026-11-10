import {
  HandwritingPersona,
  HandwritingStyleSettings,
  PenSettings,
  PaperScanSettings,
  CustomPersonaProfile,
} from '../types';

export interface HandwritingPersonaProfile {
  id: HandwritingPersona;
  name: string;
  subtitle: string;
  description: string;
  badge: string;
  iconName: 'boy' | 'girl' | 'zap' | 'feather' | 'user';
  handwriting: Partial<HandwritingStyleSettings>;
  pen: Partial<PenSettings>;
  paper?: Partial<PaperScanSettings>;
}

export const HANDWRITING_PERSONAS: HandwritingPersonaProfile[] = [
  {
    id: 'chitesh-stem-notes',
    name: "Chitesh's Calculus & STEM Notes",
    subtitle: "Authentic 5° tilt, crossbarred 'ƶ', math cursive 'x', circled indices & unruled flow",
    description:
      "Trained on real scanned engineering & calculus notes by Chitesh (25323015): comfortable 5° tilt, crossbarred STEM 'z' (ƶ), opposing-crescent math 'x', hand-drawn circled indices (1), (2), (a), oval solution bubbles, and clean unlined table tabulation on unruled paper.",
    badge: 'Your Handwriting',
    iconName: 'user',
    handwriting: {
      persona: 'chitesh-stem-notes',
      fontFamily: 'ChiteshHandwriting',
      fontSize: 27,
      slantAngle: 5.5,
      letterSpacing: 0.2,
      wordSpacing: 1.05,
      loopWarp: 0.55,
      ligatureRate: 0.50,
      flyingDotChaos: 0.45,
      sharedCrossbar: true,
      antiDuplication: true,
      intraWordVelocity: 0.55,
      marginSqueezeRate: 0.35,
      baselineWave: 0.42,
      marginWander: 0.45,
      handFatigue: 0.28,
      scratchOutRate: 0.0,
      circledQuestionLabels: false,
      answerBubbleStyle: 'box',
      showAnswerCheckmarks: false,
      tableLines: false,
      crossedZ: true,
    },
    pen: {
      bodyColorPreset: 'blue',
      bodyColorHex: '#182b5e', // Chitesh's CamScanner deep navy ballpoint ink
      headingColorPreset: 'blue',
      headingColorHex: '#122046',
      penStyle: 'ballpoint',
      strokeWidth: 1.6,
      headingUnderline: 'single',
      drySkips: true,
      inkPooling: true,
    },
    paper: {
      template: 'unruled-bond', // Chitesh's unruled spiral notebook
      scanFilter: 'camscanner', // High contrast CamScanner Magic Color with Bayer grain & Hermite edge
      inkBleed: 0.03,
      shadowIntensity: 0.24,
      perspectiveTilt: 0.16,
      showPaperTexture: true,
      showMarginGuides: false,
      roughWorkColumn: false,
      spiralHoles: true,
      studentName: 'Chitesh (25323015)',
      assignmentTitle: 'Partial Differential Equations — Assignment 4',
      dateStr: '03/11/2026',
    },
  },
  {
    id: 'boy-stem-cursive',
    name: "Boy's Rushed STEM Cursive",
    subtitle: 'High-speed, 16° slant, rapid connected bigrams & sharp scratch-outs',
    description:
      'Replicates fast college engineering and math assignment notes: forward-slanted (16°), angular loops, hurried math symbols (⇒, ≈), tight subscripts, hand-drawn box around roots, and quick typo slashes.',
    badge: 'Popular for Derivations',
    iconName: 'boy',
    handwriting: {
      persona: 'boy-stem-cursive',
      fontFamily: 'Caveat',
      fontSize: 27,
      slantAngle: 16,
      letterSpacing: -0.4,
      wordSpacing: 0.95,
      loopWarp: 0.48,
      ligatureRate: 0.72,
      flyingDotChaos: 0.65,
      sharedCrossbar: true,
      antiDuplication: true,
      intraWordVelocity: 0.65,
      marginSqueezeRate: 0.45,
      baselineWave: 0.40,
      marginWander: 0.45,
      handFatigue: 0.35,
      scratchOutRate: 0.008,
      circledQuestionLabels: false,
      answerBubbleStyle: 'box',
      showAnswerCheckmarks: false,
      tableLines: false,
    },
    pen: {
      bodyColorPreset: 'blue',
      bodyColorHex: '#1e3a8a', // Dark Navy Ballpoint
      headingColorPreset: 'red',
      headingColorHex: '#b91c1c', // Indian Red Margin/Heading
      penStyle: 'ballpoint',
      strokeWidth: 1.6,
      headingUnderline: 'single',
      drySkips: true,
      inkPooling: true,
    },
    paper: {
      template: 'indian-ruled',
      scanFilter: 'camscanner',
      inkBleed: 0.04,
      shadowIntensity: 0.28,
      showPaperTexture: true,
      showMarginGuides: true,
      roughWorkColumn: false,
    },
  },
  {
    id: 'girl-neat-cursive',
    name: "Girl's Neat College Cursive",
    subtitle: 'Gentle 4° slant, open rounded loops (e, o, a), oval pill bubbles & checkmarks',
    description:
      'Replicates clean, structured college study notes: upright to gentle 4° tilt, open rounded loops, steady baseline, delicate question circles (1), (2), (a), beautiful oval-bubbled final answers, and checkmarks (✓).',
    badge: 'Neat & Aesthetic',
    iconName: 'girl',
    handwriting: {
      persona: 'girl-neat-cursive',
      fontFamily: 'Kalam',
      fontSize: 26,
      slantAngle: 4,
      letterSpacing: 0.4,
      wordSpacing: 1.05,
      loopWarp: 0.28,
      ligatureRate: 0.45,
      flyingDotChaos: 0.22,
      sharedCrossbar: true,
      antiDuplication: true,
      intraWordVelocity: 0.35,
      marginSqueezeRate: 0.20,
      baselineWave: 0.22,
      marginWander: 0.25,
      handFatigue: 0.15,
      scratchOutRate: 0.003,
      circledQuestionLabels: false,
      answerBubbleStyle: 'box',
      showAnswerCheckmarks: true,
      tableLines: false,
    },
    pen: {
      bodyColorPreset: 'blue',
      bodyColorHex: '#1d4ed8', // Royal Blue Gel Pen
      headingColorPreset: 'red',
      headingColorHex: '#991b1b', // Deep Crimson
      penStyle: 'gel',
      strokeWidth: 1.75,
      headingUnderline: 'double',
      drySkips: false,
      inkPooling: true,
    },
    paper: {
      template: 'indian-ruled',
      scanFilter: 'camscanner',
      inkBleed: 0.03,
      shadowIntensity: 0.22,
      showPaperTexture: true,
      showMarginGuides: true,
      roughWorkColumn: false,
    },
  },
  {
    id: 'exam-prep-rushed',
    name: 'Exam Prep Speed Cramming',
    subtitle: 'Narrow fine-nib derivations, margin squeezes, false-starts & quick carets',
    description:
      'Simulates high-pressure timed exams: fine-nib ballpoint writing, high margin squeeze, rapid equation false-starts, and dynamic handwriting fatigue down the page.',
    badge: 'Exam Hall Realism',
    iconName: 'zap',
    handwriting: {
      persona: 'exam-prep-rushed',
      fontFamily: 'NanumPenScript',
      fontSize: 28,
      slantAngle: 18,
      letterSpacing: -0.6,
      wordSpacing: 0.90,
      loopWarp: 0.58,
      ligatureRate: 0.78,
      flyingDotChaos: 0.72,
      sharedCrossbar: true,
      antiDuplication: true,
      intraWordVelocity: 0.75,
      marginSqueezeRate: 0.65,
      baselineWave: 0.48,
      marginWander: 0.55,
      handFatigue: 0.45,
      scratchOutRate: 0.012,
      circledQuestionLabels: false,
      answerBubbleStyle: 'box',
      showAnswerCheckmarks: false,
      tableLines: false,
    },
    pen: {
      bodyColorPreset: 'black',
      bodyColorHex: '#1e293b', // Deep Graphite Black
      headingColorPreset: 'blue',
      headingColorHex: '#1e40af',
      penStyle: 'ballpoint',
      strokeWidth: 1.45,
      headingUnderline: 'single',
      drySkips: true,
      inkPooling: true,
    },
    paper: {
      template: 'indian-ruled',
      scanFilter: 'camscanner',
      inkBleed: 0.05,
      shadowIntensity: 0.35,
      showPaperTexture: true,
      showMarginGuides: true,
      roughWorkColumn: false,
    },
  },
  {
    id: 'clean-lecture',
    name: 'Clean Engineering Print',
    subtitle: 'Upright 1° blueprint hand, clear indices, tidy matrices & tabular alignment',
    description:
      'Engineering and physics lecture hand: upright, high legibility, clean subscript indices, square bracket matrices, and uniform stroke pressure.',
    badge: 'Technical & Clear',
    iconName: 'feather',
    handwriting: {
      persona: 'clean-lecture',
      fontFamily: 'PatrickHand',
      fontSize: 26,
      slantAngle: 1,
      letterSpacing: 0.6,
      wordSpacing: 1.12,
      loopWarp: 0.16,
      ligatureRate: 0.15,
      flyingDotChaos: 0.12,
      sharedCrossbar: false,
      antiDuplication: true,
      intraWordVelocity: 0.20,
      marginSqueezeRate: 0.15,
      baselineWave: 0.18,
      marginWander: 0.20,
      handFatigue: 0.10,
      scratchOutRate: 0.0,
      circledQuestionLabels: false,
      answerBubbleStyle: 'box',
      showAnswerCheckmarks: true,
      tableLines: false,
    },
    pen: {
      bodyColorPreset: 'blue',
      bodyColorHex: '#2563eb',
      headingColorPreset: 'black',
      headingColorHex: '#0f172a',
      penStyle: 'gel',
      strokeWidth: 1.6,
      headingUnderline: 'single',
      drySkips: false,
      inkPooling: false,
    },
    paper: {
      template: 'indian-ruled',
      scanFilter: 'natural-photo',
      inkBleed: 0.02,
      shadowIntensity: 0.20,
      showPaperTexture: true,
      showMarginGuides: true,
      roughWorkColumn: false,
    },
  },
];

// ── Custom Persona Persistence ───────────────────────────────────────────────
export const CUSTOM_PERSONAS_STORAGE_KEY = 'scriptamath_custom_personas';

export function loadCustomPersonas(): CustomPersonaProfile[] {
  try {
    const raw = localStorage.getItem(CUSTOM_PERSONAS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.warn('Failed to load custom personas from localStorage:', err);
    return [];
  }
}

export function saveCustomPersona(profile: CustomPersonaProfile): void {
  try {
    const existing = loadCustomPersonas().filter((p) => p.id !== profile.id);
    existing.unshift(profile);
    // Limit to 12 custom personas
    const trimmed = existing.slice(0, 12);
    localStorage.setItem(CUSTOM_PERSONAS_STORAGE_KEY, JSON.stringify(trimmed));
  } catch (err) {
    console.error('Failed to save custom persona to localStorage:', err);
  }
}

export function deleteCustomPersona(id: string): void {
  try {
    const existing = loadCustomPersonas().filter((p) => p.id !== id);
    localStorage.setItem(CUSTOM_PERSONAS_STORAGE_KEY, JSON.stringify(existing));
  } catch (err) {
    console.error('Failed to delete custom persona:', err);
  }
}

// ── Master Human Variance Calculation ─────────────────────────────────────────
export function applyVarianceToHandwriting(
  current: HandwritingStyleSettings,
  variance: number
): HandwritingStyleSettings {
  const clamped = Math.max(0, Math.min(10, variance));
  const t = clamped / 10; // 0.0 to 1.0

  return {
    ...current,
    humanVariance: clamped,
    baselineWave: +(0.10 + t * 0.60).toFixed(2),
    loopWarp: +(0.12 + t * 0.70).toFixed(2),
    flyingDotChaos: +(0.10 + t * 0.75).toFixed(2),
    marginWander: +(0.10 + t * 0.65).toFixed(2),
    handFatigue: +(0.05 + t * 0.55).toFixed(2),
    intraWordVelocity: +(0.20 + t * 0.65).toFixed(2),
    scratchOutRate: t < 0.35 ? 0 : +((t - 0.35) * 0.024).toFixed(3),
  };
}

export function inferVarianceFromSettings(settings: HandwritingStyleSettings): number {
  if (typeof settings.humanVariance === 'number') {
    return settings.humanVariance;
  }
  const waveNorm = ((settings.baselineWave ?? 0.35) - 0.10) / 0.60;
  const loopNorm = ((settings.loopWarp ?? 0.40) - 0.12) / 0.70;
  const dotNorm = ((settings.flyingDotChaos ?? 0.35) - 0.10) / 0.75;
  const avg = (waveNorm + loopNorm + dotNorm) / 3;
  return Math.round(Math.max(0, Math.min(10, avg * 10)) * 10) / 10;
}
