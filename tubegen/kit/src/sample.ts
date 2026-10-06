import type { EpisodeProps, Word } from "./types";
import { defaultTheme } from "./theme";

// Tiempos de palabra aproximados, solo para previsualizar en Studio sin audio.
const fake = (text: string, duration: number): Word[] => {
  const ws = text.split(/\s+/);
  const step = duration / ws.length;
  return ws.map((w, i) => ({ text: w, start: i * step, end: (i + 1) * step }));
};
const s = (text: string, duration: number, visual: EpisodeProps["scenes"][number]["visual"]) => ({
  text,
  duration,
  words: fake(text, duration),
  visual,
});

export const sampleEpisode: EpisodeProps = {
  id: "sample",
  title: "El pulpo tiene tres corazones",
  channelName: "Curiosidad Máxima",
  theme: defaultTheme,
  captions: true,
  endScreen: false,
  scenes: [
    s("El pulpo tiene tres corazones. Y cuando nada, uno de ellos se para.", 4.2, {
      kind: "hook",
      headline: "Tres corazones",
      emphasis: "tres",
      label: "Pulpo común",
    }),
    s("Dos bombean sangre a las branquias. El tercero, al resto del cuerpo.", 4, {
      kind: "list",
      headline: "Cómo se reparten",
      items: ["Dos para las branquias", "Uno para el cuerpo"],
    }),
    s("Su sangre es azul, porque usa cobre en lugar de hierro para llevar oxígeno.", 4.4, {
      kind: "compare",
      headline: "Sangre de otro color",
      left: { label: "Humano", value: "Hierro" },
      right: { label: "Pulpo", value: "Cobre" },
    }),
    s("Y dos tercios de sus neuronas no están en el cerebro, sino en los brazos.", 4.2, {
      kind: "stat",
      value: 66,
      suffix: "%",
      headline: "de sus neuronas están en los brazos",
      emphasis: "brazos",
    }),
    s("Por eso cada brazo puede reaccionar casi por su cuenta.", 3.2, {
      kind: "outro",
      headline: "Cada brazo piensa",
      emphasis: "piensa",
    }),
  ],
};
