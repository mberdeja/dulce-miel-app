import {
  collection,
  query,
  where,
  getDocs,
  doc,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebase";

export { calcularPromosAplicables } from "./promos";

/**
 * Trae todos los productos con stock > 0.
 * Estructura esperada del documento en la colección "productos":
 * { sku, nombre, tipo, color, talla, precioVenta, stock }
 */
export async function fetchProductosEnStock() {
  const q = query(collection(db, "productos"), where("stock", ">", 0));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * Trae las promociones activas.
 * Estructura esperada en la colección "promociones":
 * { nombre, aplicaANombre, cantidadMinima, precioTotalPromo, activa }
 */
export async function fetchPromocionesActivas() {
  const q = query(collection(db, "promociones"), where("activa", "==", true));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * Registra una venta completa (uno o varios productos) de forma atómica:
 * - Verifica que haya stock suficiente de cada producto justo antes de guardar.
 * - Descuenta el stock de cada producto.
 * - Crea un documento en "ventas" por cada línea del carrito, todos con el mismo idVenta.
 * Si algo fallara a mitad de camino (ej. alguien más vendió la última unidad segundos antes),
 * la transacción entera se revierte y no queda nada guardado a medias.
 *
 * @param {Array} items - [{ productoId, sku, nombre, tipo, color, talla, precio, cantidad, subtotal, idPromo, descuentoPromo, total }]
 * @param {Object} meta - { medioPago, cliente, tipoEntrega, vendedorUid, vendedorNombre, estadoInicial }
 * @returns {Promise<string>} idVenta generado
 */
export async function registrarVenta(items, meta) {
  const idVenta = "V" + Date.now().toString(36).toUpperCase();

  await runTransaction(db, async (tx) => {
    // 1) Leer y validar stock de cada producto involucrado
    const productoRefs = items.map((it) => doc(db, "productos", it.productoId));
    const productoSnaps = await Promise.all(productoRefs.map((ref) => tx.get(ref)));

    productoSnaps.forEach((snap, i) => {
      if (!snap.exists()) {
        throw new Error(`El producto ${items[i].nombre} ya no existe.`);
      }
      const stockActual = snap.data().stock ?? 0;
      if (stockActual < items[i].cantidad) {
        throw new Error(
          `Stock insuficiente para ${items[i].nombre} (talla ${items[i].talla}): quedan ${stockActual}.`
        );
      }
    });

    // 2) Descontar stock
    productoSnaps.forEach((snap, i) => {
      const stockActual = snap.data().stock ?? 0;
      tx.update(productoRefs[i], { stock: stockActual - items[i].cantidad });
    });

    // 3) Crear una línea de venta por cada producto del carrito
    items.forEach((it) => {
      const ventaRef = doc(collection(db, "ventas"));
      tx.set(ventaRef, {
        idVenta,
        fecha: serverTimestamp(),
        sku: it.sku,
        nombre: it.nombre,
        tipo: it.tipo,
        color: it.color,
        talla: it.talla,
        precio: it.precio,
        cantidad: it.cantidad,
        subtotal: it.subtotal,
        idPromo: it.idPromo || null,
        descuentoPromo: it.descuentoPromo || 0,
        total: it.total,
        medioPago: meta.medioPago,
        cliente: meta.cliente || "",
        tipoEntrega: meta.tipoEntrega,
        estado: meta.estadoInicial,
        vendedorUid: meta.vendedorUid,
        vendedorNombre: meta.vendedorNombre,
      });
    });
  });

  return idVenta;
}
