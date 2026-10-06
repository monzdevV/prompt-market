"use client";

import { Film } from "lucide-react";
import { useState } from "react";

/** Miniatura vertical de un vídeo. Los enlaces de TikTok caducan: si no carga, se queda el hueco con un icono. */
export function Thumb({ src, className = "h-16 w-9" }: { src: string | null; className?: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <span className={`relative grid shrink-0 place-items-center overflow-hidden rounded-md bg-surface-2 ring-1 ring-line ${className}`}>
      {src && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element -- miniatura externa que caduca; no tiene sentido optimizarla
        <img src={src} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(true)} className="h-full w-full object-cover" />
      ) : (
        <Film size={14} aria-hidden className="text-faint" />
      )}
    </span>
  );
}
