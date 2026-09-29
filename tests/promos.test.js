const test = require("node:test");
const assert = require("node:assert/strict");

async function loadVentas() {
  return import("../lib/promos.js");
}

test("no aplica promo si el carrito no llega al mínimo", async () => {
  const { calcularPromosAplicables } = await loadVentas();
  const items = [{ nombre: "Básica manga cero", cantidad: 2 }];
  const promos = [{ id: "p1", aplicaANombre: "Básica manga cero", cantidadMinima: 3, precioTotalPromo: 100 }];
  const r = calcularPromosAplicables(items, promos);
  assert.deepEqual(r, {});
});

test("aplica la promo cuando el carrito cumple exactamente el mínimo", async () => {
  const { calcularPromosAplicables } = await loadVentas();
  const items = [
    { nombre: "Básica manga cero", cantidad: 2 },
    { nombre: "Básica manga cero", cantidad: 1 },
  ];
  const promos = [{ id: "p1", aplicaANombre: "Básica manga cero", cantidadMinima: 3, precioTotalPromo: 100 }];
  const r = calcularPromosAplicables(items, promos);
  assert.equal(r["Básica manga cero"].promo.id, "p1");
  assert.equal(r["Básica manga cero"].cantidad, 3);
});

test("no confunde promos entre productos distintos", async () => {
  const { calcularPromosAplicables } = await loadVentas();
  const items = [
    { nombre: "Básica manga cero", cantidad: 3 },
    { nombre: "Vestido midi", cantidad: 2 },
  ];
  const promos = [{ id: "p1", aplicaANombre: "Básica manga cero", cantidadMinima: 3, precioTotalPromo: 100 }];
  const r = calcularPromosAplicables(items, promos);
  assert.ok(r["Básica manga cero"]);
  assert.ok(!r["Vestido midi"]);
});
