"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../lib/auth-context";
import { useRole } from "../../lib/role-context";
import { fetchVentasParaResumen } from "../../lib/resumen";
import { calcularKPIPeriodo, calcularPatronSemanal, calcularTopProductos, calcularTopVendedoras } from "../../lib/resumen-calc";
import PageShell from "../../components/PageShell";

function hoyISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function ResumenPage() {
  const { user, loading: authLoading, logout } = useAuth();
  const { rol, nombre, activo, loading: roleLoading } = useRole();
  const router = useRouter();

  const [ventas, setVentas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [periodo, setPeriodo] = useState("dia");
  const [fechaSel, setFechaSel] = useState(hoyISO());

  useEffect(() => {
    if (!authLoading && !user) router.replace("/login");
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setCargando(true);
      try {
        setVentas(await fetchVentasParaResumen());
      } catch (err) {
        setError("No pudimos cargar el resumen. Revisa Firestore y las reglas.");
      } finally {
        setCargando(false);
      }
    })();
  }, [user]);

  const fechaSeleccionadaObj = useMemo(() => new Date(fechaSel + "T00:00:00"), [fechaSel]);
  const kpi = useMemo(() => calcularKPIPeriodo(ventas, periodo, new Date(), fechaSeleccionadaObj), [ventas, periodo, fechaSeleccionadaObj]);
  const patron = useMemo(() => calcularPatronSemanal(ventas), [ventas]);
  const topProductos = useMemo(() => calcularTopProductos(ventas), [ventas]);
  const topVendedoras = useMemo(() => calcularTopVendedoras(ventas), [ventas]);
  const mejorDia = patron.find((d) => d.esMejor);

  if (authLoading || !user || roleLoading) return null;

  if (!activo || (rol !== "admin" && rol !== "vendedor")) {
    return (
      <div style={{ maxWidth: 380, margin: "60px auto", padding: "0 20px", textAlign: "center" }}>
        <p style={{ color: "var(--coral)", fontWeight: 600 }}>Tu cuenta no tiene un rol asignado (o fue desactivada).</p>
        <button onClick={logout} className="btn-primary" style={{ marginTop: 12 }}>Salir</button>
      </div>
    );
  }

  const tabs = [
    { key: "dia", label: "Día" },
    { key: "semana", label: "Semana" },
    { key: "mes", label: "Mes" },
    { key: "anio", label: "Año" },
  ];

  return (
    <PageShell>
      <h1 style={{ fontSize: 19, color: "var(--wine-deep)", margin: "0 0 18px" }}>Resumen de ventas</h1>

      {error && <div className="card" style={{ borderColor: "var(--coral)", color: "var(--coral)", marginBottom: 14 }}>{error}</div>}
      {cargando && <div style={{ color: "var(--muted)", fontSize: 13 }}>Cargando…</div>}

      {!cargando && (
        <>
          <div style={{ display: "flex", gap: 6, background: "#F4EFEA", borderRadius: 12, padding: 4, marginBottom: 12 }}>
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setPeriodo(t.key)}
                style={{ flex: 1, padding: 9, borderRadius: 10, border: "none", fontWeight: 700, fontSize: 13, cursor: "pointer", background: periodo === t.key ? "var(--wine)" : "transparent", color: periodo === t.key ? "#fff" : "var(--muted)" }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {periodo === "dia" && (
            <input
              type="date"
              value={fechaSel}
              max={hoyISO()}
              onChange={(e) => setFechaSel(e.target.value)}
              className="field"
              style={{ marginBottom: 14 }}
            />
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 22 }}>
            <div className="card">
              <div style={{ fontSize: 10.5, color: "var(--muted)", fontWeight: 700, marginBottom: 4 }}>VENTAS</div>
              <div style={{ fontSize: 19, fontWeight: 700, color: "var(--wine-deep)" }}>Bs {kpi.monto}</div>
            </div>
            <div className="card">
              <div style={{ fontSize: 10.5, color: "var(--muted)", fontWeight: 700, marginBottom: 4 }}>UNIDADES</div>
              <div style={{ fontSize: 19, fontWeight: 700, color: "var(--wine-deep)" }}>{kpi.unidades}</div>
            </div>
            <div className="card">
              <div style={{ fontSize: 10.5, color: "var(--muted)", fontWeight: 700, marginBottom: 4 }}>TRANSACCIONES</div>
              <div style={{ fontSize: 19, fontWeight: 700, color: "var(--wine-deep)" }}>{kpi.transacciones}</div>
            </div>
            <div className="card">
              <div style={{ fontSize: 10.5, color: "var(--muted)", fontWeight: 700, marginBottom: 4 }}>TICKET PROMEDIO</div>
              <div style={{ fontSize: 19, fontWeight: 700, color: "var(--wine-deep)" }}>Bs {kpi.ticket}</div>
            </div>
          </div>

          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--wine)", marginBottom: 2 }}>Ventas por día de la semana</div>
          <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 10 }}>
            {mejorDia ? <>Promedio histórico — <strong>{mejorDia.name}</strong> es tu mejor día</> : "Todavía no hay suficiente historial"}
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 90, marginBottom: 6 }}>
            {patron.map((d) => (
              <div key={d.name} style={{ flex: 1, height: "100%", display: "flex", alignItems: "flex-end" }}>
                <div style={{ width: "100%", height: `${d.pct}%`, borderRadius: "6px 6px 3px 3px", background: d.esMejor ? "var(--wine)" : "var(--pink)" }} />
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 6, marginBottom: 22 }}>
            {patron.map((d) => (
              <div key={d.name} style={{ flex: 1, textAlign: "center", fontSize: 10.5, fontWeight: 700, color: d.esMejor ? "var(--wine)" : "var(--muted)" }}>{d.name}</div>
            ))}
          </div>

          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--wine)", marginBottom: 2 }}>Top productos</div>
          <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 10 }}>Este mes · por unidades vendidas</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 22 }}>
            {topProductos.map((p, i) => (
              <div key={p.nombre} className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{i + 1}. {p.nombre}</span>
                <span style={{ fontSize: 12, color: "var(--muted)" }}>{p.unidades} u. · Bs {p.monto}</span>
              </div>
            ))}
            {topProductos.length === 0 && <div style={{ fontSize: 12, color: "var(--muted)" }}>Sin ventas este mes todavía.</div>}
          </div>

          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--wine)", marginBottom: 2 }}>Top vendedoras/es</div>
          <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 10 }}>Este mes · por monto vendido</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {topVendedoras.map((v, i) => (
              <div key={v.vendedorNombre} className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{i + 1}. {v.vendedorNombre}</span>
                <span style={{ fontSize: 12, color: "var(--muted)" }}>Bs {v.monto} · {v.transacciones} ventas</span>
              </div>
            ))}
            {topVendedoras.length === 0 && <div style={{ fontSize: 12, color: "var(--muted)" }}>Sin ventas este mes todavía.</div>}
          </div>
        </>
      )}
    </PageShell>
  );
}
