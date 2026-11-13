import React, { useRef, useState, useEffect } from 'react';
import {
  FileText,
  Sliders,
  Palette,
  Sparkles,
  Upload,
  PenTool,
  Check,
  ChevronDown,
  ChevronRight,
  RotateCcw,
  BookOpen,
  Zap,
  Search,
  User,
  CheckCircle2,
  Trash2,
  Plus,
  Save,
  Gauge,
  Highlighter,
  Download,
  Share2,
} from 'lucide-react';
import {
  AppState,
  PenColorPreset,
  HeadingColorPreset,
  PaperTemplateId,
  ScanFilter,
  HandwritingPersona,
  CustomPersonaProfile,
} from '../types';
import { BUILTIN_FONTS, FontCategory } from '../engine/fontLoader';
import { extractStructuredPromptSections } from '../engine/formatter';
import { SAMPLE_ASSIGNMENTS } from '../data/samples';
import {
  HANDWRITING_PERSONAS,
  loadCustomPersonas,
  saveCustomPersona,
  deleteCustomPersona,
  applyVarianceToHandwriting,
  inferVarianceFromSettings,
  downloadPersonasFile,
  importCustomPersonasFromJson,
} from '../constants/personas';

interface StudioControlsProps {
  appState: AppState;
  setAppState: React.Dispatch<React.SetStateAction<AppState>>;
  onOpenGlyphStudio: () => void;
  onOpenStyleLab?: () => void;
  onCustomFontUpload: (fontBuffer: ArrayBuffer, name: string) => void;
  onRegenerateSeed: () => void;
  onOpenStudentizer?: () => void;
}

export const StudioControls: React.FC<StudioControlsProps> = ({
  appState,
  setAppState,
  onOpenGlyphStudio,
  onOpenStyleLab,
  onCustomFontUpload,
  onRegenerateSeed,
  onOpenStudentizer,
}) => {
  const [activeTab, setActiveTab] = React.useState<'editor' | 'biomechanics' | 'paper'>(() => {
    const tabParam = new URLSearchParams(window.location.search).get('tab');
    return tabParam === 'biomechanics' || tabParam === 'paper' ? tabParam : 'editor';
  });
  const [fontCategory, setFontCategory] = React.useState<FontCategory>('All');
  const [fontSearch, setFontSearch] = React.useState('');
  const [customPersonas, setCustomPersonas] = useState<CustomPersonaProfile[]>(() => loadCustomPersonas());
  const [isSavingPersona, setIsSavingPersona] = useState(false);
  const [newPersonaName, setNewPersonaName] = useState('');
  const [showAdvancedPhysics, setShowAdvancedPhysics] = useState(false);
  const [isFontPickerOpen, setIsFontPickerOpen] = useState(false);
  const [showMathPalette, setShowMathPalette] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const personaFileInputRef = useRef<HTMLInputElement | null>(null);
  const [personaMessage, setPersonaMessage] = useState<string | null>(null);

  const handleExportPersonas = () => {
    downloadPersonasFile();
    setPersonaMessage('Exported styles downloaded!');
    setTimeout(() => setPersonaMessage(null), 3000);
  };

  const handleImportPersonaFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const res = importCustomPersonasFromJson(content);
      if (res.success) {
        setCustomPersonas(loadCustomPersonas());
        setPersonaMessage(`Imported ${res.count} handwriting styles!`);
      } else {
        setPersonaMessage(`Import failed: ${res.error}`);
      }
      setTimeout(() => setPersonaMessage(null), 4000);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Sync custom personas if storage changes
  useEffect(() => {
    setCustomPersonas(loadCustomPersonas());
  }, [appState.handwriting.persona]);

  const applyPersona = (personaId: HandwritingPersona) => {
    const profile = HANDWRITING_PERSONAS.find((p) => p.id === personaId);
    if (profile) {
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
      return;
    }

    const custom = customPersonas.find((p) => p.id === personaId);
    if (custom) {
      setAppState((prev) => ({
        ...prev,
        handwriting: {
          ...prev.handwriting,
          ...custom.handwriting,
        },
        pen: {
          ...prev.pen,
          ...custom.pen,
        },
        paper: custom.paper
          ? {
              ...prev.paper,
              ...custom.paper,
            }
          : prev.paper,
      }));
    }
  };

  const handleSaveCurrentPersona = () => {
    const name = newPersonaName.trim() || `My Style ${customPersonas.length + 1}`;
    const id = `custom-${Date.now()}`;
    const profile: CustomPersonaProfile = {
      id,
      name,
      subtitle: `Custom Style · ${appState.handwriting.fontFamily} · ${appState.handwriting.fontSize}px`,
      createdAt: Date.now(),
      badge: 'Custom Style',
      handwriting: {
        ...appState.handwriting,
        persona: id,
      },
      pen: { ...appState.pen },
      paper: {
        template: appState.paper.template,
        scanFilter: appState.paper.scanFilter,
        inkBleed: appState.paper.inkBleed,
        shadowIntensity: appState.paper.shadowIntensity,
        perspectiveTilt: appState.paper.perspectiveTilt,
        showPaperTexture: appState.paper.showPaperTexture,
        showMarginGuides: appState.paper.showMarginGuides,
        spiralHoles: appState.paper.spiralHoles,
        paperWarmth: appState.paper.paperWarmth,
        roughWorkInstrument: appState.paper.roughWorkInstrument,
      },
    };
    saveCustomPersona(profile);
    setCustomPersonas(loadCustomPersonas());
    setAppState((p) => ({
      ...p,
      handwriting: { ...p.handwriting, persona: id },
    }));
    setIsSavingPersona(false);
    setNewPersonaName('');
  };

  const handleDeleteCustomPersona = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteCustomPersona(id);
    setCustomPersonas(loadCustomPersonas());
    if (appState.handwriting.persona === id) {
      applyPersona('rushed-medical-cursive');
    }
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
    e.target.value = '';
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
    const structured = extractStructuredPromptSections(sample.content);
    setAppState((prev) => ({
      ...prev,
      rawInput: sample.content,
      paper: {
        ...prev.paper,
        assignmentTitle: structured.title || sample.title,
        dateStr: structured.dateStr || prev.paper.dateStr,
        marginAnnotation: structured.marginNote || '',
        roughWorkColumn: structured.roughWork.length > 0,
        customRoughWork:
          structured.roughWork.length > 0
            ? structured.roughWork
            : ['14 · 6 = 84', '84 - 23 = 61', '√61 ≈ 7.81'],
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

            {/* Handwriting Archetype Quick Switcher Pills */}
            <div className="bg-[#181d2a] p-3 rounded-xl border border-[#262d42] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-blue-400" />
                  <span>Handwriting Persona</span>
                </span>
                {onOpenStyleLab && (
                  <button
                    onClick={onOpenStyleLab}
                    className="flex items-center gap-1 text-[10px] text-blue-400 hover:text-blue-300 font-medium"
                  >
                    <PenTool className="w-3 h-3" />
                    <span>Style Lab →</span>
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {HANDWRITING_PERSONAS.map((p) => {
                  const isActive = appState.handwriting.persona === p.id;
                  return (
                    <button
                      key={p.id}
                      onClick={() => applyPersona(p.id)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all flex items-center gap-1 ${
                        isActive
                          ? 'border-blue-500 bg-blue-600 text-white shadow-sm ring-1 ring-blue-400/50'
                          : 'border-[#262d42] bg-[#11151f] text-slate-300 hover:bg-[#1a2130]'
                      }`}
                    >
                      <span>{p.name.split("'s")[0] || p.name.split(' ')[0]}</span>
                      {isActive && <Check className="w-3 h-3 text-blue-200 shrink-0" />}
                    </button>
                  );
                })}
                {customPersonas.map((cp) => {
                  const isActive = appState.handwriting.persona === cp.id;
                  return (
                    <button
                      key={cp.id}
                      onClick={() => applyPersona(cp.id)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all flex items-center gap-1 ${
                        isActive
                          ? 'border-indigo-500 bg-indigo-600 text-white shadow-sm ring-1 ring-indigo-400/50'
                          : 'border-[#262d42] bg-[#11151f] text-slate-300 hover:bg-[#1a2130]'
                      }`}
                    >
                      <span>✍️ {cp.name}</span>
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
                  value=""
                  onChange={(e) => {
                    if (e.target.value) loadSample(e.target.value);
                  }}
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
                  <button
                    onClick={() => setShowMathPalette(!showMathPalette)}
                    className="text-[11px] text-blue-400 hover:text-blue-300 px-2 py-0.5 rounded bg-[#11151f] border border-[#262d42] hover:bg-[#1e2535] transition-colors"
                  >
                    {showMathPalette ? '− Hide Math Palette' : '+ Math Palette'}
                  </button>
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

              {/* Quick Math Snippets Toolbar (Collapsible) */}
              {showMathPalette && (
                <div className="flex flex-wrap gap-1 pt-0.5 pb-1 animate-fade-in border-b border-[#222a3d]">
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
              )}

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
        {activeTab === 'biomechanics' && (() => {
          const currentVariance = inferVarianceFromSettings(appState.handwriting);
          const activeFont = BUILTIN_FONTS.find((f) => f.id === appState.handwriting.fontFamily) || {
            id: appState.handwriting.fontFamily,
            name: appState.handwriting.fontFamily,
            category: 'Custom Font',
            description: 'User uploaded font',
          };

          return (
            <div className="space-y-4">
              {/* 1. Handwriting Persona Pills & Style Lab Launch */}
              <div className="bg-[#181d2a] p-3.5 rounded-xl border border-[#262d42] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-blue-400" />
                    <span className="text-xs font-semibold text-slate-200">
                      Handwriting Persona &amp; Style Lab
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {onOpenStyleLab && (
                      <button
                        onClick={onOpenStyleLab}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-[11px] font-semibold shadow-sm transition-all"
                        title="Draw sample words on screen to calibrate and clone your handwriting"
                      >
                        <PenTool className="w-3 h-3" />
                        <span>Draw Style</span>
                      </button>
                    )}
                    <button
                      onClick={() => setIsSavingPersona(!isSavingPersona)}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[#11151f] hover:bg-[#1f2638] text-slate-300 hover:text-white border border-[#262d42] text-[11px] transition-colors"
                      title="Save current handwriting and pen settings as a custom preset"
                    >
                      <Save className="w-3 h-3 text-blue-400" />
                      <span>Save</span>
                    </button>
                    <button
                      onClick={handleExportPersonas}
                      className="p-1 rounded-lg bg-[#11151f] hover:bg-[#1f2638] text-slate-400 hover:text-white border border-[#262d42] text-[11px] transition-colors"
                      title="Export saved styles as JSON file"
                    >
                      <Download className="w-3.5 h-3.5 text-slate-300" />
                    </button>
                    <button
                      onClick={() => personaFileInputRef.current?.click()}
                      className="p-1 rounded-lg bg-[#11151f] hover:bg-[#1f2638] text-slate-400 hover:text-white border border-[#262d42] text-[11px] transition-colors"
                      title="Import custom styles from JSON file"
                    >
                      <Upload className="w-3.5 h-3.5 text-slate-300" />
                    </button>
                    <input
                      ref={personaFileInputRef}
                      type="file"
                      accept=".json"
                      onChange={handleImportPersonaFile}
                      className="hidden"
                    />
                  </div>
                </div>

                {/* Persona Notification Toast */}
                {personaMessage && (
                  <div className="text-[11px] bg-blue-950/60 border border-blue-500/40 text-blue-200 px-2.5 py-1 rounded-md animate-fade-in flex items-center gap-1.5">
                    <CheckCircle2 className="w-3 h-3 text-blue-400 shrink-0" />
                    <span>{personaMessage}</span>
                  </div>
                )}

                {/* Inline Save Preset Form */}
                {isSavingPersona && (
                  <div className="bg-[#11151f] p-2.5 rounded-lg border border-blue-500/40 space-y-2 animate-fade-in">
                    <div className="text-[11px] font-medium text-slate-300">Name this custom handwriting preset:</div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="e.g. My Fast Calculus Style"
                        value={newPersonaName}
                        onChange={(e) => setNewPersonaName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveCurrentPersona();
                        }}
                        className="flex-1 bg-[#0c0e14] border border-[#262d42] rounded px-2.5 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                        autoFocus
                      />
                      <button
                        onClick={handleSaveCurrentPersona}
                        className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-medium"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setIsSavingPersona(false)}
                        className="px-2 py-1 text-slate-400 hover:text-white text-xs"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Style Pills Row */}
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {/* Built-in Presets */}
                  {HANDWRITING_PERSONAS.map((p) => {
                    const isActive = appState.handwriting.persona === p.id;
                    return (
                      <button
                        key={p.id}
                        onClick={() => applyPersona(p.id)}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all flex items-center gap-1.5 ${
                          isActive
                            ? 'bg-blue-600 text-white border-blue-500 shadow-sm ring-1 ring-blue-400/50'
                            : 'bg-[#11151f] text-slate-300 hover:text-white hover:bg-[#1a2130] border-[#262d42]'
                        }`}
                      >
                        <span>{p.name.split("'s")[0] || p.name.split(' ')[0]}</span>
                        {isActive && <Check className="w-3 h-3 text-blue-200 shrink-0" />}
                      </button>
                    );
                  })}

                  {/* Custom User-Calibrated Personas */}
                  {customPersonas.map((cp) => {
                    const isActive = appState.handwriting.persona === cp.id;
                    return (
                      <div
                        key={cp.id}
                        onClick={() => applyPersona(cp.id)}
                        className={`group px-2.5 py-1.5 rounded-lg text-xs font-medium border cursor-pointer transition-all flex items-center gap-1.5 ${
                          isActive
                            ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm ring-1 ring-indigo-400/50'
                            : 'bg-[#11151f] text-slate-300 hover:text-white hover:bg-[#1a2130] border-[#262d42]'
                        }`}
                      >
                        <span>✍️ {cp.name}</span>
                        <button
                          onClick={(e) => handleDeleteCustomPersona(cp.id, e)}
                          className="opacity-40 group-hover:opacity-100 hover:text-red-300 transition-opacity p-0.5"
                          title="Delete custom style"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Writing Register & Cursive Mode Selector */}
              <div className="bg-[#181d2a] p-3.5 rounded-xl border border-[#262d42] space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-200">Writing Style &amp; Cursive Flow</span>
                  <span className="text-[10px] font-mono text-blue-400">
                    {(appState.handwriting.cursiveMode ?? 'vector-cursive').toUpperCase()}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { id: 'print', label: 'Clean Print', desc: 'Disconnected letters' },
                    { id: 'semi-cursive', label: 'Semi-Cursive', desc: 'TTF + ligature bridges' },
                    { id: 'vector-cursive', label: 'True Cursive', desc: 'Unbroken word splines' },
                  ].map((mode) => (
                    <button
                      key={mode.id}
                      onClick={() =>
                        setAppState((p) => ({
                          ...p,
                          handwriting: { ...p.handwriting, cursiveMode: mode.id as any },
                        }))
                      }
                      className={`p-2 rounded-lg border text-left transition-all ${
                        (appState.handwriting.cursiveMode ?? 'vector-cursive') === mode.id
                          ? 'border-blue-500 bg-blue-950/40 text-blue-300 ring-1 ring-blue-500/60'
                          : 'border-[#262d42] bg-[#11151f] text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <div className="text-[11px] font-semibold">{mode.label}</div>
                      <div className="text-[9px] text-slate-400">{mode.desc}</div>
                    </button>
                  ))}
                </div>

                {appState.handwriting.cursiveMode === 'vector-cursive' && (
                  <div className="pt-2 border-t border-[#222a3d] space-y-2.5 animate-fade-in">
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-medium text-slate-300 block">Cursive Personality</span>
                      <div className="grid grid-cols-2 gap-1.5">
                        {[
                          { id: 'rushed-stem-medical', label: 'Rushed STEM/Med', slant: 17.5 },
                          { id: 'collegiate-flow', label: 'Collegiate Flow', slant: 12 },
                          { id: 'palmer-business', label: 'Palmer Business', slant: 21 },
                          { id: 'french-grands-carreaux', label: 'French School', slant: 5 },
                        ].map((st) => (
                          <button
                            key={st.id}
                            onClick={() =>
                              setAppState((p) => ({
                                ...p,
                                handwriting: {
                                  ...p.handwriting,
                                  cursiveStyle: st.id as any,
                                  slantAngle: st.slant,
                                },
                              }))
                            }
                            className={`px-2 py-1.5 rounded-lg border text-left text-[11px] transition-colors ${
                              (appState.handwriting.cursiveStyle ?? 'rushed-stem-medical') === st.id
                                ? 'border-blue-500 bg-blue-950/40 text-blue-300 font-semibold'
                                : 'border-[#262d42] bg-[#11151f] text-slate-300 hover:text-white'
                            }`}
                          >
                            {st.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-300">Nib Up/Down Pressure Contrast</span>
                      <span className="font-mono text-blue-400">
                        {Math.round((appState.handwriting.cursivePressureContrast ?? 0.60) * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={appState.handwriting.cursivePressureContrast ?? 0.60}
                      onChange={(e) =>
                        setAppState((p) => ({
                          ...p,
                          handwriting: { ...p.handwriting, cursivePressureContrast: parseFloat(e.target.value) },
                        }))
                      }
                      className="w-full accent-blue-500 h-1.5 bg-[#1f2536] rounded-lg cursor-pointer"
                    />
                  </div>
                )}
              </div>

              {/* 2. Master Human Variance Bias Slider */}
              <div className="bg-[#181d2a] p-3.5 rounded-xl border border-[#262d42] space-y-2.5">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                      <Gauge className="w-3.5 h-3.5 text-blue-400" />
                      <span>Human Variance &amp; Exam Rush Bias</span>
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {currentVariance <= 3.0
                        ? 'Neat Study Notes · Minimal Jitter & Tidy Loops'
                        : currentVariance <= 6.5
                        ? 'Natural Student Notes · Organic Jitter & Tilt'
                        : 'Rushed Exam Derivation · Speed Drift & Skips'}
                    </div>
                  </div>
                  <span className="font-mono text-xs font-bold text-blue-400 bg-[#11151f] px-2 py-0.5 rounded border border-[#262d42]">
                    {currentVariance.toFixed(1)} / 10
                  </span>
                </div>

                <input
                  type="range"
                  min="0.5"
                  max="10"
                  step="0.5"
                  value={currentVariance}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value);
                    setAppState((p) => ({
                      ...p,
                      handwriting: applyVarianceToHandwriting(p.handwriting, v),
                    }));
                  }}
                  className="w-full accent-blue-500 h-1.5 bg-[#1f2536] rounded-lg cursor-pointer"
                />

                <div className="grid grid-cols-3 gap-1.5 pt-0.5">
                  {[
                    { label: '📘 Neat Study', val: 2.0 },
                    { label: '📝 Natural Hand', val: 5.0 },
                    { label: '⚡ Rushed Exam', val: 8.5 },
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      onClick={() =>
                        setAppState((p) => ({
                          ...p,
                          handwriting: applyVarianceToHandwriting(p.handwriting, preset.val),
                        }))
                      }
                      className={`py-1 text-[11px] font-medium rounded border transition-colors ${
                        Math.abs(currentVariance - preset.val) < 0.5
                          ? 'bg-blue-600/30 border-blue-500 text-blue-300'
                          : 'bg-[#11151f] border-[#222a3d] text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. Compact Handwriting Font Card & Picker */}
              <div className="bg-[#181d2a] p-3.5 rounded-xl border border-[#262d42] space-y-2.5">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-slate-200">Handwriting Font Skeleton</span>
                    <div className="text-[11px] text-blue-400 font-medium">
                      {activeFont.name} <span className="text-slate-500 text-[10px]">({activeFont.category})</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsFontPickerOpen(!isFontPickerOpen)}
                    className="flex items-center gap-1 text-[11px] text-slate-300 hover:text-white bg-[#11151f] hover:bg-[#1e2535] px-2.5 py-1 rounded-lg border border-[#262d42] transition-colors"
                  >
                    <span>{isFontPickerOpen ? 'Hide Fonts' : 'Browse All Fonts'}</span>
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isFontPickerOpen ? 'rotate-180' : ''}`} />
                  </button>
                </div>

                {/* Collapsible Font Grid */}
                {isFontPickerOpen && (
                  <div className="space-y-2.5 pt-1 border-t border-[#222a3d] animate-fade-in">
                    {/* Category Filter Pills */}
                    <div className="flex flex-wrap gap-1">
                      {(['All', "Boy's Cursive", "Girl's Cursive", 'STEM & Tech', 'Fluid Cursive', 'College Print', 'Fast & Scratch'] as FontCategory[]).map(
                        (cat) => (
                          <button
                            key={cat}
                            onClick={() => setFontCategory(cat)}
                            className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                              fontCategory === cat
                                ? 'bg-blue-600 text-white'
                                : 'bg-[#11151f] text-slate-400 hover:text-slate-200 border border-[#22293d]'
                            }`}
                          >
                            {cat}
                          </button>
                        )
                      )}
                    </div>

                    {/* Search Bar */}
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search fonts (e.g. ballpoint, cursive, blueprint)..."
                        value={fontSearch}
                        onChange={(e) => setFontSearch(e.target.value)}
                        className="w-full bg-[#11151f] border border-[#262d42] rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    {/* Compact Font Grid */}
                    <div className="grid grid-cols-2 gap-1.5 max-h-[200px] overflow-y-auto pr-1">
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
                            className={`px-2.5 py-1.5 rounded-lg border text-left transition-all ${
                              isSelected
                                ? 'border-blue-500 bg-blue-950/40 text-blue-300 font-medium'
                                : 'border-[#262d42] bg-[#11151f] text-slate-300 hover:bg-[#1a2130]'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-xs font-semibold truncate">{font.name}</span>
                              {isSelected && <Check className="w-3 h-3 text-blue-400 shrink-0" />}
                            </div>
                            <div className="text-[9px] text-slate-500 uppercase font-mono mt-0.5">{font.category}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Upload & Clone Buttons */}
                <div className="flex gap-2 pt-0.5">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".ttf,.otf"
                    onChange={handleFontUpload}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#262d42] bg-[#11151f] hover:bg-[#1a2030] text-xs text-slate-300 hover:text-white transition-colors"
                  >
                    <Upload className="w-3.5 h-3.5 text-blue-400" />
                    <span>Upload .TTF Font</span>
                  </button>

                  <button
                    onClick={onOpenGlyphStudio}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#11151f] hover:bg-[#1a2030] border border-[#262d42] text-xs text-slate-300 hover:text-white transition-colors"
                  >
                    <PenTool className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Glyph Studio</span>
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

              {/* 5. Collapsible Accordion: Advanced Motor Physics (12 Parameters) */}
              <div className="bg-[#181d2a] rounded-xl border border-[#262d42] overflow-hidden">
                <button
                  onClick={() => setShowAdvancedPhysics(!showAdvancedPhysics)}
                  className="w-full p-3.5 flex items-center justify-between text-left hover:bg-[#1d2333] transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-blue-400" />
                    <div>
                      <div className="text-xs font-semibold text-slate-200">
                        Advanced Motor Physics (12 Parameters)
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Fine-tune individual topological warps, ligatures, jitter &amp; fatigue
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-blue-400 font-mono bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/30">
                      Auto-Balanced
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 text-slate-400 transition-transform ${
                        showAdvancedPhysics ? 'rotate-180' : ''
                      }`}
                    />
                  </div>
                </button>

                {showAdvancedPhysics && (
                  <div className="p-3.5 border-t border-[#262d42] space-y-3.5 bg-[#141824] animate-fade-in">
                    {/* Loop Warp */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-300">Topological 3-Zone Loop Warp</span>
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
                            handwriting: { ...p.handwriting, loopWarp: parseFloat(e.target.value), humanVariance: undefined },
                          }))
                        }
                        className="w-full accent-blue-500 h-1.5 bg-[#1f2536] rounded-lg cursor-pointer"
                      />
                    </div>

                    {/* Ligature Rate */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-300">Cursive Ligatures (Air-Drag)</span>
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
                            handwriting: { ...p.handwriting, ligatureRate: parseFloat(e.target.value), humanVariance: undefined },
                          }))
                        }
                        className="w-full accent-blue-500 h-1.5 bg-[#1f2536] rounded-lg cursor-pointer"
                      />
                    </div>

                    {/* Flying Dot Chaos */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-300">Flying &apos;i&apos;/&apos;j&apos; Dot Drift</span>
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
                            handwriting: { ...p.handwriting, flyingDotChaos: parseFloat(e.target.value), humanVariance: undefined },
                          }))
                        }
                        className="w-full accent-blue-500 h-1.5 bg-[#1f2536] rounded-lg cursor-pointer"
                      />
                    </div>

                    {/* Shared Crossbar & Anti-Duplication */}
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <label className="flex items-start gap-2 bg-[#11151f] p-2 rounded-lg border border-[#262d42] cursor-pointer">
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
                        <span className="text-xs text-slate-300">Shared &apos;tt&apos; Crossbar</span>
                      </label>

                      <label className="flex items-start gap-2 bg-[#11151f] p-2 rounded-lg border border-[#262d42] cursor-pointer">
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
                        <span className="text-xs text-slate-300">Anti-Clone Rule</span>
                      </label>
                    </div>

                    {/* Slant Angle */}
                    <div className="space-y-1 pt-1 border-t border-[#222a3d]">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-300">Forward Slant Angle</span>
                        <span className="font-mono text-blue-400">
                          {(appState.handwriting.slantAngle ?? 0) > 0 ? `+${appState.handwriting.slantAngle}°` : `${appState.handwriting.slantAngle ?? 0}°`}
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
                            handwriting: { ...p.handwriting, slantAngle: parseInt(e.target.value, 10), humanVariance: undefined },
                          }))
                        }
                        className="w-full accent-blue-500 h-1.5 bg-[#1f2536] rounded-lg cursor-pointer"
                      />
                    </div>

                    {/* Baseline Wave & Intra-Word Velocity */}
                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-400 text-[11px]">Baseline Wave</span>
                          <span className="font-mono text-blue-400 text-[11px]">
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
                              handwriting: { ...p.handwriting, baselineWave: parseFloat(e.target.value), humanVariance: undefined },
                            }))
                          }
                          className="w-full accent-blue-500 h-1.5 bg-[#1f2536] rounded-lg"
                        />
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-400 text-[11px]">Intra-Word Speed</span>
                          <span className="font-mono text-blue-400 text-[11px]">
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
                              handwriting: { ...p.handwriting, intraWordVelocity: parseFloat(e.target.value), humanVariance: undefined },
                            }))
                          }
                          className="w-full accent-blue-500 h-1.5 bg-[#1f2536] rounded-lg"
                        />
                      </div>
                    </div>

                    {/* Margin Squeeze & Scratch-Outs */}
                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-400 text-[11px]">Margin Squeeze</span>
                          <span className="font-mono text-blue-400 text-[11px]">
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
                              handwriting: { ...p.handwriting, marginSqueezeRate: parseFloat(e.target.value), humanVariance: undefined },
                            }))
                          }
                          className="w-full accent-blue-500 h-1.5 bg-[#1f2536] rounded-lg"
                        />
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-400 text-[11px]">Scratch-Outs</span>
                          <span className="font-mono text-blue-400 text-[11px]">
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
                              handwriting: { ...p.handwriting, scratchOutRate: parseFloat(e.target.value), humanVariance: undefined },
                            }))
                          }
                          className="w-full accent-blue-500 h-1.5 bg-[#1f2536] rounded-lg"
                        />
                      </div>
                    </div>

                    {/* Margin Wander & Fatigue */}
                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-400 text-[11px]">Margin Wander</span>
                          <span className="font-mono text-blue-400 text-[11px]">
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
                              handwriting: { ...p.handwriting, marginWander: parseFloat(e.target.value), humanVariance: undefined },
                            }))
                          }
                          className="w-full accent-blue-500 h-1.5 bg-[#1f2536] rounded-lg"
                        />
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-400 text-[11px]">Cumulative Fatigue</span>
                          <span className="font-mono text-blue-400 text-[11px]">
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
                              handwriting: { ...p.handwriting, handFatigue: parseFloat(e.target.value), humanVariance: undefined },
                            }))
                          }
                          className="w-full accent-blue-500 h-1.5 bg-[#1f2536] rounded-lg"
                        />
                      </div>
                    </div>
                  </div>
                )}
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
                  checked={appState.handwriting.tableLines ?? true}
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
                        (appState.handwriting.tableLines ?? true)
                          ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                          : 'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}
                    >
                      {(appState.handwriting.tableLines ?? true) ? 'ON' : 'OFF (Clean Tabulation)'}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400">
                    When on (default), tables render authentic hand-drawn grid lines and borders. When off, tables are tabulated in aligned columns without separation lines.
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

              {/* Snap Baselines to Ruled Lines */}
              <label className="flex items-start gap-2 bg-[#11151f] p-2.5 rounded-lg border border-[#262d42] cursor-pointer hover:bg-[#181f2f]">
                <input
                  type="checkbox"
                  checked={appState.handwriting.snapToRuledLines ?? true}
                  onChange={(e) =>
                    setAppState((p) => ({
                      ...p,
                      handwriting: { ...p.handwriting, snapToRuledLines: e.target.checked },
                    }))
                  }
                  className="mt-0.5 rounded text-blue-500 focus:ring-0"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-slate-200">Snap Baselines to Ruled Lines</span>
                    <span
                      className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-medium ${
                        (appState.handwriting.snapToRuledLines ?? true)
                          ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                          : 'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}
                    >
                      {(appState.handwriting.snapToRuledLines ?? true) ? 'ON' : 'OFF'}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Aligns derivation steps and text onto ruled lines on lined paper templates, preventing mid-air line drift.
                  </div>
                </div>
              </label>

              {/* Opposing-Crescent Cursive Math 'x' )()( */}
              <label className="flex items-start gap-2 bg-[#11151f] p-2.5 rounded-lg border border-[#262d42] cursor-pointer hover:bg-[#181f2f]">
                <input
                  type="checkbox"
                  checked={appState.handwriting.cursiveMathX ?? true}
                  onChange={(e) =>
                    setAppState((p) => ({
                      ...p,
                      handwriting: { ...p.handwriting, cursiveMathX: e.target.checked },
                    }))
                  }
                  className="mt-0.5 rounded text-blue-500 focus:ring-0"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-slate-200">Cursive Opposing-Crescent Math &apos;x&apos; )()(</span>
                    <span
                      className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-medium ${
                        (appState.handwriting.cursiveMathX ?? true)
                          ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                          : 'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}
                    >
                      {(appState.handwriting.cursiveMathX ?? true) ? 'ON' : 'OFF'}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Renders algebraic variable &apos;x&apos; as authentic curved opposing crescents )()( instead of typed cross &apos;×&apos;.
                  </div>
                </div>
              </label>

              {/* Delayed 'i'/'j' Dots & 't' Crossbars */}
              <label className="flex items-start gap-2 bg-[#11151f] p-2.5 rounded-lg border border-[#262d42] cursor-pointer hover:bg-[#181f2f]">
                <input
                  type="checkbox"
                  checked={appState.handwriting.delayedCrossAndDot ?? true}
                  onChange={(e) =>
                    setAppState((p) => ({
                      ...p,
                      handwriting: { ...p.handwriting, delayedCrossAndDot: e.target.checked },
                    }))
                  }
                  className="mt-0.5 rounded text-blue-500 focus:ring-0"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-slate-200">Delayed &apos;i&apos;/&apos;j&apos; Dots &amp; &apos;t&apos; Crossbars</span>
                    <span
                      className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-medium ${
                        (appState.handwriting.delayedCrossAndDot ?? true)
                          ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                          : 'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}
                    >
                      {(appState.handwriting.delayedCrossAndDot ?? true) ? 'ON' : 'OFF'}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Delays tittles and crossbars until word strokes complete, adding authentic flying momentum.
                  </div>
                </div>
              </label>

              {/* Caret '^' Supralinear Insertions */}
              <div className="bg-[#11151f] p-2.5 rounded-lg border border-[#262d42] space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-200">Caret (&apos;^&apos;) Supralinear Insertions</span>
                  <span className="font-mono text-blue-400">
                    {Math.round((appState.handwriting.caretInsertionRate ?? 0.012) * 1000) / 10}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="0.04"
                  step="0.004"
                  value={appState.handwriting.caretInsertionRate ?? 0.012}
                  onChange={(e) =>
                    setAppState((p) => ({
                      ...p,
                      handwriting: { ...p.handwriting, caretInsertionRate: parseFloat(e.target.value) },
                    }))
                  }
                  className="w-full accent-blue-500 h-1.5 bg-[#1f2536] rounded-lg cursor-pointer"
                />
                <div className="text-[10px] text-slate-400">
                  Simulates student corrections where forgotten words are inserted above a hand-drawn caret &apos;^&apos;.
                </div>
              </div>
            </div>
          </div>
        );
      })()}

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
                        spiralHoles: false,
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
                        spiralHoles: false,
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

            {/* Study Highlighter Marker Card */}
            <div className="bg-[#181d2a] p-3.5 rounded-xl border border-[#262d42] space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Highlighter className="w-4 h-4 text-amber-400" />
                  <div>
                    <span className="text-xs font-semibold text-slate-200">Study Highlighter Marker</span>
                    <div className="text-[10px] text-slate-400">Authentic chisel-tip translucent marker streak</div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {(['none', 'yellow', 'green', 'cyan', 'pink'] as const).map((m) => {
                    const isSelected = (appState.paper.highlighterMode ?? 'none') === m;
                    const bgClass =
                      m === 'none'
                        ? 'bg-[#11151f] text-slate-400 border-[#262d42]'
                        : m === 'yellow'
                        ? 'bg-yellow-400/90 text-yellow-950 border-yellow-300'
                        : m === 'green'
                        ? 'bg-emerald-400/90 text-emerald-950 border-emerald-300'
                        : m === 'cyan'
                        ? 'bg-sky-400/90 text-sky-950 border-sky-300'
                        : 'bg-pink-400/90 text-pink-950 border-pink-300';

                    return (
                      <button
                        key={m}
                        onClick={() =>
                          setAppState((p) => ({
                            ...p,
                            paper: { ...p.paper, highlighterMode: m },
                          }))
                        }
                        className={`px-2 py-1 rounded-md text-[11px] font-semibold border transition-all ${
                          isSelected ? 'ring-2 ring-blue-500 scale-105 shadow-sm' : 'opacity-70 hover:opacity-100'
                        } ${bgClass}`}
                      >
                        {m === 'none' ? 'Off' : m.charAt(0).toUpperCase() + m.slice(1)}
                      </button>
                    );
                  })}
                </div>
              </div>

              {appState.paper.highlighterMode && appState.paper.highlighterMode !== 'none' && (
                <div className="pt-2 border-t border-[#262d42] flex items-center justify-between text-xs animate-fade-in">
                  <span className="text-slate-400 text-[11px]">Marker Placement:</span>
                  <div className="flex gap-1.5">
                    {[
                      { id: 'boxed', label: 'Boxed Answers' },
                      { id: 'headings', label: 'Headings' },
                      { id: 'both', label: 'Both' },
                    ].map((target) => (
                      <button
                        key={target.id}
                        onClick={() =>
                          setAppState((p) => ({
                            ...p,
                            paper: { ...p.paper, highlighterTarget: target.id as any },
                          }))
                        }
                        className={`px-2.5 py-0.5 rounded text-[11px] border transition-colors ${
                          (appState.paper.highlighterTarget ?? 'both') === target.id
                            ? 'bg-blue-600 border-blue-500 text-white font-medium'
                            : 'bg-[#11151f] border-[#262d42] text-slate-300 hover:text-white'
                        }`}
                      >
                        {target.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Paper Warmth & Aging Slider */}
            <div className="bg-[#181d2a] p-3.5 rounded-xl border border-[#262d42] space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-slate-200">Paper Warmth &amp; Vintage Tone</span>
                  <div className="text-[10px] text-slate-400">Controls natural cellulose yellowing &amp; exam hall paper tint</div>
                </div>
                <span className="text-[11px] font-mono text-blue-400 font-semibold">
                  {Math.round((appState.paper.paperWarmth ?? 0.15) * 100)}%
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={appState.paper.paperWarmth ?? 0.15}
                onChange={(e) =>
                  setAppState((p) => ({
                    ...p,
                    paper: { ...p.paper, paperWarmth: parseFloat(e.target.value) },
                  }))
                }
                className="w-full accent-blue-500 h-1.5 bg-[#11151f] rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>Crisp White (0%)</span>
                <span>Warm Ivory (30%)</span>
                <span>Aged Exam Paper (100%)</span>
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
                <div className="pt-2 border-t border-[#262d42] space-y-2">
                  <div className="flex items-center justify-between pt-1 pb-1">
                    <span className="text-[11px] text-slate-300">Rough Work Instrument</span>
                    <div className="flex gap-1.5">
                      {[
                        { id: 'pen', label: 'Ballpoint Pen' },
                        { id: 'pencil', label: 'Graphite Pencil' },
                      ].map((inst) => (
                        <button
                          key={inst.id}
                          onClick={() =>
                            setAppState((p) => ({
                              ...p,
                              paper: { ...p.paper, roughWorkInstrument: inst.id as 'pen' | 'pencil' },
                            }))
                          }
                          className={`px-2.5 py-0.5 rounded text-[11px] border transition-colors ${
                            (appState.paper.roughWorkInstrument ?? 'pencil') === inst.id
                              ? 'bg-blue-600 border-blue-500 text-white font-medium'
                              : 'bg-[#11151f] border-[#262d42] text-slate-300 hover:text-white'
                          }`}
                        >
                          {inst.label}
                        </button>
                      ))}
                    </div>
                  </div>

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
                          customRoughWork: e.target.value.split('\n'),
                        },
                      }))
                    }
                    onBlur={(e) =>
                      setAppState((p) => ({
                        ...p,
                        paper: {
                          ...p.paper,
                          customRoughWork: e.target.value
                            .split('\n')
                            .map((l) => l.trim())
                            .filter((l) => l.length > 0),
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
                            pen: {
                              ...p.pen,
                              headingColorPreset: col.id as HeadingColorPreset,
                              headingColorHex: col.hex,
                            },
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
