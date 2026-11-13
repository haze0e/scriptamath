# Master Integration Specification: Upgrading ScriptaMath to Ultra-Realistic Handwriting & AI Bridge

> **Target Repository**: `/home/haze/dev/scriptamath`  
> **Reference Repositories**:
> - `/home/haze/dev/Handwritten` (Stationery realism, paper stacks, coffee stains, margin annotations, ZIP exports, IndexedDB history vault, smart typography, toast system)
> - `/home/haze/dev/ai-handwriting-generator` (Deep learning stroke synthesis, Graves LSTM + GMM, vector coordinate reconstruction, style transfer priming)

---

## 1. Executive Summary & Vision

ScriptaMath already possesses a state-of-the-art vector LaTeX math and OpenType glyph mutation engine. However, to transform it from a functional math tool into an **indistinguishable-from-real-life handwritten notebook platform**, this specification integrates the finest architectural features from the reference repositories:

1. **Physical Desk & Paper Realism** (from `Handwritten`): Procedural coffee mug rings, rotated vertical margin notes, pastel sticky note overlays, 3D layered `.paper-stack` desk elevation, and organic pulp noise textures.
2. **Zero-API-Key "AI Studentizer & Rough-Work Bridge"**: An instruction-tuned prompt generator that allows users to copy a structured prompt into **Gemini**, **ChatGPT**, or **Claude**, and paste back the response to automatically generate authentic student phrasing, realistic typos, and **dynamic scratch calculations in the right-hand rough column** (replacing ScriptaMath's current hardcoded `16 - 12 = 4`).
3. **Multi-Format Export & Local Vault** (from `Handwritten`): Multi-page ZIP archive export via `jszip`, an animated macOS-style export progress ring, and a privacy-preserving **IndexedDB Local History Vault** to store and re-download past homework assignments.
4. **Smart Typography & Pagination Protection** (from `Handwritten`): Typographic curly quotes, em-dashes, proper ellipses, and widow/orphan line protection during pagination.
5. **Neural Stroke Synthesis Pipeline** (from `ai-handwriting-generator`): Connecting vector $(dx, dy, eos)$ pen stroke generation with style transfer priming into the Canvas rendering loop.

---

## 2. Architecture & File Mapping

| Feature | Target File in `scriptamath` | Reference Source in `Handwritten` or `ai-handwriting-generator` |
| :--- | :--- | :--- |
| **Coffee Mug Rings & Drips** | `src/engine/inkAndScan.ts` | `Handwritten/src/pages/EditorPage.tsx` (`showCoffeeStain`, rotation/scale calculations) |
| **Sideways Margin Notes** | `src/engine/pageEngine.ts` | `Handwritten/src/pages/EditorPage.tsx` (`marginNote`, `-rotate-90 origin-left`) |
| **Sticky Note / Post-It** | `src/components/CanvasPreview.tsx` | `Handwritten/src/pages/EditorPage.tsx` (`showStickyNote`, `stickyNoteText`) |
| **3D Paper Stack Desk Depth** | `src/index.css`, `src/components/CanvasPreview.tsx` | `Handwritten/src/index.css` (`.paper-stack`, `::before`, `::after`) |
| **Smart Typography Normalizer** | `src/engine/formatter.ts` | `Handwritten/src/pages/EditorPage.tsx` (`normalizeInput`) |
| **Widow & Orphan Pagination** | `src/engine/pageEngine.ts` | `Handwritten/src/pages/EditorPage.tsx` (`paginateLines` orphan & widow checks) |
| **Dynamic Rough Column** | `src/engine/pageEngine.ts` (L218-309) | Replaces hardcoded calculations with parsed `[ROUGH_WORK]` lines |
| **Zero-API Studentizer Modal** | `src/components/StudentizerModal.tsx` | Custom bridge with deep-links to Gemini (`https://gemini.google.com/app`) and ChatGPT |
| **Multi-Page ZIP Export** | `src/engine/pageEngine.ts`, `src/components/CanvasPreview.tsx` | `Handwritten/src/utils/exportUtils.ts` (using `jszip`) |
| **IndexedDB History Vault** | `src/lib/fileStorage.ts`, `src/components/HistoryModal.tsx` | `Handwritten/src/lib/fileStorage.ts` & `Handwritten/src/components/modals/HistoryModal.tsx` |
| **Export Progress Modal** | `src/components/ExportModal.tsx` | `Handwritten/src/components/modals/ExportModal.tsx` |
| **Neural Stroke Coordinates** | `src/engine/pageEngine.ts` | `ai-handwriting-generator/utils/__init__.py` & `models/models.py` |

---

## 3. Phase-by-Phase Implementation Blueprint

### Phase 1: Physical Stationery Realism & Paper Tactility

#### 1.1 Procedural Coffee Mug Rings & Stains
- **Reference**: `Handwritten/src/pages/EditorPage.tsx` lines 1258–1263.
- **File to Edit**: `scriptamath/src/engine/inkAndScan.ts`
- **Implementation**:
  Add a method `drawCoffeeStain(ctx, width, height, seed, intensity)`:
  ```typescript
  public drawCoffeeStain(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    seed: number,
    intensity: number = 1.0
  ) {
    if (intensity <= 0) return;
    ctx.save();
    
    // Deterministic placement on top-right or bottom-right corner
    const rand = (s: string) => {
      let h = 0;
      const str = `${seed}-${s}`;
      for (let i = 0; i < str.length; i++) h = (h << 5) - h + str.charCodeAt(i);
      return Math.abs(Math.sin(h) * 10000) % 1;
    };

    const posX = width - 180 + (rand('x') - 0.5) * 80;
    const posY = 180 + (rand('y') - 0.5) * 80;
    const radius = 65 + rand('r') * 20;

    ctx.translate(posX, posY);
    ctx.rotate(rand('rot') * Math.PI * 2);

    // Composite multiply for realistic ink/paper absorption
    ctx.globalCompositeOperation = 'multiply';

    // 1. Outer coffee ring (darker perimeter where liquid pooled)
    ctx.strokeStyle = `rgba(110, 68, 30, ${0.14 * intensity})`;
    ctx.lineWidth = 4 + rand('w') * 3;
    ctx.beginPath();
    ctx.ellipse(0, 0, radius, radius * (0.92 + rand('e') * 0.1), 0, 0, Math.PI * 2);
    ctx.stroke();

    // 2. Faint inner liquid wash
    ctx.fillStyle = `rgba(130, 85, 45, ${0.03 * intensity})`;
    ctx.beginPath();
    ctx.ellipse(0, 0, radius - 2, radius * 0.92 - 2, 0, 0, Math.PI * 2);
    ctx.fill();

    // 3. One or two accidental drip droplets
    for (let i = 0; i < 2; i++) {
      const dropAngle = rand(`drop-a-${i}`) * Math.PI * 2;
      const dropDist = radius + 15 + rand(`drop-d-${i}`) * 25;
      const dx = Math.cos(dropAngle) * dropDist;
      const dy = Math.sin(dropAngle) * dropDist;
      const dropR = 2 + rand(`drop-r-${i}`) * 2.5;

      ctx.fillStyle = `rgba(105, 65, 28, ${0.12 * intensity})`;
      ctx.beginPath();
      ctx.arc(dx, dy, dropR, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
  ```
- **Update Settings**: In `src/types/index.ts`, add `showCoffeeStain: boolean;` to `PaperScanSettings`.
- Expose a toggle in `src/components/StudioControls.tsx` under the **Paper & Scan** tab.

#### 1.2 Sideways Margin Annotations / Gutter Scribbles
- **Reference**: `Handwritten/src/pages/EditorPage.tsx` lines 1249–1256.
- **Files to Edit**: `src/types/index.ts` and `src/engine/pageEngine.ts`.
- **Implementation**:
  In `PaperScanSettings`, add `marginAnnotation?: string;` (e.g. "Problem 3 (b) — Due Nov 14").
  In `pageEngine.ts`, before rendering line tokens, check `if (paper.marginAnnotation && pageIndex === 0)`:
  - Save canvas context, translate to `x = 70`, `y = TOP_MARGIN + 320`.
  - Rotate by `-Math.PI / 2` (-90°).
  - Render with handwritten font, small pt size (~13px), and slight natural baseline wobble:
    ```typescript
    if (paper.marginAnnotation && pageData.pageNumber === 1) {
      textCtx.save();
      textCtx.translate(75, TOP_MARGIN + 280);
      textCtx.rotate(-Math.PI / 2);
      this.renderWordOrChars(
        textCtx,
        font,
        paper.marginAnnotation,
        0,
        0,
        14,
        pen.bodyColorHex,
        0.15,
        { ...handwriting, slantAngle: (handwriting.slantAngle ?? 0) - 4 },
        textRoughCanvas
      );
      textCtx.restore();
    }
    ```

#### 1.3 3D Layered Paper Stack Elevation
- **Reference**: `Handwritten/src/index.css` lines 158–191.
- **Files to Edit**: `src/index.css` and `src/components/CanvasPreview.tsx`.
- **Implementation**:
  Add the `.paper-stack` class to `src/index.css`:
  ```css
  .paper-stack {
    position: relative;
    box-shadow: 
      0 1px 1px rgba(0,0,0,0.06),
      0 2px 4px rgba(0,0,0,0.06),
      0 8px 16px rgba(0,0,0,0.08),
      0 16px 32px rgba(0,0,0,0.12);
  }

  .paper-stack::before,
  .paper-stack::after {
    content: "";
    position: absolute;
    inset: 0;
    background: #fbfbf9;
    border: 1px solid rgba(0, 0, 0, 0.05);
    border-radius: inherit;
    z-index: -1;
    pointer-events: none;
    transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  }

  /* Sheet 2 underneath */
  .paper-stack::before {
    transform: translate(4px, 4px) rotate(0.4deg);
    box-shadow: 0 4px 12px rgba(0,0,0,0.04);
  }

  /* Sheet 3 underneath */
  .paper-stack::after {
    transform: translate(8px, 8px) rotate(0.85deg);
    opacity: 0.7;
    box-shadow: 0 8px 24px rgba(0,0,0,0.06);
  }
  ```
  Wrap the canvas container in `src/components/CanvasPreview.tsx` with `.paper-stack` when multi-page or when desk realism is enabled.

---

### Phase 2: Zero-API-Key "AI Studentizer & Dynamic Rough-Work Bridge"

#### 2.1 The Concept & Advantages
Instead of requiring brittle API keys, ScriptaMath generates a specialized instruction-tuned prompt containing the user's raw homework text. The user copies the prompt into **Gemini**, **ChatGPT**, or **Claude** with one click. The AI outputs structured markup that ScriptaMath parses to:
1. Turn cold textbook prose into spontaneous, natural student writing.
2. Populate the **right-margin rough calculation column with real scratch math** (solving the hardcoded `'16 - 12 = 4'` in `pageEngine.ts`).
3. Add margin notes and authentic typos.
4. **No Unnatural Boxed Answers**: Explicitly forbids `\boxed{...}` since rigid bounding boxes look synthetic and computer-generated in student handwriting; concludes naturally with "Hence:", "Therefore,", "Ans:", or $\therefore$.

#### 2.2 Updating Types in `src/types/index.ts`
Extend `PaperScanSettings`:
```typescript
export interface PaperScanSettings {
  // ... existing fields ...
  showCoffeeStain: boolean;
  marginAnnotation?: string;
  customRoughWork?: string[]; // Dynamic arithmetic/algebra scratch lines for the rough column
}
```

#### 2.3 Updating Rough Column in `src/engine/pageEngine.ts`
Replace lines 258–308 in `pageEngine.ts` where `'16 - 12 = 4'` and `'√4 = 2'` are hardcoded:
```typescript
// Render Dynamic Scratch-Work Lines in Right-Margin Column
if (paper.roughWorkColumn) {
  const scratchLines = paper.customRoughWork && paper.customRoughWork.length > 0
    ? paper.customRoughWork
    : ['14 * 6 = 84', '84 - 23 = 61', '√61 ≈ 7.81'];

  let scratchY = TOP_MARGIN + BASE_LINE_HEIGHT * 2.5;

  scratchLines.forEach((line, sIdx) => {
    if (scratchY > PAGE_HEIGHT - BOTTOM_MARGIN - 40) return;

    // Small scratch font size (11 - 13px)
    const scratchW = this.renderWordOrChars(
      textCtx,
      font,
      line,
      rX + 14 + (this.noise.random() - 0.5) * 4,
      scratchY,
      12.5,
      bodyInkColor,
      0.2 + (sIdx * 0.1),
      { ...handwriting, slantAngle: (handwriting.slantAngle ?? 0) + 3 },
      textRoughCanvas
    );

    // 40% probability of a casual strike-through line (student crossed out scratch math)
    if (this.noise.random() < 0.45) {
      this.mathRenderer.drawHandLine(
        textCtx,
        rX + 10,
        scratchY + 2,
        rX + 14 + scratchW + 4,
        scratchY - 10,
        1.2,
        bodyInkColor,
        1.4,
        2
      );
    }

    scratchY += BASE_LINE_HEIGHT * 1.8;
  });
}
```

#### 2.4 Creating `src/engine/aiParser.ts`
Create the parser for structured AI responses:
```typescript
export interface ParsedAIStudentizer {
  title?: string;
  dateStr?: string;
  marginNote?: string;
  mainWork: string;
  roughWork: string[];
}

export function parseAIStudentizerResponse(input: string): ParsedAIStudentizer {
  // Strip code blocks if AI wrapped it in ```scriptamath ... ```
  let text = input.replace(/```(?:scriptamath)?/gi, '').replace(/```/g, '').trim();

  const metadataMatch = text.match(/\[METADATA\]([\s\S]*?)(?=\[(?:MAIN_WORK|ROUGH_WORK)\]|$)/i);
  const mainWorkMatch = text.match(/\[MAIN_WORK\]([\s\S]*?)(?=\[ROUGH_WORK\]|$)/i);
  const roughWorkMatch = text.match(/\[ROUGH_WORK\]([\s\S]*?)$/i);

  let title = '';
  let dateStr = '';
  let marginNote = '';

  if (metadataMatch) {
    const meta = metadataMatch[1];
    const t = meta.match(/Title:\s*(.+)/i);
    const d = meta.match(/Date:\s*(.+)/i);
    const m = meta.match(/MarginNote:\s*(.+)/i);
    if (t) title = t[1].trim();
    if (d) dateStr = d[1].trim();
    if (m) marginNote = m[1].trim();
  }

  const mainWork = mainWorkMatch ? mainWorkMatch[1].trim() : text;
  const roughWork = roughWorkMatch
    ? roughWorkMatch[1]
        .split('\n')
        .map(l => l.trim())
        .filter(l => l.length > 0 && !l.startsWith('#'))
    : [];

  return { title, dateStr, marginNote, mainWork, roughWork };
}
```

#### 2.5 Creating `src/components/StudentizerModal.tsx`
Create an interactive modal with:
- **Left Panel / Tab 1: "Generate & Copy Prompt"**:
  - Live preview of the tailored prompt.
  - Buttons:
    - **`Copy Prompt`**
    - **`Open in Gemini`** (`https://gemini.google.com/app`)
    - **`Open in ChatGPT`** (`https://chatgpt.com`)
    - **`Open in Claude`** (`https://claude.ai`)
- **Right Panel / Tab 2: "Paste AI Response & Apply"**:
  - Input textarea.
  - **`Apply to Handwritten Canvas ✨`** button.
  - Automatically updates:
    - `appState.rawInput = parsed.mainWork`
    - `appState.paper.customRoughWork = parsed.roughWork`
    - `appState.paper.roughWorkColumn = true`
    - `appState.paper.marginAnnotation = parsed.marginNote`
    - `appState.paper.assignmentTitle = parsed.title`
    - Triggers confetti celebration!

---

### Phase 3: Smart Typography & Pagination Engine

#### 3.1 Smart Punctuation Normalizer
- **Reference**: `Handwritten/src/pages/EditorPage.tsx` lines 311–316.
- **File to Edit**: `src/engine/formatter.ts`
- **Implementation**:
  Before parsing Markdown/LaTeX blocks, normalize straight quotes and typewriter symbols *outside* of math blocks:
  ```typescript
  export function normalizeStudentTypography(text: string): string {
    // Split by math delimiters $...$ and $$...$$ so math syntax is never altered
    const parts = text.split(/(\$\$[\s\S]*?\$\$|\$[^\$]*?\$)/g);
    
    return parts.map((part, idx) => {
      // Odd indices are math blocks — keep intact
      if (idx % 2 === 1) return part;

      return part
        .replace(/-- /g, '— ')
        .replace(/\.\.\./g, '…')
        .replace(/(\w)'(\w)/g, '$1’$2') // Contractions like don't -> don’t
        .replace(/"([^"]*)"/g, '“$1”')   // Double quotes -> curly quotes
        .replace(/'([^']*)'/g, '‘$1’');  // Single quotes -> curly quotes
    }).join('');
  }
  ```

#### 3.2 Widow & Orphan Protection
- **Reference**: `Handwritten/src/pages/EditorPage.tsx` lines 118–158 (`paginateLines`).
- **File to Edit**: `src/engine/pageEngine.ts`
- **Implementation**:
  In `pageEngine.paginate(blocks)`, inspect the last line of a page:
  - If a block is a `heading` or `margin-item` (question label) and falls on the final 2 lines of a page, push it to the top of the next page (orphan prevention).
  - If a boxed final answer `boxed-final` is about to be split across a page boundary, push the entire boxed conclusion block to the next page (widow prevention).

---

### Phase 4: Multi-Format Export Engine & IndexedDB Vault

#### 4.1 Multi-Page ZIP Archive Export
- **Reference**: `Handwritten/src/utils/exportUtils.ts` lines 132–141 (using `jszip`).
- **Installation**: `npm install jszip` (already in `package.json` or add if needed).
- **File to Edit**: `src/engine/pageEngine.ts`
- **Implementation**:
  Add `exportToZIP(canvases: HTMLCanvasElement[], title: string)`:
  ```typescript
  import JSZip from 'jszip';

  public async exportToZIP(
    canvases: HTMLCanvasElement[],
    title = 'ScriptaMath_Assignment'
  ): Promise<Blob> {
    const zip = new JSZip();

    canvases.forEach((canvas, idx) => {
      const dataUrl = canvas.toDataURL('image/png');
      const base64Data = dataUrl.replace(/^data:image\/png;base64,/, '');
      zip.file(`page-${idx + 1}.png`, base64Data, { base64: true });
    });

    const content = await zip.generateAsync({ type: 'blob' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(content);
    link.download = `${title}.zip`;
    link.click();
    return content;
  }
  ```

#### 4.2 Local History Vault via IndexedDB
- **Reference**: `Handwritten/src/lib/fileStorage.ts` and `Handwritten/src/components/modals/HistoryModal.tsx`.
- **Create**: `src/lib/fileStorage.ts`:
  - `saveExportedFile(blob: Blob, name: string, type: 'pdf' | 'zip')`
  - `getAllExportedFiles(): Promise<StoredFile[]>`
  - `deleteExportedFile(id: string)`
- **Create**: `src/components/HistoryModal.tsx`:
  - Modal displaying list of previously exported assignments stored locally in IndexedDB.
  - Shows file size, generation date, type badge (PDF / ZIP), and instant **`Download Again`** button.
  - Zero server storage required.

#### 4.3 Animated Export Progress Modal
- **Reference**: `Handwritten/src/components/modals/ExportModal.tsx`.
- **Create**: `src/components/ExportModal.tsx`:
  - Circular SVG progress ring with smooth percentage animation.
  - Step status flavor messages:
    - 0–30%: *"Rendering OpenType Bezier Meshes..."*
    - 30–60%: *"Simulating Ink Pooling & Paper Pulp Textures..."*
    - 60–90%: *"Applying CamScanner Filter & Perspective Tilt..."*
    - 90–100%: *"Bundling High-DPI Output..."*

---

### Phase 5: Deep Learning Stroke Synthesis Reference (`ai-handwriting-generator`)

- **Reference**: `ai-handwriting-generator/models/models.py` & `app/services/generation.py`.
- **How it integrates**:
  In `ai-handwriting-generator`, handwriting is represented not as fonts, but as continuous pen stroke vectors:
  $$[(eos_0, \Delta x_0, \Delta y_0), (eos_1, \Delta x_1, \Delta y_1), \dots]$$
- When running in full AI mode (via local Python FastAPI sidecar at `localhost:8000` or ONNX WebAssembly runtime):
  - Send paragraph string to `/generate`.
  - Reconstruct the $(x, y)$ coordinate path:
    ```typescript
    let currX = startX;
    let currY = startY;
    ctx.beginPath();
    ctx.moveTo(currX, currY);

    for (const [eos, dx, dy] of strokePoints) {
      currX += dx * scale;
      currY += dy * scale;
      if (eos === 1) {
        ctx.stroke();
        ctx.beginPath();
      } else {
        ctx.lineTo(currX, currY);
      }
    }
    ctx.stroke();
    ```
  - This allows personal handwriting cloning: user draws a sample sentence on canvas, and the Graves LSTM mimics their stroke style across the entire document.

---

## 4. Verification & Testing Checklist

- [ ] **Build Integrity**: Run `npm run build` in `/home/haze/dev/scriptamath`. Verify 0 errors.
- [ ] **Coffee Stain Realism**: Toggle `showCoffeeStain` on and check that multiply blending and edge ring opacity render cleanly.
- [ ] **Prompt Bridge**: Open the Studentizer Modal, copy the prompt, paste a sample `[MAIN_WORK]` + `[ROUGH_WORK]` response, and verify the right-hand rough column displays the dynamic calculations.
- [ ] **Multi-Format Export**: Test both **Export Multi-Page PDF** and **Export ZIP (PNGs)**.
- [ ] **History Vault**: Check that exported files appear in the History Modal and can be re-downloaded from IndexedDB.
- [ ] **Math Compatibility**: Ensure inline KaTeX, fractions, roots, and matrices continue to render with 100% precision alongside the new features.
