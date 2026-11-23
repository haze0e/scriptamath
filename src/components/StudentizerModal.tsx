import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Copy,
  Check,
  ExternalLink,
  X,
  Bot,
  Send,
  FileCode,
  Wand2,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { AppState } from '../types';
import { generateStudentizerPrompt, parseAIStudentizerResponse } from '../engine/aiParser';

interface StudentizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  appState: AppState;
  setAppState: React.Dispatch<React.SetStateAction<AppState>>;
}

export const StudentizerModal: React.FC<StudentizerModalProps> = ({
  isOpen,
  onClose,
  appState,
  setAppState,
}) => {
  const [activeTab, setActiveTab] = useState<'prompt' | 'paste'>('prompt');
  const [generatedPrompt, setGeneratedPrompt] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [aiResponseInput, setAiResponseInput] = useState<string>('');
  const [appliedSuccess, setAppliedSuccess] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      const prompt = generateStudentizerPrompt(appState.rawInput, appState.paper.assignmentTitle);
      setGeneratedPrompt(prompt);
      setCopied(false);
      setAppliedSuccess(false);
    }
  }, [isOpen, appState.rawInput, appState.paper.assignmentTitle]);

  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(generatedPrompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = generatedPrompt;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleApplyResponse = () => {
    if (!aiResponseInput.trim()) return;

    const parsed = parseAIStudentizerResponse(aiResponseInput);

    setAppState((prev) => ({
      ...prev,
      rawInput: parsed.mainWork || prev.rawInput,
      paper: {
        ...prev.paper,
        roughWorkColumn: parsed.roughWork.length > 0,
        customRoughWork:
          parsed.roughWork.length > 0 ? parsed.roughWork : prev.paper.customRoughWork,
        marginAnnotation: parsed.marginNote || prev.paper.marginAnnotation,
        assignmentTitle: parsed.title || prev.paper.assignmentTitle,
        dateStr: parsed.dateStr || prev.paper.dateStr,
      },
    }));

    confetti({
      particleCount: 90,
      spread: 70,
      origin: { y: 0.7 },
      colors: ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b'],
    });

    setAppliedSuccess(true);
    setTimeout(() => {
      setAppliedSuccess(false);
      onClose();
    }, 1200);
  };

  const sampleFillResponse = () => {
    const sample = `[METADATA]
Title: Harmonic Oscillator & Wave Motion
Date: 14/11/2026
MarginNote: Problem 4(c) — Midterm Review

[MAIN_WORK]
# Damped Harmonic Oscillator

Consider the second-order differential equation describing damped oscillations:
$$m \\frac{d^2 x}{dt^2} + b \\frac{dx}{dt} + kx = 0$$

Dividing through by the mass $m$:
$$\\frac{d^2 x}{dt^2} + 2\\gamma \\frac{dx}{dt} + \\omega_0^2 x = 0$$

where the damping parameter $\\gamma = \\frac{b}{2m}$ and undamped natural frequency $\\omega_0 = \\sqrt{\\frac{k}{m}}$.

Assuming a trial solution $x(t) = e^{\\lambda t}$, the auxiliary quadratic equation becomes:
$$\\lambda^2 + 2\\gamma\\lambda + \\omega_0^2 = 0$$

Applying the quadratic formula to solve for the characteristic roots:
$$\\lambda = -\\gamma \\pm \\sqrt{\\gamma^2 - \\omega_0^2}$$

For the underdamped regime where $\\omega_0 > \\gamma$, we define the damped frequency $\\omega_d = \\sqrt{\\omega_0^2 - \\gamma^2}$:
$$x(t) = A e^{-\\gamma t} \\cos(\\omega_d t + \\phi)$$

Applying the initial conditions $x(0) = x_0$ and $v(0) = 0$:
$$\\therefore x(t) = x_0 e^{-\\gamma t} \\left( \\cos(\\omega_d t) + \\frac{\\gamma}{\\omega_d} \\sin(\\omega_d t) \\right)$$

[ROUGH_WORK]
k/m = 160 / 2.5 = 64
w0 = √64 = 8.0 rad/s
b/(2m) = 3.2 / 5.0 = 0.64
w_d = √(64 - 0.41) ≈ 7.97
Check: e^(-0.64 * 0) = 1.0`;

    setAiResponseInput(sample);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0"
          />

          {/* Modal Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="bg-[#131722] border border-[#2a344d] rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden relative z-10"
          >
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-[#1f2536] bg-[#0f121a] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/25">
                  <Wand2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                      Zero-API AI Studentizer Bridge
                    </h2>
                    <span className="text-[10px] font-mono uppercase bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded border border-blue-500/30">
                      Gemini • ChatGPT • Claude
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Convert textbook notes into natural handwritten student voice &amp; scratch calculations
                  </p>
                </div>
              </div>

              <button
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-white hover:bg-[#1a2133] rounded-lg transition-colors"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Step Tabs Navigation */}
            <div className="flex border-b border-[#1f2536] bg-[#11141f] px-4 pt-2 shrink-0">
              <button
                onClick={() => setActiveTab('prompt')}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-colors border-t-2 ${
                  activeTab === 'prompt'
                    ? 'bg-[#131722] text-blue-400 border-blue-500 border-x border-[#1f2536]'
                    : 'text-slate-400 border-transparent hover:text-slate-200'
                }`}
              >
                <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-[10px] font-bold">
                  1
                </span>
                <span>Copy Tailored Prompt</span>
              </button>

              <button
                onClick={() => setActiveTab('paste')}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-colors border-t-2 ${
                  activeTab === 'paste'
                    ? 'bg-[#131722] text-blue-400 border-blue-500 border-x border-[#1f2536]'
                    : 'text-slate-400 border-transparent hover:text-slate-200'
                }`}
              >
                <span className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center text-[10px] font-bold">
                  2
                </span>
                <span>Paste &amp; Apply Response</span>
              </button>
            </div>

            {/* Tab Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {activeTab === 'prompt' ? (
                <div className="space-y-4">
                  {/* One-click launch buttons */}
                  <div className="bg-[#181d2a] p-3.5 rounded-xl border border-[#262d42] space-y-2">
                    <div className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                      <Bot className="w-4 h-4 text-blue-400" />
                      <span>Direct AI Model Launchers</span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Copy the prompt below, then open your favorite LLM. Paste the prompt, hit enter, and bring the answer back to Step 2!
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                      <a
                        href="https://gemini.google.com/app"
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-between px-3.5 py-2.5 rounded-lg bg-[#0e1626] hover:bg-[#142038] border border-blue-500/30 text-xs font-medium text-blue-300 transition-colors group"
                      >
                        <span className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                          Google Gemini
                        </span>
                        <ExternalLink className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                      </a>

                      <a
                        href="https://chatgpt.com"
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-between px-3.5 py-2.5 rounded-lg bg-[#0e211b] hover:bg-[#132c24] border border-emerald-500/30 text-xs font-medium text-emerald-300 transition-colors group"
                      >
                        <span className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-400" />
                          OpenAI ChatGPT
                        </span>
                        <ExternalLink className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                      </a>

                      <a
                        href="https://claude.ai"
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-between px-3.5 py-2.5 rounded-lg bg-[#241712] hover:bg-[#301f18] border border-amber-500/30 text-xs font-medium text-amber-300 transition-colors group"
                      >
                        <span className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-amber-400" />
                          Anthropic Claude
                        </span>
                        <ExternalLink className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                      </a>
                    </div>
                  </div>

                  {/* Prompt Text Box */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-slate-300">
                        Generated Studentizer Instruction Prompt
                      </label>
                      <button
                        onClick={handleCopyPrompt}
                        className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-colors"
                      >
                        {copied ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-300" />
                            <span>Copied to Clipboard!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy Prompt</span>
                          </>
                        )}
                      </button>
                    </div>

                    <div className="relative">
                      <textarea
                        readOnly
                        rows={11}
                        value={generatedPrompt}
                        className="w-full bg-[#0d1017] border border-[#262d42] rounded-xl p-3 text-xs font-mono text-slate-300 leading-relaxed resize-none focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      onClick={() => setActiveTab('paste')}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#181d2a] hover:bg-[#20273a] border border-[#2a344d] text-xs font-semibold text-slate-200 transition-colors"
                    >
                      <span>I copied it, go to Step 2</span>
                      <ArrowRight className="w-4 h-4 text-blue-400" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-xs font-semibold text-slate-300 block">
                        Paste the AI Response Here
                      </label>
                      <p className="text-[11px] text-slate-400">
                        ScriptaMath will automatically extract your main homework equations, metadata, and dynamic rough scratch calculations.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={sampleFillResponse}
                      className="text-xs text-blue-400 hover:text-blue-300 underline"
                    >
                      Fill Example Response
                    </button>
                  </div>

                  <textarea
                    rows={12}
                    placeholder="Paste the output containing [METADATA], [MAIN_WORK], and [ROUGH_WORK] here..."
                    value={aiResponseInput}
                    onChange={(e) => setAiResponseInput(e.target.value)}
                    className="w-full bg-[#0d1017] border border-[#262d42] rounded-xl p-3.5 text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500 leading-relaxed"
                  />

                  {/* Apply Button */}
                  <div className="flex items-center justify-between pt-2">
                    <button
                      onClick={() => setActiveTab('prompt')}
                      className="text-xs text-slate-400 hover:text-slate-200"
                    >
                      ← Back to Prompt
                    </button>

                    <button
                      onClick={handleApplyResponse}
                      disabled={!aiResponseInput.trim()}
                      className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-lg shadow-blue-500/25 transition-all disabled:opacity-40"
                    >
                      {appliedSuccess ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                          <span>Applied Successfully!</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 text-amber-300" />
                          <span>Apply to Handwritten Canvas ✨</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
