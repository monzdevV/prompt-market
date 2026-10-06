# SPEC · Ice Gym (web pública + CRM B2B)

Especificación para reconstruir el proyecto **sin el kit** (modo C). Si tienes `kit/`, el código manda sobre este documento.

## 1 · Producto

- **Web pública** de una cadena de gimnasios (3 centros de ejemplo: Chamberí en Madrid, Poblenou en Barcelona y Ruzafa en Valencia). Su objetivo es que el visitante reserve una visita, lo que crea un lead en la base de datos.
- **CRM comercial B2B** en `/crm` para el equipo interno: proveedores, partners y clientes corporativos, con pipeline de oportunidades, contactos, actividades y tareas.
- Todo en español (España), en `es-ES`, `EUR` y `Europe/Madrid`.

## 2 · Stack y estructura

Next.js 16.3 (App Router, TypeScript, Turbopack), React 19.2, Tailwind v4 (`@theme inline`), shadcn/ui (radix-ui) muy personalizado, `motion` 13, `lenis`, `@phosphor-icons/react` (iconos de trazo fino), `recharts` + `chart.js`/`react-chartjs-2` + `chartjs-chart-funnel`, `@dnd-kit` (Kanban), `sonner` (toasts), `@supabase/ssr`.

```
src/
├── marca.ts                 Identidad: nombre, logo, dominio, contacto, zona horaria, locale (todo lo de marca)
├── proxy.ts                 Middleware de Next 16: refresca la sesión, protege /crm/* y reescribe "/" a /crm en hosts crm-*
├── design/tokens.ts         ÚNICA fuente de colores. cssTemas() genera las variables CSS que el layout inyecta en <head>
├── app/
│   ├── layout.tsx           Fuentes (Barlow Condensed 600-800 + itálica → --font-display; Barlow 400-600 → --font-body), <style> de temas, script anti-parpadeo y Toaster
│   ├── page.tsx             Landing: datosLanding() → secciones
│   ├── acciones-web.ts      Server action pedirVisita (valida, honeypot "web", inserta el lead sin .select())
│   ├── globals.css          Mapea las variables a Tailwind; .ruido; .corte-*; radios a 0 en la web
│   └── crm/                 layout (fuentes Hanken Grotesk + Barlow Condensed, sidebar, paleta ⌘K), páginas y acciones
├── components/landing/      Cabecera, Portada, Manifiesto, Instalaciones, Cifras, Tarifas, Centros, Clases, Visita, Pie, Movimiento, ScrollSuave
├── components/crm/          Navegacion, PaletaComandos, Primitivas, dashboard/, oportunidades/, empresas/, contactos/, actividad/
├── components/marca/        Logotipo (variantes "linea" | "apilado", prop sobrePlaca)
└── lib/                     supabase/ (client, server, sesion, env), datos/ (consultas), tipos.ts, b2b.ts (catálogos), formato.ts
```

Entorno: solo `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Nunca la service_role. Dev en el puerto 3210.

## 3 · Dirección visual

**Mundo:** grafismo de retransmisión deportiva. Fría, intensa, de marca real de fitness; que no parezca hecha por IA.

- **Paleta:** negro `#0A0B0D`, blanco hielo `#F2F7FA` y azul hielo `#5CE1FF`. El azul solo se usa como campo sólido con texto negro encima, o como texto sobre negro. El bengala `#FF4D2E`, muy poco y solo para alarmas.
- **Tipografía:** titulares en Barlow Condensed 800, en MAYÚSCULAS, gigantes (`clamp()` hasta 13-14rem). Texto en Barlow. Cifras tabulares.
- **Formas:** esquinas rectas en la web. Cortes en diagonal (`clip-path`, desplazamiento de 12/14/22 px ≈ 70°) en botones, placas y sellos. Separadores de 1 px (`gap-px` sobre `bg-linea`). Textura de ruido SVG al 5 %.
- **La landing es siempre oscura.** El CRM es oscuro por defecto y tiene tema claro manual (`data-tema` en `<html>` + localStorage).
- **Prohibido:** degradados morados o azules, glassmorphism, Inter como fuente principal, emojis como iconos, tarjetas iguales con radio grande y sombra suave, hero centrado genérico, frases de relleno, resplandores al pasar el ratón y píldoras semitransparentes.
- **Movimiento:** curva `[0.23, 1, 0.32, 1]`; duraciones de 0.16, 0.32 y 0.7 s; escalonado de 0.04 s. Respeta `prefers-reduced-motion` con `MotionConfig reducedMotion="user"`. Scroll suave con Lenis (`lerp 0.1`).

### Tokens (de `src/design/tokens.ts`)

| token | web claro | web oscuro | CRM claro | CRM oscuro |
|---|---|---|---|---|
| fondo | #F2F7FA | #0A0B0D | #F4F4F5 | #0A0A0B |
| placa | #FFFFFF | #121418 | #FFFFFF | #141416 |
| placa2 | #E4ECF1 | #1B1E24 | #EEEEF0 | #1C1C1F |
| linea | #CCD6DD | #262A31 | #E4E4E7 | #26262A |
| tinta | #0A0B0D | #F2F7FA | #111113 | #EDEDEF |
| tinta2 | #4E5864 | #949DA8 | #5F5F68 | #9B9BA3 |
| acentoTinta | #0A6A87 | #5CE1FF | #1D5FD6 | #7EAEFF |
| acento (campo) | #5CE1FF | #5CE1FF | #2563EB | #2F6FEB |
| alarma | #FF4D2E | #FF4D2E | #DC2626 | #EF4444 |

El CRM es una herramienta neutra: grises sin tinte, azul `#2563EB` como único color de acción y rojo/ámbar/verde para estados. Radios de 4 a 24 px (`--radio-*`), tipografía Hanken Grotesk, superficies separadas por tono (no por bordes) y `--marca-gym` (`#5CE1FF` en oscuro) solo para el logotipo.

## 4 · Landing (orden y comportamiento)

Contenedor `div.landing.ruido` dentro de `ScrollSuave`. Las secciones llevan un antetítulo numerado («02 Instalaciones»…): número azul + línea + versalitas.

1. **Cabecera:** fija, 64 px, transparente arriba y con fondo al bajar. Se esconde al bajar y vuelve al subir. Logo, enlaces con subrayado que crece y CTA «Reserva tu visita» en placa azul con corte. En móvil, menú a pantalla completa con cortina `clip-path` y enlaces gigantes numerados del 01 al 05.
2. **Portada:** `100svh`, foto a sangre con parallax, zoom de entrada y seguimiento del cursor; velo `fondo/60`. H1 «ENTRENA / EN FRÍO.» entra palabra a palabra desde una máscara. Debajo, «Tres centros en Madrid, Barcelona y Valencia», el claim y «Desde X € al mes» (cuota mínima). CTAs «Reserva tu visita» y «Ver tarifas». Abajo, un **marcador de retransmisión** con una columna por centro: placa azul con el código de 3 letras, ciudad y horario de hoy.
3. **Manifiesto:** párrafo gigante; cada palabra pasa de gris a tinta con el scroll y una lleva acento. Debajo, una marquesina infinita de disciplinas en texto contorneado, separadas por puntos azules, que acelera y cambia de sentido con la velocidad del scroll.
4. **Instalaciones:** «CINCO ZONAS. TODO A MANO.» En escritorio es una galería horizontal sticky (`420vh`): paneles de 62vw que se revelan con `clip-path` diagonal, con la foto en parallax inverso y el nombre gigante de la sala en contramovimiento, más una barra de progreso. En móvil es una lista vertical.
5. **Cifras, «Marcador del club»:** 3-4 cifras gigantes calculadas (centros, plazas de aforo, horas abiertas al día, cuota mínima) que cuentan de 0 al valor en 1.6 s. Debajo, una tabla por centro con barras de aforo que crecen con `scaleX`.
6. **Tarifas:** «TRES CUOTAS. CERO PERMANENCIA.» Columnas separadas por 1 px. Precio gigante con los céntimos en superíndice. La destacada lleva barra azul arriba, el sello inclinado «Recomendada» y un CTA sólido. «Probar X» preselecciona la tarifa en el formulario mediante un CustomEvent.
7. **Centros:** «TRES CIUDADES. EL MISMO HIELO.» Lista a la izquierda (código gigante, dirección, horario, aforo, teléfono, estado abierto/cerrado calculado cada 60 s y «Cómo llegar» a Google Maps). A la derecha, foto sticky 4/5 que cambia con un barrido diagonal; un indicador azul se mueve con `layoutId`.
8. **Clases, «PRÓXIMAS SALIDAS.»:** panel tipo aeropuerto con pestañas por centro (placa que se desliza), filas agrupadas por día (Hoy / Mañana / fecha) y la hora que cae como una lama (`rotateX`). Muestra 8 filas y «Ver más +N». Si no hay clases, un estado vacío con los teléfonos.
9. **Visita:** CTA tipográfico gigante «RESERVA TU VISITA». A la izquierda, una foto de fachada que se revela de abajo arriba, con un marcador de códigos donde el elegido crece. A la derecha, un formulario de campos con línea inferior: nombre, email, teléfono, centro, tarifa, mensaje, consentimiento RGPD y honeypot oculto. Al enviar, el código del centro aparece gigante.
10. **Pie:** tarjetas de centros, navegación, «© año Marca · ciudades» y enlace «Acceso equipo» a `/crm`. Al final, el rótulo «ICE GYM» a 28vw, que sube desde el borde al llegar abajo.

## 5 · CRM

Sidebar plegable (cookie `crm-menu`): **Dashboard · Oportunidades (Pipeline) · Empresas · Contactos · Actividades · Tareas · Configuración**, con contadores de oportunidades abiertas y tareas pendientes. Paleta de comandos ⌘K con búsqueda global (`/crm/buscar`). Interruptor de tema. Cada página tiene su `loading.tsx` con esqueletos.

- **Dashboard:** filtros de periodo y de responsable; KPIs con números enormes; un bloque de «Atención» con seguimientos vencidos y oportunidades estancadas. Gráficas: embudo por etapa, pipeline por etapa (valor y esperado), creadas en el tiempo, ganadas frente a perdidas y reparto por tipo. Listas: top oportunidades, top empresas, próximos seguimientos y actividad reciente. Los tooltips son HTML propio.
- **Oportunidades:** vista Kanban (dnd-kit, columnas prospección → cualificación → propuesta → negociación → ganada / perdida, orden por `posicion`) o tabla, con barra de filtros. Ficha `[id]` con campos editables, próxima acción, notas, «marcar ganada» y «marcar perdida» (pide motivo) y línea temporal de interacciones.
- **Empresas:** tabla con logo, tipo, sector, estado y responsable, y filtros. Ficha con datos, contactos (con uno marcado como principal), oportunidades, actividad y notas.
- **Contactos:** tabla y ficha equivalentes, con un tipo de contacto (decisor, compras, técnico…).
- **Actividades:** línea temporal y tabla de interacciones (llamada, email, reunión, nota, tarea, seguimiento, cambio de etapa), con filtros y alta rápida.
- **Tareas:** interacciones de tipo tarea o seguimiento con estado `pendiente`, agrupadas por vencimiento, que se completan con un clic.
- **Configuración:** gestión del equipo (nombre, puesto, color de avatar, activo).
- **Acceso:** `/crm/acceso` con email y contraseña (Supabase Auth) y redirección con `?siguiente=`.

Mutaciones con server actions (`src/app/crm/acciones/*`): crear, actualizar y borrar empresas, contactos, oportunidades e interacciones; `moverOportunidad(id, etapa, posicion)`; marcar ganada o perdida; marcar contacto principal; guardar notas; gestionar miembros del equipo. Todas devuelven `{ ok, mensaje }` y se muestran con un toast.

## 6 · Datos

El esquema completo está en `kit/supabase/00_schema.sql`. Tablas:
- **Web:** `centros`, `tarifas`, `clases`, `leads`, y `horario_clases` con la función `programar_clases(semanas)`.
- **CRM:** `equipo`, `empresas`, `contactos`, `oportunidades`, `interacciones`.

RLS: `authenticated` puede hacerlo todo. `anon` solo lee centros y tarifas activos y las clases, y solo puede insertar leads con `estado='nuevo'` y `origen='web'`.

## 7 · Calidad

- WCAG 2.1 AA en los dos temas, foco visible y el estado nunca comunicado solo por color.
- Funciona a 375 px.
- Honesto con los datos: si falta un dato se ve el hueco, nunca un valor inventado.
