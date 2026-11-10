import React, { useRef } from 'react';
import {
  FileText,
  Sliders,
  Palette,
  Sparkles,
  Upload,
  PenTool,
  Check,
  ChevronDown,
  RotateCcw,
  BookOpen,
  Zap,
  Search,
  User,
  CheckCircle2,
} from 'lucide-react';
import { AppState, PenColorPreset, HeadingColorPreset, PaperTemplateId, ScanFilter, HandwritingPersona } from '../types';
import { BUILTIN_FONTS, FontCategory } from '../engine/fontLoader';
import { SAMPLE_ASSIGNMENTS } from '../data/samples';
import { HANDWRITING_PERSONAS } from '../constants/personas';

interface StudioControlsProps {
  appState: AppState;
  setAppState: React.Dispatch<React.SetStateAction<AppState>>;
  onOpenGlyphStudio: () => void;
  onCustomFontUpload: (fontBuffer: ArrayBuffer, name: string) => void;
  onRegenerateSeed: () => void;
  onOpenStudentizer?: () => void;
}

export const StudioControls: React.FC<StudioControlsProps> = ({
  appState,
  setAppState,
  onOpenGlyphStudio,
  onCustomFontUpload,
  onRegenerateSeed,
  onOpenStudentizer,
}) => {
  const [activeTab, setActiveTab] = React.useState<'editor' | 'biomechanics' | 'paper'>('editor');
  const [fontCategory, setFontCategory] = React.useState<FontCategory>('All');
  const [fontSearch, setFontSearch] = React.useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const applyPersona = (personaId: HandwritingPersona) => {
    const profile = HANDWRITING_PERSONAS.find((p) => p.id === personaId);
    if (!profile) return;
    setAppState((prev) => ({
      ...prev,
      handwriting: {
        ...prev.handwriting,
        ...profile.handwriting,
      },
      pen: {
        ...prev.pen,
        ...profile.pen,
      },
      paper: profile.paper
        ? {
            ...prev.paper,
            ...profile.paper,
          }
        : prev.paper,
    }));
  };

  const filteredFonts = BUILTIN_FONTS.filter((f) => {
    const matchesCat =
      fontCategory === 'All' ||
      f.category === fontCategory ||
      f.styleTag === fontCategory;
    const matchesSearch =
      !fontSearch ||
      f.name.toLowerCase().includes(fontSearch.toLowerCase()) ||
      f.description.toLowerCase().includes(fontSearch.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const handleFontUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const buffer = event.target?.result as ArrayBuffer;
      if (buffer) {
        onCustomFontUpload(buffer, file.name);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const insertSnippet = (snippet: string) => {
    setAppState((prev) => ({
      ...prev,
      rawInput: prev.rawInput + snippet,
    }));
  };

  const loadSample = (sampleId: string) => {
    const sample = SAMPLE_ASSIGNMENTS.find((s) => s.id === sampleId);
    if (!sample) return;
    setAppState((prev) => ({
      ...prev,
      rawInput: sample.content,
      paper: {
        ...prev.paper,
        assignmentTitle: sample.title,
      },
    }));
  };

  return (
    <aside className="w-full flex flex-col h-full bg-[#131722] border-r border-[#1f2536] select-none">
      {/* Top Navigation Tabs */}
      <div className="flex border-b border-[#1f2536] bg-[#0f121a] px-2 pt-2">
        <button
          onClick={() => setActiveTab('editor')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-colors border-t-2 ${
            activeTab === 'editor'
              ? 'bg-[#131722] text-blue-400 border-blue-500 border-x border-[#1f2536]'
              : 'text-slate-400 border-transparent hover:text-slate-200 hover:bg-[#181d2a]'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>AI & Math Input</span>
        </button>

        <button
          onClick={() => setActiveTab('biomechanics')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-colors border-t-2 ${
            activeTab === 'biomechanics'
              ? 'bg-[#131722] text-blue-400 border-blue-500 border-x border-[#1f2536]'
              : 'text-slate-400 border-transparent hover:text-slate-200 hover:bg-[#181d2a]'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Biomechanics & Anti-Clone</span>
        </button>

        <button
          onClick={() => setActiveTab('paper')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-colors border-t-2 ${
            activeTab === 'paper'
              ? 'bg-[#131722] text-blue-400 border-blue-500 border-x border-[#1f2536]'
              : 'text-slate-400 border-transparent hover:text-slate-200 hover:bg-[#181d2a]'
          }`}
        >
          <Palette className="w-4 h-4" />
          <span>Paper & CamScanner</span>
        </button>
      </div>

      {/* Tab Panels Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5 text-slate-200">
        {/* ==================== TAB 1: AI & MATH INPUT ==================== */}
        {activeTab === 'editor' && (
          <div className="space-y-3.5">
            {/* AI Studentizer Bridge 1-Click Banner */}
            {onOpenStudentizer && (
              <button
                onClick={onOpenStudentizer}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-purple-900/30 via-indigo-900/20 to-blue-900/30 hover:from-purple-900/40 hover:to-blue-900/40 border border-purple-500/30 text-left transition-all group shadow-sm"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-300">
                    <Sparkles className="w-4 h-4 text-purple-300" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-1.5">
                      <span>Zero-API AI Studentizer Bridge</span>
                      <span className="text-[9px] bg-purple-500/20 text-purple-300 px-1.5 py-0.2 rounded font-mono">NEW</span>
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Copy tailored prompts to Gemini/ChatGPT &amp; auto-inject student scratch math
                    </div>
                  </div>
                </div>
                <div className="text-xs font-semibold text-purple-400 group-hover:translate-x-0.5 transition-transform">
                  Launch →
                </div>
              </button>
            )}

            {/* Handwriting Archetype 1-Click Cards */}
            <div className="bg-[#181d2a] p-3 rounded-xl border border-[#262d42] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-blue-400" />
                  Handwriting Archetype / Persona
                </span>
                <span className="text-[10px] text-blue-400 font-mono">1-Click Setup</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {HANDWRITING_PERSONAS.map((p) => {
                  const isActive = appState.handwriting.persona === p.id;
                  return (
                    <button
                      key={p.id}
                      onClick={() => applyPersona(p.id)}
                      className={`p-2 rounded-lg border text-left transition-all relative ${
                        isActive
                          ? 'border-blue-500 bg-blue-950/40 text-blue-300 ring-1 ring-blue-500/50'
                          : 'border-[#262d42] bg-[#11151f] text-slate-300 hover:bg-[#1a2130]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-semibold truncate">{p.name}</span>
                        {isActive && <Check className="w-3 h-3 text-blue-400 shrink-0" />}
                      </div>
                      <div className="text-[9px] text-emerald-400/90 font-mono mt-0.5">{p.badge}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Compact STEM Assignment Preset Dropdown */}
            <div className="bg-[#181d2a] p-3 rounded-xl border border-[#262d42] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-blue-400" />
                  Load STEM Assignment Preset
                </span>
                <span className="text-[10px] text-slate-400 font-mono">6 Built-In Assignments</span>
              </div>
              <div className="relative">
                <select
                  onChange={(e) => {
                    if (e.target.value) loadSample(e.target.value);
                  }}
                  defaultValue=""
                  className="w-full bg-[#11151f] hover:bg-[#161c2b] border border-[#262d42] focus:border-blue-500 rounded-lg px-3 py-2 text-xs text-slate-200 cursor-pointer appearance-none transition-colors pr-8 font-medium"
                >
                  <option value="" disabled>
                    Choose a STEM derivation preset to load...
                  </option>
                  {SAMPLE_ASSIGNMENTS.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.title}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
              </div>
            </div>

            {/* AI Prompt / Markdown & LaTeX Editor with Snippets & Controls */}
            <div className="bg-[#181d2a] p-3.5 rounded-xl border border-[#262d42] space-y-2.5 flex flex-col">
              {/* Editor Header Bar */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5 text-blue-400" />
                  <span className="text-xs font-semibold text-slate-200">
                    Assignment Markdown &amp; LaTeX
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-500 font-mono">
                    {appState.rawInput.length} chars
                  </span>
                  <button
                    onClick={() => setAppState((p) => ({ ...p, rawInput: '' }))}
                    className="text-[11px] text-slate-400 hover:text-red-400 px-2 py-0.5 rounded hover:bg-red-950/20 transition-colors"
                  >
                    Clear Box
                  </button>
                </div>
              </div>

              {/* Quick Math Snippets Toolbar */}
              <div className="flex flex-wrap gap-1 pt-0.5 pb-1">
                {[
                  { label: 'Fraction', code: '$\\frac{a}{b}$' },
                  { label: 'Integral', code: '$\\int_0^\\infty f(x) dx$' },
                  { label: 'Square Root', code: '$\\sqrt{x^2 + y^2}$' },
                  { label: 'Boxed Ans', code: '$\\boxed{x = 42}$' },
                  { label: 'Sum', code: '$\\sum_{i=1}^n x_i$' },
                  { label: 'Implies ⇒', code: '$\\implies$' },
                  { label: 'Therefore ∴', code: '$\\therefore$' },
                  { label: 'Partial ∂', code: '$\\frac{\\partial u}{\\partial t}$' },
                ].map((snip) => (
                  <button
                    key={snip.label}
                    onClick={() => insertSnippet(snip.code)}
                    className="px-2 py-1 text-[11px] rounded bg-[#11151f] hover:bg-[#20273a] border border-[#262d42] hover:border-blue-500/50 text-slate-300 hover:text-white font-mono transition-colors"
                  >
                    + {snip.label}
                  </button>
                ))}
              </div>

              {/* Textarea */}
              <textarea
                value={appState.rawInput}
                onChange={(e) =>
                  setAppState((prev) => ({
                    ...prev,
                    rawInput: e.target.value,
                  }))
                }
                placeholder="Paste raw output from ChatGPT, Claude, or Gemini containing markdown headings (#, ##), questions (Q1., Ans:), and LaTeX math ($...$, $$...$$, \frac, \int, \boxed{})..."
                rows={16}
                className="w-full bg-[#0d1017] border border-[#262d42] rounded-lg p-3 text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-y shadow-inner leading-relaxed"
              />

              {/* Bottom Editor Bar: Quick Font Size Adjuster */}
              <div className="flex items-center justify-between pt-1 border-t border-[#222a3d] text-xs">
                <span className="text-slate-400 text-[11px] flex items-center gap-1.5">
                  <span>Handwriting Size:</span>
                  <span className="font-mono text-blue-400 font-bold">{appState.handwriting.fontSize} px</span>
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() =>
                      setAppState((p) => ({
                        ...p,
                        handwriting: {
                          ...p.handwriting,
                          fontSize: Math.max(16, p.handwriting.fontSize - 1),
                        },
                      }))
                    }
                    className="px-2.5 py-0.5 bg-[#11151f] hover:bg-[#20273a] border border-[#262d42] rounded text-slate-300 font-mono text-xs transition-colors"
                    title="Decrease size by 1px"
                  >
                    - Smaller
                  </button>
                  <button
                    onClick={() =>
                      setAppState((p) => ({
                        ...p,
                        handwriting: {
                          ...p.handwriting,
                          fontSize: Math.min(48, p.handwriting.fontSize + 1),
                        },
                      }))
                    }
                    className="px-2.5 py-0.5 bg-[#11151f] hover:bg-[#20273a] border border-[#262d42] rounded text-slate-300 font-mono text-xs transition-colors"
                    title="Increase size by 1px"
                  >
                    + Larger
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==================== TAB 2: BIOMECHANICS & ANTI-CLONE ==================== */}
        {activeTab === 'biomechanics' && (
          <div className="space-y-5">

            {/* Font & Handwriting Studio Actions */}
            <div className="bg-[#181d2a] p-3.5 rounded-xl border border-[#262d42] space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-slate-200">
                    Handwriting Font ({BUILTIN_FONTS.length} Authentic Styles)
                  </span>
                  <div className="text-[10px] text-slate-400">
                    Active: <span className="text-blue-400 font-medium">{appState.handwriting.fontFamily}</span>
                  </div>
                </div>
                <span className="text-[10px] text-emerald-400 font-mono">Parsed via opentype.js</span>
              </div>

              {/* Category Filter Pills */}
              <div className="flex flex-wrap gap-1">
                {(['All', "Boy's Cursive", "Girl's Cursive", 'STEM & Tech', 'Fluid Cursive', 'College Print', 'Fast & Scratch'] as FontCategory[]).map(
                  (cat) => (
                    <button
                      key={cat}
                      onClick={() => setFontCategory(cat)}
                      className={`px-2 py-1 rounded-md text-[10px] font-medium transition-colors ${
                        fontCategory === cat
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'bg-[#11151f] text-slate-400 hover:text-slate-200 hover:bg-[#1f2638] border border-[#22293d]'
                      }`}
                    >
                      {cat}
                    </button>
                  )
                )}
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter by name or style (e.g. ballpoint, cursive, blueprint)..."
                  value={fontSearch}
                  onChange={(e) => setFontSearch(e.target.value)}
                  className="w-full bg-[#11151f] border border-[#262d42] rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Scrollable Font Cards Grid */}
              <div className="grid grid-cols-2 gap-1.5 max-h-[260px] overflow-y-auto pr-1">
                {filteredFonts.map((font) => {
                  const isSelected = appState.handwriting.fontFamily === font.id;
                  return (
                    <button
                      key={font.id}
                      onClick={() =>
                        setAppState((prev) => ({
                          ...prev,
                          handwriting: { ...prev.handwriting, fontFamily: font.id },
                        }))
                      }
                      className={`px-2.5 py-2 rounded-lg border text-left transition-all relative ${
                        isSelected
                          ? 'border-blue-500 bg-blue-950/40 text-blue-300 font-medium ring-1 ring-blue-500/50'
                          : 'border-[#262d42] bg-[#11151f] text-slate-300 hover:bg-[#1a2130]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-semibold truncate">{font.name}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />}
                      </div>
                      <div className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">{font.description}</div>
                      <div className="text-[9px] text-slate-500 mt-1 uppercase tracking-wider font-mono">
                        {font.category}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Upload Custom Font & Glyph Studio */}
              <div className="flex gap-2 pt-1">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".ttf,.otf"
                  onChange={handleFontUpload}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-[#262d42] bg-[#11151f] hover:bg-[#1a2030] text-xs text-slate-300 hover:text-white transition-colors"
                >
                  <Upload className="w-3.5 h-3.5 text-blue-400" />
                  <span>Upload .TTF Font</span>
                </button>

                <button
                  onClick={onOpenGlyphStudio}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-xs text-white font-medium shadow transition-all"
                >
                  <PenTool className="w-3.5 h-3.5" />
                  <span>Clone My Handwriting</span>
                </button>
              </div>
            </div>

            {/* Handwriting Font Size & Scale Control */}
            <div className="bg-[#181d2a] p-3.5 rounded-xl border border-[#262d42] space-y-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-slate-200">Handwriting Font Size</div>
                  <div className="text-[10px] text-slate-400">Scale text and math symbols up or down</div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() =>
                      setAppState((p) => ({
                        ...p,
                        handwriting: {
                          ...p.handwriting,
                          fontSize: Math.max(16, p.handwriting.fontSize - 1),
                        },
                      }))
                    }
                    className="px-2 py-0.5 text-xs bg-[#11151f] hover:bg-[#222a3d] border border-[#2a344d] rounded text-slate-300 font-mono"
                    title="Decrease font size by 1px"
                  >
                    -1px
                  </button>
                  <span className="font-mono text-blue-400 font-bold text-xs px-2 py-0.5 bg-[#11151f] rounded border border-[#262d42] min-w-[50px] text-center">
                    {appState.handwriting.fontSize} px
                  </span>
                  <button
                    onClick={() =>
                      setAppState((p) => ({
                        ...p,
                        handwriting: {
                          ...p.handwriting,
                          fontSize: Math.min(48, p.handwriting.fontSize + 1),
                        },
                      }))
                    }
                    className="px-2 py-0.5 text-xs bg-[#11151f] hover:bg-[#222a3d] border border-[#2a344d] rounded text-slate-300 font-mono"
                    title="Increase font size by 1px"
                  >
                    +1px
                  </button>
                </div>
              </div>

              <input
                type="range"
                min="18"
                max="44"
                step="1"
                value={appState.handwriting.fontSize}
                onChange={(e) =>
                  setAppState((p) => ({
                    ...p,
                    handwriting: { ...p.handwriting, fontSize: parseInt(e.target.value, 10) },
                  }))
                }
                className="w-full accent-blue-500 h-1.5 bg-[#1f2536] rounded-lg cursor-pointer"
              />

              <div className="grid grid-cols-4 gap-1.5 pt-0.5">
                {[
                  { label: 'Compact', size: 22 },
                  { label: 'Standard', size: 26 },
                  { label: 'Medium', size: 28 },
                  { label: 'Large', size: 32 },
                ].map((preset) => (
                  <button
                    key={preset.label}
                    onClick={() =>
                      setAppState((p) => ({
                        ...p,
                        handwriting: { ...p.handwriting, fontSize: preset.size },
                      }))
                    }
                    className={`py-1 text-[10px] font-mono rounded border transition-colors ${
                      appState.handwriting.fontSize === preset.size
                        ? 'bg-blue-600/30 border-blue-500 text-blue-300 font-medium'
                        : 'bg-[#11151f] border-[#222a3d] text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {preset.label} ({preset.size}px)
                  </button>
                ))}
              </div>
            </div>

            {/* Character Tracking (Letter Spacing) & Word Gap Spacing */}
            <div className="bg-[#181d2a] p-3.5 rounded-xl border border-[#262d42] space-y-3">
              <div className="text-xs font-semibold text-slate-200">
                Character Tracking &amp; Word Spacing
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-300">Letter Spacing</span>
                    <span className="font-mono text-blue-400">
                      {(appState.handwriting.letterSpacing ?? 0) > 0 ? `+${(appState.handwriting.letterSpacing ?? 0).toFixed(1)}px` : `${(appState.handwriting.letterSpacing ?? 0).toFixed(1)}px`}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="-1.5"
                    max="3.0"
                    step="0.1"
                    value={appState.handwriting.letterSpacing ?? 0}
                    onChange={(e) =>
                      setAppState((p) => ({
                        ...p,
                        handwriting: { ...p.handwriting, letterSpacing: parseFloat(e.target.value) },
                      }))
                    }
                    className="w-full accent-blue-500 h-1.5 bg-[#1f2536] rounded-lg cursor-pointer"
                  />
                  <div className="text-[10px] text-slate-400">Tight cursive vs airy print</div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-300">Word Gap Spacing</span>
                    <span className="font-mono text-blue-400">
                      {Math.round((appState.handwriting.wordSpacing ?? 1.0) * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.6"
                    max="1.6"
                    step="0.05"
                    value={appState.handwriting.wordSpacing ?? 1.0}
                    onChange={(e) =>
                      setAppState((p) => ({
                        ...p,
                        handwriting: { ...p.handwriting, wordSpacing: parseFloat(e.target.value) },
                      }))
                    }
                    className="w-full accent-blue-500 h-1.5 bg-[#1f2536] rounded-lg cursor-pointer"
                  />
                  <div className="text-[10px] text-slate-400">Space width between words</div>
                </div>
              </div>
            </div>

            {/* Biomechanical Sliders */}
            <div className="space-y-4">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Topological Warping &amp; Motor Physics
              </div>

              {/* 1. Topological Loop Warp */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 font-medium">Topological 3-Zone Loop Warp</span>
                  <span className="font-mono text-blue-400">
                    {Math.round(appState.handwriting.loopWarp * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={appState.handwriting.loopWarp}
                  onChange={(e) =>
                    setAppState((p) => ({
                      ...p,
                      handwriting: { ...p.handwriting, loopWarp: parseFloat(e.target.value) },
                    }))
                  }
                  className="w-full accent-blue-500 h-1.5 bg-[#1f2536] rounded-lg cursor-pointer"
                />
                <div className="text-[10px] text-slate-400">
                  Independently tilts ascender loops (b,d,h), perturbs core loops (a,e,o) with 2D simplex noise, and varies descender sweeps (g,y).
                </div>
              </div>

              {/* 2. Pseudo-Cursive Ligature Rate */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 font-medium">Cursive Ligature Rate (Air-Drag)</span>
                  <span className="font-mono text-blue-400">
                    {Math.round(appState.handwriting.ligatureRate * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={appState.handwriting.ligatureRate}
                  onChange={(e) =>
                    setAppState((p) => ({
                      ...p,
                      handwriting: { ...p.handwriting, ligatureRate: parseFloat(e.target.value) },
                    }))
                  }
                  className="w-full accent-blue-500 h-1.5 bg-[#1f2536] rounded-lg cursor-pointer"
                />
                <div className="text-[10px] text-slate-400">
                  Connects common bigrams (th, he, in, er, an) with low-opacity quadratic Bezier air-drag strokes.
                </div>
              </div>

              {/* 3. Flying Dot Chaos */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 font-medium">Flying &apos;i&apos;/&apos;j&apos; Dot Drift &amp; Flick</span>
                  <span className="font-mono text-blue-400">
                    {Math.round(appState.handwriting.flyingDotChaos * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={appState.handwriting.flyingDotChaos}
                  onChange={(e) =>
                    setAppState((p) => ({
                      ...p,
                      handwriting: { ...p.handwriting, flyingDotChaos: parseFloat(e.target.value) },
                    }))
                  }
                  className="w-full accent-blue-500 h-1.5 bg-[#1f2536] rounded-lg cursor-pointer"
                />
                <div className="text-[10px] text-slate-400">
                  Suppresses rigid font tittles; detaches dots, drifts rightwards with hand momentum, and morphs into quick dashes.
                </div>
              </div>

              {/* 4. Toggles: Shared Crossbar & Anti-Duplication */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <label className="flex items-start gap-2 bg-[#181d2a] p-2.5 rounded-lg border border-[#262d42] cursor-pointer hover:bg-[#1e2435]">
                  <input
                    type="checkbox"
                    checked={appState.handwriting.sharedCrossbar}
                    onChange={(e) =>
                      setAppState((p) => ({
                        ...p,
                        handwriting: { ...p.handwriting, sharedCrossbar: e.target.checked },
                      }))
                    }
                    className="mt-0.5 rounded text-blue-500 focus:ring-0"
                  />
                  <div>
                    <div className="text-xs font-medium text-slate-200">Shared &apos;tt&apos; Crossbars</div>
                    <div className="text-[10px] text-slate-400">Single sweeping stroke for double tt / ff</div>
                  </div>
                </label>

                <label className="flex items-start gap-2 bg-[#181d2a] p-2.5 rounded-lg border border-[#262d42] cursor-pointer hover:bg-[#1e2435]">
                  <input
                    type="checkbox"
                    checked={appState.handwriting.antiDuplication}
                    onChange={(e) =>
                      setAppState((p) => ({
                        ...p,
                        handwriting: { ...p.handwriting, antiDuplication: e.target.checked },
                      }))
                    }
                    className="mt-0.5 rounded text-blue-500 focus:ring-0"
                  />
                  <div>
                    <div className="text-xs font-medium text-slate-200">Anti-Clone Rule</div>
                    <div className="text-[10px] text-slate-400">Inverts deformation on ee, oo, ll, 11</div>
                  </div>
                </label>
              </div>

              {/* 5. Intra-word velocity & Baseline wave */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-300">Intra-Word Speed</span>
                    <span className="font-mono text-blue-400">
                      {Math.round(appState.handwriting.intraWordVelocity * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={appState.handwriting.intraWordVelocity}
                    onChange={(e) =>
                      setAppState((p) => ({
                        ...p,
                        handwriting: { ...p.handwriting, intraWordVelocity: parseFloat(e.target.value) },
                      }))
                    }
                    className="w-full accent-blue-500 h-1.5 bg-[#1f2536] rounded-lg"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-300">Baseline Wave</span>
                    <span className="font-mono text-blue-400">
                      {Math.round(appState.handwriting.baselineWave * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={appState.handwriting.baselineWave}
                    onChange={(e) =>
                      setAppState((p) => ({
                        ...p,
                        handwriting: { ...p.handwriting, baselineWave: parseFloat(e.target.value) },
                      }))
                    }
                    className="w-full accent-blue-500 h-1.5 bg-[#1f2536] rounded-lg"
                  />
                </div>
              </div>

              {/* 6. Margin Squeeze & Scratch-Outs */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-300">Margin Squeeze</span>
                    <span className="font-mono text-blue-400">
                      {Math.round(appState.handwriting.marginSqueezeRate * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={appState.handwriting.marginSqueezeRate}
                    onChange={(e) =>
                      setAppState((p) => ({
                        ...p,
                        handwriting: { ...p.handwriting, marginSqueezeRate: parseFloat(e.target.value) },
                      }))
                    }
                    className="w-full accent-blue-500 h-1.5 bg-[#1f2536] rounded-lg"
                  />
                  <div className="text-[10px] text-slate-400">Crams words into remaining margin space</div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-300">Student Scratch-Outs</span>
                    <span className="font-mono text-blue-400">
                      {(appState.handwriting.scratchOutRate * 100).toFixed(1)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="0.05"
                    step="0.005"
                    value={appState.handwriting.scratchOutRate}
                    onChange={(e) =>
                      setAppState((p) => ({
                        ...p,
                        handwriting: { ...p.handwriting, scratchOutRate: parseFloat(e.target.value) },
                      }))
                    }
                    className="w-full accent-blue-500 h-1.5 bg-[#1f2536] rounded-lg"
                  />
                  <div className="text-[10px] text-slate-400">Organic typo cross-outs and fixes</div>
                </div>
              </div>

              {/* Hand Fatigue & Left Margin Wander */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-300">Margin Wander</span>
                    <span className="font-mono text-blue-400">
                      {Math.round(appState.handwriting.marginWander * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={appState.handwriting.marginWander}
                    onChange={(e) =>
                      setAppState((p) => ({
                        ...p,
                        handwriting: { ...p.handwriting, marginWander: parseFloat(e.target.value) },
                      }))
                    }
                    className="w-full accent-blue-500 h-1.5 bg-[#1f2536] rounded-lg"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-300">Cumulative Fatigue</span>
                    <span className="font-mono text-blue-400">
                      {Math.round(appState.handwriting.handFatigue * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={appState.handwriting.handFatigue}
                    onChange={(e) =>
                      setAppState((p) => ({
                        ...p,
                        handwriting: { ...p.handwriting, handFatigue: parseFloat(e.target.value) },
                      }))
                    }
                    className="w-full accent-blue-500 h-1.5 bg-[#1f2536] rounded-lg"
                  />
                </div>
              </div>

              {/* Forward Slant Angle */}
              <div className="space-y-1 pt-2 border-t border-[#262d42]">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 font-medium">Forward Slant Angle</span>
                  <span className="font-mono text-blue-400">
                    {(appState.handwriting.slantAngle ?? 0) > 0 ? `+${appState.handwriting.slantAngle}°` : `${appState.handwriting.slantAngle ?? 0}°`}
                    {(appState.handwriting.slantAngle ?? 0) >= 12
                      ? " (Boy's High-Speed Slant)"
                      : (appState.handwriting.slantAngle ?? 0) >= 3
                      ? " (Girl's Gentle Tilt)"
                      : " (Upright)"}
                  </span>
                </div>
                <input
                  type="range"
                  min="-5"
                  max="25"
                  step="1"
                  value={appState.handwriting.slantAngle ?? 0}
                  onChange={(e) =>
                    setAppState((p) => ({
                      ...p,
                      handwriting: { ...p.handwriting, slantAngle: parseInt(e.target.value, 10) },
                    }))
                  }
                  className="w-full accent-blue-500 h-1.5 bg-[#1f2536] rounded-lg cursor-pointer"
                />
                <div className="text-[10px] text-slate-400">
                  Authentic slant: 14°-18° for rushed STEM cursive, 2°-6° for rounded college hand.
                </div>
              </div>
            </div>

            {/* Authentic Assignment Formatting: Circled Questions & Answer Bubbles */}
            <div className="bg-[#181d2a] p-3.5 rounded-xl border border-[#262d42] space-y-3">
              <div className="text-xs font-semibold text-slate-200">
                Assignment Margin &amp; Answer Realism
              </div>

              {/* Circled Question Labels in Margin */}
              <label className="flex items-start gap-2 bg-[#11151f] p-2.5 rounded-lg border border-[#262d42] cursor-pointer hover:bg-[#181f2f]">
                <input
                  type="checkbox"
                  checked={appState.handwriting.circledQuestionLabels === true}
                  onChange={(e) =>
                    setAppState((p) => ({
                      ...p,
                      handwriting: { ...p.handwriting, circledQuestionLabels: e.target.checked },
                    }))
                  }
                  className="mt-0.5 rounded text-blue-500 focus:ring-0"
                />
                <div>
                  <div className="text-xs font-medium text-slate-200">Circled Margin Question Numbers</div>
                  <div className="text-[10px] text-slate-400">
                    Draws authentic hand-sketched ballpoint circles around Q1, (1), (2), (a), (b) in the left margin.
                  </div>
                </div>
              </label>

              {/* Final Answer Enclosure Style */}
              <div className="space-y-1.5">
                <div className="text-xs text-slate-300 font-medium">Final Answer Enclosure Style (\boxed)</div>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { id: 'box', label: 'Hand Box', desc: 'Corner overshoots' },
                    { id: 'oval', label: 'Oval Pill', desc: 'Rounded bubble' },
                    { id: 'underline', label: 'Underline', desc: 'Double underline' },
                  ].map((style) => (
                    <button
                      key={style.id}
                      onClick={() =>
                        setAppState((p) => ({
                          ...p,
                          handwriting: {
                            ...p.handwriting,
                            answerBubbleStyle: style.id as any,
                          },
                        }))
                      }
                      className={`p-2 rounded-lg border text-left transition-colors ${
                        (appState.handwriting.answerBubbleStyle || 'box') === style.id
                          ? 'border-blue-500 bg-blue-950/40 text-blue-300 font-medium'
                          : 'border-[#262d42] bg-[#11151f] text-slate-400 hover:text-slate-200 hover:bg-[#181f2f]'
                      }`}
                    >
                      <div className="text-xs font-semibold">{style.label}</div>
                      <div className="text-[9px] text-slate-400">{style.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Checkmark on Answer */}
              <label className="flex items-start gap-2 bg-[#11151f] p-2.5 rounded-lg border border-[#262d42] cursor-pointer hover:bg-[#181f2f]">
                <input
                  type="checkbox"
                  checked={appState.handwriting.showAnswerCheckmarks ?? false}
                  onChange={(e) =>
                    setAppState((p) => ({
                      ...p,
                      handwriting: { ...p.handwriting, showAnswerCheckmarks: e.target.checked },
                    }))
                  }
                  className="mt-0.5 rounded text-blue-500 focus:ring-0"
                />
                <div>
                  <div className="text-xs font-medium text-slate-200">Handwritten Checkmark (✓) on Answers</div>
                  <div className="text-[10px] text-slate-400">
                    Appends an authentic ballpoint checkmark next to final boxed or bubbled solutions.
                  </div>
                </div>
              </label>

              {/* Table Grid Separation Lines */}
              <label className="flex items-start gap-2 bg-[#11151f] p-2.5 rounded-lg border border-[#262d42] cursor-pointer hover:bg-[#181f2f]">
                <input
                  type="checkbox"
                  checked={appState.handwriting.tableLines ?? false}
                  onChange={(e) =>
                    setAppState((p) => ({
                      ...p,
                      handwriting: { ...p.handwriting, tableLines: e.target.checked },
                    }))
                  }
                  className="mt-0.5 rounded text-blue-500 focus:ring-0"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-slate-200">Table Separation Grid Lines</span>
                    <span
                      className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-medium ${
                        appState.handwriting.tableLines
                          ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                          : 'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}
                    >
                      {appState.handwriting.tableLines ? 'ON' : 'OFF (Clean Tabulation)'}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400">
                    When off (default), tables are naturally tabulated in aligned columns without separation lines.
                  </div>
                </div>
              </label>

              {/* STEM Crossbarred 'ƶ' Toggle */}
              <label className="flex items-start gap-2 bg-[#11151f] p-2.5 rounded-lg border border-[#262d42] cursor-pointer hover:bg-[#181f2f]">
                <input
                  type="checkbox"
                  checked={appState.handwriting.crossedZ ?? true}
                  onChange={(e) =>
                    setAppState((p) => ({
                      ...p,
                      handwriting: { ...p.handwriting, crossedZ: e.target.checked },
                    }))
                  }
                  className="mt-0.5 rounded text-blue-500 focus:ring-0"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-slate-200">STEM Crossbarred &apos;z&apos; (ƶ)</span>
                    <span
                      className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-medium ${
                        appState.handwriting.crossedZ ?? true
                          ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                          : 'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}
                    >
                      {appState.handwriting.crossedZ ?? true ? 'ON' : 'OFF'}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Draws a hand-sketched horizontal waist strike through &apos;z&apos; and &apos;Z&apos; to distinguish from digit &apos;2&apos; (modeled on your notes).
                  </div>
                </div>
              </label>
            </div>
          </div>
        )}

        {/* ==================== TAB 3: PAPER & CAMSCANNER ==================== */}
        {activeTab === 'paper' && (
          <div className="space-y-5">
            {/* 1-Click Quick Style Combinations */}
            <div className="bg-[#181d2a] p-3 rounded-xl border border-[#262d42] space-y-2">
              <div className="text-xs font-semibold text-slate-200">Quick Style Combinations</div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() =>
                    setAppState((p) => ({
                      ...p,
                      paper: {
                        ...p.paper,
                        template: 'unruled-bond',
                        scanFilter: 'bw-xerox',
                        showMarginGuides: false,
                        showPaperTexture: false,
                        roughWorkColumn: false,
                        shadowIntensity: 0.10,
                        perspectiveTilt: 0.0,
                        inkBleed: 0.0,
                      },
                      pen: {
                        ...p.pen,
                        bodyColorPreset: 'black',
                        bodyColorHex: '#181a20',
                        headingColorPreset: 'black',
                        headingColorHex: '#111216',
                      },
                    }))
                  }
                  className={`p-2.5 rounded-lg border text-left transition-all ${
                    appState.paper.template === 'unruled-bond' && appState.paper.scanFilter === 'bw-xerox'
                      ? 'border-blue-500 bg-blue-950/40 text-blue-300 ring-1 ring-blue-500'
                      : 'border-[#262d42] bg-[#11151f] text-slate-300 hover:bg-[#1a2130]'
                  }`}
                >
                  <div className="text-xs font-semibold">📄 Blank Sheet + B&amp;W</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Pure white page, deep black ink, no rules</div>
                </button>

                <button
                  onClick={() =>
                    setAppState((p) => ({
                      ...p,
                      paper: {
                        ...p.paper,
                        template: 'indian-ruled',
                        scanFilter: 'camscanner',
                        showMarginGuides: true,
                        showPaperTexture: true,
                        roughWorkColumn: false,
                        shadowIntensity: 0.28,
                      },
                      pen: {
                        ...p.pen,
                        bodyColorPreset: 'blue',
                        bodyColorHex: '#1e3a8a',
                        headingColorPreset: 'red',
                        headingColorHex: '#b91c1c',
                      },
                    }))
                  }
                  className={`p-2.5 rounded-lg border text-left transition-all ${
                    appState.paper.template === 'indian-ruled' && appState.paper.scanFilter === 'camscanner'
                      ? 'border-blue-500 bg-blue-950/40 text-blue-300 ring-1 ring-blue-500'
                      : 'border-[#262d42] bg-[#11151f] text-slate-300 hover:bg-[#1a2130]'
                  }`}
                >
                  <div className="text-xs font-semibold">📘 Ruled + CamScanner</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Indian notebook blue lines + red margin</div>
                </button>
              </div>
            </div>

            {/* Rough Calculations Sidebar Toggle Card */}
            <div className="bg-[#181d2a] p-3.5 rounded-xl border border-[#262d42] space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-200">Right-Margin Rough Work Column</span>
                    <span
                      className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-medium ${
                        appState.paper.roughWorkColumn
                          ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                          : 'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}
                    >
                      {appState.paper.roughWorkColumn ? 'ON' : 'OFF'}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    Draws a vertical hand divider line with rough scratch math on the right margin.
                  </div>
                </div>
                <button
                  onClick={() =>
                    setAppState((p) => ({
                      ...p,
                      paper: { ...p.paper, roughWorkColumn: !p.paper.roughWorkColumn },
                    }))
                  }
                  className={`w-11 h-6 rounded-full transition-colors relative shrink-0 ${
                    appState.paper.roughWorkColumn ? 'bg-blue-600' : 'bg-[#1f2536]'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white transition-transform absolute top-1 ${
                      appState.paper.roughWorkColumn ? 'left-6' : 'left-1'
                    }`}
                  />
                </button>
              </div>

              {appState.paper.roughWorkColumn && (
                <div className="pt-2 border-t border-[#262d42] space-y-1">
                  <label className="text-[11px] text-slate-400 block">
                    Scratch Math Lines (one per line)
                  </label>
                  <textarea
                    rows={3}
                    placeholder="14 * 6 = 84&#10;84 - 23 = 61&#10;√61 ≈ 7.81"
                    value={(appState.paper.customRoughWork || []).join('\n')}
                    onChange={(e) =>
                      setAppState((p) => ({
                        ...p,
                        paper: {
                          ...p.paper,
                          customRoughWork: e.target.value.split('\n').filter((l) => l.trim().length > 0),
                        },
                      }))
                    }
                    className="w-full bg-[#11151f] border border-[#262d42] rounded-lg p-2 text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500"
                  />
                </div>
              )}
            </div>

            {/* Pen Ink Physics */}
            <div className="bg-[#181d2a] p-3.5 rounded-xl border border-[#262d42] space-y-3">
              <div className="text-xs font-semibold text-slate-200">Ballpoint Ink &amp; Pen Setup</div>

              {/* Body Ink Color */}
              <div className="space-y-1.5">
                <label className="text-xs text-slate-400">Body Ink Color (Derivations &amp; Steps)</label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { id: 'blue', label: 'Bic Blue', hex: '#1b3b8c' },
                    { id: 'black', label: 'Jet Black', hex: '#1e2026' },
                    { id: 'red', label: 'Gel Red', hex: '#a82020' },
                    { id: 'green', label: 'Emerald', hex: '#146b3a' },
                  ].map((pen) => (
                    <button
                      key={pen.id}
                      onClick={() =>
                        setAppState((p) => ({
                          ...p,
                          pen: {
                            ...p.pen,
                            bodyColorPreset: pen.id as PenColorPreset,
                            bodyColorHex: pen.hex,
                          },
                        }))
                      }
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs transition-colors ${
                        appState.pen.bodyColorHex === pen.hex
                          ? 'border-blue-500 bg-blue-950/40 text-white ring-1 ring-blue-500'
                          : 'border-[#262d42] bg-[#11151f] text-slate-300 hover:bg-[#1a2130]'
                      }`}
                    >
                      <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: pen.hex }} />
                      <span className="truncate">{pen.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Heading Pen Color & Underline */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Heading Pen Color</label>
                  <div className="flex gap-1.5">
                    {[
                      { id: 'red', hex: '#b91c1c' },
                      { id: 'black', hex: '#1e2026' },
                      { id: 'blue', hex: '#1b3b8c' },
                    ].map((col) => (
                      <button
                        key={col.id}
                        onClick={() =>
                          setAppState((p) => ({
                            ...p,
                            pen: { ...p.pen, headingColorHex: col.hex },
                          }))
                        }
                        className={`w-7 h-7 rounded-lg border flex items-center justify-center transition-all ${
                          appState.pen.headingColorHex === col.hex
                            ? 'border-white ring-2 ring-blue-500'
                            : 'border-[#262d42]'
                        }`}
                        style={{ backgroundColor: col.hex }}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs text-slate-400 block mb-1">Heading Underline</label>
                  <select
                    value={appState.pen.headingUnderline}
                    onChange={(e) =>
                      setAppState((p) => ({
                        ...p,
                        pen: { ...p.pen, headingUnderline: e.target.value as any },
                      }))
                    }
                    className="w-full bg-[#11151f] border border-[#262d42] rounded-lg px-2 py-1.5 text-xs text-slate-200"
                  >
                    <option value="none">None</option>
                    <option value="single">Single Hand-Sketched</option>
                    <option value="double">Double Hand-Sketched</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Quick Realism Presets */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                Camera &amp; Scan Presets
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setAppState((p) => ({
                      ...p,
                      paper: {
                        ...p.paper,
                        scanFilter: 'camscanner',
                        spiralHoles: true,
                        showPaperTexture: true,
                        shadowIntensity: 0.35,
                        perspectiveTilt: 0.22,
                        inkBleed: 0.10,
                      },
                    }))
                  }
                  className={`text-left p-2.5 rounded-xl border transition-all ${
                    appState.paper.scanFilter === 'camscanner' &&
                    (appState.paper.spiralHoles ?? true) &&
                    appState.paper.shadowIntensity > 0.2
                      ? 'border-blue-500 bg-blue-950/40 text-blue-300 ring-1 ring-blue-500'
                      : 'border-[#262d42] bg-[#181d2a] text-slate-300 hover:bg-[#1f2537]'
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-xs font-medium">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>CamScanner Camera Photo</span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">
                    Authentic phone photo: punched spiral holes, camera grain, phone shadow &amp; skew
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setAppState((p) => ({
                      ...p,
                      paper: {
                        ...p.paper,
                        scanFilter: 'bw-xerox',
                        spiralHoles: false,
                        showPaperTexture: false,
                        shadowIntensity: 0.0,
                        perspectiveTilt: 0.0,
                        inkBleed: 0.0,
                      },
                    }))
                  }
                  className={`text-left p-2.5 rounded-xl border transition-all ${
                    appState.paper.scanFilter === 'bw-xerox' &&
                    !appState.paper.spiralHoles &&
                    appState.paper.shadowIntensity === 0
                      ? 'border-blue-500 bg-blue-950/40 text-blue-300 ring-1 ring-blue-500'
                      : 'border-[#262d42] bg-[#181d2a] text-slate-300 hover:bg-[#1f2537]'
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-xs font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Clean Flat PDF Scan</span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">
                    Orthogonal flat scan: zero perspective tilt, pure white background, no shadows
                  </div>
                </button>
              </div>
            </div>

            {/* Paper Template Selector */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                College Paper Template
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'indian-ruled', name: 'Indian College Ruled A4', desc: 'Blue rules + Double Red Margin + Date/Page header' },
                  { id: 'unruled-bond', name: 'Unruled White Bond', desc: 'Plain ivory paper with high baseline wander' },
                  { id: 'engineering-graph', name: 'Engineering 5mm Graph', desc: 'Cyan grid lines with border frame' },
                  { id: 'exam-booklet', name: 'University Exam Booklet', desc: 'Official examination header & candidate info' },
                ].map((tpl) => (
                  <button
                    key={tpl.id}
                    onClick={() =>
                      setAppState((p) => ({
                        ...p,
                        paper: { ...p.paper, template: tpl.id as PaperTemplateId },
                      }))
                    }
                    className={`text-left p-2.5 rounded-xl border transition-all ${
                      appState.paper.template === tpl.id
                        ? 'border-blue-500 bg-blue-950/40 text-blue-300 ring-1 ring-blue-500'
                        : 'border-[#262d42] bg-[#181d2a] text-slate-300 hover:bg-[#1f2537]'
                    }`}
                  >
                    <div className="text-xs font-medium">{tpl.name}</div>
                    <div className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">{tpl.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Scanner Filters */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                Scanner &amp; Camera Pipeline
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'original', name: 'Original Live Ink', desc: 'No post-processing' },
                  { id: 'camscanner', name: 'CamScanner "Magic Color"', desc: 'High-key white paper + Bayer grain + vivid ink' },
                  { id: 'natural-photo', name: 'Natural Phone Photo', desc: 'Warm ambient lighting & mild vignette' },
                  { id: 'bw-xerox', name: 'B&W Xerox Photocopy', desc: 'High-contrast monochrome threshold' },
                ].map((filter) => (
                  <button
                    key={filter.id}
                    onClick={() =>
                      setAppState((p) => ({
                        ...p,
                        paper: { ...p.paper, scanFilter: filter.id as ScanFilter },
                      }))
                    }
                    className={`text-left p-2.5 rounded-xl border transition-all ${
                      appState.paper.scanFilter === filter.id
                        ? 'border-blue-500 bg-blue-950/40 text-blue-300 ring-1 ring-blue-500'
                        : 'border-[#262d42] bg-[#181d2a] text-slate-300 hover:bg-[#1f2537]'
                    }`}
                  >
                    <div className="text-xs font-medium">{filter.name}</div>
                    <div className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">{filter.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Physical Notebook Toggles */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                Physical Notebook Simulation
              </label>

              {/* Spiral Notebook Punch Holes */}
              <label className="flex items-start gap-2 bg-[#11151f] p-2.5 rounded-lg border border-[#262d42] cursor-pointer hover:bg-[#181f2f]">
                <input
                  type="checkbox"
                  checked={appState.paper.spiralHoles ?? (appState.paper.template === 'unruled-bond')}
                  onChange={(e) =>
                    setAppState((p) => ({
                      ...p,
                      paper: { ...p.paper, spiralHoles: e.target.checked },
                    }))
                  }
                  className="mt-0.5 rounded text-blue-500 focus:ring-0"
                />
                <div>
                  <div className="text-xs font-medium text-slate-200">Spiral Notebook Punch Holes &amp; Rings</div>
                  <div className="text-[10px] text-slate-400">
                    Renders margin punch holes with dark backing, cut paper rim highlights, and metal binder coils.
                  </div>
                </div>
              </label>

              {/* Paper Texture Fibers */}
              <label className="flex items-start gap-2 bg-[#11151f] p-2.5 rounded-lg border border-[#262d42] cursor-pointer hover:bg-[#181f2f]">
                <input
                  type="checkbox"
                  checked={appState.paper.showPaperTexture ?? true}
                  onChange={(e) =>
                    setAppState((p) => ({
                      ...p,
                      paper: { ...p.paper, showPaperTexture: e.target.checked },
                    }))
                  }
                  className="mt-0.5 rounded text-blue-500 focus:ring-0"
                />
                <div>
                  <div className="text-xs font-medium text-slate-200">Paper Texture Fibers &amp; Micro-Creases</div>
                  <div className="text-[10px] text-slate-400">
                    Adds microscopic cellulose pulp fibers and soft handling folds across the paper sheet.
                  </div>
                </div>
              </label>

              {/* Coffee Mug Ring Stain */}
              <label className="flex items-start gap-2 bg-[#11151f] p-2.5 rounded-lg border border-[#262d42] cursor-pointer hover:bg-[#181f2f]">
                <input
                  type="checkbox"
                  checked={appState.paper.showCoffeeStain ?? false}
                  onChange={(e) =>
                    setAppState((p) => ({
                      ...p,
                      paper: { ...p.paper, showCoffeeStain: e.target.checked },
                    }))
                  }
                  className="mt-0.5 rounded text-blue-500 focus:ring-0"
                />
                <div>
                  <div className="text-xs font-medium text-slate-200">Procedural Coffee Mug Rings &amp; Drips</div>
                  <div className="text-[10px] text-slate-400">
                    Realistic multiply-blended dark coffee ring and dried liquid droplets on page 1.
                  </div>
                </div>
              </label>

              {/* Sticky Note Overlay */}
              <div className="bg-[#11151f] p-2.5 rounded-lg border border-[#262d42] space-y-2">
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={appState.paper.showStickyNote ?? false}
                    onChange={(e) =>
                      setAppState((p) => ({
                        ...p,
                        paper: { ...p.paper, showStickyNote: e.target.checked },
                      }))
                    }
                    className="mt-0.5 rounded text-blue-500 focus:ring-0"
                  />
                  <div>
                    <div className="text-xs font-medium text-slate-200">Pastel Yellow Sticky Note Overlay</div>
                    <div className="text-[10px] text-slate-400">
                      Tilted 3D Post-It note with personal reminder text pinned to page 1.
                    </div>
                  </div>
                </label>
                {appState.paper.showStickyNote && (
                  <input
                    type="text"
                    placeholder="Sticky note text..."
                    value={appState.paper.stickyNoteText ?? ''}
                    onChange={(e) =>
                      setAppState((p) => ({
                        ...p,
                        paper: { ...p.paper, stickyNoteText: e.target.value },
                      }))
                    }
                    className="w-full bg-[#0d1017] border border-[#262d42] rounded px-2.5 py-1 text-xs text-yellow-300 placeholder-slate-600 focus:outline-none focus:border-yellow-500"
                  />
                )}
              </div>
            </div>

            {/* Physical Scan Realism Sliders */}
            <div className="space-y-3 pt-1">
              {/* Smartphone Corner Shadow */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300">Smartphone Corner Shadow &amp; Desk Ambient Light</span>
                  <span className="font-mono text-blue-400">
                    {Math.round(appState.paper.shadowIntensity * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={appState.paper.shadowIntensity}
                  onChange={(e) =>
                    setAppState((p) => ({
                      ...p,
                      paper: { ...p.paper, shadowIntensity: parseFloat(e.target.value) },
                    }))
                  }
                  className="w-full accent-blue-500 h-1.5 bg-[#1f2536] rounded-lg"
                />
              </div>

              {/* Spine Page Curl / Perspective Tilt */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300">Camera Perspective Skew &amp; Page Curl</span>
                  <span className="font-mono text-blue-400">
                    {Math.round(appState.paper.perspectiveTilt * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={appState.paper.perspectiveTilt}
                  onChange={(e) =>
                    setAppState((p) => ({
                      ...p,
                      paper: { ...p.paper, perspectiveTilt: parseFloat(e.target.value) },
                    }))
                  }
                  className="w-full accent-blue-500 h-1.5 bg-[#1f2536] rounded-lg"
                />
              </div>

              {/* Back Page Ink Bleed Ghosting */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300">Back-Page Bleed Ghosting</span>
                  <span className="font-mono text-blue-400">
                    {Math.round(appState.paper.inkBleed * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="0.15"
                  step="0.01"
                  value={appState.paper.inkBleed}
                  onChange={(e) =>
                    setAppState((p) => ({
                      ...p,
                      paper: { ...p.paper, inkBleed: parseFloat(e.target.value) },
                    }))
                  }
                  className="w-full accent-blue-500 h-1.5 bg-[#1f2536] rounded-lg"
                />
              </div>
            </div>

            {/* Header Credentials */}
            <div className="bg-[#181d2a] p-3 rounded-xl border border-[#262d42] space-y-2.5">
              <div className="text-xs font-semibold text-slate-300">Notebook Header Details</div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Student / Candidate</label>
                  <input
                    type="text"
                    value={appState.paper.studentName}
                    onChange={(e) =>
                      setAppState((p) => ({
                        ...p,
                        paper: { ...p.paper, studentName: e.target.value },
                      }))
                    }
                    className="w-full bg-[#11151f] border border-[#262d42] rounded-lg px-2.5 py-1 text-xs text-slate-200"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Date</label>
                  <input
                    type="text"
                    value={appState.paper.dateStr}
                    onChange={(e) =>
                      setAppState((p) => ({
                        ...p,
                        paper: { ...p.paper, dateStr: e.target.value },
                      }))
                    }
                    className="w-full bg-[#11151f] border border-[#262d42] rounded-lg px-2.5 py-1 text-xs text-slate-200"
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-[11px] text-slate-400 block mb-1">
                    Sideways Gutter Note / Margin Annotation (Page 1)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Problem 3 (b) — Due Nov 14"
                    value={appState.paper.marginAnnotation ?? ''}
                    onChange={(e) =>
                      setAppState((p) => ({
                        ...p,
                        paper: { ...p.paper, marginAnnotation: e.target.value },
                      }))
                    }
                    className="w-full bg-[#11151f] border border-[#262d42] rounded-lg px-2.5 py-1 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer Status Bar */}
      <div className="px-4 py-3 border-t border-[#1f2536] bg-[#0d1017] flex items-center justify-between text-xs text-slate-400">
        <button
          onClick={onRegenerateSeed}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#181d2a] hover:bg-[#20273a] text-slate-300 hover:text-white border border-[#262d42] transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5 text-blue-400" />
          <span>Regenerate Human Seed</span>
        </button>

        <span className="font-mono text-[11px] text-slate-500">
          Seed #{appState.handwriting.randomSeed}
        </span>
      </div>
    </aside>
  );
};
