import { collection, getDocs, doc, updateDoc, addDoc } from "firebase/firestore";
import { db } from "./firebase";

/**
 * Trae los productos con su costo (precio de compra más alto registrado),
 * margen configurado y precio sugerido calculado.
 */
export async function fetchListaPrecios() {
  const [productosSnap, comprasSnap] = await Promise.all([
    getDocs(collection(db, "productos")),
    getDocs(collection(db, "compras")),
  ]);

  const maxCostoPorProducto = {};
  comprasSnap.docs.forEach((d) => {
    const c = d.data();
    const actual = maxCostoPorProducto[c.productoId] || 0;
    if (c.precioCompra > actual) maxCostoPorProducto[c.productoId] = c.precioCompra;
  });

  return productosSnap.docs.map((d) => {
    const p = { id: d.id, ...d.data() };
    const costoUnitario = maxCostoPorProducto[p.id] || 0;
    const margenPct = p.margenPct ?? 1; // 1 = 100% por defecto
    return {
      ...p,
      costoUnitario,
      margenPct,
      precioSugerido: Math.round(costoUnitario * (1 + margenPct)),
      precioVigente: p.precioVenta,
    };
  });
}

/** Solo Admin: cambia el precio de venta vigente de un producto. */
export async function actualizarPrecioVigente(productoId, nuevoPrecio) {
  await updateDoc(doc(db, "productos", productoId), { precioVenta: nuevoPrecio });
}

/** Solo Admin: cambia el % de margen usado para calcular el precio sugerido. */
export async function actualizarMargen(productoId, nuevoMargen) {
  await updateDoc(doc(db, "productos", productoId), { margenPct: nuevoMargen });
}

export async function fetchPromociones() {
  const snap = await getDocs(collection(db, "promociones"));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function crearPromocion(data) {
  await addDoc(collection(db, "promociones"), { ...data, activa: true });
}

export async function actualizarPromocion(id, cambios) {
  await updateDoc(doc(db, "promociones", id), cambios);
}
