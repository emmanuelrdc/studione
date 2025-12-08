"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

export default function BackgroundSlideshow() {
  // Array de imágenes - ajusta los nombres según tus archivos
  // Las imágenes deben estar en /public/place/
  // Puedes agregar más imágenes aquí: "/place/5.jpg", "/place/6.jpg", etc.
  const images = [
    "/place/1.jpg",
    "/place/2.jpg",
    "/place/3.jpg",
    "/place/4.jpg",
  ];

  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    // Cambiar imagen cada 5 segundos
    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [images.length]);

  // Si no hay imágenes, mostrar un fondo sólido
  if (images.length === 0) {
    return <div className="absolute inset-0 bg-gray-100" />;
  }

  return (
    <div className="absolute inset-0 overflow-hidden">
      {images.map((image, index) => (
        <div
          key={index}
          className={`absolute inset-0 transition-opacity duration-1000 ${
            index === currentIndex ? "opacity-30" : "opacity-0"
          }`}
        >
          <Image
            src={image}
            alt={`Background ${index + 1}`}
            fill
            className="object-cover"
            priority={index === 0}
            unoptimized
            onError={(e) => {
              // Si la imagen no existe, ocultarla
              e.currentTarget.style.display = "none";
            }}
          />
        </div>
      ))}
    </div>
  );
}

