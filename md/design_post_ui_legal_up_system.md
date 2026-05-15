# designPost.md — LegalUp Article UI System

# OBJETIVO

Todos los artículos del blog deben mantener EXACTAMENTE la misma experiencia visual, jerarquía y ritmo UI.

El diseño debe sentirse:

- moderno
- premium
- rápido
- fácil de leer
- mobile-first
- legal tech
- similar a un SaaS moderno

Inspiración visual:

- Stripe Docs
- Linear
- Notion
- Medium
- Vercel
- Mercury

NO debe parecer:

- WordPress antiguo
- portal jurídico tradicional
- diario legal
- sitio gubernamental
- landing spam SEO

---

# PRINCIPIOS VISUALES

## 1. Mucho whitespace

Los artículos deben respirar.

Siempre priorizar:

- aire visual
- separación clara
- lectura cómoda
- escaneabilidad móvil

Nunca generar:

- bloques densos
- texto comprimido
- párrafos gigantes
- cards pegadas

---

## 2. Mobile first

El 90% del diseño debe pensarse para móvil.

Prioridades:

1. Escaneo rápido
2. Thumb-friendly spacing
3. Jerarquía clara
4. Lectura cómoda
5. CTA visibles

---

## 3. Ritmo visual

El artículo debe alternar constantemente:

- párrafos
- bullets
- callouts
- cards
- grids
- CTA
- FAQs
- links relacionados
- componentes interactivos

Nunca dejar:

- más de 3 párrafos seguidos
- más de 1 pantalla llena de texto continuo

---

# LAYOUT GLOBAL

## Wrapper principal

```tsx
<div className="min-h-screen bg-gray-50">
```

Reglas:

- fondo gris muy suave
- alto contraste con cards blancas
- sensación limpia y moderna

---

## Main container

```tsx
max-w-4xl mx-auto px-0 sm:px-6 lg:px-8
```

Reglas:

- ancho máximo: 896px aprox
- contenido centrado
- desktop cómodo
- excelente lectura móvil

NO usar layouts demasiado anchos.

---

# HERO SECTION

## Diseño base obligatorio

```tsx
<div className="bg-green-900 text-white py-16">
```

El hero SIEMPRE debe:

- ocupar ancho completo
- usar fondo oscuro
- generar contraste fuerte
- parecer editorial premium

---

## Espaciado hero

```tsx
pt-28
```

Siempre dejar espacio para el navbar.

---

## Breadcrumb

Formato:

```tsx
flex items-center gap-2 mb-4
```

Debe ser:

- pequeño
- discreto
- navegable
- bajo contraste

---

# H1

## Estilo obligatorio

```tsx
text-3xl sm:text-4xl font-bold mb-6 text-green-600 font-serif
```

Reglas:

- máximo 2 líneas visuales
- serif editorial
- contraste alto
- muy visible
- spacing amplio

NO usar:

- H1 pequeños
- tracking exagerado
- texto comprimido

---

# SUBTÍTULO / INTRO HERO

```tsx
text-xl leading-relaxed
```

Debe:

- explicar el problema rápidamente
- sentirse humano
- ser fácil de escanear

Máximo:

- 2 líneas desktop
- 4 líneas mobile

---

# META INFO

## Estructura

```tsx
flex flex-wrap items-center gap-4 mt-6
```

Elementos:

- fecha
- autor
- tiempo lectura

Reglas:

- pequeños
- discretos
- íconos lucide
- espaciado amplio

---

# QUICK SUMMARY CARD

## Card obligatoria al inicio

```tsx
bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6
```

Objetivo:

- reducir rebote
- responder rápido
- aumentar tiempo de lectura

Contenido:

- resumen rápido
- bullets clave
- consecuencias
- derechos
- pasos

Formato:

- bullets simples
- máximo 6 items
- spacing cómodo

---

# ARTICLE BODY

## Wrapper principal

```tsx
bg-white sm:rounded-lg sm:shadow-sm p-4 sm:p-8
```

Reglas:

- card blanca
- sombras mínimas
- bordes suaves
- padding amplio

Desktop:

- respiración editorial

Mobile:

- padding cómodo
- nunca pegado a bordes

---

# TYPOGRAPHY

## Párrafos

```tsx
text-gray-600 leading-relaxed
```

Reglas:

- line-height amplio
- color gris suave
- lectura relajada
- máximo 3 líneas visuales por párrafo

---

## Intro destacada

```tsx
font-medium text-lg
```

La primera explicación importante debe sentirse más fuerte visualmente.

---

# H2

## Estilo

```tsx
text-2xl font-bold mb-6 text-gray-900
```

Reglas:

- mucha separación
- jerarquía clara
- fácil de escanear
- visualmente fuerte

Spacing:

- margin-top grande
- margin-bottom amplio

---

# H3

## Estilo

```tsx
text-xl font-bold mb-4 text-gray-800
```

Uso:

- subsecciones
- preguntas
- derechos
- pasos

---

# LISTAS / BULLETS

## Cards numeradas

Patrón:

```tsx
bg-white p-4 rounded-2xl border border-gray-100 shadow-sm
```

Usar para:

- pasos
- derechos
- obligaciones
- conceptos clave

---

## Grid bullets

```tsx
grid sm:grid-cols-2 gap-3
```

Usar para:

- requisitos
- documentos
- elementos incluidos
- ventajas

---

# CALLOUTS

## Informativo

```tsx
bg-gray-50 border border-gray-100 rounded-2xl p-8
```

## Positivo

```tsx
bg-green-50/50 border border-green-100 rounded-2xl p-8
```

## Warning

```tsx
bg-amber-50 border-l-4 border-amber-500 p-6 rounded-r-lg
```

## Info azul

```tsx
bg-blue-50 border border-blue-100 rounded-xl p-6
```

Reglas:

- padding generoso
- máximo 2 párrafos
- usar para ideas importantes
- nunca sobreusar

---

# INTERLINKS

## Diseño obligatorio

```tsx
text-center py-4 border-t border-b border-gray-100 my-8
```

CTA relacionado:

```tsx
inline-flex flex-wrap items-center justify-center gap-2 text-blue-600 font-bold hover:underline bg-blue-50 px-8 py-4 rounded-xl transition-all hover:bg-blue-100
```

Reglas:

- parecer recomendación natural
- no parecer anuncio
- mucho espacio alrededor

---

# IN ARTICLE CTA

## Objetivo

Interrumpir lectura antes de fatiga.

Debe aparecer:

- luego de sección importante
- antes de bloques largos
- cerca de momentos de ansiedad legal

---

## Estilo CTA

Debe sentirse:

- premium
- confiable
- simple
- útil

NO agresivo.

---

# FAQ

## Diseño

```tsx
bg-gray-50 p-6 rounded-xl border border-gray-200
```

Reglas:

- cards separadas
- spacing vertical amplio
- preguntas destacadas
- respuestas escaneables

---

# CTA FINAL

## Wrapper

```tsx
bg-white rounded-xl shadow-sm p-8 text-center
```

Debe incluir:

- headline emocional
- explicación corta
- botón principal

---

## Botón principal

```tsx
bg-gray-900 hover:bg-green-900 text-white px-8 py-3
```

Reglas:

- alto contraste
- hover suave
- ancho completo en mobile
- compacto desktop

---

# SHARE SECTION

## Componente obligatorio

```tsx
<BlogShare />
```

Debe aparecer:

- arriba del contenido
- abajo del artículo

Objetivo:

- distribución orgánica
- growth loop

---

# RELATED ARTICLES

## Navegación

```tsx
<BlogNavigation />
```

Debe incluir:

- artículo anterior
- siguiente artículo
- imagen
- excerpt corto

Objetivo:

- aumentar páginas vistas
- aumentar tiempo sesión
- mejorar SEO interno

---

# RELATED LAWYERS

## Componente obligatorio

```tsx
<RelatedLawyers />
```

Debe aparecer:

- después del CTA final
- antes del footer/article nav

Objetivo:

- conversión contextual
- conexión inmediata con abogados

---

# READING EXPERIENCE

## El usuario debe sentir:

1. “Esto se entiende fácil”
2. “Aquí saben del tema”
3. “No parece spam SEO”
4. “Se siente moderno”
5. “No me están vendiendo agresivamente”

---

# DENSIDAD VISUAL

## Regla crítica

Cada 1-2 scrolls debe existir uno de estos:

- callout
- CTA
- grid
- bullets
- card
- interlink
- componente visual

Nunca dejar muros largos de texto.

---

# COMPONENTES INTERACTIVOS

## Permitidos

- calculators
- accordions
- sliders
- comparison tables
- sticky TOC
- progress bar

Ejemplo:

```tsx
<ReadingProgressBar />
```

Objetivo:

- engagement
- tiempo de permanencia
- UX moderna

---

# ANIMACIONES

## Reglas

Usar:

- transitions suaves
- hover subtle
- fade minimal

NO usar:

- bounce
- efectos exagerados
- motion invasivo

Duración recomendada:

```tsx
transition-all
```

---

# COLORES

## Paleta principal

Base:

- gray-50
- white
- gray-900
- green-900
- green-600

Apoyos:

- blue-50
- amber-50
- indigo-50

Reglas:

- máximo 1 color fuerte por sección
- mucho contraste
- sensación premium

---

# BORDERS & RADIUS

## Radius

Usar:

```tsx
rounded-xl
rounded-2xl
```

NO usar:

- bordes cuadrados
- radius pequeños antiguos

---

# SHADOWS

## Regla

Sombras suaves.

Usar:

```tsx
shadow-sm
```

Evitar:

- sombras fuertes
- neumorphism
- glow

---

# BLOG UX PATTERNS

## Patrones obligatorios detectados en LegalUp

### 1. Intro emocional + práctica

Siempre:

- problema real
- consecuencia
- claridad inmediata

---

### 2. Bloque “En esta guía aprenderás”

Patrón:

```tsx
bg-blue-50 p-6 rounded-xl border border-blue-100
```

Objetivo:

- aumentar engagement
- reducir rebote
- dar estructura mental

---

### 3. Cards checklist

Usar para:

- derechos
- requisitos
- errores
- documentos
- consecuencias

---

### 4. Bloques legales importantes

Usar:

- callouts
- italic
- font-medium
- bordes suaves

---

### 5. CTA contextual

Los CTA nunca deben aparecer “de golpe”.

Siempre:

- después de ansiedad
- después de confusión
- después de explicar consecuencias

---

# REGLAS ANTI-UI-ANTIGUA

PROHIBIDO:

- sidebars invasivos
- banners agresivos
- popups instantáneos
- demasiados colores
- textos pequeños
- líneas demasiado largas
- padding reducido
- tablas rígidas
- links azules clásicos subrayados
- botones genéricos bootstrap

---

# CHECKLIST FINAL

Antes de publicar validar:

- ¿Se escanea bien en móvil?
- ¿Hay suficiente whitespace?
- ¿El ritmo visual se mantiene?
- ¿Hay CTA contextual?
- ¿Hay bloques destacados?
- ¿Los H2 rompen correctamente?
- ¿Hay demasiados párrafos seguidos?
- ¿El hero se siente premium?
- ¿El CTA final se siente confiable?
- ¿El artículo parece SaaS moderno?
- ¿Los componentes mantienen consistencia visual?
- ¿La lectura se siente liviana?

---

# STACK UI

Base:

- React
- TypeScript
- TailwindCSS
- shadcn/ui
- lucide-react

---

# COMPONENTES BASE OBLIGATORIOS

```tsx
<Header />
<ReadingProgressBar />
<BlogShare />
<InArticleCTA />
<RelatedLawyers />
<BlogNavigation />
<BlogConversionPopup />
```

Todos los artículos deben seguir esta estructura visual de forma consistente.

