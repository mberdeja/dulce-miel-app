"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../lib/auth-context";
import { useRole } from "../../lib/role-context";
import {
  fetchProductosEnStock,
  fetchPromocionesActivas,
  registrarVenta,
} from "../../lib/ventas";
import { calcularPromosAplicables } from "../../lib/promos";
import { validarFormularioVenta } from "../../lib/validation";
import PageShell from "../../components/PageShell";

export default function VentasPage() {
  const { user, loading: authLoading, logout } = useAuth();
  const { rol, nombre, activo, loading: roleLoading } = useRole();
  const router = useRouter();

  const [productos, setProductos] = useState([]);
  const [promociones, setPromociones] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState("");

  const [search, setSearch] = useState("");
  const [filterTipo, setFilterTipo] = useState("");
  const [filterColor, setFilterColor] = useState("");
  const [filterTalla, setFilterTalla] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [qty, setQty] = useState(1);

  const [items, setItems] = useState([]);
  const [payment, setPayment] = useState("");
  const [delivery, setDelivery] = useState("");
  const [customer, setCustomer] = useState("");

  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState("");

  // Protege la ruta: sin sesión, vuelve al login
  useEffect(() => {
    if (!authLoading && !user) router.replace("/login");
  }, [authLoading, user, router]);

  // Carga inicial de productos con stock y promociones activas
  useEffect(() => {
    if (!user) return;
    (async () => {
      setCargando(true);
      setErrorCarga("");
      try {
        const [prods, promos] = await Promise.all([
          fetchProductosEnStock(),
          fetchPromocionesActivas(),
        ]);
        setProductos(prods);
        setPromociones(promos);
      } catch (err) {
        setErrorCarga(
          "No pudimos cargar los productos. Revisa la conexión con Firestore y las reglas de seguridad."
        );
      } finally {
        setCargando(false);
      }
    })();
  }, [user]);

  const tipoOptions = useMemo(() => [...new Set(productos.map((p) => p.tipo))], [productos]);
  const colorOptions = useMemo(() => [...new Set(productos.map((p) => p.color))], [productos]);
  const tallaOptions = useMemo(() => [...new Set(productos.map((p) => p.talla))], [productos]);

  const resultados = useMemo(() => {
    return productos.filter(
      (p) =>
        (!filterTipo || p.tipo === filterTipo) &&
        (!filterColor || p.color === filterColor) &&
        (!filterTalla || p.talla === filterTalla) &&
        (!search || p.nombre.toLowerCase().includes(search.toLowerCase()))
    );
  }, [productos, search, filterTipo, filterColor, filterTalla]);

  const selected = productos.find((p) => p.id === selectedId) || null;
  const lineSubtotal = selected ? selected.precioVenta * qty : 0;
  const cannotAdd = !(selected && qty > 0 && qty <= selected.stock);

  function addItem() {
    if (!selected) return;
    setItems((prev) => [
      ...prev,
      {
        productoId: selected.id,
        sku: selected.sku,
        nombre: selected.nombre,
        tipo: selected.tipo,
        color: selected.color,
        talla: selected.talla,
        precio: selected.precioVenta,
        cantidad: qty,
        subtotal: selected.precioVenta * qty,
      },
    ]);
    setSelectedId(null);
    setQty(1);
    setSearch("");
  }

  function removeItem(idx) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }

  // Aplica automáticamente cualquier promo activa que el carrito ya cumpla
  const promosAplicables = calcularPromosAplicables(items, promociones);
  const itemsConTotal = items.map((it) => {
    const aplicable = promosAplicables[it.nombre];
    return { ...it, promoAplicada: aplicable ? aplicable.promo : null };
  });

  const grandTotal = useMemo(() => {
    let total = 0;
    const yaContado = {};
    itemsConTotal.forEach((it) => {
      if (it.promoAplicada) {
        // El precio de la promo se reparte una sola vez por grupo de nombre
        if (!yaContado[it.nombre]) {
          const grupo = itemsConTotal.filter((x) => x.nombre === it.nombre);
          const cantidadGrupo = grupo.reduce((s, x) => s + x.cantidad, 0);
          const sets = Math.floor(cantidadGrupo / it.promoAplicada.cantidadMinima);
          const resto = cantidadGrupo - sets * it.promoAplicada.cantidadMinima;
          total += sets * it.promoAplicada.precioTotalPromo + resto * it.precio;
          yaContado[it.nombre] = true;
        }
      } else {
        total += it.subtotal;
      }
    });
    return total;
  }, [itemsConTotal]);

  async function onRegistrar() {
    setMensaje("");

    const check = validarFormularioVenta({ items, medioPago: payment, tipoEntrega: delivery, cliente: customer });
    if (!check.ok) {
      setMensaje("Error: " + check.error);
      return;
    }

    setGuardando(true);
    try {
      const estadoInicial =
        delivery === "Envío a domicilio" ? "Pendiente de envío" : "Por recoger";

      // Arma las líneas finales con el reparto de promo ya calculado
      const lineasFinales = itemsConTotal.map((it) => {
        let totalLinea = it.subtotal;
        let descuento = 0;
        if (it.promoAplicada) {
          const grupo = itemsConTotal.filter((x) => x.nombre === it.nombre);
          const cantidadGrupo = grupo.reduce((s, x) => s + x.cantidad, 0);
          const sets = Math.floor(cantidadGrupo / it.promoAplicada.cantidadMinima);
          const totalGrupoConPromo =
            sets * it.promoAplicada.precioTotalPromo +
            (cantidadGrupo - sets * it.promoAplicada.cantidadMinima) * it.precio;
          const proporcion = it.subtotal / grupo.reduce((s, x) => s + x.subtotal, 0);
          totalLinea = Math.round(totalGrupoConPromo * proporcion);
          descuento = it.subtotal - totalLinea;
        }
        return {
          ...it,
          idPromo: it.promoAplicada ? it.promoAplicada.id : null,
          descuentoPromo: descuento,
          total: totalLinea,
        };
      });

      await registrarVenta(lineasFinales, {
        medioPago: payment,
        cliente: customer,
        tipoEntrega: delivery,
        estadoInicial,
        vendedorUid: user.uid,
        vendedorNombre: user.email,
      });

      setMensaje("¡Venta registrada!");
      setItems([]);
      setPayment("");
      setDelivery("");
      setCustomer("");
      // refresca stock local
      const prods = await fetchProductosEnStock();
      setProductos(prods);
    } catch (err) {
      setMensaje("Error al registrar: " + err.message);
    } finally {
      setGuardando(false);
    }
  }

  if (authLoading || !user || roleLoading) return null;

  if (!activo || (rol !== "admin" && rol !== "vendedor")) {
    return (
      <div style={{ maxWidth: 380, margin: "60px auto", padding: "0 20px", textAlign: "center" }}>
        <p style={{ color: "var(--coral)", fontWeight: 600 }}>
          Tu cuenta todavía no tiene un rol asignado (o fue desactivada).
        </p>
        <p style={{ color: "var(--muted)", fontSize: 13 }}>
          Pedile a un Admin que te dé de alta en la colección "usuarios" con un
          rol ("admin" o "vendedor") y activo: true.
        </p>
        <button onClick={logout} className="btn-primary" style={{ marginTop: 12 }}>
          Salir
        </button>
      </div>
    );
  }

  return (
    <PageShell>
      <h1 style={{ fontSize: 19, color: "var(--wine-deep)", margin: "0 0 18px" }}>Nueva venta</h1>

      {errorCarga && <div className="card" style={{ borderColor: "var(--coral)", color: "var(--coral)", marginBottom: 14 }}>{errorCarga}</div>}
      {cargando && <div style={{ color: "var(--muted)", fontSize: 13 }}>Cargando productos…</div>}

      {!cargando && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 700, color: "var(--wine)", marginBottom: 10 }}>Agregar producto</div>

          <input
            className="field"
            placeholder="Buscar por nombre…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ marginBottom: 10 }}
          />

          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <select className="field" value={filterTipo} onChange={(e) => setFilterTipo(e.target.value)}>
              <option value="">Tipo: todos</option>
              {tipoOptions.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
            <select className="field" value={filterColor} onChange={(e) => setFilterColor(e.target.value)}>
              <option value="">Color: todos</option>
              {colorOptions.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
            <select className="field" value={filterTalla} onChange={(e) => setFilterTalla(e.target.value)}>
              <option value="">Talla: todas</option>
              {tallaOptions.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>

          <div style={{ maxHeight: 220, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6, marginBottom: 10 }}>
            {resultados.map((p) => (
              <div
                key={p.id}
                onClick={() => { setSelectedId(p.id); setQty(1); }}
                style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "10px 11px", border: `1.5px solid ${selectedId === p.id ? "var(--wine)" : "var(--border)"}`,
                  background: selectedId === p.id ? "var(--pink-soft)" : "#fff",
                  borderRadius: 11, cursor: "pointer",
                }}
              >
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{p.nombre} — {p.color}</div>
                  <div style={{ fontSize: 11, color: "var(--muted)" }}>Talla {p.talla} · {p.sku}</div>
                </div>
                <span style={{ background: "#E7F0E4", color: "#3f6b38", fontSize: 10.5, fontWeight: 700, padding: "4px 9px", borderRadius: 14 }}>
                  {p.stock} disp.
                </span>
              </div>
            ))}
            {resultados.length === 0 && (
              <div style={{ fontSize: 12, color: "var(--muted)" }}>Sin resultados con stock disponible.</div>
            )}
          </div>

          {selected && (
            <div style={{ borderTop: "1px solid var(--border)", paddingTop: 14 }}>
              <div style={{ display: "flex", gap: 12, alignItems: "flex-end", marginBottom: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600 }}>Precio</label>
                  <div className="field" style={{ background: "#F8F5F2", color: "var(--muted)" }}>Bs {selected.precioVenta}</div>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600 }}>Cantidad</label>
                  <div style={{ display: "flex", alignItems: "center", border: "1.5px solid var(--border)", borderRadius: 12 }}>
                    <button onClick={() => setQty((q) => Math.max(1, q - 1))} style={{ border: "none", background: "none", padding: "10px 12px", cursor: "pointer" }}>−</button>
                    <span style={{ flex: 1, textAlign: "center", fontWeight: 700 }}>{qty}</span>
                    <button onClick={() => setQty((q) => Math.min(selected.stock, q + 1))} style={{ border: "none", background: "none", padding: "10px 12px", cursor: "pointer" }}>+</button>
                  </div>
                </div>
              </div>
              <div style={{ fontSize: 11.5, color: "var(--muted)", marginBottom: 12 }}>Subtotal Bs {lineSubtotal}</div>
              <button className="btn-primary" style={{ width: "100%" }} disabled={cannotAdd} onClick={addItem}>
                + Agregar a la venta
              </button>
            </div>
          )}
        </div>
      )}

      {items.length > 0 && (
        <>
          <div style={{ fontWeight: 700, color: "var(--wine)", marginBottom: 10 }}>Productos en esta venta</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
            {itemsConTotal.map((it, idx) => (
              <div key={idx} className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 600 }}>{it.nombre}{it.promoAplicada ? " · promo" : ""}</div>
                  <div style={{ fontSize: 11.5, color: "var(--muted)" }}>Talla {it.talla} · {it.cantidad} u. × Bs {it.precio}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontWeight: 700 }}>Bs {it.subtotal}</span>
                  <button onClick={() => removeItem(idx)} style={{ border: "none", background: "none", color: "var(--coral)", cursor: "pointer" }}>✕</button>
                </div>
              </div>
            ))}
          </div>

          <label style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600 }}>Medio de pago</label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "6px 0 14px" }}>
            {["Transferencia", "Efectivo", "QR", "Tarjeta"].map((m) => (
              <button key={m} className={"pill" + (payment === m ? " on" : "")} onClick={() => setPayment(m)}>{m}</button>
            ))}
          </div>

          <label style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600 }}>Tipo de entrega</label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "6px 0 14px" }}>
            {["Recoge en tienda", "Envío a domicilio"].map((d) => (
              <button key={d} className={"pill" + (delivery === d ? " on" : "")} onClick={() => setDelivery(d)}>{d}</button>
            ))}
          </div>

          <label style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600 }}>Usuario TikTok (opcional)</label>
          <input className="field" placeholder="@usuaria" value={customer} onChange={(e) => setCustomer(e.target.value)} style={{ marginBottom: 18 }} />

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#fff", border: "1px solid var(--border)", borderRadius: 14, padding: 14 }}>
            <div>
              <div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 600 }}>TOTAL A PAGAR</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: "var(--wine-deep)" }}>Bs {grandTotal}</div>
            </div>
            <button
              className="btn-primary"
              disabled={guardando || !payment || !delivery}
              onClick={onRegistrar}
            >
              {guardando ? "Guardando…" : "Registrar venta"}
            </button>
          </div>
          {mensaje && <div style={{ marginTop: 10, fontSize: 13, color: mensaje.startsWith("Error") ? "var(--coral)" : "var(--sage)" }}>{mensaje}</div>}
        </>
      )}
    </PageShell>
  );
}
