import { Plus } from "@phosphor-icons/react/dist/ssr";

/** Preguntas con <details>: funcionan sin JavaScript y con teclado. */
export function Faq({ preguntas }: { preguntas: { p: string; r: string }[] }) {
  return (
    <div className="border-t border-tinta">
      {preguntas.map((q) => (
        <details key={q.p} className="group border-b border-linea">
          <summary className="flex cursor-pointer list-none items-start justify-between gap-6 py-4 text-tinta hover:text-tinta [&::-webkit-details-marker]:hidden">
            <span className="font-semibold">{q.p}</span>
            <Plus
              size={16}
              weight="bold"
              aria-hidden="true"
              className="mt-1 shrink-0 text-tinta-2 transition-transform duration-200 ease-[var(--ease-salida)] group-open:rotate-45"
            />
          </summary>
          <p className="max-w-[68ch] pb-5 text-tinta-2">{q.r}</p>
        </details>
      ))}
    </div>
  );
}
