import React, { useState, useEffect, useMemo } from 'react';
import opentype from 'opentype.js';
import { AppState, AllographLibrary, CustomPersonaProfile } from './types';
import { SAMPLE_ASSIGNMENTS } from './data/samples';
import { HANDWRITING_PERSONAS } from './constants/personas';
import { loadFontById, loadFontFromArrayBuffer } from './engine/fontLoader';
import { PageEngine } from './engine/pageEngine';
import { Header } from './components/Header';
import { StudioControls } from './components/StudioControls';
import { CanvasPreview } from './components/CanvasPreview';
import { GlyphStudioModal } from './components/GlyphStudioModal';
import { StudentizerModal } from './components/StudentizerModal';
import { HistoryModal } from './components/HistoryModal';
import { StyleLabModal } from './components/StyleLabModal';

export const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(() => {
    const sampleParam = new URLSearchParams(window.location.search).get('sample');
    const initialSample = SAMPLE_ASSIGNMENTS.find((s) => s.id === sampleParam) || SAMPLE_ASSIGNMENTS[0];
    return {
      rawInput: initialSample.content,
      handwriting: {
        persona: 'chitesh-stem-notes',
        fontFamily: 'ChiteshHandwriting',
        fontSize: 27,
        slantAngle: 5.5,
        letterSpacing: 0.2,
        wordSpacing: 1.05,
        loopWarp: 0.55,
        ligatureRate: 0.50,
        flyingDotChaos: 0.45,
        sharedCrossbar: true,
        antiDuplication: true,
        intraWordVelocity: 0.55,
        marginSqueezeRate: 0.35,
        baselineWave: 0.42,
        marginWander: 0.45,
        handFatigue: 0.28,
        scratchOutRate: 0.0,
        randomSeed: 4242,
        circledQuestionLabels: false,
        answerBubbleStyle: 'box',
        showAnswerCheckmarks: false,
        tableLines: false,
        crossedZ: true,
      },
      pen: {
        bodyColorPreset: 'blue',
        bodyColorHex: '#182b5e', // Chitesh's deep CamScanner navy ink
        headingColorPreset: 'blue',
        headingColorHex: '#122046', // Solid deep navy heading
        penStyle: 'ballpoint',
        strokeWidth: 1.6,
        headingUnderline: 'single',
        drySkips: true,
        inkPooling: true,
      },
      paper: {
        template: 'unruled-bond', // Chitesh's blank unruled notebook
        scanFilter: 'camscanner', // Authentic CamScanner Magic Color with sensor grain & Hermite edge
        inkBleed: 0.03, // Subtle reverse-page ghosting
        shadowIntensity: 0.24, // Natural smartphone corner shadow & ambient illumination
        perspectiveTilt: 0.16, // Subtle camera perspective skew & page curl
        showPaperTexture: true, // Physical paper pulp fibers & micro-creases
        showMarginGuides: false, // No ruled lines, clean blank sheet
        roughWorkColumn: false, // No rough sidebar
        spiralHoles: true, // Authentic spiral notebook punch holes & coils
        studentName: 'Chitesh (25323015)',
        assignmentTitle: initialSample.title,
        dateStr: '03/11/2026',
        showCoffeeStain: false,
        marginAnnotation: 'Problem 3 (b) — Due Nov 14',
        customRoughWork: ['14 * 6 = 84', '84 - 23 = 61', '√61 ≈ 7.81'],
        showStickyNote: false,
        stickyNoteText: "Don't forget to submit before 5 PM!",
        highlighterMode: (new URLSearchParams(window.location.search).get('highlight') as any) || 'none',
        highlighterTarget: (new URLSearchParams(window.location.search).get('hlTarget') as any) || 'both',
        paperWarmth: parseFloat(new URLSearchParams(window.location.search).get('warmth') || '0.15'),
      },
      zoom: 0.72,
      currentPage: 0,
    };
  });

  const [currentFont, setCurrentFont] = useState<opentype.Font | null>(null);
  const [isGlyphStudioOpen, setIsGlyphStudioOpen] = useState(false);
  const [isStyleLabOpen, setIsStyleLabOpen] = useState(() => {
    return new URLSearchParams(window.location.search).get('modal') === 'stylelab';
  });
  const [isStudentizerOpen, setIsStudentizerOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [mobileView, setMobileView] = useState<'controls' | 'preview'>('controls');
  const [allographs, setAllographs] = useState<AllographLibrary>(() => {
    try {
      const saved = localStorage.getItem('scriptamath_allographs');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Page Engine instance
  const pageEngine = useMemo(() => {
    return new PageEngine(appState.handwriting.randomSeed);
  }, [appState.handwriting.randomSeed]);

  // Load font whenever fontFamily changes
  useEffect(() => {
    let isCancelled = false;
    loadFontById(appState.handwriting.fontFamily, appState.handwriting.customFontUrl)
      .then((font) => {
        if (!isCancelled) setCurrentFont(font);
      })
      .catch((err) => {
        console.error('Failed to load font:', err);
      });

    return () => {
      isCancelled = true;
    };
  }, [appState.handwriting.fontFamily, appState.handwriting.customFontUrl]);

  const handleCustomFontUpload = async (buffer: ArrayBuffer, name: string) => {
    try {
      const font = await loadFontFromArrayBuffer(buffer, name);
      setCurrentFont(font);
      setAppState((prev) => ({
        ...prev,
        handwriting: {
          ...prev.handwriting,
          fontFamily: name,
        },
      }));
    } catch (err) {
      console.error('Failed to parse uploaded font:', err);
      alert('Could not parse font file. Please provide a standard .ttf or .otf file.');
    }
  };

  const handleSaveAllographs = (newLib: AllographLibrary) => {
    setAllographs(newLib);
    try {
      localStorage.setItem('scriptamath_allographs', JSON.stringify(newLib));
    } catch (e) {
      console.error('Failed to save allographs to localStorage:', e);
    }
  };

  const handleApplyPersona = (profile: CustomPersonaProfile) => {
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

  const handleRegenerateSeed = () => {
    const newSeed = Math.floor(Math.random() * 900000 + 100000);
    setAppState((prev) => ({
      ...prev,
      handwriting: {
        ...prev.handwriting,
        randomSeed: newSeed,
      },
    }));
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#0c0e14] text-slate-100 font-sans">
      {/* Top Application Header */}
      <Header
        onOpenStudentizer={() => setIsStudentizerOpen(true)}
        onOpenHistory={() => setIsHistoryOpen(true)}
      />

      {/* Main Workspace (Left Studio Controls | Right Live Multi-Page Canvas Preview) */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        <div
          className={`w-full lg:w-[480px] xl:w-[520px] flex-shrink-0 h-full ${
            mobileView === 'controls' ? 'flex flex-col' : 'hidden lg:flex lg:flex-col'
          }`}
        >
          <StudioControls
            appState={appState}
            setAppState={setAppState}
            onOpenGlyphStudio={() => setIsGlyphStudioOpen(true)}
            onOpenStyleLab={() => setIsStyleLabOpen(true)}
            onCustomFontUpload={handleCustomFontUpload}
            onRegenerateSeed={handleRegenerateSeed}
            onOpenStudentizer={() => setIsStudentizerOpen(true)}
          />
        </div>

        <div
          className={`flex-1 h-full overflow-hidden ${
            mobileView === 'preview' ? 'flex flex-col' : 'hidden lg:flex lg:flex-col'
          }`}
        >
          <CanvasPreview
            appState={appState}
            setAppState={setAppState}
            currentFont={currentFont}
            pageEngine={pageEngine}
            onRegenerateSeed={handleRegenerateSeed}
          />
        </div>

        {/* Mobile View Toggle Switch (floating at bottom on mobile/tablet) */}
        <div className="lg:hidden absolute bottom-4 left-1/2 -translate-x-1/2 z-30 bg-[#131722]/95 backdrop-blur-md p-1 rounded-full border border-[#2a344d] shadow-2xl flex items-center gap-1">
          <button
            onClick={() => setMobileView('controls')}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
              mobileView === 'controls'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Studio Controls
          </button>
          <button
            onClick={() => setMobileView('preview')}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
              mobileView === 'preview'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Live Preview
          </button>
        </div>
      </div>

      {/* Style Lab Modal */}
      <StyleLabModal
        isOpen={isStyleLabOpen}
        onClose={() => setIsStyleLabOpen(false)}
        onApplyPersona={handleApplyPersona}
      />

      {/* Glyph Studio Modal */}
      <GlyphStudioModal
        isOpen={isGlyphStudioOpen}
        onClose={() => setIsGlyphStudioOpen(false)}
        allographs={allographs}
        onSaveAllographs={handleSaveAllographs}
      />

      {/* Zero-API AI Studentizer Bridge Modal */}
      <StudentizerModal
        isOpen={isStudentizerOpen}
        onClose={() => setIsStudentizerOpen(false)}
        appState={appState}
        setAppState={setAppState}
      />

      {/* Local IndexedDB History Vault Modal */}
      <HistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
      />
    </div>
  );
};

export default App;
