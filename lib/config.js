import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { db } from "./firebase";

const TIPOS_DEFAULT = ["Polera", "Vestido", "Jean", "Chaqueta", "Falda", "Short", "Buzo"];

/**
 * Trae la lista de Tipos de producto configurada en Firestore (config/tipos).
 * Si todavía no existe el documento (primera vez), la crea con una lista base
 * de ejemplo para que no arranque vacía, y la devuelve.
 */
export async function fetchTipos() {
  const ref = doc(db, "config", "tipos");
  const snap = await getDoc(ref);
  if (snap.exists() && Array.isArray(snap.data().valores)) {
    return snap.data().valores;
  }
  await setDoc(ref, { valores: TIPOS_DEFAULT });
  return TIPOS_DEFAULT;
}

/** Agrega un tipo nuevo a la lista configurada (si no existe ya). */
export async function agregarTipo(nuevoTipo) {
  const actuales = await fetchTipos();
  const limpio = nuevoTipo.trim();
  if (actuales.some((t) => t.toLowerCase() === limpio.toLowerCase())) return actuales;
  const nuevos = [...actuales, limpio];
  await setDoc(doc(db, "config", "tipos"), { valores: nuevos });
  return nuevos;
}

/**
 * Renombra un tipo existente en el catálogo. Si se pasan productosAfectados
 * (los productos que ya usan ese tipo), también los actualiza a todos para
 * que no queden "huérfanos" con un tipo que ya no existe en la lista.
 */
export async function editarTipo(tipoViejo, tipoNuevo, productosAfectados = []) {
  const limpio = tipoNuevo.trim();
  const actuales = await fetchTipos();
  const nuevos = actuales.map((t) => (t === tipoViejo ? limpio : t));
  await setDoc(doc(db, "config", "tipos"), { valores: nuevos });
  await Promise.all(
    productosAfectados.map((p) => updateDoc(doc(db, "productos", p.id), { tipo: limpio }))
  );
  return nuevos;
}

/**
 * Elimina un tipo del catálogo. No se puede eliminar si hay productos
 * usándolo todavía (hay que reasignarlos primero) — se controla desde
 * la pantalla, pasando cuántos productos lo usan.
 */
export async function eliminarTipo(tipo) {
  const actuales = await fetchTipos();
  const nuevos = actuales.filter((t) => t !== tipo);
  await setDoc(doc(db, "config", "tipos"), { valores: nuevos });
  return nuevos;
}
