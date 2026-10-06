// Identidad de la tienda. El nombre es PROVISIONAL: cámbialo aquí y se actualiza en toda la web.
export const marca = {
  nombre: "Calco",
  lema: "Proyectos completos que tu IA monta con tus datos",
  descripcion:
    "Paquetes con prompt maestro y kit de código verificado. Pegas el prompt en tu IA, respondes a sus preguntas y el proyecto queda montado igual que la demo, con tu marca y tus datos.",
  // Dominio pendiente: se usa para metadataBase, sitemap y OG.
  url: process.env.NEXT_PUBLIC_URL_SITIO ?? "http://localhost:3420",
  // Datos del titular: PENDIENTES. Aparecen como hueco visible en las páginas legales.
  titular: {
    nombre: "[Nombre y apellidos o razón social]",
    nif: "[NIF]",
    domicilio: "[Domicilio]",
    email: "[email de contacto]",
  },
} as const;

// IAs compatibles: solo texto, sin logos (marcas registradas de terceros).
export const iasAgente = ["Claude Code", "Cursor", "Windsurf", "Codex", "Copilot Agent"] as const;
export const iasChat = ["claude.ai", "ChatGPT", "Gemini"] as const;
