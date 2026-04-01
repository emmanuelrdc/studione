"use client";

import Image from "next/image";
import { motion } from "framer-motion";

export default function Gallery() {
  const images = Array.from({ length: 9 }, (_, i) => ({
    id: i + 1,
    alt: `Studio One - Trabajo ${i + 1}`,
  }));

  // Varying heights for masonry-like effect
  const heights = ["aspect-square", "aspect-[3/4]", "aspect-square", "aspect-[3/4]", "aspect-square", "aspect-[3/4]", "aspect-square", "aspect-[3/4]", "aspect-square"];

  return (
    <section id="galeria" className="py-32 px-6 bg-gradient-to-b from-white to-neutral-50">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="mb-6 text-center"
        >
          <span className="inline-block rounded-full bg-primary-100/60 px-4 py-1.5 text-xs font-medium tracking-widest text-primary-700 uppercase">
            Galería
          </span>
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="mx-auto mb-6 max-w-2xl text-center text-4xl font-semibold tracking-tight text-neutral-900 sm:text-5xl"
        >
          Nuestro trabajo habla por nosotros
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mx-auto mb-16 max-w-md text-center text-base text-neutral-400"
        >
          Cada cliente es una obra de arte única.
        </motion.p>

        {/* Gallery Grid */}
        <div className="columns-1 gap-3 sm:columns-2 lg:columns-3">
          {images.map((image, i) => (
            <motion.div
              key={image.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-30px" }}
              transition={{ duration: 0.5, delay: i * 0.06 }}
              className="group relative mb-3 break-inside-avoid overflow-hidden rounded-2xl bg-neutral-100"
            >
              <div className={heights[i]}>
                <div className="flex h-full items-center justify-center">
                  <span className="text-xs text-neutral-300">
                    {image.alt}
                  </span>
                </div>
                {
                <Image
                  src={`/gallery/${image.id}.jpg`}
                  alt={image.alt}
                  fill
                  className="object-cover transition-all duration-700 group-hover:scale-105"
                />
                }
              </div>

              {/* Hover overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
            </motion.div>
          ))}
        </div>

        {/* Instagram CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-16 text-center"
        >
          <a
            href="https://www.instagram.com/studio_one.rv/"
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex items-center gap-2.5 rounded-full bg-primary-600 px-7 py-3.5 text-sm font-medium text-white transition-all duration-300 hover:bg-primary-700 active:scale-[0.98]"
          >
            <svg className="h-4.5 w-4.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
            </svg>
            Ver más en Instagram
            <svg className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </a>
        </motion.div>
      </div>
    </section>
  );
}
