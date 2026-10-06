"use client";

import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { startTransition, useActionState, useEffect, useId, useRef, useState } from "react";
import { ArrowDownRight, ArrowRight, CaretDown, Check } from "@phosphor-icons/react";
import { pedirVisita, type CampoVisita, type EstadoVisita } from "@/app/acciones-web";
import type { DatosLanding } from "@/lib/datos/publico";
import { codigoCentro } from "@/design/tokens";
import { dineroExacto } from "@/lib/formato";
import { lugaresDeCentros } from "@/lib/centros";
import { MARCA, sinMarca } from "@/marca";
import { Antetitulo, curva, TituloPartido } from "./Movimiento";
import { irA } from "./ScrollSuave";

const INICIAL: EstadoVisita = { ok: null, mensaje: "" };

export function Visita({ datos }: { datos: DatosLanding }) {
  const { centros, tarifas } = datos;
  const [centroId, setCentroId] = useState("");
  const [tarifaId, setTarifaId] = useState("");
  const [envio, setEnvio] = useState(0);

  // Las tarjetas de tarifas avisan con un CustomEvent para dejar la tarifa preseleccionada.
  useEffect(() => {
    const alElegir = (e: Event) => {
      const slug = (e as CustomEvent<string>).detail;
      const tarifa = tarifas.find((t) => t.slug === slug);
      if (tarifa) setTarifaId(tarifa.id);
    };
    window.addEventListener(MARCA.eventoTarifa, alElegir);
    return () => window.removeEventListener(MARCA.eventoTarifa, alElegir);
  }, [tarifas]);

  const lugar = lugaresDeCentros(centros);

  const irAlFormulario = () => {
    irA("visita-formulario");
    document.getElementById("visita-nombre")?.focus({ preventScroll: true });
  };

  return (
    <section id="visita" aria-labelledby="visita-titulo" className="relative overflow-hidden border-t border-linea bg-fondo">
      {/* CTA gigante */}
      <div className="mx-auto max-w-[1600px] px-4 pb-12 pt-24 md:px-10 md:pb-20 md:pt-36">
        <Antetitulo n="06">Visita</Antetitulo>

        <div className="mt-8 flex flex-wrap items-end justify-between gap-x-8 gap-y-6">
          <TituloPartido
            texto={"Reserva\ntu visita"}
            className="rotulo text-[clamp(3.6rem,16vw,14rem)] leading-[0.82] text-tinta"
            escalon={0.07}
          />
          <button
            type="button"
            onClick={irAlFormulario}
            className="group condensada flex size-20 shrink-0 items-center justify-center border border-linea text-acento-tinta transition-colors duration-300 hover:border-acento-tinta active:scale-[0.97] md:mb-[1.2vw] md:size-32"
            aria-label="Ir al formulario de visita"
          >
            <ArrowDownRight
              weight="bold"
              className="size-9 transition-transform duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:translate-x-1 group-hover:translate-y-1 md:size-14"
            />
          </button>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-4 border-t border-linea pt-6 text-sm text-tinta-2 md:grid-cols-3 md:gap-6">
          <p className="max-w-[38ch]">Elige centro, déjanos tus datos y el equipo de ese centro te escribe para cerrar día y hora.</p>
          <p className="condensada flex flex-wrap gap-x-4 gap-y-1 tracking-[0.12em]">
            {centros.map((c) => (
              <span key={c.id}>
                <span className="cifra text-acento-tinta">{codigoCentro(c.slug)}</span> {lugar(c)}
              </span>
            ))}
          </p>
          <p className="md:text-right">
            Cuotas desde{" "}
            <span className="cifra text-base text-tinta">
              {tarifas.length ? dineroExacto(Math.min(...tarifas.map((t) => Number(t.cuota_mensual)))) : "—"}
            </span>{" "}
            al mes
          </p>
        </div>
      </div>

      <div className="mx-auto grid max-w-[1600px] grid-cols-1 lg:grid-cols-12">
        <Fachada centros={centros} centroId={centroId} />

        <div id="visita-formulario" className="scroll-mt-24 px-4 pb-24 pt-12 md:px-10 md:pb-36 lg:col-span-7 lg:pl-16 lg:pt-4">
          <Formulario
            key={envio}
            datos={datos}
            centroId={centroId}
            setCentroId={setCentroId}
            tarifaId={tarifaId}
            setTarifaId={setTarifaId}
            alReiniciar={() => setEnvio((n) => n + 1)}
          />
        </div>
      </div>
    </section>
  );
}

/* ------------------------------ Fachada ------------------------------ */

function Fachada({ centros, centroId }: { centros: DatosLanding["centros"]; centroId: string }) {
  const reducido = useReducedMotion();
  const elegido = centros.find((c) => c.id === centroId);

  return (
    <motion.div
      className="relative aspect-[4/5] max-h-[80svh] w-full overflow-hidden bg-placa sm:aspect-[16/11] lg:col-span-5 lg:aspect-auto lg:max-h-none lg:min-h-[760px]"
      initial={reducido ? false : { clipPath: "inset(100% 0% 0% 0%)" }}
      whileInView={{ clipPath: "inset(0% 0% 0% 0%)" }}
      viewport={{ once: true, margin: "0px 0px -15% 0px" }}
      transition={{ duration: 1.1, ease: curva }}
    >
      <motion.div
        className="absolute inset-0"
        initial={reducido ? false : { scale: 1.18 }}
        whileInView={{ scale: 1 }}
        viewport={{ once: true, margin: "0px 0px -15% 0px" }}
        transition={{ duration: 1.6, ease: curva }}
      >
        <Image
          src="/landing/fachada-frontal.jpg"
          alt={`Fachada de un centro ${MARCA.nombre} de noche, con la luz azul encendida`}
          fill
          sizes="(min-width: 1600px) 667px, (min-width: 1024px) 42vw, 100vw"
          className="object-cover object-center"
        />
      </motion.div>

      {/* Marcador de centros: el elegido se enciende. */}
      <div className="absolute inset-x-0 bottom-0 bg-fondo/80 px-4 py-5 md:px-8 md:py-7" aria-hidden>
        <div className="flex items-end justify-between gap-4">
          <div className="flex items-end gap-3 md:gap-5">
            {centros.map((c) => {
              const activo = c.id === centroId;
              return (
                <span
                  key={c.id}
                  className={`cifra transition-[color,font-size] duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] ${
                    activo ? "text-[clamp(3rem,7vw,5.5rem)] text-acento-tinta" : "text-[clamp(1.4rem,2.6vw,2rem)] text-tinta-2/60"
                  }`}
                >
                  {codigoCentro(c.slug)}
                </span>
              );
            })}
          </div>
          <AnimatePresence mode="wait" initial={false}>
            <motion.p
              key={elegido?.id ?? "ninguno"}
              className="condensada max-w-[22ch] text-right text-xs tracking-[0.14em] text-tinta-2"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.32, ease: curva }}
            >
              {elegido ? (
                <>
                  <span className="block text-tinta">{sinMarca(elegido.nombre)}</span>
                  {elegido.direccion}
                </>
              ) : (
                "Elige tu centro"
              )}
            </motion.p>
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

/* ----------------------------- Formulario ---------------------------- */

function Formulario({
  datos,
  centroId,
  setCentroId,
  tarifaId,
  setTarifaId,
  alReiniciar,
}: {
  datos: DatosLanding;
  centroId: string;
  setCentroId: (id: string) => void;
  tarifaId: string;
  setTarifaId: (id: string) => void;
  alReiniciar: () => void;
}) {
  const [estado, accion, enviando] = useActionState(pedirVisita, INICIAL);
  const formRef = useRef<HTMLFormElement>(null);
  const confirmRef = useRef<HTMLHeadingElement>(null);
  const reducido = useReducedMotion();
  const errores = estado.errores ?? {};

  // Tras responder el servidor: foco al primer campo con error, o a la confirmación.
  useEffect(() => {
    if (estado.ok === true) {
      confirmRef.current?.focus({ preventScroll: true });
      return;
    }
    const primero = Object.keys(estado.errores ?? {})[0];
    if (primero) formRef.current?.querySelector<HTMLElement>(`[name="${primero}"]`)?.focus();
  }, [estado]);

  // Enviamos a mano para que React no vacíe el formulario si hay errores.
  const alEnviar = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(() => accion(fd));
  };

  return (
    <AnimatePresence mode="wait" initial={false}>
      {estado.ok === true ? (
        <motion.div
          key="ok"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: curva, delay: 0.1 }}
          className="flex min-h-[520px] flex-col justify-center"
        >
          <div className="flex items-center gap-4">
            <motion.span
              className="flex size-14 items-center justify-center bg-acento text-sobre-campo"
              initial={reducido ? false : { scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.32, ease: curva, delay: 0.25 }}
            >
              <Check weight="bold" className="size-7" aria-hidden />
            </motion.span>
            <p className="condensada text-sm tracking-[0.2em] text-tinta-2">Solicitud recibida</p>
          </div>

          <div className="mt-8 overflow-hidden">
            <motion.p
              className="cifra text-[clamp(6rem,22vw,15rem)] leading-[0.8] text-acento-tinta"
              initial={reducido ? false : { y: "105%" }}
              animate={{ y: "0%" }}
              transition={{ duration: 0.9, ease: curva, delay: 0.3 }}
              aria-hidden
            >
              {estado.codigo}
            </motion.p>
          </div>

          <h3
            ref={confirmRef}
            tabIndex={-1}
            className="rotulo mt-6 text-[clamp(2rem,5vw,3.5rem)] text-tinta outline-none"
          >
            Te esperamos en {estado.centro || "tu centro"}
          </h3>
          <p className="mt-4 max-w-[46ch] text-base text-tinta-2">
            El equipo del centro te escribirá al email que nos has dejado para cerrar día y hora de tu visita.
          </p>
          <button
            type="button"
            onClick={alReiniciar}
            className="condensada mt-10 inline-flex min-h-11 w-max items-center gap-2 border-b border-linea pb-1 text-sm tracking-[0.14em] text-tinta-2 transition-colors hover:border-acento-tinta hover:text-tinta"
          >
            Enviar otra solicitud <ArrowRight weight="bold" aria-hidden />
          </button>
        </motion.div>
      ) : (
        <motion.form
          key="form"
          ref={formRef}
          action={accion}
          onSubmit={alEnviar}
          noValidate
          aria-describedby={estado.ok === false ? "visita-estado" : undefined}
          className="overflow-hidden"
          exit={{ opacity: 0, height: 0, transition: { duration: 0.5, ease: curva } }}
        >
          <h3 className="condensada text-sm tracking-[0.2em] text-tinta-2">Pide tu visita</h3>

          {/* Honeypot: invisible para personas, tentador para bots. */}
          <div className="absolute -left-[9999px] size-px overflow-hidden" aria-hidden>
            <label htmlFor="visita-web">No rellenes este campo</label>
            <input id="visita-web" name="web" type="text" tabIndex={-1} autoComplete="off" defaultValue="" />
          </div>

          <div className="mt-6 grid grid-cols-1 gap-x-10 gap-y-2 md:grid-cols-2">
            <Campo nombre="nombre" etiqueta="Nombre" error={errores.nombre} indice={0}>
              {(p) => <input {...p} type="text" autoComplete="name" required minLength={2} maxLength={120} />}
            </Campo>
            <Campo nombre="email" etiqueta="Email" error={errores.email} indice={1}>
              {(p) => <input {...p} type="email" autoComplete="email" inputMode="email" required maxLength={200} />}
            </Campo>
            <Campo nombre="telefono" etiqueta="Teléfono" opcional error={errores.telefono} indice={2}>
              {(p) => <input {...p} type="tel" autoComplete="tel" inputMode="tel" maxLength={20} />}
            </Campo>
            <Campo nombre="centro_id" etiqueta="Centro" error={errores.centro_id} indice={3} desplegable>
              {(p) => (
                <select {...p} required value={centroId} onChange={(e) => setCentroId(e.target.value)}>
                  <option value="" disabled>
                    Elige centro
                  </option>
                  {datos.centros.map((c) => (
                    <option key={c.id} value={c.id}>
                      {codigoCentro(c.slug)} · {sinMarca(c.nombre)} ({c.ciudad})
                    </option>
                  ))}
                </select>
              )}
            </Campo>
            <Campo nombre="tarifa_id" etiqueta="Tarifa que te interesa" opcional error={errores.tarifa_id} indice={4} desplegable ancho>
              {(p) => (
                <select {...p} value={tarifaId} onChange={(e) => setTarifaId(e.target.value)}>
                  <option value="">Aún no lo sé</option>
                  {datos.tarifas.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.nombre} · {dineroExacto(t.cuota_mensual)}/mes
                    </option>
                  ))}
                </select>
              )}
            </Campo>
            <Campo nombre="mensaje" etiqueta="Mensaje" opcional error={errores.mensaje} indice={5} ancho>
              {(p) => <textarea {...p} rows={3} maxLength={1000} className={`${p.className} resize-none`} />}
            </Campo>
          </div>

          <Consentimiento error={errores.consentimiento} />

          <div className="mt-10 flex flex-col gap-5 sm:flex-row sm:items-center">
            <button
              type="submit"
              disabled={enviando}
              aria-busy={enviando}
              className="condensada corte-d group relative flex h-16 w-full items-center justify-between gap-6 overflow-hidden bg-acento pl-7 pr-12 text-xl tracking-[0.06em] text-sobre-campo transition-transform duration-150 active:scale-[0.97] disabled:cursor-wait sm:w-auto sm:min-w-[320px]"
            >
              <span>{enviando ? "Enviando…" : "Reservar visita"}</span>
              <ArrowRight
                weight="bold"
                aria-hidden
                className="size-6 transition-transform duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:translate-x-1.5"
              />
              {enviando && (
                <motion.span
                  aria-hidden
                  className="absolute inset-x-0 bottom-0 h-1 origin-left bg-sobre-campo/40"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: [0, 0.7, 0.92] }}
                  transition={{ duration: 2.4, ease: curva, times: [0, 0.4, 1] }}
                />
              )}
            </button>

            <p
              id="visita-estado"
              aria-live="polite"
              className="text-sm text-alarma-tinta"
            >
              {estado.ok === false ? estado.mensaje : ""}
            </p>
          </div>
        </motion.form>
      )}
    </AnimatePresence>
  );
}

/* ------------------------------- Campos ------------------------------ */

type PropsControl = {
  id: string;
  name: string;
  className: string;
  "aria-invalid": boolean | undefined;
  "aria-describedby": string | undefined;
};

const CONTROL =
  "peer block w-full appearance-none rounded-none border-0 border-b border-linea bg-transparent px-0 py-3 text-base text-tinta outline-none transition-colors duration-300 placeholder:text-tinta-2/50 focus:border-acento-tinta aria-[invalid=true]:border-alarma-tinta md:text-lg [color-scheme:dark] [&>option]:bg-placa [&>option]:text-tinta";

function Campo({
  nombre,
  etiqueta,
  opcional = false,
  error,
  indice,
  ancho = false,
  desplegable = false,
  children,
}: {
  nombre: CampoVisita;
  etiqueta: string;
  opcional?: boolean;
  error?: string;
  indice: number;
  ancho?: boolean;
  desplegable?: boolean;
  children: (p: PropsControl) => React.ReactNode;
}) {
  const id = `visita-${nombre === "centro_id" ? "centro" : nombre === "tarifa_id" ? "tarifa" : nombre}`;
  const idError = `${id}-error`;

  return (
    <motion.div
      className={`relative pt-5 ${ancho ? "md:col-span-2" : ""}`}
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -8% 0px" }}
      transition={{ duration: 0.7, ease: curva, delay: indice * 0.05 }}
    >
      <label htmlFor={id} className="condensada flex items-baseline justify-between text-xs tracking-[0.18em] text-tinta-2">
        {etiqueta}
        {opcional && <span className="font-sans text-[11px] font-normal normal-case tracking-normal text-tinta-2/70">Opcional</span>}
      </label>
      <div className="relative">
        {children({
          id,
          name: nombre,
          className: `${CONTROL} ${desplegable ? "cursor-pointer pr-8" : ""}`,
          "aria-invalid": error ? true : undefined,
          "aria-describedby": error ? idError : undefined,
        })}
        {/* Subrayado que se dibuja al enfocar. */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-px origin-left scale-x-0 bg-acento-tinta transition-transform duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] peer-focus:scale-x-100"
        />
        {desplegable && (
          <CaretDown
            weight="bold"
            aria-hidden
            className="pointer-events-none absolute right-0 top-1/2 size-4 -translate-y-1/2 text-tinta-2"
          />
        )}
      </div>
      <AnimatePresence initial={false}>
        {error && (
          <motion.p
            key={error}
            id={idError}
            className="overflow-hidden pt-2 text-sm text-alarma-tinta"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.32, ease: curva }}
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function Consentimiento({ error }: { error?: string }) {
  const id = useId();
  const idError = "visita-consentimiento-error";
  return (
    <div className="mt-8">
      <label htmlFor={id} className="flex min-h-11 cursor-pointer items-start gap-4 py-2">
        <span className="relative mt-0.5 flex size-6 shrink-0">
          <input
            id={id}
            name="consentimiento"
            type="checkbox"
            value="si"
            required
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? idError : undefined}
            className="peer size-6 cursor-pointer appearance-none rounded-none border border-linea bg-transparent outline-none transition-colors duration-150 checked:border-acento checked:bg-acento focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-acento-tinta aria-[invalid=true]:border-alarma-tinta"
          />
          <Check
            weight="bold"
            aria-hidden
            className="pointer-events-none absolute inset-0 m-auto size-4 scale-50 text-sobre-campo opacity-0 transition-[opacity,transform] duration-150 peer-checked:scale-100 peer-checked:opacity-100"
          />
        </span>
        <span className="text-sm leading-relaxed text-tinta-2">
          Acepto que {MARCA.nombre} use estos datos solo para contactarme sobre mi visita. Puedo pedir que los borren cuando quiera.
        </span>
      </label>
      {error && (
        <p id={idError} className="pl-10 text-sm text-alarma-tinta">
          {error}
        </p>
      )}
    </div>
  );
}
