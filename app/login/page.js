"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../lib/auth-context";
import Watermark from "../../components/Watermark";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      router.replace("/inicio");
    } catch (err) {
      setError("No pudimos iniciar sesión. Revisa el correo y la contraseña.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 20px" }}>
      <div
        style={{
          maxWidth: 380,
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 16,
          background: "#fff",
          border: "1px solid var(--border)",
          borderRadius: 20,
          padding: "36px 28px",
        }}
      >
        <img src="/logo.jpg" alt="Dulce Miel" style={{ width: 92, height: 92, borderRadius: "50%", objectFit: "cover", boxShadow: "0 0 0 3px var(--wine-deep)" }} />
        <div style={{ textAlign: "center" }}>
          <h1 style={{ color: "var(--wine-deep)", margin: 0, fontSize: 22 }}>Dulce Miel</h1>
          <p style={{ color: "var(--muted)", margin: "4px 0 0", fontSize: 13 }}>
            Gestión de ventas, compras e inventario
          </p>
        </div>

        <form onSubmit={onSubmit} style={{ width: "100%", display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: "var(--wine)" }}>
            Correo electrónico
          </label>
          <input
            className="field"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: "var(--wine)" }}>
            Contraseña
          </label>
          <input
            className="field"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {error && <div style={{ color: "var(--coral)", fontSize: 13 }}>{error}</div>}
        <button className="btn-primary" type="submit" disabled={loading}>
          {loading ? "Ingresando…" : "Iniciar sesión"}
        </button>
      </form>

      <p style={{ fontSize: 11.5, color: "var(--muted)" }}>
        Los usuarios se crean desde la consola de Firebase Authentication (o desde
        una pantalla de administración que armamos más adelante).
      </p>
      </div>
      <Watermark />
    </div>
  );
}
