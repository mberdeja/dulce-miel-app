import {
  collection,
  query,
  where,
  getDocs,
  doc,
  addDoc,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebase";

/**
 * Genera el SKU siguiendo el mismo patrón acordado: DM-TIPO-COLOR-TALLA
 * (3 primeras letras de tipo y color, en mayúsculas).
 */
export function generarSku(tipo, color, talla) {
  const t = (tipo || "").slice(0, 3).toUpperCase();
  const c = (color || "").slice(0, 3).toUpperCase();
  const s = (talla || "").toUpperCase();
  return `DM-${t}-${c}-${s}`;
}

/** Trae todos los productos activos (para buscar/filtrar en Compras). */
export async function fetchProductosTodos() {
  const snap = await getDocs(collection(db, "productos"));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * Registra una compra completa (uno o varios productos, nuevos o existentes).
 * Por cada línea:
 *  - Si es un producto NUEVO: crea el documento en "productos" con el stock inicial.
 *  - Si es un producto EXISTENTE: suma la cantidad comprada a su stock actual,
 *    dentro de una transacción para que dos compras al mismo tiempo no se pisen.
 * Y siempre crea un documento en "compras" por cada línea, para el historial.
 *
 * @param {Array} items - [{ isNew, productoId?, sku, nombre, tipo, color, talla, cantidad, precioCompra, precioVentaInicial? }]
 * @param {Object} meta - { usuarioUid, usuarioNombre }
 * @returns {Promise<string>} idCompra generado
 */
export async function registrarCompra(items, meta) {
  const idCompra = "C" + Date.now().toString(36).toUpperCase();

  // 1) Los productos nuevos se crean primero (no requieren transacción entre sí)
  const idsResueltos = [];
  for (const it of items) {
    if (it.isNew) {
      const ref = await addDoc(collection(db, "productos"), {
        sku: it.sku,
        nombre: it.nombre,
        tipo: it.tipo,
        color: it.color,
        talla: it.talla,
        precioVenta: it.precioVentaInicial,
        stock: 0, // arranca en 0; la transacción de abajo lo sube a "cantidad"
        activo: true,
      });
      idsResueltos.push(ref.id);
    } else {
      idsResueltos.push(it.productoId);
    }
  }

  // 2) Transacción: sube el stock de cada producto (nuevo o existente) y
  //    registra cada línea en "compras".
  await runTransaction(db, async (tx) => {
    const refs = idsResueltos.map((id) => doc(db, "productos", id));
    const snaps = await Promise.all(refs.map((ref) => tx.get(ref)));

    snaps.forEach((snap, i) => {
      if (!snap.exists()) throw new Error(`El producto ${items[i].nombre} ya no existe.`);
      const stockActual = snap.data().stock ?? 0;
      tx.update(refs[i], { stock: stockActual + items[i].cantidad });
    });

    items.forEach((it, i) => {
      const compraRef = doc(collection(db, "compras"));
      tx.set(compraRef, {
        idCompra,
        fecha: serverTimestamp(),
        productoId: idsResueltos[i],
        sku: it.sku,
        nombre: it.nombre,
        tipo: it.tipo,
        color: it.color,
        talla: it.talla,
        cantidad: it.cantidad,
        precioCompra: it.precioCompra,
        subtotal: it.cantidad * it.precioCompra,
        usuarioUid: meta.usuarioUid,
        usuarioNombre: meta.usuarioNombre,
      });
    });
  });

  return idCompra;
}
