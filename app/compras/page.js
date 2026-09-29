"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../lib/auth-context";
import { useRole } from "../../lib/role-context";
import { fetchProductosTodos, registrarCompra, generarSku } from "../../lib/compras";
import { fetchTipos, agregarTipo, editarTipo, eliminarTipo } from "../../lib/config";
import { validarLineaCompra } from "../../lib/validation";
import PageShell from "../../components/PageShell";

export default function ComprasPage() {
  const { user, loading: authLoading, logout } = useAuth();
  const { rol, nombre, activo, loading: roleLoading } = useRole();
  const router = useRouter();

  const [productos, setProductos] = useState([]);
  const [tipos, setTipos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState("");

  const [tipoFiltro, setTipoFiltro] = useState("");
  const [mostrarNuevoTipo, setMostrarNuevoTipo] = useState(false);
  const [nuevoTipoTexto, setNuevoTipoTexto] = useState("");
  const [mostrarGestionTipos, setMostrarGestionTipos] = useState(false);
  const [editandoTipo, setEditandoTipo] = useState(null);
  const [editandoTipoTexto, setEditandoTipoTexto] = useState("");

  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [isNew, setIsNew] = useState(false);

  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevoColor, setNuevoColor] = useState("");
  const [nuevaTalla, setNuevaTalla] = useState("");
  const [nuevaCantidad, setNuevaCantidad] = useState(1);
  const [nuevoPrecioCompra, setNuevoPrecioCompra] = useState("");
  const [nuevoPrecioVenta, setNuevoPrecioVenta] = useState("");

  const [cantidad, setCantidad] = useState(1);
  const [precioCompra, setPrecioCompra] = useState("");

  const [items, setItems] = useState([]);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    if (!authLoading && !user) router.replace("/login");
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setCargando(true);
      setErrorCarga("");
      try {
        const [prods, tps] = await Promise.all([fetchProductosTodos(), fetchTipos()]);
        setProductos(prods);
        setTipos(tps);
      } catch (err) {
        setErrorCarga("No pudimos cargar los datos. Revisa Firestore y las reglas.");
      } finally {
        setCargando(false);
      }
    })();
  }, [user]);

  async function onAgregarTipo() {
    const limpio = nuevoTipoTexto.trim();
    if (!limpio || limpio.length < 2 || limpio.length > 40) {
      setMensaje("Error: el nombre del tipo debe tener entre 2 y 40 caracteres.");
      return;
    }
    try {
      const nuevos = await agregarTipo(limpio);
      setTipos(nuevos);
      setTipoFiltro(limpio);
      setNuevoTipoTexto("");
      setMostrarNuevoTipo(false);
    } catch (err) {
      setMensaje("Error al agregar el tipo: " + err.message);
    }
  }

  function contarProductosPorTipo(t) {
    return productos.filter((p) => p.tipo === t).length;
  }

  async function onGuardarEdicionTipo(tipoViejo) {
    const limpio = editandoTipoTexto.trim();
    if (!limpio || limpio.length < 2 || limpio.length > 40) {
      setMensaje("Error: el nombre del tipo debe tener entre 2 y 40 caracteres.");
      return;
    }
    try {
      const afectados = productos.filter((p) => p.tipo === tipoViejo);
      const nuevos = await editarTipo(tipoViejo, limpio, afectados);
      setTipos(nuevos);
      if (tipoFiltro === tipoViejo) setTipoFiltro(limpio);
      setEditandoTipo(null);
      setProductos(await fetchProductosTodos());
    } catch (err) {
      setMensaje("Error al renombrar: " + err.message);
    }
  }

  async function onEliminarTipo(t) {
    const enUso = contarProductosPorTipo(t);
    if (enUso > 0) {
      setMensaje(`Error: "${t}" lo usan ${enUso} producto(s) — reasignalos a otro tipo antes de eliminarlo.`);
      return;
    }
    try {
      const nuevos = await eliminarTipo(t);
      setTipos(nuevos);
      if (tipoFiltro === t) setTipoFiltro("");
    } catch (err) {
      setMensaje("Error al eliminar: " + err.message);
    }
  }

  const resultados = useMemo(() => {
    return productos.filter(
      (p) =>
        (!tipoFiltro || p.tipo === tipoFiltro) &&
        (!search || p.nombre.toLowerCase().includes(search.toLowerCase()))
    );
  }, [productos, tipoFiltro, search]);

  const selected = productos.find((p) => p.id === selectedId) || null;
  const skuPreview = isNew ? generarSku(tipoFiltro, nuevoColor, nuevaTalla) : "";

  function toggleNew() {
    setIsNew((v) => !v);
    setSelectedId(null);
  }

  function pickExisting(p) {
    setSelectedId(p.id);
    setIsNew(false);
  }

  const lineSubtotalExistente = (Number(precioCompra) || 0) * (Number(cantidad) || 0);
  const lineSubtotalNuevo = (Number(nuevoPrecioCompra) || 0) * (Number(nuevaCantidad) || 0);

  function addItemExistente() {
    setMensaje("");
    const check = validarLineaCompra({
      isNew: false,
      nombre: selected.nombre,
      cantidad: Number(cantidad),
      precioCompra: Number(precioCompra),
    });
    if (!check.ok) { setMensaje("Error: " + check.error); return; }

    setItems((prev) => [
      ...prev,
      {
        isNew: false,
        productoId: selected.id,
        sku: selected.sku, nombre: selected.nombre, tipo: selected.tipo, color: selected.color, talla: selected.talla,
        cantidad: Number(cantidad), precioCompra: Number(precioCompra),
        subtotal: Number(cantidad) * Number(precioCompra),
      },
    ]);
    setSelectedId(null);
    setCantidad(1); setPrecioCompra("");
  }

  function addItemNuevo() {
    setMensaje("");
    const check = validarLineaCompra({
      isNew: true,
      nombre: nuevoNombre, tipo: tipoFiltro, color: nuevoColor, talla: nuevaTalla, sku: skuPreview,
      cantidad: Number(nuevaCantidad),
      precioCompra: Number(nuevoPrecioCompra),
      precioVentaInicial: Number(nuevoPrecioVenta),
    });
    if (!check.ok) { setMensaje("Error: " + check.error); return; }

    setItems((prev) => [
      ...prev,
      {
        isNew: true,
        productoId: null,
        sku: skuPreview, nombre: nuevoNombre, tipo: tipoFiltro, color: nuevoColor, talla: nuevaTalla,
        cantidad: Number(nuevaCantidad), precioCompra: Number(nuevoPrecioCompra),
        precioVentaInicial: Number(nuevoPrecioVenta),
        subtotal: Number(nuevaCantidad) * Number(nuevoPrecioCompra),
      },
    ]);
    setIsNew(false);
    setNuevoNombre(""); setNuevoColor(""); setNuevaTalla("");
    setNuevaCantidad(1); setNuevoPrecioCompra(""); setNuevoPrecioVenta("");
  }

  function removeItem(idx) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }

  const totalCompra = items.reduce((sum, i) => sum + i.subtotal, 0);

  async function onGuardar() {
    setMensaje("");
    if (items.length === 0) {
      setMensaje("Error: agrega al menos un producto a la compra.");
      return;
    }
    setGuardando(true);
    try {
      await registrarCompra(items, { usuarioUid: user.uid, usuarioNombre: user.email });
      setMensaje("¡Compra registrada!");
      setItems([]);
      setProductos(await fetchProductosTodos());
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
        <p style={{ color: "var(--coral)", fontWeight: 600 }}>Tu cuenta no tiene un rol asignado (o fue desactivada).</p>
        <button onClick={logout} className="btn-primary" style={{ marginTop: 12 }}>Salir</button>
      </div>
    );
  }

  return (
    <PageShell>
      <h1 style={{ fontSize: 19, color: "var(--wine-deep)", margin: "0 0 18px" }}>Nueva compra</h1>

      {errorCarga && <div className="card" style={{ borderColor: "var(--coral)", color: "var(--coral)", marginBottom: 14 }}>{errorCarga}</div>}
      {cargando && <div style={{ color: "var(--muted)", fontSize: 13 }}>Cargando…</div>}

      {!cargando && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 700, color: "var(--wine)", marginBottom: 10 }}>1. Tipo de producto</div>
          <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4, marginBottom: 8 }}>
            {tipos.map((t) => (
              <button
                key={t}
                className={"pill" + (tipoFiltro === t ? " on" : "")}
                style={{ whiteSpace: "nowrap" }}
                onClick={() => { setTipoFiltro(t); setSelectedId(null); setIsNew(false); }}
              >
                {t}
              </button>
            ))}
          </div>

          {!mostrarNuevoTipo ? (
            <button onClick={() => setMostrarNuevoTipo(true)} style={{ background: "none", border: "none", color: "var(--wine)", fontSize: 12.5, fontWeight: 600, cursor: "pointer", padding: 0, marginBottom: 8 }}>
              + Agregar un tipo nuevo al catálogo
            </button>
          ) : (
            <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
              <input className="field" style={{ flex: 1 }} placeholder="Ej. Accesorio" value={nuevoTipoTexto} onChange={(e) => setNuevoTipoTexto(e.target.value)} />
              <button className="btn-primary" onClick={onAgregarTipo}>Agregar</button>
            </div>
          )}

          {rol === "admin" && (
            <>
              <button onClick={() => setMostrarGestionTipos((v) => !v)} style={{ background: "none", border: "none", color: "var(--muted)", fontSize: 12, fontWeight: 600, cursor: "pointer", padding: 0, marginBottom: 14, textDecoration: "underline dotted" }}>
                {mostrarGestionTipos ? "Ocultar gestión de tipos" : "Editar o eliminar tipos existentes"}
              </button>

              {mostrarGestionTipos && (
                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 14, background: "var(--cream)", borderRadius: 10, padding: 10 }}>
                  {tipos.map((t) => (
                    <div key={t} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                      {editandoTipo === t ? (
                        <>
                          <input className="field" style={{ flex: 1, padding: "6px 8px" }} value={editandoTipoTexto} onChange={(e) => setEditandoTipoTexto(e.target.value)} />
                          <button onClick={() => onGuardarEdicionTipo(t)} style={{ border: "none", background: "none", color: "var(--wine)", fontWeight: 700, cursor: "pointer" }}>✓</button>
                          <button onClick={() => setEditandoTipo(null)} style={{ border: "none", background: "none", color: "var(--muted)", cursor: "pointer" }}>✕</button>
                        </>
                      ) : (
                        <>
                          <span style={{ fontSize: 13 }}>{t} <span style={{ color: "var(--muted)", fontSize: 11 }}>({contarProductosPorTipo(t)} productos)</span></span>
                          <span style={{ display: "flex", gap: 10 }}>
                            <button onClick={() => { setEditandoTipo(t); setEditandoTipoTexto(t); }} style={{ border: "none", background: "none", color: "var(--wine)", cursor: "pointer" }}>✎</button>
                            <button onClick={() => onEliminarTipo(t)} style={{ border: "none", background: "none", color: "var(--coral)", cursor: "pointer" }}>🗑</button>
                          </span>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {tipoFiltro && (
            <>
              <div style={{ fontWeight: 700, color: "var(--wine)", marginBottom: 10 }}>2. Buscar producto existente</div>
              <input
                className="field"
                placeholder="Nombre…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ marginBottom: 10 }}
              />
              <div style={{ maxHeight: 180, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
                {resultados.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => pickExisting(p)}
                    style={{
                      display: "flex", justifyContent: "space-between", padding: "10px 11px",
                      border: `1.5px solid ${selectedId === p.id ? "var(--wine)" : "var(--border)"}`,
                      background: selectedId === p.id ? "var(--pink-soft)" : "#fff",
                      borderRadius: 11, cursor: "pointer",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 13.5, fontWeight: 600 }}>{p.nombre}</div>
                      <div style={{ fontSize: 11.5, color: "var(--muted)" }}>{p.color} · Talla {p.talla} · {p.sku} · Stock {p.stock}</div>
                    </div>
                  </div>
                ))}
                {resultados.length === 0 && <div style={{ fontSize: 12, color: "var(--muted)" }}>Sin coincidencias — probá crear uno nuevo abajo.</div>}
              </div>

              {selected && !isNew && (
                <div style={{ borderTop: "1px solid var(--border)", paddingTop: 14, marginBottom: 14 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--wine)", marginBottom: 10 }}>Comprando: {selected.nombre} · {selected.color} · Talla {selected.talla}</div>
                  <div style={{ display: "flex", gap: 12, marginBottom: 10 }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600 }}>Cantidad</label>
                      <input className="field" type="number" min="1" value={cantidad} onChange={(e) => setCantidad(e.target.value)} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600 }}>Precio de compra (Bs)</label>
                      <input className="field" type="number" min="0" value={precioCompra} onChange={(e) => setPrecioCompra(e.target.value)} />
                    </div>
                  </div>
                  <div style={{ fontSize: 11.5, color: "var(--muted)", marginBottom: 12 }}>Subtotal Bs {lineSubtotalExistente}</div>
                  <button className="btn-primary" style={{ width: "100%" }} onClick={addItemExistente}>+ Agregar a la compra</button>
                </div>
              )}

              <button
                onClick={toggleNew}
                style={{ width: "100%", background: "#fff", border: "1.5px dashed var(--wine)", color: "var(--wine)", borderRadius: 12, padding: 12, fontWeight: 600, cursor: "pointer", marginBottom: 14 }}
              >
                {isNew ? "− Cancelar producto nuevo" : "+ Registrar producto nuevo"}
              </button>

              {isNew && (
                <div className="card" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--wine)" }}>Producto nuevo ({tipoFiltro})</div>
                  <input className="field" placeholder="Nombre (ej. Crop top)" value={nuevoNombre} onChange={(e) => setNuevoNombre(e.target.value)} />
                  <div style={{ display: "flex", gap: 10 }}>
                    <input className="field" placeholder="Color" value={nuevoColor} onChange={(e) => setNuevoColor(e.target.value)} />
                    <input className="field" placeholder="Talla" value={nuevaTalla} onChange={(e) => setNuevaTalla(e.target.value)} />
                  </div>
                  <div className="field" style={{ background: "#F8F5F2", color: "var(--muted)" }}>
                    SKU: {skuPreview || "se arma al completar color y talla"}
                  </div>

                  <div style={{ borderTop: "1px dashed var(--border)", marginTop: 4, paddingTop: 12 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "var(--wine)", marginBottom: 8 }}>Datos de esta compra</div>
                    <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
                      <div style={{ flex: 1 }}>
                        <label style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600 }}>Cantidad</label>
                        <input className="field" type="number" min="1" value={nuevaCantidad} onChange={(e) => setNuevaCantidad(e.target.value)} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600 }}>Precio de compra (Bs)</label>
                        <input className="field" type="number" min="0" value={nuevoPrecioCompra} onChange={(e) => setNuevoPrecioCompra(e.target.value)} />
                      </div>
                    </div>
                    <div style={{ marginBottom: 10 }}>
                      <label style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600 }}>Precio de venta inicial (Bs)</label>
                      <input className="field" type="number" min="0" value={nuevoPrecioVenta} onChange={(e) => setNuevoPrecioVenta(e.target.value)} />
                      <div style={{ fontSize: 10.5, color: "var(--muted)", marginTop: 3 }}>Es el precio con el que este producto va a aparecer en Ventas. Después se puede ajustar desde Lista de Precios.</div>
                    </div>
                    <div style={{ fontSize: 11.5, color: "var(--muted)", marginBottom: 12 }}>Subtotal de compra: Bs {lineSubtotalNuevo}</div>
                    <button className="btn-primary" style={{ width: "100%" }} onClick={addItemNuevo}>+ Agregar a la compra</button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {items.length > 0 && (
        <>
          <div style={{ fontWeight: 700, color: "var(--wine)", marginBottom: 10 }}>Productos en esta compra</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 18 }}>
            {items.map((it, idx) => (
              <div key={idx} className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 600 }}>{it.nombre}{it.isNew ? " (nuevo)" : ""}</div>
                  <div style={{ fontSize: 11.5, color: "var(--muted)" }}>{it.color} · Talla {it.talla} · {it.cantidad} u. × Bs {it.precioCompra}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontWeight: 700 }}>Bs {it.subtotal}</span>
                  <button onClick={() => removeItem(idx)} style={{ border: "none", background: "none", color: "var(--coral)", cursor: "pointer" }}>✕</button>
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#fff", border: "1px solid var(--border)", borderRadius: 14, padding: 14 }}>
            <div>
              <div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 600 }}>TOTAL COMPRA</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: "var(--wine-deep)" }}>Bs {totalCompra}</div>
            </div>
            <button className="btn-primary" disabled={guardando} onClick={onGuardar}>
              {guardando ? "Guardando…" : "Guardar compra"}
            </button>
          </div>
        </>
      )}

      {mensaje && <div style={{ marginTop: 14, fontSize: 13, color: mensaje.startsWith("Error") ? "var(--coral)" : "var(--sage)" }}>{mensaje}</div>}

    </PageShell>
  );
}
