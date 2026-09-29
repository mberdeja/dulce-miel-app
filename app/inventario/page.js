"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../lib/auth-context";
import { useRole } from "../../lib/role-context";
import { fetchInventario, actualizarStockMinimo } from "../../lib/inventario";
import { stockMinimoSchema } from "../../lib/validation";
import PageShell from "../../components/PageShell";

export default function InventarioPage() {
  const { user, loading: authLoading, logout } = useAuth();
  const { rol, nombre, activo, loading: roleLoading } = useRole();
  const router = useRouter();

  const [productos, setProductos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState("");
  const [mensaje, setMensaje] = useState("");

  const [tipoFiltro, setTipoFiltro] = useState("");
  const [colorFiltro, setColorFiltro] = useState("");
  const [tallaFiltro, setTallaFiltro] = useState("");
  const [soloBajo, setSoloBajo] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [editValor, setEditValor] = useState("");

  useEffect(() => {
    if (!authLoading && !user) router.replace("/login");
  }, [authLoading, user, router]);

  async function cargar() {
    setCargando(true);
    setErrorCarga("");
    try {
      setProductos(await fetchInventario());
    } catch (err) {
      setErrorCarga("No pudimos cargar el inventario. Revisa Firestore y las reglas.");
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    if (user) cargar();
  }, [user]);

  const tipoOptions = useMemo(() => [...new Set(productos.map((p) => p.tipo))], [productos]);
  const colorOptions = useMemo(() => [...new Set(productos.map((p) => p.color))], [productos]);
  const tallaOptions = useMemo(() => [...new Set(productos.map((p) => p.talla))], [productos]);

  const filtrados = productos.filter(
    (p) =>
      (!tipoFiltro || p.tipo === tipoFiltro) &&
      (!colorFiltro || p.color === colorFiltro) &&
      (!tallaFiltro || p.talla === tallaFiltro) &&
      (!soloBajo || p.stockBajo)
  );

  const totalUnidades = productos.reduce((s, p) => s + (p.stock || 0), 0);
  const totalValor = productos.reduce((s, p) => s + p.valorInventario, 0);
  const bajosCount = productos.filter((p) => p.stockBajo).length;
  const maxStock = Math.max(...productos.map((p) => p.stock || 0), 1);

  function empezarEdicion(p) {
    setEditandoId(p.id);
    setEditValor(String(p.stockMinimo));
  }

  async function guardarMinimo(p) {
    setMensaje("");
    const val = Number(editValor);
    const check = stockMinimoSchema.safeParse(val);
    if (!check.success) {
      setMensaje("Error: " + check.error.issues[0].message);
      return;
    }
    try {
      await actualizarStockMinimo(p.id, val);
      setEditandoId(null);
      await cargar();
    } catch (err) {
      setMensaje("Error al guardar: " + err.message);
    }
  }

  if (authLoading || !user || roleLoading) return null;

  if (!activo || (rol !== "admin" && rol !== "vendedor")) {
    return (
      <div style={{ maxWidth: 380, margin: "60px auto", padding: "0 20px", textAlign: "center" }}>
        <p style={{ color: "var(--coral)", fontWeight: 600 }}>Tu cuenta no tiene un rol asignado (o fue desactivada).</p>
        <button onClick={logout} className="btn-primary" style={{ marginTop: 12 }}>Salir</button>
      </div>
    );
  }

  return (
    <PageShell>
      <h1 style={{ fontSize: 19, color: "var(--wine-deep)", margin: "0 0 18px" }}>Inventario</h1>

      {errorCarga && <div className="card" style={{ borderColor: "var(--coral)", color: "var(--coral)", marginBottom: 14 }}>{errorCarga}</div>}
      {cargando && <div style={{ color: "var(--muted)", fontSize: 13 }}>Cargando…</div>}

      {!cargando && (
        <>
          <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
            <div className="card" style={{ flex: 1 }}>
              <div style={{ fontSize: 10.5, color: "var(--muted)", fontWeight: 700, marginBottom: 4 }}>UNIDADES EN STOCK</div>
              <div style={{ fontSize: 19, fontWeight: 700, color: "var(--wine-deep)" }}>{totalUnidades}</div>
            </div>
            <div className="card" style={{ flex: 1 }}>
              <div style={{ fontSize: 10.5, color: "var(--muted)", fontWeight: 700, marginBottom: 4 }}>VALOR (COSTO)</div>
              <div style={{ fontSize: 19, fontWeight: 700, color: "var(--wine-deep)" }}>Bs {totalValor}</div>
            </div>
          </div>

          {bajosCount > 0 && (
            <button
              onClick={() => setSoloBajo((v) => !v)}
              style={{
                width: "100%", display: "flex", alignItems: "center", gap: 10, textAlign: "left",
                background: "#FBEFEE", border: "1px solid #E3A6A0", borderRadius: 12, padding: "12px 14px",
                marginBottom: 16, cursor: "pointer",
              }}
            >
              <span style={{ fontSize: 12.5, color: "#7A2E29" }}>
                <strong>{bajosCount} producto(s) con stock bajo.</strong> {soloBajo ? "Toca para ver todos" : "Toca para verlos"}
              </span>
            </button>
          )}

          <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
            <select className="field" style={{ flex: 1, fontSize: 12.5, padding: "9px 8px" }} value={tipoFiltro} onChange={(e) => setTipoFiltro(e.target.value)}>
              <option value="">Tipo: todos</option>
              {tipoOptions.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
            <select className="field" style={{ flex: 1, fontSize: 12.5, padding: "9px 8px" }} value={colorFiltro} onChange={(e) => setColorFiltro(e.target.value)}>
              <option value="">Color: todos</option>
              {colorOptions.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
            <select className="field" style={{ flex: 1, fontSize: 12.5, padding: "9px 8px" }} value={tallaFiltro} onChange={(e) => setTallaFiltro(e.target.value)}>
              <option value="">Talla: todas</option>
              {tallaOptions.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {filtrados.map((p) => (
              <div key={p.id} className="card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{p.nombre}</div>
                    <div style={{ fontSize: 11, color: "var(--muted)" }}>{p.sku} · {p.tipo} · {p.color} · Talla {p.talla}</div>
                  </div>
                  {p.stockBajo && (
                    <span style={{ background: "#F8DCDA", color: "#9C4A45", fontSize: 10, fontWeight: 700, padding: "4px 9px", borderRadius: 16 }}>Stock bajo</span>
                  )}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <div style={{ flex: 1, height: 7, borderRadius: 4, background: "#F0E9E3", overflow: "hidden" }}>
                    <div style={{ height: "100%", borderRadius: 4, background: p.stockBajo ? "var(--coral)" : "var(--sage)", width: `${Math.max(6, Math.round(((p.stock || 0) / maxStock) * 100))}%` }} />
                  </div>
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: p.stockBajo ? "var(--coral)" : "var(--sage)", minWidth: 52, textAlign: "right" }}>{p.stock} u.</span>
                </div>
                <div style={{ display: "flex", gap: 16, fontSize: 11.5, color: "var(--muted)", flexWrap: "wrap", alignItems: "center" }}>
                  <div>Costo unit.: <strong style={{ color: "var(--ink)" }}>Bs {p.costoUnitario}</strong></div>
                  <div>Subtotal: <strong style={{ color: "var(--ink)" }}>Bs {p.valorInventario}</strong></div>
                  {rol === "admin" && (
                    editandoId === p.id ? (
                      <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        Mínimo:
                        <input
                          type="number" value={editValor} onChange={(e) => setEditValor(e.target.value)}
                          style={{ width: 50, padding: "3px 6px", border: "1.5px solid var(--wine)", borderRadius: 6 }}
                        />
                        <button onClick={() => guardarMinimo(p)} style={{ border: "none", background: "none", color: "var(--wine)", fontWeight: 700, cursor: "pointer" }}>✓</button>
                      </span>
                    ) : (
                      <span onClick={() => empezarEdicion(p)} style={{ cursor: "pointer", textDecoration: "underline dotted" }}>
                        Mínimo: {p.stockMinimo}
                      </span>
                    )
                  )}
                </div>
              </div>
            ))}
            {filtrados.length === 0 && <div style={{ fontSize: 12.5, color: "var(--muted)", textAlign: "center", padding: "24px 0" }}>Sin productos con esos filtros.</div>}
          </div>
        </>
      )}

      {mensaje && <div style={{ marginTop: 14, fontSize: 13, color: mensaje.startsWith("Error") ? "var(--coral)" : "var(--sage)" }}>{mensaje}</div>}
    </PageShell>
  );
}
