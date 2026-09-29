const test = require("node:test");
const assert = require("node:assert/strict");

// Next.js compila con ESM/JSX vía SWC; para poder correr estas pruebas con
// el runner nativo de Node (sin instalar nada extra) usamos require() sobre
// una copia transpilable simple: como validation.js es ESM puro (sin JSX),
// lo cargamos con la bandera --experimental-vm-modules a través de import()
// dinámico dentro de un wrapper async.

async function loadValidation() {
  return import("../lib/validation.js");
}

test("rechaza cantidad negativa o cero", async () => {
  const { itemVentaSchema } = await loadValidation();
  const r = itemVentaSchema.safeParse({
    productoId: "abc",
    sku: "DM-BAS-NEG-S",
    nombre: "Básica manga cero",
    talla: "S",
    precio: 65,
    cantidad: 0,
  });
  assert.equal(r.success, false);
});

test("rechaza precio negativo", async () => {
  const { itemVentaSchema } = await loadValidation();
  const r = itemVentaSchema.safeParse({
    productoId: "abc",
    sku: "DM-BAS-NEG-S",
    nombre: "Básica manga cero",
    talla: "S",
    precio: -10,
    cantidad: 1,
  });
  assert.equal(r.success, false);
});

test("rechaza un nombre de cliente con <script> disfrazado de texto normal", async () => {
  const { clienteSchema } = await loadValidation();
  const r = clienteSchema.safeParse('<script>alert(1)</script>');
  assert.equal(r.success, false);
});

test("rechaza un intento de inyectar un manejador de evento (onerror=)", async () => {
  const { clienteSchema } = await loadValidation();
  const r = clienteSchema.safeParse('@usuaria" onerror="alert(1)');
  assert.equal(r.success, false);
});

test("rechaza un pseudo-protocolo javascript:", async () => {
  const { clienteSchema } = await loadValidation();
  const r = clienteSchema.safeParse("javascript:alert(1)");
  assert.equal(r.success, false);
});

test("acepta un usuario de TikTok normal", async () => {
  const { clienteSchema } = await loadValidation();
  const r = clienteSchema.safeParse("@valeria_sc");
  assert.equal(r.success, true);
});

test("acepta un formulario de venta válido de punta a punta", async () => {
  const { validarFormularioVenta } = await loadValidation();
  const r = validarFormularioVenta({
    items: [
      { productoId: "p1", sku: "DM-BAS-NEG-S", nombre: "Básica manga cero", talla: "S", precio: 65, cantidad: 2 },
    ],
    medioPago: "Efectivo",
    tipoEntrega: "Recoge en tienda",
    cliente: "@usuaria_1",
  });
  assert.equal(r.ok, true);
});

test("rechaza el formulario si el medio de pago no está en la lista permitida", async () => {
  const { validarFormularioVenta } = await loadValidation();
  const r = validarFormularioVenta({
    items: [
      { productoId: "p1", sku: "DM-BAS-NEG-S", nombre: "Básica manga cero", talla: "S", precio: 65, cantidad: 1 },
    ],
    medioPago: "Bitcoin",
    tipoEntrega: "Recoge en tienda",
    cliente: "",
  });
  assert.equal(r.ok, false);
});

test("rechaza el formulario sin productos en el carrito", async () => {
  const { validarFormularioVenta } = await loadValidation();
  const r = validarFormularioVenta({ items: [], medioPago: "Efectivo", tipoEntrega: "Recoge en tienda", cliente: "" });
  assert.equal(r.ok, false);
});
