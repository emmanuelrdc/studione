import type { Metadata } from 'next'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://studione.vercel.app'

export const defaultMetadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: 'Studio One - Estética con más de 39 años de experiencia',
  description:
    'Estética en Río Verde, San Luis Potosí. Ofrecemos servicios de maquillaje, peinados, faciales, tintes, cortes y venta de cosméticos para el cabello.',
  keywords: [
    'estética',
    'maquillaje',
    'peinados',
    'cortes de cabello',
    'tintes',
    'Rio Verde',
    'San Luis Potosí',
    'Studio One',
  ],
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
    },
  },
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
}

interface SEOPageOptions {
  title: string
  description: string
  path: string
  keywords?: string[]
  image?: string
  noindex?: boolean
}

export function generatePageMetadata({
  title,
  description,
  path,
  keywords,
  image = `${SITE_URL}/og-image.jpg`,
  noindex = false,
}: SEOPageOptions): Metadata {
  const pageUrl = `${SITE_URL}${path}`
  const pageTitle = `${title} | Studio One`
  const allKeywords = [
    ...defaultMetadata.keywords!,
    ...(keywords || []),
  ]

  return {
    title: pageTitle,
    description,
    keywords: allKeywords,
    alternates: {
      canonical: pageUrl,
    },
    robots: {
      index: !noindex,
      follow: !noindex,
    },
    openGraph: {
      title: pageTitle,
      description,
      url: pageUrl,
      siteName: 'Studio One',
      images: [
        {
          url: image,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
      locale: 'es_MX',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: pageTitle,
      description,
      images: [image],
    },
  }
}

export const pageMetadata = {
  home: generatePageMetadata({
    title: 'Inicio',
    description:
      'Estética en Río Verde, San Luis Potosí. Más de 39 años de experiencia en servicios de belleza: maquillaje, peinados, faciales, tintes y cortes.',
    path: '/',
    keywords: ['estética profesional', 'belleza'],
  }),
  place: generatePageMetadata({
    title: 'Ubicación y Contacto',
    description:
      'Ubicamos en Gabriel Martínez 111, Zona Centro, Río Verde, San Luis Potosí. Contáctanos al 487 872 0060.',
    path: '/place',
    keywords: ['ubicación', 'contacto', 'teléfono'],
  }),
}
