import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Studio One - Estética con más de 39 años de experiencia",
  description:
    "Estética en Río Verde, San Luis Potosí. Ofrecemos servicios de maquillaje, peinados, faciales, tintes, cortes y venta de cosméticos para el cabello.",
    metadataBase: new URL("https://studioone-hazel.vercel.app"),
    openGraph: {
      title: "Studio One | Estética profesional",
      description:
        "Más de 39 años de experiencia en belleza, maquillaje, peinados y cuidado del cabello.",
      url: "https://studioone-hazel.vercel.app",
      siteName: "Studio One",
      images: [
        {
          url: "/og-image.jpg",
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
      images: ["/og-image.jpg"],
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
        {children}
      </body>
    </html>
  );
}
