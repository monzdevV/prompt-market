import type { Bloque } from "@/lib/catalogo";
import { TextoRico } from "./TextoRico";

/** Pinta los bloques extraídos de un README con la tipografía del albarán. */
export function Bloques({ bloques }: { bloques: Bloque[] }) {
  return (
    <div className="space-y-4">
      {bloques.map((b, i) => {
        switch (b.t) {
          case "sub":
          case "h":
            return (
              <h3 key={i} className="rotulo-medio pt-4 text-lg tracking-[0.03em] text-tinta first:pt-0">
                <TextoRico texto={b.texto} />
              </h3>
            );
          case "p":
            return (
              <p key={i} className="max-w-[68ch] text-tinta-2">
                <TextoRico texto={b.texto} />
              </p>
            );
          case "lista":
            return (
              <ul key={i} className="max-w-[68ch] border-t border-linea">
                {b.items.map((it, j) => (
                  <li key={j} className={`border-b border-linea py-2.5 text-tinta-2 ${it.nivel ? "pl-6 text-sm" : ""}`}>
                    <TextoRico texto={it.texto} />
                  </li>
                ))}
              </ul>
            );
          case "pasos":
            return (
              <ol key={i} className="max-w-[68ch] list-decimal space-y-1 pl-5 text-tinta-2 marker:text-tinta-3">
                {b.items.map((it, j) => (
                  <li key={j}>
                    <TextoRico texto={it.texto} />
                  </li>
                ))}
              </ol>
            );
          case "tabla":
            return (
              <div key={i} className="max-w-[68ch] overflow-x-auto">
                <table className="w-full border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-tinta">
                      {b.cabecera.map((c, j) => (
                        <th key={j} scope="col" className="campo py-2 pr-4 font-semibold">
                          <TextoRico texto={c} />
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {b.filas.map((f, j) => (
                      <tr key={j} className="border-b border-linea">
                        {f.map((c, k) => (
                          <td key={k} className={`py-2.5 pr-4 align-top ${k === 0 ? "text-tinta" : "text-tinta-2"}`}>
                            <TextoRico texto={c} />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
        }
      })}
    </div>
  );
}
