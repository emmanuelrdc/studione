"use client";

import { motion } from "framer-motion";

const stats = [
  { number: "39+", label: "Años de experiencia" },
  { number: "10k+", label: "Clientes satisfechos" },
  { number: "6", label: "Servicios especializados" },
];

export default function About() {
  return (
    <section id="nosotros" className="relative overflow-hidden py-32 px-6">
      {/* Subtle background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary-50/40 to-white" />

      <div className="relative mx-auto max-w-5xl">
        {/* Section label */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="mb-6 text-center"
        >
          <span className="inline-block rounded-full bg-primary-100/60 px-4 py-1.5 text-xs font-medium tracking-widest text-primary-700 uppercase">
            Sobre Nosotros
          </span>
        </motion.div>

        {/* Main heading */}
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="mx-auto mb-8 max-w-3xl text-center text-4xl font-semibold tracking-tight text-neutral-900 sm:text-5xl lg:text-6xl"
        >
          Donde la belleza se encuentra con la{" "}
          <span className="bg-gradient-to-r from-primary-400 to-charcoal-400 bg-clip-text text-transparent">
            experiencia
          </span>
        </motion.h2>

        {/* Description */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mx-auto mb-20 max-w-2xl text-center text-lg leading-relaxed text-neutral-500"
        >
          Con más de 39 años de trayectoria en Río Verde, San Luis Potosí, hemos perfeccionado 
          el arte de realzar tu belleza natural. Combinamos técnicas clásicas con las últimas 
          tendencias para ofrecerte una experiencia única.
        </motion.p>

        {/* Stats */}
        <div className="grid grid-cols-1 gap-1 sm:grid-cols-3">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: 0.3 + i * 0.1 }}
              className="group relative rounded-3xl bg-primary-50/50 p-10 text-center transition-all duration-500 hover:bg-white hover:shadow-[0_2px_40px_rgba(0,0,0,0.04)]"
            >
              <div className="mb-2 text-5xl font-semibold tracking-tight text-neutral-900 sm:text-6xl">
                {stat.number}
              </div>
              <div className="text-sm font-medium text-neutral-400 tracking-wide">
                {stat.label}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
