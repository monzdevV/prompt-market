/**
 * El resto del plan de la semana 1 (29/09/2026) que no son guiones ni vídeos de referencia:
 * recetas de edición en CapCut, reglas de TikTok para fitness, plan de directos y lista antes de publicar.
 * Contenido fijo: se lee en «Biblioteca» y los guiones enlazan a las recetas (R1…R8).
 */

export type Recipe = { id: string; titulo: string; pasos: string[] };

export const RECIPES: Recipe[] = [
  {
    id: "R1",
    titulo: "Subtítulos grandes",
    pasos: [
      "Texto › Subtítulos automáticos, en español, y corrige los nombres de ejercicios.",
      "Fuente Anton o The Bold Font en mayúsculas, blanco con borde negro grueso y sombra.",
      "De 1 a 3 palabras por línea. La palabra clave en amarillo #FFE400.",
      "Animación de entrada «Pop» de 0,1–0,2 s, aplicada a todos.",
      "Colócalos a unos dos tercios de la altura y guarda el estilo como preset.",
    ],
  },
  {
    id: "R2",
    titulo: "Correcto vs incorrecto",
    pasos: [
      "Toma mala en la pista principal y toma buena como superposición.",
      "Cada una a la mitad de la altura: la mala arriba y la buena abajo.",
      "Ajusta la velocidad de una (0,9–1,1×) para que las repeticiones vayan a la vez.",
      "«MAL» en rojo y «BIEN» en verde, con una X roja y un check verde entrando con «Pop» y medio segundo de diferencia.",
      "Sonido de error con la X y un «ding» con el check.",
    ],
  },
  {
    id: "R3",
    titulo: "Músculo que brilla",
    pasos: [
      "Duplica el clip y ponlo encima como superposición.",
      "En la copia: Máscara › Círculo sobre el músculo, con difuminado del 30–50 %.",
      "En la copia: brillo +15, saturación +20 y filtro rojo o naranja en modo Pantalla al 50 %.",
      "Si te mueves, pon fotogramas clave a la máscara o usa Seguimiento.",
      "Opción rápida: un PNG del músculo en rojo en la esquina de arriba.",
    ],
  },
  {
    id: "R4",
    titulo: "Contador de kilos o repeticiones",
    pasos: [
      "Texto con el número en Anton, enorme, arriba a la izquierda.",
      "Duplica el texto por cada repetición o cada subida de peso, sin huecos.",
      "Cada número entra con «Rebote» de 0,15 s y sonido de «pop».",
      "El último, en rojo y más grande, con sacudida y golpe.",
    ],
  },
  {
    id: "R5",
    titulo: "Cámara lenta al ritmo",
    pasos: [
      "En la música: Beats › Automático para marcar los golpes.",
      "Corta cada clip justo en un golpe.",
      "Velocidad › Curva › Personalizar: rápido en la bajada, 0,3–0,5× en el esfuerzo máximo.",
      "Activa «Suavizar cámara lenta» y añade un golpe de sonido en la parte lenta.",
    ],
  },
  {
    id: "R6",
    titulo: "Vídeo que se repite solo",
    pasos: [
      "La última frase enlaza con la primera, por ejemplo «…y por eso» → «tu espalda no crece».",
      "Último plano igual que el primero: misma postura y mismo encuadre.",
      "Truco: corta el último clip y pasa la segunda mitad al principio.",
      "Sin pantalla final de «sígueme» y sin fundido de música.",
    ],
  },
  {
    id: "R7",
    titulo: "Línea de la barra",
    pasos: [
      "Graba de lado con el móvil fijo, a la altura de la barra.",
      "Pasa el vídeo por la app Metric o WL Analysis, que dibuja la línea sola.",
      "Importa el resultado en CapCut: línea verde si va recta, roja si se va hacia delante.",
      "Congela el fotograma del error y rodéalo con un círculo rojo.",
    ],
  },
  {
    id: "R8",
    titulo: "Pantalla congelada",
    pasos: [
      "Coloca el cursor en el momento clave y pulsa Congelar.",
      "1–2 s con destello blanco al entrar, zoom lento del 100 al 110 % y el fondo un poco oscurecido.",
      "Flecha o círculo rojo sobre el error y una frase de 3–5 palabras.",
      "Sonido de cámara de fotos al congelar y un «whoosh» al volver.",
    ],
  },
];

export const CHECKLIST = [
  "Gancho en el primer segundo: texto grande, sin «hola, soy…»",
  "Subtítulos grandes con la palabra clave en amarillo",
  "Descripción que empieza por la palabra que la gente busca",
  "3–5 hashtags de nicho, sin #fyp",
  "Sin marca de agua de CapCut ni de otra app",
  "Final que enlaza con el principio (o con el siguiente capítulo si es serie)",
  "Han pasado 4 horas desde tu última publicación",
  "Si hay imágenes realistas hechas con IA, etiqueta de contenido generado por IA activada",
  "Tienes 1 hora libre después para responder comentarios",
];

export const RULES_NO = [
  "Nada de «pierde 10 kilos en 2 semanas», dietas de pocas calorías ni quemagrasas.",
  "Nada de prometer resultados con suplementos ni enlaces de venta. De creatina se puede hablar, pero de forma educativa.",
  "Nada de antes/después de cuerpo junto a un producto.",
  "Ninguna marca de agua de CapCut, Instagram u otra app. Quita el final de CapCut en ajustes.",
  "No subas clips de otros creadores sin aportar algo tuyo: TikTok los considera contenido no original.",
  "Si usas imágenes realistas hechas con IA, activa la etiqueta de «contenido generado por IA».",
];

export const RULES_YES = [
  "Deja pasar al menos 4 horas entre publicaciones para que no compitan entre ellas.",
  "Responde a todos los comentarios en la primera hora.",
  "Convierte las preguntas de los comentarios en vídeos: «Responder con vídeo» es un gancho gratis.",
  "Si un vídeo no arranca, no lo borres. Regraba el principio con otro gancho y súbelo como vídeo nuevo 1–2 semanas después.",
  "Cada domingo mira quién sigue viendo a los 3 segundos (objetivo ≥65 %), compartidos y guardados. Repite lo que trae seguidores, no lo que trae likes.",
  "Fija en tu perfil tus 3 mejores publicaciones.",
];

export const LIVES_YES = [
  "Horario fijo, por ejemplo los viernes a las 22:00. Añade otro entre semana si quieres.",
  "Mínimo 45–60 minutos. Los directos cortos no llegan a salir recomendados.",
  "Títulos con gancho: «Entreno espalda en directo, pídeme ejercicio», «Te reviso la técnica: mándame vídeo», «Preguntas de gym sin filtro».",
  "Anúncialo 2–3 horas antes en la descripción del vídeo de las 21:30 del viernes o con una historia.",
  "Metas con regalos de gym: «100 monedas = serie al fallo».",
  "Saca clips del directo para subirlos como vídeo: los momentos buenos son contenido gratis.",
];

export const LIVES_NO = [
  "No mandes a la gente a otra plataforma donde apenas tienes seguidores: los pierdes por el camino.",
  "No hagas directos de 5 minutos sin tema.",
  "StreamRecorder graba tus directos porque son públicos. Ninguna opción de TikTok impide que otra web los grabe.",
];
