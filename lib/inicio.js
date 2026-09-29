import { collection, query, where, getDocs, Timestamp } from "firebase/firestore";
import { db } from "./firebase";
import { fetchInventario } from "./inventario";

function inicioDeHoy() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function fetchResumenInicio() {
  const desde = Timestamp.fromDate(inicioDeHoy());

  const [ventasHoySnap, pendientesSnap, inventario] = await Promise.all([
    getDocs(query(collection(db, "ventas"), where("fecha", ">=", desde))),
    getDocs(query(collection(db, "ventas"), where("estado", "in", ["Por recoger", "Pendiente de envío"]))),
    fetchInventario(),
  ]);

  const ventasHoy = ventasHoySnap.docs.map((d) => d.data());
  const montoHoy = ventasHoy.reduce((s, v) => s + (v.total || 0), 0);
  const unidadesHoy = ventasHoy.reduce((s, v) => s + (v.cantidad || 0), 0);

  const idsUnicosPendientes = new Set(pendientesSnap.docs.map((d) => d.data().idVenta));

  return {
    montoHoy,
    unidadesHoy,
    pedidosPendientes: idsUnicosPendientes.size,
    stockBajoCount: inventario.filter((p) => p.stockBajo).length,
  };
}
