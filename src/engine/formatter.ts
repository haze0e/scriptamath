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
  isBigDelimiter?: boolean;
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
  isBig?: boolean;
}

export interface MathBoxed {
  type: 'boxed';
  content: MathToken[];
}

export interface MathBigOp {
  type: 'big-op';
  symbol: '\\int' | '\\sum' | '\\prod' | '\\bigcup' | '\\bigcap';
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

function isEscapedChar(str: string, index: number): boolean {
  let backslashes = 0;
  let k = index - 1;
  while (k >= 0 && str[k] === '\\') {
    backslashes++;
    k--;
  }
  return backslashes % 2 === 1;
}

/**
 * Extracts balanced group between openChar and closeChar (e.g. { and }).
 * Accurately handles deeply nested braces and escapes.
 */
export function extractBalanced(
  str: string,
  startIndex: number,
  openChar = '{',
  closeChar = '}'
): { inner: string; endIndex: number } | null {
  if (startIndex >= str.length) return null;

  let actualStart = startIndex;
  // If caller passed the start of a LaTeX macro (e.g. \frac, \boxed), advance past macro name
  if (str[actualStart] === '\\') {
    actualStart++;
    while (actualStart < str.length && /[a-zA-Z*]/.test(str[actualStart])) {
      actualStart++;
    }
  }
  // Skip only horizontal whitespace before openChar
  while (actualStart < str.length && (str[actualStart] === ' ' || str[actualStart] === '\t')) {
    actualStart++;
  }
  if (actualStart >= str.length || str[actualStart] !== openChar || isEscapedChar(str, actualStart)) {
    return null;
  }

  let depth = 0;
  for (let i = actualStart; i < str.length; i++) {
    if (isEscapedChar(str, i)) continue;
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
  // Match balanced display/inline math blocks while ignoring escaped \$ and requiring non-space boundaries for inline $
  const mathRegex = /(\$\$[\s\S]*?\$\$|\\\[[\s\S]*?\\\]|\\\([\s\S]*?\\\)|(?<!\\)\$(?!\s)(?:\\.|[^\$\\\n])+?(?<!\s|\\)\$)/g;
  const parts = text.split(mathRegex);

  return parts
    .map((part, idx) => {
      // Odd indices are math blocks — keep intact
      if (idx % 2 === 1) return part;

      return part
        .replace(/---/g, '—')
        .replace(/-- /g, '— ')
        .replace(/\.\.\./g, '…')
        .replace(/(\w)'(\w)/g, '$1’$2') // Contractions like don't -> don’t
        .replace(/(\w)'(?=\s|[.,;!?)]|$)/g, '$1’') // Plural possessives: students' -> students’
        .replace(/(^|[\s(\[{])"([^"\n]+)"/g, '$1“$2”')
        .replace(/(^|[\s(\[{])'([^'\n]+)'(?=\s|[.,;!?)\]}]|$)/g, '$1‘$2’');
    })
    .join('');
}

export interface StructuredPromptSections {
  hasStructure: boolean;
  title?: string;
  dateStr?: string;
  marginNote?: string;
  mainWork: string;
  roughWork: string[];
}

/**
 * Extracts structured AI prompt sections ([METADATA], [MAIN_WORK], [ROUGH_WORK])
 * so metadata and rough work scratch lines do not pollute the main document canvas.
 */
export function extractStructuredPromptSections(input: string): StructuredPromptSections {
  const hasMeta = /\[METADATA\]/i.test(input);
  const hasMain = /\[MAIN_WORK\]/i.test(input);
  const hasRough = /\[ROUGH_WORK\]/i.test(input);

  if (!hasMeta && !hasMain && !hasRough) {
    return { hasStructure: false, mainWork: input, roughWork: [] };
  }

  // Strip code fences if present
  let text = input.replace(/```(?:scriptamath|markdown)?/gi, '').replace(/```/g, '').trim();

  const metaMatch = text.match(/\[METADATA\]([\s\S]*?)(?=\[(?:MAIN_WORK|ROUGH_WORK)\]|$)/i);
  const mainMatch = text.match(/\[MAIN_WORK\]([\s\S]*?)(?=\[ROUGH_WORK\]|$)/i);
  const roughMatch = text.match(/\[ROUGH_WORK\]([\s\S]*?)$/i);

  let title: string | undefined;
  let dateStr: string | undefined;
  let marginNote: string | undefined;

  if (metaMatch) {
    const meta = metaMatch[1];
    const t = meta.match(/Title:\s*(.+)/i);
    const d = meta.match(/Date:\s*(.+)/i);
    const m = meta.match(/MarginNote:\s*(.+)/i);
    if (t) title = t[1].trim();
    if (d) dateStr = d[1].trim();
    if (m) marginNote = m[1].trim();
  }

  let mainWork = '';
  if (mainMatch) {
    mainWork = mainMatch[1].trim();
  } else if (hasMeta || hasRough) {
    mainWork = text
      .replace(/\[METADATA\]([\s\S]*?)(?=\[(?:MAIN_WORK|ROUGH_WORK)\]|$)/i, '')
      .replace(/\[ROUGH_WORK\]([\s\S]*?)$/i, '')
      .trim();
  } else {
    mainWork = text;
  }
  let roughWork = roughMatch
    ? roughMatch[1]
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l.length > 0 && !l.startsWith('#'))
    : [];

  // Filter out any trailing conversational chat from user if present in rough block
  roughWork = roughWork.filter(
    (l) => !/^(?:THIS WAS THE WORK|CHECK THE OUTPUT|see unrendered|i dont think|fix it)/i.test(l)
  );

  // Auto-associate untagged rough work calculations to questions in mainWork using mathematical token scoring
  if (roughWork.length > 0) {
    const qPattern = /(?:^|\n)(?:#+\s*)?(?:Question|Problem|Q)\s*(\d+)[:\s]/gi;
    const matches: Array<{ qNum: number; index: number }> = [];
    let m: RegExpExecArray | null;
    while ((m = qPattern.exec(mainWork)) !== null) {
      matches.push({ qNum: parseInt(m[1], 10), index: m.index });
    }
    const qSections: Array<{ qNum: number; text: string }> = [];
    for (let i = 0; i < matches.length; i++) {
      const qNum = matches[i].qNum;
      const start = matches[i].index;
      const end = i + 1 < matches.length ? matches[i + 1].index : mainWork.length;
      qSections.push({ qNum, text: mainWork.slice(start, end) });
    }

    if (qSections.length > 0) {
      roughWork = roughWork.map((line) => {
        // If line already has a tag like [Check Q6] or (Q6), keep it intact
        if (/\[(?:Check\s+)?Q\d+[^\]]*\]/i.test(line) || /\(Q\d+\)/i.test(line)) {
          return line;
        }

        let bestQ: number | null = null;
        let bestScore = 0;

        for (const sec of qSections) {
          let score = 0;
          const secText = sec.text;
          const secCompact = secText.replace(/[\s\$\\{}]/g, '');
          const secCompactFrac = secText
            .replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, '$1/$2')
            .replace(/[\s\$\\{}]/g, '');

          // Check equation segments (e.g. 24 / 0.0009 or (x+1)x(1-x)(2-x))
          const segments = line.split(/[\s=≈\->]+/).filter((s) => s.length >= 3);
          for (const seg of segments) {
            const segClean = seg.replace(/\s+/g, '');
            if (secCompact.includes(segClean) || secCompactFrac.includes(segClean)) {
              score += segClean.length * 3;
            }
          }

          // Check distinct numbers (e.g. 2666.67, 2880, 720)
          const numbers = line.match(/\b\d+(?:\.\d+)?(?:e[\+\-]?\d+)?\b/gi) || [];
          for (const num of numbers) {
            if (num.length >= 2 && secText.includes(num)) {
              score += num.length * 2;
            }
          }

          // Check fractions like 11/30 or 11/720
          const fracs = line.match(/\b\d+\/\d+\b/g) || [];
          for (const f of fracs) {
            const [num, den] = f.split('/');
            if (secText.includes(f) || secText.includes(`\\frac{${num}}{${den}}`)) {
              score += 20;
            }
          }

          // Check scientific notation e.g. 5e-6 -> 10^{-6}
          const sciMatch = line.match(/(\d+)\s*e\s*(-?\d+)/i);
          if (sciMatch) {
            const exp = sciMatch[2];
            if (secText.includes(`10^{${exp}}`) || secText.includes(`10^${exp}`)) {
              score += 30;
            }
          }

          if (score > bestScore && score >= 15) {
            bestScore = score;
            bestQ = sec.qNum;
          }
        }

        if (bestQ !== null) {
          return `${line}  [Check Q${bestQ}]`;
        }
        return line;
      });
    }
  }

  return {
    hasStructure: true,
    title,
    dateStr,
    marginNote,
    mainWork,
    roughWork,
  };
}

export function normalizeChooseSyntax(input: string): string {
  let result = '';
  let i = 0;
  while (i < input.length) {
    if (input[i] === '{' && !isEscapedChar(input, i)) {
      const b = extractBalanced(input, i, '{', '}');
      if (b) {
        const innerNormalized = normalizeChooseSyntax(b.inner);
        // Find top-level \choose inside b.inner
        let depth = 0;
        let chooseIdx = -1;
        for (let k = 0; k < innerNormalized.length; k++) {
          if (isEscapedChar(innerNormalized, k)) continue;
          if (innerNormalized[k] === '{') depth++;
          else if (innerNormalized[k] === '}') depth--;
          else if (
            depth === 0 &&
            innerNormalized.startsWith('\\choose', k) &&
            !/^[a-zA-Z]/.test(innerNormalized.slice(k + 7))
          ) {
            chooseIdx = k;
            break;
          }
        }
        if (chooseIdx !== -1) {
          const top = innerNormalized.slice(0, chooseIdx).trim();
          const bot = innerNormalized.slice(chooseIdx + 7).trim();
          result += `\\binom{${top}}{${bot}}`;
          i = b.endIndex;
          continue;
        }
        result += `{${innerNormalized}}`;
        i = b.endIndex;
        continue;
      }
    }
    result += input[i];
    i++;
  }
  return result;
}

function collapseBalancedMatrixNewlines(input: string): string {
  let out = '';
  let i = 0;
  while (i < input.length) {
    const beginMatch = input.slice(i).match(/^\\begin\{(bmatrix|pmatrix|vmatrix|cases)\}/);
    if (beginMatch) {
      const env = beginMatch[1];
      const openTag = beginMatch[0];
      const closeTag = `\\end{${env}}`;
      let depth = 1;
      let cursor = i + openTag.length;
      while (cursor < input.length && depth > 0) {
        if (input.startsWith(openTag, cursor)) {
          depth++;
          cursor += openTag.length;
        } else if (input.startsWith(closeTag, cursor)) {
          depth--;
          if (depth === 0) break;
          cursor += closeTag.length;
        } else {
          cursor++;
        }
      }
      if (depth === 0) {
        const inner = input.slice(i + openTag.length, cursor).replace(/\s*\n\s*/g, ' ');
        out += `${openTag}${inner}${closeTag}`;
        i = cursor + closeTag.length;
        continue;
      }
    }
    out += input[i];
    i++;
  }
  return out;
}

/**
 * Parses raw text from ChatGPT, Claude, or Gemini into structured notebook blocks.
 */
export function parseRawAIOutput(rawText: string): DocumentBlock[] {
  const blocks: DocumentBlock[] = [];
  if (!rawText.trim()) return blocks;

  // Filter structured prompt sections so [METADATA] and [ROUGH_WORK] don't clutter the main document flow
  const structured = extractStructuredPromptSections(rawText);
  const textToParse = structured.hasStructure ? structured.mainWork : rawText;
  if (!textToParse.trim()) return blocks;

  // 1. Normalize Windows newlines and LaTeX math delimiters FIRST so typography rules never touch math
  let preNormalized = textToParse
    .replace(/\r\n/g, '\n')
    .replace(/(?<!\\)\\\[([\s\S]*?)(?<!\\)\\\]/g, (_m, inner) => `$$\n${inner.trim()}\n$$`) // \[ ... \] to $$ ... $$
    .replace(/(?<!\\)\\\(([\s\S]*?)(?<!\\)\\\)/g, (_m, inner) => `$${inner}$`) // \( ... \) to $ ... $
    .replace(/\\begin\{aligned\*?\}([\s\S]*?)\\end\{aligned\*?\}/g, '$1')
    .replace(/\$\$([\s\S]*?)\$\$/g, (_match, inner) => {
      const stripped = inner.replace(/\\begin\{align\*?\}/g, '').replace(/\\end\{align\*?\}/g, '');
      return `$$\n${stripped.trim()}\n$$`;
    })
    .replace(/\\begin\{align\*?\}([\s\S]*?)\\end\{align\*?\}/g, (_match, inner) => {
      return `$$\n${inner.trim()}\n$$`;
    });

  // 2. Apply smart typographic punctuation to prose without touching LaTeX
  let normalized = normalizeStudentTypography(preNormalized);

  // 3. Normalize \choose syntax: {n \choose k} -> \binom{n}{k}
  normalized = normalizeChooseSyntax(normalized);

  // 4. Normalize baseline ellipses (\dots, \ldots -> ...), preserving \cdots for centered math-axis rendering
  normalized = normalized.replace(/\\(dots|ldots)(?![a-zA-Z])/g, '...');

  // Collapse newlines inside matrix/cases environments so line.split('\n') never slices them in half!
  normalized = collapseBalancedMatrixNewlines(normalized);

  // Normalize standalone or inline $$ blocks to ensure clean lines
  normalized = normalized.replace(/\$\$([\s\S]*?)\$\$/g, (_match, inner) => {
    return `\n$$\n${inner.trim()}\n$$\n`;
  });

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
      lines[i + 1].trim().match(/^\|?[\s\-:\u2013\u2014]+\|[\s\-:\u2013\u2014|]+$/)
    ) {
      const tableLines: string[] = [line];
      i += 2; // skip header and separator line
      while (i < lines.length && lines[i].trim().includes('|')) {
        tableLines.push(lines[i].trim());
        i++;
      }
      i--; // adjust loop counter

      const parseTableRow = (rawRow: string): string[] => {
        let trimmed = rawRow.trim();
        if (trimmed.startsWith('|')) trimmed = trimmed.slice(1);
        if (trimmed.endsWith('|')) trimmed = trimmed.slice(0, -1);

        const cells: string[] = [];
        let current = '';
        let inMath = false;
        for (let k = 0; k < trimmed.length; k++) {
          const ch = trimmed[k];
          if (ch === '$' && (k === 0 || trimmed[k - 1] !== '\\')) {
            inMath = !inMath;
            current += ch;
          } else if (ch === '|' && !inMath) {
            cells.push(current.trim());
            current = '';
          } else {
            current += ch;
          }
        }
        cells.push(current.trim());
        return cells;
      };

      // Parse header cells
      const headerRawCells = parseTableRow(tableLines[0]);
      const headers = headerRawCells.map((c) => tokenizeParagraphWithInlineMath(c));

      // Parse data rows
      const rows: MathToken[][][] = [];
      for (let r = 1; r < tableLines.length; r++) {
        const rawCells = parseTableRow(tableLines[r]);
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
    const boldNumMatch = line.match(
      /^(?:\*\*(?:(?:[Qq]uestion|[Pp]roblem)\s*(\d+)[:.]?|Q(\d+)[:.]?|(\d+)[\.:\)])\*\*|(?:(?:[Qq]uestion|[Pp]roblem)\s*(\d+)[:.]?|Q(\d+)[:.]?|(\d+)[\.:\)]))\s*(.*)$/
    );
    if (boldNumMatch) {
      const qNum =
        boldNumMatch[1] ||
        boldNumMatch[2] ||
        boldNumMatch[3] ||
        boldNumMatch[4] ||
        boldNumMatch[5] ||
        boldNumMatch[6];
      let remainder = boldNumMatch[7] ? boldNumMatch[7].trim() : '';

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

      const isExplicitQ = Boolean(
        boldNumMatch[1] || boldNumMatch[2] || boldNumMatch[4] || boldNumMatch[5]
      );
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

    // Alpha sub-items: e.g. (a), (b), a., a), **(a)**, **a.**, **(a) Showing ...**, **(i)**, **(b) Showing that...**
    const alphaListMatch = line.match(
      /^(?:\*\*\s*)?(?:\(([a-zA-Z]|[ivxlcdmIVXLCDM]+)\)|([a-zA-Z]|[ivxlcdmIVXLCDM]+)[.)])(?:\s*\*\*)?\s*(.*)$/
    );
    if (alphaListMatch) {
      const alphaChar = alphaListMatch[1] || alphaListMatch[2];
      let remainder = (alphaListMatch[3] || '').trim();
      remainder = remainder.replace(/^\*\*\s*/, '').replace(/[:.]?\s*\*\*[:.]?$/, ':').trim();
      if (remainder.endsWith('**')) {
        remainder = remainder.slice(0, -2).trim();
      }
      blocks.push({
        id: `blk-${++blockIdCounter}`,
        type: 'margin-item',
        prefix: `(${alphaChar})`,
        indent: 1,
        tokens: tokenizeParagraphWithInlineMath(remainder),
        rawText: line,
      });
      continue;
    }

    // Bold section / case / proof headers: e.g. **Case 1 (t = 0):**, **Step 1:**, **Claim:**, **Proof:**
    const caseHeaderMatch = line.match(
      /^\*\*(Case\s+[^:*]+|Step\s+[^:*]+|Part\s+[^:*]+|Claim|Proof|Base Case|Inductive Step)[:.]?\*\*\s*(.*)$/i
    );
    if (caseHeaderMatch) {
      const headerTitle = caseHeaderMatch[1].trim() + ':';
      const remainder = caseHeaderMatch[2].trim();
      const fullText = remainder ? `${headerTitle} ${remainder}` : headerTitle;
      blocks.push({
        id: `blk-${++blockIdCounter}`,
        type: 'paragraph',
        indent: 0,
        tokens: tokenizeParagraphWithInlineMath(fullText),
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
      if (b && line.slice(b.endIndex).trim().length === 0) {
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

  // BUG-05 & BUG-06 FIX: Flush any unclosed $$ math block at EOF
  if (inBlockMath && blockMathBuffer.length > 0) {
    processMathBlock(blockMathBuffer.join('\n'), blocks, ++blockIdCounter);
    blockMathBuffer = [];
    inBlockMath = false;
  }

  return blocks;
}

/**
 * Protects balanced matrix, cases, and substack environments from being split on \\ or stripped of &.
 */
function protectBalancedEnvironments(mathContent: string): string {
  let out = '';
  let i = 0;
  while (i < mathContent.length) {
    if (mathContent.startsWith('\\substack', i)) {
      const b = extractBalanced(mathContent, i);
      if (b) {
        const safeInner = b.inner
          .replace(/&/g, '__MATRIX_AMP__')
          .replace(/\\\\/g, '__MATRIX_SLASH__');
        out += `\\substack{${safeInner}}`;
        i = b.endIndex;
        continue;
      }
    }
    const beginMatch = mathContent.slice(i).match(/^\\begin\{(bmatrix|pmatrix|vmatrix|cases)\}/);
    if (beginMatch) {
      const env = beginMatch[1];
      const openTag = beginMatch[0];
      const closeTag = `\\end{${env}}`;
      let depth = 1;
      let cursor = i + openTag.length;
      while (cursor < mathContent.length && depth > 0) {
        if (mathContent.startsWith(openTag, cursor)) {
          depth++;
          cursor += openTag.length;
        } else if (mathContent.startsWith(closeTag, cursor)) {
          depth--;
          if (depth === 0) break;
          cursor += closeTag.length;
        } else {
          cursor++;
        }
      }
      if (depth === 0) {
        const inner = mathContent
          .slice(i + openTag.length, cursor)
          .replace(/&/g, '__MATRIX_AMP__')
          .replace(/\\\\/g, '__MATRIX_SLASH__');
        out += `${openTag}${inner}${closeTag}`;
        i = cursor + closeTag.length;
        continue;
      }
    }
    out += mathContent[i];
    i++;
  }
  return out;
}

/**
 * Splits LaTeX block derivations into ruled-line steps with student prefixes.
 */
function processMathBlock(mathContent: string, blocks: DocumentBlock[], baseId: number) {
  // Protect matrix, cases, and substack environments from being split on \\ or stripped of &
  const protectedMath = protectBalancedEnvironments(mathContent);

  // Split on double backslash \\ (supporting optional spacing argument like \\[6pt])
  const rawSteps = protectedMath.split(/\\\\(?:\s*\[[^\]]*\])?/g);

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
      if (b && cleanStep.slice(b.endIndex).trim().length === 0) {
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

    const startsWithEquals = cleanStep.startsWith('=');
    const isContinuation =
      startsWithEquals ||
      cleanStep.startsWith('\\implies') ||
      cleanStep.startsWith('\\therefore');

    const prefix = cleanStep.startsWith('\\therefore')
      ? '∴'
      : cleanStep.startsWith('\\implies')
      ? '⇒'
      : startsWithEquals || stepIdx === 0
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
  const tokens: MathToken[] = [];
  if (!text) return tokens;

  // 1. Mask math blocks ($$...$$ and $...$) so markdown regexes never touch LaTeX inside math
  const mathPlaceholders: string[] = [];
  const placeholderPrefix = '___MATH_TOKEN_';
  const maskedText = text.replace(/(?<!\\)(\$\$[\s\S]+?\$\$|\$(?:\\.|[^\$\\])+\$)/g, (match) => {
    const idx = mathPlaceholders.length;
    mathPlaceholders.push(match);
    return `${placeholderPrefix}${idx}___`;
  });

  // 2. Clean markdown bold (**text**) and italics (*text*) across prose and unescape \$
  let cleanedProse = maskedText
    .replace(/\\(\$)/g, '$1')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*([^\s*][^*]*?)\*/g, '$1')
    .replace(/\*\*/g, ''); // Strip any stray orphan asterisks left over

  // 3. Split by placeholder pattern
  const placeholderRegex = new RegExp(`(${placeholderPrefix}\\d+___)`, 'g');
  const segments = cleanedProse.split(placeholderRegex);

  for (const seg of segments) {
    if (!seg) continue;
    const match = seg.match(new RegExp(`^${placeholderPrefix}(\\d+)___$`));
    if (match) {
      const mathRaw = mathPlaceholders[parseInt(match[1], 10)];
      if (mathRaw.startsWith('$$') && mathRaw.endsWith('$$') && mathRaw.length >= 4) {
        tokens.push(...parseLatexExpressionTokens(mathRaw.slice(2, -2).trim()));
      } else if (mathRaw.startsWith('$') && mathRaw.endsWith('$') && mathRaw.length >= 2) {
        tokens.push(...parseLatexExpressionTokens(mathRaw.slice(1, -1)));
      }
    } else {
      const subParts = seg.split(/(\s+)/);
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

function matchesLatexMacro(expr: string, index: number, macro: string): boolean {
  if (!expr.startsWith(macro, index)) return false;
  const nextChar = expr[index + macro.length];
  return !nextChar || !/[a-zA-Z]/.test(nextChar);
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
    '\\limsup',
    '\\liminf',
    '\\lim',
    '\\argmax',
    '\\argmin',
    '\\max',
    '\\min',
    '\\sup',
    '\\inf',
    '\\ln',
    '\\log',
    '\\exp',
    '\\det',
    '\\gcd',
    '\\lcm',
    '\\deg',
    '\\dim',
    '\\ker',
    '\\hom',
    '\\arg',
    '\\Pr',
    '\\rank',
    '\\diag',
    '\\trace',
    '\\tr',
    '\\cov',
    '\\var',
    '\\bias',
    '\\corr',
  ];

  // Greek letter map
  const GREEK_MAP: Record<string, string> = {
    '\\Gamma': 'Γ',
    '\\Lambda': 'Λ',
    '\\Sigma': 'Σ',
    '\\Phi': 'Φ',
    '\\Psi': 'Ψ',
    '\\Theta': 'Θ',
    '\\Omega': 'Ω',
    '\\alpha': 'α',
    '\\beta': 'β',
    '\\gamma': 'γ',
    '\\delta': 'δ',
    '\\Delta': 'Δ',
    '\\epsilon': 'ε',
    '\\varepsilon': 'ε',
    '\\zeta': 'ζ',
    '\\eta': 'η',
    '\\theta': 'θ',
    '\\vartheta': 'θ',
    '\\iota': 'ι',
    '\\kappa': 'κ',
    '\\lambda': 'λ',
    '\\mu': 'μ',
    '\\nu': 'ν',
    '\\xi': 'ξ',
    '\\pi': 'π',
    '\\rho': 'ρ',
    '\\sigma': 'σ',
    '\\tau': 'τ',
    '\\upsilon': 'υ',
    '\\phi': 'φ',
    '\\varphi': 'φ',
    '\\chi': 'χ',
    '\\psi': 'ψ',
    '\\omega': 'ω',
  };

  while (i < expr.length) {
    // 1. Whitespace
    if (expr[i] === ' ' || expr[i] === '\t') {
      tokens.push({ type: 'space', widthMultiplier: 1 });
      i++;
      continue;
    }

    // 2. Matrix environments: \begin{bmatrix}, \begin{pmatrix}, \begin{vmatrix}, \begin{cases}
    const matrixMatch = expr.slice(i).match(/^\\begin\{(bmatrix|pmatrix|vmatrix|cases)\}/);
    if (matrixMatch) {
      const env = matrixMatch[1];
      const openTag = matrixMatch[0];
      const closeTag = `\\end{${env}}`;
      let depth = 1;
      let cursor = i + openTag.length;
      while (cursor < expr.length && depth > 0) {
        if (expr.startsWith(openTag, cursor)) {
          depth++;
          cursor += openTag.length;
        } else if (expr.startsWith(closeTag, cursor)) {
          depth--;
          if (depth === 0) break;
          cursor += closeTag.length;
        } else {
          cursor++;
        }
      }
      if (depth === 0) {
        const inner = expr.slice(i + openTag.length, cursor);
        const bracketType: 'b' | 'p' | 'v' | 'cases' =
          env === 'bmatrix' ? 'b' : env === 'pmatrix' ? 'p' : env === 'vmatrix' ? 'v' : 'cases';

        const unescapedInner = inner
          .replace(/__MATRIX_SLASH__/g, '\\\\')
          .replace(/__MATRIX_AMP__/g, '&');
        const rawRows = unescapedInner.split(/\\\\(?:\s*\[[^\]]*\])?/g);
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
        i = cursor + closeTag.length;
        continue;
      }
    }

    // Vectors and Blackboard Bold: \vec{...}, \overrightarrow{...}, \mathbb{...}
    if (matchesLatexMacro(expr, i, '\\vec') || matchesLatexMacro(expr, i, '\\overrightarrow')) {
      const b = extractBalanced(expr, i);
      if (b) {
        tokens.push({
          type: 'script',
          base: parseLatexExpressionTokens(b.inner),
          sup: [{ type: 'operator', symbol: '\\vec' }],
        });
        i = b.endIndex;
        continue;
      }
    }
    if (matchesLatexMacro(expr, i, '\\mathbb')) {
      const b = extractBalanced(expr, i);
      if (b) {
        tokens.push({ type: 'text', text: b.inner });
        i = b.endIndex;
        continue;
      }
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

    // 3. Substack: \substack{line1 \\ line2}
    if (expr.startsWith('\\substack', i)) {
      const b = extractBalanced(expr, i);
      if (b) {
        const unescapedInner = b.inner
          .replace(/__MATRIX_SLASH__/g, '\\\\')
          .replace(/__MATRIX_AMP__/g, '&');
        const subLines = unescapedInner.split(/\\\\/g).map((s) => s.trim()).filter(Boolean);
        const subTokens: MathToken[] = [];
        for (let sIdx = 0; sIdx < subLines.length; sIdx++) {
          if (sIdx > 0) {
            subTokens.push({ type: 'text', text: ', ' });
          }
          subTokens.push(...parseLatexExpressionTokens(subLines[sIdx]));
        }
        tokens.push(...subTokens);
        i = b.endIndex;
        continue;
      }
    }

    // 3b. Boxed final answer: \boxed{...}
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

    // 5. Square Root: \sqrt{...}, \sqrt[n]{...}, or unbraced \sqrt x
    if (matchesLatexMacro(expr, i, '\\sqrt')) {
      let rootIdx = i + 5;
      while (rootIdx < expr.length && (expr[rootIdx] === ' ' || expr[rootIdx] === '\t')) rootIdx++;
      let degree: string | undefined;
      if (expr[rootIdx] === '[') {
        const optB = extractBalanced(expr, rootIdx, '[', ']');
        if (optB) {
          degree = optB.inner;
          rootIdx = optB.endIndex;
        }
      }
      while (rootIdx < expr.length && (expr[rootIdx] === ' ' || expr[rootIdx] === '\t')) rootIdx++;
      const b = extractBalanced(expr, rootIdx);
      if (b) {
        tokens.push({
          type: 'root',
          content: parseLatexExpressionTokens(b.inner),
          index: degree,
        });
        i = b.endIndex;
        continue;
      } else if (rootIdx < expr.length) {
        // Handle unbraced single-token radicand: e.g. \sqrt 2 or \sqrt\pi
        const singleMatch = expr.slice(rootIdx).match(/^(\\[a-zA-Z]+|[0-9a-zA-Z])/);
        if (singleMatch) {
          tokens.push({
            type: 'root',
            content: parseLatexExpressionTokens(singleMatch[1]),
            index: degree,
          });
          i = rootIdx + singleMatch[1].length;
          continue;
        }
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

    // Vertical evaluation bar: \left\vert, \right\vert, \vert, \lvert, \rvert, \Big|, \Bigg|, etc.
    if (matchesLatexMacro(expr, i, '\\left\\lvert') || matchesLatexMacro(expr, i, '\\right\\rvert')) {
      tokens.push({ type: 'delimiter', char: '|', isBig: true });
      i += expr.startsWith('\\left\\lvert', i) ? 11 : 12;
      continue;
    }
    if (matchesLatexMacro(expr, i, '\\lvert') || matchesLatexMacro(expr, i, '\\rvert')) {
      tokens.push({ type: 'delimiter', char: '|' });
      i += 6;
      continue;
    }
    const sizedDelimMatch = expr.slice(i).match(/^\\(?:Big|Bigg|bigg|big)[lr]?(?:\\(l?vert|r?vert|[{}])|([()\[\]|.]))/);
    if (sizedDelimMatch) {
      const macroSym = sizedDelimMatch[1];
      const rawSym = sizedDelimMatch[2];
      if (rawSym === '.') {
        i += sizedDelimMatch[0].length;
        continue;
      }
      const dChar = (
        macroSym === 'vert' || macroSym === 'lvert' || macroSym === 'rvert'
          ? '|'
          : macroSym || rawSym
      ) as '(' | ')' | '[' | ']' | '{' | '}' | '|';
      tokens.push({ type: 'delimiter', char: dChar, isBig: true });
      i += sizedDelimMatch[0].length;
      continue;
    }
    if (expr.startsWith('\\left\\vert', i)) {
      tokens.push({ type: 'delimiter', char: '|', isBig: true });
      i += 10;
      continue;
    }
    if (expr.startsWith('\\right\\vert', i)) {
      tokens.push({ type: 'delimiter', char: '|', isBig: true });
      i += 11;
      continue;
    }
    if (expr.startsWith('\\vert', i)) {
      tokens.push({ type: 'delimiter', char: '|' });
      i += 5;
      continue;
    }

    if (expr.startsWith('\\left(', i)) {
      tokens.push({ type: 'delimiter', char: '(', isBig: true });
      i += 6;
      continue;
    }
    if (expr.startsWith('\\right)', i)) {
      tokens.push({ type: 'delimiter', char: ')', isBig: true });
      i += 7;
      continue;
    }
    if (expr.startsWith('\\left[', i)) {
      tokens.push({ type: 'delimiter', char: '[', isBig: true });
      i += 6;
      continue;
    }
    if (expr.startsWith('\\right]', i)) {
      tokens.push({ type: 'delimiter', char: ']', isBig: true });
      i += 7;
      continue;
    }
    if (expr.startsWith('\\left\\{', i)) {
      tokens.push({ type: 'delimiter', char: '{', isBig: true });
      i += 7;
      continue;
    }
    if (expr.startsWith('\\right\\}', i)) {
      tokens.push({ type: 'delimiter', char: '}', isBig: true });
      i += 8;
      continue;
    }
    if (expr.startsWith('\\{', i)) {
      tokens.push({ type: 'delimiter', char: '{' });
      i += 2;
      continue;
    }
    if (expr.startsWith('\\}', i)) {
      tokens.push({ type: 'delimiter', char: '}' });
      i += 2;
      continue;
    }
    if (expr.startsWith('\\left|', i) || expr.startsWith('\\right|', i)) {
      tokens.push({ type: 'delimiter', char: '|', isBig: true });
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
        const innerTokens = b.inner.length > 0 ? parseLatexExpressionTokens(b.inner) : [];
        let nextIdx = b.endIndex;
        while (nextIdx < expr.length && (expr[nextIdx] === ' ' || expr[nextIdx] === '\t')) nextIdx++;
        if (nextIdx < expr.length && (expr[nextIdx] === '^' || expr[nextIdx] === '_') && innerTokens.length > 1) {
          tokens.push({ type: 'script', base: innerTokens });
        } else {
          // Detect set literals e.g. {1, ..., n}, {\omega : \tau \le t}, or sets following \in, =
          const lastTok = tokens[tokens.length - 1];
          const isAfterSetRel =
            lastTok &&
            lastTok.type === 'operator' &&
            ['∈', '∉', '=', '⊆', '⊇', '⊂', '⊃', '∪', '∩'].includes(lastTok.symbol);
          const hasSetPunct =
            b.inner.includes(',') ||
            b.inner.includes(':') ||
            b.inner.includes(';') ||
            b.inner.includes('|') ||
            b.inner.includes('\\mid');

          if (isAfterSetRel || hasSetPunct) {
            tokens.push({ type: 'delimiter', char: '{' });
            tokens.push(...innerTokens);
            tokens.push({ type: 'delimiter', char: '}' });
          } else {
            tokens.push(...innerTokens);
          }
        }
        i = b.endIndex;
        continue;
      }
    }

    if (expr[i] === '}') {
      tokens.push({ type: 'delimiter', char: '}' });
      i++;
      continue;
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
      const readScriptArg = (): string => {
        while (i < expr.length && (expr[i] === ' ' || expr[i] === '\t')) i++;
        if (i >= expr.length) return '';
        if (expr[i] === '{') {
          const b = extractBalanced(expr, i);
          if (b) {
            i = b.endIndex;
            return b.inner;
          }
        }
        if (expr[i] === '\\') {
          const macroMatch = expr.slice(i).match(/^(\\[a-zA-Z]+)/);
          if (macroMatch) {
            i += macroMatch[1].length;
            return macroMatch[1];
          }
        }
        if (expr[i] === '-' && i + 1 < expr.length && /[0-9a-zA-Z]/.test(expr[i + 1])) {
          const val = '-' + expr[i + 1];
          i += 2;
          return val;
        }
        return expr[i++];
      };

      const isSup = expr[i] === '^';
      i++;
      const scriptInner = readScriptArg();

      let secondScriptInner: string | undefined;
      let isSecondSup = false;
      let lookahead = i;
      while (lookahead < expr.length && (expr[lookahead] === ' ' || expr[lookahead] === '\t')) lookahead++;
      if (lookahead < expr.length && (expr[lookahead] === '^' || expr[lookahead] === '_') && (expr[lookahead] === '^') !== isSup) {
        i = lookahead;
        isSecondSup = expr[i] === '^';
        i++;
        secondScriptInner = readScriptArg();
      }

      // Determine base from previous token (ignore trailing space)
      while (tokens.length > 0 && tokens[tokens.length - 1].type === 'space') {
        tokens.pop();
      }
      const lastToken = tokens[tokens.length - 1];
      let base: string | MathToken[] = '';
      let isBigDelimiter = false;
      if (lastToken) {
        if (lastToken.type === 'text') {
          if (lastToken.isFunction || lastToken.text.length <= 1) {
            // Keep entire function name (e.g. sin, cos, lim, ln) or single char as base
            base = lastToken.text;
            tokens.pop();
          } else {
            base = lastToken.text.slice(-1);
            lastToken.text = lastToken.text.slice(0, -1);
          }
        } else if (lastToken.type === 'delimiter') {
          // Closing delimiter: DO NOT pop the delimiter from tokens!
          // Use empty base so the script attaches directly to the right of the closing delimiter
          base = '';
          isBigDelimiter = Boolean(lastToken.isBig);
        } else if (lastToken.type === 'operator') {
          base = lastToken.symbol;
          tokens.pop();
        } else if (
          lastToken.type === 'script' &&
          !lastToken[isSup ? 'sup' : 'sub'] &&
          secondScriptInner === undefined
        ) {
          lastToken[isSup ? 'sup' : 'sub'] = parseLatexExpressionTokens(scriptInner);
          continue;
        } else {
          // Composite token ('fraction', 'root', 'matrix', 'boxed', 'big-op', 'script')
          base = [tokens.pop()!];
        }
      }

      const scriptToken: MathScript = {
        type: 'script',
        base,
        [isSup ? 'sup' : 'sub']: parseLatexExpressionTokens(scriptInner),
        ...(isBigDelimiter ? { isBigDelimiter: true } : {}),
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
      if (matchesLatexMacro(expr, i, fn)) {
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
    if (matchesLatexMacro(expr, i, '\\mathcal')) {
      const b = extractBalanced(expr, i);
      if (b) {
        tokens.push({ type: 'text', text: b.inner });
        i = b.endIndex;
        continue;
      }
    }

    // 10. Greek Delta & Vector Nabla (Procedural Hand-Drawn Math Symbols)
    if (matchesLatexMacro(expr, i, '\\Delta') || expr[i] === 'Δ') {
      tokens.push({ type: 'operator', symbol: 'Δ' });
      i += matchesLatexMacro(expr, i, '\\Delta') ? 6 : 1;
      continue;
    }
    if (matchesLatexMacro(expr, i, '\\nabla') || expr[i] === '∇') {
      tokens.push({ type: 'operator', symbol: '∇' });
      i += matchesLatexMacro(expr, i, '\\nabla') ? 6 : 1;
      continue;
    }

    // 11. Text blocks: \text{...}, \mathrm{...}, \mathbf{...}
    if (
      matchesLatexMacro(expr, i, '\\text') ||
      matchesLatexMacro(expr, i, '\\mathrm') ||
      matchesLatexMacro(expr, i, '\\mathbf')
    ) {
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
      if (matchesLatexMacro(expr, i, cmd)) {
        if (cmd === '\\Gamma') {
          tokens.push({ type: 'operator', symbol: 'Γ' });
        } else {
          tokens.push({ type: 'text', text: unicode });
        }
        i += cmd.length;
        matchedGreek = true;
        break;
      }
    }
    if (matchedGreek) continue;

    // 12. Big Mathematical Operators with Limits (\int, \sum, \prod, \bigcup, \bigcap)
    if (
      matchesLatexMacro(expr, i, '\\int') ||
      matchesLatexMacro(expr, i, '\\sum') ||
      matchesLatexMacro(expr, i, '\\prod') ||
      matchesLatexMacro(expr, i, '\\bigcup') ||
      matchesLatexMacro(expr, i, '\\bigcap')
    ) {
      const sym = matchesLatexMacro(expr, i, '\\int')
        ? '\\int'
        : matchesLatexMacro(expr, i, '\\sum')
        ? '\\sum'
        : matchesLatexMacro(expr, i, '\\prod')
        ? '\\prod'
        : matchesLatexMacro(expr, i, '\\bigcup')
        ? '\\bigcup'
        : '\\bigcap';
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
          symbol: sym as '\\int' | '\\sum' | '\\prod' | '\\bigcup' | '\\bigcap',
          lower,
          upper,
        });
      } else {
        tokens.push({ type: 'operator', symbol: sym });
      }
      continue;
    }

    // Explicit specific operators that have shorter prefix forms
    if (matchesLatexMacro(expr, i, '\\top')) {
      tokens.push({ type: 'operator', symbol: '⊤' });
      i += 4;
      continue;
    }
    if (matchesLatexMacro(expr, i, '\\subseteq')) {
      tokens.push({ type: 'operator', symbol: '⊆' });
      i += 9;
      continue;
    }
    if (matchesLatexMacro(expr, i, '\\supseteq')) {
      tokens.push({ type: 'operator', symbol: '⊇' });
      i += 9;
      continue;
    }
    if (matchesLatexMacro(expr, i, '\\simeq')) {
      tokens.push({ type: 'operator', symbol: '≃' });
      i += 6;
      continue;
    }

    if (matchesLatexMacro(expr, i, '\\implies') || matchesLatexMacro(expr, i, '\\Rightarrow')) {
      tokens.push({ type: 'operator', symbol: '⇒' });
      i += matchesLatexMacro(expr, i, '\\implies') ? 8 : 11;
      continue;
    }
    if (matchesLatexMacro(expr, i, '\\rightarrow') || matchesLatexMacro(expr, i, '\\to')) {
      tokens.push({ type: 'operator', symbol: '→' });
      i += matchesLatexMacro(expr, i, '\\rightarrow') ? 11 : 3;
      continue;
    }
    if (matchesLatexMacro(expr, i, '\\therefore')) {
      tokens.push({ type: 'operator', symbol: '∴' });
      i += 10;
      continue;
    }
    if (matchesLatexMacro(expr, i, '\\because')) {
      tokens.push({ type: 'operator', symbol: '∵' });
      i += 8;
      continue;
    }
    if (matchesLatexMacro(expr, i, '\\forall')) {
      tokens.push({ type: 'operator', symbol: '∀' });
      i += 7;
      continue;
    }
    if (matchesLatexMacro(expr, i, '\\exists')) {
      tokens.push({ type: 'operator', symbol: '∃' });
      i += 7;
      continue;
    }
    if (matchesLatexMacro(expr, i, '\\setminus')) {
      tokens.push({ type: 'operator', symbol: '\\' });
      i += 9;
      continue;
    }
    if (matchesLatexMacro(expr, i, '\\mid')) {
      tokens.push({ type: 'delimiter', char: '|' });
      i += 4;
      continue;
    }
    if (matchesLatexMacro(expr, i, '\\mapsto')) {
      tokens.push({ type: 'operator', symbol: '↦' });
      i += 7;
      continue;
    }
    if (matchesLatexMacro(expr, i, '\\uparrow')) {
      tokens.push({ type: 'operator', symbol: '↑' });
      i += 8;
      continue;
    }
    if (matchesLatexMacro(expr, i, '\\downarrow')) {
      tokens.push({ type: 'operator', symbol: '↓' });
      i += 10;
      continue;
    }
    if (matchesLatexMacro(expr, i, '\\emptyset')) {
      tokens.push({ type: 'operator', symbol: '∅' });
      i += 8;
      continue;
    }
    if (matchesLatexMacro(expr, i, '\\varnothing')) {
      tokens.push({ type: 'operator', symbol: '∅' });
      i += 10;
      continue;
    }
    if (matchesLatexMacro(expr, i, '\\wedge') || matchesLatexMacro(expr, i, '\\land')) {
      tokens.push({ type: 'operator', symbol: '∧' });
      i += matchesLatexMacro(expr, i, '\\wedge') ? 6 : 5;
      continue;
    }
    if (matchesLatexMacro(expr, i, '\\vee') || matchesLatexMacro(expr, i, '\\lor')) {
      tokens.push({ type: 'operator', symbol: '∨' });
      i += 4;
      continue;
    }
    if (matchesLatexMacro(expr, i, '\\equiv')) {
      tokens.push({ type: 'operator', symbol: '≡' });
      i += 6;
      continue;
    }
    if (matchesLatexMacro(expr, i, '\\perp')) {
      tokens.push({ type: 'operator', symbol: '⊥' });
      i += 5;
      continue;
    }
    if (matchesLatexMacro(expr, i, '\\parallel')) {
      tokens.push({ type: 'operator', symbol: '∥' });
      i += 9;
      continue;
    }
    if (matchesLatexMacro(expr, i, '\\propto')) {
      tokens.push({ type: 'operator', symbol: '∝' });
      i += 7;
      continue;
    }
    if (matchesLatexMacro(expr, i, '\\circ')) {
      tokens.push({ type: 'operator', symbol: '∘' });
      i += 5;
      continue;
    }
    if (matchesLatexMacro(expr, i, '\\neg')) {
      tokens.push({ type: 'operator', symbol: '¬' });
      i += 4;
      continue;
    }
    if (matchesLatexMacro(expr, i, '\\supset')) {
      tokens.push({ type: 'operator', symbol: '⊃' });
      i += 7;
      continue;
    }
    if (matchesLatexMacro(expr, i, '\\subset')) {
      tokens.push({ type: 'operator', symbol: '⊂' });
      i += 7;
      continue;
    }
    if (matchesLatexMacro(expr, i, '\\cup')) {
      tokens.push({ type: 'operator', symbol: '∪' });
      i += 4;
      continue;
    }
    if (matchesLatexMacro(expr, i, '\\cap')) {
      tokens.push({ type: 'operator', symbol: '∩' });
      i += 4;
      continue;
    }
    if (matchesLatexMacro(expr, i, '\\neq') || (matchesLatexMacro(expr, i, '\\ne'))) {
      tokens.push({ type: 'operator', symbol: '≠' });
      i += matchesLatexMacro(expr, i, '\\neq') ? 4 : 3;
      continue;
    }
    if (matchesLatexMacro(expr, i, '\\approx')) {
      tokens.push({ type: 'operator', symbol: '≈' });
      i += 7;
      continue;
    }
    if (matchesLatexMacro(expr, i, '\\sim')) {
      tokens.push({ type: 'operator', symbol: '∼' });
      i += 4;
      continue;
    }
    if (matchesLatexMacro(expr, i, '\\hat')) {
      const afterHat = i + 4;
      let inner = '';
      let nextIdx = afterHat;
      if (expr[afterHat] === '{') {
        const b = extractBalanced(expr, afterHat);
        if (b) {
          inner = b.inner;
          nextIdx = b.endIndex;
        }
      } else if (afterHat < expr.length) {
        const matchSingle = expr.slice(afterHat).match(/^\s*([a-zA-Z])/);
        if (matchSingle) {
          inner = matchSingle[1];
          nextIdx = afterHat + matchSingle[0].length;
        }
      }
      if (inner) {
        tokens.push({
          type: 'script',
          base: parseLatexExpressionTokens(inner),
          sup: [{ type: 'operator', symbol: '^' }],
        });
        i = nextIdx;
        continue;
      }
    }
    if (matchesLatexMacro(expr, i, '\\pm')) {
      tokens.push({ type: 'operator', symbol: '±' });
      i += 3;
      continue;
    }
    if (matchesLatexMacro(expr, i, '\\mp')) {
      tokens.push({ type: 'operator', symbol: '∓' });
      i += 3;
      continue;
    }
    if (matchesLatexMacro(expr, i, '\\cdots')) {
      tokens.push({ type: 'operator', symbol: '\\cdots' });
      i += 6;
      continue;
    }
    if (matchesLatexMacro(expr, i, '\\cdot')) {
      tokens.push({ type: 'operator', symbol: '·' });
      i += 5;
      continue;
    }
    if (matchesLatexMacro(expr, i, '\\dots') || matchesLatexMacro(expr, i, '\\ldots')) {
      tokens.push({ type: 'operator', symbol: '\\dots' });
      i += matchesLatexMacro(expr, i, '\\ldots') ? 6 : 5;
      continue;
    }
    if (expr.startsWith('...', i)) {
      tokens.push({ type: 'operator', symbol: '...' });
      i += 3;
      continue;
    }
    if (matchesLatexMacro(expr, i, '\\times')) {
      tokens.push({ type: 'operator', symbol: '×' });
      i += 6;
      continue;
    }
    if (matchesLatexMacro(expr, i, '\\partial')) {
      tokens.push({ type: 'operator', symbol: '∂' });
      i += 8;
      continue;
    }
    if (matchesLatexMacro(expr, i, '\\nabla')) {
      tokens.push({ type: 'operator', symbol: '∇' });
      i += 6;
      continue;
    }
    if (matchesLatexMacro(expr, i, '\\infty')) {
      tokens.push({ type: 'operator', symbol: '∞' });
      i += 6;
      continue;
    }
    if (matchesLatexMacro(expr, i, '\\hbar')) {
      tokens.push({ type: 'text', text: 'ℏ' });
      i += 5;
      continue;
    }
    if (matchesLatexMacro(expr, i, '\\in')) {
      tokens.push({ type: 'operator', symbol: '∈' });
      i += 3;
      continue;
    }
    if (matchesLatexMacro(expr, i, '\\notin')) {
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
    if (matchesLatexMacro(expr, i, '\\prime')) {
      tokens.push({ type: 'operator', symbol: "'" });
      i += 6;
      continue;
    }
    if (matchesLatexMacro(expr, i, '\\leq') || matchesLatexMacro(expr, i, '\\le')) {
      tokens.push({ type: 'operator', symbol: '≤' });
      i += matchesLatexMacro(expr, i, '\\leq') ? 4 : 3;
      continue;
    }
    if (matchesLatexMacro(expr, i, '\\geq') || matchesLatexMacro(expr, i, '\\ge')) {
      tokens.push({ type: 'operator', symbol: '≥' });
      i += matchesLatexMacro(expr, i, '\\geq') ? 4 : 3;
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
    if (expr[i] === '/') {
      tokens.push({ type: 'operator', symbol: '/' });
      i++;
      continue;
    }

    // 13. General alphanumeric words / symbols
    let nextI = i + 1;
    while (
      nextI < expr.length &&
      !expr[nextI].match(/[\s\^_{}=\+\-\\\(\)\[\]\|\/]/)
    ) {
      nextI++;
    }

    const chunk = expr.slice(i, nextI);
    // Never output a raw literal backslash into canvas text!
    const cleanChunk = chunk.startsWith('\\') ? chunk.replace(/^\\+/, '') : chunk;
    if (cleanChunk.length > 0) {
      tokens.push({ type: 'text', text: cleanChunk });
    }
    i = nextI;
  }

  return tokens;
}
