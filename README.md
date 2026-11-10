# ✍️ ScriptaMath

> **Biomechanical Pen Physics & Optical Photorealism Engine for STEM Derivations**

ScriptaMath transforms raw mathematical formulas, LaTeX equations, and assignment text into authentic, indistinguishable handwritten notebook pages. Unlike naive font renderers, ScriptaMath models human biomechanical arm drift, neuromuscular tremor, velocity-based ink paste starvation, and mobile scanner camera optics.

---

## 🌟 Key Features

### 🖋️ 1. Dynamic Stroke Weight & Nib Calibrator
- **Unified Nib Footprint**: Procedural math elements ($=$, $+$, $-$, vinculum bars, square roots, parentheses) dynamically measure the loaded font stem width ($\approx 2.4\text{px} - 2.6\text{px}$) to eliminate wireframe mismatches.
- **16-Step Velocity Tapering**: Simulates ballpoint ink paste starvation on fast sweeps (fraction bars thin by 25% in the middle with realistic parabolic wrist sag).
- **Dual-Track Micro-Furrows**: Rolling-ball pressure ridge simulation on heavy downstrokes using subtle alpha carving.

### 📐 2. Organic Operator & Bracket Engine
- **Human Square Brackets $[ \dots ]$**: Eliminates CAD $90^\circ$ right angles, replacing them with organic entry dips, bowed stems ($\pm 1.5^\circ$), and continuous rounded bottom turns with human overshoot.
- **Asymmetric Curly Braces $\{ \dots \}$**: Modeled after human hand motion with a compact upper lobe ($45\%$), downward-angled center beak ($-10^\circ$), and elongated lower lobe ($55\%$).
- **Contextual Diagonal Slashes ($^1/_2$)**: Single-digit numeric fractions randomly render as compact slanted slash fractions, breaking horizontal bar monotony.

### 🧠 3. Unruled Sheet Biomechanics
- **Full-Line Uphill Angle Drift**: Simulates elbow pivot geometry with a $+0.3^\circ$ to $+1.6^\circ$ upward baseline slope on unruled sheets.
- **Derivation Phase Dynamics**: Pacing and cognitive scaling dynamically adapt font sizes (hurried intermediate algebra at $0.94\times$, headings at $1.04\times$, and prominent final boxed answers at $1.08\times$ with $+15\%$ nib pressure).
- **Operator Whitespace Clustering**: Internal polynomial terms cluster tightly ($s^2+3s+2$), while major relational steps ($=$, $\implies$) receive relaxed breathing room.

### 🧬 4. Anti-Clone Dynamic Glyphs (Contour Normal Morphing)
- Vertex-normal push and pull via 2D Perlin noise organically varies loop fullness, crests, and descenders on recurring characters ($s, 2, y, 4$), destroying recognizable font signature blotches.

### 📷 5. Optical Mobile Scanner Pipeline
- **CMOS Sensor ISO Grain**: Per-pixel analog noise ensures paper is never sterile `#FFFFFF` digital white.
- **Ambient Desk Lighting**: Diagonal warm-to-cool gradient falloff recreates mobile phone desk illumination.
- **CamScanner Magic Color Simulation**: High-contrast document enhancement with paper texture pulp fibers, edge shadow falloff, and back-page ghost bleed.
- **Multi-Page Export**: Vector & raster high-DPI pagination with one-click multi-page PDF generation.

---

## 🚀 Quick Start

### Prerequisites
- Node.js (v18 or higher)
- npm or pnpm

### Installation

```bash
# Clone the repository
git clone https://github.com/sh13y/scriptamath.git
cd scriptamath

# Install dependencies
npm install

# Start development server
npm run dev
```

Visit `http://localhost:5173/` in your browser.

### Building for Production

```bash
npm run build
```

The production assets will be generated in `dist/`.

---

## 🛠️ Tech Stack

- **Framework**: [React 18](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Font Parsing & Mutating**: [OpenType.js](https://opentype.js.org/)
- **Procedural Sketching**: [Rough.js](https://roughjs.com/)
- **Noise Algorithms**: [Simplex Noise](https://github.com/jwagner/simplex-noise.js)
- **PDF Generation**: [jsPDF](https://github.com/parallax/jsPDF)
- **Icons**: [Lucide React](https://lucide.dev/)

---

## 📄 License

MIT License. See [LICENSE](LICENSE) for details.
