const test = require("node:test");
const assert = require("node:assert/strict");

async function loadResumenCalc() {
  return import("../lib/resumen-calc.js");
}

function v(fechaISO, { total = 0, cantidad = 0, idVenta = "V1", nombre = "Producto", vendedorNombre = "Ana" } = {}) {
  return { fechaDate: new Date(fechaISO), total, cantidad, idVenta, nombre, vendedorNombre };
}

test("KPI de día: solo cuenta las ventas de esa fecha exacta", async () => {
  const { calcularKPIPeriodo } = await loadResumenCalc();
  const ventas = [
    v("2026-09-21T10:00:00", { total: 100, cantidad: 2, idVenta: "V1" }),
    v("2026-09-20T10:00:00", { total: 999, cantidad: 9, idVenta: "V2" }),
  ];
  const r = calcularKPIPeriodo(ventas, "dia", new Date("2026-09-21T12:00:00"), new Date("2026-09-21T00:00:00"));
  assert.equal(r.monto, 100);
  assert.equal(r.unidades, 2);
  assert.equal(r.transacciones, 1);
});

test("KPI de mes: agrupa transacciones distintas por idVenta, no por línea", async () => {
  const { calcularKPIPeriodo } = await loadResumenCalc();
  const ventas = [
    v("2026-09-05T10:00:00", { total: 60, cantidad: 1, idVenta: "V1" }),
    v("2026-09-05T10:00:00", { total: 40, cantidad: 1, idVenta: "V1" }), // misma venta, otra línea
    v("2026-09-10T10:00:00", { total: 100, cantidad: 2, idVenta: "V2" }),
  ];
  const r = calcularKPIPeriodo(ventas, "mes", new Date("2026-09-30T00:00:00"));
  assert.equal(r.monto, 200);
  assert.equal(r.transacciones, 2);
  assert.equal(r.ticket, 100);
});

test("patrón semanal identifica el día con mejor promedio", async () => {
  const { calcularPatronSemanal } = await loadResumenCalc();
  const ventas = [
    v("2026-09-19T10:00:00", { total: 500 }), // sábado
    v("2026-09-12T10:00:00", { total: 500 }), // sábado
    v("2026-09-21T10:00:00", { total: 50 }),  // lunes
  ];
  const r = calcularPatronSemanal(ventas);
  const sabado = r.find((d) => d.name === "Sáb");
  assert.equal(sabado.esMejor, true);
});

test("top productos ordena por unidades vendidas, solo del mes de referencia", async () => {
  const { calcularTopProductos } = await loadResumenCalc();
  const ventas = [
    v("2026-09-05T10:00:00", { cantidad: 5, nombre: "Básica manga cero" }),
    v("2026-09-06T10:00:00", { cantidad: 2, nombre: "Vestido midi" }),
    v("2026-08-01T10:00:00", { cantidad: 100, nombre: "Fuera de mes" }),
  ];
  const r = calcularTopProductos(ventas, new Date("2026-09-30T00:00:00"));
  assert.equal(r[0].nombre, "Básica manga cero");
  assert.equal(r.some((p) => p.nombre === "Fuera de mes"), false);
});

test("top vendedoras suma monto y cuenta transacciones distintas", async () => {
  const { calcularTopVendedoras } = await loadResumenCalc();
  const ventas = [
    v("2026-09-05T10:00:00", { total: 100, idVenta: "V1", vendedorNombre: "Ana" }),
    v("2026-09-05T10:00:00", { total: 50, idVenta: "V1", vendedorNombre: "Ana" }),
    v("2026-09-06T10:00:00", { total: 300, idVenta: "V2", vendedorNombre: "Melissa" }),
  ];
  const r = calcularTopVendedoras(ventas, new Date("2026-09-30T00:00:00"));
  assert.equal(r[0].vendedorNombre, "Melissa");
  const ana = r.find((v2) => v2.vendedorNombre === "Ana");
  assert.equal(ana.monto, 150);
  assert.equal(ana.transacciones, 1);
});
