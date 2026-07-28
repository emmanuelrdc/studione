"use client";

import { motion } from "framer-motion";

const stats = [
  { number: "39+", label: "Años de experiencia" },
  { number: "10k+", label: "Clientes satisfechos" },
  { number: "6", label: "Servicios especializados" },
];

export default function About() {
  return (
    <section id="nosotros" className="relative overflow-hidden py-20 px-6 sm:py-28 lg:py-36">
      {/* Subtle background */}
      <div className="absolute inset-0 bg-[#fafaf8]" />
      
      {/* Decorative element */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 h-px w-24 bg-gradient-to-r from-transparent via-neutral-200 to-transparent" />

      <div className="relative mx-auto max-w-5xl">
        {/* Section label */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="mb-8 flex flex-col items-center gap-3"
        >
          <span className="h-8 w-px origin-top bg-gradient-to-b from-transparent to-primary-500/50" />
          <span className="text-[11px] font-semibold tracking-[0.25em] text-neutral-500 uppercase">
            Sobre Nosotros
          </span>
        </motion.div>

        {/* Main heading */}
        <motion.h2
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.5, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto mb-8 max-w-3xl text-center text-3xl font-light tracking-[-0.01em] text-neutral-900 sm:text-4xl lg:text-5xl"
        >
          Donde la belleza se encuentra con la{" "}
          <span className="relative italic text-neutral-500">
            experiencia
            <span className="absolute -bottom-1 left-0 h-px w-full bg-gradient-to-r from-primary-400/60 to-transparent" />
          </span>
        </motion.h2>

        {/* Description */}
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.5, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto mb-12 max-w-xl text-center text-base leading-[1.8] text-neutral-500 sm:mb-20 lg:mb-24"
        >
          Con más de 39 años de trayectoria en Río Verde, San Luis Potosí, hemos perfeccionado 
          el arte de realzar tu belleza natural. Combinamos técnicas clásicas con las últimas 
          tendencias para ofrecerte una experiencia única.
        </motion.p>

        {/* Stats */}
        <div className="grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-neutral-200/70 bg-neutral-200/70 shadow-[var(--elev-3)] sm:grid-cols-3">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: 0.3 + i * 0.08, ease: [0.22, 1, 0.36, 1] }}
              className="group relative bg-white p-8 text-center transition-colors duration-500 hover:bg-primary-50/40 sm:p-12"
            >
              <div className="mb-2 text-4xl font-light tracking-tight text-neutral-900 tabular-nums transition-colors duration-500 group-hover:text-primary-700 sm:text-5xl">
                {stat.number}
              </div>
              <div className="text-xs font-medium tracking-wide text-neutral-500 uppercase">
                {stat.label}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
