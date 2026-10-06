# Ice Gym · Web + CRM para gimnasios

**Una web de gimnasio con estética de retransmisión deportiva y un CRM comercial completo, montados con tus datos por tu propia IA.**

Pegas un prompt, contestas unas 25 preguntas (nombre, centros, tarifas, clases, colores) y la IA instala, personaliza, crea la base de datos y despliega. El resultado es idéntico a la demo, pero con tu marca.

## Qué incluye

**Web pública**
- Portada a pantalla completa con parallax y un marcador de horarios de hoy por centro
- Manifiesto con revelado palabra a palabra y marquesina reactiva al scroll
- Galería horizontal de instalaciones
- «Marcador del club» con cifras calculadas en vivo
- Tarifas con la recomendada destacada
- Centros con estado abierto/cerrado en tiempo real y Google Maps
- Panel de clases tipo aeropuerto, filtrable por centro
- Formulario «Reserva tu visita» que crea leads, con antispam y consentimiento RGPD

**CRM comercial (`/crm`)**
- Dashboard con KPIs, embudo y gráficas
- Pipeline Kanban con arrastrar y soltar
- Empresas, contactos, actividades y tareas
- Búsqueda ⌘K
- Tema claro y oscuro
- Login de equipo

**Técnico:** Next.js 16, React 19, Tailwind v4, Supabase con RLS y despliegue en Vercel. Funciona en los planes gratis.

## Qué necesitas

- Una IA. Lo ideal es un agente que toque archivos (Claude Code, Cursor, Windsurf, Codex); también vale un chat como claude.ai o ChatGPT, siguiendo los pasos a mano.
- Node.js 20 o superior y cuentas gratis de Supabase y Vercel.
- Tus datos: centros, tarifas, horario de clases y, si las tienes, fotos.

## Cómo se usa

1. Descomprime el paquete.
2. Abre tu IA en esa carpeta.
3. Pega el contenido de `PROMPT.md`.
4. Responde a las preguntas.

Tiempo estimado: de 20 a 40 minutos con un agente y de 1 a 2 horas en modo chat.

## Contenido del paquete

| Archivo | Para qué |
|---|---|
| `PROMPT.md` | El prompt maestro que pegas en tu IA |
| `PERSONALIZAR.md` | El mapa de cambios que sigue la IA |
| `SPEC.md` | La especificación completa, por si quieres reconstruirlo sin el kit |
| `kit/` | El código fuente original, verificado: `next build` pasa |

## Avisos

- Las fotos y los datos del CRM son **de ejemplo**: cámbialos antes de publicar.
- Pensado para 1-4 centros y 1-4 tarifas.
- El texto de la web está en español; la IA puede traducirlo si se lo pides.
