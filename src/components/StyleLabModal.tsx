import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  X,
  RotateCcw,
  Trash2,
  Sparkles,
  PenTool,
  Check,
  Compass,
  Activity,
  Layers,
  Sliders,
} from 'lucide-react';
import { CustomPersonaProfile, HandwritingPersona } from '../types';
import {
  RawStroke,
  StrokePoint,
  analyzeStrokes,
  createPersonaFromBiometrics,
  BiometricAnalysisResult,
} from '../engine/strokeBiometrics';
import { saveCustomPersona } from '../constants/personas';
import { BUILTIN_FONTS } from '../engine/fontLoader';

interface StyleLabModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyPersona: (profile: CustomPersonaProfile) => void;
}

const SAMPLE_PROMPTS = [
  'dy/dx = 2x + 1',
  'y = ∫ sin(x) dx',
  'lim x→0 (sin x)/x = 1',
  'f(x) = ax² + bx + c',
  'Euler: e^(iπ) + 1 = 0',
];

export const StyleLabModal: React.FC<StyleLabModalProps> = ({
  isOpen,
  onClose,
  onApplyPersona,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const isDrawingRef = useRef(false);
  const [strokes, setStrokes] = useState<RawStroke[]>([]);
  const currentStrokeRef = useRef<RawStroke>([]);
  const [activePrompt, setActivePrompt] = useState(SAMPLE_PROMPTS[0]);

  // Persona configuration
  const [personaName, setPersonaName] = useState('My Calibrated Hand');
  const [baseFont, setBaseFont] = useState('ChiteshHandwriting');
  const [inkColor, setInkColor] = useState('#182b5e');

  // Real-time analysis metrics
  const [metrics, setMetrics] = useState<BiometricAnalysisResult | null>(null);

  // Redraw all strokes on canvas
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.width / dpr;
    const height = canvas.height / dpr;

    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    // Draw subtle guide lines in CSS coordinate space
    ctx.strokeStyle = '#1e2638';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);

    const lineY = height * 0.65;
    ctx.beginPath();
    ctx.moveTo(30, lineY);
    ctx.lineTo(width - 30, lineY);
    ctx.stroke();

    ctx.strokeStyle = '#192030';
    const ascenderY = height * 0.35;
    ctx.beginPath();
    ctx.moveTo(30, ascenderY);
    ctx.lineTo(width - 30, ascenderY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Render strokes with smooth Bezier interpolation
    for (const stroke of strokes) {
      if (stroke.length < 2) continue;

      ctx.strokeStyle = inkColor;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      for (let i = 0; i < stroke.length - 1; i++) {
        const p1 = stroke[i];
        const p2 = stroke[i + 1];

        const pressure = p2.pressure ?? 0.5;
        ctx.lineWidth = Math.max(1.2, 1.2 + pressure * 2.2);

        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      }
    }
    ctx.restore();
  }, [strokes, inkColor]);

  // Initialize canvas dimensions ONLY when modal opens
  useEffect(() => {
    if (!isOpen) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    canvas.width = Math.max(1, Math.floor(rect.width * dpr));
    canvas.height = Math.max(1, Math.floor(rect.height * dpr));
    redrawCanvas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Redraw whenever strokes or inkColor change without reallocating canvas backing store
  useEffect(() => {
    if (!isOpen) return;
    redrawCanvas();
  }, [isOpen, redrawCanvas]);

  // Pointer event handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.setPointerCapture(e.pointerId);
    isDrawingRef.current = true;
    setIsDrawing(true);

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const t = performance.now();
    const pressure = e.pressure && e.pressure > 0 ? e.pressure : 0.5;

    currentStrokeRef.current = [{ x, y, t, pressure }];
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const t = performance.now();
    const pressure = e.pressure && e.pressure > 0 ? e.pressure : 0.5;

    const currentStroke = currentStrokeRef.current;
    if (currentStroke.length > 0) {
      const pLast = currentStroke[currentStroke.length - 1];
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const dpr = window.devicePixelRatio || 1;
        ctx.save();
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.strokeStyle = inkColor;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineWidth = Math.max(1.2, 1.2 + pressure * 2.2);
        ctx.beginPath();
        ctx.moveTo(pLast.x, pLast.y);
        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.restore();
      }
    }

    currentStroke.push({ x, y, t, pressure });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    setIsDrawing(false);

    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // Ignored if capture already released
    }

    const currentStroke = currentStrokeRef.current;
    if (currentStroke.length >= 2) {
      const updated = [...strokes, currentStroke];
      setStrokes(updated);
      const analyzed = analyzeStrokes(updated);
      setMetrics(analyzed);
    }
    currentStrokeRef.current = [];
  };

  const handleClear = () => {
    setStrokes([]);
    currentStrokeRef.current = [];
    setMetrics(null);
    redrawCanvas();
  };

  const handleUndo = () => {
    if (strokes.length === 0) return;
    const updated = strokes.slice(0, -1);
    setStrokes(updated);
    if (updated.length > 0) {
      setMetrics(analyzeStrokes(updated));
    } else {
      setMetrics(null);
    }
  };

  const handleSaveAndApply = () => {
    if (!metrics) return;

    const profile = createPersonaFromBiometrics(personaName, metrics, {
      baseFontFamily: baseFont,
      penStyle: 'ballpoint',
      inkColorHex: inkColor,
    });

    // Save to persistent storage
    saveCustomPersona(profile);

    // Apply immediately to notebook state
    onApplyPersona(profile);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="bg-[#111520] border border-[#222a3d] rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1f2638] bg-[#141926]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <PenTool className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-white flex items-center gap-2">
                <span>Handwriting Style Lab</span>
                <span className="text-[10px] bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full font-mono border border-blue-500/30">
                  Interactive Stroke Calibration
                </span>
              </div>
              <div className="text-xs text-slate-400">
                Write naturally below with mouse, trackpad, or stylus. We extract your slant, line weight, and baseline flow.
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#1f2638] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* Prompt Suggestions */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              Suggested sample to write:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {SAMPLE_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => setActivePrompt(prompt)}
                  className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
                    activePrompt === prompt
                      ? 'bg-blue-600/30 text-blue-300 border border-blue-500/50 font-mono'
                      : 'bg-[#181e2b] text-slate-400 hover:text-slate-200 border border-[#242c3f]'
                  }`}
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>

          {/* Interactive Drawing Pad */}
          <div className="relative rounded-xl border border-[#2a344d] bg-[#0c0f17] overflow-hidden shadow-inner">
            <div className="absolute top-3 left-3 text-[11px] text-slate-500 font-mono pointer-events-none select-none">
              Sample Prompt: <span className="text-blue-400 font-semibold">{activePrompt}</span>
            </div>

            <canvas
              ref={canvasRef}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              className="w-full h-[200px] cursor-crosshair touch-none"
              style={{ width: '100%', height: '200px' }}
            />

            {/* Bottom Floating Canvas Actions */}
            <div className="absolute bottom-2.5 right-3 flex items-center gap-2">
              <button
                onClick={handleUndo}
                disabled={strokes.length === 0}
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#181d2a]/90 hover:bg-[#202738] disabled:opacity-40 disabled:hover:bg-[#181d2a]/90 text-xs text-slate-300 border border-[#2a3349] transition-all"
                title="Undo last stroke"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Undo</span>
              </button>
              <button
                onClick={handleClear}
                disabled={strokes.length === 0}
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#181d2a]/90 hover:bg-[#202738] disabled:opacity-40 disabled:hover:bg-[#181d2a]/90 text-xs text-rose-300 border border-[#2a3349] transition-all"
                title="Clear canvas"
              >
                <Trash2 className="w-3 h-3" />
                <span>Clear</span>
              </button>
            </div>
          </div>

          {/* Real-time Biometrics HUD */}
          <div className="bg-[#141926] p-4 rounded-xl border border-[#222a3d] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-emerald-400" />
                Live Extracted Biometrics
              </span>
              {metrics ? (
                <span className="text-[11px] text-emerald-400 font-mono flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" />
                  Calibrated ({metrics.totalStrokes} strokes · {metrics.totalPoints} pts)
                </span>
              ) : (
                <span className="text-[11px] text-slate-400 font-mono">
                  Write above to calibrate
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {/* Slant Angle Metric */}
              <div className="bg-[#0e121c] p-2.5 rounded-lg border border-[#20273a]">
                <div className="text-[10px] text-slate-400 flex items-center justify-between">
                  <span>Downstroke Slant</span>
                  <Compass className="w-3 h-3 text-blue-400" />
                </div>
                <div className="text-base font-bold text-white font-mono mt-0.5">
                  {metrics ? `${metrics.slantAngle > 0 ? `+${metrics.slantAngle}°` : `${metrics.slantAngle}°`}` : '—'}
                </div>
                <div className="text-[9px] text-slate-400 mt-0.5">
                  {metrics ? (metrics.slantAngle > 10 ? 'High Cursive Tilt' : metrics.slantAngle > 4 ? 'Natural STEM' : 'Upright Print') : 'Awaiting strokes'}
                </div>
              </div>

              {/* Stroke Weight Metric */}
              <div className="bg-[#0e121c] p-2.5 rounded-lg border border-[#20273a]">
                <div className="text-[10px] text-slate-400 flex items-center justify-between">
                  <span>Stroke Weight</span>
                  <Sliders className="w-3 h-3 text-blue-400" />
                </div>
                <div className="text-base font-bold text-white font-mono mt-0.5">
                  {metrics ? `${metrics.strokeWidth} px` : '—'}
                </div>
                <div className="text-[9px] text-slate-400 mt-0.5">
                  {metrics ? (metrics.strokeWidth > 1.8 ? 'Bold Gel Nib' : 'Fine Ballpoint') : 'Awaiting strokes'}
                </div>
              </div>

              {/* Baseline Waviness */}
              <div className="bg-[#0e121c] p-2.5 rounded-lg border border-[#20273a]">
                <div className="text-[10px] text-slate-400 flex items-center justify-between">
                  <span>Baseline Wave</span>
                  <Activity className="w-3 h-3 text-blue-400" />
                </div>
                <div className="text-base font-bold text-white font-mono mt-0.5">
                  {metrics ? `${Math.round(metrics.baselineWave * 100)}%` : '—'}
                </div>
                <div className="text-[9px] text-slate-400 mt-0.5">
                  {metrics ? (metrics.baselineWave > 0.45 ? 'Organic Drift' : 'Tidy Alignment') : 'Awaiting strokes'}
                </div>
              </div>

              {/* Archetype Classification */}
              <div className="bg-[#0e121c] p-2.5 rounded-lg border border-[#20273a]">
                <div className="text-[10px] text-slate-400 flex items-center justify-between">
                  <span>Detected Archetype</span>
                  <Layers className="w-3 h-3 text-blue-400" />
                </div>
                <div className="text-xs font-bold text-blue-300 font-mono mt-1 truncate">
                  {metrics ? metrics.detectedStyleTag : '—'}
                </div>
                <div className="text-[9px] text-emerald-400 mt-0.5">
                  {metrics ? `${Math.round(metrics.confidence * 100)}% Match` : 'Awaiting strokes'}
                </div>
              </div>
            </div>
          </div>

          {/* Custom Persona Setup & Skeleton Match */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Persona Name</label>
              <input
                type="text"
                value={personaName}
                onChange={(e) => setPersonaName(e.target.value)}
                placeholder="e.g. My Fast Calculus Style"
                className="w-full bg-[#141926] border border-[#262f43] rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Base Glyph Skeleton</label>
              <select
                value={baseFont}
                onChange={(e) => setBaseFont(e.target.value)}
                className="w-full bg-[#141926] border border-[#262f43] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
              >
                {BUILTIN_FONTS.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name} ({f.category})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-[#1f2638] bg-[#141926] flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-[#1f2638] transition-colors"
          >
            Cancel
          </button>

          <button
            onClick={handleSaveAndApply}
            disabled={!metrics || strokes.length === 0}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold text-white shadow-lg shadow-blue-500/20 transition-all"
          >
            <Sparkles className="w-4 h-4" />
            <span>✦ Calibrate &amp; Apply Persona</span>
          </button>
        </div>
      </div>
    </div>
  );
};
