"use client";

import { useAuth } from "../lib/auth-context";
import { useRole } from "../lib/role-context";
import Watermark from "./Watermark";

export default function PageShell({ children }) {
  const { logout } = useAuth();
  const { rol, nombre } = useRole();
  const esAdmin = rol === "admin";

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <header
        style={{
          position: "sticky", top: 0, zIndex: 10, background: "#fff",
          borderBottom: "1px solid var(--border)", padding: "12px 20px",
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
        }}
      >
        <a href="/inicio" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", color: "inherit" }}>
          <img src="/logo.jpg" alt="Dulce Miel" style={{ width: 34, height: 34, borderRadius: "50%", objectFit: "cover", boxShadow: "0 0 0 1.5px var(--wine-deep)" }} />
          <span style={{ fontWeight: 700, fontSize: 15, color: "var(--wine-deep)" }}>Dulce Miel</span>
        </a>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {rol && (
            <span style={{ fontSize: 11, fontWeight: 700, color: esAdmin ? "var(--wine)" : "var(--sage)", whiteSpace: "nowrap" }}>
              {esAdmin ? "Admin" : "Vendedor"} · {nombre}
            </span>
          )}
          <button onClick={logout} style={{ background: "none", border: "1.5px solid var(--border)", borderRadius: 8, padding: "6px 12px", color: "var(--muted)", fontSize: 12, cursor: "pointer" }}>
            Salir
          </button>
        </div>
      </header>

      <main style={{ flex: 1, width: "100%", maxWidth: 760, margin: "0 auto", padding: "24px 20px 60px", boxSizing: "border-box" }}>
        {children}
      </main>

      <Watermark />
    </div>
  );
}
