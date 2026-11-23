import React, { useState } from 'react';
import { PenTool, Sparkles, HelpCircle, FileText, CheckCircle2, X, Wand2, Clock, HardDrive } from 'lucide-react';

interface HeaderProps {
  onOpenStudentizer?: () => void;
  onOpenHistory?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenStudentizer, onOpenHistory }) => {
  const [showInfo, setShowInfo] = useState(false);

  return (
    <>
      <header className="h-14 bg-[#0c0e14] border-b border-[#1f2536] px-4 sm:px-6 flex items-center justify-between shrink-0 select-none z-20">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
            <PenTool className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base tracking-tight text-white flex items-center gap-1">
                Scripta<span className="text-blue-400">Math</span>
              </span>
              <span className="text-[10px] bg-blue-500/10 text-blue-400 font-semibold px-2 py-0.5 rounded border border-blue-500/20">
                v2.0 Biomechanical
              </span>
            </div>
            <p className="text-[10px] text-slate-400 hidden sm:block">
              AI-Output to Real Handwritten STEM Assignments &amp; Ruled Derivations
            </p>
          </div>
        </div>

        {/* Action Buttons & Badges */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* AI Studentizer Bridge Button */}
          {onOpenStudentizer && (
            <button
              onClick={onOpenStudentizer}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-purple-600/20 to-blue-600/20 hover:from-purple-600/30 hover:to-blue-600/30 border border-purple-500/40 text-xs font-semibold text-purple-200 hover:text-white shadow-sm transition-all"
              title="Open Zero-API AI Studentizer Bridge"
            >
              <Wand2 className="w-3.5 h-3.5 text-purple-400" />
              <span>AI Studentizer</span>
            </button>
          )}

          {/* Local Vault Button */}
          {onOpenHistory && (
            <button
              onClick={onOpenHistory}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#131722] hover:bg-[#1a2133] border border-[#22293b] text-xs text-slate-300 hover:text-white transition-colors"
              title="Open IndexedDB History Vault"
            >
              <Clock className="w-3.5 h-3.5 text-blue-400" />
              <span className="hidden sm:inline">Vault</span>
            </button>
          )}

          <div className="hidden xl:flex items-center gap-2 text-xs text-slate-400">
            <span className="flex items-center gap-1 bg-[#131722] px-2.5 py-1 rounded-full border border-[#22293b]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              2D Math AST
            </span>
            <span className="flex items-center gap-1 bg-[#131722] px-2.5 py-1 rounded-full border border-[#22293b]">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
              Topological Mesh Warping
            </span>
          </div>

          <button
            onClick={() => setShowInfo(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#131722] hover:bg-[#1a2133] border border-[#22293b] text-xs text-slate-300 hover:text-white transition-colors"
          >
            <HelpCircle className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden md:inline">How It Works</span>
          </button>
        </div>
      </header>

      {/* Info Modal */}
      {showInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-[#131722] border border-[#262d42] rounded-xl max-w-2xl w-full p-6 text-slate-200 shadow-2xl relative">
            <button
              onClick={() => setShowInfo(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-[#1f2536] text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5 mb-4">
              <Sparkles className="w-5 h-5 text-blue-400" />
              <h3 className="text-lg font-semibold text-white">
                How ScriptaMath Solves Fake Handwriting
              </h3>
            </div>

            <div className="space-y-3.5 text-xs text-slate-300 leading-relaxed">
              <div className="bg-[#181d2a] p-3 rounded-lg border border-[#262d42]">
                <div className="font-semibold text-blue-400 mb-1">
                  1. Real 2D Handwritten Math AST (No Flat Single-Line Math)
                </div>
                Parses fractions (a/b), roots (√x), integrals (∫), and boxed answers into spatial 2D structures with hand-drawn roughjs vinculums and imperfect equals signs.
              </div>

              <div className="bg-[#181d2a] p-3 rounded-lg border border-[#262d42]">
                <div className="font-semibold text-blue-400 mb-1">
                  2. Topological Glyph Deformation (No Flat `fillText()`)
                </div>
                Never stamps identical computer glyphs. Instead, opentype.js decomposes characters into Bezier paths and mutates ascenders, core loops, and descenders with 2D Simplex noise. Consecutive letters (e.g. &apos;better&apos;) trigger opposite elastic vectors.
              </div>

              <div className="bg-[#181d2a] p-3 rounded-lg border border-[#262d42]">
                <div className="font-semibold text-blue-400 mb-1">
                  3. Human Biomechanics &amp; Coarticulation Physics
                </div>
                Simulates initial-letter focus, mid-word acceleration, flying i/j tittles, shared double-tt crossbars, pseudo-cursive air-drag ligatures, and right-margin word squeezing.
              </div>

              <div className="bg-[#181d2a] p-3 rounded-lg border border-[#262d42]">
                <div className="font-semibold text-blue-400 mb-1">
                  4. Physical College Notebooks &amp; CamScanner Pipeline
                </div>
                Authentic Indian college ruled sheets, double red margins, date/page headers, ballpoint dry fiber skips, ink pooling, corner phone cast shadows, spine curl, and CamScanner &quot;Magic Color&quot; filter.
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setShowInfo(false)}
                className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors"
              >
                Got It, Let&apos;s Write!
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
