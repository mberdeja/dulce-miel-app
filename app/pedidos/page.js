"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../lib/auth-context";
import { useRole } from "../../lib/role-context";
import { fetchPedidos, actualizarEstadoPedido, siguienteEstado, etiquetaAccion } from "../../lib/pedidos";
import PageShell from "../../components/PageShell";

const ESTADOS = ["Por recoger", "Pendiente de envío", "Enviado", "Entregado", "Cambio/Devolución"];
const BADGE = {
  "Por recoger": { bg: "#FBF1DA", color: "#8a6a1f" },
  "Pendiente de envío": { bg: "#F8DCDA", color: "#9C4A45" },
  "Enviado": { bg: "#E7F3F7", color: "#2f6b80" },
  "Entregado": { bg: "#E7F0E4", color: "#3f6b38" },
  "Cambio/Devolución": { bg: "#FCEAF0", color: "#4A1B2C" },
};

function formatearFecha(ts) {
  if (!ts?.toDate) return "";
  return ts.toDate().toLocaleDateString("es-BO", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export default function PedidosPage() {
  const { user, loading: authLoading, logout } = useAuth();
  const { rol, nombre, activo, loading: roleLoading } = useRole();
  const router = useRouter();

  const [pedidos, setPedidos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [mensaje, setMensaje] = useState("");
  const [filtro, setFiltro] = useState("Todos");
  const [procesando, setProcesando] = useState(null);

  useEffect(() => {
    if (!authLoading && !user) router.replace("/login");
  }, [authLoading, user, router]);

  async function cargar() {
    setCargando(true);
    try {
      setPedidos(await fetchPedidos());
    } catch (err) {
      setMensaje("Error al cargar: " + err.message);
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => { if (user) cargar(); }, [user]);

  const filtrados = filtro === "Todos" ? pedidos : pedidos.filter((p) => p.estado === filtro);

  async function avanzar(p) {
    const next = siguienteEstado(p.estado);
    if (!next) return;
    setProcesando(p.idVenta);
    try {
      await actualizarEstadoPedido(p.idVenta, next);
      await cargar();
    } catch (err) {
      setMensaje("Error: " + err.message);
    } finally {
      setProcesando(null);
    }
  }

  async function marcarDevolucion(p) {
    setProcesando(p.idVenta);
    try {
      await actualizarEstadoPedido(p.idVenta, "Cambio/Devolución");
      await cargar();
    } catch (err) {
      setMensaje("Error: " + err.message);
    } finally {
      setProcesando(null);
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
      <h1 style={{ fontSize: 19, color: "var(--wine-deep)", margin: "0 0 18px" }}>Pedidos</h1>

      <div style={{ fontSize: 11.5, color: "var(--muted)", marginBottom: 14, lineHeight: 1.5 }}>
        Acá le das seguimiento a cada venta después de registrarla.
      </div>

      {cargando && <div style={{ color: "var(--muted)", fontSize: 13 }}>Cargando…</div>}

      {!cargando && (
        <>
          <div style={{ display: "flex", gap: 7, overflowX: "auto", paddingBottom: 4, marginBottom: 14 }}>
            {["Todos", ...ESTADOS].map((e) => (
              <button key={e} className={"pill" + (filtro === e ? " on" : "")} style={{ whiteSpace: "nowrap" }} onClick={() => setFiltro(e)}>
                {e}
              </button>
            ))}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {filtrados.map((p) => {
              const badge = BADGE[p.estado] || { bg: "#F4F0EC", color: "var(--muted)" };
              const next = siguienteEstado(p.estado);
              const puedeAvanzar = !!next;
              const puedeDevolucion = p.estado === "Entregado";
              return (
                <div key={p.idVenta} className="card">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                    <div>
                      <div style={{ fontSize: 13.5, fontWeight: 700 }}>{p.idVenta} · {p.cliente || "sin usuario"}</div>
                      <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>{formatearFecha(p.fecha)} · {p.tipoEntrega}</div>
                    </div>
                    <span style={{ background: badge.bg, color: badge.color, fontSize: 10.5, fontWeight: 700, padding: "4px 10px", borderRadius: 14, whiteSpace: "nowrap" }}>{p.estado}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 15, fontWeight: 700, color: "var(--wine-deep)" }}>Bs {p.total}</span>
                    <div style={{ display: "flex", gap: 8 }}>
                      {puedeAvanzar && (
                        <button
                          onClick={() => avanzar(p)}
                          disabled={procesando === p.idVenta}
                          style={{ background: "var(--wine-deep)", color: "#fff", border: "none", borderRadius: 10, padding: "8px 13px", fontWeight: 600, fontSize: 12, cursor: "pointer" }}
                        >
                          {procesando === p.idVenta ? "…" : etiquetaAccion(p.estado)}
                        </button>
                      )}
                      {puedeDevolucion && (
                        <button
                          onClick={() => marcarDevolucion(p)}
                          disabled={procesando === p.idVenta}
                          style={{ background: "none", color: "var(--coral)", border: "1.5px solid #E3A6A0", borderRadius: 10, padding: "8px 13px", fontWeight: 600, fontSize: 12, cursor: "pointer" }}
                        >
                          Cambio/Devolución
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            {filtrados.length === 0 && <div style={{ fontSize: 12.5, color: "var(--muted)", textAlign: "center", padding: "24px 0" }}>No hay pedidos en este estado.</div>}
          </div>
        </>
      )}

      {mensaje && <div style={{ marginTop: 14, fontSize: 13, color: "var(--coral)" }}>{mensaje}</div>}
    </PageShell>
  );
}
