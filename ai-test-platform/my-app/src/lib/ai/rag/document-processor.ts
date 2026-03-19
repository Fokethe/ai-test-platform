export interface DocumentProcessOptions {
  targetChunkSize: number;
  minChunkSize: number;
  overlapSentences: number;
  maxChunks: number;
}

export interface SemanticChunk {
  index: number;
  content: string;
  tokenCount: number;
  sentenceCount: number;
  startOffset: number;
  endOffset: number;
}

export interface DocumentProcessResult {
  id: number;
  chunks: string[];
  units: SemanticChunk[];
  totalTokens: number;
  qualityScore: number;
  processedAt: Date;
}

interface SentenceUnit {
  text: string;
  startOffset: number;
  endOffset: number;
}

const DEFAULT_OPTIONS: DocumentProcessOptions = {
  targetChunkSize: 500,
  minChunkSize: 150,
  overlapSentences: 1,
  maxChunks: 200,
};

function normalizeText(content: string): string {
  return content.replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/\t/g, ' ').trim();
}

function clamp(value: number, min: number, max: number): number {
  if (value < min) {
    return min;
  }
  if (value > max) {
    return max;
  }
  return value;
}

function estimateTokenCount(text: string): number {
  const englishTokens = text.match(/[A-Za-z0-9_]+/g)?.length ?? 0;
  const cjkChars = text.match(/[\u4e00-\u9fff]/g)?.length ?? 0;
  const otherChars = text.replace(/[A-Za-z0-9_\u4e00-\u9fff\s]/g, '').length;
  return Math.max(1, englishTokens + cjkChars + Math.ceil(otherChars * 0.5));
}

function splitSentences(normalized: string): SentenceUnit[] {
  const sentences: SentenceUnit[] = [];
  let start = 0;
  let buffer = '';

  const flush = (endIndex: number) => {
    const text = buffer.trim();
    if (!text) {
      buffer = '';
      start = endIndex;
      return;
    }

    const leadingSpaces = buffer.length - buffer.trimStart().length;
    const trailingSpaces = buffer.length - buffer.trimEnd().length;
    const sentenceStart = start + leadingSpaces;
    const sentenceEnd = endIndex - trailingSpaces;

    sentences.push({
      text,
      startOffset: sentenceStart,
      endOffset: sentenceEnd,
    });

    buffer = '';
    start = endIndex;
  };

  for (let i = 0; i < normalized.length; i += 1) {
    const char = normalized[i];
    buffer += char;

    const isBoundary =
      char === '\n' ||
      char === '.' ||
      char === '!' ||
      char === '?' ||
      char === ';' ||
      char === '。' ||
      char === '！' ||
      char === '？' ||
      char === '；';

    if (isBoundary) {
      flush(i + 1);
    }
  }

  if (buffer.trim()) {
    flush(normalized.length);
  }

  return sentences;
}

function buildChunks(sentences: SentenceUnit[], options: DocumentProcessOptions): SemanticChunk[] {
  if (sentences.length === 0) {
    return [];
  }

  const chunks: SemanticChunk[] = [];
  let cursor = 0;

  while (cursor < sentences.length && chunks.length < options.maxChunks) {
    const start = cursor;
    let end = start;
    let currentSize = 0;

    while (end < sentences.length) {
      const sentenceLength = sentences[end].text.length;
      const nextSize = currentSize + sentenceLength;
      const reachedTarget = nextSize >= options.targetChunkSize;
      const meetsMin = nextSize >= options.minChunkSize;

      currentSize = nextSize;
      end += 1;

      if (reachedTarget && meetsMin) {
        break;
      }

      if (end - start >= 8 && meetsMin) {
        break;
      }
    }

    if (end <= start) {
      end = start + 1;
    }

    const window = sentences.slice(start, end);
    const content = window.map((item) => item.text).join(' ').trim();
    const tokenCount = estimateTokenCount(content);

    chunks.push({
      index: chunks.length,
      content,
      tokenCount,
      sentenceCount: window.length,
      startOffset: window[0].startOffset,
      endOffset: window[window.length - 1].endOffset,
    });

    const nextCursor = end - options.overlapSentences;
    cursor = nextCursor > start ? nextCursor : start + 1;
  }

  return chunks;
}

function calculateQualityScore(chunks: SemanticChunk[], options: DocumentProcessOptions): number {
  if (chunks.length === 0) {
    return 0;
  }

  const avgLength = chunks.reduce((sum, chunk) => sum + chunk.content.length, 0) / chunks.length;
  const lengthScore = clamp(1 - Math.abs(avgLength - options.targetChunkSize) / options.targetChunkSize, 0, 1);
  const minLengthRatio =
    chunks.filter((chunk) => chunk.content.length >= options.minChunkSize).length / chunks.length;
  const boundaryScore =
    chunks.filter((chunk) => /[。！？!?；;.]$/.test(chunk.content.trim())).length / chunks.length;

  const score = lengthScore * 0.45 + minLengthRatio * 0.35 + boundaryScore * 0.2;
  return Number(clamp(score, 0, 1).toFixed(4));
}

function normalizeOptions(input?: Record<string, unknown>): DocumentProcessOptions {
  const targetChunkSize = Number(input?.targetChunkSize ?? input?.chunkSize ?? DEFAULT_OPTIONS.targetChunkSize);
  const minChunkSize = Number(input?.minChunkSize ?? Math.floor(targetChunkSize * 0.3));
  const overlapSentences = Number(
    input?.overlapSentences ??
      (typeof input?.chunkOverlap === 'number' && input.chunkOverlap > 0 ? 1 : DEFAULT_OPTIONS.overlapSentences)
  );
  const maxChunks = Number(input?.maxChunks ?? DEFAULT_OPTIONS.maxChunks);

  return {
    targetChunkSize: clamp(Number.isFinite(targetChunkSize) ? Math.floor(targetChunkSize) : DEFAULT_OPTIONS.targetChunkSize, 120, 4000),
    minChunkSize: clamp(Number.isFinite(minChunkSize) ? Math.floor(minChunkSize) : DEFAULT_OPTIONS.minChunkSize, 60, 2000),
    overlapSentences: clamp(
      Number.isFinite(overlapSentences) ? Math.floor(overlapSentences) : DEFAULT_OPTIONS.overlapSentences,
      0,
      3
    ),
    maxChunks: clamp(Number.isFinite(maxChunks) ? Math.floor(maxChunks) : DEFAULT_OPTIONS.maxChunks, 1, 1000),
  };
}

export class DocumentProcessor {
  async process(content: string, meta: Record<string, unknown> = {}): Promise<DocumentProcessResult> {
    const processedAt = new Date();
    const normalized = normalizeText(content || '');
    const options = normalizeOptions(meta);

    if (!normalized) {
      return {
        id: processedAt.getTime(),
        chunks: [],
        units: [],
        totalTokens: 0,
        qualityScore: 0,
        processedAt,
      };
    }

    const sentences = splitSentences(normalized);
    const units = buildChunks(sentences, options);
    const chunks = units.map((unit) => unit.content);
    const totalTokens = units.reduce((sum, unit) => sum + unit.tokenCount, 0);
    const qualityScore = calculateQualityScore(units, options);

    return {
      id: processedAt.getTime(),
      chunks,
      units,
      totalTokens,
      qualityScore,
      processedAt,
    };
  }
}
