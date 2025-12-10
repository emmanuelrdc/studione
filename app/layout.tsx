import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { defaultMetadata } from "@/lib/seo-metadata";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  ...defaultMetadata,
  alternates: {
    canonical: 'https://studioone-hazel.vercel.app',
  },
  openGraph: {
    title: "Studio One | Estética profesional",
    description:
      "Más de 39 años de experiencia en belleza, maquillaje, peinados y cuidado del cabello.",
    url: "https://studioone-hazel.vercel.app",
    siteName: "Studio One",
    images: [
      {
        url: "https://studioone-hazel.vercel.app/og-image.jpg",
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
    images: ["https://studioone-hazel.vercel.app/og-image.jpg"],
  },
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
              url: 'https://studioone-hazel.vercel.app',
              logo: 'https://studioone-hazel.vercel.app/og-image.jpg',
              image: ['https://studioone-hazel.vercel.app/og-image.jpg'],
              telephone: '+524878720060',
              address: {
                '@type': 'PostalAddress',
                streetAddress: 'Gabriel Martínez 111, Zona Centro',
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
