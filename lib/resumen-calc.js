const WD_NAMES = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

function claveDia(d) {
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

function mismoDia(a, b) {
  return claveDia(a) === claveDia(b);
}

function mismoMes(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

function mismoAnio(a, b) {
  return a.getFullYear() === b.getFullYear();
}

function dentroDeUltimosNDias(fecha, ref, n) {
  const diffMs = ref.setHours(0, 0, 0, 0) - new Date(fecha).setHours(0, 0, 0, 0);
  const diffDias = Math.round(diffMs / 86400000);
  return diffDias >= 0 && diffDias < n;
}

/**
 * Calcula los 4 KPIs (monto, unidades, transacciones, ticket promedio) para
 * el período elegido. `ventas` es un array de { fechaDate, total, cantidad, idVenta }.
 */
export function calcularKPIPeriodo(ventas, periodo, fechaRef = new Date(), fechaSeleccionada = null) {
  let filtradas;
  if (periodo === "dia") {
    const objetivo = fechaSeleccionada || fechaRef;
    filtradas = ventas.filter((v) => mismoDia(v.fechaDate, objetivo));
  } else if (periodo === "semana") {
    filtradas = ventas.filter((v) => dentroDeUltimosNDias(v.fechaDate, new Date(fechaRef), 7));
  } else if (periodo === "mes") {
    filtradas = ventas.filter((v) => mismoMes(v.fechaDate, fechaRef));
  } else {
    filtradas = ventas.filter((v) => mismoAnio(v.fechaDate, fechaRef));
  }

  const monto = filtradas.reduce((s, v) => s + (v.total || 0), 0);
  const unidades = filtradas.reduce((s, v) => s + (v.cantidad || 0), 0);
  const transacciones = new Set(filtradas.map((v) => v.idVenta)).size;
  const ticket = transacciones ? Math.round(monto / transacciones) : 0;

  return { monto, unidades, transacciones, ticket };
}

/**
 * Promedio de monto vendido por día de la semana, usando todo el histórico
 * disponible en `ventas` (para detectar qué día de la semana rinde más).
 */
export function calcularPatronSemanal(ventas) {
  const totales = [0, 0, 0, 0, 0, 0, 0];
  const diasVistos = [new Set(), new Set(), new Set(), new Set(), new Set(), new Set(), new Set()];

  ventas.forEach((v) => {
    const wd = (v.fechaDate.getDay() + 6) % 7; // 0 = Lunes ... 6 = Domingo
    totales[wd] += v.total || 0;
    diasVistos[wd].add(claveDia(v.fechaDate));
  });

  const promedios = totales.map((t, i) => (diasVistos[i].size ? t / diasVistos[i].size : 0));
  const max = Math.max(...promedios, 1);
  const bestIdx = promedios.indexOf(Math.max(...promedios));

  return WD_NAMES.map((name, i) => ({
    name,
    promedio: Math.round(promedios[i]),
    esMejor: i === bestIdx && promedios[i] > 0,
    pct: Math.max(4, Math.round((promedios[i] / max) * 100)),
  }));
}

/** Top productos por unidades vendidas, dentro del mes de fechaRef. */
export function calcularTopProductos(ventas, fechaRef = new Date(), limite = 5) {
  const delMes = ventas.filter((v) => mismoMes(v.fechaDate, fechaRef));
  const porNombre = {};
  delMes.forEach((v) => {
    if (!porNombre[v.nombre]) porNombre[v.nombre] = { nombre: v.nombre, unidades: 0, monto: 0 };
    porNombre[v.nombre].unidades += v.cantidad || 0;
    porNombre[v.nombre].monto += v.total || 0;
  });
  return Object.values(porNombre)
    .sort((a, b) => b.unidades - a.unidades)
    .slice(0, limite);
}

/** Top vendedoras/es por monto vendido, dentro del mes de fechaRef. */
export function calcularTopVendedoras(ventas, fechaRef = new Date(), limite = 5) {
  const delMes = ventas.filter((v) => mismoMes(v.fechaDate, fechaRef));
  const porVendedor = {};
  delMes.forEach((v) => {
    const key = v.vendedorNombre || "—";
    if (!porVendedor[key]) porVendedor[key] = { vendedorNombre: key, monto: 0, unidades: 0, idVentas: new Set() };
    porVendedor[key].monto += v.total || 0;
    porVendedor[key].unidades += v.cantidad || 0;
    porVendedor[key].idVentas.add(v.idVenta);
  });
  return Object.values(porVendedor)
    .map((v) => ({ vendedorNombre: v.vendedorNombre, monto: v.monto, unidades: v.unidades, transacciones: v.idVentas.size }))
    .sort((a, b) => b.monto - a.monto)
    .slice(0, limite);
}
