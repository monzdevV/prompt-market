import { accountsOverview, postsWithMetrics, workspaceTz } from "../analytics";
import { listPosts } from "../posts";
import { getProfile, type Profile } from "./profile";
import { radarContextText } from "./radar";
import { listScripts } from "./scripts";

/**
 * Lo que Manny sabe del oficio: sale de la investigación del 29/09/2026 (74 vídeos verificados,
 * estudio de Buffer sobre 11,4 M de publicaciones, normas de TikTok). Va en cada conversación.
 */
export const PLAYBOOK = `
Formatos que más se han hecho virales en cuentas pequeñas de fitness (verificado):
- Correcto vs incorrecto con el músculo marcado (✅/❌, verde/rojo). Stozfit: 24,6 M visitas con 39 K suscriptores. mrcoach: 314 K con 2,6 K.
- Mapa del músculo al lado del ejercicio en pantalla dividida (Tim Thies 845 K, Perfect Workout Pumps 924 K con 6 K).
- Línea de la barra con apps como Metric o WL Analysis: es lo que más se guarda (~2,8 %).
- Explicadores "¿qué pasa si…?" con IA o 3D: muchas visitas pero saturados; si hay imágenes realistas de IA, hay que etiquetarlas.
- Dibujo a mano en libreta (Gerardo Marrero, 2,1 M): casi nadie lo hace en español.
- Series numeradas (1/4, Día 1/30, "Mi colega vs yo Ep. 1") hacen que la gente vuelva y siga.
- Edit de gym de cine (cámara lenta al ritmo, ventana panorámica, palabra enorme detrás del sujeto): mucho alcance, pocos seguidores fieles.

Crecimiento en TikTok:
- Publicar más no baja la mediana de visitas y multiplica las veces que un vídeo se hace viral (Buffer, 11,4 M publicaciones).
- Deja al menos 4 horas entre publicaciones. Vídeos de 15–35 s para volumen y alguno de 60–120 s.
- Gancho en el primer segundo: texto grande + frase + imagen a la vez. Nada de "hola, soy…".
- Palabra clave dicha, escrita en pantalla y al principio de la descripción. 3–5 hashtags de nicho, nunca #fyp.
- Métricas objetivo: ≥65 % sigue viendo a los 3 s; compartidos ≥0,5 % de las visitas; guardados ≥1 %.
- Si un vídeo no arranca, no se borra: se regraba el principio con otro gancho y se sube como nuevo 1–2 semanas después.
- Responder comentarios con vídeo convierte preguntas en ganchos gratis.

Directos: horario fijo, 45–60 min mínimo, tema gym, título con gancho, anunciarlo 2–3 h antes, metas de regalos tipo "100 monedas = serie al fallo", sacar clips.

Edición (CapCut): subtítulos grandes con la palabra clave en amarillo; pantalla dividida mal arriba / bien abajo; músculo que brilla (máscara + brillo + filtro rojo); contador de kilos o repeticiones; cámara lenta al ritmo; vídeo que se repite solo (el final enlaza con el principio); pantalla congelada con flecha roja. Objetivo: 25 min por vídeo duplicando un proyecto plantilla.

Reglas de TikTok para fitness: nada de pérdida de peso rápida, dietas de pocas calorías, quemagrasas ni prometer resultados con suplementos; nada de antes/después de cuerpo con producto; sin marcas de agua de otras apps; contenido de otros solo si aportas algo tuyo.
`.trim();

const fmtN = (n: number | null) => (n === null ? "sin dato" : new Intl.NumberFormat("es-ES").format(n));

function profileText(p: Profile) {
  const rows: [string, string][] = [
    ["Nombre", p.nombre],
    ["TikTok", p.tiktok],
    ["Instagram", p.instagram],
    ["Otras redes", p.otras],
    ["Nicho", p.nicho],
    ["Público", p.publico],
    ["Tono", p.tono],
    ["Objetivo", p.objetivo],
    ["Ritmo", p.ritmo],
    ["Directos", p.directos],
    ["Situación", p.situacion],
    ["Límites", p.limites],
  ];
  return rows
    .filter(([, v]) => v.trim())
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n");
}

/** Resumen de todo lo que hay en la app sobre el creador, en texto, para dárselo a Manny. */
export function buildContext(workspaceId: string, now = Date.now()) {
  const tz = workspaceTz(workspaceId);
  const today = new Intl.DateTimeFormat("es-ES", { timeZone: tz, weekday: "long", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(now);

  const accounts = accountsOverview(workspaceId, 30);
  const accountsText = accounts.length
    ? accounts
        .map((a) => {
          const delta = a.followersDelta === null ? "" : ` (${a.followersDelta >= 0 ? "+" : ""}${fmtN(a.followersDelta)} en 30 días)`;
          return `- ${a.platform} «${a.name}»: ${fmtN(a.followers)} seguidores${delta}; estado ${a.state}`;
        })
        .join("\n")
    : "- Ninguna cuenta conectada todavía.";

  const recent = postsWithMetrics(workspaceId, { days: 60, limit: 15 });
  const recentText = recent.length
    ? recent
        .map((p) => {
          const when = p.published_at ? new Date(p.published_at).toLocaleDateString("es-ES", { timeZone: tz }) : "¿?";
          const cap = (p.caption ?? "").replace(/\s+/g, " ").slice(0, 90);
          return `- ${when} ${p.platform} «${cap}»: ${fmtN(p.views)} visitas, ${fmtN(p.likes)} likes, ${fmtN(p.comments)} coment., ${fmtN(p.shares)} compartidos, ${fmtN(p.saves)} guardados`;
        })
        .join("\n")
    : "- Aún no hay publicaciones sincronizadas con métricas.";

  const scheduled = listPosts(workspaceId, { from: now, statuses: ["scheduled"], limit: 20 }).sort((a, b) => a.scheduled_at - b.scheduled_at);
  const scheduledText = scheduled.length
    ? scheduled
        .map((p) => `- ${new Date(p.scheduled_at).toLocaleString("es-ES", { timeZone: tz, weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}: ${p.title || p.description || "(sin título)"}`)
        .join("\n")
    : "- Nada programado.";

  const scripts = listScripts(workspaceId);
  const scriptsText = scripts
    .filter((s) => s.status !== "descartado")
    .map((s) => `- [${s.status}] ${s.script.dia ? `${s.script.dia} ${s.script.hora} · ` : ""}${s.script.titulo} (${s.script.formato})`)
    .join("\n");

  const radar = radarContextText(workspaceId);

  return `Fecha y hora ahora: ${today} (${tz}).

## Perfil del creador
${profileText(getProfile(workspaceId))}

## Cuentas conectadas en la app
${accountsText}

## Últimas publicaciones con métricas (60 días)
${recentText}

## Programado en la app
${scheduledText}

## Guiones (estado)
${scriptsText || "- Sin guiones."}
${radar ? `
## Radar de cuentas que sigue (datos reales leídos de TikTok/YouTube)
${radar}` : ""}`;
}
