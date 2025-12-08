"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="fixed top-0 z-50 w-full border-b border-gray-200 bg-white/95 backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-20 items-center justify-between">
          {/* Logo */}
          <Link href="#inicio" className="flex items-center gap-3">
            <div className="relative h-12 w-12 sm:h-14 sm:w-14">
              <Image
                src="/logo.jpg"
                alt="Studio One Logo"
                fill
                className="rounded-xl object-cover"
              />
            </div>
            <span className="text-xl font-light text-gray-900 sm:text-2xl">
              STUDIO ONE
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden items-center gap-8 md:flex">
            <Link
              href="#inicio"
              className="text-sm font-medium text-gray-700 transition-colors hover:text-primary-600"
            >
              Inicio
            </Link>
            <Link
              href="#servicios"
              className="text-sm font-medium text-gray-700 transition-colors hover:text-primary-600"
            >
              Servicios
            </Link>
            <Link
              href="#galeria"
              className="text-sm font-medium text-gray-700 transition-colors hover:text-primary-600"
            >
              Galería
            </Link>
            <Link
              href="#contacto"
              className="rounded-full bg-primary-600 px-6 py-2 text-sm font-medium text-white transition-all hover:bg-primary-700"
            >
              Contacto
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex flex-col gap-1.5 rounded-lg p-2 md:hidden"
            aria-label="Toggle menu"
          >
            <span
              className={`h-0.5 w-6 bg-gray-700 transition-all ${
                isOpen ? "translate-y-2 rotate-45" : ""
              }`}
            />
            <span
              className={`h-0.5 w-6 bg-gray-700 transition-all ${
                isOpen ? "opacity-0" : ""
              }`}
            />
            <span
              className={`h-0.5 w-6 bg-gray-700 transition-all ${
                isOpen ? "-translate-y-2 -rotate-45" : ""
              }`}
            />
          </button>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <div className="border-t border-gray-200 py-4 md:hidden">
            <div className="flex flex-col gap-4">
              <Link
                href="#inicio"
                onClick={() => setIsOpen(false)}
                className="text-sm font-medium text-gray-700 transition-colors hover:text-primary-600"
              >
                Inicio
              </Link>
              <Link
                href="#servicios"
                onClick={() => setIsOpen(false)}
                className="text-sm font-medium text-gray-700 transition-colors hover:text-primary-600"
              >
                Servicios
              </Link>
              <Link
                href="#galeria"
                onClick={() => setIsOpen(false)}
                className="text-sm font-medium text-gray-700 transition-colors hover:text-primary-600"
              >
                Galería
              </Link>
              <Link
                href="#contacto"
                onClick={() => setIsOpen(false)}
                className="rounded-full bg-primary-600 px-6 py-2 text-center text-sm font-medium text-white transition-all hover:bg-primary-700"
              >
                Contacto
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
