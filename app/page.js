"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../lib/auth-context";

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    router.replace(user ? "/inicio" : "/login");
  }, [user, loading, router]);

  return (
    <div style={{ padding: 24, fontSize: 14, color: "var(--muted)" }}>
      Cargando…
    </div>
  );
}
