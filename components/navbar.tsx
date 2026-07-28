"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [user, setUser] = useState<{ role: string; name: string } | null>(null);
  const pathname = usePathname();
  const isHome = pathname === "/";
  const anchor = (hash: string) => isHome ? hash : `/${hash}`;

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (data?.user) setUser(data.user); })
      .catch(() => {});
  }, []);

  const navLinks = [
    { href: anchor("#inicio"), label: "Inicio" },
    { href: anchor("#nosotros"), label: "Nosotros" },
    { href: "/servicios", label: "Servicios" },
    { href: anchor("#galeria"), label: "Galería" },
  ];

  // On non-home pages, always use the light style (dark text) since there's no dark hero
  const useLight = scrolled || !isHome;

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className={`fixed top-0 z-50 w-full transition-all duration-500 ${
        useLight
          ? "bg-white/90 shadow-[0_1px_0_rgba(0,0,0,0.04)] backdrop-blur-2xl"
          : "bg-transparent"
      }`}
    >
      <div className="mx-auto max-w-6xl px-6">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href={isHome ? "#inicio" : "/"} className="flex items-center gap-2.5 group">
            <div className="relative h-9 w-9 overflow-hidden rounded-lg">
              <Image
                src="/logo.jpg"
                alt="Studio One Logo"
                fill
                className="object-cover transition-transform duration-300 group-hover:scale-110"
              />
            </div>
            <span className={`text-[11px] font-medium tracking-[0.15em] uppercase transition-colors duration-300 ${
              useLight ? "text-neutral-900" : "text-white"
            }`}>
              Studio One
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden items-center gap-1 md:flex">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-full px-4 py-1.5 text-[11px] font-medium tracking-wide transition-all duration-300 ${
                  useLight ? "text-neutral-500 hover:text-neutral-900" : "text-white/60 hover:text-white"
                }`}
              >
                {link.label}
              </Link>
            ))}
            <Link
              href={anchor("#contacto")}
              className={`ml-3 rounded-full px-5 py-1.5 text-[11px] font-medium tracking-wide transition-all duration-300 ${
                useLight
                  ? "bg-neutral-900 text-white hover:bg-neutral-800"
                  : "bg-white text-neutral-900 hover:bg-white/90"
              }`}
            >
              Contacto
            </Link>
            {user && (
              <Link
                href="/admin"
                className={`ml-1 rounded-full px-4 py-1.5 text-[11px] font-medium tracking-wide transition-all duration-300 border ${
                  useLight
                    ? "border-neutral-200 text-neutral-500 hover:border-neutral-300 hover:text-neutral-900"
                    : "border-white/20 text-white/60 hover:border-white/40 hover:text-white"
                }`}
              >
                <span className="inline-flex items-center gap-1.5">
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  Panel Admin
                </span>
              </Link>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="relative z-50 flex h-9 w-9 items-center justify-center rounded-full md:hidden"
            aria-label="Toggle menu"
          >
            <div className="flex flex-col gap-[5px]">
              <span
                className={`h-[1.5px] w-5 transition-all duration-300 ease-[cubic-bezier(0.25,0.46,0.45,0.94)] ${
                  isOpen
                    ? "translate-y-[6.5px] rotate-45 bg-white"
                    : useLight ? "bg-neutral-800" : "bg-white"
                }`}
              />
              <span
                className={`h-[1.5px] w-5 transition-all duration-300 ease-[cubic-bezier(0.25,0.46,0.45,0.94)] ${
                  isOpen ? "opacity-0" : useLight ? "bg-neutral-800" : "bg-white"
                }`}
              />
              <span
                className={`h-[1.5px] w-5 transition-all duration-300 ease-[cubic-bezier(0.25,0.46,0.45,0.94)] ${
                  isOpen
                    ? "-translate-y-[6.5px] -rotate-45 bg-white"
                    : useLight ? "bg-neutral-800" : "bg-white"
                }`}
              />
            </div>
          </button>
        </div>
      </div>

      {/* Mobile Navigation - Full Screen Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-40 flex flex-col items-center justify-center bg-neutral-900/95 backdrop-blur-xl md:hidden"
          >
            <nav className="flex flex-col items-center gap-2">
              {[...navLinks, { href: anchor("#contacto"), label: "Contacto" }].map((link, i) => (
                <motion.div
                  key={link.href}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ delay: i * 0.08, duration: 0.3 }}
                >
                  <Link
                    href={link.href}
                    onClick={() => setIsOpen(false)}
                    className="block px-4 py-3 text-2xl font-light tracking-tight text-white/90 transition-colors hover:text-white"
                  >
                    {link.label}
                  </Link>
                </motion.div>
              ))}
              {user && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ delay: 0.4, duration: 0.3 }}
                >
                  <Link
                    href="/admin"
                    onClick={() => setIsOpen(false)}
                    className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-6 py-3 text-lg font-light text-white backdrop-blur-sm transition-all hover:bg-white/20"
                  >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    Panel Admin
                  </Link>
                </motion.div>
              )}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}
