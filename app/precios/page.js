"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../lib/auth-context";
import { useRole } from "../../lib/role-context";
import {
  fetchListaPrecios, actualizarPrecioVigente, actualizarMargen,
  fetchPromociones, crearPromocion, actualizarPromocion,
} from "../../lib/precios";
import { precioSchema, margenSchema, promocionSchema } from "../../lib/validation";
import PageShell from "../../components/PageShell";

export default function PreciosPage() {
  const { user, loading: authLoading, logout } = useAuth();
  const { rol, nombre, activo, loading: roleLoading } = useRole();
  const router = useRouter();

  const [tab, setTab] = useState("productos");
  const [productos, setProductos] = useState([]);
  const [promos, setPromos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [mensaje, setMensaje] = useState("");

  const [tipoFiltro, setTipoFiltro] = useState("");
  const [colorFiltro, setColorFiltro] = useState("");
  const [tallaFiltro, setTallaFiltro] = useState("");

  const [editandoPrecioId, setEditandoPrecioId] = useState(null);
  const [precioValor, setPrecioValor] = useState("");
  const [editandoMargenId, setEditandoMargenId] = useState(null);
  const [margenValor, setMargenValor] = useState("");

  const [nuevaPromo, setNuevaPromo] = useState({ nombre: "", aplicaANombre: "", cantidadMinima: "", precioTotalPromo: "" });
  const [mostrarForm, setMostrarForm] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) router.replace("/login");
  }, [authLoading, user, router]);

  async function cargar() {
    setCargando(true);
    try {
      const [p, pr] = await Promise.all([fetchListaPrecios(), fetchPromociones()]);
      setProductos(p);
      setPromos(pr);
    } catch (err) {
      setMensaje("Error al cargar: " + err.message);
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => { if (user) cargar(); }, [user]);

  const tipoOptions = useMemo(() => [...new Set(productos.map((p) => p.tipo))], [productos]);
  const colorOptions = useMemo(() => [...new Set(productos.map((p) => p.color))], [productos]);
  const tallaOptions = useMemo(() => [...new Set(productos.map((p) => p.talla))], [productos]);

  const filtrados = productos.filter(
    (p) => (!tipoFiltro || p.tipo === tipoFiltro) && (!colorFiltro || p.color === colorFiltro) && (!tallaFiltro || p.talla === tallaFiltro)
  );

  async function guardarPrecio(p) {
    setMensaje("");
    const val = Number(precioValor);
    const check = precioSchema.safeParse(val);
    if (!check.success) { setMensaje("Error: " + check.error.issues[0].message); return; }
    try {
      await actualizarPrecioVigente(p.id, val);
      setEditandoPrecioId(null);
      await cargar();
    } catch (err) { setMensaje("Error al guardar: " + err.message); }
  }

  async function guardarMargen(p) {
    setMensaje("");
    const val = Number(margenValor) / 100; // el input es en % (ej. 100), se guarda como fracción (1.0)
    const check = margenSchema.safeParse(val);
    if (!check.success) { setMensaje("Error: " + check.error.issues[0].message); return; }
    try {
      await actualizarMargen(p.id, val);
      setEditandoMargenId(null);
      await cargar();
    } catch (err) { setMensaje("Error al guardar: " + err.message); }
  }

  async function onCrearPromo() {
    setMensaje("");
    const data = {
      nombre: nuevaPromo.nombre,
      aplicaANombre: nuevaPromo.aplicaANombre,
      cantidadMinima: Number(nuevaPromo.cantidadMinima),
      precioTotalPromo: Number(nuevaPromo.precioTotalPromo),
    };
    const check = promocionSchema.safeParse(data);
    if (!check.success) { setMensaje("Error: " + check.error.issues[0].message); return; }
    try {
      await crearPromocion(data);
      setNuevaPromo({ nombre: "", aplicaANombre: "", cantidadMinima: "", precioTotalPromo: "" });
      setMostrarForm(false);
      await cargar();
    } catch (err) { setMensaje("Error al crear: " + err.message); }
  }

  async function toggleActiva(promo) {
    try {
      await actualizarPromocion(promo.id, { activa: !promo.activa });
      await cargar();
    } catch (err) { setMensaje("Error: " + err.message); }
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

  const esAdmin = rol === "admin";

  return (
    <PageShell>
      <h1 style={{ fontSize: 19, color: "var(--wine-deep)", margin: "0 0 18px" }}>Lista de Precios</h1>

      {!esAdmin && (
        <div className="card" style={{ marginBottom: 16, fontSize: 12.5, color: "var(--muted)" }}>
          Podés ver los precios y promociones, pero solo un Admin puede editarlos.
        </div>
      )}

      <div style={{ display: "flex", gap: 6, background: "#F4EFEA", borderRadius: 12, padding: 4, marginBottom: 16 }}>
        <button onClick={() => setTab("productos")} style={{ flex: 1, padding: 9, borderRadius: 10, border: "none", fontWeight: 700, fontSize: 13, cursor: "pointer", background: tab === "productos" ? "var(--wine)" : "transparent", color: tab === "productos" ? "#fff" : "var(--muted)" }}>Productos</button>
        <button onClick={() => setTab("promos")} style={{ flex: 1, padding: 9, borderRadius: 10, border: "none", fontWeight: 700, fontSize: 13, cursor: "pointer", background: tab === "promos" ? "var(--wine)" : "transparent", color: tab === "promos" ? "#fff" : "var(--muted)" }}>Promociones</button>
      </div>

      {cargando && <div style={{ color: "var(--muted)", fontSize: 13 }}>Cargando…</div>}

      {!cargando && tab === "productos" && (
        <>
          <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
            <select className="field" style={{ flex: 1, fontSize: 12.5, padding: "9px 8px" }} value={tipoFiltro} onChange={(e) => setTipoFiltro(e.target.value)}>
              <option value="">Tipo: todos</option>{tipoOptions.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
            <select className="field" style={{ flex: 1, fontSize: 12.5, padding: "9px 8px" }} value={colorFiltro} onChange={(e) => setColorFiltro(e.target.value)}>
              <option value="">Color: todos</option>{colorOptions.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
            <select className="field" style={{ flex: 1, fontSize: 12.5, padding: "9px 8px" }} value={tallaFiltro} onChange={(e) => setTallaFiltro(e.target.value)}>
              <option value="">Talla: todas</option>{tallaOptions.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {filtrados.map((p) => (
              <div key={p.id} className="card">
                <div style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{p.nombre}</div>
                  <div style={{ fontSize: 11, color: "var(--muted)" }}>{p.sku} · {p.tipo} · {p.color} · Talla {p.talla}</div>
                </div>
                <div style={{ display: "flex", gap: 14, fontSize: 11.5, color: "var(--muted)", marginBottom: 10, flexWrap: "wrap" }}>
                  <div>Compra máx: <strong style={{ color: "var(--ink)" }}>Bs {p.costoUnitario}</strong></div>
                  {esAdmin && editandoMargenId === p.id ? (
                    <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      Margen: <input type="number" value={margenValor} onChange={(e) => setMargenValor(e.target.value)} style={{ width: 44, padding: "2px 5px", border: "1.5px solid var(--wine)", borderRadius: 6 }} />%
                      <button onClick={() => guardarMargen(p)} style={{ border: "none", background: "none", color: "var(--wine)", fontWeight: 700, cursor: "pointer" }}>✓</button>
                    </span>
                  ) : (
                    <span onClick={() => esAdmin && (setEditandoMargenId(p.id), setMargenValor(String(Math.round(p.margenPct * 100))))} style={{ cursor: esAdmin ? "pointer" : "default", textDecoration: esAdmin ? "underline dotted" : "none" }}>
                      Margen: <strong style={{ color: "var(--ink)" }}>{Math.round(p.margenPct * 100)}%</strong>
                    </span>
                  )}
                  <div>Sugerido: <strong style={{ color: "var(--ink)" }}>Bs {p.precioSugerido}</strong></div>
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--cream)", borderRadius: 10, padding: "9px 12px" }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "var(--wine)" }}>Precio vigente</span>
                  {esAdmin && editandoPrecioId === p.id ? (
                    <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <input type="number" value={precioValor} onChange={(e) => setPrecioValor(e.target.value)} style={{ width: 66, padding: "5px 7px", border: "1.5px solid var(--wine)", borderRadius: 8 }} />
                      <button onClick={() => guardarPrecio(p)} style={{ border: "none", background: "none", color: "var(--wine)", fontWeight: 700, cursor: "pointer" }}>✓</button>
                    </span>
                  ) : (
                    <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <strong style={{ color: "var(--wine-deep)" }}>Bs {p.precioVigente}</strong>
                      {esAdmin && <button onClick={() => { setEditandoPrecioId(p.id); setPrecioValor(String(p.precioVigente)); }} style={{ border: "none", background: "none", color: "var(--wine)", cursor: "pointer" }}>✎</button>}
                    </span>
                  )}
                </div>
              </div>
            ))}
            {filtrados.length === 0 && <div style={{ fontSize: 12.5, color: "var(--muted)", textAlign: "center", padding: "24px 0" }}>Sin productos con esos filtros.</div>}
          </div>
        </>
      )}

      {!cargando && tab === "promos" && (
        <>
          {esAdmin && (
            <button className="btn-primary" style={{ width: "100%", marginBottom: 16 }} onClick={() => setMostrarForm((v) => !v)}>
              {mostrarForm ? "− Cancelar" : "+ Nueva promoción"}
            </button>
          )}

          {mostrarForm && (
            <div className="card" style={{ marginBottom: 16, display: "flex", flexDirection: "column", gap: 10 }}>
              <input className="field" placeholder="Nombre (ej. 3x100 Bs Básicas)" value={nuevaPromo.nombre} onChange={(e) => setNuevaPromo({ ...nuevaPromo, nombre: e.target.value })} />
              <input className="field" placeholder="Aplica a (Nombre de producto exacto)" value={nuevaPromo.aplicaANombre} onChange={(e) => setNuevaPromo({ ...nuevaPromo, aplicaANombre: e.target.value })} />
              <div style={{ display: "flex", gap: 10 }}>
                <input className="field" type="number" placeholder="Cantidad mínima" value={nuevaPromo.cantidadMinima} onChange={(e) => setNuevaPromo({ ...nuevaPromo, cantidadMinima: e.target.value })} />
                <input className="field" type="number" placeholder="Precio total (Bs)" value={nuevaPromo.precioTotalPromo} onChange={(e) => setNuevaPromo({ ...nuevaPromo, precioTotalPromo: e.target.value })} />
              </div>
              <button className="btn-primary" onClick={onCrearPromo}>Guardar promoción</button>
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {promos.map((pr) => (
              <div key={pr.id} className="card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{pr.nombre}</div>
                  <button
                    onClick={() => esAdmin && toggleActiva(pr)}
                    disabled={!esAdmin}
                    style={{ background: pr.activa ? "#E7F0E4" : "#F4F0EC", color: pr.activa ? "#3f6b38" : "var(--muted)", border: "none", borderRadius: 20, padding: "4px 10px", fontSize: 10.5, fontWeight: 700, cursor: esAdmin ? "pointer" : "default" }}
                  >
                    {pr.activa ? "Activa" : "Inactiva"}
                  </button>
                </div>
                <div style={{ fontSize: 12, color: "var(--muted)", margin: "6px 0 4px" }}>
                  {pr.aplicaANombre} · {pr.cantidadMinima} unidades
                </div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "var(--wine-deep)" }}>Bs {pr.precioTotalPromo}</div>
              </div>
            ))}
            {promos.length === 0 && <div style={{ fontSize: 12.5, color: "var(--muted)", textAlign: "center", padding: "24px 0" }}>No hay promociones todavía.</div>}
          </div>
        </>
      )}

      {mensaje && <div style={{ marginTop: 14, fontSize: 13, color: mensaje.startsWith("Error") ? "var(--coral)" : "var(--sage)" }}>{mensaje}</div>}
    </PageShell>
  );
}
