# Design

Sistema de diseño de Studio One: **"Liquid Glass"** — glassmorphism oscuro para el admin, editorial claro/oscuro alternado para el sitio, con profundidad y motion inspirados en Apple. Fuente de verdad: [`app/globals.css`](app/globals.css).

## Theme

- **Sitio público**: ritmo editorial alternado — hero oscuro (imagen) → nosotros claro (`#fafaf8`) → servicios oscuro (`neutral-900`) → galería clara → contacto/footer oscuros.
- **Admin**: shell oscuro (`admin-bg`, `neutral-900` con luces radiales verdes) + superficies glass translúcidas.

## Color (OKLCH-equivalent; committed, NO cambiar el hue)

- **Primary — Prime Green**: `#9ACD32` (400) … `#7fb828` (500, acciones) … `#4a7416` (700). Es la identidad. Solo para acciones primarias, selección activa, indicadores de estado y luz de acento. Nunca relleno decorativo.
- **Accent — azul limpio**: `#4a9ef5` (500), uso mínimo (luces ambientales sutiles).
- **Neutrales**: `#fafafa` → `#0a0a0a`. Foreground `#1d1d1f`.
- Texto sobre oscuro: cuerpo ≥ `white/55`; labels ≥ `white/40`; nunca `white/20–25` para contenido legible.

## Typography

- Familia única: **Inter** (`--font-inter`) con fallback SF Pro / system. `font-feature-settings: "cv11","ss01"`, tracking base `-0.011em`.
- Marketing: headings `font-light`, escalas fluidas (`text-3xl → text-8xl`), tracking negativo.
- Admin: escala rem fija, `font-semibold` en títulos, `tabular-nums` en cifras.

## Tokens (definidos en `:root`)

- **Motion easing**: `--ease-out-quart/quint/expo`, `--ease-in-out-soft`, `--ease-spring` (snappy sin overshoot — prohibido bounce/elastic).
- **Duración**: `--dur-fast .15s`, `--dur-base .24s`, `--dur-slow .4s`, `--dur-slower .6s`.
- **Radios**: `--radius-sm 8` … `--radius-2xl 24`.
- **Elevación clara** (`--elev-1…5`): dos capas (contacto + ambiental) con tinte `neutral-900`.
- **Elevación oscura** (`--elev-dark-1…4`): drop shadow + `inset 0 1px 0 rgba(255,255,255,.0x)` (borde superior iluminado tipo Apple).
- **Glow**: `--glow-primary` (verde) solo en CTAs primarios.

## Components (clases utilitarias)

- `glass-panel` / `glass-card` / `glass-card-interactive` (lift en hover) / `glass-sidebar` / `glass-modal` / `glass-input` (focus verde).
- `surface-card` — tarjeta clara con elevación para el sitio.
- Botones: `btn-primary` (verde, borde superior iluminado, press escala .97), `btn-secondary`, `btn-ghost`.
- `press` (feedback táctil), `hover-lift`, `skeleton` (shimmer de carga), `reveal`/`.visible` (scroll reveal), `animate-fade-in-up`, `animate-line-expand`, `animate-modal`.
- **Marcador de marca** (reemplaza el eyebrow genérico): línea vertical verde que se desvanece (`h-8 w-px bg-gradient-to-b from-transparent to-primary-X/50`) sobre la etiqueta de sección.

## Motion

- Admin: 150–250ms, comunica estado. Indicador de nav activo con `layoutId` (framer-motion). Sin coreografías de carga; skeletons en primer load.
- Marketing: scroll reveals `whileInView` con `ease [0.22,1,0.36,1]`, stagger por índice. Contenido visible por defecto.
- `@media (prefers-reduced-motion: reduce)` desactiva todo globalmente.

## Layout

- Admin: sidebar fija 264px (colapsable en móvil con overlay), contenido con scroll propio.
- Grids responsivos por breakpoint (no tipografía fluida en admin). Marketing usa `max-w-*` centrado con generoso whitespace.
- Scrollbar refinado: neutral en claro, blanco translúcido en superficies oscuras (`.admin-bg`/`.glass-sidebar`).
