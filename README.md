# Prompt Market: formato de los paquetes

Cada producto del marketplace es una carpeta con esta forma:

```
<producto>/
├── README.md       Ficha de producto: qué es, qué incluye, requisitos y cómo usarlo
├── PROMPT.md       Prompt maestro. El comprador lo pega en su IA; entrevista y construye
├── SPEC.md         Especificación legible (diseño, datos, pantallas). Sirve para reconstruir sin el kit
├── PERSONALIZAR.md Mapa exacto archivo → qué cambiar con los datos del comprador
└── kit/            Código original, completo y verificado (que compila tal cual)
```

## Por qué kit + prompt (y no solo prompt)

Ninguna IA reescribe 20.000 líneas igual dos veces: un prompt solo produce algo *parecido*.
El 1:1 lo garantiza el **kit**: el prompt no reinventa el proyecto, lo **instala y lo personaliza**.

| Modo | IA del comprador | Resultado |
|---|---|---|
| **A · Agente** | Claude Code, Cursor, Windsurf, Codex, Copilot Agent… | 1:1 exacto. Copia el kit, aplica `PERSONALIZAR.md`, monta la base de datos y despliega |
| **B · Chat** | claude.ai, ChatGPT, Gemini… | Le guía paso a paso y le da los archivos personalizados uno a uno; el comprador los pega |
| **C · Sin kit** | Cualquiera | Reconstruye desde `SPEC.md`. Es fiel en diseño y funciones, pero no idéntico línea a línea |

## Reglas que cumplen todos los prompts maestros

1. **Entrevista primero**, por bloques cortos. Cada pregunta trae un valor por defecto («deja el de la demo»).
2. **Resumen y confirmación** antes de tocar nada. Los datos se guardan en `negocio.json`.
3. **El diseño no se toca**: solo cambian los datos y los textos de marca. Se pueden cambiar colores si el comprador lo pide.
4. **Nunca se inventan datos**: ni reseñas, ni cifras, ni clientes. Si falta un dato, la sección se oculta o se queda el texto neutro.
5. **Secretos**: las claves solo van a `.env.local`; nunca se escriben en el chat ni en el código.
6. **Se verifica al final**: el proyecto compila, arranca y pasa la checklist.

## Añadir un producto nuevo

1. Copia el proyecto a `<producto>/kit/`, sin `node_modules`, `.next`, `.env*` (salvo `.env.example`) ni archivos personales.
2. Exporta la base de datos limpia a `kit/supabase/00_schema.sql`, más los seeds necesarios.
3. Comprueba que el kit compila solo: `npm ci && npx tsc --noEmit && npm run build`.
4. Genera `PERSONALIZAR.md` buscando todo lo que sea de marca: nombre, ciudades, teléfonos, textos, imágenes y colores.
5. Escribe `PROMPT.md` partiendo del de `ice-gym/` y cambia solo los bloques de entrevista y personalización.
