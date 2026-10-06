"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LoaderCircle, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/client-api";

/** Pide a Manny un guion nuevo. Vacío = elige él lo que más conviene. */
export function NewScript() {
  const router = useRouter();
  const [idea, setIdea] = useState("");
  const [busy, setBusy] = useState(false);
  const [secs, setSecs] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!busy) return;
    const t = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [busy]);

  async function run(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setSecs(0);
    setError(null);
    try {
      const { id } = await api<{ id: string }>("/api/manny/scripts", { body: { idea } });
      setIdea("");
      toast.success("Guion escrito", { action: { label: "Verlo", onClick: () => router.push(`/manny/guiones#${id}`) } });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No he podido escribir el guion");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={run} aria-busy={busy}>
      <label htmlFor="new-script-idea" className="label">
        Pídele un guion a Manny
      </label>
      <textarea id="new-script-idea" rows={3} value={idea} onChange={(e) => setIdea(e.target.value)} disabled={busy} maxLength={1000} className="input resize-y" placeholder="Cuéntale la idea. Si lo dejas vacío, elige él el que más te conviene ahora." />
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button type="submit" disabled={busy} className="btn-primary h-10 px-5">
          {busy ? (
            <>
              <LoaderCircle size={15} aria-hidden className="animate-spin" /> Escribiendo…
            </>
          ) : (
            <>
              <Wand2 size={15} aria-hidden /> Escribir guion
            </>
          )}
        </button>
        {busy && (
          <p role="status" className="font-mono text-xs text-muted tabular-nums">
            Llevo {secs} s · suele tardar 30–60 s
          </p>
        )}
      </div>
      {error && (
        <p role="alert" className="mt-4 rounded-xl border border-bad/40 bg-bad-soft p-4 text-sm text-bad text-pretty">
          {error}
        </p>
      )}
    </form>
  );
}
