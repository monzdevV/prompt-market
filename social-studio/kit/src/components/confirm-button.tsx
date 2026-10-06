"use client";

import { useEffect, useState } from "react";

/**
 * Botón con confirmación en dos pasos (sin diálogos nativos del navegador):
 * el primer clic cambia el texto a "¿Seguro?"; el segundo ejecuta. Se cancela solo a los 4 s.
 */
export function ConfirmButton({
  onConfirm,
  children,
  confirmLabel = "¿Seguro? Pulsa otra vez",
  className = "btn-danger btn-sm",
  disabled,
}: {
  onConfirm: () => void | Promise<void>;
  children: React.ReactNode;
  confirmLabel?: string;
  className?: string;
  disabled?: boolean;
}) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 4000);
    return () => clearTimeout(t);
  }, [armed]);

  return (
    <button
      type="button"
      disabled={disabled}
      className={`${className} ${armed ? "bg-bad-soft" : ""}`}
      aria-live="polite"
      onBlur={() => setArmed(false)}
      onKeyDown={(e) => e.key === "Escape" && setArmed(false)}
      onClick={() => {
        if (!armed) return setArmed(true);
        setArmed(false);
        void onConfirm();
      }}
    >
      {armed ? confirmLabel : children}
    </button>
  );
}
