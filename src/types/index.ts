export type PenColorPreset = 'blue' | 'black' | 'red' | 'green' | 'custom';
export type HeadingColorPreset = 'red' | 'black' | 'blue' | 'custom';
export type PenStyle = 'ballpoint' | 'gel' | 'fountain';
export type PaperTemplateId = 'indian-ruled' | 'unruled-bond' | 'engineering-graph' | 'exam-booklet';
export type ScanFilter = 'original' | 'natural-photo' | 'camscanner' | 'bw-xerox';
export type HandwritingPersona =
  | 'chitesh-stem-notes'
  | 'boy-stem-cursive'
  | 'girl-neat-cursive'
  | 'exam-prep-rushed'
  | 'clean-lecture'
  | 'custom';

export interface HandwritingStyleSettings {
  // Preset Persona
  persona?: HandwritingPersona;

  // Font & Custom Glyphs
  fontFamily: string; // 'Caveat' | 'Kalam' | 'PatrickHand' | 'IndieFlower' | 'custom'
  fontSize: number; // in pt/px (e.g., 24 - 36)
  customFontUrl?: string;

  // Biomechanics & Anti-Clone
  slantAngle?: number; // Forward/backward slant angle in degrees (-5 to 25)
  letterSpacing?: number; // -2 to 4 px character spacing adjustment
  wordSpacing?: number; // 0.6 to 1.6 word spacing multiplier
  loopWarp: number; // 0 to 1 (topological ascender/descender/core deformation)
  ligatureRate: number; // 0 to 1 (pseudo-cursive bigram air-drag ligatures)
  flyingDotChaos: number; // 0 to 1 (drift & morph of i/j tittles)
  sharedCrossbar: boolean; // true: single sweeping stroke across tt, ff, tf
  antiDuplication: boolean; // true: force opposite deformation on consecutive identical chars
  intraWordVelocity: number; // 0 to 1 (initial letter boost, mid-word squeeze/tilt, final tail flick)
  marginSqueezeRate: number; // 0 to 1 (probability of squeezing vs wrapping at right edge)
  baselineWave: number; // 0 to 1 (1D simplex noise baseline drift)
  marginWander: number; // 0 to 1 (left margin wander ±7px + page drift)
  handFatigue: number; // 0 to 1 (cumulative slant, spacing, loose loops down page)
  scratchOutRate: number; // 0 to 0.05 (realistic student typo cross-outs and caret insertions)
  randomSeed: number;

  // Authentic Student Margin & Answer Styles
  circledQuestionLabels?: boolean; // Draw hand-sketched circle around Q1, (1), (a), etc. in margin
  answerBubbleStyle?: 'box' | 'oval' | 'pill' | 'underline'; // Style for \boxed{} and final answers
  showAnswerCheckmarks?: boolean; // Append hand-sketched checkmark ✓ to final boxed answers
  tableLines?: boolean; // Draw separation grid lines in tables (default: false — clean column layout without separation lines)
  crossedZ?: boolean; // Authentic STEM crossbarred 'z' (ƶ) to distinguish from digit '2'
}

export interface PenSettings {
  bodyColorPreset: PenColorPreset;
  bodyColorHex: string;
  headingColorPreset: HeadingColorPreset;
  headingColorHex: string;
  penStyle: PenStyle;
  strokeWidth: number; // 1.2 to 2.8
  headingUnderline: 'none' | 'single' | 'double';
  drySkips: boolean;
  inkPooling: boolean;
}

export interface PaperScanSettings {
  template: PaperTemplateId;
  scanFilter: ScanFilter;
  inkBleed: number; // 0 to 0.15 (ghosting from back page)
  shadowIntensity: number; // 0 to 1 (phone corner shadow & warm gradient)
  perspectiveTilt: number; // 0 to 1 (3D camera tilt and spine curl)
  showPaperTexture: boolean;
  showMarginGuides: boolean;
  roughWorkColumn: boolean; // Right-margin rough calculation column with divider
  spiralHoles?: boolean; // Spiral notebook punch holes on margin
  studentName: string;
  assignmentTitle: string;
  dateStr: string;
  showCoffeeStain: boolean;
  marginAnnotation?: string;
  customRoughWork?: string[]; // Dynamic arithmetic/algebra scratch lines for the rough column
  showStickyNote?: boolean;
  stickyNoteText?: string;
}

export interface AppState {
  rawInput: string;
  handwriting: HandwritingStyleSettings;
  pen: PenSettings;
  paper: PaperScanSettings;
  zoom: number;
  currentPage: number;
}

export interface CustomGlyphVariant {
  char: string;
  variantIndex: number;
  // Vector stroke data: array of strokes, each stroke is array of [x, y, pressure]
  strokes: Array<Array<[number, number, number]>>;
  width: number;
  height: number;
}

export interface AllographLibrary {
  [char: string]: CustomGlyphVariant[];
}
