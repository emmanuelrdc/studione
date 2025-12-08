import Image from "next/image";

export default function Gallery() {
  // Array de 9 imágenes para grid 3x3
  const images = Array.from({ length: 9 }, (_, i) => ({
    id: i + 1,
    alt: `Galería Studio One - Imagen ${i + 1}`,
  }));

  return (
    <section id="galeria" className="py-24 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-16 text-center">
          <h2 className="mb-4 text-4xl font-light tracking-tight text-gray-900 sm:text-5xl">
            Galería
          </h2>
          <div className="mx-auto h-px w-24 bg-primary-500"></div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {images.map((image) => (
            <div
              key={image.id}
              className="group relative aspect-square overflow-hidden rounded-2xl bg-gray-100 shadow-sm transition-shadow hover:shadow-lg"
            >
              <div className="flex h-full items-center justify-center">
                <span className="text-sm text-gray-400">
                  {image.alt}
                </span>
              </div>
              {/* Reemplaza el div anterior con una imagen real:
              <Image
                src={`/gallery/${image.id}.jpg`}
                alt={image.alt}
                fill
                className="object-cover transition-transform group-hover:scale-105"
              />
              */}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
