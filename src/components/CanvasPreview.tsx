import React, { useRef, useEffect, useState } from 'react';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  Download,
  FileDown,
  RotateCcw,
  Sparkles,
  Layers,
  CheckCircle2,
  Loader2,
  Archive,
  Dice5,
  Copy,
  Check,
  Code,
  Play,
  Pause,
  Square,
  FastForward,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import opentype from 'opentype.js';
import { AppState, HandwritingStyleSettings, PenSettings } from '../types';
import { parseRawAIOutput } from '../engine/formatter';
import { PageEngine, PageLayoutData, PAGE_WIDTH, PAGE_HEIGHT } from '../engine/pageEngine';
import { ExportModal } from './ExportModal';
import { VariationStudioModal } from './VariationStudioModal';

interface CanvasPreviewProps {
  appState: AppState;
  setAppState: React.Dispatch<React.SetStateAction<AppState>>;
  currentFont: opentype.Font | null;
  pageEngine: PageEngine;
  onRegenerateSeed: () => void;
}

export const CanvasPreview: React.FC<CanvasPreviewProps> = ({
  appState,
  setAppState,
  currentFont,
  pageEngine,
  onRegenerateSeed,
}) => {
  const [pagesData, setPagesData] = useState<PageLayoutData[]>([]);
  const [currentPageIdx, setCurrentPageIdx] = useState<number>(() => {
    const p = new URLSearchParams(window.location.search).get('page');
    return p ? Math.max(0, parseInt(p, 10) - 1) : 0;
  });
  const [exportModalFormat, setExportModalFormat] = useState<'pdf' | 'zip' | null>(null);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [isRendering, setIsRendering] = useState<boolean>(false);
  const [exportSuccess, setExportSuccess] = useState<boolean>(false);
  const [isVariationStudioOpen, setIsVariationStudioOpen] = useState<boolean>(() => {
    return new URLSearchParams(window.location.search).get('modal') === 'variations';
  });
  const [copySuccess, setCopySuccess] = useState<boolean>(false);
  const [isReplaying, setIsReplaying] = useState<boolean>(() => {
    return new URLSearchParams(window.location.search).get('replay') === '1';
  });
  const [replayBlockCount, setReplayBlockCount] = useState<number>(() => {
    const b = new URLSearchParams(window.location.search).get('replayBlock');
    return b ? parseInt(b, 10) : 0;
  });
  const [replayPaused, setReplayPaused] = useState<boolean>(false);
  const [replaySpeed, setReplaySpeed] = useState<number>(1);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Parse blocks and paginate whenever raw input or relevant settings change
  useEffect(() => {
    const blocks = parseRawAIOutput(appState.rawInput);
    const paginated = pageEngine.paginate(blocks);
    setPagesData(paginated);

    if (paginated.length > 0) {
      const p = new URLSearchParams(window.location.search).get('page');
      if (p) {
        const targetPage = Math.max(0, Math.min(paginated.length - 1, parseInt(p, 10) - 1));
        setCurrentPageIdx(targetPage);
      } else {
        setCurrentPageIdx((prev) => Math.min(prev, paginated.length - 1));
      }
    }
  }, [appState.rawInput, appState.handwriting.fontSize, appState.handwriting.randomSeed]);

  // Global keyboard shortcuts for smoother document navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
          e.preventDefault();
          onRegenerateSeed();
        }
        return;
      }

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setCurrentPageIdx((p) => Math.max(0, p - 1));
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setCurrentPageIdx((p) => Math.min(pagesData.length - 1, p + 1));
      } else if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        setAppState((p) => ({ ...p, zoom: Math.min(2.0, p.zoom + 0.1) }));
      } else if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        setAppState((p) => ({ ...p, zoom: Math.max(0.4, p.zoom - 0.1) }));
      } else if (e.key === '0') {
        e.preventDefault();
        setAppState((p) => ({ ...p, zoom: 0.72 }));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pagesData.length, onRegenerateSeed, setAppState]);

  // Render current page onto canvas (when not in replay mode)
  useEffect(() => {
    if (!currentFont || pagesData.length === 0) return;
    if (isReplaying) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    setIsRendering(true);

    const pageData = pagesData[currentPageIdx] || pagesData[0];
    pageEngine.renderPage(canvas, pageData, appState, currentFont);
    setIsRendering(false);
  }, [
    currentPageIdx,
    pagesData,
    currentFont,
    appState.handwriting,
    appState.pen,
    appState.paper,
    appState.handwriting.randomSeed,
    isReplaying,
  ]);

  // Live Replay handwriting animation loop
  useEffect(() => {
    if (!isReplaying || !currentFont || pagesData.length === 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const pageData = pagesData[currentPageIdx] || pagesData[0];
    const totalBlocks = pageData.blocks.length;

    // Render up to replayBlockCount
    pageEngine.renderPage(canvas, pageData, appState, currentFont, replayBlockCount);

    if (replayPaused) return;

    const stepDelay = Math.max(90, Math.floor(450 / replaySpeed));
    const timer = setTimeout(() => {
      if (replayBlockCount < totalBlocks) {
        setReplayBlockCount((prev) => prev + 1);
      } else {
        // Complete replay
        setIsReplaying(false);
        confetti({
          particleCount: 60,
          spread: 60,
          origin: { y: 0.7 },
        });
      }
    }, stepDelay);

    return () => clearTimeout(timer);
  }, [isReplaying, replayBlockCount, replayPaused, replaySpeed, currentFont, currentPageIdx, pagesData, appState, pageEngine]);

  // Automated batch rendering bridge for inspection & verification
  useEffect(() => {
    if (!currentFont || pagesData.length === 0) return;
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('autoSave') === '1') {
      (async () => {
        for (let i = 0; i < pagesData.length; i++) {
          const offCanvas = document.createElement('canvas');
          offCanvas.width = PAGE_WIDTH;
          offCanvas.height = PAGE_HEIGHT;
          pageEngine.renderPage(offCanvas, pagesData[i], appState, currentFont);
          const dataUrl = offCanvas.toDataURL('image/png');
          try {
            await fetch('http://localhost:9999/save', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ page: i + 1, total: pagesData.length, dataUrl }),
            });
          } catch (e) {
            console.error('AutoSave post failed for page', i + 1, e);
          }
        }
      })();
    }
  }, [currentFont, pagesData.length]);

  const handleZoomIn = () => {
    setAppState((p) => ({ ...p, zoom: Math.min(2.0, p.zoom + 0.15) }));
  };

  const handleZoomOut = () => {
    setAppState((p) => ({ ...p, zoom: Math.max(0.4, p.zoom - 0.15) }));
  };

  const handleResetZoom = () => {
    setAppState((p) => ({ ...p, zoom: 0.75 }));
  };

  const handleExportPDF = async () => {
    if (!currentFont || pagesData.length === 0) return;
    setIsExporting(true);

    try {
      // Offscreen render each page at 1240 x 1754
      const renderedCanvases: HTMLCanvasElement[] = [];

      for (let i = 0; i < pagesData.length; i++) {
        const offCanvas = document.createElement('canvas');
        offCanvas.width = PAGE_WIDTH;
        offCanvas.height = PAGE_HEIGHT;
        pageEngine.renderPage(offCanvas, pagesData[i], appState, currentFont);
        renderedCanvases.push(offCanvas);
      }

      await pageEngine.exportToPDF(
        renderedCanvases,
        appState.paper.assignmentTitle ? appState.paper.assignmentTitle.replace(/[^a-zA-Z0-9_-]/g, '_') : 'ScriptaMath_Assignment'
      );

      // Celebration confetti!
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.8 },
      });

      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 3500);
    } catch (err) {
      console.error('Failed to export PDF:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportCurrentPNG = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dataUrl = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `ScriptaMath_Page_${currentPageIdx + 1}.png`;
    a.click();
  };

  const handleCopyToClipboard = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob }),
        ]);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2200);
      }, 'image/png');
    } catch (err) {
      console.warn('Clipboard write failed:', err);
    }
  };

  const handleExportCurrentSVG = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dataUrl = canvas.toDataURL('image/png');
    const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}" width="${PAGE_WIDTH}px" height="${PAGE_HEIGHT}px">
  <title>ScriptaMath - Page ${currentPageIdx + 1}</title>
  <image width="${PAGE_WIDTH}" height="${PAGE_HEIGHT}" xlink:href="${dataUrl}"/>
</svg>`;

    const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ScriptaMath_Page_${currentPageIdx + 1}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleAdoptVariation = (overrides: {
    handwriting: Partial<HandwritingStyleSettings>;
    pen: Partial<PenSettings>;
    randomSeed: number;
  }) => {
    setAppState((prev) => ({
      ...prev,
      handwriting: {
        ...prev.handwriting,
        ...overrides.handwriting,
        randomSeed: overrides.randomSeed,
      },
      pen: {
        ...prev.pen,
        ...overrides.pen,
      },
    }));
  };

  return (
    <main className="flex-1 flex flex-col h-full bg-[#090b10] overflow-hidden relative">
      {/* Top Controls Toolbar */}
      <div className="h-14 border-b border-[#1f2536] bg-[#0c0e14] px-6 flex items-center justify-between shrink-0 shadow-sm z-10">
        {/* Left: Page Navigator */}
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-[#131722] border border-[#22293b] rounded-lg p-0.5">
            <button
              onClick={() => setCurrentPageIdx((p) => Math.max(0, p - 1))}
              disabled={currentPageIdx === 0}
              className="p-1.5 rounded-md text-slate-300 hover:text-white hover:bg-[#1a2133] disabled:opacity-30 disabled:hover:bg-transparent"
              title="Previous Page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="px-3 text-xs font-mono text-slate-300">
              Page <span className="text-blue-400 font-bold">{currentPageIdx + 1}</span> of{' '}
              <span>{Math.max(1, pagesData.length)}</span>
            </div>
            <button
              onClick={() => setCurrentPageIdx((p) => Math.min(pagesData.length - 1, p + 1))}
              disabled={currentPageIdx >= pagesData.length - 1}
              className="p-1.5 rounded-md text-slate-300 hover:text-white hover:bg-[#1a2133] disabled:opacity-30 disabled:hover:bg-transparent"
              title="Next Page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-300 bg-[#131722] px-2.5 py-1 rounded-lg border border-[#22293b]">
            <Layers className="w-3.5 h-3.5 text-blue-400" />
            <span className="font-medium">
              {appState.paper.template === 'unruled-bond'
                ? 'Unruled White Bond'
                : appState.paper.template === 'indian-ruled'
                ? 'Indian College Ruled'
                : appState.paper.template === 'engineering-graph'
                ? 'Engineering 5mm Graph'
                : 'University Exam Booklet'}
            </span>
          </div>

          {pagesData.length > 1 && pagesData.length <= 5 && (
            <div className="hidden xl:flex items-center gap-1 bg-[#131722] border border-[#22293b] rounded-lg p-0.5">
              {pagesData.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentPageIdx(idx)}
                  className={`px-2.5 py-1 text-xs rounded font-mono transition-colors ${
                    currentPageIdx === idx
                      ? 'bg-blue-600 text-white font-semibold'
                      : 'text-slate-400 hover:text-white hover:bg-[#1a2133]'
                  }`}
                >
                  Pg {idx + 1}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Center: Zoom Controls */}
        <div className="flex items-center gap-1 bg-[#131722] border border-[#22293b] rounded-lg p-0.5 text-xs">
          <button
            onClick={handleZoomOut}
            className="p-1.5 rounded-md text-slate-300 hover:text-white hover:bg-[#1a2133]"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="w-12 text-center font-mono text-slate-300">
            {Math.round(appState.zoom * 100)}%
          </span>
          <button
            onClick={handleZoomIn}
            className="p-1.5 rounded-md text-slate-300 hover:text-white hover:bg-[#1a2133]"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleResetZoom}
            className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-[#1a2133]"
            title="Fit to Width / Reset"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Right: Export & Seed Buttons */}
        <div className="flex items-center gap-2">
          {/* Compare Variations Modal Trigger */}
          <button
            onClick={() => setIsVariationStudioOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-purple-500/40 bg-gradient-to-r from-purple-950/50 via-indigo-950/40 to-blue-950/50 hover:from-purple-900/60 hover:to-blue-900/60 text-purple-200 hover:text-white text-xs font-semibold shadow-sm transition-all"
            title="Side-by-side Top-K handwriting diversity comparison grid"
          >
            <Dice5 className="w-3.5 h-3.5 text-purple-400" />
            <span className="hidden sm:inline">Compare</span> Styles
          </button>

          {/* Live Handwriting Replay Button */}
          <button
            onClick={() => {
              if (isReplaying) {
                setIsReplaying(false);
              } else {
                setReplayBlockCount(0);
                setReplayPaused(false);
                setIsReplaying(true);
              }
            }}
            className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
              isReplaying
                ? 'border-emerald-500 bg-emerald-950/60 text-emerald-300'
                : 'border-[#262d42] bg-[#131722] hover:bg-[#1c2336] text-slate-300 hover:text-white'
            }`}
            title="Watch the derivation physically handwritten line-by-line onto the paper"
          >
            <Play className="w-3.5 h-3.5 text-emerald-400" />
            <span>{isReplaying ? 'Replaying...' : 'Replay'}</span>
          </button>

          <button
            onClick={onRegenerateSeed}
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#262d42] bg-[#131722] hover:bg-[#1c2336] text-slate-300 hover:text-white text-xs transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5 text-blue-400" />
            <span>Re-Randomize</span>
          </button>

          {/* Quick 1-Click Clipboard Copy */}
          <button
            onClick={handleCopyToClipboard}
            className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs transition-all ${
              copySuccess
                ? 'border-emerald-500 bg-emerald-950/60 text-emerald-300 font-semibold'
                : 'border-[#262d42] bg-[#131722] hover:bg-[#1c2336] text-slate-300 hover:text-white'
            }`}
            title="Copy Page Image directly to Clipboard for instant pasting"
          >
            {copySuccess ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-blue-400" />}
            <span>{copySuccess ? 'Copied!' : 'Copy'}</span>
          </button>

          <button
            onClick={handleExportCurrentPNG}
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#262d42] bg-[#131722] hover:bg-[#1c2336] text-slate-300 hover:text-white text-xs transition-colors"
            title="Download Current Page as PNG"
          >
            <Download className="w-3.5 h-3.5" />
            <span>PNG</span>
          </button>

          <button
            onClick={handleExportCurrentSVG}
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#262d42] bg-[#131722] hover:bg-[#1c2336] text-slate-300 hover:text-white text-xs transition-colors"
            title="Download Current Page as Vector SVG"
          >
            <Code className="w-3.5 h-3.5 text-blue-400" />
            <span>SVG</span>
          </button>

          <button
            onClick={() => setExportModalFormat('zip')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#262d42] bg-[#131722] hover:bg-[#1c2336] text-amber-300 hover:text-amber-200 text-xs font-medium transition-colors"
            title="Export Multi-Page High-DPI ZIP Archive"
          >
            <Archive className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Export</span> ZIP
          </button>

          <button
            onClick={() => setExportModalFormat('pdf')}
            className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/25 transition-all"
            title="Export Multi-Page PDF"
          >
            <FileDown className="w-3.5 h-3.5" />
            <span>Export PDF</span>
          </button>
        </div>
      </div>

      {/* Main Canvas Workspace Container */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto p-6 md:p-10 flex justify-center items-start relative bg-[#090b10]"
      >
        {/* Loading overlay during heavy renders */}
        {isRendering && (
          <div className="absolute top-12 right-12 z-20 bg-slate-900/80 border border-slate-700/60 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center gap-2 text-xs text-slate-300 shadow-lg">
            <Loader2 className="w-3 h-3 text-blue-400 animate-spin" />
            <span>Rendering Bezier mesh...</span>
          </div>
        )}

        {/* Floating Replay Controller Bar */}
        {isReplaying && (
          <div className="absolute top-6 left-1/2 -translate-x-1/2 z-30 bg-[#0e121c]/95 border border-[#2a344d] shadow-2xl backdrop-blur-md rounded-full px-4 py-2 flex items-center gap-3 animate-fade-in text-xs">
            <div className="flex items-center gap-2 pr-2 border-r border-[#262d42]">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-semibold text-slate-200">Writing Derivation...</span>
              <span className="font-mono text-blue-400 text-[11px]">
                {replayBlockCount} / {pagesData[currentPageIdx]?.blocks.length || 0}
              </span>
            </div>

            <button
              onClick={() => setReplayPaused(!replayPaused)}
              className="p-1 rounded-md text-slate-300 hover:text-white hover:bg-[#1a2133] transition-colors"
              title={replayPaused ? 'Resume writing' : 'Pause'}
            >
              {replayPaused ? <Play className="w-4 h-4 text-emerald-400" /> : <Pause className="w-4 h-4 text-amber-400" />}
            </button>

            <button
              onClick={() => setReplaySpeed((s) => (s === 1 ? 2 : s === 4 ? 1 : 4))}
              className="px-2 py-0.5 rounded bg-[#161c2b] border border-[#262d42] hover:bg-[#1f283d] text-[11px] font-mono font-bold text-blue-300"
              title="Toggle animation speed"
            >
              {replaySpeed}x
            </button>

            <button
              onClick={() => setIsReplaying(false)}
              className="p-1 rounded-md text-slate-400 hover:text-red-400 hover:bg-[#1a2133] transition-colors"
              title="Stop replay and show full page"
            >
              <Square className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Scaled Notebook Sheet Canvas with Precise Layout Bounds */}
        <div
          className={`relative shrink-0 transition-all duration-100 ease-out my-auto ${
            pagesData.length > 1 || currentPageIdx === 0 ? 'paper-stack' : 'shadow-2xl'
          }`}
          style={{
            width: `${Math.round(PAGE_WIDTH * appState.zoom)}px`,
            height: `${Math.round(PAGE_HEIGHT * appState.zoom)}px`,
          }}
        >
          <div
            className="origin-top-left transition-transform duration-100 ease-out rounded-sm shadow-2xl relative"
            style={{
              transform: `scale(${appState.zoom})`,
              width: `${PAGE_WIDTH}px`,
              height: `${PAGE_HEIGHT}px`,
            }}
          >
            <canvas
              ref={canvasRef}
              width={PAGE_WIDTH}
              height={PAGE_HEIGHT}
              className="w-full h-full rounded-sm block bg-white shadow-2xl"
            />

            {/* Sticky Note Overlay (Handwritten style) */}
            {appState.paper.showStickyNote && currentPageIdx === 0 && (
              <div
                className="absolute bottom-28 right-12 w-48 min-h-[140px] bg-yellow-200/95 text-amber-950 p-4 shadow-xl z-20 flex flex-col select-none rounded border border-yellow-300 pointer-events-none"
                style={{
                  transform: 'rotate(-2.5deg)',
                  boxShadow: '3px 8px 24px rgba(0,0,0,0.18)',
                }}
              >
                <div className="text-[10px] uppercase font-black tracking-widest text-yellow-800/60 mb-1">
                  Note:
                </div>
                <div className="text-sm font-semibold leading-snug">
                  {appState.paper.stickyNoteText || "Don't forget to submit before 5 PM!"}
                </div>
                <div className="absolute top-0 left-0 right-0 h-3 bg-yellow-300/40 rounded-t" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* High-Resolution Animated Export Progress Modal */}
      <ExportModal
        isOpen={exportModalFormat !== null}
        onClose={() => setExportModalFormat(null)}
        format={exportModalFormat || 'pdf'}
        pagesData={pagesData}
        appState={appState}
        currentFont={currentFont}
        pageEngine={pageEngine}
      />
      {/* Multi-Sample Variation Studio Modal */}
      <VariationStudioModal
        isOpen={isVariationStudioOpen}
        onClose={() => setIsVariationStudioOpen(false)}
        appState={appState}
        currentPageIdx={currentPageIdx}
        onAdoptVariation={handleAdoptVariation}
      />
    </main>
  );
};
