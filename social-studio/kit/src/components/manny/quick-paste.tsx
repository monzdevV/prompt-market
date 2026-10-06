"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight } from "lucide-react";

/** Pega un enlace y salta a «Copiar» con el análisis ya en marcha. */
export function QuickPaste() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const valid = /^https?:\/\/\S+$/i.test(url.trim());
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (valid) router.push(`/manny/copiar?url=${encodeURIComponent(url.trim())}&go=1`);
      }}
      className="flex flex-col gap-2 sm:flex-row"
    >
      <label htmlFor="quick-url" className="sr-only">
        Enlace de un TikTok o un Short de YouTube
      </label>
      <input id="quick-url" type="url" inputMode="url" autoComplete="off" spellCheck={false} value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Pega aquí el enlace de un TikTok o un Short" className="input h-11 flex-1" />
      <button type="submit" disabled={!valid} className="btn-primary h-11 px-5">
        Dame mis versiones <ArrowRight size={15} aria-hidden />
      </button>
    </form>
  );
}
