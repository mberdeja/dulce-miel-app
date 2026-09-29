import { collection, getDocs, doc, updateDoc } from "firebase/firestore";
import { db } from "./firebase";

/**
 * Trae todos los productos y, para cada uno, calcula su "costo unitario" como
 * el precio de compra MÁS ALTO registrado en su historial (no el último —
 * así el margen nunca queda corto si el costo subió y después volvió a bajar).
 */
export async function fetchInventario() {
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
    const stockMinimo = p.stockMinimo ?? 5;
    return {
      ...p,
      costoUnitario,
      stockMinimo,
      valorInventario: (p.stock || 0) * costoUnitario,
      stockBajo: (p.stock || 0) <= stockMinimo,
    };
  });
}

/** Solo un Admin puede ajustar el umbral de stock mínimo de un producto. */
export async function actualizarStockMinimo(productoId, nuevoMinimo) {
  await updateDoc(doc(db, "productos", productoId), { stockMinimo: nuevoMinimo });
}
