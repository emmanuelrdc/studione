"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";

interface GalleryImage {
  id: number;
  url: string;
  alt: string | null;
  sort_order: number;
}

// Alternating aspect ratios for visual rhythm in the masonry grid
const HEIGHTS = [
  "aspect-square",
  "aspect-[3/4]",
  "aspect-square",
  "aspect-[3/4]",
  "aspect-square",
  "aspect-[3/4]",
  "aspect-square",
  "aspect-[3/4]",
  "aspect-square",
];

const SKELETON_COUNT = 9;

export default function Gallery() {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/gallery")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setImages(data);
      })
      .catch(() => {/* show nothing on network error */})
      .finally(() => setLoading(false));
  }, []);

  return (
    <section id="galeria" className="py-20 px-6 bg-[#fafaf8] sm:py-28 lg:py-36">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="mb-8 flex flex-col items-center gap-3"
        >
          <span className="h-8 w-px bg-gradient-to-b from-transparent to-primary-500/50" />
          <span className="text-[11px] font-semibold tracking-[0.25em] text-neutral-500 uppercase">
            Galería
          </span>
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.5, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto mb-6 max-w-2xl text-center text-3xl font-light tracking-[-0.01em] text-neutral-900 sm:text-4xl"
        >
          Nuestro trabajo habla por nosotros
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.5, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto mb-20 max-w-md text-center text-sm text-neutral-500 leading-relaxed"
        >
          Cada cliente es una obra de arte única.
        </motion.p>

        {/* Gallery Grid */}
        <div className="columns-1 gap-3 sm:columns-2 lg:columns-3">
          {loading
            ? // Skeleton placeholders preserve layout while images load
              Array.from({ length: SKELETON_COUNT }, (_, i) => (
                <div
                  key={i}
                  className={`mb-3 break-inside-avoid overflow-hidden rounded-xl bg-neutral-200 animate-pulse ${HEIGHTS[i % HEIGHTS.length]}`}
                />
              ))
            : images.map((image, i) => (
                <motion.div
                  key={image.id}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-30px" }}
                  transition={{ duration: 0.5, delay: i * 0.04, ease: [0.22, 1, 0.36, 1] }}
                  className="group relative mb-3 break-inside-avoid overflow-hidden rounded-2xl bg-neutral-100 shadow-[var(--elev-1)] transition-shadow duration-500 hover:shadow-[var(--elev-4)]"
                >
                  <div className={HEIGHTS[i % HEIGHTS.length]}>
                    <Image
                      src={image.url}
                      alt={image.alt ?? `Studio One - Trabajo ${i + 1}`}
                      fill
                      className="object-cover transition-transform duration-[700ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.05]"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    />
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                </motion.div>
              ))}
        </div>

        {/* Instagram CTA */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="mt-12 text-center sm:mt-20"
        >
          <a
            href="https://www.instagram.com/studio_one.rv/"
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex items-center gap-2.5 rounded-full border border-neutral-200 px-7 py-3.5 text-sm font-medium text-neutral-600 transition-all duration-300 hover:border-neutral-300 hover:text-neutral-900 active:scale-[0.98]"
          >
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
            </svg>
            Ver más en Instagram
            <svg className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </a>
        </motion.div>
      </div>
    </section>
  );
}
