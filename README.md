# ✍️ ScriptaMath

> **Biomechanical Pen Physics, True Cursive Ligatures & Optical Photorealism Engine for STEM Derivations**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.3-61dafb.svg)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-5.4-646cff.svg)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-3.4-38bdf8.svg)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

**ScriptaMath** converts raw LaTeX equations, assignment prompts, and STEM derivations into authentic, photorealistic student notebook pages. Going far beyond naive font renderers, ScriptaMath models human arm biomechanics, neuromuscular tremors, pen pressure velocity variations, cursive bezier ligatures, authentic student mistake scratch-outs, and mobile camera scan post-processing.

---

## 🌟 Key Features

### ✒️ 1. True Cursive Handwriting & Ligature Engine
- **Continuous Bezier Ligatures**: Connects consecutive characters through organic cubic bezier spline curves that dynamically join glyph exit and entry points.
- **Orthographic Break Rules**: Automatically respects orthographic writing conventions—disconnects isolated capitals, crossbar characters (`t`, `f`, `x`), and descending loops (`g`, `y`, `p`, `j`, `q`).
- **Terminal Flicks & Lead-in Flourishes**: Natural entrance strokes at word beginnings and relaxing exit tails at word endings.
- **Micro-Pauses & Nib Lifts**: Subtle stroke thinning and acceleration near word boundaries.

### 🧬 2. Biometric Multi-Allograph Anti-Duplication Engine
- **Font Allograph Cycling**: Automatically cycles between distinct glyph variants across repeated characters, eliminating telltale digital font repetition.
- **Perlin Contour Perturbation**: High-frequency normal vector morphing slightly perturbs loops, crests, and descenders on identical letters ($e, o, a, s, 2, 4$) without distorting counter bowls.
- **Adaptive Slant & Hand Fatigue**: Slant angle dynamically shifts across lines, simulating natural student wrist fatigue as lines progress down the page.

### 📐 3. STEM & LaTeX Mathematical Derivation Renderer
- **Unified Nib Footprint**: Procedural math elements ($=$, $+$, $-$, vinculum fraction bars, square roots, integrals) calibrate stroke weight from loaded font stem metrics and pen stroke width.
- **Vector Math Rendering**: Full support for `\vec{v}`, `\overrightarrow{AB}`, and accent hats (`\hat{x}`) with hand-drawn directional arrowheads and subtle curvature.
- **Comprehensive LaTeX Delimiters**: Native rendering for `\lvert`, `\rvert`, sized brackets (`\Big(`, `\Bigg[`, `\bigg\{`), and vertical evaluation bars.
- **Calculus & Big Operators**: Organic continuous-stroke integrals ($\int_0^\infty$), summations ($\sum$), and products ($\prod$) with bounds positioned naturally.
- **Piecewise Systems & Matrices**: Hand-drawn curly braces and matrix enclosures with balanced cell padding and collision-avoiding line height.
- **Velocity-Based Tapering**: Fraction vinculum bars thin slightly toward the middle with natural parabolic wrist bow and ballpoint ink starvation.

### 📷 4. Photorealistic Mobile Scanner & Paper Optics
- **Organic Per-Page Jitter**: Multi-page documents never look clone-like; camera tilt, lighting, and shadow parameters vary naturally per page while preserving 100% deterministic re-rendering:
  - **Smartphone Corner Shadow**: Realistic radial phone cast shadow with organic position jitter and a secondary knuckle/thumb holding lobe.
  - **3D Camera Keystone & Spine Curl**: Natural handheld perspective skew ($\pm 0.5^\circ \dots \pm 1.8^\circ$) combined with cylindrical notebook spine curvature and desk contact drop shadow.
  - **Back-Page Ink Bleed Ghosting**: Mirrored reverse-side impression with organic sheet registration drifts ($12\text{px} \dots 30\text{px}$ vertical, $\pm 8\text{px}$ horizontal) and sheet density fluctuations.
  - **Spiral Notebook Punch Holes & Helical Rings**: Margin punch holes with misaligned layered under-sheet crescents, dark backing, cut paper rim highlights, and dual-tone metallic wire coils.
  - **Scanner Filters**: CamScanner Magic Color (whitened paper + boosted saturated blue/black ink), Natural Photo (warm analog contrast), and B&W Xerox.
  - **CMOS Sensor ISO Grain**: Pixel-level sensor grain covers all pixels so paper is never sterile `#FFFFFF`.

### 🎓 5. Studentizer & Mistake Simulation
- **Authentic Mistake Scratch-Outs**: Configurable probability for natural student slip corrections (e.g. crossing out a mistaken sign or term with double/triple horizontal strike strokes).
- **Margin Rough Calculation Column**: Right-hand scratch work column with vertical pencil partition line, rough calculations, and scratch notes.
- **Margin Annotations & Gutter Scribbles**: Rotated side notes (e.g. *"Check Eq 3"*, *"Chain rule here"*) along the notebook gutter.
- **Physical Sticky Notes & Coffee Ring Stains**: Optional sticky note reminders and procedural multi-layer coffee mug ring stains.

### 🧪 6. Interactive Studios & Workspaces
- **Style Lab**: Real-time interactive calibration pad to test and fine-tune nib weight, letter spacing, word spacing, slant, baseline wander, and master variance.
- **Top-K Variation Studio**: Generate multiple independent handwriting candidates side-by-side with distinct random seeds and select the most natural variant.
- **Glyph Studio Modal**: Inspect, customize, and edit individual font glyphs and procedural math operators.
- **Live Handwriting Replay**: Watch assignments being handwritten stroke-by-stroke with animated ink flow.
- **Procedural Web Audio**: Real-time synthesized pen-on-paper friction sound (ballpoint, gel pen, pencil) with velocity-modulated acoustics.

---

## 📄 Paper Templates & Student Personas

### Paper Templates
| Template | Description |
| :--- | :--- |
| **Indian College Ruled** | Standard 32-line single ruled notebook with red left margin line and header date box. |
| **Exam Booklet** | Authentic university examination paper with numbered question columns and official margin. |
| **Engineering Graph** | Precision grid paper for physics derivations, coordinate geometry, and circuit analysis. |
| **Unruled Bond** | Clean unruled sketch paper with elbow-pivot uphill baseline drift and spiral holes. |

### Built-in Personas
- **Chitesh (Engineering Undergrad)**: Fast, slightly slanted cursive ballpoint with occasional scratch-outs on unruled spiral notebook.
- **Ananya (Topper / Clean Notes)**: Meticulous upright gel pen with double underlines on Indian ruled paper.
- **Vikram (Hurried / Cramming)**: High-speed, relaxed letter spacing with frequent rough margin calculations.
- **Sarah (Architecture / Neat)**: Crisp architectural lettering with uniform letterforms on graph paper.
- **Dr. Rao (Professor / Board Derivations)**: Bold fountain pen with prominent mathematical operators and derivations.

---

## 🚀 Quick Start

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher)
- `npm` or `pnpm`

### Installation

```bash
# Clone the repository
git clone https://github.com/haze0e/scriptamath.git
cd scriptamath

# Install dependencies
npm install

# Start local development server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Building for Production

```bash
npm run build
```

The optimized production bundle will be generated in the `dist/` directory.

---

## 📦 Multi-Format Export

ScriptaMath supports high-resolution multi-page export formats:
- 📄 **Multi-Page Vector/Raster PDF**: Clean standard A4 PDF document compiled directly via `jsPDF`.
- 🗂️ **ZIP Bundle (PNGs)**: High-DPI full-sheet PNG images packaged into a single ZIP file via `JSZip`.
- 🖼️ **SVG Export**: Scalable vector graphics export for crisp zoom at any display scale.
- 📋 **1-Click Clipboard Copy**: Instantly copy rendered handwriting pages to the clipboard for direct pasting into chats or documents.

---

## 🛠️ Architecture & Tech Stack

```
src/
├── components/          # React UI Modals, Canvas Preview, Studio Controls & Header
├── constants/           # Student Persona definitions & sample presets
├── data/                # Preloaded STEM sample assignments & cursive alphabet models
├── engine/              # Core Handwriting, Math, Cursive & Scanning Engines
│   ├── aiParser.ts           # Markdown & LaTeX tokenization and parser
│   ├── audioSynthesizer.ts   # Web Audio pen friction sound synthesizer
│   ├── cursiveEngine.ts      # Bezier spline ligature connector engine
│   ├── fontLoader.ts         # OpenType font loader and cache
│   ├── formatter.ts          # LaTeX equation parser & delimiter matcher
│   ├── glyphMutator.ts       # Perlin noise contour deformation engine
│   ├── inkAndScan.ts         # CamScanner filters, keystone tilt, shadows & spiral holes
│   ├── mathRenderer.ts       # Procedural symbols (integrals, roots, vectors, fractions)
│   ├── noise.ts              # Seeded PRNG & Simplex Noise implementations
│   ├── pageEngine.ts         # Pixel-accurate layout, pagination & canvas compositor
│   └── strokeBiometrics.ts   # Velocity, pressure, and fatigue modeling
├── lib/                 # IndexedDB persistent local storage
├── types/               # TypeScript interfaces and state models
└── App.tsx              # Main application orchestrator
```

### Core Technologies
- **UI & Architecture**: [React 18](https://react.dev/), [TypeScript](https://www.typescriptlang.org/), [Tailwind CSS](https://tailwindcss.com/), [Framer Motion](https://www.framer.com/motion/)
- **Build System**: [Vite 5](https://vitejs.dev/)
- **Font & Path Processing**: [OpenType.js](https://opentype.js.org/)
- **Procedural Sketching**: [Rough.js](https://roughjs.com/)
- **Noise Algorithms**: [Simplex Noise](https://github.com/jwagner/simplex-noise.js)
- **PDF & Archive Generation**: [jsPDF](https://github.com/parallax/jsPDF), [JSZip](https://stuk.github.io/jszip/)
- **Icons**: [Lucide React](https://lucide.dev/)

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
