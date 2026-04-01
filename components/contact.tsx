'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';

export default function Contact() {
  const whatsappNumber = "524871077025";
  const whatsappMessage = encodeURIComponent(
    "Hola, me gustaría agendar una cita en Studio One"
  );
  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${whatsappMessage}`;
  const phoneNumber = "4878720060";

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    reason: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert('Formulario enviado: ' + JSON.stringify(formData, null, 2));
    setFormData({ name: '', phone: '', email: '', reason: '' });
  };

  const contactInfo = [
    {
      icon: (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
        </svg>
      ),
      label: "Ubicación",
      value: "Gabriel Martínez Interior 2\nRío Verde, SLP, México CP 79610",
    },
    {
      icon: (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
        </svg>
      ),
      label: "Teléfono",
      value: phoneNumber,
      href: `tel:+52${phoneNumber}`,
    },
    {
      icon: (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      label: "Horario",
      value: "Lun–Vie: 9am–6pm\nSáb: 9am–4pm",
    },
  ];

  return (
    <section id="contacto" className="relative py-32 px-6 overflow-hidden">
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
            Contacto
          </span>
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="mx-auto mb-6 max-w-2xl text-center text-4xl font-semibold tracking-tight text-white sm:text-5xl"
        >
          ¿Lista para tu transformación?
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mx-auto mb-20 max-w-md text-center text-base text-white/40"
        >
          Agenda tu cita o envíanos un mensaje. Estamos aquí para ti.
        </motion.p>

        <div className="grid gap-12 lg:grid-cols-5">
          {/* Contact Info - Left Side */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="lg:col-span-2 space-y-6"
          >
            {contactInfo.map((item) => (
              <div key={item.label} className="flex gap-4 rounded-2xl bg-white/[0.05] p-5 border border-white/[0.08]">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.08] text-white/60">
                  {item.icon}
                </div>
                <div>
                  <p className="text-xs font-medium text-white/40 uppercase tracking-wider mb-1">{item.label}</p>
                  {item.href ? (
                    <a href={item.href} className="text-sm text-white font-medium hover:text-primary-400 transition-colors whitespace-pre-line">
                      {item.value}
                    </a>
                  ) : (
                    <p className="text-sm text-white/70 whitespace-pre-line leading-relaxed">{item.value}</p>
                  )}
                </div>
              </div>
            ))}

            {/* Social buttons */}
            <div className="flex flex-col gap-3 pt-2">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex w-full items-center justify-center gap-2.5 rounded-2xl bg-[#25D366] px-6 py-3.5 text-sm font-medium text-white transition-all duration-300 hover:bg-[#20BA5A] hover:shadow-lg active:scale-[0.98]"
              >
                <svg className="h-4.5 w-4.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                </svg>
                Agendar por WhatsApp
              </a>
              <div className="flex gap-3">
                <a
                  href="https://www.instagram.com/studio_one.rv/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl border border-white/[0.12] bg-white/[0.05] px-5 py-3 text-sm font-medium text-white/70 transition-all duration-300 hover:border-white/20 hover:bg-white/[0.08] active:scale-[0.98]"
                >
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                  </svg>
                  Instagram
                </a>
                <a
                  href="https://www.facebook.com/EsteticaStudioOne"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl border border-white/[0.12] bg-white/[0.05] px-5 py-3 text-sm font-medium text-white/70 transition-all duration-300 hover:border-white/20 hover:bg-white/[0.08] active:scale-[0.98]"
                >
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                  Facebook
                </a>
              </div>
            </div>
          </motion.div>

          {/* Contact Form - Right Side */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="lg:col-span-3"
          >
            <div className="rounded-3xl bg-white/[0.05] p-8 sm:p-10 border border-white/[0.08]">
              <h3 className="mb-1 text-xl font-semibold text-white">Envíanos un mensaje</h3>
              <p className="mb-8 text-sm text-white/40">Te responderemos lo antes posible.</p>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label htmlFor="name" className="mb-2 block text-xs font-medium text-white/50 uppercase tracking-wider">
                      Nombre
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      placeholder="Tu nombre"
                      className="w-full rounded-xl border border-white/[0.08] bg-white/[0.05] px-4 py-3 text-sm text-white placeholder:text-white/20 transition-all duration-200 focus:border-white/20 focus:bg-white/[0.08] focus:outline-none focus:ring-2 focus:ring-white/[0.05]"
                    />
                  </div>
                  <div>
                    <label htmlFor="phone" className="mb-2 block text-xs font-medium text-white/50 uppercase tracking-wider">
                      Teléfono
                    </label>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      required
                      placeholder="Tu teléfono"
                      className="w-full rounded-xl border border-white/[0.08] bg-white/[0.05] px-4 py-3 text-sm text-white placeholder:text-white/20 transition-all duration-200 focus:border-white/20 focus:bg-white/[0.08] focus:outline-none focus:ring-2 focus:ring-white/[0.05]"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="email" className="mb-2 block text-xs font-medium text-white/50 uppercase tracking-wider">
                    Correo
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    placeholder="tu@email.com"
                    className="w-full rounded-xl border border-white/[0.08] bg-white/[0.05] px-4 py-3 text-sm text-white placeholder:text-white/20 transition-all duration-200 focus:border-white/20 focus:bg-white/[0.08] focus:outline-none focus:ring-2 focus:ring-white/[0.05]"
                  />
                </div>
                <div>
                  <label htmlFor="reason" className="mb-2 block text-xs font-medium text-white/50 uppercase tracking-wider">
                    Mensaje
                  </label>
                  <textarea
                    id="reason"
                    name="reason"
                    value={formData.reason}
                    onChange={handleChange}
                    required
                    rows={4}
                    placeholder="Cuéntanos cómo podemos ayudarte..."
                    className="w-full resize-none rounded-xl border border-white/[0.08] bg-white/[0.05] px-4 py-3 text-sm text-white placeholder:text-white/20 transition-all duration-200 focus:border-white/20 focus:bg-white/[0.08] focus:outline-none focus:ring-2 focus:ring-white/[0.05]"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full rounded-xl bg-primary-500 px-6 py-3.5 text-sm font-medium text-white transition-all duration-300 hover:bg-primary-600 active:scale-[0.99]"
                >
                  Enviar mensaje
                </button>
              </form>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
