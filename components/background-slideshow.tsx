"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

export default function BackgroundSlideshow() {
  const images = [
    "/place/1.jpg",
    "/place/2.jpg",
    "/place/3.jpg",
    "/place/4.jpg",
  ];

  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [images.length]);

  if (images.length === 0) {
    return <div className="absolute inset-0 bg-neutral-900" />;
  }

  return (
    <div className="absolute inset-0 overflow-hidden bg-neutral-900">
      {images.map((image, index) => (
        <div
          key={index}
          className={`absolute inset-0 transition-opacity duration-[2000ms] ease-in-out ${
            index === currentIndex ? "opacity-100" : "opacity-0"
          }`}
          style={{
            animation: index === currentIndex ? "kenBurns 12s ease-in-out infinite alternate" : "none",
          }}
        >
          <Image
            src={image}
            alt={`Studio One ${index + 1}`}
            fill
            className="object-cover scale-110"
            priority={index === 0}
            unoptimized
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        </div>
      ))}
      <style jsx>{`
        @keyframes kenBurns {
          0% { transform: scale(1) translateX(0); }
          100% { transform: scale(1.08) translateX(-1%); }
        }
      `}</style>
    </div>
  );
}

