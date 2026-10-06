"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { LoaderCircle, Plus, RefreshCw, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { ConfirmButton } from "@/components/confirm-button";
import { api } from "@/lib/client-api";
import { compact, since } from "@/lib/manny/format";

export type AccountView = {
  id: string;
  platform: "tt" | "yt";
  handle: string;
  kind: "ref" | "own";
  nickname: string;
  followers: number | null;
  grupo: string;
  syncedAt: number | null;
  syncError: string | null;
  videoCount: number;
};

const NET = { tt: "TikTok", yt: "YouTube" } as const;

/** Cuentas del radar: añadir, actualizar (una a una, con progreso) y quitar. */
export function AccountsPanel({ accounts, activeHandle, query }: { accounts: AccountView[]; activeHandle: string | null; query: Record<string, string> }) {
  const hrefFor = (handle: string | null) => `/manny/radar?${new URLSearchParams({ ...query, ...(handle ? { cuenta: handle } : {}) })}`;
  const router = useRouter();
  const [syncing, setSyncing] = useState<{ done: number; total: number; current: string } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [account, setAccount] = useState("");
  const [platform, setPlatform] = useState<"tt" | "yt">("tt");
  const stop = useRef(false);

  async function syncOne(a: Pick<AccountView, "id" | "handle">) {
    try {
      await api(`/api/manny/radar/${a.id}/sync`, { method: "POST" });
      return true;
    } catch (e) {
      toast.error(`@${a.handle}: ${e instanceof Error ? e.message : "no se pudo actualizar"}`);
      return false;
    }
  }

  async function syncAll(list: Pick<AccountView, "id" | "handle">[]) {
    stop.current = false;
    let ok = 0;
    for (let i = 0; i < list.length; i++) {
      if (stop.current) break;
      setSyncing({ done: i, total: list.length, current: list[i].handle });
      if (await syncOne(list[i])) ok++;
    }
    setSyncing(null);
    router.refresh();
    if (ok) toast.success(`${ok} ${ok === 1 ? "cuenta actualizada" : "cuentas actualizadas"}`);
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!account.trim() || adding) return;
    setAdding(true);
    try {
      const { id } = await api<{ id: string }>("/api/manny/radar", { body: { account, platform } });
      const handle = account.trim().replace(/^.*\/@/, "").replace(/^@/, "").replace(/[/?].*$/, "");
      setAccount("");
      router.refresh();
      await syncAll([{ id, handle }]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo añadir");
    } finally {
      setAdding(false);
    }
  }

  async function starter() {
    setAdding(true);
    try {
      await api("/api/manny/radar", { body: { starter: true } });
      router.refresh();
      toast.success("Cuentas añadidas. Las voy leyendo una a una; tarda un minuto.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo añadir");
    } finally {
      setAdding(false);
    }
  }

  async function remove(id: string) {
    setBusyId(id);
    try {
      await api(`/api/manny/radar/${id}`, { method: "DELETE" });
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo quitar");
    } finally {
      setBusyId(null);
    }
  }

  const neverRead = accounts.filter((a) => !a.syncedAt && !a.syncError);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="display text-3xl">Cuentas</h2>
        {accounts.length > 0 &&
          (syncing ? (
            <button type="button" className="btn-ghost btn-sm" onClick={() => (stop.current = true)}>
              Parar
            </button>
          ) : (
            <button type="button" className="btn-ghost btn-sm" disabled={adding} onClick={() => syncAll(accounts)}>
              <RefreshCw size={13} aria-hidden /> Actualizar todas
            </button>
          ))}
      </div>

      {syncing && (
        <div role="status" className="mb-3 rounded-xl border border-line bg-surface-2/60 p-3 text-sm">
          <p className="flex items-center gap-2">
            <LoaderCircle size={14} aria-hidden className="animate-spin text-accent" />
            <span>
              Leyendo <span className="font-medium">@{syncing.current}</span>
            </span>
          </p>
          <p className="mt-1 font-mono text-xs text-muted tabular-nums">
            {syncing.done} de {syncing.total}
          </p>
          <div className="mt-2 h-1 overflow-hidden rounded-full bg-surface-3" aria-hidden>
            <div className="h-full rounded-full bg-accent/80 transition-[width] duration-500 [transition-timing-function:var(--ease)]" style={{ width: `${(syncing.done / syncing.total) * 100}%` }} />
          </div>
        </div>
      )}

      {accounts.length === 0 ? (
        <div className="card p-5">
          <p className="text-sm text-pretty text-muted">Aún no sigues a nadie. Empieza con las cuentas de fitness que salieron de la investigación del plan (y la tuya) y añade las que quieras.</p>
          <button type="button" onClick={starter} disabled={adding} className="btn-primary btn-sm mt-4">
            {adding ? <LoaderCircle size={13} aria-hidden className="animate-spin" /> : <Plus size={13} aria-hidden />} Empezar con las del plan
          </button>
        </div>
      ) : (
        <ul className="card divide-y divide-line">
          {accounts.map((a) => (
            <li key={a.id} className={`flex items-center gap-2 px-3.5 py-2.5 ${activeHandle === a.handle ? "bg-accent-soft" : ""}`}>
              <div className="min-w-0 flex-1">
                <Link href={hrefFor(activeHandle === a.handle ? null : a.handle)} aria-current={activeHandle === a.handle ? "true" : undefined} className="block min-w-0 transition-colors hover:text-accent" title="Ver solo esta cuenta">
                  <p className="truncate text-sm font-medium">
                    @{a.handle}
                    {a.kind === "own" && <span className="ml-1.5 rounded-full bg-accent-soft px-1.5 py-px text-[10px] font-medium text-accent">Tú</span>}
                  </p>
                  <p className="truncate text-xs text-muted">
                    {NET[a.platform]}
                    {a.followers !== null && ` · ${compact(a.followers)} seg.`}
                    {a.grupo && ` · ${a.grupo}`}
                  </p>
                </Link>
                {a.syncError ? (
                  <p className="mt-1 flex items-start gap-1 text-xs text-bad text-pretty">
                    <TriangleAlert size={12} aria-hidden className="mt-0.5 shrink-0" /> {a.syncError}
                  </p>
                ) : (
                  <p className="mt-0.5 text-xs text-faint">{a.syncedAt ? `${a.videoCount} vídeos · ${since(a.syncedAt)}` : "Sin leer todavía"}</p>
                )}
              </div>
              <button type="button" className="btn-ghost btn-sm shrink-0 px-2" aria-label={`Actualizar @${a.handle}`} disabled={!!syncing || busyId === a.id} onClick={() => syncAll([a])}>
                <RefreshCw size={13} aria-hidden />
              </button>
              <ConfirmButton className="btn-danger btn-sm shrink-0 px-2" confirmLabel="¿Quitar?" disabled={busyId === a.id} onConfirm={() => remove(a.id)}>
                Quitar
              </ConfirmButton>
            </li>
          ))}
        </ul>
      )}

      {neverRead.length > 0 && !syncing && (
        <button type="button" className="btn-primary btn-sm mt-3 w-full" onClick={() => syncAll(neverRead)}>
          Leer las {neverRead.length} cuentas nuevas
        </button>
      )}

      <form onSubmit={add} className="mt-4">
        <label htmlFor="radar-add" className="label">
          Añadir una cuenta
        </label>
        <div className="flex gap-2">
          <select aria-label="Red" value={platform} onChange={(e) => setPlatform(e.target.value as "tt" | "yt")} className="input w-auto shrink-0 pr-8">
            <option value="tt">TikTok</option>
            <option value="yt">YouTube</option>
          </select>
          <input id="radar-add" value={account} onChange={(e) => setAccount(e.target.value)} placeholder="@usuario o enlace" autoComplete="off" spellCheck={false} className="input min-w-0" />
          <button type="submit" disabled={!account.trim() || adding || !!syncing} className="btn-ghost shrink-0 px-3" aria-label="Añadir cuenta">
            {adding ? <LoaderCircle size={15} aria-hidden className="animate-spin" /> : <Plus size={15} aria-hidden />}
          </button>
        </div>
        <p className="hint mt-1.5">{platform === "yt" ? "De YouTube se leen los Shorts del canal." : "Se lee su perfil público: últimos 30 vídeos con sus cifras."}</p>
      </form>
    </div>
  );
}
