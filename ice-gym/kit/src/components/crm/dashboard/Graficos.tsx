"use client";

import { Fragment, useEffect, useRef, useState, type ReactNode } from "react";
import {
  ArcElement,
  BarController,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  DoughnutController,
  Filler,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Tooltip,
  type Chart,
  type ChartOptions,
  type ChartType,
  type Plugin,
  type ScriptableContext,
  type TooltipModel,
} from "chart.js";
import { Bar, Doughnut, Line } from "react-chartjs-2";
import { ArrowDownRight, ArrowUpRight } from "@phosphor-icons/react";
import {
  DIRECCION_TIPO,
  ETAPAS_ABIERTAS_B2B,
  ETIQUETA_ETAPA,
  ETIQUETA_TIPO_OPORTUNIDAD,
  type Etapa,
  type TipoOportunidad,
} from "@/lib/b2b";
import { dinero, mesCorto, numero, porcentaje } from "@/lib/formato";

ChartJS.register(
  ArcElement,
  BarController,
  BarElement,
  CategoryScale,
  DoughnutController,
  Filler,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Tooltip
);

/* -------------------------------------------------------------------------- */
/*  Paleta: el canvas necesita valores reales, no var(). Se leen del propio     */
/*  CRM y se vuelven a leer al cambiar de tema.                                */
/* -------------------------------------------------------------------------- */

const VARIABLES = [
  "tinta",
  "tinta-2",
  "linea",
  "placa",
  "placa-2",
  "serie-1",
  "serie-2",
  "serie-3",
  "exito",
  "critico",
  "rampa-0",
  "rampa-1",
  "rampa-2",
  "rampa-3",
  "rampa-4",
  "rampa-5",
] as const;
type Paleta = Record<(typeof VARIABLES)[number], string> & { fuente: string; reducido: boolean };

function leer(el: Element): Paleta {
  const estilo = getComputedStyle(el);
  const p = Object.fromEntries(VARIABLES.map((v) => [v, estilo.getPropertyValue(`--${v}`).trim() || "#888888"]));
  const reducido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  return { ...p, fuente: estilo.fontFamily, reducido } as Paleta;
}

function usePaleta() {
  const ref = useRef<HTMLDivElement>(null);
  const [paleta, setPaleta] = useState<Paleta | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const actualizar = () => setPaleta(leer(el));
    actualizar();
    const obs = new MutationObserver(actualizar);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-tema"] });
    return () => obs.disconnect();
  }, []);
  return { ref, paleta };
}

/** Contenedor que reserva el alto (sin saltos al cargar) y entrega la paleta. */
function Lienzo({
  alto,
  llenar = false,
  children,
  etiqueta,
}: {
  alto: number;
  /** Ocupa todo el alto disponible, con `alto` como mínimo. */
  llenar?: boolean;
  etiqueta: string;
  children: (p: Paleta) => ReactNode;
}) {
  const { ref, paleta } = usePaleta();
  return (
    <div
      ref={ref}
      style={llenar ? { minHeight: alto } : { height: alto }}
      className={`relative w-full ${llenar ? "flex-1" : ""}`}
      role="img"
      aria-label={etiqueta}
    >
      {/* Al cambiar de tema se monta de nuevo: Chart.js no actualiza sus plugins en vivo. */}
      {paleta && <Fragment key={paleta.tinta}>{children(paleta)}</Fragment>}
    </div>
  );
}

/* --------------------------------- Ayudas --------------------------------- */

const euroCorto = (v: number) =>
  v >= 1_000_000 ? `${(Math.round(v / 100_000) / 10).toLocaleString("es-ES")} M€` : v >= 1000 ? `${Math.round(v / 1000)}k€` : `${v}€`;

/** "#RRGGBB" con alfa. */
const alfa = (hex: string, a: number) => `${hex.slice(0, 7)}${Math.round(a * 255).toString(16).padStart(2, "0")}`;

/** Degradado vertical (arriba → abajo) dentro del área del gráfico. */
function degradadoV(chart: Chart, arriba: string, abajo: string) {
  const area = chart.chartArea;
  if (!area) return arriba;
  const g = chart.ctx.createLinearGradient(0, area.top, 0, area.bottom);
  g.addColorStop(0, arriba);
  g.addColorStop(1, abajo);
  return g;
}

/** Degradado horizontal (izquierda → derecha). */
function degradadoH(chart: Chart, izq: string, der: string) {
  const area = chart.chartArea;
  if (!area) return der;
  const g = chart.ctx.createLinearGradient(area.left, 0, area.right, 0);
  g.addColorStop(0, izq);
  g.addColorStop(1, der);
  return g;
}

/** Texto blanco o tinta según lo claro que sea el relleno. */
function textoSobre(hex: string, tinta: string) {
  const m = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(m.slice(i, i + 2), 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.42 ? tinta : "#FFFFFF";
}

const animacion = (p: Paleta) => (p.reducido ? false : { duration: 700, easing: "easeOutQuart" as const });

/* ------------------------------ Tooltip HTML ------------------------------ */

/**
 * Tooltip propio en HTML con el estilo de las placas del CRM. Cada línea del
 * cuerpo llega como "Nombre|Valor"; el punto de color sale de la serie.
 */
function tooltipHtml<T extends ChartType>() {
  return {
    enabled: false,
    external({ chart, tooltip }: { chart: Chart; tooltip: TooltipModel<T> }) {
      const padre = chart.canvas.parentElement!;
      let el = padre.querySelector<HTMLDivElement>("[data-tooltip]");
      if (!el) {
        el = document.createElement("div");
        el.dataset.tooltip = "";
        el.className =
          "pointer-events-none absolute z-20 w-max min-w-44 whitespace-nowrap rounded-xl bg-placa px-3.5 py-3 text-xs shadow-[0_12px_32px_-8px_rgb(0_0_0/0.35)] ring-1 ring-linea transition-[opacity,transform] duration-150";
        padre.appendChild(el);
      }
      if (tooltip.opacity === 0) {
        el.style.opacity = "0";
        return;
      }
      el.replaceChildren();
      const titulo = tooltip.title?.join(" ");
      if (titulo) {
        const t = document.createElement("p");
        t.className = "mb-2 font-semibold text-tinta";
        t.textContent = titulo;
        el.appendChild(t);
      }
      tooltip.body.forEach((b, i) => {
        // Las barras usan degradados: el punto toma el color sólido de la serie.
        const dp = tooltip.dataPoints[i];
        const ds = dp ? chart.data.datasets[dp.datasetIndex] : undefined;
        const h = (ds?.hoverBackgroundColor ?? ds?.borderColor) as unknown;
        const color = Array.isArray(h) ? h[dp!.dataIndex] : typeof h === "string" ? h : tooltip.labelColors[i]?.backgroundColor;
        b.lines.forEach((linea, j) => {
          const [nombre, valor] = linea.includes("|") ? linea.split("|") : ["", linea];
          const fila = document.createElement("div");
          fila.className = "flex items-center gap-2 py-0.5";
          const punto = document.createElement("span");
          punto.className = "size-2 shrink-0 rounded-full";
          punto.style.background = j === 0 && typeof color === "string" ? color : "transparent";
          const n = document.createElement("span");
          n.className = "text-tinta-2";
          n.textContent = nombre;
          const v = document.createElement("span");
          v.className = "ml-auto pl-5 font-semibold tabular-nums text-tinta";
          v.textContent = valor;
          fila.append(punto, n, v);
          el.appendChild(fila);
        });
      });
      tooltip.footer?.forEach((linea) => {
        const [nombre, valor] = linea.split("|");
        const fila = document.createElement("div");
        fila.className = "mt-1.5 flex items-center gap-2 border-t border-linea pt-1.5";
        fila.innerHTML = "";
        const n = document.createElement("span");
        n.className = "pl-4 text-tinta-2";
        n.textContent = nombre;
        const v = document.createElement("span");
        v.className = "ml-auto pl-5 font-semibold tabular-nums text-tinta";
        v.textContent = valor ?? "";
        fila.append(n, v);
        el.appendChild(fila);
      });
      // Encima del punto; pegado a los bordes para no salirse del contenedor.
      const ancho = el.offsetWidth;
      const x = Math.min(Math.max(tooltip.caretX, ancho / 2 + 4), padre.clientWidth - ancho / 2 - 4);
      el.style.opacity = "1";
      el.style.left = `${x}px`;
      el.style.top = `${tooltip.caretY}px`;
      el.style.transform = "translate(-50%, calc(-100% - 14px))";
    },
  };
}

/* ------------------------------ Plugins propios ------------------------------ */

// Los plugins propios sirven para varios tipos de gráfico; chart.js no acepta Plugin<keyof ChartTypeRegistry> en cada <Chart> concreto.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PluginPropio = Plugin<any>;

type OpcionesRotulos = {
  formato: (v: number, i: number) => string;
  color: string;
  fuente: string;
  posicion: "centro" | "encima" | "final";
  colores?: string[];
};

/** Cifra junto a cada barra: centrada, encima (verticales) o al final (horizontales). */
const rotulos: PluginPropio = {
  id: "rotulos",
  afterDatasetsDraw(chart, _a, opciones) {
    const o = opciones as unknown as OpcionesRotulos | undefined;
    if (!o?.formato) return;
    const { ctx } = chart;
    ctx.save();
    chart.data.datasets.forEach((ds, i) => {
      const meta = chart.getDatasetMeta(i);
      if (meta.hidden || meta.type !== "bar" || (ds as { rotulos?: boolean }).rotulos === false) return;
      meta.data.forEach((el, j) => {
        const bruto = ds.data[j] as number | [number, number];
        const v = Array.isArray(bruto) ? bruto[1] - bruto[0] : Number(bruto);
        if (!v) return;
        const texto = o.formato(v, j);
        const { x, y, base } = el.getProps(["x", "y", "base"], true) as { x: number; y: number; base: number };
        ctx.font = `600 ${o.posicion === "centro" ? 12.5 : 11.5}px ${o.fuente}`;
        ctx.fillStyle = o.colores?.[j] ?? o.color;
        if (o.posicion === "centro") {
          const c = (el as unknown as { getCenterPoint(f: boolean): { x: number; y: number } }).getCenterPoint(true);
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(texto, c.x, c.y);
        } else if (o.posicion === "final") {
          ctx.textAlign = "left";
          ctx.textBaseline = "middle";
          ctx.fillText(texto, Math.max(x, base) + 10, y);
        } else {
          ctx.textAlign = "center";
          ctx.textBaseline = "bottom";
          ctx.fillText(texto, x, y - 7);
        }
      });
    });
    ctx.restore();
  },
};

/** Pista gris redondeada detrás de cada barra horizontal (aspecto de barra de progreso). */
const pista: PluginPropio = {
  id: "pista",
  beforeDatasetsDraw(chart, _a, opciones) {
    const o = opciones as { color?: string } | undefined;
    if (!o?.color) return;
    const { ctx, chartArea } = chart;
    const meta = chart.getDatasetMeta(0);
    ctx.save();
    ctx.fillStyle = o.color;
    meta.data.forEach((el) => {
      const { y, height } = el.getProps(["y", "height"], true) as { y: number; height: number };
      ctx.beginPath();
      ctx.roundRect(chartArea.left, y - height / 2, chartArea.right - chartArea.left, height, height / 2);
      ctx.fill();
    });
    ctx.restore();
  },
};

/** Línea vertical en el punto activo y halo suave bajo la curva. */
const lectura: PluginPropio = {
  id: "lectura",
  beforeDatasetDraw(chart, args, opciones) {
    const o = opciones as { brillo?: string } | undefined;
    if (!o?.brillo || chart.getDatasetMeta(args.index).type !== "line") return;
    chart.ctx.save();
    chart.ctx.shadowColor = o.brillo;
    chart.ctx.shadowBlur = 14;
    chart.ctx.shadowOffsetY = 6;
  },
  afterDatasetDraw(chart, args, opciones) {
    const o = opciones as { brillo?: string } | undefined;
    if (!o?.brillo || chart.getDatasetMeta(args.index).type !== "line") return;
    chart.ctx.restore();
  },
  afterDatasetsDraw(chart, _a, opciones) {
    const o = opciones as { color?: string } | undefined;
    const activo = chart.tooltip?.getActiveElements()?.[0];
    if (!activo || !o?.color) return;
    const { ctx, chartArea } = chart;
    ctx.save();
    ctx.strokeStyle = o.color;
    ctx.setLineDash([3, 4]);
    ctx.beginPath();
    ctx.moveTo(activo.element.x, chartArea.top);
    ctx.lineTo(activo.element.x, chartArea.bottom);
    ctx.stroke();
    ctx.restore();
  },
};

/** Texto en el centro del donut. */
const centro: PluginPropio = {
  id: "centro",
  afterDraw(chart, _a, opciones) {
    const o = opciones as { texto?: string; sub?: string; color?: string; color2?: string; fuente?: string } | undefined;
    if (!o?.texto) return;
    const meta = chart.getDatasetMeta(0);
    const arco = meta.data[0] as unknown as { x: number; y: number } | undefined;
    if (!arco) return;
    const { ctx } = chart;
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = o.color ?? "#000";
    ctx.font = `700 26px "Barlow Condensed", ${o.fuente}`;
    ctx.fillText(o.texto, arco.x, arco.y - 7);
    ctx.fillStyle = o.color2 ?? "#888";
    ctx.font = `500 11px ${o.fuente}`;
    ctx.fillText(o.sub ?? "", arco.x, arco.y + 14);
    ctx.restore();
  },
};

/* -------------------------------- Leyenda -------------------------------- */

function Leyenda({ items }: { items: { texto: string; tono: string }[] }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-tinta-2">
      {items.map((i) => (
        <li key={i.texto} className="inline-flex items-center gap-1.5">
          <span className="size-2 rounded-full" style={{ background: i.tono }} aria-hidden />
          {i.texto}
        </li>
      ))}
    </ul>
  );
}

/* ------------------------------ Embudo ------------------------------ */

type FilaEtapa = { etapa: Etapa; n: number; valor: number; esperado: number };

/**
 * Embudo del pipeline abierto: barras centradas y redondeadas, de más clara a
 * más intensa según se avanza. A la izquierda la etapa, en medio el valor y a
 * la derecha cuántas hay y qué parte pasa de la anterior. Al lado, un donut
 * con los cierres del periodo: ganado en verde, perdido en rojo.
 */
export function GraficoEmbudo({ datos }: { datos: FilaEtapa[] }) {
  const abiertas = ETAPAS_ABIERTAS_B2B.map((e) => datos.find((d) => d.etapa === e) ?? { etapa: e, n: 0, valor: 0, esperado: 0 });
  const ganada = datos.find((d) => d.etapa === "ganada");
  const perdida = datos.find((d) => d.etapa === "perdida");
  const hayAbiertas = abiertas.some((d) => d.valor > 0);
  const cerradas = (ganada?.n ?? 0) + (perdida?.n ?? 0);
  const ratio = cerradas > 0 ? ((ganada?.n ?? 0) / cerradas) * 100 : null;
  const totalAbierto = abiertas.reduce((s, d) => s + d.valor, 0);
  const maximo = Math.max(...abiertas.map((d) => d.valor), 1);
  const paso = abiertas.map((d, i) => (i > 0 && abiertas[i - 1].n > 0 ? (d.n / abiertas[i - 1].n) * 100 : null));
  // Etapa bajo el ratón: se ensancha y las demás se apagan.
  const [activa, setActiva] = useState<number | null>(null);

  return (
    <div className="grid h-full gap-6 lg:grid-cols-[minmax(0,1fr)_15rem]">
      <div className="flex min-w-0 flex-col">
        {hayAbiertas ? (
          <Lienzo alto={248} llenar etiqueta={`Embudo del pipeline abierto: ${dinero(totalAbierto)} en total`}>
            {(p) => {
              const tonos = [p["rampa-2"], p["rampa-3"], p["rampa-4"], p["rampa-5"]];
              const opciones: ChartOptions<"bar"> = {
                indexAxis: "y",
                maintainAspectRatio: false,
                animation: animacion(p) && { duration: 420, easing: "easeOutQuart" },
                layout: { padding: { right: 118 } },
                onHover: (_e, els, chart) => {
                  const i = els[0]?.index ?? null;
                  // El plugin del lateral se crea una vez: lee la etapa del propio gráfico.
                  (chart as Chart & { $activa?: number | null }).$activa = i;
                  if (i !== activa) setActiva(i);
                },
                scales: {
                  x: { display: false, min: -maximo / 2, max: maximo / 2 },
                  y: {
                    grid: { display: false },
                    border: { display: false },
                    ticks: { color: p.tinta, padding: 14, font: { family: p.fuente, size: 12.5, weight: 500 } },
                  },
                },
                plugins: {
                  legend: { display: false },
                  tooltip: {
                    ...tooltipHtml(),
                    callbacks: {
                      title: (items) => ETIQUETA_ETAPA[abiertas[items[0].dataIndex].etapa],
                      label: (item) => {
                        const f = abiertas[item.dataIndex];
                        return [`Valor|${dinero(f.valor)}`, `Esperado|${dinero(f.esperado)}`, `Oportunidades|${numero(f.n)}`];
                      },
                    },
                  },
                  // @ts-expect-error plugin propio
                  rotulos: { formato: (_v: number, i: number) => euroCorto(abiertas[i].valor), color: "#FFFFFF", fuente: p.fuente, posicion: "centro", colores: tonos.map((t) => textoSobre(t, "#111113")) },
                },
              };
              const lateral: Plugin<"bar"> = {
                id: "lateral",
                afterDatasetsDraw(chart) {
                  const { ctx, chartArea } = chart;
                  const sel = (chart as Chart & { $activa?: number | null }).$activa ?? null;
                  ctx.save();
                  chart.getDatasetMeta(0).data.forEach((el, i) => {
                    const { y } = el.getProps(["y"], true) as { y: number };
                    const x = chartArea.right + 118;
                    ctx.textAlign = "right";
                    ctx.textBaseline = "alphabetic";
                    ctx.globalAlpha = sel != null && i !== sel ? 0.4 : 1;
                    ctx.fillStyle = p.tinta;
                    ctx.font = `700 17px "Barlow Condensed", ${p.fuente}`;
                    ctx.fillText(numero(abiertas[i].n), x, y + 1);
                    ctx.fillStyle = p["tinta-2"];
                    ctx.font = `500 11px ${p.fuente}`;
                    ctx.textBaseline = "top";
                    ctx.fillText(paso[i] == null ? "entrada" : `${porcentaje(paso[i]!)} de la anterior`, x, y + 4);
                  });
                  ctx.restore();
                },
              };
              return (
                <Bar
                  plugins={[rotulos, lateral]}
                  options={opciones}
                  data={{
                    labels: abiertas.map((d) => ETIQUETA_ETAPA[d.etapa]),
                    datasets: [
                      {
                        data: abiertas.map((d, i) => {
                          const v = Math.max(d.valor, maximo * 0.06) * (i === activa ? 1.07 : 1);
                          return [-v / 2, v / 2];
                        }),
                        backgroundColor: (c: ScriptableContext<"bar">) => {
                          const t = tonos[c.dataIndex] ?? tonos[0];
                          if (activa != null && c.dataIndex !== activa) return alfa(t, 0.32);
                          return degradadoH(c.chart, alfa(t, 0.88), t);
                        },
                        hoverBackgroundColor: tonos,
                        borderRadius: 14,
                        borderSkipped: false,
                        barPercentage: 0.7,
                        categoryPercentage: 1,
                      },
                    ],
                  }}
                />
              );
            }}
          </Lienzo>
        ) : (
          <p className="grid h-[248px] place-items-center text-sm text-tinta-2">No hay oportunidades abiertas.</p>
        )}
      </div>

      <div className="flex flex-col items-center justify-center gap-4 rounded-2xl bg-fondo p-4">
        <p className="self-start text-xs font-medium text-tinta-2 lg:-mt-auto lg:mb-auto">Cerradas en el periodo</p>
        {ratio != null ? (
          <Lienzo alto={150} etiqueta={`${porcentaje(ratio)} de las cerradas, ganadas`}>
            {(p) => (
              <Doughnut
                plugins={[centro]}
                options={{
                  maintainAspectRatio: false,
                  cutout: "76%",
                  layout: { padding: 8 },
                  animation: animacion(p) ? { animateRotate: true, duration: 800 } : false,
                  plugins: {
                    legend: { display: false },
                    tooltip: {
                      ...tooltipHtml(),
                      callbacks: {
                        title: () => "",
                        label: (item) =>
                          item.dataIndex === 0
                            ? `Ganadas|${numero(ganada?.n ?? 0)} · ${dinero(ganada?.valor ?? 0)}`
                            : `Perdidas|${numero(perdida?.n ?? 0)} · ${dinero(perdida?.valor ?? 0)}`,
                      },
                    },
                    // @ts-expect-error plugin propio
                    centro: { texto: porcentaje(ratio), sub: "de éxito", color: p.tinta, color2: p["tinta-2"], fuente: p.fuente },
                  },
                }}
                data={{
                  labels: ["Ganadas", "Perdidas"],
                  datasets: [
                    {
                      data: [ganada?.n ?? 0, perdida?.n ?? 0],
                      backgroundColor: [p.exito, p.critico],
                      hoverBackgroundColor: [p.exito, p.critico],
                      borderWidth: 0,
                      borderRadius: 8,
                      spacing: 4,
                      hoverOffset: 8,
                    },
                  ],
                }}
              />
            )}
          </Lienzo>
        ) : (
          <p className="grid h-[150px] place-items-center text-center text-xs text-tinta-2">Sin cierres en el periodo</p>
        )}
        <dl className="grid w-full grid-cols-2 gap-2 text-center">
          <div className="rounded-xl bg-exito-suave px-2 py-2">
            <dt className="text-[0.7rem] font-medium text-exito">Ganado</dt>
            <dd className="cifra mt-0.5 text-lg text-tinta">{euroCorto(ganada?.valor ?? 0)}</dd>
          </div>
          <div className="rounded-xl bg-critico-suave px-2 py-2">
            <dt className="text-[0.7rem] font-medium text-critico">Perdido</dt>
            <dd className="cifra mt-0.5 text-lg text-tinta">{euroCorto(perdida?.valor ?? 0)}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}

/* ------------------------------- Por tipo ------------------------------- */

const DIRECCIONES = [
  { clave: "venta", texto: "Venta", serie: "serie-1" },
  { clave: "compra", texto: "Compra", serie: "serie-2" },
  { clave: "alianza", texto: "Alianza", serie: "serie-3" },
] as const;
const serieDireccion = (p: Paleta, t: TipoOportunidad) => p[DIRECCIONES.find((d) => d.clave === DIRECCION_TIPO[t])!.serie];

/** Barras horizontales sobre una pista gris, coloreadas por dirección del dinero. */
export function GraficoTipos({ datos }: { datos: { tipo: TipoOportunidad; n: number; valor: number }[] }) {
  const alto = Math.max(180, datos.length * 34 + 8);
  const presentes = DIRECCIONES.filter((d) => datos.some((x) => DIRECCION_TIPO[x.tipo] === d.clave));
  return (
    <div className="flex flex-col gap-3">
      <Lienzo alto={alto} etiqueta="Valor abierto por tipo de oportunidad">
        {(p) => {
          const colores = datos.map((d) => serieDireccion(p, d.tipo));
          const opciones: ChartOptions<"bar"> = {
            indexAxis: "y",
            maintainAspectRatio: false,
            animation: animacion(p),
            layout: { padding: { right: 52 } },
            scales: {
              x: { display: false, beginAtZero: true },
              y: {
                grid: { display: false },
                border: { display: false },
                ticks: { color: p["tinta-2"], padding: 8, font: { family: p.fuente, size: 11.5 } },
              },
            },
            plugins: {
              legend: { display: false },
              tooltip: {
                ...tooltipHtml(),
                callbacks: {
                  label: (item) => [`Valor abierto|${dinero(datos[item.dataIndex].valor)}`, `Oportunidades|${numero(datos[item.dataIndex].n)}`],
                },
              },
              // @ts-expect-error plugin propio
              pista: { color: p["placa-2"] },
              rotulos: { formato: euroCorto, color: p.tinta, fuente: p.fuente, posicion: "final" },
            },
          };
          return (
            <Bar
              plugins={[pista, rotulos]}
              options={opciones}
              data={{
                labels: datos.map((d) => ETIQUETA_TIPO_OPORTUNIDAD[d.tipo]),
                datasets: [
                  {
                    data: datos.map((d) => d.valor),
                    backgroundColor: (c: ScriptableContext<"bar">) =>
                      degradadoH(c.chart, alfa(colores[c.dataIndex] ?? colores[0], 0.75), colores[c.dataIndex] ?? colores[0]),
                    hoverBackgroundColor: colores,
                    borderRadius: 99,
                    borderSkipped: false,
                    barPercentage: 0.56,
                    categoryPercentage: 1,
                  },
                ],
              }}
            />
          );
        }}
      </Lienzo>
      <Leyenda items={presentes.map((d) => ({ texto: d.texto, tono: `var(--${d.serie})` }))} />
    </div>
  );
}

/* ---------------------------- Series por mes ---------------------------- */

type Mes = { mes: string; creadas: number; valorCreado: number; ganadas: number; perdidas: number; valorGanado: number; pipeline: number };

function ejes(p: Paleta, formatoY?: (v: number) => string) {
  const ticks = { color: p["tinta-2"], font: { family: p.fuente, size: 11.5 } };
  return {
    x: { grid: { display: false }, border: { display: false }, ticks },
    y: {
      beginAtZero: true,
      grid: { color: alfa(p.linea, 0.9) },
      border: { display: false, dash: [3, 4] },
      ticks: { ...ticks, maxTicksLimit: 5, padding: 8, precision: 0, callback: (v: number | string) => (formatoY ? formatoY(Number(v)) : v) },
    },
  };
}

/** Oportunidades creadas por mes; el mes en curso, destacado. */
export function GraficoCreadas({ datos }: { datos: Mes[] }) {
  return (
    <Lienzo alto={220} etiqueta="Oportunidades creadas por mes">
      {(p) => {
        const ultimo = datos.length - 1;
        const opciones: ChartOptions<"bar"> = {
          maintainAspectRatio: false,
          animation: animacion(p),
          layout: { padding: { top: 22 } },
          scales: ejes(p),
          plugins: {
            legend: { display: false },
            tooltip: {
              ...tooltipHtml(),
              callbacks: {
                label: (item) => [`Creadas|${numero(datos[item.dataIndex].creadas)}`, `Valor|${dinero(datos[item.dataIndex].valorCreado)}`],
              },
            },
            // @ts-expect-error plugin propio
            rotulos: { formato: (v: number) => `${v}`, color: p["tinta-2"], fuente: p.fuente, posicion: "encima" },
          },
        };
        return (
          <Bar
            plugins={[rotulos]}
            options={opciones}
            data={{
              labels: datos.map((d) => mesCorto(d.mes)),
              datasets: [
                {
                  data: datos.map((d) => d.creadas),
                  backgroundColor: (c: ScriptableContext<"bar">) =>
                    c.dataIndex === ultimo
                      ? degradadoV(c.chart, p["rampa-5"], alfa(p["rampa-5"], 0.6))
                      : degradadoV(c.chart, p["serie-1"], alfa(p["serie-1"], 0.55)),
                  hoverBackgroundColor: p["serie-1"],
                  borderRadius: 8,
                  borderSkipped: false,
                  barPercentage: 0.66,
                },
              ],
            }}
          />
        );
      }}
    </Lienzo>
  );
}

/** Cierres por mes: ganadas en verde, perdidas en rojo, lado a lado. */
export function GraficoGanadasPerdidas({ datos }: { datos: Mes[] }) {
  return (
    <div className="flex flex-col gap-3">
      <Leyenda
        items={[
          { texto: "Ganadas", tono: "var(--exito)" },
          { texto: "Perdidas", tono: "var(--critico)" },
        ]}
      />
      <Lienzo alto={196} etiqueta="Oportunidades ganadas y perdidas por mes">
        {(p) => {
          const opciones: ChartOptions<"bar"> = {
            maintainAspectRatio: false,
            animation: animacion(p),
            interaction: { mode: "index", intersect: false },
            scales: ejes(p),
            plugins: {
              legend: { display: false },
              tooltip: {
                ...tooltipHtml(),
                callbacks: {
                  label: (item) => `${item.dataset.label}|${numero(Number(item.raw))}`,
                  footer: (items) => `Valor ganado|${dinero(datos[items[0].dataIndex].valorGanado)}`,
                },
              },
            },
          };
          const barra = { borderRadius: 6, borderSkipped: false as const, barPercentage: 0.86, categoryPercentage: 0.6 };
          return (
            <Bar
              options={opciones}
              data={{
                labels: datos.map((d) => mesCorto(d.mes)),
                datasets: [
                  {
                    label: "Ganadas",
                    data: datos.map((d) => d.ganadas),
                    backgroundColor: (c: ScriptableContext<"bar">) => degradadoV(c.chart, p.exito, alfa(p.exito, 0.45)),
                    hoverBackgroundColor: p.exito,
                    ...barra,
                  },
                  {
                    label: "Perdidas",
                    data: datos.map((d) => d.perdidas),
                    backgroundColor: (c: ScriptableContext<"bar">) => degradadoV(c.chart, p.critico, alfa(p.critico, 0.45)),
                    hoverBackgroundColor: p.critico,
                    ...barra,
                  },
                ],
              }}
            />
          );
        }}
      </Lienzo>
    </div>
  );
}

/** Valor abierto al cierre de cada mes (el último, a día de hoy), con su variación. */
export function GraficoPipeline({ datos }: { datos: Mes[] }) {
  const ultimo = datos.at(-1)?.pipeline ?? 0;
  const anterior = datos.at(-2)?.pipeline ?? 0;
  const delta = anterior > 0 ? ((ultimo - anterior) / anterior) * 100 : null;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline gap-3">
        <span className="cifra text-3xl text-tinta">{dinero(ultimo)}</span>
        {delta != null && Math.round(delta) !== 0 && <Variacion delta={delta} />}
        <span className="text-xs text-tinta-2">vs. mes anterior</span>
      </div>
      <Lienzo alto={180} etiqueta="Evolución del valor del pipeline abierto">
        {(p) => {
          const n = datos.length;
          const opciones: ChartOptions<"line"> = {
            maintainAspectRatio: false,
            animation: animacion(p),
            interaction: { mode: "index", intersect: false },
            scales: ejes(p, euroCorto),
            plugins: {
              legend: { display: false },
              tooltip: {
                ...tooltipHtml(),
                callbacks: { label: (item) => `Pipeline abierto|${dinero(Number(item.raw))}` },
              },
              // @ts-expect-error plugin propio
              lectura: { color: alfa(p["tinta-2"], 0.6), brillo: alfa(p["serie-1"], 0.45) },
            },
          };
          return (
            <Line
              plugins={[lectura]}
              options={opciones}
              data={{
                labels: datos.map((d) => mesCorto(d.mes)),
                datasets: [
                  {
                    data: datos.map((d) => d.pipeline),
                    borderColor: p["serie-1"],
                    borderWidth: 2.5,
                    backgroundColor: (c: ScriptableContext<"line">) => degradadoV(c.chart, alfa(p["serie-1"], 0.32), alfa(p["serie-1"], 0)),
                    fill: "origin",
                    tension: 0.4,
                    cubicInterpolationMode: "monotone",
                    // Sólo el último punto a la vista: dónde estamos hoy.
                    pointRadius: (c: ScriptableContext<"line">) => (c.dataIndex === n - 1 ? 4.5 : 0),
                    pointHoverRadius: 6,
                    pointBackgroundColor: p.placa,
                    pointBorderColor: p["serie-1"],
                    pointBorderWidth: 2.5,
                    pointHoverBackgroundColor: p["serie-1"],
                    pointHoverBorderColor: p.placa,
                    pointHitRadius: 18,
                  },
                ],
              }}
            />
          );
        }}
      </Lienzo>
    </div>
  );
}

/** Variación con flecha, texto y color: verde si sube, rojo si baja. Nunca sólo color. */
export function Variacion({ delta, bueno = "sube" }: { delta: number; bueno?: "sube" | "baja" }) {
  const sube = delta > 0;
  const positivo = bueno === "sube" ? sube : !sube;
  const Icono = sube ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-xs font-semibold tabular-nums ${
        positivo ? "bg-exito-suave text-exito" : "bg-critico-suave text-critico"
      }`}
    >
      <Icono className="size-3" weight="bold" aria-hidden />
      {Math.abs(Math.round(delta))}%<span className="sr-only">{sube ? " más" : " menos"} que el mes pasado</span>
    </span>
  );
}
