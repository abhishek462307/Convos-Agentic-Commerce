import { prepare, layout, type PreparedText } from '@chenglou/pretext';

// Cache prepared text objects to avoid re-segmenting/measuring same strings
// Pretext is extremely fast, but caching avoids redundant work on re-renders
const textCache = new Map<string, PreparedText>();

export interface MeasurementOptions {
  fontSize?: string;
  fontFamily?: string;
  lineHeight?: number;
  maxWidth: number;
  verticalPadding?: number;
}

/**
 * Calculates the precise height of a multiline text block using @chenglou/pretext.
 * This side-steps the DOM and layout reflows, making it suitable for 
 * performance-critical areas like virtualized lists and real-time streaming.
 */
export function calculateTextHeight(
  text: string,
  options: MeasurementOptions
): number {
  if (!text) return 0;

  const {
    fontSize = '13px',
    fontFamily = 'Inter, sans-serif',
    lineHeight = 21.5, // Default for leading-relaxed (approx 1.65)
    maxWidth,
    verticalPadding = 20 // Default for our chat bubble padding
  } = options;

  const font = `${fontSize} ${fontFamily}`;
  const cacheKey = `${text}_${font}`;

  let prepared = textCache.get(cacheKey);
  if (!prepared) {
    try {
      prepared = prepare(text, font);
      textCache.set(cacheKey, prepared);
    } catch (err) {
      // Fallback: rough estimate if pretext fails
      return (text.length / (maxWidth / 8)) * lineHeight + verticalPadding;
    }
  }

  try {
    const result = layout(prepared, maxWidth, lineHeight);
    return result.height + verticalPadding;
  } catch (err) {
    return lineHeight + verticalPadding;
  }
}

/**
 * Clears the text measurement cache to free up memory if needed.
 */
export function clearMeasurementCache() {
  textCache.clear();
}
