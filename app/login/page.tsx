"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import BackgroundSlideshow from "@/components/background-slideshow";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);

  /* If already logged in, bounce to admin */
  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (data?.user) router.replace("/admin"); })
      .catch(() => {});
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Error al iniciar sesión");
        return;
      }

      router.push("/admin");
    } catch {
      setError("Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden">
      {/* Background slideshow (same as hero) */}
      <BackgroundSlideshow />

      {/* Dark overlay for contrast */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/60" />

      {/* Back to site link */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="absolute left-6 top-6 z-20"
      >
        <Link
          href="/"
          className="group inline-flex items-center gap-2 rounded-full bg-primary-600 px-4 py-2 text-xs font-medium text-white shadow-lg transition-all hover:bg-primary-700 hover:shadow-xl active:scale-[0.97]"
        >
          <svg className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Volver al sitio
        </Link>
      </motion.div>

      {/* Main Card */}
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] as const }}
        className="relative z-10 mx-4 w-full max-w-[420px]"
      >
        <div className="relative overflow-hidden rounded-[32px] bg-white p-10 shadow-[0_32px_64px_rgba(0,0,0,0.3)]">

          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="mb-8 flex justify-center"
          >
            <div className="relative h-20 w-20 overflow-hidden rounded-[22px] shadow-md">
              <Image src="/logo.jpg" alt="Studio One" fill className="object-cover" priority />
            </div>
          </motion.div>

          {/* Title */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mb-8 text-center"
          >
            <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
              Bienvenido
            </h1>
            <p className="mt-2 text-sm text-neutral-400">
              Ingresa al panel de Studio One
            </p>
          </motion.div>

          {/* Form */}
          <motion.form
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            onSubmit={handleSubmit}
            className="space-y-5"
          >
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3"
              >
                <p className="text-center text-sm text-red-600">{error}</p>
              </motion.div>
            )}

            {/* Email */}
            <div className="relative">
              <label className={`absolute left-4 transition-all duration-300 pointer-events-none ${
                focused === "email" || email
                  ? "-top-4.5 text-[10px] font-medium text-primary-600"
                  : "top-5.5 text-sm text-neutral-400"
              }`}>
                Correo electrónico
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onFocus={() => setFocused("email")}
                onBlur={() => setFocused(null)}
                required
                className={`w-full rounded-2xl border bg-neutral-50 px-4 pb-3 pt-5 text-sm text-neutral-900 outline-none transition-all duration-300 ${
                  focused === "email"
                    ? "border-primary-400 bg-white ring-2 ring-primary-100"
                    : "border-neutral-200 hover:border-neutral-300"
                }`}
              />
            </div>

            {/* Password */}
            <div className="relative">
              <label className={`absolute left-4 transition-all duration-300 pointer-events-none ${
                focused === "password" || password
                  ? "-top-4.5 text-[10px] font-medium text-primary-600"
                  : "top-5.5 text-sm text-neutral-400"
              }`}>
                Contraseña
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => setFocused("password")}
                onBlur={() => setFocused(null)}
                required
                className={`w-full rounded-2xl border bg-neutral-50 px-4 pb-3 pt-5 text-sm text-neutral-900 outline-none transition-all duration-300 ${
                  focused === "password"
                    ? "border-primary-400 bg-white ring-2 ring-primary-100"
                    : "border-neutral-200 hover:border-neutral-300"
                }`}
              />
            </div>

            {/* Submit */}
            <motion.button
              type="submit"
              disabled={loading}
              whileTap={{ scale: 0.97 }}
              className="relative w-full overflow-hidden rounded-2xl bg-primary-500 py-3.5 text-sm font-semibold text-white transition-all duration-300 hover:bg-primary-600 hover:shadow-lg disabled:opacity-50"
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Entrando...
                </span>
              ) : (
                "Entrar"
              )}
            </motion.button>
          </motion.form>

          {/* Footer */}
          <p className="mt-8 text-center text-[11px] text-neutral-300">
            © {new Date().getFullYear()} Studio One · Panel Administrativo
          </p>
        </div>
      </motion.div>
    </div>
  );
}
