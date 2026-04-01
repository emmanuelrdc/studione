"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";

interface ServiceItem {
  id: number;
  name: string;
  description: string | null;
  price: number;
  duration: number;
  image: string | null;
}

interface Subcategory {
  id: number;
  name: string;
  services: ServiceItem[];
}

interface ServiceGroup {
  id: number;
  name: string;
  subcategories: Subcategory[];
  services: ServiceItem[];
}

interface ProductItem {
  id: number;
  name: string;
  description: string | null;
  brand: string | null;
  price: number;
  image: string | null;
  quantity: number;
}

interface ProductGroup {
  id: number;
  name: string;
  products: ProductItem[];
}

interface BrandItem {
  id: number;
  name: string;
  description: string | null;
}

const categoryIcons: Record<string, React.ReactNode> = {
  Capilares: (
    <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.848 8.25l1.536.887M7.848 8.25a3 3 0 11-5.196-3 3 3 0 015.196 3zm1.536.887a2.165 2.165 0 011.083 1.839c.005.351.054.695.14 1.024M9.384 9.137l2.077 1.199M7.848 15.75l1.536-.887m-1.536.887a3 3 0 11-5.196 3 3 3 0 015.196-3zm1.536-.887a2.165 2.165 0 001.083-1.838c.005-.352.054-.695.14-1.025m-1.223 2.863l2.077-1.199m0-3.328a4.323 4.323 0 012.068-1.379l5.325-1.628a4.5 4.5 0 012.48-.044l.803.215-7.794 4.5m-2.882-1.664A4.331 4.331 0 0010.607 12m3.736 0l7.794 4.5-.802.215a4.5 4.5 0 01-2.48-.043l-5.326-1.629a4.324 4.324 0 01-2.068-1.379M14.343 12l-2.882 1.664" />
    </svg>
  ),
  Maquillajes: (
    <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.764m3.42 3.42a6.776 6.776 0 00-3.42-3.42" />
    </svg>
  ),
  Faciales: (
    <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.182 15.182a4.5 4.5 0 01-6.364 0M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm-.375 0h.008v.015h-.008V9.75zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75zm-.375 0h.008v.015h-.008V9.75z" />
    </svg>
  ),
};

const defaultIcon = (
  <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
  </svg>
);

export default function Services() {
  const [serviceGroups, setServiceGroups] = useState<ServiceGroup[]>([]);
  const [productGroups, setProductGroups] = useState<ProductGroup[]>([]);
  const [brands, setBrands] = useState<BrandItem[]>([]);
  const [activeTab, setActiveTab] = useState<"services" | "products" | "brands">("services");
  const [activeCategory, setActiveCategory] = useState<number | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/menu").then(r => r.json()),
      fetch("/api/brands").then(r => r.json()),
    ]).then(([menuData, brandsData]) => {
      if (menuData.services) setServiceGroups(menuData.services);
      if (menuData.products) setProductGroups(menuData.products);
      if (menuData.services?.length > 0) setActiveCategory(menuData.services[0].id);
      setBrands(brandsData);
      setLoaded(true);
    }).catch(() => setLoaded(true));
  }, []);

  const currentServiceGroup = serviceGroups.find((g) => g.id === activeCategory);
  const currentProductGroup = productGroups.find((g) => g.id === activeCategory);

  const allServices = currentServiceGroup
    ? [
        ...currentServiceGroup.services,
        ...currentServiceGroup.subcategories.flatMap((s) => s.services),
      ]
    : [];

  return (
    <section id="servicios" className="relative py-32 px-6">
      <div className="absolute inset-0 bg-neutral-900" />

      <div className="relative mx-auto max-w-6xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="mb-6 text-center"
        >
          <span className="inline-block rounded-full bg-white/10 px-4 py-1.5 text-xs font-medium tracking-widest text-white/60 uppercase">
            Nuestro Menú
          </span>
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="mx-auto mb-6 max-w-3xl text-center text-4xl font-semibold tracking-tight text-white sm:text-5xl"
        >
          Servicios &amp; Productos
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mx-auto mb-12 max-w-xl text-center text-base text-white/40"
        >
          Servicios profesionales y productos de alta calidad para resaltar tu belleza.
        </motion.p>

        {/* Tabs: Services / Products */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mb-8 flex justify-center"
        >
          <div className="inline-flex rounded-2xl border border-white/[0.08] bg-white/[0.04] p-1 backdrop-blur-xl">
            <button
              onClick={() => {
                setActiveTab("services");
                if (serviceGroups.length) setActiveCategory(serviceGroups[0].id);
              }}
              className={`rounded-xl px-6 py-2.5 text-sm font-medium transition-all duration-300 ${
                activeTab === "services"
                  ? "bg-white/[0.12] text-white shadow-sm"
                  : "text-white/40 hover:text-white/60"
              }`}
            >
              Servicios
            </button>
            <button
              onClick={() => {
                setActiveTab("products");
                if (productGroups.length) setActiveCategory(productGroups[0].id);
              }}
              className={`rounded-xl px-6 py-2.5 text-sm font-medium transition-all duration-300 ${
                activeTab === "products"
                  ? "bg-white/[0.12] text-white shadow-sm"
                  : "text-white/40 hover:text-white/60"
              }`}
            >
              Productos
            </button>
            <button
              onClick={() => setActiveTab("brands")}
              className={`rounded-xl px-6 py-2.5 text-sm font-medium transition-all duration-300 ${
                activeTab === "brands"
                  ? "bg-white/[0.12] text-white shadow-sm"
                  : "text-white/40 hover:text-white/60"
              }`}
            >
              Marcas
            </button>
          </div>
        </motion.div>

        {/* Category pills */}
        {activeTab !== "brands" && (
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.35 }}
          className="mb-10 flex flex-wrap justify-center gap-2"
        >
          {(activeTab === "services" ? serviceGroups : productGroups).map((g) => (
            <button
              key={g.id}
              onClick={() => setActiveCategory(g.id)}
              className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-medium transition-all duration-300 ${
                activeCategory === g.id
                  ? "border-white/20 bg-white/[0.1] text-white"
                  : "border-white/[0.06] bg-white/[0.02] text-white/40 hover:border-white/10 hover:text-white/60"
              }`}
            >
              <span className="text-white/50">{categoryIcons[g.name] || defaultIcon}</span>
              {g.name}
            </button>
          ))}
        </motion.div>
        )}

        {/* Content */}
        {!loaded ? (
          <div className="py-20 text-center text-white/20 text-sm">Cargando menú...</div>
        ) : (
          <AnimatePresence mode="wait">
            {activeTab === "services" && currentServiceGroup && (
              <motion.div
                key={`svc-${activeCategory}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
              >
                {/* Subcategories with services */}
                {currentServiceGroup.subcategories.filter(s => s.services.length > 0).map((sub) => (
                  <div key={sub.id} className="mb-8">
                    <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-white/30">
                      {sub.name}
                    </h3>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {sub.services.map((svc, i) => (
                        <ServiceCard key={svc.id} service={svc} delay={i * 0.05} />
                      ))}
                    </div>
                  </div>
                ))}

                {/* Direct services */}
                {currentServiceGroup.services.length > 0 && (
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {currentServiceGroup.services.map((svc, i) => (
                      <ServiceCard key={svc.id} service={svc} delay={i * 0.05} />
                    ))}
                  </div>
                )}

                {allServices.length === 0 && (
                  <p className="py-16 text-center text-white/20 text-sm">
                    Próximamente se agregarán servicios a esta categoría.
                  </p>
                )}
              </motion.div>
            )}

            {activeTab === "products" && currentProductGroup && (
              <motion.div
                key={`prod-${activeCategory}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
              >
                {currentProductGroup.products.length > 0 ? (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {currentProductGroup.products.map((prod, i) => (
                      <ProductCard key={prod.id} product={prod} delay={i * 0.05} />
                    ))}
                  </div>
                ) : (
                  <p className="py-16 text-center text-white/20 text-sm">
                    Próximamente se agregarán productos a esta categoría.
                  </p>
                )}
              </motion.div>
            )}

            {activeTab === "brands" && (
              <motion.div
                key="brands"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
              >
                {brands.length > 0 ? (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {brands.map((brand, i) => (
                      <motion.div
                        key={brand.id}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.4, delay: i * 0.05 }}
                        className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-6 backdrop-blur-sm transition-all duration-500 hover:bg-white/[0.06] hover:border-white/[0.12]"
                      >
                        <h4 className="text-sm font-semibold text-white tracking-tight">{brand.name}</h4>
                        {brand.description && (
                          <p className="mt-2 text-xs leading-relaxed text-white/30">{brand.description}</p>
                        )}
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <p className="py-16 text-center text-white/20 text-sm">
                    Próximamente se agregarán marcas.
                  </p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>
    </section>
  );
}

function ServiceCard({ service, delay }: { service: ServiceItem; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, delay }}
      className="group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-sm transition-all duration-500 hover:bg-white/[0.06] hover:border-white/[0.12]"
    >
      {service.image && (
        <div className="relative h-40 w-full overflow-hidden">
          <Image
            src={service.image}
            alt={service.name}
            fill
            className="object-cover transition-transform duration-700 group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-neutral-900/90 via-neutral-900/20 to-transparent" />
        </div>
      )}
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <h4 className="text-sm font-semibold text-white tracking-tight">{service.name}</h4>
        </div>
        {service.description && (
          <p className="mt-2 text-xs leading-relaxed text-white/30">{service.description}</p>
        )}
        {service.duration > 0 && (
          <p className="mt-2 inline-flex items-center gap-1 text-[10px] text-white/20">
            <svg className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
            {service.duration} min
          </p>
        )}
      </div>
    </motion.div>
  );
}

function ProductCard({ product, delay }: { product: ProductItem; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, delay }}
      className="group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-sm transition-all duration-500 hover:bg-white/[0.06] hover:border-white/[0.12]"
    >
      {product.image ? (
        <div className="relative aspect-square overflow-hidden">
          <Image
            src={product.image}
            alt={product.name}
            fill
            className="object-cover transition-transform duration-700 group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, 25vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-neutral-900/80 via-transparent to-transparent" />
          {/* Price overlay */}
          <div className="absolute bottom-3 left-3 right-3">
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white backdrop-blur-md">
              ${product.price.toLocaleString("es-MX")}
            </span>
          </div>
        </div>
      ) : (
        <div className="flex aspect-square items-center justify-center bg-white/[0.02]">
          <svg className="h-12 w-12 text-white/[0.06]" fill="none" stroke="currentColor" strokeWidth={0.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.375 21h17.25c.621 0 1.125-.504 1.125-1.125V4.125C21.75 3.504 21.246 3 20.625 3H3.375C2.754 3 2.25 3.504 2.25 4.125v15.75C2.25 20.496 2.754 21 3.375 21Z" />
          </svg>
        </div>
      )}
      <div className="p-4">
        <h4 className="text-sm font-semibold text-white tracking-tight">{product.name}</h4>
        {product.brand && (
          <p className="mt-0.5 text-[11px] font-medium uppercase tracking-wider text-accent-500/70">
            {product.brand}
          </p>
        )}
        {product.description && (
          <p className="mt-1.5 text-xs leading-relaxed text-white/30 line-clamp-2">{product.description}</p>
        )}
        {!product.image && (
          <span className="mt-2 inline-block rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white backdrop-blur-md">
            ${product.price.toLocaleString("es-MX")}
          </span>
        )}
        {product.quantity > 0 && (
          <p className="mt-1.5 text-[10px] text-green-400/50">En stock</p>
        )}
      </div>
    </motion.div>
  );
}
