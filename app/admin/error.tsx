"use client";

import { useEffect } from "react";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Admin error:", error);
  }, [error]);

  return (
    <div className="flex items-center justify-center min-h-screen admin-bg">
      <div className="glass-modal p-8 max-w-md w-full text-center animate-modal">
        <div className="text-red-400 text-5xl mb-4">⚠</div>
        <h2 className="text-xl font-semibold text-white/90 mb-2">
          Algo salió mal
        </h2>
        <p className="text-white/40 text-sm mb-6">
          Ocurrió un error inesperado. Intenta nuevamente o contacta al
          administrador si el problema persiste.
        </p>
        <button
          onClick={reset}
          className="btn-primary px-6 py-2.5 text-sm"
        >
          Intentar de nuevo
        </button>
      </div>
    </div>
  );
}
