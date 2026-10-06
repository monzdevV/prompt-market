import { describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { DEFAULT_PROFILE, FALLBACK_SCHEDULE, profileSchedule } from "@/lib/manny/profile";
import { ensurePlanSeeded } from "@/lib/manny/scripts";
import { PLAN_SCRIPTS } from "@/lib/manny/seed-data";
import { makeUser } from "./helpers";

describe("horarios del perfil", () => {
  it("lee las horas de publicación y los días y la hora del directo", () => {
    expect(profileSchedule({ ritmo: "Publico a las 9:00 y a las 19.45", directos: "Directos martes y sábados a las 20:30, una hora" })).toEqual({
      posts: ["09:00", "19:45"],
      live: { days: ["Mar", "Sáb"], time: "20:30" },
    });
  });

  it("si el perfil no lo dice, usa el plan de partida", () => {
    expect(profileSchedule({ ritmo: "", directos: "" })).toEqual(FALLBACK_SCHEDULE);
    expect(profileSchedule({ ritmo: "Todos los días", directos: "Uno a la semana, 45–60 minutos" })).toEqual(FALLBACK_SCHEDULE);
    expect(profileSchedule(DEFAULT_PROFILE)).toEqual(FALLBACK_SCHEDULE);
  });

  it("sin directos no marca ninguno", () => {
    expect(profileSchedule({ ritmo: "13:00", directos: "No hago directos" })).toEqual({ posts: ["13:00"], live: null });
  });
});

describe("semilla del plan", () => {
  it("se copia una sola vez aunque se pida varias veces", async () => {
    const u = await makeUser();
    ensurePlanSeeded(u.workspaceId);
    ensurePlanSeeded(u.workspaceId);
    const n = (db.prepare("SELECT COUNT(*) AS n FROM manny_scripts WHERE workspace_id = ? AND source = 'plan'").get(u.workspaceId) as { n: number }).n;
    expect(n).toBe(PLAN_SCRIPTS.length);
    expect(db.isTransaction).toBe(false);
  });
});
