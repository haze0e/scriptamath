export interface ParsedAIStudentizer {
  title?: string;
  dateStr?: string;
  marginNote?: string;
  mainWork: string;
  roughWork: string[];
}

/**
 * Parses structured AI studentizer responses containing [METADATA], [MAIN_WORK], and [ROUGH_WORK].
 */
export function parseAIStudentizerResponse(input: string): ParsedAIStudentizer {
  // Strip code fences if AI wrapped it in ```scriptamath ... ``` or ```markdown ... ```
  let text = input.replace(/```(?:scriptamath|markdown)?/gi, '').replace(/```/g, '').trim();

  const metadataMatch = text.match(/\[METADATA\]([\s\S]*?)(?=\[(?:MAIN_WORK|ROUGH_WORK)\]|$)/i);
  const mainWorkMatch = text.match(/\[MAIN_WORK\]([\s\S]*?)(?=\[ROUGH_WORK\]|$)/i);
  const roughWorkMatch = text.match(/\[ROUGH_WORK\]([\s\S]*?)$/i);

  let title = '';
  let dateStr = '';
  let marginNote = '';

  if (metadataMatch) {
    const meta = metadataMatch[1];
    const t = meta.match(/Title:\s*(.+)/i);
    const d = meta.match(/Date:\s*(.+)/i);
    const m = meta.match(/MarginNote:\s*(.+)/i);
    if (t) title = t[1].trim();
    if (d) dateStr = d[1].trim();
    if (m) marginNote = m[1].trim();
  }

  let mainWork: string;
  if (mainWorkMatch) {
    mainWork = mainWorkMatch[1].trim();
  } else {
    // If [MAIN_WORK] is absent, strip [METADATA] and [ROUGH_WORK] if present
    let cleaned = text;
    if (metadataMatch) {
      cleaned = cleaned.replace(/\[METADATA\][\s\S]*?(?=\[ROUGH_WORK\]|$)/i, '').trim();
    }
    if (roughWorkMatch) {
      cleaned = cleaned.replace(/\[ROUGH_WORK\][\s\S]*$/i, '').trim();
    }
    mainWork = cleaned;
  }
  const roughWork = roughWorkMatch
    ? roughWorkMatch[1]
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l.length > 0 && !l.startsWith('#'))
    : [];

  return { title, dateStr, marginNote, mainWork, roughWork };
}

/**
 * Generates an instruction-tuned prompt template ready for one-click copy into Gemini, ChatGPT, or Claude.
 */
export function generateStudentizerPrompt(rawText: string, assignmentTitle?: string): string {
  const currentDate = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  return `You are an expert STEM studentizer assistant for handwritten homework notebooks.
Transform the following raw textbook/assignment text into authentic, natural student-written homework.

Strict Formatting Guidelines:
1. Rephrase stiff textbook explanations into natural student phrasing (e.g. "Substituting eq. 1 into eq. 2", "Simplifying the numerator:", "Hence:").
2. Write all math formulas in standard inline $...$ or block $$...$$ LaTeX (e.g. fractions \\frac{a}{b}, roots \\sqrt{x}, matrices).
3. NO BOXED ANSWERS: DO NOT wrap final answers in a box (do NOT use \\boxed{...}). Rigid boxes look unnatural and artificial in student handwriting. Instead, conclude naturally with "Hence:", "Therefore,", "Ans:", or standard notation (e.g., \\therefore x = ...).
4. In [ROUGH_WORK], output 3 to 6 authentic intermediate scratch calculations (algebraic steps, arithmetic checks, square roots, multiplications).
5. Provide a short margin note for the notebook gutter (e.g., "Problem 3(b) - Due Friday").
6. Return ONLY the response in this exact format (no conversational greeting):

[METADATA]
Title: ${assignmentTitle || 'STEM Homework Solution'}
Date: ${currentDate}
MarginNote: Q3. (b) — Section 4.2

[MAIN_WORK]
# ${assignmentTitle || 'Solution Derivation'}
(Write the full studentized homework solution here)

[ROUGH_WORK]
28 * 14 = 392
392 - 128 = 264
√264 ≈ 16.24
16.24 / 2 = 8.12

--- RAW INPUT TEXT TO STUDENTIZE ---
${rawText || 'Solve the differential equation dy/dx + 2y = 4e^x with initial condition y(0) = 1.'}
`;
}
