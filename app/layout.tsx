import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { defaultMetadata } from "@/lib/seo-metadata";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://studione.vercel.app';

export const metadata: Metadata = {
  ...defaultMetadata,
  alternates: {
    canonical: SITE_URL,
  },
  openGraph: {
    title: "Studio One | Estética profesional",
    description:
      "Más de 39 años de experiencia en belleza, maquillaje, peinados y cuidado del cabello.",
    url: SITE_URL,
    siteName: "Studio One",
    images: [
      {
        url: `${SITE_URL}/og-image.jpg`,
        width: 1200,
        height: 630,
        alt: "Studio One Estética",
      },
    ],
    locale: "es_MX",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Studio One | Estética profesional",
    description:
      "Más de 39 años de experiencia en belleza, maquillaje, peinados y cuidado del cabello.",
    images: [`${SITE_URL}/og-image.jpg`],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="scroll-smooth">
      <body className={`${inter.variable} font-sans antialiased`}>
        {/* Structured data (JSON-LD) for LocalBusiness */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'BeautySalon',
              name: 'Studio One',
              description:
                'Estética en Río Verde, San Luis Potosí. Servicios de maquillaje, peinados, faciales, tintes, cortes y venta de cosméticos.',
              url: SITE_URL,
              logo: `${SITE_URL}/og-image.jpg`,
              image: [`${SITE_URL}/og-image.jpg`],
              telephone: '+524878720060',
              address: {
                '@type': 'PostalAddress',
                streetAddress: 'Gabriel Martínez Interior 2',
                addressLocality: 'Río Verde',
                addressRegion: 'San Luis Potosí',
                addressCountry: 'MX'
              },
              geo: {
                '@type': 'GeoCoordinates',
                latitude: '22.1667',
                longitude: '-99.1000'
              },
              openingHoursSpecification: [
                {
                  '@type': 'OpeningHoursSpecification',
                  dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
                  opens: '09:00',
                  closes: '18:00'
                },
                {
                  '@type': 'OpeningHoursSpecification',
                  dayOfWeek: 'Saturday',
                  opens: '09:00',
                  closes: '16:00'
                }
              ],
              priceRange: '$$',
              sameAs: []
            })
          }}
        />
        {children}
      </body>
    </html>
  );
}
