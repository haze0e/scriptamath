import opentype from 'opentype.js';

export interface LoadedFontInfo {
  id: string;
  name: string;
  font: opentype.Font;
}

export type FontCategory =
  | 'All'
  | "Boy's Cursive"
  | "Girl's Cursive"
  | 'STEM & Tech'
  | 'Fluid Cursive'
  | 'College Print'
  | 'Fast & Scratch';

export interface BuiltinFontInfo {
  id: string;
  name: string;
  category: 'STEM & Tech' | 'Fluid Cursive' | 'College Print' | 'Fast & Scratch';
  styleTag?: "Boy's Cursive" | "Girl's Cursive" | 'Neutral';
  description: string;
  url: string;
}

const fontCache: Map<string, opentype.Font> = new Map();

export const BUILTIN_FONTS: BuiltinFontInfo[] = [
  // User's Personal Custom TrueType Font
  {
    id: 'ChiteshHandwriting',
    name: "Chitesh's Handwriting (Custom TTF)",
    category: 'STEM & Tech',
    styleTag: "Boy's Cursive",
    description: 'Personal vectorized TrueType font extracted from your notes',
    url: '/fonts/ChiteshHandwriting.ttf',
  },

  // Curated Boy's Cursive / STEM / High-Speed
  { id: 'Caveat', name: 'Caveat', category: 'Fluid Cursive', styleTag: "Boy's Cursive", description: 'Fluid rapid student cursive (Boy archetype)', url: '/fonts/Caveat.ttf' },
  { id: 'NanumPenScript', name: 'Nanum Pen Script', category: 'Fast & Scratch', styleTag: "Boy's Cursive", description: 'Fine nib rapid derivations (Boy archetype)', url: '/fonts/NanumPenScript.ttf' },
  { id: 'NothingYouCouldDo', name: 'Nothing You Could Do', category: 'Fluid Cursive', styleTag: "Boy's Cursive", description: 'Fast rushed exam cursive (Boy archetype)', url: '/fonts/NothingYouCouldDo.ttf' },
  { id: 'ReenieBeanie', name: 'Reenie Beanie', category: 'Fast & Scratch', styleTag: "Boy's Cursive", description: 'Thin rapid ballpoint chicken-scratch', url: '/fonts/ReenieBeanie.ttf' },
  { id: 'JustAnotherHand', name: 'Just Another Hand', category: 'Fast & Scratch', styleTag: "Boy's Cursive", description: 'Narrow compressed hurried scribbles', url: '/fonts/JustAnotherHand.ttf' },
  { id: 'BadScript', name: 'Bad Script', category: 'Fluid Cursive', styleTag: "Boy's Cursive", description: 'Casual loose connected script', url: '/fonts/BadScript.ttf' },
  { id: 'WalterTurncoat', name: 'Walter Turncoat', category: 'Fast & Scratch', styleTag: "Boy's Cursive", description: 'Scratched exam cramming notes', url: '/fonts/WalterTurncoat.ttf' },
  { id: 'RockSalt', name: 'Rock Salt', category: 'Fast & Scratch', styleTag: "Boy's Cursive", description: 'Expressive quick felt notes', url: '/fonts/RockSalt.ttf' },
  { id: 'SwankyandMooMoo', name: 'Swanky and Moo Moo', category: 'Fast & Scratch', styleTag: "Boy's Cursive", description: 'Slanted casual scribble', url: '/fonts/SwankyandMooMoo.ttf' },

  // Curated Girl's Neat / Rounded College Cursive
  { id: 'Kalam', name: 'Kalam', category: 'STEM & Tech', styleTag: "Girl's Cursive", description: 'Indian college rounded ballpoint (Girl archetype)', url: '/fonts/Kalam.ttf' },
  { id: 'PatrickHand', name: 'Patrick Hand', category: 'College Print', styleTag: "Girl's Cursive", description: 'Neat rounded college notes (Girl archetype)', url: '/fonts/PatrickHand.ttf' },
  { id: 'ShadowsIntoLight', name: 'Shadows Into Light', category: 'College Print', styleTag: "Girl's Cursive", description: 'Clean delicate student handwriting', url: '/fonts/ShadowsIntoLight.ttf' },
  { id: 'MarckScript', name: 'Marck Script', category: 'Fluid Cursive', styleTag: "Girl's Cursive", description: 'Flowing graceful cursive script', url: '/fonts/MarckScript.ttf' },
  { id: 'GloriaHallelujah', name: 'Gloria Hallelujah', category: 'Fast & Scratch', styleTag: "Girl's Cursive", description: 'Youthful rounded friendly cursive', url: '/fonts/GloriaHallelujah.ttf' },
  { id: 'Sniglet', name: 'Sniglet', category: 'College Print', styleTag: "Girl's Cursive", description: 'Soft rounded aesthetic handwriting', url: '/fonts/Sniglet.ttf' },
  { id: 'Handlee', name: 'Handlee', category: 'College Print', styleTag: "Girl's Cursive", description: 'Balanced friendly everyday notes', url: '/fonts/Handlee.ttf' },
  { id: 'HomemadeApple', name: 'Homemade Apple', category: 'Fluid Cursive', styleTag: "Girl's Cursive", description: 'Loose organic cursive flourishes', url: '/fonts/HomemadeApple.ttf' },
  { id: 'BethEllen', name: 'Beth Ellen', category: 'Fluid Cursive', styleTag: "Girl's Cursive", description: 'Authentic classic cursive hand', url: '/fonts/BethEllen.ttf' },
  { id: 'Dekko', name: 'Dekko', category: 'STEM & Tech', styleTag: "Girl's Cursive", description: 'Clean rounded technical notes', url: '/fonts/Dekko.ttf' },
  { id: 'Pangolin', name: 'Pangolin', category: 'College Print', styleTag: "Girl's Cursive", description: 'Balanced friendly ballpoint', url: '/fonts/Pangolin.ttf' },

  // Technical STEM & Blueprint
  { id: 'ArchitectsDaughter', name: "Architect's Daughter", category: 'STEM & Tech', styleTag: 'Neutral', description: 'Engineering blueprint hand', url: '/fonts/ArchitectsDaughter.ttf' },
  { id: 'ShortStack', name: 'Short Stack', category: 'STEM & Tech', styleTag: 'Neutral', description: 'Precise geometric student print', url: '/fonts/ShortStack.ttf' },
  { id: 'Delius', name: 'Delius', category: 'STEM & Tech', styleTag: 'Neutral', description: 'High-legibility derivation print', url: '/fonts/Delius.ttf' },
  { id: 'AmaticSC', name: 'Amatic SC', category: 'STEM & Tech', styleTag: 'Neutral', description: 'Condensed all-caps blueprint hand', url: '/fonts/AmaticSC.ttf' },

  // Everyday Print & Notes
  { id: 'IndieFlower', name: 'Indie Flower', category: 'College Print', styleTag: 'Neutral', description: 'Casual easygoing print notes', url: '/fonts/IndieFlower.ttf' },
  { id: 'GochiHand', name: 'Gochi Hand', category: 'College Print', styleTag: 'Neutral', description: 'Youthful spontaneous print', url: '/fonts/GochiHand.ttf' },
  { id: 'Schoolbell', name: 'Schoolbell', category: 'College Print', styleTag: 'Neutral', description: 'Classic high school print', url: '/fonts/Schoolbell.ttf' },
  { id: 'CaveatBrush', name: 'Caveat Brush', category: 'Fluid Cursive', styleTag: 'Neutral', description: 'Bold fluid gel pen cursive', url: '/fonts/CaveatBrush.ttf' },
  { id: 'CoveredByYourGrace', name: 'Covered By Your Grace', category: 'Fast & Scratch', styleTag: 'Neutral', description: 'Tall slender quick lecture notes', url: '/fonts/CoveredByYourGrace.ttf' },
  { id: 'SedgwickAve', name: 'Sedgwick Ave', category: 'Fast & Scratch', styleTag: 'Neutral', description: 'Expressive block marker', url: '/fonts/SedgwickAve.ttf' },
  { id: 'Mansalva', name: 'Mansalva', category: 'Fast & Scratch', styleTag: 'Neutral', description: 'Freehand expressive ink', url: '/fonts/Mansalva.ttf' },
];

export async function loadFontById(fontId: string, customUrl?: string): Promise<opentype.Font> {
  const cacheKey = customUrl || fontId;
  if (fontCache.has(cacheKey)) {
    return fontCache.get(cacheKey)!;
  }

  let url = customUrl;
  if (!url) {
    const builtin = BUILTIN_FONTS.find((f) => f.id === fontId);
    url = builtin ? builtin.url : BUILTIN_FONTS[0].url;
  }

  return new Promise((resolve, reject) => {
    opentype.load(url!, (err, font) => {
      if (err || !font) {
        console.error('Failed to load font from URL:', url, err);
        // Fallback to Caveat
        if (url !== '/fonts/Caveat.ttf') {
          opentype.load('/fonts/Caveat.ttf', (fallbackErr, fallbackFont) => {
            if (fallbackFont) {
              fontCache.set(cacheKey, fallbackFont);
              resolve(fallbackFont);
            } else {
              reject(fallbackErr);
            }
          });
        } else {
          reject(err);
        }
      } else {
        fontCache.set(cacheKey, font);
        resolve(font);
      }
    });
  });
}

export async function loadFontFromArrayBuffer(buffer: ArrayBuffer, name = 'custom'): Promise<opentype.Font> {
  const font = opentype.parse(buffer);
  fontCache.set(name, font);
  return font;
}
