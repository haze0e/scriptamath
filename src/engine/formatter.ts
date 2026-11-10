export interface MathFraction {
  type: 'fraction';
  numerator: MathToken[];
  denominator: MathToken[];
}

export interface MathScript {
  type: 'script';
  base: string | MathToken[];
  sup?: MathToken[];
  sub?: MathToken[];
}

export interface MathRoot {
  type: 'root';
  content: MathToken[];
  index?: string;
}

export interface MathOperator {
  type: 'operator';
  symbol: string; // '=', '+', '-', '×', '·', '\int', '\sum', '⇒', '→', '∴', '∵', '≠', '≈', '±', '∂', '∇'
}

export interface MathDelimiter {
  type: 'delimiter';
  char: '(' | ')' | '[' | ']' | '{' | '}' | '|';
}

export interface MathBoxed {
  type: 'boxed';
  content: MathToken[];
}

export interface MathBigOp {
  type: 'big-op';
  symbol: '\\int' | '\\sum' | '\\prod';
  lower?: MathToken[];
  upper?: MathToken[];
}

export interface MathMatrix {
  type: 'matrix';
  bracket: 'b' | 'p' | 'v' | 'cases';
  cells: MathToken[][][];
}

export interface MathSpace {
  type: 'space';
  widthMultiplier: number;
}

export interface MathText {
  type: 'text';
  text: string;
  isFunction?: boolean; // cos, sin, tan, ln
}

export type MathToken =
  | MathText
  | MathFraction
  | MathScript
  | MathRoot
  | MathOperator
  | MathDelimiter
  | MathBoxed
  | MathSpace
  | MathBigOp
  | MathMatrix;

export interface DocumentBlock {
  id: string;
  type: 'heading' | 'paragraph' | 'math-step' | 'margin-item' | 'boxed-final' | 'table' | 'separator';
  level?: 1 | 2 | 3;
  prefix?: string; // "Q1.", "Ans:", "⇒", "∴", "•"
  indent: number; // 0, 1, 2 (continuation step indents)
  tokens: MathToken[];
  rawText: string;
  tableData?: {
    headers: MathToken[][];
    rows: MathToken[][][];
    columnCount: number;
  };
}

/**
 * Extracts balanced group between openChar and closeChar (e.g. { and }).
 * Accurately handles deeply nested braces.
 */
export function extractBalanced(
  str: string,
  startIndex: number,
  openChar = '{',
  closeChar = '}'
): { inner: string; endIndex: number } | null {
  if (startIndex >= str.length) return null;
  const actualStart = str.indexOf(openChar, startIndex);
  if (actualStart === -1) return null;

  let depth = 0;
  for (let i = actualStart; i < str.length; i++) {
    if (str[i] === openChar) {
      depth++;
    } else if (str[i] === closeChar) {
      depth--;
      if (depth === 0) {
        return {
          inner: str.slice(actualStart + 1, i),
          endIndex: i + 1,
        };
      }
    }
  }
  return null;
}

/**
 * Normalizes straight quotes, typewriter double-dashes, and informal punctuation
 * into natural student handwriting typography outside math blocks.
 */
export function normalizeStudentTypography(text: string): string {
  // Split by math delimiters $...$ and $$...$$ so math syntax is never altered
  const parts = text.split(/(\$\$[\s\S]*?\$\$|\$[^\$]*?\$)/g);

  return parts
    .map((part, idx) => {
      // Odd indices are math blocks — keep intact
      if (idx % 2 === 1) return part;

      return part
        .replace(/-- /g, '— ')
        .replace(/---/g, '—')
        .replace(/\.\.\./g, '…')
        .replace(/(\w)'(\w)/g, '$1’$2') // Contractions like don't -> don’t
        .replace(/"([^"]*)"/g, '“$1”') // Double quotes -> curly quotes
        .replace(/'([^']*)'/g, '‘$1’'); // Single quotes -> curly quotes
    })
    .join('');
}

/**
 * Parses raw text from ChatGPT, Claude, or Gemini into structured notebook blocks.
 */
export function parseRawAIOutput(rawText: string): DocumentBlock[] {
  const blocks: DocumentBlock[] = [];
  if (!rawText.trim()) return blocks;

  // Apply smart typographic punctuation to prose without touching LaTeX
  const typographicallyClean = normalizeStudentTypography(rawText);

  // Normalize Windows newlines and LaTeX brackets
  let normalized = typographicallyClean
    .replace(/\r\n/g, '\n')
    .replace(/\\\[([\s\S]*?)\\\]/g, '$$$$$1$$$$') // \[ ... \] to $$ ... $$
    .replace(/\\\(([\s\S]*?)\\\)/g, '$$$1$$'); // \( ... \) to $ ... $

  // Normalize \choose syntax: {n \choose k} -> \binom{n}{k}
  normalized = normalized.replace(/\{([^{}]+)\s*\\choose\s*([^{}]+)\}/g, '\\binom{$1}{$2}');

  // Normalize plain text ellipses
  normalized = normalized.replace(/\\(dots|cdots|ldots)/g, '...');

  // Normalize align environments
  normalized = normalized.replace(/\\begin\{align\*?\}([\s\S]*?)\\end\{align\*?\}/g, (_match, inner) => {
    return '$$\n' + inner + '\n$$';
  });

  // Collapse newlines inside matrix/cases environments so line.split('\n') never slices them in half!
  normalized = normalized.replace(
    /\\begin\{(bmatrix|pmatrix|vmatrix|cases)\}([\s\S]*?)\\end\{\1\}/g,
    (match) => match.replace(/\s*\n\s*/g, ' ')
  );

  const lines = normalized.split('\n');
  let inBlockMath = false;
  let blockMathBuffer: string[] = [];
  let blockIdCounter = 0;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();

    // Check single-line $$ ... $$
    if (line.startsWith('$$') && line.endsWith('$$') && line.length > 2) {
      const mathContent = line.slice(2, -2).trim();
      processMathBlock(mathContent, blocks, ++blockIdCounter);
      continue;
    }

    if (line.startsWith('$$')) {
      if (inBlockMath) {
        const mathContent = blockMathBuffer.join('\n');
        processMathBlock(mathContent, blocks, ++blockIdCounter);
        blockMathBuffer = [];
        inBlockMath = false;
      } else {
        inBlockMath = true;
        blockMathBuffer = [line.slice(2)];
      }
      continue;
    }

    if (inBlockMath) {
      if (line.endsWith('$$')) {
        blockMathBuffer.push(line.slice(0, -2));
        const mathContent = blockMathBuffer.join('\n');
        processMathBlock(mathContent, blocks, ++blockIdCounter);
        blockMathBuffer = [];
        inBlockMath = false;
      } else {
        blockMathBuffer.push(line);
      }
      continue;
    }

    if (!line) continue;

    // Humanize repetitive AI boilerplate transition phrases so 14 problems don't look robotic
    const shorthandRoll = (blockIdCounter * 7) % 5;
    if (/^Taking Laplace Transform:?$/i.test(line)) {
      const variants = [
        'Taking Laplace Transform:',
        'Applying L.T. on both sides:',
        'Taking L.T. :',
        'By Laplace transform,',
        'Taking Laplace transform:',
      ];
      line = variants[shorthandRoll];
    } else if (/^Taking inverse Laplace(?: transform)?:?$/i.test(line)) {
      const variants = [
        'Taking inverse Laplace:',
        'Taking inverse L.T. :',
        'Applying inverse L.T. :',
        'By inverse Laplace transform:',
        'Taking inverse L.T. on both sides:',
      ];
      line = variants[shorthandRoll];
    } else if (/^Partial fractions:?$/i.test(line)) {
      const variants = [
        'Partial fractions:',
        'By partial fractions:',
        'Using partial fractions,',
        'Resolving into partial fractions:',
        'Partial fraction decomposition:',
      ];
      line = variants[shorthandRoll];
    }

    // Markdown Table Detection (| col1 | col2 |)
    if (
      line.includes('|') &&
      i + 1 < lines.length &&
      lines[i + 1].trim().match(/^\|?[\s-:]+\|[\s-:|]+$/)
    ) {
      const tableLines: string[] = [line];
      i += 2; // skip header and separator line
      while (i < lines.length && lines[i].trim().includes('|')) {
        tableLines.push(lines[i].trim());
        i++;
      }
      i--; // adjust loop counter

      // Parse header cells
      const headerRawCells = tableLines[0]
        .split('|')
        .slice(1, -1)
        .map((c) => c.trim());
      const headers = headerRawCells.map((c) => tokenizeParagraphWithInlineMath(c));

      // Parse data rows
      const rows: MathToken[][][] = [];
      for (let r = 1; r < tableLines.length; r++) {
        const rawCells = tableLines[r]
          .split('|')
          .slice(1, -1)
          .map((c) => c.trim());
        // Pad row cells to match column count
        while (rawCells.length < headers.length) rawCells.push('');
        const rowTokens = rawCells
          .slice(0, headers.length)
          .map((c) => tokenizeParagraphWithInlineMath(c));
        rows.push(rowTokens);
      }

      blocks.push({
        id: `blk-${++blockIdCounter}`,
        type: 'table',
        indent: 0,
        tokens: [],
        rawText: tableLines.join('\n'),
        tableData: {
          headers,
          rows,
          columnCount: headers.length,
        },
      });
      continue;
    }

    // Markdown Headings (#, ##, ###, ####, #####)
    if (line.startsWith('# ')) {
      blocks.push({
        id: `blk-${++blockIdCounter}`,
        type: 'heading',
        level: 1,
        indent: 0,
        tokens: tokenizeParagraphWithInlineMath(line.slice(2).trim()),
        rawText: line.slice(2).trim(),
      });
      continue;
    }
    if (line.startsWith('## ')) {
      blocks.push({
        id: `blk-${++blockIdCounter}`,
        type: 'heading',
        level: 2,
        indent: 0,
        tokens: tokenizeParagraphWithInlineMath(line.slice(3).trim()),
        rawText: line.slice(3).trim(),
      });
      continue;
    }
    if (line.startsWith('### ')) {
      blocks.push({
        id: `blk-${++blockIdCounter}`,
        type: 'heading',
        level: 3,
        indent: 0,
        tokens: tokenizeParagraphWithInlineMath(line.slice(4).trim()),
        rawText: line.slice(4).trim(),
      });
      continue;
    }
    if (line.startsWith('#### ') || line.startsWith('##### ')) {
      const headingContent = line.replace(/^#{4,5}\s+/, '').trim();
      blocks.push({
        id: `blk-${++blockIdCounter}`,
        type: 'heading',
        level: 3,
        indent: 0,
        tokens: tokenizeParagraphWithInlineMath(headingContent),
        rawText: headingContent,
      });
      continue;
    }

    // Horizontal Separator Rule (---, ***, ___)
    if (line.match(/^[-*_]{3,}$/)) {
      blocks.push({
        id: `blk-${++blockIdCounter}`,
        type: 'separator',
        indent: 0,
        tokens: [],
        rawText: '---',
      });
      continue;
    }

    // Markdown Lists / Margin Items (Q1., Ans:, 1., **1.**, (a), •)
    const boldNumMatch = line.match(/^(?:\*\*)?(?:(?:[Qq]uestion|[Pp]roblem)\s*(\d+)[:.]?|Q(\d+)[:.]?|(\d+)[\.:\)])\s*(?:\*\*)?\s*(.*)$/);
    if (boldNumMatch) {
      const qNum = boldNumMatch[1] || boldNumMatch[2] || boldNumMatch[3];
      let remainder = boldNumMatch[4] ? boldNumMatch[4].trim() : '';

      // If line is just "**1.**", look ahead at next non-empty line so question content merges onto the same line
      if (!remainder && i + 1 < lines.length) {
        const nextLine = lines[i + 1].trim();
        if (
          nextLine &&
          !nextLine.startsWith('$$') &&
          !nextLine.startsWith('#') &&
          !nextLine.startsWith('**') &&
          !nextLine.match(/^\d+[\.:\)]/) &&
          !nextLine.startsWith('---')
        ) {
          remainder = nextLine;
          i++;
        }
      }

      const isExplicitQ = Boolean(boldNumMatch[1] || boldNumMatch[2]);
      const prefix = isExplicitQ ? `Q${qNum}.` : `${qNum}.`;

      blocks.push({
        id: `blk-${++blockIdCounter}`,
        type: 'margin-item',
        prefix,
        indent: 0,
        tokens: tokenizeParagraphWithInlineMath(remainder),
        rawText: line,
      });
      continue;
    }

    const qMatch = line.match(/^(?:(?:[Qq]uestion|[Pp]roblem)\s*(\d+)[:.]?|Q(\d+)[:.]?)\s*(.*)$/);
    if (qMatch) {
      const qNum = qMatch[1] || qMatch[2];
      blocks.push({
        id: `blk-${++blockIdCounter}`,
        type: 'margin-item',
        prefix: `Q${qNum}.`,
        indent: 0,
        tokens: tokenizeParagraphWithInlineMath(qMatch[3]),
        rawText: line,
      });
      continue;
    }

    const ansMatch = line.match(/^(?:(?:[Ss]olution|[Aa]nswer)[:.]?|Ans[:.]?)\s*(.*)$/);
    if (ansMatch) {
      blocks.push({
        id: `blk-${++blockIdCounter}`,
        type: 'margin-item',
        prefix: `Ans:`,
        indent: 0,
        tokens: tokenizeParagraphWithInlineMath(ansMatch[1]),
        rawText: line,
      });
      continue;
    }

    // Numbered item: e.g. (1), 1., 1)
    const parenNumMatch = line.match(/^\((\d+)\)\s*(.*)$/);
    if (parenNumMatch) {
      blocks.push({
        id: `blk-${++blockIdCounter}`,
        type: 'margin-item',
        prefix: `(${parenNumMatch[1]})`,
        indent: 0,
        tokens: tokenizeParagraphWithInlineMath(parenNumMatch[2]),
        rawText: line,
      });
      continue;
    }

    const numListMatch = line.match(/^(\d+)[.)]\s+(.*)$/);
    if (numListMatch) {
      blocks.push({
        id: `blk-${++blockIdCounter}`,
        type: 'margin-item',
        prefix: `${numListMatch[1]}.`,
        indent: 0,
        tokens: tokenizeParagraphWithInlineMath(numListMatch[2]),
        rawText: line,
      });
      continue;
    }

    // Alpha sub-items: e.g. (a), (b), a., a)
    const alphaListMatch = line.match(/^(?:\(([a-zA-Z])\)|([a-zA-Z])[.)])\s*(.*)$/);
    if (alphaListMatch) {
      const alphaChar = alphaListMatch[1] || alphaListMatch[2];
      blocks.push({
        id: `blk-${++blockIdCounter}`,
        type: 'margin-item',
        prefix: `(${alphaChar})`,
        indent: 1,
        tokens: tokenizeParagraphWithInlineMath(alphaListMatch[3]),
        rawText: line,
      });
      continue;
    }

    const bulletMatch = line.match(/^[-*•]\s+(.*)$/);
    if (bulletMatch) {
      blocks.push({
        id: `blk-${++blockIdCounter}`,
        type: 'margin-item',
        prefix: `•`,
        indent: 1,
        tokens: tokenizeParagraphWithInlineMath(bulletMatch[1]),
        rawText: line,
      });
      continue;
    }

    // Check if line is a standalone \boxed{...}
    if (line.startsWith('\\boxed')) {
      const b = extractBalanced(line, 0);
      if (b) {
        blocks.push({
          id: `blk-${++blockIdCounter}`,
          type: 'boxed-final',
          indent: 1,
          tokens: [{ type: 'boxed', content: parseLatexExpressionTokens(b.inner) }],
          rawText: line,
        });
        continue;
      }
    }

    // Standard body paragraph
    blocks.push({
      id: `blk-${++blockIdCounter}`,
      type: 'paragraph',
      indent: 0,
      tokens: tokenizeParagraphWithInlineMath(line),
      rawText: line,
    });
  }

  return blocks;
}

/**
 * Splits LaTeX block derivations into ruled-line steps with student prefixes.
 */
function processMathBlock(mathContent: string, blocks: DocumentBlock[], baseId: number) {
  // Protect matrix and cases environments from being split on \\ or stripped of &
  const protectedMath = mathContent.replace(
    /\\begin\{(bmatrix|pmatrix|vmatrix|cases)\}([\s\S]*?)\\end\{\1\}/g,
    (match) => {
      return match
        .replace(/&/g, '__MATRIX_AMP__')
        .replace(/\\\\/g, '__MATRIX_SLASH__');
    }
  );

  // Split on double backslash \\
  const rawSteps = protectedMath.split(/\\\\/g);

  let stepIdx = 0;
  for (const rawStep of rawSteps) {
    const trimmed = rawStep.trim();
    if (!trimmed) continue;

    // Remove '&' alignment characters while restoring protected matrix tokens
    const cleanStep = trimmed
      .replace(/&/g, '')
      .replace(/__MATRIX_AMP__/g, '&')
      .replace(/__MATRIX_SLASH__/g, '\\\\')
      .trim();

    // Check if whole step is \boxed{...}
    if (cleanStep.startsWith('\\boxed')) {
      const b = extractBalanced(cleanStep, 0);
      if (b) {
        blocks.push({
          id: `math-step-${baseId}-${++stepIdx}`,
          type: 'boxed-final',
          indent: 1,
          tokens: [{ type: 'boxed', content: parseLatexExpressionTokens(b.inner) }],
          rawText: cleanStep,
        });
        continue;
      }
    }

    const isContinuation =
      cleanStep.startsWith('=') ||
      cleanStep.startsWith('\\implies') ||
      cleanStep.startsWith('\\therefore');

    const prefix = cleanStep.startsWith('\\therefore')
      ? '∴'
      : cleanStep.startsWith('\\implies') || isContinuation
      ? '⇒'
      : stepIdx === 0
      ? ''
      : '⇒';

    let contentToTokenize = cleanStep;
    if (contentToTokenize.startsWith('\\therefore')) contentToTokenize = contentToTokenize.replace(/^\\therefore\s*/, '');
    if (contentToTokenize.startsWith('\\implies')) contentToTokenize = contentToTokenize.replace(/^\\implies\s*/, '');

    blocks.push({
      id: `math-step-${baseId}-${++stepIdx}`,
      type: 'math-step',
      indent: isContinuation ? 1 : 0,
      prefix: prefix || undefined,
      tokens: parseLatexExpressionTokens(contentToTokenize),
      rawText: cleanStep,
    });
  }
}

/**
 * Tokenizes a paragraph containing inline text and math ($...$, \(...\)).
 */
export function tokenizeParagraphWithInlineMath(text: string): MathToken[] {
  // Strip or normalize markdown bold/italic asterisks outside of math: **text** -> text
  const cleanedText = text.replace(/\*\*(.*?)\*\*/g, '$1');
  const tokens: MathToken[] = [];
  // Split on $...$
  const parts = cleanedText.split(/(\$[^\$]+\$)/g);

  for (const part of parts) {
    if (!part) continue;

    if (part.startsWith('$') && part.endsWith('$') && part.length >= 2) {
      const mathInner = part.slice(1, -1);
      const mathTokens = parseLatexExpressionTokens(mathInner);
      tokens.push(...mathTokens);
    } else {
      // Split plain text into words and spaces
      const subParts = part.split(/(\s+)/);
      for (const sp of subParts) {
        if (!sp) continue;
        if (/^\s+$/.test(sp)) {
          tokens.push({ type: 'space', widthMultiplier: sp.length });
        } else if (sp.includes('\\binom') || sp.includes('\\frac') || sp.includes('\\sqrt')) {
          tokens.push(...parseLatexExpressionTokens(sp));
        } else {
          tokens.push({ type: 'text', text: sp });
        }
      }
    }
  }

  return tokens;
}

/**
 * Full LaTeX Math Tokenizer:
 * Recursively parses LaTeX expressions into fractions, roots, scripts, delimiters, operators, and functions.
 */
export function parseLatexExpressionTokens(expr: string): MathToken[] {
  const tokens: MathToken[] = [];
  let i = 0;

  // Function names (longer prefixes listed first so cosh matches before cos)
  const MATH_FUNCS = [
    '\\arcsin',
    '\\arccos',
    '\\arctan',
    '\\cosh',
    '\\sinh',
    '\\tanh',
    '\\coth',
    '\\cos',
    '\\sin',
    '\\tan',
    '\\cot',
    '\\sec',
    '\\csc',
    '\\ln',
    '\\log',
    '\\exp',
    '\\lim',
    '\\det',
    '\\max',
    '\\min',
    '\\gcd',
    '\\deg',
    '\\dim',
    '\\ker',
  ];

  // Greek letter map
  const GREEK_MAP: Record<string, string> = {
    '\\alpha': 'α',
    '\\beta': 'β',
    '\\gamma': 'γ',
    '\\delta': 'δ',
    '\\Delta': 'Δ',
    '\\epsilon': 'ε',
    '\\varepsilon': 'ε',
    '\\theta': 'θ',
    '\\lambda': 'λ',
    '\\mu': 'μ',
    '\\nu': 'ν',
    '\\pi': 'π',
    '\\rho': 'ρ',
    '\\sigma': 'σ',
    '\\tau': 'τ',
    '\\phi': 'φ',
    '\\psi': 'ψ',
    '\\omega': 'ω',
    '\\Omega': 'Ω',
  };

  while (i < expr.length) {
    // 1. Whitespace
    if (expr[i] === ' ' || expr[i] === '\t') {
      tokens.push({ type: 'space', widthMultiplier: 1 });
      i++;
      continue;
    }

    // 2. Matrix environments: \begin{bmatrix}, \begin{pmatrix}, \begin{vmatrix}, \begin{cases}
    const matrixMatch = expr.slice(i).match(/^\\begin\{(bmatrix|pmatrix|vmatrix|cases)\}([\s\S]*?)\\end\{\1\}/);
    if (matrixMatch) {
      const env = matrixMatch[1];
      const inner = matrixMatch[2];
      const bracketType: 'b' | 'p' | 'v' | 'cases' =
        env === 'bmatrix' ? 'b' : env === 'pmatrix' ? 'p' : env === 'vmatrix' ? 'v' : 'cases';

      const unescapedInner = inner
        .replace(/__MATRIX_SLASH__/g, '\\\\')
        .replace(/__MATRIX_AMP__/g, '&');
      const rawRows = unescapedInner.split(/\\\\/g);
      const cells: MathToken[][][] = [];
      for (const r of rawRows) {
        if (!r.trim()) continue;
        const rawCols = r.split(/&/g);
        const rowCells: MathToken[][] = [];
        for (const c of rawCols) {
          rowCells.push(parseLatexExpressionTokens(c.trim()));
        }
        cells.push(rowCells);
      }

      tokens.push({
        type: 'matrix',
        bracket: bracketType,
        cells,
      });
      i += matrixMatch[0].length;
      continue;
    }

    // 2. LaTeX spacing commands: \quad, \qquad, \,, \;, \:, \!, \ 
    if (expr.startsWith('\\quad', i)) {
      tokens.push({ type: 'space', widthMultiplier: 2 });
      i += 5;
      continue;
    }
    if (expr.startsWith('\\qquad', i)) {
      tokens.push({ type: 'space', widthMultiplier: 3 });
      i += 6;
      continue;
    }
    if (expr.startsWith('\\,', i) || expr.startsWith('\\;', i) || expr.startsWith('\\:', i) || expr.startsWith('\\ ', i)) {
      tokens.push({ type: 'space', widthMultiplier: 0.8 });
      i += 2;
      continue;
    }
    if (expr.startsWith('\\!', i)) {
      i += 2;
      continue;
    }

    // 3. Boxed final answer: \boxed{...}
    if (expr.startsWith('\\boxed', i)) {
      const b = extractBalanced(expr, i);
      if (b) {
        tokens.push({
          type: 'boxed',
          content: parseLatexExpressionTokens(b.inner),
        });
        i = b.endIndex;
        continue;
      }
    }

    // 4. Fractions: \frac{num}{den}
    if (expr.startsWith('\\frac', i)) {
      const numMatch = extractBalanced(expr, i);
      if (numMatch) {
        const denMatch = extractBalanced(expr, numMatch.endIndex);
        if (denMatch) {
          tokens.push({
            type: 'fraction',
            numerator: parseLatexExpressionTokens(numMatch.inner),
            denominator: parseLatexExpressionTokens(denMatch.inner),
          });
          i = denMatch.endIndex;
          continue;
        }
      }
    }

    // 4b. Binomial Coefficient: \binom{n}{k}, \dbinom{n}{k}, \tbinom{n}{k}
    if (expr.startsWith('\\binom', i) || expr.startsWith('\\dbinom', i) || expr.startsWith('\\tbinom', i)) {
      const topMatch = extractBalanced(expr, i);
      if (topMatch) {
        const botMatch = extractBalanced(expr, topMatch.endIndex);
        if (botMatch) {
          tokens.push({
            type: 'matrix',
            bracket: 'p',
            cells: [
              [parseLatexExpressionTokens(topMatch.inner)],
              [parseLatexExpressionTokens(botMatch.inner)],
            ],
          });
          i = botMatch.endIndex;
          continue;
        }
      }
    }

    // 5. Square Root: \sqrt{...} or \sqrt[n]{...}
    if (expr.startsWith('\\sqrt', i)) {
      let rootIdx = i + 5;
      let degree: string | undefined;
      if (expr[rootIdx] === '[') {
        const closeBracket = expr.indexOf(']', rootIdx);
        if (closeBracket !== -1) {
          degree = expr.slice(rootIdx + 1, closeBracket);
          rootIdx = closeBracket + 1;
        }
      }
      const b = extractBalanced(expr, rootIdx);
      if (b) {
        tokens.push({
          type: 'root',
          content: parseLatexExpressionTokens(b.inner),
          index: degree,
        });
        i = b.endIndex;
        continue;
      }
    }

    // 6. Delimiters: \left(, \right), \left[, \right], \left\{, \right\}, \left|, \right|, \vert, \left., \right.
    // Invisible delimiters: \left. and \right. (commonly used in calculus evaluation bars and piecewise definitions)
    if (expr.startsWith('\\left.', i)) {
      i += 6;
      continue;
    }
    if (expr.startsWith('\\right.', i)) {
      i += 7;
      continue;
    }

    // Vertical evaluation bar: \left\vert, \right\vert, \vert, \Big|, \Bigg|
    if (expr.startsWith('\\left\\vert', i)) {
      tokens.push({ type: 'delimiter', char: '|' });
      i += 10;
      continue;
    }
    if (expr.startsWith('\\right\\vert', i)) {
      tokens.push({ type: 'delimiter', char: '|' });
      i += 11;
      continue;
    }
    if (expr.startsWith('\\vert', i)) {
      tokens.push({ type: 'delimiter', char: '|' });
      i += 5;
      continue;
    }
    const bigBarMatch = expr.slice(i).match(/^\\(Big|Bigg|bigg|big)\|/);
    if (bigBarMatch) {
      tokens.push({ type: 'delimiter', char: '|' });
      i += bigBarMatch[0].length;
      continue;
    }

    if (expr.startsWith('\\left(', i)) {
      tokens.push({ type: 'delimiter', char: '(' });
      i += 6;
      continue;
    }
    if (expr.startsWith('\\right)', i)) {
      tokens.push({ type: 'delimiter', char: ')' });
      i += 7;
      continue;
    }
    if (expr.startsWith('\\left[', i)) {
      tokens.push({ type: 'delimiter', char: '[' });
      i += 6;
      continue;
    }
    if (expr.startsWith('\\right]', i)) {
      tokens.push({ type: 'delimiter', char: ']' });
      i += 7;
      continue;
    }
    if (expr.startsWith('\\left\\{', i) || expr.startsWith('\\{', i)) {
      tokens.push({ type: 'delimiter', char: '{' });
      i += expr.startsWith('\\left\\{', i) ? 7 : 2;
      continue;
    }
    if (expr.startsWith('\\right\\}', i) || expr.startsWith('\\}', i)) {
      tokens.push({ type: 'delimiter', char: '}' });
      i += expr.startsWith('\\right\\}', i) ? 8 : 2;
      continue;
    }
    if (expr.startsWith('\\left|', i) || expr.startsWith('\\right|', i)) {
      tokens.push({ type: 'delimiter', char: '|' });
      i += expr.startsWith('\\left|', i) ? 6 : 7;
      continue;
    }

    // Empty group anchor {} (e.g. \vert{}_{s=-2})
    if (expr.startsWith('{}', i)) {
      i += 2;
      continue;
    }
    // Standalone braces { ... }
    if (expr[i] === '{') {
      const b = extractBalanced(expr, i);
      if (b) {
        if (b.inner.length > 0) {
          tokens.push(...parseLatexExpressionTokens(b.inner));
        }
        i = b.endIndex;
        continue;
      }
    }

    // Single character delimiters
    if (expr[i] === '(' || expr[i] === ')') {
      tokens.push({ type: 'delimiter', char: expr[i] as any });
      i++;
      continue;
    }
    if (expr[i] === '[' || expr[i] === ']') {
      tokens.push({ type: 'delimiter', char: expr[i] as any });
      i++;
      continue;
    }
    if (expr[i] === '|') {
      tokens.push({ type: 'delimiter', char: '|' });
      i++;
      continue;
    }

    // 7. Superscripts & Subscripts (^ and _)
    if (expr[i] === '^' || expr[i] === '_') {
      const isSup = expr[i] === '^';
      i++;
      let scriptInner = '';
      if (expr[i] === '{') {
        const b = extractBalanced(expr, i);
        if (b) {
          scriptInner = b.inner;
          i = b.endIndex;
        }
      } else if (i < expr.length) {
        if (expr[i] === '\\') {
          const macroMatch = expr.slice(i).match(/^(\\[a-zA-Z]+)/);
          if (macroMatch) {
            scriptInner = macroMatch[1];
            i += macroMatch[1].length;
          } else {
            scriptInner = expr[i];
            i++;
          }
        } else if (expr[i] === '-' && i + 1 < expr.length && /[0-9a-zA-Z]/.test(expr[i + 1])) {
          scriptInner = '-' + expr[i + 1];
          i += 2;
        } else {
          scriptInner = expr[i];
          i++;
        }
      }

      // Check if subsequent subscript/superscript follows (e.g. x_i^2)
      let secondScriptInner: string | undefined;
      let isSecondSup = false;
      if (i < expr.length && (expr[i] === '^' || expr[i] === '_')) {
        isSecondSup = expr[i] === '^';
        i++;
        if (expr[i] === '{') {
          const b = extractBalanced(expr, i);
          if (b) {
            secondScriptInner = b.inner;
            i = b.endIndex;
          }
        } else if (i < expr.length) {
          if (expr[i] === '\\') {
            const macroMatch = expr.slice(i).match(/^(\\[a-zA-Z]+)/);
            if (macroMatch) {
              secondScriptInner = macroMatch[1];
              i += macroMatch[1].length;
            } else {
              secondScriptInner = expr[i];
              i++;
            }
          } else if (expr[i] === '-' && i + 1 < expr.length && /[0-9a-zA-Z]/.test(expr[i + 1])) {
            secondScriptInner = '-' + expr[i + 1];
            i += 2;
          } else {
            secondScriptInner = expr[i];
            i++;
          }
        }
      }

      // Determine base from previous token (ignore trailing space)
      while (tokens.length > 0 && tokens[tokens.length - 1].type === 'space') {
        tokens.pop();
      }
      const lastToken = tokens[tokens.length - 1];
      let base: string = 'x';
      if (lastToken) {
        if (lastToken.type === 'text') {
          if (lastToken.isFunction) {
            // Keep entire function name (e.g. sin, cos, lim, ln) as base
            base = lastToken.text;
            tokens.pop();
          } else if (lastToken.text.length > 0) {
            base = lastToken.text.slice(-1);
            lastToken.text = lastToken.text.slice(0, -1);
            if (lastToken.text.length === 0) tokens.pop();
          }
        } else if (lastToken.type === 'delimiter') {
          // Closing delimiter: DO NOT pop the delimiter from tokens!
          // Use empty base so the script attaches directly to the right of the closing delimiter
          base = '';
        } else if (lastToken.type === 'operator') {
          base = lastToken.symbol;
          tokens.pop();
        }
      }

      const scriptToken: MathScript = {
        type: 'script',
        base,
        [isSup ? 'sup' : 'sub']: parseLatexExpressionTokens(scriptInner),
      };

      if (secondScriptInner !== undefined) {
        scriptToken[isSecondSup ? 'sup' : 'sub'] = parseLatexExpressionTokens(secondScriptInner);
      }

      tokens.push(scriptToken);
      continue;
    }

    // 8. Math functions (cos, sin, tan, ln, etc.)
    let matchedFunc = false;
    for (const fn of MATH_FUNCS) {
      if (expr.startsWith(fn, i)) {
        tokens.push({ type: 'text', text: fn.slice(1), isFunction: true });
        i += fn.length;
        matchedFunc = true;
        break;
      }
    }
    if (matchedFunc) continue;

    // 9. Calligraphy & Transforms: \mathcal{L}, \mathcal{F}
    if (expr.startsWith('\\mathcal{L}', i) || expr.startsWith('\\mathcal{F}', i)) {
      const sym = expr.startsWith('\\mathcal{L}', i) ? 'ℒ' : 'ℱ';
      tokens.push({ type: 'operator', symbol: sym });
      i += 11;
      continue;
    }
    if (expr.startsWith('\\mathcal', i)) {
      const b = extractBalanced(expr, i);
      if (b) {
        tokens.push({ type: 'text', text: b.inner });
        i = b.endIndex;
        continue;
      }
    }

    // 10. Greek Delta & Vector Nabla (Procedural Hand-Drawn Math Symbols)
    if (expr.startsWith('\\Delta', i) || expr[i] === 'Δ') {
      tokens.push({ type: 'operator', symbol: 'Δ' });
      i += expr.startsWith('\\Delta', i) ? 6 : 1;
      continue;
    }
    if (expr.startsWith('\\nabla', i) || expr[i] === '∇') {
      tokens.push({ type: 'operator', symbol: '∇' });
      i += expr.startsWith('\\nabla', i) ? 6 : 1;
      continue;
    }

    // 11. Text blocks: \text{...}, \mathrm{...}, \mathbf{...}
    if (expr.startsWith('\\text', i) || expr.startsWith('\\mathrm', i) || expr.startsWith('\\mathbf', i)) {
      const b = extractBalanced(expr, i);
      if (b) {
        tokens.push({ type: 'text', text: b.inner });
        i = b.endIndex;
        continue;
      }
    }

    // 11. Greek letters
    let matchedGreek = false;
    for (const [cmd, unicode] of Object.entries(GREEK_MAP)) {
      if (expr.startsWith(cmd, i)) {
        tokens.push({ type: 'text', text: unicode });
        i += cmd.length;
        matchedGreek = true;
        break;
      }
    }
    if (matchedGreek) continue;

    // 12. Big Mathematical Operators with Limits (\int, \sum, \prod)
    if (expr.startsWith('\\int', i) || expr.startsWith('\\sum', i) || expr.startsWith('\\prod', i)) {
      const sym = expr.startsWith('\\int', i) ? '\\int' : expr.startsWith('\\sum', i) ? '\\sum' : '\\prod';
      i += sym.length;

      let lower: MathToken[] | undefined;
      let upper: MathToken[] | undefined;

      for (let pass = 0; pass < 2; pass++) {
        while (i < expr.length && (expr[i] === ' ' || expr[i] === '\t')) i++;
        if (i < expr.length && (expr[i] === '_' || expr[i] === '^')) {
          const isSup = expr[i] === '^';
          i++;
          let scriptInner = '';
          if (i < expr.length && expr[i] === '{') {
            const b = extractBalanced(expr, i);
            if (b) {
              scriptInner = b.inner;
              i = b.endIndex;
            }
          } else if (i < expr.length) {
            if (expr[i] === '\\') {
              const macroMatch = expr.slice(i).match(/^(\\[a-zA-Z]+)/);
              if (macroMatch) {
                scriptInner = macroMatch[1];
                i += macroMatch[1].length;
              } else {
                scriptInner = expr[i];
                i++;
              }
            } else if (expr[i] === '-' && i + 1 < expr.length && /[0-9a-zA-Z]/.test(expr[i + 1])) {
              scriptInner = '-' + expr[i + 1];
              i += 2;
            } else {
              scriptInner = expr[i];
              i++;
            }
          }
          if (isSup) {
            upper = parseLatexExpressionTokens(scriptInner);
          } else {
            lower = parseLatexExpressionTokens(scriptInner);
          }
        }
      }

      if (lower || upper) {
        tokens.push({
          type: 'big-op',
          symbol: sym as '\\int' | '\\sum' | '\\prod',
          lower,
          upper,
        });
      } else {
        tokens.push({ type: 'operator', symbol: sym });
      }
      continue;
    }
    if (expr.startsWith('\\implies', i) || expr.startsWith('\\Rightarrow', i)) {
      tokens.push({ type: 'operator', symbol: '⇒' });
      i += expr.startsWith('\\implies', i) ? 8 : 11;
      continue;
    }
    if (expr.startsWith('\\rightarrow', i) || expr.startsWith('\\to', i)) {
      tokens.push({ type: 'operator', symbol: '→' });
      i += expr.startsWith('\\rightarrow', i) ? 11 : 3;
      continue;
    }
    if (expr.startsWith('\\therefore', i)) {
      tokens.push({ type: 'operator', symbol: '∴' });
      i += 10;
      continue;
    }
    if (expr.startsWith('\\because', i)) {
      tokens.push({ type: 'operator', symbol: '∵' });
      i += 8;
      continue;
    }
    if (expr.startsWith('\\neq', i)) {
      tokens.push({ type: 'operator', symbol: '≠' });
      i += 4;
      continue;
    }
    if (expr.startsWith('\\approx', i)) {
      tokens.push({ type: 'operator', symbol: '≈' });
      i += 7;
      continue;
    }
    if (expr.startsWith('\\pm', i)) {
      tokens.push({ type: 'operator', symbol: '±' });
      i += 3;
      continue;
    }
    if (expr.startsWith('\\mp', i)) {
      tokens.push({ type: 'operator', symbol: '∓' });
      i += 3;
      continue;
    }
    if (expr.startsWith('\\cdot', i)) {
      tokens.push({ type: 'operator', symbol: '·' });
      i += 5;
      continue;
    }
    if (expr.startsWith('\\cdots', i)) {
      tokens.push({ type: 'operator', symbol: '\\cdots' });
      i += 6;
      continue;
    }
    if (expr.startsWith('\\dots', i) || expr.startsWith('\\ldots', i)) {
      tokens.push({ type: 'operator', symbol: '\\dots' });
      i += expr.startsWith('\\ldots', i) ? 6 : 5;
      continue;
    }
    if (expr.startsWith('...', i)) {
      tokens.push({ type: 'operator', symbol: '...' });
      i += 3;
      continue;
    }
    if (expr.startsWith('\\times', i)) {
      tokens.push({ type: 'operator', symbol: '×' });
      i += 6;
      continue;
    }
    if (expr.startsWith('\\partial', i)) {
      tokens.push({ type: 'operator', symbol: '∂' });
      i += 8;
      continue;
    }
    if (expr.startsWith('\\nabla', i)) {
      tokens.push({ type: 'operator', symbol: '∇' });
      i += 6;
      continue;
    }
    if (expr.startsWith('\\infty', i)) {
      tokens.push({ type: 'text', text: '∞' });
      i += 6;
      continue;
    }
    if (expr.startsWith('\\hbar', i)) {
      tokens.push({ type: 'text', text: 'ℏ' });
      i += 5;
      continue;
    }
    if (expr.startsWith('\\in', i) && !expr.startsWith('\\int', i) && !expr.startsWith('\\infty', i)) {
      tokens.push({ type: 'operator', symbol: '∈' });
      i += 3;
      continue;
    }
    if (expr.startsWith('\\notin', i)) {
      tokens.push({ type: 'operator', symbol: '∉' });
      i += 6;
      continue;
    }
    // Convert derivative primes (y', y'', y''') so they never vanish or render as tiny font apostrophes
    if (expr[i] === "'") {
      let primeCount = 0;
      while (i < expr.length && expr[i] === "'") {
        primeCount++;
        i++;
      }
      tokens.push({ type: 'operator', symbol: "'".repeat(primeCount) });
      continue;
    }
    if (expr.startsWith('\\prime', i)) {
      tokens.push({ type: 'operator', symbol: "'" });
      i += 6;
      continue;
    }
    if (expr.startsWith('\\leq', i) || (expr.startsWith('\\le', i) && !/^[a-zA-Z]/.test(expr.slice(i + 3)))) {
      tokens.push({ type: 'operator', symbol: '≤' });
      i += expr.startsWith('\\leq', i) ? 4 : 3;
      continue;
    }
    if (expr.startsWith('\\geq', i) || (expr.startsWith('\\ge', i) && !/^[a-zA-Z]/.test(expr.slice(i + 3)))) {
      tokens.push({ type: 'operator', symbol: '≥' });
      i += expr.startsWith('\\geq', i) ? 4 : 3;
      continue;
    }

    // Direct single operator chars: =, +, -, *, <, >
    if (expr[i] === '<' || expr[i] === '>') {
      tokens.push({ type: 'operator', symbol: expr[i] });
      i++;
      continue;
    }
    if (expr[i] === '=') {
      tokens.push({ type: 'operator', symbol: '=' });
      i++;
      continue;
    }
    if (expr[i] === '+') {
      tokens.push({ type: 'operator', symbol: '+' });
      i++;
      continue;
    }
    if (expr[i] === '-') {
      tokens.push({ type: 'operator', symbol: '-' });
      i++;
      continue;
    }

    // 13. General alphanumeric words / symbols
    let nextI = i + 1;
    while (
      nextI < expr.length &&
      !expr[nextI].match(/[\s\^_{}=\+\-\\\(\)\[\]\|]/)
    ) {
      nextI++;
    }

    const chunk = expr.slice(i, nextI);
    tokens.push({ type: 'text', text: chunk });
    i = nextI;
  }

  return tokens;
}
