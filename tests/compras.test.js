const test = require("node:test");
const assert = require("node:assert/strict");

async function loadValidation() {
  return import("../lib/validation.js");
}

test("acepta una compra de producto existente válida", async () => {
  const { validarLineaCompra } = await loadValidation();
  const r = validarLineaCompra({
    isNew: false,
    nombre: "Básica manga cero",
    tipo: "Polera",
    color: "Negro",
    talla: "S",
    sku: "DM-BAS-NEG-S",
    cantidad: 10,
    precioCompra: 32,
  });
  assert.equal(r.ok, true);
});

test("acepta un producto nuevo válido con su precio de venta inicial", async () => {
  const { validarLineaCompra } = await loadValidation();
  const r = validarLineaCompra({
    isNew: true,
    nombre: "Crop top",
    tipo: "Polera",
    color: "Mostaza",
    talla: "M",
    sku: "DM-POL-MOS-M",
    cantidad: 5,
    precioCompra: 28,
    precioVentaInicial: 55,
  });
  assert.equal(r.ok, true);
});

test("rechaza cantidad negativa en una compra", async () => {
  const { validarLineaCompra } = await loadValidation();
  const r = validarLineaCompra({
    isNew: false, nombre: "Básica manga cero", cantidad: -3, precioCompra: 32,
  });
  assert.equal(r.ok, false);
});

test("rechaza producto nuevo sin nombre (texto vacío)", async () => {
  const { validarLineaCompra } = await loadValidation();
  const r = validarLineaCompra({
    isNew: true, nombre: "", tipo: "Polera", color: "Negro", talla: "S",
    sku: "DM-POL-NEG-S", cantidad: 1, precioCompra: 30, precioVentaInicial: 60,
  });
  assert.equal(r.ok, false);
});

test("rechaza intento de inyección en el nombre de un producto nuevo", async () => {
  const { validarLineaCompra } = await loadValidation();
  const r = validarLineaCompra({
    isNew: true, nombre: "<img src=x onerror=alert(1)>", tipo: "Polera", color: "Negro", talla: "S",
    sku: "DM-POL-NEG-S", cantidad: 1, precioCompra: 30, precioVentaInicial: 60,
  });
  assert.equal(r.ok, false);
});
