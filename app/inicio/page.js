"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../lib/auth-context";
import { useRole } from "../../lib/role-context";
import { fetchResumenInicio } from "../../lib/inicio";
import PageShell from "../../components/PageShell";

export default function InicioPage() {
  const { user, loading: authLoading, logout } = useAuth();
  const { rol, nombre, activo, loading: roleLoading } = useRole();
  const router = useRouter();

  const [resumen, setResumen] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!authLoading && !user) router.replace("/login");
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setCargando(true);
      try {
        setResumen(await fetchResumenInicio());
      } catch (err) {
        setError("No pudimos cargar el resumen del día.");
      } finally {
        setCargando(false);
      }
    })();
  }, [user]);

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

  const accesos = [
    { href: "/ventas", label: "Nueva venta" },
    { href: "/compras", label: "Nueva compra" },
    ...(esAdmin ? [{ href: "/precios", label: "Lista de precios" }] : []),
    { href: "/inventario", label: "Inventario" },
    { href: "/resumen", label: "Resumen de ventas" },
    { href: "/pedidos", label: "Pedidos" },
  ];

  return (
    <PageShell>
      <h1 style={{ fontSize: 20, color: "var(--wine-deep)", margin: "0 0 20px", fontWeight: 700 }}>Hola, {nombre}</h1>

      {error && <div className="card" style={{ borderColor: "var(--coral)", color: "var(--coral)", marginBottom: 14 }}>{error}</div>}
      {cargando && <div style={{ color: "var(--muted)", fontSize: 13, marginBottom: 16 }}>Cargando…</div>}

      {!cargando && resumen && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 26 }}>
          <a href="/resumen" className="card" style={{ borderLeft: "4px solid var(--sage)", textDecoration: "none", color: "inherit" }}>
            <div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 600, marginBottom: 6 }}>VENTAS HOY</div>
            <div style={{ fontSize: 19, fontWeight: 700, color: "var(--wine-deep)" }}>Bs {resumen.montoHoy}</div>
            <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>{resumen.unidadesHoy} prendas</div>
          </a>
          <a href="/pedidos" className="card" style={{ borderLeft: "4px solid #7FB8CE", textDecoration: "none", color: "inherit" }}>
            <div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 600, marginBottom: 6 }}>PEDIDOS PENDIENTES</div>
            <div style={{ fontSize: 19, fontWeight: 700, color: "var(--wine-deep)" }}>{resumen.pedidosPendientes}</div>
            <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>por recoger o enviar</div>
          </a>
          <a href="/inventario" className="card" style={{ borderLeft: "4px solid var(--coral)", background: resumen.stockBajoCount > 0 ? "#FBEFEE" : "#fff", textDecoration: "none", color: "inherit" }}>
            <div style={{ fontSize: 11, color: resumen.stockBajoCount > 0 ? "#9C4A45" : "var(--muted)", fontWeight: 700, marginBottom: 6 }}>STOCK BAJO</div>
            <div style={{ fontSize: 19, fontWeight: 700, color: resumen.stockBajoCount > 0 ? "#7A2E29" : "var(--wine-deep)" }}>{resumen.stockBajoCount} producto(s)</div>
          </a>
        </div>
      )}

      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--wine)", marginBottom: 10 }}>Accesos rápidos</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
        {accesos.map((a) => (
          <a
            key={a.href}
            href={a.href}
            style={{
              display: "flex", alignItems: "center", background: "#fff", border: "1.5px solid var(--border)",
              color: "var(--ink)", borderRadius: 14, padding: "15px 16px", fontWeight: 600, fontSize: 14.5,
              textDecoration: "none",
            }}
          >
            {a.label}
          </a>
        ))}
      </div>

      {!esAdmin && (
        <div className="card" style={{ marginTop: 20, fontSize: 12, color: "var(--muted)" }}>
          Tu vista se ajusta a tu rol de Vendedor: no ves Lista de Precios.
        </div>
      )}
    </PageShell>
  );
}
