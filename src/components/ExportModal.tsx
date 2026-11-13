import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2,
  FileText,
  Archive,
  X,
  Loader2,
  Play,
  Sparkles,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import opentype from 'opentype.js';
import { AppState, AllographLibrary } from '../types';
import { PageEngine, PageLayoutData, PAGE_WIDTH, PAGE_HEIGHT } from '../engine/pageEngine';
import { saveExportedFile } from '../lib/fileStorage';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  format: 'pdf' | 'zip';
  pagesData: PageLayoutData[];
  appState: AppState;
  currentFont: opentype.Font | null;
  pageEngine: PageEngine;
  allographs?: AllographLibrary;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  format,
  pagesData,
  appState,
  currentFont,
  pageEngine,
  allographs,
}) => {
  const isPDF = format === 'pdf';
  const defaultBaseName = appState.paper.assignmentTitle
    ? appState.paper.assignmentTitle.replace(/[^a-zA-Z0-9_-]/g, '_')
    : 'ScriptaMath_Assignment';

  const [fileName, setFileName] = useState(defaultBaseName);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<'idle' | 'processing' | 'complete' | 'error'>('idle');

  useEffect(() => {
    if (isOpen) {
      setFileName(defaultBaseName);
      setProgress(0);
      setStatus('idle');
    }
  }, [isOpen, defaultBaseName]);

  const getStatusMessage = () => {
    if (status === 'complete') return 'Your high-res document is ready!';
    if (status === 'error') return 'Export failed. Please try again.';
    if (status === 'idle') {
      return isPDF
        ? `Ready to bundle ${pagesData.length} page(s) into PDF`
        : `Ready to package ${pagesData.length} high-DPI PNGs into ZIP`;
    }

    if (progress < 30) return 'Rendering OpenType Bezier Meshes...';
    if (progress < 60) return 'Simulating Ink Pooling & Paper Pulp Textures...';
    if (progress < 85) return 'Applying CamScanner Filter & Perspective Tilt...';
    return 'Bundling High-DPI Output & Saving to Vault...';
  };

  const handleStartExport = async () => {
    if (!currentFont || pagesData.length === 0) return;

    setStatus('processing');
    setProgress(5);

    try {
      const renderedCanvases: HTMLCanvasElement[] = [];
      const totalPages = pagesData.length;

      for (let i = 0; i < totalPages; i++) {
        // Yield to browser animation frame for smooth UI progress
        await new Promise((resolve) => requestAnimationFrame(resolve));

        const offCanvas = document.createElement('canvas');
        offCanvas.width = PAGE_WIDTH;
        offCanvas.height = PAGE_HEIGHT;
        pageEngine.renderPage(offCanvas, pagesData[i], appState, currentFont, undefined, allographs);
        renderedCanvases.push(offCanvas);

        // Progress 10% to 75%
        const pageProgress = Math.round(10 + ((i + 1) / totalPages) * 65);
        setProgress(pageProgress);
      }

      setProgress(85);
      await new Promise((resolve) => setTimeout(resolve, 200));

      const cleanTitle = (fileName.trim() || 'ScriptaMath_Assignment').replace(/[^a-zA-Z0-9_-]/g, '_');
      let blob: Blob;

      if (isPDF) {
        blob = await pageEngine.exportToPDF(renderedCanvases, cleanTitle);
      } else {
        blob = await pageEngine.exportToZIP(renderedCanvases, cleanTitle);
      }

      // Release offscreen canvas backing stores to prevent retaining peak memory
      for (const c of renderedCanvases) {
        c.width = 0;
        c.height = 0;
      }
      renderedCanvases.length = 0;

      setProgress(95);

      // Auto-save to Local History Vault in IndexedDB
      if (blob && blob.size > 0) {
        try {
          await saveExportedFile(blob, `${cleanTitle}.${format}`, format);
        } catch (vaultErr) {
          console.warn('Failed to save to local vault:', vaultErr);
        }
      }

      setProgress(100);
      setStatus('complete');

      // Celebration confetti
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.7 },
        colors: ['#3b82f6', '#6366f1', '#10b981', '#f59e0b'],
      });
    } catch (err) {
      console.error('Export failed:', err);
      setStatus('error');
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={status === 'processing' ? undefined : onClose}
            className="absolute inset-0"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="bg-[#131722] border border-[#2a344d] rounded-2xl shadow-2xl max-w-md w-full relative flex flex-col overflow-hidden z-10"
          >
            {/* Header with macOS style dots */}
            <div className="p-5 border-b border-[#1f2536] bg-[#0f121a] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="flex gap-1.5 mr-1">
                  <div className="w-3 h-3 rounded-full bg-[#ef4444]" />
                  <div className="w-3 h-3 rounded-full bg-[#f59e0b]" />
                  <div className="w-3 h-3 rounded-full bg-[#10b981]" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white leading-tight">
                    {status === 'complete'
                      ? 'Export Complete!'
                      : isPDF
                      ? 'Export Multi-Page PDF'
                      : 'Export ZIP Archive'}
                  </h2>
                  <p className="text-[11px] text-slate-400 mt-0.5">{getStatusMessage()}</p>
                </div>
              </div>

              {status !== 'processing' && (
                <button
                  onClick={onClose}
                  className="p-2 text-slate-400 hover:text-white hover:bg-[#1a2133] rounded-lg transition-colors"
                >
                  <X size={18} />
                </button>
              )}
            </div>

            {/* Content Body */}
            <div className="p-6 bg-[#131722] flex flex-col items-center">
              {/* Circular Progress Ring */}
              <div className="relative w-28 h-28 my-2 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 128 128">
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="transparent"
                    className="text-[#1f2536]"
                  />
                  <motion.circle
                    cx="64"
                    cy="64"
                    r="56"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="transparent"
                    strokeDasharray="351.85"
                    strokeDashoffset={351.85 - (351.85 * progress) / 100}
                    className="text-blue-500"
                    strokeLinecap="round"
                    transition={{ ease: 'easeOut', duration: 0.3 }}
                  />
                </svg>

                <div className="absolute inset-0 flex items-center justify-center">
                  {status === 'complete' ? (
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                      <CheckCircle2 size={42} className="text-emerald-400" />
                    </motion.div>
                  ) : status === 'processing' ? (
                    <div className="flex flex-col items-center">
                      {isPDF ? (
                        <FileText size={28} className="text-blue-400" />
                      ) : (
                        <Archive size={28} className="text-amber-400" />
                      )}
                      <span className="text-xs font-mono font-bold text-white mt-1">
                        {progress}%
                      </span>
                    </div>
                  ) : status === 'idle' ? (
                    <div className="p-3 bg-[#181d2a] rounded-xl border border-[#262d42]">
                      {isPDF ? (
                        <FileText size={28} className="text-blue-400" />
                      ) : (
                        <Archive size={28} className="text-amber-400" />
                      )}
                    </div>
                  ) : (
                    <Loader2 size={32} className="text-rose-400 animate-spin" />
                  )}
                </div>
              </div>

              {/* Progress step / form */}
              <div className="w-full mt-4 space-y-4">
                {status === 'idle' || status === 'error' ? (
                  <>
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 block">
                        Output File Name
                      </label>
                      <div className="flex items-center gap-2 p-2.5 bg-[#0d1017] border border-[#262d42] rounded-xl focus-within:border-blue-500 transition-colors">
                        <input
                          type="text"
                          value={fileName}
                          onChange={(e) => setFileName(e.target.value)}
                          className="bg-transparent border-none focus:outline-none text-xs text-white font-medium flex-1"
                          placeholder="Assignment_Solution"
                        />
                        <span className="text-slate-500 text-xs font-mono font-bold">
                          .{format}
                        </span>
                      </div>
                    </div>

                    <div className="text-[11px] text-slate-400 flex items-center gap-1.5 bg-[#181d2a] p-2.5 rounded-lg border border-[#262d42]">
                      <Sparkles className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                      <span>
                        Includes all {pagesData.length} page(s) at 1240 × 1754 High-DPI resolution with IndexedDB backup.
                      </span>
                    </div>

                    <button
                      onClick={handleStartExport}
                      className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-lg shadow-blue-500/25 transition-all"
                    >
                      <Play size={14} className="fill-current" />
                      <span>Start High-Res Export</span>
                    </button>
                  </>
                ) : status === 'processing' ? (
                  <div className="text-center py-2 space-y-1">
                    <p className="text-xs font-semibold text-slate-200">{getStatusMessage()}</p>
                    <p className="text-[10px] text-slate-500">
                      Processing page {Math.min(pagesData.length, Math.ceil((progress / 100) * pagesData.length))} of {pagesData.length}...
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 pt-1">
                    <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                      <p className="text-xs font-semibold text-emerald-300">
                        Downloaded to your device &amp; saved in Vault!
                      </p>
                    </div>

                    <button
                      onClick={onClose}
                      className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-colors"
                    >
                      Done
                    </button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
