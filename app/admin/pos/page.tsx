"use client";

import { useState, useEffect, useCallback } from "react";

interface Product { id: number; name: string; brand_name: string | null; price: number; stock_sales: number; category_name: string; product_type: string; }
interface Service { id: number; name: string; price: number; category_name: string; }
interface CartItem { id: string; name: string; unit_price: number; quantity: number; product_id?: number; service_id?: number; }
interface CashRegister { id: number; opening_amount: number; status: string; opened_at: string; }
interface Client { id: number; name: string; phone: string | null; }

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

  const loadData = useCallback(async () => {
    const [prodRes, servRes, regRes, cliRes] = await Promise.all([
      fetch("/api/products?active=1"),
      fetch("/api/services"),
      fetch("/api/cash-register"),
      fetch("/api/clients"),
    ]);
    setProducts(await prodRes.json());
    setServices(await servRes.json());
    setClients(await cliRes.json());
    const registers = await regRes.json();
    const openReg = registers.find((r: CashRegister) => r.status === "open");
    if (openReg) setRegister(openReg); else setShowOpenRegister(true);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const total = cart.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);
  const change = paymentMethod === "cash" && amountPaid ? Math.max(0, parseFloat(amountPaid) - total) : 0;

  const addToCart = (item: { name: string; price: number; product_id?: number; service_id?: number }) => {
    const id = item.product_id ? `p-${item.product_id}` : `s-${item.service_id}`;
    setCart(prev => {
      const existing = prev.find(c => c.id === id);
      if (existing) return prev.map(c => c.id === id ? { ...c, quantity: c.quantity + 1 } : c);
      return [...prev, { id, name: item.name, unit_price: item.price, quantity: 1, product_id: item.product_id, service_id: item.service_id }];
    });
  };

  const updateQty = (id: string, delta: number) => {
    setCart(prev => prev.map(c => c.id === id ? { ...c, quantity: Math.max(0, c.quantity + delta) } : c).filter(c => c.quantity > 0));
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
      setShowOpenRegister(false);
    }
  };

  const handleCloseRegister = async () => {
    if (!register) return;
    const closingAmount = prompt("Ingresa el monto de cierre de caja:");
    if (closingAmount === null) return;
    await fetch("/api/cash-register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "close", id: register.id, closing_amount: parseFloat(closingAmount) || 0 }),
    });
    setRegister(null);
    setShowOpenRegister(true);
    setCart([]);
  };

  const handleCompleteSale = async () => {
    if (cart.length === 0) return;
    if (paymentMethod === "cash" && (!amountPaid || parseFloat(amountPaid) < total)) return;
    setLoading(true);

    try {
      const res = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cart.map(c => ({ name: c.name, product_id: c.product_id, service_id: c.service_id, quantity: c.quantity, unit_price: c.unit_price })),
          payment_method: paymentMethod,
          amount_paid: paymentMethod === "cash" ? parseFloat(amountPaid) : total,
          client_id: selectedClient?.id || null,
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
      <div className="flex h-full items-center justify-center p-6">
        <div className="w-full max-w-sm glass-modal animate-modal flex flex-col">
          {/* Header */}
          <div className="px-7 pt-7 pb-2 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500/20 to-primary-400/20">
              <svg className="h-8 w-8 text-primary-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-white">Apertura de Caja</h2>
            <p className="mt-1 text-xs text-white/30">Ingresa el monto inicial (caja chica)</p>
          </div>

          {/* Content */}
          <div className="px-7 py-5 space-y-4">
            <div className="space-y-3.5">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-white/25">Monto inicial</p>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30">$</span>
                <input
                  type="number"
                  value={openingAmount}
                  onChange={(e) => setOpeningAmount(e.target.value)}
                  placeholder="0.00"
                  className="glass-input w-full pl-8 pr-4 py-3 text-lg text-white placeholder:text-white/20"
                  autoFocus
                />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-white/[0.06] px-7 py-5">
            <button onClick={handleOpenRegister} className="w-full btn-primary py-3.5 text-sm">
              Abrir Caja
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col lg:flex-row">
      {/* Left: Product/Service Grid */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <div className="flex items-center gap-3 border-b border-white/[0.06] p-4">
          {/* Tabs */}
          <div className="flex gap-1 rounded-xl bg-white/[0.04] p-1">
            <button onClick={() => setTab("products")} className={`rounded-lg px-4 py-1.5 text-xs font-medium transition-all ${tab === "products" ? "bg-white/[0.1] text-white" : "text-white/40"}`}>
              Productos
            </button>
            <button onClick={() => setTab("services")} className={`rounded-lg px-4 py-1.5 text-xs font-medium transition-all ${tab === "services" ? "bg-white/[0.1] text-white" : "text-white/40"}`}>
              Servicios
            </button>
          </div>
          {/* Search */}
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/20" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar..."
              className="w-full rounded-xl glass-input py-2 pl-10 pr-4 text-sm placeholder:text-white/20"
            />
          </div>
          {/* Close register */}
          <button onClick={handleCloseRegister} className="rounded-xl border border-red-500/20 bg-red-500/8 px-4 py-2 text-xs font-medium text-red-400 transition-all hover:bg-red-500/15">
            Cerrar Caja
          </button>
        </div>

        {/* Items Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {filtered.map((item: Product | Service) => (
              <button
                key={`${tab}-${item.id}`}
                onClick={() => addToCart({
                  name: item.name,
                  price: item.price,
                  product_id: tab === "products" ? item.id : undefined,
                  service_id: tab === "services" ? item.id : undefined,
                })}
                className="group flex flex-col items-start glass-card p-4 text-left active:scale-[0.97]"
              >
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500/20 to-charcoal-500/20">
                  <span className="text-lg">{tab === "products" ? "📦" : "✨"}</span>
                </div>
                <p className="text-sm font-medium text-white/80 line-clamp-2">{item.name}</p>
                {"brand_name" in item && (item as Product).brand_name && <p className="mt-0.5 text-[10px] text-white/30">{(item as Product).brand_name}</p>}
                <p className="mt-auto pt-2 text-base font-semibold text-white">${item.price.toFixed(2)}</p>
                {"stock_sales" in item && <p className="text-[10px] text-white/20">Stock: {item.stock_sales}</p>}
              </button>
            ))}
            {filtered.length === 0 && (
              <div className="col-span-full flex h-40 items-center justify-center text-sm text-white/20">
                {search ? "Sin resultados" : `No hay ${tab === "products" ? "productos" : "servicios"} registrados`}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right: Cart */}
      <div className="flex w-full flex-col border-l border-white/[0.05] bg-white/[0.02] lg:w-96">
        {/* Cart header */}
        <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
          <h2 className="text-sm font-semibold text-white">Carrito</h2>
          <span className="rounded-full bg-white/[0.06] px-2.5 py-0.5 text-xs text-white/40">{cart.length} items</span>
        </div>

        {/* Register info */}
        {register && (
          <div className="mx-4 mt-3 rounded-xl bg-primary-500/10 border border-primary-500/20 px-4 py-2.5">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-primary-400 animate-pulse" />
              <span className="text-xs text-primary-400 font-medium">Caja Abierta</span>
            </div>
            <p className="mt-0.5 text-[10px] text-primary-400/60">Apertura: ${register.opening_amount.toFixed(2)}</p>
          </div>
        )}

        {/* Cart items */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {cart.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-white/15">
              Agrega productos o servicios
            </div>
          ) : (
            cart.map((item) => (
              <div key={item.id} className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium text-white/80 flex-1">{item.name}</p>
                  <button onClick={() => removeItem(item.id)} className="text-white/20 hover:text-red-400 transition-colors">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button onClick={() => updateQty(item.id, -1)} className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/[0.06] text-white/40 hover:bg-white/[0.1]">−</button>
                    <span className="w-8 text-center text-sm font-medium text-white">{item.quantity}</span>
                    <button onClick={() => updateQty(item.id, 1)} className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/[0.06] text-white/40 hover:bg-white/[0.1]">+</button>
                  </div>
                  <p className="text-sm font-semibold text-white">${(item.unit_price * item.quantity).toFixed(2)}</p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Total + Pay */}
        <div className="border-t border-white/[0.06] p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-white/40">Total</span>
            <span className="text-2xl font-bold text-white">${total.toFixed(2)}</span>
          </div>
          <button
            onClick={() => { if (cart.length > 0) setShowPayment(true); }}
            disabled={cart.length === 0}
            className="w-full btn-primary py-3.5 text-sm"
          >
            Cobrar
          </button>
        </div>
      </div>

      {/* Payment Modal */}
      {showPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-md p-4" onClick={() => { setShowPayment(false); setAmountPaid(""); }}>
          <div className="w-full max-w-md glass-modal animate-modal flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between px-7 pt-7 pb-4">
              <div>
                <h2 className="text-lg font-semibold text-white">Cobrar Venta</h2>
                <p className="mt-0.5 text-xs text-white/30">Selecciona el método de pago</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-white/25">Total</p>
                <p className="text-2xl font-bold text-white">${total.toFixed(2)}</p>
              </div>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto px-7 pb-2 space-y-5">
              {/* Payment method */}
              <div className="space-y-3.5">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-white/25">Método de pago</p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setPaymentMethod("cash")}
                    className={`flex-1 rounded-xl border p-4 text-center transition-all ${paymentMethod === "cash" ? "border-primary-500/30 bg-primary-500/10" : "border-white/[0.06] bg-white/[0.03] hover:bg-white/[0.05]"}`}
                  >
                    <span className="text-2xl">💵</span>
                    <p className={`mt-2 text-xs font-medium ${paymentMethod === "cash" ? "text-primary-400" : "text-white/40"}`}>Efectivo</p>
                  </button>
                  <button
                    onClick={() => setPaymentMethod("card")}
                    className={`flex-1 rounded-xl border p-4 text-center transition-all ${paymentMethod === "card" ? "border-accent-500/30 bg-accent-500/10" : "border-white/[0.06] bg-white/[0.03] hover:bg-white/[0.05]"}`}
                  >
                    <span className="text-2xl">💳</span>
                    <p className={`mt-2 text-xs font-medium ${paymentMethod === "card" ? "text-accent-400" : "text-white/40"}`}>Tarjeta</p>
                  </button>
                </div>
              </div>

              {/* Client selector */}
              <div className="space-y-3.5">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-white/25">Cliente (opcional)</p>
                {selectedClient ? (
                  <div className="flex items-center justify-between rounded-xl border border-primary-500/20 bg-primary-500/[0.06] px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-white">{selectedClient.name}</p>
                      {selectedClient.phone && <p className="text-xs text-white/40">{selectedClient.phone}</p>}
                    </div>
                    <button onClick={() => { setSelectedClient(null); setClientSearch(""); }} className="text-white/30 hover:text-white/60">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/20" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>
                    <input
                      type="text"
                      value={clientSearch}
                      onChange={(e) => setClientSearch(e.target.value)}
                      placeholder="Buscar cliente..."
                      className="glass-input w-full pl-10 pr-4 py-2.5 text-sm"
                    />
                    {clientSearch.length >= 2 && (
                      <div className="absolute z-10 mt-1 max-h-40 w-full overflow-y-auto rounded-xl border border-white/[0.08] bg-neutral-900/95 backdrop-blur-xl shadow-lg">
                        {clients.filter(c => c.name.toLowerCase().includes(clientSearch.toLowerCase()) || c.phone?.toLowerCase().includes(clientSearch.toLowerCase())).map(c => (
                          <button key={c.id} onClick={() => { setSelectedClient(c); setClientSearch(""); }}
                            className="w-full px-4 py-2.5 text-left text-sm text-white/70 hover:bg-white/[0.06] transition">
                            <span className="font-medium text-white/90">{c.name}</span>
                            {c.phone && <span className="ml-2 text-xs text-white/30">{c.phone}</span>}
                          </button>
                        ))}
                        {clients.filter(c => c.name.toLowerCase().includes(clientSearch.toLowerCase()) || c.phone?.toLowerCase().includes(clientSearch.toLowerCase())).length === 0 && (
                          <p className="px-4 py-3 text-xs text-white/20">Sin resultados</p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Cash input */}
              {paymentMethod === "cash" && (
                <div className="space-y-3.5">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-white/25">Monto recibido</p>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 text-lg">$</span>
                    <input
                      type="number"
                      value={amountPaid}
                      onChange={(e) => setAmountPaid(e.target.value)}
                      placeholder="0.00"
                      className="glass-input w-full pl-9 pr-4 py-4 text-2xl font-bold text-white placeholder:text-white/15"
                      autoFocus
                    />
                  </div>
                  {amountPaid && parseFloat(amountPaid) >= total && (
                    <div className="rounded-xl bg-primary-500/10 border border-primary-500/20 p-4 text-center">
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-primary-400/60">Cambio</p>
                      <p className="text-3xl font-bold text-primary-400">${change.toFixed(2)}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-white/[0.06] px-7 py-5 flex gap-3">
              <button onClick={() => { setShowPayment(false); setAmountPaid(""); }} className="flex-1 btn-secondary py-3 text-sm">
                Cancelar
              </button>
              <button
                onClick={handleCompleteSale}
                disabled={loading || (paymentMethod === "cash" && (!amountPaid || parseFloat(amountPaid) < total))}
                className="flex-1 btn-primary py-3 text-sm"
              >
                {loading ? "Procesando..." : "Completar Venta"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sale success modal */}
      {lastSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-md p-4">
          <div className="w-full max-w-sm glass-modal animate-modal flex flex-col">
            <div className="px-7 pt-7 pb-5 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary-500/15">
                <svg className="h-8 w-8 text-primary-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-white">¡Venta Completada!</h2>
              <p className="mt-2 text-2xl font-bold text-white">${lastSale.total.toFixed(2)}</p>
              <p className="mt-1 text-xs text-white/30">{lastSale.payment_method === "cash" ? "Efectivo" : "Tarjeta"}</p>
              {lastSale.change_given > 0 && (
                <div className="mt-4 rounded-xl bg-primary-500/10 border border-primary-500/20 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-primary-400/60">Cambio</p>
                  <p className="text-xl font-bold text-primary-400">${lastSale.change_given.toFixed(2)}</p>
                </div>
              )}
            </div>
            <div className="border-t border-white/[0.06] px-7 py-5">
              <button onClick={() => setLastSale(null)} className="w-full btn-primary py-3 text-sm">
                Nueva Venta
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
