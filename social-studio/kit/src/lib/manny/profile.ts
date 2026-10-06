import { z } from "zod";
import { db } from "../db";
import { WEEK } from "./format";

const text = (max: number, label: string) => z.string().trim().max(max, `${label}: máximo ${max} caracteres`).default("");

/** Lo que Manny sabe de ti. Se edita en «Mi perfil» y va en cada conversación. */
export const ProfileSchema = z.object({
  nombre: text(80, "Nombre"),
  tiktok: text(60, "TikTok"),
  instagram: text(60, "Instagram"),
  otras: text(300, "Otras redes"),
  nicho: text(400, "Nicho"),
  publico: text(400, "Público"),
  tono: text(300, "Tono"),
  objetivo: text(600, "Objetivo"),
  ritmo: text(300, "Ritmo"),
  directos: text(400, "Directos"),
  situacion: text(3000, "Situación"),
  limites: text(1000, "Límites"),
});

export type Profile = z.infer<typeof ProfileSchema>;

/**
 * Perfil de demostración (neutro): se usa hasta que guardes el tuyo en «Mi perfil».
 * No describe a ninguna persona real. Los campos vacíos los completas tú.
 */
export const DEFAULT_PROFILE: Profile = {
  nombre: "",
  tiktok: "",
  instagram: "",
  otras: "",
  nicho: "Fitness y gimnasio: técnica de ejercicios, rutinas y ciencia sencilla del entrenamiento.",
  publico: "Gente joven que va al gimnasio o está empezando y quiere mejorar su físico.",
  tono: "Cercano y directo, en español de España. Sin humo.",
  objetivo: "Crecer en TikTok publicando con constancia y convertir visitas en seguidores fieles.",
  ritmo: "2 publicaciones al día: 13:30 y 21:30. Grabo en 2 sesiones por semana.",
  directos: "Un directo a la semana (viernes a las 22:00), de 45–60 minutos y del tema del nicho.",
  situacion: "",
  limites: "Nada de prometer pérdida de peso rápida ni resultados con suplementos. Nada de antes/después de cuerpo con producto. Sin marcas de agua de otras apps.",
};

type Day = (typeof WEEK)[number];
export type Schedule = { posts: string[]; live: { days: Day[]; time: string } | null };

/** Valores del plan de partida, para lo que el perfil no diga. */
export const FALLBACK_SCHEDULE = { posts: ["13:30", "21:30"], live: { days: ["Vie"] as Day[], time: "22:00" } } satisfies Schedule;

const DAY_WORDS: [RegExp, Day][] = [
  [/\blunes\b/i, "Lun"],
  [/\bmartes\b/i, "Mar"],
  [/\bmi[eé]rcoles\b/i, "Mié"],
  [/\bjueves\b/i, "Jue"],
  [/\bviernes\b/i, "Vie"],
  [/\bs[aá]bados?\b/i, "Sáb"],
  [/\bdomingos?\b/i, "Dom"],
];

const timesIn = (text: string) =>
  [...new Set([...text.matchAll(/\b([01]?\d|2[0-3])[:.h]([0-5]\d)\b/g)].map((m) => `${m[1].padStart(2, "0")}:${m[2]}`))];

/**
 * Horarios a partir de los campos «ritmo» y «directos» del perfil (texto libre): las horas que aparezcan
 * y, para los directos, los días de la semana. Lo que no se encuentre sale de FALLBACK_SCHEDULE;
 * si «directos» dice que no hay («no hago», «sin directos»…), no hay directo.
 */
export function profileSchedule(profile: Pick<Profile, "ritmo" | "directos">): Schedule {
  const posts = timesIn(profile.ritmo).sort();
  const d = profile.directos.trim();
  if (/^(no\b|sin\b|ning[uú]n)/i.test(d)) return { posts: posts.length ? posts : FALLBACK_SCHEDULE.posts, live: null };
  const days = DAY_WORDS.filter(([re]) => re.test(d)).map(([, day]) => day);
  return {
    posts: posts.length ? posts : FALLBACK_SCHEDULE.posts,
    live: { days: days.length ? days : FALLBACK_SCHEDULE.live.days, time: timesIn(d)[0] ?? FALLBACK_SCHEDULE.live.time },
  };
}

export function getProfile(workspaceId: string): Profile {
  const row = db.prepare("SELECT data FROM manny_profile WHERE workspace_id = ?").get(workspaceId) as { data: string } | undefined;
  if (!row) return DEFAULT_PROFILE;
  const parsed = ProfileSchema.safeParse(JSON.parse(row.data));
  return parsed.success ? parsed.data : DEFAULT_PROFILE;
}

export function saveProfile(workspaceId: string, profile: Profile) {
  db.prepare(
    `INSERT INTO manny_profile (workspace_id, data, updated_at) VALUES (?, ?, ?)
     ON CONFLICT (workspace_id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at`,
  ).run(workspaceId, JSON.stringify(profile), Date.now());
}
