import { Fragment } from "react";

// Markdown en línea de los README: **negrita**, `código` y [enlace](url). Nada más.
export function TextoRico({ texto }: { texto: string }) {
  const partes = texto.split(/(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g);
  return (
    <>
      {partes.map((p, i) => {
        if (p.startsWith("**") && p.endsWith("**")) return <strong key={i} className="font-semibold text-tinta">{p.slice(2, -2)}</strong>;
        if (p.startsWith("`") && p.endsWith("`"))
          return (
            <code key={i} className="font-mono text-[0.86em] text-tinta">
              {p.slice(1, -1)}
            </code>
          );
        const enlace = p.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
        if (enlace)
          return (
            <a key={i} href={enlace[2]} className="underline" rel="noopener noreferrer" target="_blank">
              {enlace[1]}
            </a>
          );
        return <Fragment key={i}>{p}</Fragment>;
      })}
    </>
  );
}
