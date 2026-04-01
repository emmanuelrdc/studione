import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo-metadata";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";

export const metadata: Metadata = pageMetadata.place;

export default function PlacePage() {
  return (
    <main className="min-h-screen bg-white">
      <Navbar />
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold mb-8 text-gray-900">
            Ubicación y Contacto
          </h1>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
            {/* Contact Info */}
            <div>
              <h2 className="text-2xl font-semibold mb-6 text-gray-800">
                Contáctanos
              </h2>
              <div className="space-y-4">
                <div>
                  <p className="text-gray-600 font-semibold">Teléfono:</p>
                  <a
                    href="tel:+524878720060"
                    className="text-blue-600 hover:underline text-lg"
                  >
                    487 872 0060
                  </a>
                </div>
                <div>
                  <p className="text-gray-600 font-semibold">Dirección:</p>
                  <p className="text-lg text-gray-900">
                    Gabriel Martínez 111, Zona Centro
                  </p>
                  <p className="text-lg text-gray-900">
                    Río Verde, San Luis Potosí, México
                  </p>
                </div>
              </div>
            </div>

            {/* Map Placeholder */}
            <div className="bg-gray-200 rounded-lg h-80 flex items-center justify-center">
              <div className="text-center">
                <p className="text-gray-600 font-semibold">Mapa</p>
                <p className="text-sm text-gray-500">
                  Intégra tu mapa de Google Maps aquí
                </p>
              </div>
            </div>
          </div>

          {/* Opening Hours */}
          <div className="mb-12">
            <h2 className="text-2xl font-semibold mb-6 text-gray-800">
              Horarios
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border-l-4 border-blue-600 pl-4">
                <p className="font-semibold text-gray-900">Lunes a Viernes:</p>
                <p className="text-gray-600">9:00 AM - 6:00 PM</p>
              </div>
              <div className="border-l-4 border-blue-600 pl-4">
                <p className="font-semibold text-gray-900">Sábado:</p>
                <p className="text-gray-600">9:00 AM - 4:00 PM</p>
              </div>
              <div className="border-l-4 border-blue-600 pl-4">
                <p className="font-semibold text-gray-900">Domingo:</p>
                <p className="text-gray-600">Cerrado</p>
              </div>
            </div>
          </div>

          {/* Call to Action */}
          <div className="bg-blue-600 text-white p-8 rounded-lg text-center">
            <p className="text-lg mb-4">
              ¿Tienes preguntas? Contáctanos directamente
            </p>
            <a
              href="tel:+524878720060"
              className="inline-block bg-white text-blue-600 font-semibold px-6 py-3 rounded-lg hover:bg-gray-100 transition"
            >
              Llamar ahora
            </a>
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}
