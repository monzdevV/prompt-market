"use client";

import { useCallback, useEffect, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { api } from "@/lib/client-api";
import { TIKTOK_PRIVACY_LABEL, tiktokConsentText, validateTikTokOptions, type TikTokOptions } from "@/lib/core/tiktok-options";

export type CreatorInfo = {
  avatarUrl: string | null;
  username: string | null;
  nickname: string;
  privacyOptions: string[];
  commentDisabled: boolean;
  duetDisabled: boolean;
  stitchDisabled: boolean;
  maxDurationS: number | null;
  audited: boolean;
};

export type CreatorState = { status: "loading" } | { status: "error"; message: string } | { status: "ok"; info: CreatorInfo };

export const EMPTY_TIKTOK_OPTIONS: TikTokOptions = {
  privacyLevel: "",
  allowComment: false,
  allowDuet: false,
  allowStitch: false,
  commercial: { enabled: false, yourBrand: false, brandedContent: false },
};

/** Problema que impide publicar en TikTok con estas opciones, o null. */
export function tiktokProblem(o: TikTokOptions, state: CreatorState, durationS: number | null) {
  if (state.status === "loading") return "Cargando los datos de tu cuenta de TikTok…";
  if (state.status === "error") return "No se pudo cargar tu cuenta de TikTok: reintenta o quítala";
  const info = state.info;
  // TikTok obliga a que el usuario lo elija en cada vídeo (sin opción preseleccionada)
  if (!o.privacyLevel) return "Falta un paso: en el panel de TikTok, elige «¿Quién puede ver este vídeo?»";
  if (info.maxDurationS && durationS && durationS > info.maxDurationS) {
    return `Tu cuenta de TikTok admite vídeos de hasta ${info.maxDurationS} s y este dura ${Math.round(durationS)} s`;
  }
  return validateTikTokOptions(o);
}

/**
 * Panel que exige TikTok para publicar desde apps de terceros: se muestra la cuenta, el usuario
 * elige la privacidad (sin valor por defecto), las interacciones y declara si hay contenido comercial.
 */
export function TikTokPanel({
  accountId,
  value,
  onChange,
  onState,
  durationS,
}: {
  accountId: number;
  value: TikTokOptions;
  onChange: (o: TikTokOptions) => void;
  onState: (s: CreatorState) => void;
  durationS: number | null;
}) {
  const [state, setState] = useState<CreatorState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  const update = useCallback(
    (next: CreatorState) => {
      setState(next);
      onState(next);
    },
    [onState],
  );

  useEffect(() => {
    let cancelled = false;
    api<CreatorInfo>(`/api/accounts/${accountId}/tiktok-creator`)
      .then((info) => !cancelled && update({ status: "ok", info }))
      .catch((e) => !cancelled && update({ status: "error", message: e instanceof Error ? e.message : "No se pudo cargar TikTok" }));
    return () => {
      cancelled = true;
    };
    // `update` depende de onState, que el padre recrea en cada render: solo recargamos por cuenta o reintento
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountId, attempt]);

  if (state.status === "error") {
    return (
      <div role="alert" className="rounded-lg bg-bad-soft p-3 text-sm text-bad">
        {state.message}
        <button type="button" onClick={() => {
            update({ status: "loading" });
            setAttempt((n) => n + 1);
          }} className="mt-2 block font-medium underline">
          Reintentar
        </button>
      </div>
    );
  }
  if (state.status === "loading") {
    return (
      <p className="flex items-center gap-2 text-sm text-muted">
        <LoaderCircle size={14} className="animate-spin" aria-hidden /> Consultando tu cuenta de TikTok…
      </p>
    );
  }

  const info = state.info;
  const set = (patch: Partial<TikTokOptions>) => onChange({ ...value, ...patch });
  const setCommercial = (patch: Partial<TikTokOptions["commercial"]>) => set({ commercial: { ...value.commercial, ...patch } });
  const tooLong = info.maxDurationS && durationS && durationS > info.maxDurationS;

  return (
    <div className="space-y-4 rounded-lg border border-line p-4">
      <div className="flex items-center gap-2.5">
        {info.avatarUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={info.avatarUrl} alt="" className="h-8 w-8 rounded-full" />
        )}
        <div className="text-sm">
          <p className="font-medium">Publicar en TikTok como {info.nickname}</p>
          {info.username && <p className="text-xs text-muted">@{info.username}</p>}
        </div>
      </div>

      {!info.audited && (
        <p className="rounded-lg bg-warn-soft p-2.5 text-sm text-warn">
          Mientras TikTok revisa la app, los vídeos se publican como «Solo yo» y tu cuenta de TikTok debe estar en privado en el
          momento de publicar.
        </p>
      )}

      {tooLong && (
        <p className="rounded-lg bg-bad-soft p-2.5 text-sm text-bad">
          Tu cuenta admite vídeos de hasta {info.maxDurationS} s y este dura {Math.round(durationS!)} s.
        </p>
      )}

      <div>
        <label className="label" htmlFor={`tt-privacy-${accountId}`}>
          ¿Quién puede ver este vídeo?
        </label>
        <select
          id={`tt-privacy-${accountId}`}
          className="input max-w-xs"
          value={value.privacyLevel}
          onChange={(e) => set({ privacyLevel: e.target.value })}
        >
          <option value="" disabled>
            Elige una opción
          </option>
          {info.privacyOptions.map((p) => (
            <option key={p} value={p} disabled={p === "SELF_ONLY" && value.commercial.brandedContent}>
              {TIKTOK_PRIVACY_LABEL[p] ?? p}
              {p === "SELF_ONLY" && value.commercial.brandedContent ? " (no disponible con contenido patrocinado)" : ""}
            </option>
          ))}
        </select>
      </div>

      <fieldset>
        <legend className="label">Permitir a los usuarios</legend>
        <div className="flex flex-wrap gap-4 text-sm">
          {(
            [
              ["allowComment", "Comentar", info.commentDisabled],
              ["allowDuet", "Hacer dúos", info.duetDisabled],
              ["allowStitch", "Hacer Stitch", info.stitchDisabled],
            ] as const
          ).map(([key, label, disabled]) => (
            <label key={key} className={`flex items-center gap-2 ${disabled ? "text-muted" : ""}`}>
              <input type="checkbox" disabled={disabled} checked={!disabled && value[key]} onChange={(e) => set({ [key]: e.target.checked })} />
              {label}
              {disabled && <span className="text-xs">(desactivado en tu cuenta)</span>}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="space-y-2">
        <label className="flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            checked={value.commercial.enabled}
            onChange={(e) => setCommercial({ enabled: e.target.checked, ...(e.target.checked ? {} : { yourBrand: false, brandedContent: false }) })}
          />
          Este vídeo promociona una marca, producto o servicio
        </label>
        {value.commercial.enabled && (
          <div className="ml-6 space-y-2 text-sm">
            <label className="flex items-start gap-2">
              <input type="checkbox" className="mt-1" checked={value.commercial.yourBrand} onChange={(e) => setCommercial({ yourBrand: e.target.checked })} />
              <span>
                <b className="font-medium">Tu marca</b>: te promocionas a ti o a tu negocio. Se etiquetará como «Contenido promocional».
              </span>
            </label>
            <label className="flex items-start gap-2">
              <input
                type="checkbox"
                className="mt-1"
                checked={value.commercial.brandedContent}
                onChange={(e) => {
                  const on = e.target.checked;
                  // El contenido de marca no puede ser privado: si lo era, hay que volver a elegir
                  set({
                    privacyLevel: on && value.privacyLevel === "SELF_ONLY" ? "" : value.privacyLevel,
                    commercial: { ...value.commercial, brandedContent: on },
                  });
                }}
              />
              <span>
                <b className="font-medium">Contenido de marca</b>: promocionas a un tercero. Se etiquetará como «Colaboración pagada».
              </span>
            </label>
            {!value.commercial.yourBrand && !value.commercial.brandedContent && (
              <p className="text-xs text-warn">Indica si es tu marca, contenido de un tercero o ambos.</p>
            )}
          </div>
        )}
      </fieldset>

      <p className="text-xs text-muted">
        {tiktokConsentText(value)} El vídeo puede tardar unos minutos en aparecer en tu perfil.
      </p>
    </div>
  );
}
