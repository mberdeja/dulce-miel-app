"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "./firebase";
import { useAuth } from "./auth-context";

const RoleContext = createContext({ rol: null, nombre: null, activo: null, loading: true });

/**
 * Escucha en tiempo real el documento usuarios/{uid} para saber el rol
 * (admin | vendedor) de la persona logueada. Si un Admin desactiva a alguien
 * (campo activo=false), se refleja al instante sin recargar la página.
 */
export function RoleProvider({ children }) {
  const { user } = useAuth();
  const [state, setState] = useState({ rol: null, nombre: null, activo: null, loading: true });

  useEffect(() => {
    if (!user) {
      setState({ rol: null, nombre: null, activo: null, loading: false });
      return;
    }
    const ref = doc(db, "usuarios", user.uid);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (!snap.exists()) {
          setState({ rol: null, nombre: null, activo: false, loading: false });
          return;
        }
        const data = snap.data();
        setState({ rol: data.rol || null, nombre: data.nombre || user.email, activo: data.activo !== false, loading: false });
      },
      () => setState({ rol: null, nombre: null, activo: false, loading: false })
    );
    return unsub;
  }, [user]);

  return <RoleContext.Provider value={state}>{children}</RoleContext.Provider>;
}

export function useRole() {
  return useContext(RoleContext);
}
