import React, { useState, useRef, useEffect } from 'react';
import { X, RotateCcw, Check, Sparkles, PenTool, Image, Download, Trash2 } from 'lucide-react';
import { AllographLibrary, CustomGlyphVariant } from '../types';

interface GlyphStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  allographs: AllographLibrary;
  onSaveAllographs: (allographs: AllographLibrary) => void;
}

const COMMON_STUDY_CHARS = ['a', 'e', 't', 's', 'x', 'y', 'n', 'r', 'o', 'd', '1', '2', '3', '=', '+', 'z'];

export const GlyphStudioModal: React.FC<GlyphStudioModalProps> = ({
  isOpen,
  onClose,
  allographs,
  onSaveAllographs,
}) => {
  const [selectedChar, setSelectedChar] = useState<string>('a');
  const [selectedVariantIdx, setSelectedVariantIdx] = useState<number>(0);
  const [currentLib, setCurrentLib] = useState<AllographLibrary>(allographs);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef<boolean>(false);
  const currentStrokesRef = useRef<Array<Array<[number, number, number]>>>([]);

  useEffect(() => {
    setCurrentLib(allographs);
  }, [allographs]);

  useEffect(() => {
    if (!isOpen) return;
    loadVariantToCanvas();
  }, [isOpen, selectedChar, selectedVariantIdx]);

  const loadVariantToCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw baseline & guide lines
    drawGuideLines(ctx, canvas.width, canvas.height);

    // Load existing strokes if any
    const variants = currentLib[selectedChar] || [];
    const variant = variants.find((v) => v.variantIndex === selectedVariantIdx);
    if (variant && variant.strokes) {
      currentStrokesRef.current = JSON.parse(JSON.stringify(variant.strokes));
      redrawAllStrokes(ctx, currentStrokesRef.current);
    } else {
      currentStrokesRef.current = [];
    }
  };

  const drawGuideLines = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    ctx.save();
    // Baseline at 75% height
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 1.2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(10, h * 0.75);
    ctx.lineTo(w - 10, h * 0.75);
    ctx.stroke();

    // Mean line (x-height) at 40% height
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 4]);
    ctx.beginPath();
    ctx.moveTo(10, h * 0.40);
    ctx.lineTo(w - 10, h * 0.40);
    ctx.stroke();

    ctx.restore();
  };

  const redrawAllStrokes = (
    ctx: CanvasRenderingContext2D,
    strokes: Array<Array<[number, number, number]>>
  ) => {
    ctx.save();
    ctx.strokeStyle = '#1b3b8c'; // Reynolds Blue ink
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (const stroke of strokes) {
      if (stroke.length === 0) continue;
      ctx.beginPath();
      ctx.moveTo(stroke[0][0], stroke[0][1]);
      for (let i = 1; i < stroke.length; i++) {
        ctx.lineTo(stroke[i][0], stroke[i][1]);
      }
      ctx.stroke();
    }
    ctx.restore();
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      canvas.setPointerCapture(e.pointerId);
    } catch {
      // ignore in environments without pointer capture
    }
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    isDrawingRef.current = true;
    currentStrokesRef.current.push([[x, y, 1.0]]);

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.strokeStyle = '#1b3b8c';
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x, y);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    const currentStroke = currentStrokesRef.current[currentStrokesRef.current.length - 1];
    if (currentStroke) {
      currentStroke.push([x, y, 1.0]);
    }

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.lineTo(x, y);
      ctx.stroke();
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isDrawingRef.current && canvasRef.current) {
      try {
        canvasRef.current.releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
    }
    isDrawingRef.current = false;
  };

  const handleClearCurrent = () => {
    currentStrokesRef.current = [];
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawGuideLines(ctx, canvas.width, canvas.height);
      }
    }
  };

  const handleSaveCurrentVariant = () => {
    const newLib = { ...currentLib };
    if (!newLib[selectedChar]) newLib[selectedChar] = [];

    if (currentStrokesRef.current.length === 0) {
      newLib[selectedChar] = newLib[selectedChar].filter(
        (v) => v.variantIndex !== selectedVariantIdx
      );
      if (newLib[selectedChar].length === 0) {
        delete newLib[selectedChar];
      }
      setCurrentLib(newLib);
      onSaveAllographs(newLib);
      return;
    }

    const existingIdx = newLib[selectedChar].findIndex((v) => v.variantIndex === selectedVariantIdx);
    const variantData: CustomGlyphVariant = {
      char: selectedChar,
      variantIndex: selectedVariantIdx,
      strokes: JSON.parse(JSON.stringify(currentStrokesRef.current)),
      width: 280,
      height: 280,
    };

    if (existingIdx >= 0) {
      newLib[selectedChar][existingIdx] = variantData;
    } else {
      newLib[selectedChar].push(variantData);
    }

    setCurrentLib(newLib);
    onSaveAllographs(newLib);

    // Auto-advance to next variant slot
    if (selectedVariantIdx < 4) {
      setSelectedVariantIdx(selectedVariantIdx + 1);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-[#131722] border border-[#262d42] rounded-xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1f2536] bg-[#0f121a]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
              <PenTool className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold flex items-center gap-2">
                Clone My Handwriting Studio
                <span className="text-xs bg-blue-600/20 text-blue-400 px-2 py-0.5 rounded border border-blue-500/30">
                  Multi-Variant Engine
                </span>
                <span className="text-[10px] bg-emerald-600/20 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/30 font-medium">
                  Vector Cursive + TTF Hybrid
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Draw 5 natural variants per character. Custom strokes automatically feed both OpenType font rendering and continuous vector-cursive splines!
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-[#1f2536] text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Character sidebar */}
          <div className="w-48 border-r border-[#1f2536] p-4 overflow-y-auto bg-[#0d1017]">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Select Character
            </div>
            <div className="grid grid-cols-3 gap-2">
              {COMMON_STUDY_CHARS.map((char) => {
                const count = (currentLib[char] || []).length;
                return (
                  <button
                    key={char}
                    onClick={() => {
                      setSelectedChar(char);
                      setSelectedVariantIdx(0);
                    }}
                    className={`flex flex-col items-center justify-center py-2 px-1 rounded-lg border text-sm font-mono transition-colors ${
                      selectedChar === char
                        ? 'bg-blue-600 border-blue-400 text-white shadow-sm'
                        : 'bg-[#181d2a] border-[#262d42] text-slate-300 hover:bg-[#1f2536]'
                    }`}
                  >
                    <span className="text-lg font-bold">{char}</span>
                    <span className="text-[10px] text-slate-400">{count}/5 slots</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Drawing & Variant Editor */}
          <div className="flex-1 p-6 flex flex-col gap-5 overflow-y-auto">
            {/* Variant Slots Bar (5 slots) */}
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                5 Natural Variants for character &apos;{selectedChar}&apos;
              </label>
              <div className="grid grid-cols-5 gap-3">
                {[0, 1, 2, 3, 4].map((vIdx) => {
                  const existing = (currentLib[selectedChar] || []).find((v) => v.variantIndex === vIdx);
                  const isCurrent = selectedVariantIdx === vIdx;
                  return (
                    <button
                      key={vIdx}
                      onClick={() => setSelectedVariantIdx(vIdx)}
                      className={`relative flex flex-col items-center p-3 rounded-lg border transition-all ${
                        isCurrent
                          ? 'border-blue-500 bg-blue-950/30 ring-2 ring-blue-500/30'
                          : 'border-[#262d42] bg-[#181d2a] hover:bg-[#1e2435]'
                      }`}
                    >
                      <span className="text-xs text-slate-400 mb-1">Variant #{vIdx + 1}</span>
                      <div className="w-12 h-12 flex items-center justify-center bg-[#0d1017] rounded border border-[#22293b]">
                        {existing && existing.strokes.length > 0 ? (
                          <span className="text-blue-400 font-bold text-xl">{selectedChar}</span>
                        ) : (
                          <span className="text-slate-600 text-xs italic">empty</span>
                        )}
                      </div>
                      {existing && (
                        <div className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-500" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* In-App Vector Stroke Pad */}
            <div className="flex flex-col items-center">
              <div className="relative bg-[#fcfbf8] rounded-xl border-2 border-slate-700 shadow-inner overflow-hidden cursor-crosshair">
                <canvas
                  ref={canvasRef}
                  width={280}
                  height={280}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerCancel={handlePointerUp}
                  className="touch-none"
                />
                <div className="absolute top-2 left-2 pointer-events-none text-[10px] text-slate-500 bg-white/80 px-2 py-0.5 rounded shadow-sm">
                  Draw &apos;{selectedChar}&apos; (Slot #{selectedVariantIdx + 1})
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-3 mt-4">
                <button
                  onClick={handleClearCurrent}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#2f384f] bg-[#181d2a] text-slate-300 hover:text-white hover:bg-[#202739] text-xs transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Clear Pad
                </button>
                <button
                  onClick={handleSaveCurrentVariant}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium shadow transition-colors"
                >
                  <Check className="w-4 h-4" />
                  Save Variant #{selectedVariantIdx + 1}
                </button>
              </div>
            </div>

            {/* Info Box */}
            <div className="bg-[#181d2a] border border-[#262d42] rounded-lg p-3 text-xs text-slate-300 flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-slate-200">How Anti-Clone Works:</span> When rendering, the mutator pairs your custom drawn allographs with our 3-Zone Topological Mesh Warper. If a character appears twice in a row (e.g. &apos;better&apos; or &apos;seen&apos;), the Markov transition engine enforces opposite elastic vectors!
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-[#1f2536] bg-[#0f121a] flex items-center justify-between">
          <div className="text-xs text-slate-400">
            Total custom variants saved: {Object.values(currentLib).reduce((acc, v) => acc + v.length, 0)}
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors"
          >
            Done & Apply
          </button>
        </div>
      </div>
    </div>
  );
};
