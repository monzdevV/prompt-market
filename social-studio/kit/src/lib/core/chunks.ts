const MB = 1024 * 1024;

/**
 * Trozos para la subida a TikTok (FILE_UPLOAD): hasta 64 MB va en uno; si no, trozos de 10 MB
 * y el último absorbe el resto (TikTok exige total_chunk_count = floor(tamaño / chunk_size)).
 */
export function tiktokChunks(size: number) {
  if (size <= 0) throw new Error("El vídeo está vacío");
  const chunkSize = size <= 64 * MB ? size : 10 * MB;
  const count = Math.floor(size / chunkSize);
  const ranges: { start: number; end: number }[] = [];
  for (let i = 0; i < count; i++) {
    ranges.push({ start: i * chunkSize, end: i === count - 1 ? size : (i + 1) * chunkSize });
  }
  return { chunkSize, count, ranges };
}
