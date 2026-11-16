// Autoverificação de `src/lib/pixels.ts` — `node --test` sem bundler.
// Copia a lógica pura (shouldFire/purchaseSlice) porque o módulo importa o
// client do Supabase, que não carrega fora do Vite.
//
// Rodar: node --test scripts/pixels-flags.test.mjs

import test from "node:test";
import assert from "node:assert/strict";

const trim = {
  fire_purchase_on_pix: true,
  fire_purchase_on_boleto: true,
  disable_order_bump_events: false,
};

function shouldFire(cfg, options) {
  if (options.isOrderBump && cfg.disable_order_bump_events) return false;
  if (options.triggerType === "pix" && cfg.fire_purchase_on_pix === false) return false;
  if (options.triggerType === "boleto" && cfg.fire_purchase_on_boleto === false) return false;
  return true;
}

function purchaseSlice(value, items, cfg) {
  if (!cfg.disable_order_bump_events || items.length === 0) return { value, items };
  const kept = items.filter((i) => i.kind !== "order_bump");
  if (kept.length === 0) return { value: 0, items: [] };
  return { value: kept.reduce((s, i) => s + i.amount, 0), items: kept };
}

test("defaults disparam em todos os gatilhos", () => {
  for (const triggerType of ["approved", "pix", "boleto"]) {
    assert.equal(shouldFire(trim, { triggerType }), true);
  }
  assert.equal(shouldFire(trim, { isOrderBump: true }), true);
});

test("fire_purchase_on_pix=false bloqueia só pix", () => {
  const cfg = { ...trim, fire_purchase_on_pix: false };
  assert.equal(shouldFire(cfg, { triggerType: "pix" }), false);
  assert.equal(shouldFire(cfg, { triggerType: "boleto" }), true);
  assert.equal(shouldFire(cfg, { triggerType: "approved" }), true);
});

test("fire_purchase_on_boleto=false bloqueia só boleto", () => {
  const cfg = { ...trim, fire_purchase_on_boleto: false };
  assert.equal(shouldFire(cfg, { triggerType: "boleto" }), false);
  assert.equal(shouldFire(cfg, { triggerType: "pix" }), true);
});

test("disable_order_bump_events bloqueia Purchase com bump", () => {
  const cfg = { ...trim, disable_order_bump_events: true };
  assert.equal(shouldFire(cfg, { isOrderBump: true }), false);
  assert.equal(shouldFire(cfg, { isOrderBump: false }), true);
});

test("purchaseSlice mantém valor quando a flag está desligada", () => {
  const items = [
    { productId: "a", amount: 10000, kind: "main" },
    { productId: "b", amount: 2500, kind: "order_bump" },
  ];
  const out = purchaseSlice(12500, items, trim);
  assert.equal(out.value, 12500);
  assert.equal(out.items.length, 2);
});

test("purchaseSlice remove o bump e recalcula o valor", () => {
  const items = [
    { productId: "a", amount: 10000, kind: "main" },
    { productId: "b", amount: 2500, kind: "order_bump" },
  ];
  const out = purchaseSlice(12500, items, { ...trim, disable_order_bump_events: true });
  assert.equal(out.value, 10000);
  assert.deepEqual(out.items.map((i) => i.productId), ["a"]);
});

test("pedido só de bump não vira conversão", () => {
  const out = purchaseSlice(2500, [{ productId: "b", amount: 2500, kind: "order_bump" }], {
    ...trim,
    disable_order_bump_events: true,
  });
  assert.equal(out.value, 0);
  assert.equal(out.items.length, 0);
});
