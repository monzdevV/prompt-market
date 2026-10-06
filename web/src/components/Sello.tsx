// Estado como marca de tampón, no como píldora de color: borde doble, mayúsculas, giro leve.
export function Sello({
  children,
  tono = "senal",
  className = "",
}: {
  children: React.ReactNode;
  tono?: "senal" | "tinta";
  className?: string;
}) {
  const color = tono === "senal" ? "text-senal-texto border-senal-texto" : "text-tinta-2 border-tinta-2";
  return (
    <span
      className={`inline-flex items-center gap-1.5 border-[1.5px] border-double px-1.5 py-0.5 rotulo-medio text-[0.7rem] leading-none tracking-[0.08em] ${color} ${className}`}
      style={{ borderStyle: "double", borderWidth: 3 }}
    >
      {children}
    </span>
  );
}
