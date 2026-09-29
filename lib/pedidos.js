import { collection, query, where, getDocs, orderBy, doc, writeBatch } from "firebase/firestore";
import { db } from "./firebase";

const ORDEN_ESTADOS = {
  "Por recoger": "Entregado",
  "Pendiente de envío": "Enviado",
  "Enviado": "Entregado",
};

export function siguienteEstado(estadoActual) {
  return ORDEN_ESTADOS[estadoActual] || null;
}

export function etiquetaAccion(estadoActual) {
  const n = siguienteEstado(estadoActual);
  if (n === "Enviado") return "Marcar como enviado";
  if (n === "Entregado") return "Marcar como entregado";
  return "";
}

/**
 * Trae todas las ventas y las agrupa por idVenta en "pedidos" (una transacción
 * puede tener varias líneas de producto, pero es un solo pedido a seguir).
 */
export async function fetchPedidos() {
  const q = query(collection(db, "ventas"), orderBy("fecha", "desc"));
  const snap = await getDocs(q);

  const porIdVenta = {};
  snap.docs.forEach((d) => {
    const v = { id: d.id, ...d.data() };
    if (!porIdVenta[v.idVenta]) {
      porIdVenta[v.idVenta] = {
        idVenta: v.idVenta,
        fecha: v.fecha,
        cliente: v.cliente,
        tipoEntrega: v.tipoEntrega,
        estado: v.estado,
        medioPago: v.medioPago,
        vendedorNombre: v.vendedorNombre,
        total: 0,
        unidades: 0,
      };
    }
    porIdVenta[v.idVenta].total += v.total || 0;
    porIdVenta[v.idVenta].unidades += v.cantidad || 0;
  });

  return Object.values(porIdVenta).sort((a, b) => {
    const fa = a.fecha?.toDate ? a.fecha.toDate() : new Date(0);
    const fb = b.fecha?.toDate ? b.fecha.toDate() : new Date(0);
    return fb - fa;
  });
}

/**
 * Actualiza el estado de TODAS las líneas de un pedido (mismo idVenta) a la vez,
 * en un solo batch, para que no queden líneas con estados distintos.
 */
export async function actualizarEstadoPedido(idVenta, nuevoEstado) {
  const q = query(collection(db, "ventas"), where("idVenta", "==", idVenta));
  const snap = await getDocs(q);
  const batch = writeBatch(db);
  snap.docs.forEach((d) => batch.update(doc(db, "ventas", d.id), { estado: nuevoEstado }));
  await batch.commit();
}
