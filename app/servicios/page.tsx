import type { Metadata } from "next";
import Navbar from "@/components/navbar";
import Services from "@/components/services";
import Footer from "@/components/footer";

export const metadata: Metadata = {
  title: "Servicios y Productos | Studio NE",
  description: "Conoce nuestros servicios profesionales de belleza y productos de las mejores marcas.",
};

export default function ServiciosPage() {
  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-20">
        <Services />
      </div>
      <Footer />
    </main>
  );
}
