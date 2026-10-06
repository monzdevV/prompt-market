# Product

<!-- impeccable:product-schema 1 -->

> Escrito sin ronda de preguntas (lo construyó un subagente sin canal con el usuario). Lo marcado como **[inferido]** sale del encargo y de los paquetes existentes; revísalo.

## Platform

web

## Stack

Fijado por el encargo: Next.js 16 (App Router, TypeScript) + Tailwind v4. Sin base de datos. Catálogo generado en build desde las carpetas de producto hermanas (`../<producto>/`). Pago con Stripe Payment Links (sin backend).

## Users

- **Comprador principal [inferido]:** persona que ya usa una IA para programar (Claude Code, Cursor, Windsurf, Codex) o un chat (claude.ai, ChatGPT, Gemini) y quiere un proyecto completo funcionando con sus datos sin pagar una agencia: dueño de un gimnasio, creador de contenido, freelance que necesita portfolio, desarrollador junior que monta productos para clientes.
- Llega desde redes o búsqueda, compara qué incluye cada paquete, qué necesita tener instalado y cuánto tarda, y decide si paga.

## Product Purpose

Marketplace de **proyectos completos instalables por IA**. Cada producto es un paquete: `PROMPT.md` maestro + `kit/` de código verificado (compila tal cual) + `SPEC.md` + `PERSONALIZAR.md`. El comprador pega el prompt en su IA, la IA le entrevista y deja el proyecto montado 1:1 con su marca y sus datos.

Éxito: el visitante entiende en segundos que no compra «un prompt» sino un proyecto real que su IA instala, ve exactamente qué recibe y qué necesita, y compra.

## Positioning

«Como 21st.dev, pero con proyectos completos». Un prompt solo produce algo *parecido*; aquí el 1:1 lo garantiza el kit: el prompt no reinventa el proyecto, lo instala y lo personaliza. Tres modos: agente (1:1 exacto), chat (guiado archivo a archivo) y sin kit (reconstrucción desde SPEC).

## Operating Context

- Formato de paquete en `../README.md`. Productos actuales: ice-gym, tubegen, social-studio (Manny), portfolio (Caída estelar). `partyup-profe` existe pero **no se publica** (derechos pendientes).
- Reglas comunes de los prompts: entrevista por bloques con valores por defecto, resumen y confirmación, diseño intocable, nunca inventar datos, secretos solo en `.env.local`, verificación final.
- Entrega tras la compra: zip por producto generado con `scripts/empaquetar.mjs`.

## Capabilities and Constraints

- Sin backend de pago: el botón abre el Payment Link de Stripe del `producto.json`; vacío → «Próximamente» deshabilitado.
- La vista previa del prompt muestra solo las primeras ~25 líneas. Nunca el prompt completo ni el kit.
- **Precios: borrador**, pendientes de validar por el usuario.
- **Nombre de marca: provisional [inferido]** («Calco»), centralizado en `src/lib/marca.ts`.
- Textos legales: borrador para revisión profesional.
- Todo el texto en español de España.

## Brand Commitments

- Seria y editorial, de herramienta de desarrollador (referencias del encargo: 21st.dev, Linear, Vercel), con personalidad propia.
- Prohibido: degradados morados, hero centrado genérico con tres tarjetas iguales, emojis como iconos, logos de marcas registradas de las IAs (solo texto).

## Evidence on Hand

- README, PROMPT, SPEC y PERSONALIZAR reales de cada paquete (fuente del catálogo).
- No hay capturas de producto, testimonios, cifras de ventas ni clientes: **no se inventan**.

## Product Principles

1. Enseñar el material real (el prompt, la lista de archivos, los requisitos) antes que adjetivos.
2. Honestidad sobre requisitos y avisos: el comprador ve lo que necesita y lo que no hace el producto.
3. Lo que no está listo se ve como no listo (precio borrador, «Próximamente»).

## Accessibility & Inclusion

WCAG 2.2 AA, foco visible con teclado, `prefers-reduced-motion`, usable a 375 px.
