const test = require("node:test");
const assert = require("node:assert/strict");

async function loadValidation() {
  return import("../lib/validation.js");
}

test("acepta un stock mínimo válido", async () => {
  const { stockMinimoSchema } = await loadValidation();
  const r = stockMinimoSchema.safeParse(5);
  assert.equal(r.success, true);
});

test("rechaza un stock mínimo negativo", async () => {
  const { stockMinimoSchema } = await loadValidation();
  const r = stockMinimoSchema.safeParse(-1);
  assert.equal(r.success, false);
});

test("rechaza un stock mínimo no entero", async () => {
  const { stockMinimoSchema } = await loadValidation();
  const r = stockMinimoSchema.safeParse(2.5);
  assert.equal(r.success, false);
});
