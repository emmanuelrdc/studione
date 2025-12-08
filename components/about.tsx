export default function About() {
  return (
    <section id="sobre-nosotros" className="py-24 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-16 text-center">
          <h2 className="mb-4 text-4xl font-light tracking-tight text-gray-900 sm:text-5xl">
            Sobre Nosotros
          </h2>
          <div className="mx-auto h-px w-24 bg-primary-500"></div>
        </div>
        <div className="space-y-6 text-center">
          <p className="text-lg leading-relaxed text-gray-700 sm:text-xl">
            Con más de <span className="font-semibold text-primary-600">39 años de experiencia</span>, Studio One es
            una estética reconocida en Río Verde, San Luis Potosí, dedicada a
            brindar servicios de belleza y cuidado personal de la más alta
            calidad.
          </p>
          <p className="text-lg leading-relaxed text-gray-700 sm:text-xl">
            Nuestro compromiso es ofrecerte una experiencia única, combinando
            técnicas tradicionales con las últimas tendencias en belleza, para
            que te sientas y te veas increíble.
          </p>
        </div>
      </div>
    </section>
  );
}
