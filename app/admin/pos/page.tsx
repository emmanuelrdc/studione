"use client";

import { useState, useEffect, useCallback } from "react";
import { isBirthdayToday } from "@/lib/validation";
import { DEFAULT_POS_SETTINGS, type PosSettings, type Promotion } from "@/lib/types";

function ErrorBanner({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/10 px-5 py-3 backdrop-blur-xl shadow-lg">
      <svg className="h-4 w-4 shrink-0 text-red-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
      </svg>
      <p className="text-sm text-red-300">{message}</p>
      <button onClick={onClose} className="ml-2 text-red-400/50 hover:text-red-400 transition-colors">
        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
      </button>
    </div>
  );
}

interface Product { id: number; name: string; brand_name: string | null; price: number; stock_sales: number; category_name: string; product_type: string; }
interface Service { id: number; name: string; price: number; category_name: string; }
interface CartItem { id: string; name: string; unit_price: number; quantity: number; discount_percent: number; product_id?: number; service_id?: number; }
interface CashRegister { id: number; opening_amount: number; status: string; opened_at: string; }
interface Client { id: number; name: string; phone: string | null; birth_date: string | null; }

export default function POSPage() {
  const [register, setRegister] = useState<CashRegister | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [tab, setTab] = useState<"products" | "services">("products");
  const [search, setSearch] = useState("");
  const [showPayment, setShowPayment] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card">("cash");
  const [amountPaid, setAmountPaid] = useState("");
  const [showOpenRegister, setShowOpenRegister] = useState(false);
  const [openingAmount, setOpeningAmount] = useState("");
  const [lastSale, setLastSale] = useState<{ total: number; change_given: number; payment_method: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clientSearch, setClientSearch] = useState("");
  const [settings, setSettings] = useState<PosSettings>(DEFAULT_POS_SETTINGS);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [editingDiscountId, setEditingDiscountId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showCloseRegister, setShowCloseRegister] = useState(false);
  const [closingAmount, setClosingAmount] = useState("");

  const loadData = useCallback(async () => {
    const [prodRes, servRes, regRes, cliRes, setRes, promoRes] = await Promise.all([
      fetch("/api/products?active=1"),
      fetch("/api/services"),
      fetch("/api/cash-register"),
      fetch("/api/clients"),
      fetch("/api/settings", { cache: "no-store" }),
      fetch("/api/promotions"),
    ]);
    setProducts(await prodRes.json());
    setServices(await servRes.json());
    setClients(await cliRes.json());
    if (setRes.ok) setSettings(await setRes.json());
    if (promoRes.ok) setPromotions(await promoRes.json());
    const registers = await regRes.json();
    const openReg = registers.find((r: CashRegister) => r.status === "open");
    if (openReg) setRegister(openReg); else setShowOpenRegister(true);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(null), 5000);
    return () => clearTimeout(t);
  }, [error]);

  // Birthday detection: only when feature is enabled and client is selected.
  const isBirthday =
    settings.birthday_discount_enabled === 1 &&
    settings.birthday_discount_percent > 0 &&
    !!selectedClient &&
    isBirthdayToday(selectedClient.birth_date);
  const birthdayPercent = isBirthday ? settings.birthday_discount_percent : 0;

  // Client-side preview only — server recomputes this authoritatively (see app/api/sales/route.ts).
  const promoPercentFor = (item: CartItem): number => {
    if (settings.allow_promotions !== 1) return 0;
    const todayPromo = promotions.find(p => {
      if (!p.is_current) return false;
      if (p.target_type === "product") return item.product_id === p.target_id;
      if (p.target_type === "service") return item.service_id === p.target_id;
      return p.target_type === "all";
    });
    if (!todayPromo) return 0;
    if (todayPromo.type === "percent") return Math.max(0, Math.min(100, todayPromo.discount_value));
    return item.unit_price > 0 ? Math.max(0, Math.min(100, (todayPromo.discount_value / item.unit_price) * 100)) : 0;
  };

  // Effective discount per item = max(manual, birthday, promotion). Server enforces this too.
  const effectiveDiscount = (item: CartItem) => {
    const manual = settings.allow_discounts === 1 ? item.discount_percent : 0;
    return Math.max(manual, birthdayPercent, promoPercentFor(item));
  };
  const lineTotal = (item: CartItem) => {
    const gross = item.unit_price * item.quantity;
    return Math.round(gross * (1 - effectiveDiscount(item) / 100) * 100) / 100;
  };

  const subtotal = cart.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);
  const total = cart.reduce((sum, item) => sum + lineTotal(item), 0);
  const discountTotal = Math.round((subtotal - total) * 100) / 100;
  const change = paymentMethod === "cash" && amountPaid ? Math.max(0, parseFloat(amountPaid) - total) : 0;

  const addToCart = (item: { name: string; price: number; product_id?: number; service_id?: number }) => {
    const id = item.product_id ? `p-${item.product_id}` : `s-${item.service_id}`;
    setCart(prev => {
      const existing = prev.find(c => c.id === id);
      if (existing) return prev.map(c => c.id === id ? { ...c, quantity: c.quantity + 1 } : c);
      return [...prev, { id, name: item.name, unit_price: item.price, quantity: 1, discount_percent: 0, product_id: item.product_id, service_id: item.service_id }];
    });
  };

  const setItemDiscount = (id: string, percent: number) => {
    const clamped = Math.max(0, Math.min(100, Number.isFinite(percent) ? percent : 0));
    setCart(prev => prev.map(c => c.id === id ? { ...c, discount_percent: clamped } : c));
  };

  const MAX_CART_QTY = 99;
  const updateQty = (id: string, delta: number) => {
    setCart(prev => prev.map(c => c.id === id ? { ...c, quantity: Math.min(MAX_CART_QTY, Math.max(0, c.quantity + delta)) } : c).filter(c => c.quantity > 0));
  };

  const removeItem = (id: string) => setCart(prev => prev.filter(c => c.id !== id));

  const handleOpenRegister = async () => {
    const res = await fetch("/api/cash-register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "open", opening_amount: parseFloat(openingAmount) || 0 }),
    });
    if (res.ok) {
      const reg = await res.json();
      setRegister(reg);
      setOpeningAmount("");
      setShowOpenRegister(false);
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Error al abrir la caja");
    }
  };

  const handleCloseRegister = async () => {
    if (!register) return;
    const res = await fetch("/api/cash-register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "close", id: register.id, closing_amount: parseFloat(closingAmount) || 0 }),
    });
    if (res.ok) {
      setRegister(null);
      setCart([]);
      setClosingAmount("");
      setShowCloseRegister(false);
      setShowOpenRegister(true);
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Error al cerrar la caja");
      setShowCloseRegister(false);
    }
  };

  const handleCompleteSale = async () => {
    if (cart.length === 0) return;
    if (paymentMethod === "cash" && (!amountPaid || parseFloat(amountPaid) < total)) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cart.map(c => ({
            name: c.name,
            product_id: c.product_id,
            service_id: c.service_id,
            quantity: c.quantity,
            unit_price: c.unit_price,
            discount_percent: settings.allow_discounts === 1 ? c.discount_percent : 0,
          })),
          payment_method: paymentMethod,
          amount_paid: paymentMethod === "cash" ? parseFloat(amountPaid) : total,
          client_id: settings.show_clients_panel === 1 ? (selectedClient?.id || null) : null,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setLastSale({ total: data.total, change_given: data.change_given, payment_method: data.payment_method });
        setCart([]);
        setShowPayment(false);
        setAmountPaid("");
        setSelectedClient(null);
        setClientSearch("");
        loadData();
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Error al procesar la venta");
        setShowPayment(false);
      }
    } finally {
      setLoading(false);
    }
  };

  const filtered = tab === "products"
    ? products.filter(p => (p.product_type === "sell" || p.product_type === "both") && (p.name.toLowerCase().includes(search.toLowerCase()) || p.brand_name?.toLowerCase().includes(search.toLowerCase())))
    : services.filter(s => s.name.toLowerCase().includes(search.toLowerCase()));

  // Open register modal
  if (showOpenRegister) {
    return (
      <>
        <div className="flex h-full items-center justify-center p-6">
          <div className="w-full max-w-sm glass-modal animate-modal flex flex-col">
            {/* Header */}
            <div className="px-8 pt-8 pb-2 text-center">
              <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.04] border border-white/[0.06]">
                <svg className="h-6 w-6 text-white/50" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
                </svg>
              </div>
              <h2 className="text-base font-medium text-white">Apertura de Caja</h2>
              <p className="mt-1.5 text-xs text-white/25">Ingresa el monto inicial</p>
            </div>

            {/* Content */}
            <div className="px-8 py-6 space-y-4">
              <div className="space-y-3">
                <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-white/20">Monto inicial</p>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/25 text-lg">$</span>
                  <input
                    type="number"
                    value={openingAmount}
                    onChange={(e) => setOpeningAmount(e.target.value)}
                    placeholder="0.00"
                    className="glass-input w-full pl-9 pr-4 py-3.5 text-lg text-white placeholder:text-white/15"
                    autoFocus
                  />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-white/[0.04] px-8 py-6">
              <button onClick={handleOpenRegister} className="w-full rounded-lg bg-white py-3.5 text-sm font-medium text-neutral-900 transition-all duration-200 hover:bg-white/90 active:scale-[0.98]">
                Abrir Caja
              </button>
            </div>
          </div>
        </div>
        {error && <ErrorBanner message={error} onClose={() => setError(null)} />}
      </>
    );
  }

  return (
    <div className="flex h-full flex-col lg:flex-row">
      {/* Left: Product/Service Grid */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <div className="flex items-center gap-3 border-b border-white/[0.04] px-5 py-3.5">
          {/* Tabs */}
          <div className="flex gap-0.5 rounded-lg bg-white/[0.03] p-0.5">
            <button onClick={() => setTab("products")} className={`rounded-md px-4 py-1.5 text-[11px] font-medium tracking-wide transition-all duration-200 ${tab === "products" ? "bg-white/[0.08] text-white shadow-sm" : "text-white/35 hover:text-white/60"}`}>
              Productos
            </button>
            <button onClick={() => setTab("services")} className={`rounded-md px-4 py-1.5 text-[11px] font-medium tracking-wide transition-all duration-200 ${tab === "services" ? "bg-white/[0.08] text-white shadow-sm" : "text-white/35 hover:text-white/60"}`}>
              Servicios
            </button>
          </div>
          {/* Search */}
          <div className="relative flex-1">
            <svg className="absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/20" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar..."
              className="w-full rounded-lg glass-input py-2 pl-10 pr-4 text-sm placeholder:text-white/15"
            />
          </div>
          {/* Close register */}
          <button onClick={() => setShowCloseRegister(true)} className="rounded-lg border border-white/[0.06] px-4 py-2 text-[11px] font-medium text-white/30 transition-all duration-200 hover:border-red-500/20 hover:text-red-400 hover:bg-red-500/5">
            Cerrar Caja
          </button>
        </div>

        {/* Items Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {filtered.map((item: Product | Service) => (
              <button
                key={`${tab}-${item.id}`}
                onClick={() => addToCart({
                  name: item.name,
                  price: item.price,
                  product_id: tab === "products" ? item.id : undefined,
                  service_id: tab === "services" ? item.id : undefined,
                })}
                className="group flex flex-col items-start rounded-xl border border-white/[0.04] bg-white/[0.02] p-4 text-left transition-all duration-200 hover:border-white/[0.08] hover:bg-white/[0.04] active:scale-[0.97]"
              >
                <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-white/[0.04]">
                  {tab === "products" ? (
                    <svg className="h-4 w-4 text-white/30" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                    </svg>
                  ) : (
                    <svg className="h-4 w-4 text-white/30" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                    </svg>
                  )}
                </div>
                <p className="text-[13px] font-medium text-white/70 line-clamp-2 leading-snug">{item.name}</p>
                {"brand_name" in item && (item as Product).brand_name && <p className="mt-1 text-[10px] text-white/20">{(item as Product).brand_name}</p>}
                <p className="mt-auto pt-3 text-sm font-semibold text-white/90">${item.price.toFixed(2)}</p>
                {"stock_sales" in item && <p className="text-[10px] text-white/15 mt-0.5">{item.stock_sales} en stock</p>}
              </button>
            ))}
            {filtered.length === 0 && (
              <div className="col-span-full flex h-40 items-center justify-center text-xs text-white/15">
                {search ? "Sin resultados" : `No hay ${tab === "products" ? "productos" : "servicios"} registrados`}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right: Cart */}
      <div className="flex w-full flex-col border-l border-white/[0.04] bg-white/[0.01] lg:w-[380px]">
        {/* Cart header */}
        <div className="flex items-center justify-between border-b border-white/[0.04] px-5 py-3.5">
          <h2 className="text-[13px] font-medium text-white/80">Carrito</h2>
          <span className="rounded-md bg-white/[0.04] px-2 py-0.5 text-[10px] font-medium text-white/30">{cart.length}</span>
        </div>

        {/* Register info */}
        {register && (
          <div className="mx-5 mt-3 rounded-lg bg-white/[0.03] border border-white/[0.04] px-4 py-2.5">
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-400/80" />
              <span className="text-[10px] text-white/40 font-medium">Caja abierta</span>
              <span className="text-[10px] text-white/20 ml-auto">${register.opening_amount.toFixed(2)}</span>
            </div>
          </div>
        )}

        {/* Cart items */}
        <div className="flex-1 overflow-y-auto p-4 space-y-1.5">
          {cart.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-3">
              <svg className="h-8 w-8 text-white/[0.06]" fill="none" stroke="currentColor" strokeWidth={1} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
              </svg>
              <p className="text-[11px] text-white/15">Agrega productos o servicios</p>
            </div>
          ) : (
            cart.map((item) => {
              const eff = effectiveDiscount(item);
              const line = lineTotal(item);
              const gross = item.unit_price * item.quantity;
              const isEditing = editingDiscountId === item.id;
              const promoPercent = promoPercentFor(item);
              const manualPercent = settings.allow_discounts === 1 ? item.discount_percent : 0;
              const birthdayWinning = birthdayPercent > manualPercent && birthdayPercent >= promoPercent && birthdayPercent > 0;
              const promoWinning = promoPercent > manualPercent && promoPercent > birthdayPercent && promoPercent > 0;
              return (
                <div key={item.id} className="rounded-lg border border-white/[0.04] bg-white/[0.02] p-3 transition-colors duration-150 hover:bg-white/[0.03]">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-[13px] font-medium text-white/70 flex-1 leading-snug">{item.name}</p>
                    <button onClick={() => removeItem(item.id)} className="text-white/15 hover:text-red-400/70 transition-colors duration-150 mt-0.5">
                      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <div className="mt-2.5 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => updateQty(item.id, -1)} className="flex h-6 w-6 items-center justify-center rounded-md bg-white/[0.04] text-[11px] text-white/40 transition-colors hover:bg-white/[0.08] hover:text-white/70">−</button>
                      <span className="w-7 text-center text-[12px] font-medium text-white/80">{item.quantity}</span>
                      <button onClick={() => updateQty(item.id, 1)} className="flex h-6 w-6 items-center justify-center rounded-md bg-white/[0.04] text-[11px] text-white/40 transition-colors hover:bg-white/[0.08] hover:text-white/70">+</button>
                      {settings.allow_discounts === 1 && (
                        <button
                          onClick={() => setEditingDiscountId(isEditing ? null : item.id)}
                          className={`ml-1 flex h-6 items-center gap-1 rounded-md px-2 text-[10px] font-medium transition-colors ${
                            item.discount_percent > 0
                              ? "bg-white/[0.08] text-white/70"
                              : "bg-white/[0.04] text-white/30 hover:bg-white/[0.06] hover:text-white/50"
                          }`}
                          title="Aplicar descuento"
                        >
                          %{item.discount_percent > 0 && <span>{item.discount_percent}</span>}
                        </button>
                      )}
                    </div>
                    <div className="text-right">
                      {eff > 0 ? (
                        <>
                          <p className="text-[10px] text-white/25 line-through">${gross.toFixed(2)}</p>
                          <p className="text-[13px] font-semibold text-white/80">${line.toFixed(2)}</p>
                        </>
                      ) : (
                        <p className="text-[13px] font-semibold text-white/80">${line.toFixed(2)}</p>
                      )}
                    </div>
                  </div>
                  {isEditing && settings.allow_discounts === 1 && (
                    <div className="mt-2.5 flex items-center gap-2 rounded-md bg-white/[0.03] p-2">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={item.discount_percent}
                        onChange={(e) => setItemDiscount(item.id, Number(e.target.value))}
                        autoFocus
                        className="w-full rounded bg-white/[0.04] px-2 py-1 text-[12px] text-white/80 outline-none focus:bg-white/[0.06]"
                        placeholder="0"
                      />
                      <span className="text-[11px] text-white/30">%</span>
                      <button
                        onClick={() => setEditingDiscountId(null)}
                        className="rounded bg-white/[0.06] px-2 py-1 text-[10px] font-medium text-white/60 hover:bg-white/[0.1]"
                      >
                        OK
                      </button>
                    </div>
                  )}
                  {birthdayWinning && eff > 0 && (
                    <p className="mt-1.5 text-[10px] text-amber-300/70">Descuento de cumpleaños aplicado</p>
                  )}
                  {promoWinning && eff > 0 && (
                    <p className="mt-1.5 text-[10px] text-primary-400/70">Promoción aplicada</p>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Total + Pay */}
        <div className="border-t border-white/[0.04] p-5 space-y-4">
          {discountTotal > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-white/30">Subtotal</span>
                <span className="text-white/40">${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-amber-300/60">Descuento</span>
                <span className="text-amber-300/70">−${discountTotal.toFixed(2)}</span>
              </div>
            </div>
          )}
          <div className="flex items-baseline justify-between">
            <span className="text-xs text-white/30">Total</span>
            <span className="text-2xl font-light tracking-tight text-white">${total.toFixed(2)}</span>
          </div>
          <button
            onClick={() => { if (cart.length > 0) setShowPayment(true); }}
            disabled={cart.length === 0}
            className="w-full rounded-lg bg-white py-3.5 text-sm font-medium text-neutral-900 transition-all duration-200 hover:bg-white/90 active:scale-[0.98] disabled:opacity-20 disabled:pointer-events-none"
          >
            Cobrar
          </button>
        </div>
      </div>

      {/* Payment Modal */}
      {showPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => { setShowPayment(false); setAmountPaid(""); }}>
          <div className="w-full max-w-md glass-modal animate-modal flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between px-8 pt-8 pb-4">
              <div>
                <h2 className="text-base font-medium text-white">Cobrar Venta</h2>
                <p className="mt-1 text-xs text-white/25">Selecciona el método de pago</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-white/20">Total</p>
                <p className="text-xl font-light text-white">${total.toFixed(2)}</p>
              </div>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto px-8 pb-2 space-y-6">
              {/* Payment method */}
              <div className="space-y-3">
                <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-white/20">Método de pago</p>
                <div className="flex gap-2.5">
                  <button
                    onClick={() => setPaymentMethod("cash")}
                    className={`flex-1 rounded-lg border p-4 text-center transition-all duration-200 ${paymentMethod === "cash" ? "border-white/15 bg-white/[0.06]" : "border-white/[0.04] bg-white/[0.02] hover:bg-white/[0.04]"}`}
                  >
                    <svg className={`h-5 w-5 mx-auto ${paymentMethod === "cash" ? "text-white/70" : "text-white/25"}`} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
                    </svg>
                    <p className={`mt-2.5 text-[11px] font-medium ${paymentMethod === "cash" ? "text-white/70" : "text-white/25"}`}>Efectivo</p>
                  </button>
                  <button
                    onClick={() => setPaymentMethod("card")}
                    className={`flex-1 rounded-lg border p-4 text-center transition-all duration-200 ${paymentMethod === "card" ? "border-white/15 bg-white/[0.06]" : "border-white/[0.04] bg-white/[0.02] hover:bg-white/[0.04]"}`}
                  >
                    <svg className={`h-5 w-5 mx-auto ${paymentMethod === "card" ? "text-white/70" : "text-white/25"}`} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
                    </svg>
                    <p className={`mt-2.5 text-[11px] font-medium ${paymentMethod === "card" ? "text-white/70" : "text-white/25"}`}>Tarjeta</p>
                  </button>
                </div>
              </div>

              {/* Client selector */}
              {settings.show_clients_panel === 1 && (
              <div className="space-y-3">
                <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-white/20">Cliente (opcional)</p>
                {selectedClient ? (
                  <div className="flex items-center justify-between rounded-lg border border-white/[0.08] bg-white/[0.04] px-4 py-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-white/80 truncate">{selectedClient.name}</p>
                        {isBirthday && (
                          <span className="shrink-0 rounded-full bg-amber-400/15 px-2 py-0.5 text-[10px] font-medium text-amber-300/90">
                            Cumpleaños · −{settings.birthday_discount_percent}%
                          </span>
                        )}
                      </div>
                      {selectedClient.phone && <p className="text-[11px] text-white/30 mt-0.5">{selectedClient.phone}</p>}
                    </div>
                    <button onClick={() => { setSelectedClient(null); setClientSearch(""); }} className="text-white/20 hover:text-white/50 transition-colors">
                      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <svg className="absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/15" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>
                    <input
                      type="text"
                      value={clientSearch}
                      onChange={(e) => setClientSearch(e.target.value)}
                      placeholder="Buscar cliente..."
                      className="glass-input w-full pl-10 pr-4 py-2.5 text-sm"
                    />
                    {clientSearch.length >= 2 && (
                      <div className="absolute z-10 mt-1.5 max-h-40 w-full overflow-y-auto rounded-lg border border-white/[0.06] bg-neutral-900/98 backdrop-blur-xl shadow-2xl">
                        {clients.filter(c => c.name.toLowerCase().includes(clientSearch.toLowerCase()) || c.phone?.toLowerCase().includes(clientSearch.toLowerCase())).map(c => (
                          <button key={c.id} onClick={() => { setSelectedClient(c); setClientSearch(""); }}
                            className="w-full px-4 py-2.5 text-left text-sm text-white/60 hover:bg-white/[0.04] transition-colors">
                            <span className="font-medium text-white/80">{c.name}</span>
                            {c.phone && <span className="ml-2 text-[11px] text-white/20">{c.phone}</span>}
                          </button>
                        ))}
                        {clients.filter(c => c.name.toLowerCase().includes(clientSearch.toLowerCase()) || c.phone?.toLowerCase().includes(clientSearch.toLowerCase())).length === 0 && (
                          <p className="px-4 py-3 text-[11px] text-white/15">Sin resultados</p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
              )}

              {/* Cash input */}
              {paymentMethod === "cash" && (
                <div className="space-y-3">
                  <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-white/20">Monto recibido</p>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 text-lg">$</span>
                    <input
                      type="number"
                      value={amountPaid}
                      onChange={(e) => setAmountPaid(e.target.value)}
                      placeholder="0.00"
                      className="glass-input w-full pl-9 pr-4 py-4 text-2xl font-light text-white placeholder:text-white/10"
                      autoFocus
                    />
                  </div>
                  {amountPaid && parseFloat(amountPaid) >= total && (
                    <div className="rounded-lg bg-white/[0.03] border border-white/[0.06] p-4 text-center">
                      <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-white/20">Cambio</p>
                      <p className="text-2xl font-light text-white mt-1">${change.toFixed(2)}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-white/[0.04] px-8 py-6 flex gap-3">
              <button onClick={() => { setShowPayment(false); setAmountPaid(""); }} className="flex-1 rounded-lg border border-white/[0.06] bg-white/[0.03] py-3 text-sm font-medium text-white/50 transition-all duration-200 hover:bg-white/[0.06] hover:text-white/70">
                Cancelar
              </button>
              <button
                onClick={handleCompleteSale}
                disabled={loading || (paymentMethod === "cash" && (!amountPaid || parseFloat(amountPaid) < total))}
                className="flex-1 rounded-lg bg-white py-3 text-sm font-medium text-neutral-900 transition-all duration-200 hover:bg-white/90 active:scale-[0.98] disabled:opacity-20 disabled:pointer-events-none"
              >
                {loading ? "Procesando..." : "Completar Venta"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error banner */}
      {error && <ErrorBanner message={error} onClose={() => setError(null)} />}

      {/* Close register modal */}
      {showCloseRegister && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setShowCloseRegister(false)}>
          <div className="w-full max-w-sm glass-modal animate-modal flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="px-8 pt-8 pb-2 text-center">
              <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.04] border border-white/[0.06]">
                <svg className="h-6 w-6 text-white/50" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                </svg>
              </div>
              <h2 className="text-base font-medium text-white">Cierre de Caja</h2>
              <p className="mt-1.5 text-xs text-white/25">Ingresa el monto en caja al cierre</p>
            </div>
            <div className="px-8 py-6 space-y-4">
              <div className="space-y-3">
                <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-white/20">Monto final</p>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/25 text-lg">$</span>
                  <input
                    type="number"
                    value={closingAmount}
                    onChange={(e) => setClosingAmount(e.target.value)}
                    placeholder="0.00"
                    className="glass-input w-full pl-9 pr-4 py-3.5 text-lg text-white placeholder:text-white/15"
                    autoFocus
                  />
                </div>
              </div>
            </div>
            <div className="border-t border-white/[0.04] px-8 py-6 flex gap-3">
              <button onClick={() => setShowCloseRegister(false)} className="flex-1 rounded-lg border border-white/[0.06] bg-white/[0.03] py-3 text-sm font-medium text-white/50 transition-all duration-200 hover:bg-white/[0.06] hover:text-white/70">
                Cancelar
              </button>
              <button onClick={handleCloseRegister} className="flex-1 rounded-lg bg-white py-3 text-sm font-medium text-neutral-900 transition-all duration-200 hover:bg-white/90 active:scale-[0.98]">
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sale success modal */}
      {lastSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm glass-modal animate-modal flex flex-col">
            <div className="px-8 pt-8 pb-6 text-center">
              <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-white/[0.04] border border-white/[0.06]">
                <svg className="h-6 w-6 text-emerald-400/80" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </div>
              <h2 className="text-base font-medium text-white">Venta completada</h2>
              <p className="mt-3 text-2xl font-light text-white">${lastSale.total.toFixed(2)}</p>
              <p className="mt-1.5 text-[11px] text-white/25">{lastSale.payment_method === "cash" ? "Efectivo" : "Tarjeta"}</p>
              {lastSale.change_given > 0 && (
                <div className="mt-5 rounded-lg bg-white/[0.03] border border-white/[0.04] p-4">
                  <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-white/20">Cambio</p>
                  <p className="text-xl font-light text-white mt-1">${lastSale.change_given.toFixed(2)}</p>
                </div>
              )}
            </div>
            <div className="border-t border-white/[0.04] px-8 py-6">
              <button onClick={() => setLastSale(null)} className="w-full rounded-lg bg-white py-3 text-sm font-medium text-neutral-900 transition-all duration-200 hover:bg-white/90 active:scale-[0.98]">
                Nueva Venta
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
