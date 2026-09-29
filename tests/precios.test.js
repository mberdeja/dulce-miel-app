const test = require("node:test");
const assert = require("node:assert/strict");

async function loadValidation() {
  return import("../lib/validation.js");
}

test("acepta un margen válido (100% = 1.0)", async () => {
  const { margenSchema } = await loadValidation();
  assert.equal(margenSchema.safeParse(1).success, true);
});

test("rechaza un margen negativo", async () => {
  const { margenSchema } = await loadValidation();
  assert.equal(margenSchema.safeParse(-0.5).success, false);
});

test("acepta una promoción válida", async () => {
  const { promocionSchema } = await loadValidation();
  const r = promocionSchema.safeParse({
    nombre: "3x100 Bs Básicas",
    aplicaANombre: "Básica manga cero",
    cantidadMinima: 3,
    precioTotalPromo: 100,
  });
  assert.equal(r.success, true);
});

test("rechaza una promoción con nombre con código malicioso", async () => {
  const { promocionSchema } = await loadValidation();
  const r = promocionSchema.safeParse({
    nombre: "<script>alert(1)</script>",
    aplicaANombre: "Básica manga cero",
    cantidadMinima: 3,
    precioTotalPromo: 100,
  });
  assert.equal(r.success, false);
});

test("rechaza una promoción con cantidad mínima en cero", async () => {
  const { promocionSchema } = await loadValidation();
  const r = promocionSchema.safeParse({
    nombre: "Promo test",
    aplicaANombre: "Básica manga cero",
    cantidadMinima: 0,
    precioTotalPromo: 100,
  });
  assert.equal(r.success, false);
});
