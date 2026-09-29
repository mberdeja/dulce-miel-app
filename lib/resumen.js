import { collection, query, where, getDocs, Timestamp } from "firebase/firestore";
import { db } from "./firebase";

export async function fetchVentasParaResumen() {
  const hace400Dias = new Date();
  hace400Dias.setDate(hace400Dias.getDate() - 400);

  const q = query(collection(db, "ventas"), where("fecha", ">=", Timestamp.fromDate(hace400Dias)));
  const snap = await getDocs(q);

  return snap.docs
    .map((d) => d.data())
    .filter((v) => v.fecha && v.fecha.toDate) // ignora líneas donde el serverTimestamp aún no se resolvió
    .map((v) => ({
      fechaDate: v.fecha.toDate(),
      total: v.total || 0,
      cantidad: v.cantidad || 0,
      idVenta: v.idVenta,
      nombre: v.nombre,
      vendedorNombre: v.vendedorNombre,
    }));
}
