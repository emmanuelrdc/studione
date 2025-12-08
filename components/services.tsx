export default function Services() {
  const services = [
    {
      title: "Maquillaje",
      description:
        "Maquillaje profesional para eventos especiales, bodas y ocasiones importantes.",
      image: "/placeholder.jpg",
    },
    {
      title: "Peinados",
      description:
        "Peinados elegantes y modernos para cualquier ocasión, desde eventos formales hasta looks casuales.",
      image: "/placeholder.jpg",
    },
    {
      title: "Faciales",
      description:
        "Tratamientos faciales  para cuidar y rejuvenecer tu piel.",
      image: "/placeholder.jpg",
    },
    {
      title: "Tintes",
      description:
        "Coloración profesional del cabello con productos de alta calidad y técnicas modernas.",
      image: "/placeholder.jpg",
    },
    {
      title: "Cortes",
      description:
        "Cortes de cabello a la moda, adaptados a tu estilo y tipo de cabello.",
      image: "/placeholder.jpg",
    },
    {
      title: "Cosméticos",
      description:
        "Venta de productos profesionales: shampoos, acondicionadores, geles y más para el cuidado del cabello.",
      image: "/placeholder.jpg",
    },
  ];

  return (
    <section id="servicios" className="bg-gray-50 py-24 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-16 text-center">
          <h2 className="mb-4 text-4xl font-light tracking-tight text-gray-900 sm:text-5xl">
            Servicios
          </h2>
          <div className="mx-auto h-px w-24 bg-primary-500"></div>
        </div>
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service, index) => (
            <div
              key={index}
              className="group overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-all hover:shadow-lg"
            >
              <div className="relative aspect-video w-full overflow-hidden bg-gray-100">
                <div className="flex h-full items-center justify-center">
                  <span className="text-sm text-gray-400">
                    {service.title}
                  </span>
                </div>
                {/* Reemplaza con imagen real:
                <Image
                  src={service.image}
                  alt={service.title}
                  fill
                  className="object-cover transition-transform group-hover:scale-105"
                />
                */}
              </div>
              <div className="p-6">
                <h3 className="mb-3 text-xl font-medium text-gray-900">
                  {service.title}
                </h3>
                <p className="leading-relaxed text-gray-600">
                  {service.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
