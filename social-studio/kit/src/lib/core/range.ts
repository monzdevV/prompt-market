const CHUNK = 2 * 1024 * 1024;

/** Interpreta "bytes=a-b", "bytes=a-" y "bytes=-n". null si no es satisfacible. */
export function parseRange(header: string, size: number): { start: number; end: number } | null {
  const m = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!m || (!m[1] && !m[2]) || size === 0) return null;
  let start: number;
  let end: number;
  if (!m[1]) {
    start = Math.max(0, size - Number(m[2]));
    end = size - 1;
  } else {
    start = Number(m[1]);
    end = m[2] ? Math.min(Number(m[2]), size - 1) : Math.min(start + CHUNK - 1, size - 1);
  }
  if (start > end || start >= size) return null;
  return { start, end };
}
