// Arranque del servidor (solo runtime Node.js): se importa desde instrumentation.ts.
// Va en un archivo aparte para que el análisis del runtime Edge no vea las APIs de Node.

export async function registerNode() {
  // Todas las fechas del servidor (calendario, listados) usan la zona de la instalación
  process.env.TZ = process.env.APP_TIMEZONE || "Europe/Madrid";
  // `next build` también carga este archivo: el ejecutor solo arranca con el servidor encendido
  if (process.env.NEXT_PHASE === "phase-production-build") return;
  const { log } = await import("./lib/log");
  const { checkEnv } = await import("./lib/env");
  const { errors, softErrors, warnings } = checkEnv();
  for (const w of warnings) log.warn("config.warning", { detail: w });
  // No bloquean el arranque: solo dejan sin funcionar una parte (p. ej. la IA)
  for (const e of softErrors) log.error("config.degraded", { detail: e });
  if (errors.length) {
    for (const e of errors) log.error("config.invalid", { detail: e });
    // En producción no arrancamos con una configuración peligrosa; en desarrollo solo se avisa
    if (process.env.NODE_ENV === "production") process.exit(1);
  }
  // Ningún fallo inesperado debe pasar en silencio
  process.on("unhandledRejection", (reason) => log.error("process.unhandled_rejection", { err: reason }));
  process.on("uncaughtException", (err) => {
    // Estado desconocido: se registra y se sale; el gestor de servicio lo reinicia y la cola retoma el trabajo
    log.error("process.uncaught_exception", { err });
    process.exit(1);
  });
  const { startWorker } = await import("./lib/worker");
  startWorker();
}
