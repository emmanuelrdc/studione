# Product

## Register

product

Nota: el proyecto tiene dos superficies. La **primaria** es el panel admin/POS (design SERVES the product). La secundaria es el sitio de marketing público (register brand), que se trata de forma editorial. Para tareas sobre `/` y `components/*` usar criterio brand; para `/admin/*` usar criterio product.

## Users

- **Staff del salón** (recepción, estilistas, dueña): usan el panel admin/POS durante la jornada para cobrar, agendar citas, gestionar inventario, ver reportes. Contexto: en el salón, a veces con prisa entre clientes, en pantallas de escritorio y tablet. Necesitan velocidad, claridad de datos y cero fricción.
- **Clientes potenciales**: visitan el sitio público desde el móvil para conocer el salón, ver trabajos (galería) y agendar por WhatsApp. Contexto: primera impresión, buscan confianza y profesionalismo.

## Product Purpose

Studio One es un salón de estética en Río Verde, SLP (39+ años). El sistema combina (1) un sitio de marketing que convierte visitantes en citas y (2) un panel de gestión completo (POS, inventario, citas, clientes, reportes, promociones, auditoría). Éxito = cobros rápidos sin errores, inventario confiable, y un sitio que transmite el prestigio del salón.

## Brand Personality

Profesional, cálido, premium sin ser ostentoso. Voz en español (es-MX), cercana pero cuidada. Sensación deseada: confianza y elegancia moderna, al estilo del hardware/software de Apple — silencioso, preciso, con profundidad y movimiento intencional.

## Anti-references

- Look genérico de plantilla/IA: cremas/beige por defecto, eyebrows tracked en cada sección, grids de tarjetas idénticas, gradient text, glassmorphism decorativo por defecto.
- Dashboards SaaS ruidosos con acentos saturados en estados inactivos.
- Motion elástico/bounce o coreografías de carga que hacen esperar al staff.

## Design Principles

1. **Preservar el ADN, elevar el detalle.** El sistema "Liquid Glass" verde ya es la identidad; el trabajo es profundidad, jerarquía y motion, no reinventar color.
2. **La herramienta desaparece en la tarea.** En admin, familiaridad ganada > sorpresa. Consistencia de componentes pantalla a pantalla.
3. **Legibilidad primero.** Nada de texto gris fantasma; el cuerpo de texto cumple contraste real.
4. **Motion con propósito.** En admin comunica estado (150–250ms); en marketing revela contenido ya visible. Siempre con alternativa `prefers-reduced-motion`.
5. **Profundidad tipo Apple.** Sombras multicapa (luz ambiental + clave) y reflejo especular superior en superficies oscuras; el verde solo como luz de acento, nunca decoración de relleno.

## Accessibility & Inclusion

- Contraste: cuerpo ≥4.5:1, texto grande ≥3:1. Placeholders legibles.
- `prefers-reduced-motion: reduce` honrado globalmente (crossfade/instantáneo).
- Focus ring visible por teclado (`:focus-visible`, verde primary-400).
- Idioma es-MX.
