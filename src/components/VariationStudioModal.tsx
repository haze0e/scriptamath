import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Sparkles,
  Check,
  RotateCcw,
  Sliders,
  Compass,
  Layers,
  Loader2,
  Maximize2,
  Dice5,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import opentype from 'opentype.js';
import { AppState, HandwritingStyleSettings, PenSettings } from '../types';
import { HANDWRITING_PERSONAS } from '../constants/personas';
import { PageEngine, PAGE_WIDTH, PAGE_HEIGHT } from '../engine/pageEngine';
import { parseRawAIOutput } from '../engine/formatter';
import { loadFontById } from '../engine/fontLoader';

interface VariationCandidate {
  id: string;
  name: string;
  subtitle: string;
  badge: string;
  fontFamily: string;
  slantAngle: number;
  humanVariance: number;
  seedOffset: number;
  penColorHex: string;
  penStyle: 'ballpoint' | 'gel' | 'fountain';
  handwritingOverrides: Partial<HandwritingStyleSettings>;
  penOverrides: Partial<PenSettings>;
}

const CANDIDATES: VariationCandidate[] = [
  {
    id: 'chitesh-calibrated',
    name: "Chitesh's STEM Derivation",
    subtitle: "Authentic 5.5° tilt, crossbarred 'ƶ', math cursive 'x', circled indices",
    badge: 'STEM Engineered',
    fontFamily: 'ChiteshHandwriting',
    slantAngle: 5.5,
    humanVariance: 4.8,
    seedOffset: 101,
    penColorHex: '#182b5e',
    penStyle: 'ballpoint',
    handwritingOverrides: {
      persona: 'chitesh-stem-notes',
      fontFamily: 'ChiteshHandwriting',
      slantAngle: 5.5,
      loopWarp: 0.52,
      ligatureRate: 0.50,
      baselineWave: 0.40,
      marginWander: 0.42,
      handFatigue: 0.28,
      crossedZ: true,
      answerBubbleStyle: 'box',
      showAnswerCheckmarks: false,
      tableLines: false,
    },
    penOverrides: {
      bodyColorHex: '#182b5e',
      headingColorHex: '#122046',
      penStyle: 'ballpoint',
      strokeWidth: 1.6,
      headingUnderline: 'single',
    },
  },
  {
    id: 'boy-stem-cursive',
    name: "Hurried Collegiate Cursive",
    subtitle: 'Dynamic 16° forward slant, rapid air-drag ligatures & sweeping crossbars',
    badge: 'Speed Cursive',
    fontFamily: 'Caveat',
    slantAngle: 16.0,
    humanVariance: 6.8,
    seedOffset: 202,
    penColorHex: '#1e3a8a',
    penStyle: 'ballpoint',
    handwritingOverrides: {
      persona: 'boy-stem-cursive',
      fontFamily: 'Caveat',
      slantAngle: 16.0,
      loopWarp: 0.55,
      ligatureRate: 0.75,
      baselineWave: 0.44,
      marginWander: 0.48,
      handFatigue: 0.38,
      scratchOutRate: 0.006,
      crossedZ: true,
      answerBubbleStyle: 'box',
      showAnswerCheckmarks: false,
      tableLines: false,
    },
    penOverrides: {
      bodyColorHex: '#1e3a8a',
      headingColorHex: '#b91c1c',
      penStyle: 'ballpoint',
      strokeWidth: 1.6,
      headingUnderline: 'single',
    },
  },
  {
    id: 'girl-neat-college',
    name: 'Aesthetic Rounded College Notes',
    subtitle: 'Gentle 4° tilt, open rounded loops (e, o, a), oval pill bubbles & checkmarks',
    badge: 'Neat & Structured',
    fontFamily: 'Kalam',
    slantAngle: 4.0,
    humanVariance: 3.8,
    seedOffset: 303,
    penColorHex: '#1d4ed8',
    penStyle: 'gel',
    handwritingOverrides: {
      persona: 'girl-neat-cursive',
      fontFamily: 'Kalam',
      slantAngle: 4.0,
      loopWarp: 0.28,
      ligatureRate: 0.42,
      baselineWave: 0.22,
      marginWander: 0.25,
      handFatigue: 0.16,
      crossedZ: false,
      answerBubbleStyle: 'oval',
      showAnswerCheckmarks: true,
      tableLines: false,
    },
    penOverrides: {
      bodyColorHex: '#1d4ed8',
      headingColorHex: '#991b1b',
      penStyle: 'gel',
      strokeWidth: 1.75,
      headingUnderline: 'double',
    },
  },
  {
    id: 'exam-speed-cram',
    name: 'Timed Exam Speed Derivation',
    subtitle: 'Fine-nib speed derivations, organic margin squeeze, drift & scratch-outs',
    badge: 'Exam Hall Realism',
    fontFamily: 'NanumPenScript',
    slantAngle: 18.5,
    humanVariance: 8.5,
    seedOffset: 404,
    penColorHex: '#1e293b',
    penStyle: 'ballpoint',
    handwritingOverrides: {
      persona: 'exam-prep-rushed',
      fontFamily: 'NanumPenScript',
      slantAngle: 18.5,
      loopWarp: 0.62,
      ligatureRate: 0.78,
      baselineWave: 0.52,
      marginWander: 0.58,
      handFatigue: 0.48,
      scratchOutRate: 0.012,
      crossedZ: true,
      answerBubbleStyle: 'box',
      showAnswerCheckmarks: false,
      tableLines: false,
    },
    penOverrides: {
      bodyColorHex: '#1e293b',
      headingColorHex: '#1e40af',
      penStyle: 'ballpoint',
      strokeWidth: 1.45,
      headingUnderline: 'single',
    },
  },
];

interface VariationStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  appState: AppState;
  currentPageIdx: number;
  onAdoptVariation: (overrides: {
    handwriting: Partial<HandwritingStyleSettings>;
    pen: Partial<PenSettings>;
    randomSeed: number;
  }) => void;
}

export const VariationStudioModal: React.FC<VariationStudioModalProps> = ({
  isOpen,
  onClose,
  appState,
  currentPageIdx,
  onAdoptVariation,
}) => {
  const [renderedPreviews, setRenderedPreviews] = useState<{ [id: string]: string }>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
  const [enlargedCandidate, setEnlargedCandidate] = useState<string | null>(null);
  const isCancelledRef = useRef(false);

  // Generate 4 multi-sample candidate previews when opened
  useEffect(() => {
    if (!isOpen) {
      setRenderedPreviews({});
      setSelectedCandidateId(null);
      setEnlargedCandidate(null);
      return;
    }

    isCancelledRef.current = false;
    setIsGenerating(true);

    const generateAll = async () => {
      const blocks = parseRawAIOutput(appState.rawInput);

      await Promise.all(
        CANDIDATES.map(async (candidate) => {
          if (isCancelledRef.current) return;

          try {
            const candidateSeed = (appState.handwriting.randomSeed + candidate.seedOffset) % 1000000;
            const candidateEngine = new PageEngine(candidateSeed);

            // Build synthetic state for this candidate
            const candidateState: AppState = {
              ...appState,
              handwriting: {
                ...appState.handwriting,
                ...candidate.handwritingOverrides,
                randomSeed: candidateSeed,
              },
              pen: {
                ...appState.pen,
                ...candidate.penOverrides,
              },
            };

            // Load font (cached)
            const font = await loadFontById(candidate.fontFamily);
            const paginated = candidateEngine.paginate(blocks);
            const pageData = paginated[Math.min(currentPageIdx, paginated.length - 1)];

            if (pageData && font && !isCancelledRef.current) {
              const canvas = document.createElement('canvas');
              canvas.width = PAGE_WIDTH;
              canvas.height = PAGE_HEIGHT;
              candidateEngine.renderPage(canvas, pageData, candidateState, font);

              const previewUrl = canvas.toDataURL('image/jpeg', 0.82);
              if (!isCancelledRef.current) {
                setRenderedPreviews((prev) => ({ ...prev, [candidate.id]: previewUrl }));
              }
            }
          } catch (err) {
            console.warn(`Failed to render candidate ${candidate.id}:`, err);
          }
        })
      );

      if (!isCancelledRef.current) {
        setIsGenerating(false);
      }
    };

    generateAll();

    return () => {
      isCancelledRef.current = true;
    };
  }, [isOpen, appState.rawInput, appState.handwriting.randomSeed, currentPageIdx]);

  const handleAdopt = (candidate: VariationCandidate) => {
    const candidateSeed = (appState.handwriting.randomSeed + candidate.seedOffset) % 1000000;
    onAdoptVariation({
      handwriting: {
        ...candidate.handwritingOverrides,
        randomSeed: candidateSeed,
      },
      pen: candidate.penOverrides,
      randomSeed: candidateSeed,
    });

    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#3b82f6', '#6366f1', '#10b981', '#f59e0b'],
    });

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="bg-[#0f131d] border border-[#222a3d] rounded-2xl w-full max-w-6xl overflow-hidden shadow-2xl flex flex-col max-h-[94vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1f2638] bg-[#141926]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md">
              <Dice5 className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-white flex items-center gap-2">
                <span>Multi-Sample Variation Studio</span>
                <span className="text-[10px] bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full font-mono border border-blue-500/30">
                  Top-K Sampling (Page {currentPageIdx + 1})
                </span>
              </div>
              <div className="text-xs text-slate-400">
                Compare 4 distinct human handwriting realizations of this exact derivation side-by-side. 1-click to adopt your favorite!
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isGenerating && (
              <div className="flex items-center gap-1.5 px-3 py-1 bg-blue-950/40 border border-blue-500/30 rounded-lg text-xs text-blue-300 font-mono">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400" />
                <span>Synthesizing candidate variations...</span>
              </div>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#1f2638] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Candidate Cards Grid */}
        <div className="p-6 overflow-y-auto flex-1 bg-[#0b0e14]">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {CANDIDATES.map((candidate) => {
              const preview = renderedPreviews[candidate.id];
              const isSelected = selectedCandidateId === candidate.id;

              return (
                <div
                  key={candidate.id}
                  className={`flex flex-col bg-[#131722] border rounded-xl overflow-hidden transition-all shadow-lg group hover:border-blue-500/60 ${
                    isSelected ? 'border-blue-500 ring-2 ring-blue-500/50' : 'border-[#222a3d]'
                  }`}
                >
                  {/* Card Title & Archetype Badge */}
                  <div className="p-3 border-b border-[#1f2638] bg-[#161c2b] flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-white line-clamp-1">{candidate.name}</span>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                        {candidate.fontFamily} · {candidate.slantAngle > 0 ? `+${candidate.slantAngle}°` : `${candidate.slantAngle}°`} slant
                      </div>
                    </div>
                    <span className="text-[9px] bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded font-mono border border-blue-500/30">
                      {candidate.badge}
                    </span>
                  </div>

                  {/* Thumbnail Preview Area */}
                  <div className="relative aspect-[1/1.414] bg-[#080a0e] flex items-center justify-center overflow-hidden group/thumb">
                    {preview ? (
                      <>
                        <img
                          src={preview}
                          alt={candidate.name}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover/thumb:scale-[1.03]"
                        />
                        <button
                          onClick={() => setEnlargedCandidate(candidate.id)}
                          className="absolute bottom-2 right-2 p-1.5 rounded-lg bg-black/70 hover:bg-black/90 text-white backdrop-blur-sm opacity-0 group-hover/thumb:opacity-100 transition-opacity border border-white/20"
                          title="Enlarge preview"
                        >
                          <Maximize2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-slate-500 text-xs font-mono">
                        <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
                        <span>Rendering styles...</span>
                      </div>
                    )}
                  </div>

                  {/* Metrics & Parameters */}
                  <div className="p-3 bg-[#11151f] border-t border-[#1f2638] space-y-2 flex-1 flex flex-col justify-between">
                    <div className="grid grid-cols-2 gap-1.5 text-[10px] text-slate-400">
                      <div className="bg-[#0b0e14] p-1.5 rounded border border-[#1e2536]">
                        <span className="block text-slate-500">Nib Thickness</span>
                        <span className="font-mono text-slate-200 font-semibold">
                          {candidate.penOverrides.strokeWidth} px ({candidate.penStyle})
                        </span>
                      </div>
                      <div className="bg-[#0b0e14] p-1.5 rounded border border-[#1e2536]">
                        <span className="block text-slate-500">Variance Level</span>
                        <span className="font-mono text-blue-400 font-semibold">
                          {candidate.humanVariance} / 10
                        </span>
                      </div>
                    </div>

                    <p className="text-[10px] text-slate-400 line-clamp-2">
                      {candidate.subtitle}
                    </p>

                    <button
                      onClick={() => handleAdopt(candidate)}
                      disabled={!preview}
                      className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-40 text-xs font-semibold text-white shadow-md transition-all mt-1"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>✦ Adopt This Variation</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-[#1f2638] bg-[#141926] flex items-center justify-between text-xs text-slate-400">
          <span>Click &apos;Adopt&apos; on any card to immediately apply that style, font, and seed to your active document.</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-[#1f2638] transition-colors"
          >
            Close
          </button>
        </div>
      </div>

      {/* Enlarged Lightbox Modal */}
      {enlargedCandidate && (
        <div
          className="fixed inset-0 z-60 bg-black/90 backdrop-blur-lg flex items-center justify-center p-6 animate-fade-in"
          onClick={() => setEnlargedCandidate(null)}
        >
          <div className="relative max-w-3xl max-h-[92vh] flex flex-col items-center">
            <button
              onClick={() => setEnlargedCandidate(null)}
              className="absolute -top-10 right-0 text-white/80 hover:text-white p-1"
            >
              <X className="w-6 h-6" />
            </button>
            <img
              src={renderedPreviews[enlargedCandidate]}
              alt="Enlarged variation"
              className="max-h-[85vh] w-auto rounded-xl shadow-2xl border border-white/20"
            />
          </div>
        </div>
      )}
    </div>
  );
};
