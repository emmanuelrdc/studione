"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, type Variants } from "framer-motion";
import BackgroundSlideshow from "./background-slideshow";

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.5 + i * 0.12, duration: 0.7, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

export default function Hero() {
  const whatsappNumber = "524871077025";
  const whatsappMessage = encodeURIComponent(
    "Hola, me gustaría agendar una cita en Studio One"
  );
  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${whatsappMessage}`;

  return (
    <section
      id="inicio"
      className="relative flex min-h-screen items-center justify-center overflow-hidden"
    >
      {/* Background */}
      <BackgroundSlideshow />

      {/* Base overlay — keeps text legible over any (even bright, daytime) slide */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/45 to-black/85" />

      {/* Radial scrim centered behind the content for guaranteed contrast */}
      <div className="absolute inset-0 [background:radial-gradient(ellipse_65%_55%_at_50%_46%,rgba(0,0,0,0.5),transparent_72%)]" />

      {/* Subtle top vignette anchors the navbar */}
      <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black/50 to-transparent" />

      {/* Content */}
      <div className="relative z-10 mx-auto max-w-5xl px-6 py-20 sm:py-28 md:py-32 text-center">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="mb-8 flex justify-center sm:mb-12"
        >
          <div className="relative h-24 w-24 sm:h-28 sm:w-28 overflow-hidden rounded-2xl shadow-2xl ring-1 ring-white/10">
            <Image
              src="/logo.jpg"
              alt="Studio One Logo"
              fill
              className="object-cover"
              priority
            />
          </div>
        </motion.div>

        {/* Title */}
        <motion.h1
          custom={0}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="mb-5 text-5xl font-light tracking-[-0.02em] text-white sm:text-7xl lg:text-8xl"
        >
          Studio One
        </motion.h1>

        {/* Decorative line */}
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: 0.8, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto mb-6 h-px w-16 origin-center bg-gradient-to-r from-transparent via-white/50 to-transparent"
        />

        {/* Subtitle */}
        <motion.p
          custom={1}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="mb-4 text-sm font-medium uppercase tracking-[0.2em] text-white/70 sm:text-base"
        >
          Estética Profesional
        </motion.p>

        {/* Description */}
        <motion.p
          custom={2}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="mx-auto mb-10 max-w-lg text-base leading-relaxed text-white/75 sm:mb-14 sm:text-lg"
        >
          Más de 39 años transformando tu imagen con las últimas tendencias en belleza y cuidado personal.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          custom={3}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="flex flex-col items-center justify-center gap-4 sm:flex-row"
        >
          <Link
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex items-center justify-center gap-2.5 rounded-full bg-white px-8 py-3.5 text-sm font-semibold text-neutral-900 shadow-[0_8px_24px_-6px_rgba(0,0,0,0.5)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_16px_40px_-8px_rgba(255,255,255,0.25)] active:translate-y-0 active:scale-[0.98]"
          >
            <svg
              className="h-4 w-4 transition-transform duration-300 group-hover:scale-110"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
            </svg>
            Agendar Cita
          </Link>
          <Link
            href="#servicios"
            className="group inline-flex items-center justify-center gap-2 rounded-full border border-white/15 px-8 py-3.5 text-sm font-medium text-white/70 transition-all duration-300 hover:border-white/30 hover:text-white active:scale-[0.98]"
          >
            Explorar Servicios
            <svg className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-y-0.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </Link>
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.2, duration: 1 }}
        className="absolute bottom-10 left-1/2 -translate-x-1/2"
      >
        <motion.div
          animate={{ y: [0, 6, 0] }}
          transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
          className="flex h-8 w-[18px] items-start justify-center rounded-full border border-white/15 p-1.5"
        >
          <motion.div
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
            className="h-1.5 w-0.5 rounded-full bg-white/60"
          />
        </motion.div>
      </motion.div>
    </section>
  );
}
