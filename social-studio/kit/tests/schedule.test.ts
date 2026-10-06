import { describe, expect, it } from "vitest";
import { assignTimes, parseSlots } from "@/lib/core/schedule";

describe("programar en lote: reparto de horas", () => {
  it("entiende las horas escritas de varias formas y las ordena sin repetir", () => {
    expect(parseSlots("20:00, 10:00 15:30; 10  9")).toEqual(["09:00", "10:00", "15:30", "20:00"]);
    expect(parseSlots("25:00, 10:75, hola")).toEqual([]);
  });

  it("reparte 3 al día a partir del día elegido", () => {
    const now = new Date(2026, 8, 23, 12, 0).getTime();
    expect(assignTimes(7, "2026-09-24", ["10:00", "15:00", "20:00"], now)).toEqual([
      "2026-09-24T10:00",
      "2026-09-24T15:00",
      "2026-09-24T20:00",
      "2026-09-25T10:00",
      "2026-09-25T15:00",
      "2026-09-25T20:00",
      "2026-09-26T10:00",
    ]);
  });

  it("si empieza hoy, se salta las horas que ya han pasado (y las de los próximos 5 minutos)", () => {
    const now = new Date(2026, 8, 23, 14, 57).getTime();
    expect(assignTimes(3, "2026-09-23", ["10:00", "15:00", "20:00"], now)).toEqual(["2026-09-23T20:00", "2026-09-24T10:00", "2026-09-24T15:00"]);
  });

  it("cruza bien el cambio de mes", () => {
    const now = new Date(2026, 8, 1).getTime();
    expect(assignTimes(2, "2026-09-30", ["21:00"], now)).toEqual(["2026-09-30T21:00", "2026-10-01T21:00"]);
  });

  it("sin horas o con una fecha mala no asigna nada", () => {
    expect(assignTimes(3, "2026-09-24", [], 0)).toEqual([]);
    expect(assignTimes(3, "ayer", ["10:00"], 0)).toEqual([]);
  });
});
