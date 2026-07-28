"use client";

import { motion } from "framer-motion";
import Link from "next/link";

export default function ServicesCTA() {
  return (
    <section id="servicios" className="relative py-20 px-6 sm:py-28 lg:py-36">
      <div className="absolute inset-0 bg-neutral-900" />

      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[500px] rounded-full bg-primary-500/[0.03] blur-[120px]" />

      <div className="relative mx-auto max-w-4xl text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="space-y-8"
        >
          <div className="flex flex-col items-center gap-3">
            <span className="h-8 w-px bg-gradient-to-b from-transparent to-primary-400/60" />
            <span className="text-[11px] font-semibold tracking-[0.25em] text-primary-400/80 uppercase">
              Nuestro Menú
            </span>
          </div>
          <h2 className="text-3xl font-light tracking-[-0.01em] text-white sm:text-4xl md:text-5xl">
            Servicios y Productos
          </h2>
          <p className="mx-auto max-w-lg text-base text-white/55 leading-[1.8]">
            Descubre nuestra amplia gama de servicios profesionales y productos de las mejores marcas para el cuidado de tu cabello y belleza.
          </p>

          {/* Feature highlights */}
          <motion.div 
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.5, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
            className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 max-w-3xl mx-auto"
          >
            <div className="group rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 transition-all duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] hover:-translate-y-1 hover:border-primary-500/20 hover:bg-white/[0.04] hover:shadow-[0_16px_40px_-12px_rgba(0,0,0,0.5)]">
              <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-white/[0.05] transition-colors duration-300 group-hover:bg-primary-500/15">
                <svg className="h-5 w-5 text-white/40 transition-colors duration-300 group-hover:text-primary-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                </svg>
              </div>
              <p className="text-sm font-medium text-white/60">Servicios Profesionales</p>
              <p className="mt-1.5 text-xs text-white/45 leading-relaxed">Cortes, tintes, tratamientos y más</p>
            </div>
            <div className="group rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 transition-all duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] hover:-translate-y-1 hover:border-primary-500/20 hover:bg-white/[0.04] hover:shadow-[0_16px_40px_-12px_rgba(0,0,0,0.5)]">
              <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-white/[0.05] transition-colors duration-300 group-hover:bg-primary-500/15">
                <svg className="h-5 w-5 text-white/40 transition-colors duration-300 group-hover:text-primary-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                </svg>
              </div>
              <p className="text-sm font-medium text-white/60">Productos Premium</p>
              <p className="mt-1.5 text-xs text-white/45 leading-relaxed">Las mejores marcas del mercado</p>
            </div>
            <div className="group rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 transition-all duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] hover:-translate-y-1 hover:border-primary-500/20 hover:bg-white/[0.04] hover:shadow-[0_16px_40px_-12px_rgba(0,0,0,0.5)]">
              <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-white/[0.05] transition-colors duration-300 group-hover:bg-primary-500/15">
                <svg className="h-5 w-5 text-white/40 transition-colors duration-300 group-hover:text-primary-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
                </svg>
              </div>
              <p className="text-sm font-medium text-white/60">Marcas Exclusivas</p>
              <p className="mt-1.5 text-xs text-white/45 leading-relaxed">Calidad profesional garantizada</p>
            </div>
          </motion.div>

          {/* CTA Button */}
          <motion.div 
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="pt-8"
          >
            <Link
              href="/servicios"
              className="group inline-flex items-center gap-3 rounded-full border border-white/10 px-8 py-4 text-sm font-medium text-white/70 transition-all duration-300 hover:border-white/20 hover:text-white active:scale-[0.98]"
            >
              Ver Servicios y Productos
              <svg className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
