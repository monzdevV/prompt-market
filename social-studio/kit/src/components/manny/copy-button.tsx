"use client";

import { Check, Copy } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

/** Copia al portapapeles; si el navegador no deja, prueba con el método antiguo. */
export async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.cssText = "position:fixed;opacity:0;pointer-events:none";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      ta.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

/**
 * Botón de copiar. Las dos etiquetas ocupan el mismo sitio para que el botón no cambie de ancho
 * al pasar a «Copiado».
 */
export function CopyButton({
  text,
  label = "Copiar",
  copiedLabel = "Copiado",
  className = "btn-ghost btn-sm",
  ariaLabel,
}: {
  text: string | (() => string);
  label?: string;
  copiedLabel?: string;
  className?: string;
  ariaLabel?: string;
}) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  async function copy() {
    const ok = await copyToClipboard(typeof text === "function" ? text() : text);
    if (!ok) return void toast.error("No he podido copiar. Selecciona el texto y cópialo a mano.");
    setCopied(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 1600);
  }

  const swap = "col-start-1 row-start-1 inline-flex items-center gap-1.5 transition-[opacity,transform,filter] duration-200 [transition-timing-function:var(--ease)]";
  return (
    <button type="button" onClick={copy} className={className} aria-label={ariaLabel ?? label}>
      <span className="inline-grid">
        <span aria-hidden={copied} className={`${swap} ${copied ? "scale-90 opacity-0 blur-[2px]" : ""}`}>
          <Copy size={13} aria-hidden /> {label}
        </span>
        <span aria-hidden={!copied} className={`${swap} text-ok ${copied ? "" : "scale-90 opacity-0 blur-[2px]"}`}>
          <Check size={13} aria-hidden /> {copiedLabel}
        </span>
      </span>
      <span className="sr-only" role="status">
        {copied ? copiedLabel : ""}
      </span>
    </button>
  );
}
