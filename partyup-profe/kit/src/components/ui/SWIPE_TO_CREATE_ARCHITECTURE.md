# SwipeToCreateButton – Arquitectura Liquid Glass + Mesh Gradient

## Dependencias

- **expo-mesh-gradient**: Mesh gradient nativo (SwiftUI MeshGradient en iOS). Vista nativa, no canvas.
- **expo-blur**: BlurView con blur real del sistema (UIVisualEffectView en iOS).

## Capas (de abajo a arriba)

1. **MeshGradient apagado** – Full screen, colores desaturados. Siempre visible.
2. **MeshGradient vivo** – Mismos puntos y misma animación que el apagado; colores vibrantes. Contenedor con `overflow: hidden` y ancho = ancho del glass (animado con Reanimated). Solo se ve bajo el área del cristal.
3. **BlurView** – Cristal que se expande con el swipe (mismo ancho que el clip del mesh vivo).
4. **UI del botón** – Texto, check, thumb con GIF.

## Por qué funciona con blur real

- **BlurView** (expo-blur) usa el blur nativo: en iOS, UIVisualEffectView difumina el contenido que hay **debajo** en la jerarquía de vistas. No es un overlay opaco ni un “fake glass”.
- El contenido difuminado es exactamente el mesh apagado + el mesh vivo (recortado). Así el cristal muestra colores vivos difuminados y el resto de la pantalla sigue con el mesh apagado.
- El **clipping** del mesh vivo se hace por layout: un `Animated.View` con `width = trackFillWidth` y `overflow: 'hidden'`, y dentro un mesh de tamaño completo. No se usan filtros globales ni Skia.

## Animación

- Un único **shared value** (p. ej. `animPhase` 0→1) con `withRepeat(withTiming(1, 15000), -1, true)`.
- Los **puntos** del mesh se calculan a partir de ese valor y se sincronizan a React state con `useAnimatedReaction` + `runOnJS(setPoints)`, para que ambos `MeshGradientView` reciban los mismos puntos.
- No hay dos animaciones independientes: se anima el estado, no las vistas. El fondo sigue animando aunque parte esté oculta (el mesh apagado es full screen y siempre se anima).

## Performance

- Sin Skia, sin screenshots. Solo vistas nativas (MeshGradientView, BlurView) y Reanimated para el ancho del track y del clip.
- iOS es la prioridad; en Android se muestra un fallback de color sólido si MeshGradient no está disponible.
