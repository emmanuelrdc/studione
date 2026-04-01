"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [user, setUser] = useState<{ role: string; name: string } | null>(null);

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
    { href: "#inicio", label: "Inicio" },
    { href: "#nosotros", label: "Nosotros" },
    { href: "#servicios", label: "Servicios" },
    { href: "#galeria", label: "Galería" },
  ];

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={`fixed top-0 z-50 w-full transition-all duration-500 ${
        scrolled
          ? "bg-white/80 shadow-[0_1px_0_rgba(0,0,0,0.06)] backdrop-blur-xl"
          : "bg-transparent"
      }`}
    >
      <div className="mx-auto max-w-6xl px-6">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="#inicio" className="flex items-center gap-2.5 group">
            <div className="relative h-9 w-9 overflow-hidden rounded-lg">
              <Image
                src="/logo.jpg"
                alt="Studio One Logo"
                fill
                className="object-cover transition-transform duration-300 group-hover:scale-110"
              />
            </div>
            <span className={`text-sm font-semibold tracking-wide transition-colors duration-300 ${
              scrolled ? "text-neutral-900" : "text-white"
            }`}>
              STUDIO ONE
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden items-center gap-1 md:flex">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-full px-4 py-1.5 text-xs font-medium transition-all duration-300 hover:bg-black/5 ${
                  scrolled ? "text-neutral-600 hover:text-neutral-900" : "text-white/80 hover:text-white hover:bg-white/10"
                }`}
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="#contacto"
              className={`ml-2 rounded-full px-5 py-1.5 text-xs font-medium transition-all duration-300 ${
                scrolled
                  ? "bg-primary-600 text-white hover:bg-primary-700"
                  : "bg-white text-neutral-900 hover:bg-white/90"
              }`}
            >
              Contacto
            </Link>
            <Link
              href={user ? "/admin" : "/login"}
              className={`ml-1 rounded-full px-5 py-1.5 text-xs font-medium transition-all duration-300 border ${
                scrolled
                  ? "border-neutral-300 text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
                  : "border-white/30 text-white/80 hover:bg-white/10 hover:text-white"
              }`}
            >
              {user ? (
                <span className="inline-flex items-center gap-1.5">
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  Panel Admin
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5">
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                  Login
                </span>
              )}
            </Link>
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
                    : scrolled ? "bg-neutral-800" : "bg-white"
                }`}
              />
              <span
                className={`h-[1.5px] w-5 transition-all duration-300 ease-[cubic-bezier(0.25,0.46,0.45,0.94)] ${
                  isOpen ? "opacity-0" : scrolled ? "bg-neutral-800" : "bg-white"
                }`}
              />
              <span
                className={`h-[1.5px] w-5 transition-all duration-300 ease-[cubic-bezier(0.25,0.46,0.45,0.94)] ${
                  isOpen
                    ? "-translate-y-[6.5px] -rotate-45 bg-white"
                    : scrolled ? "bg-neutral-800" : "bg-white"
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
              {[...navLinks, { href: "#contacto", label: "Contacto" }].map((link, i) => (
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
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ delay: 0.4, duration: 0.3 }}
              >
                <Link
                  href={user ? "/admin" : "/login"}
                  onClick={() => setIsOpen(false)}
                  className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-6 py-3 text-lg font-light text-white backdrop-blur-sm transition-all hover:bg-white/20"
                >
                  {user ? (
                    <>
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                      Panel Admin
                    </>
                  ) : (
                    <>
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                      Login
                    </>
                  )}
                </Link>
              </motion.div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}
