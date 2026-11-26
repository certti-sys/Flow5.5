// Contrato do pipeline de webhooks de saída (item 4 das pendências).
import assert from 'node:assert/strict';
import fs from 'node:fs';

const catalogo = fs.readFileSync('src/components/admin/webhook/WebhookOutbound.tsx','utf8');
const dispatch = fs.readFileSync('supabase/functions/_shared/webhook-dispatch.ts','utf8');
const receiver = fs.readFileSync('supabase/functions/webhook-test-receiver/index.ts','utf8');
const migration = fs.readFileSync('supabase/migrations/20261126110000_webhook_test_receiver.sql','utf8');

const eventos = [...catalogo.matchAll(/value: "([a-z_.]+)"/g)].map(m=>m[1]);
assert.equal(eventos.length, 14, `catálogo tem ${eventos.length} eventos, esperado 14`);
for (const e of ['order.paid','cart.abandoned','access.ready','subscription.created','subscription.renewed','subscription.canceled','subscription.past_due']) {
  assert.ok(eventos.includes(e), `evento ${e} ausente do catálogo`);
}
assert.ok(dispatch.includes('Authorization: `Bearer ${endpoint.bearer_token}`'), 'dispatch não envia bearer');
assert.ok(dispatch.includes('X-Flow-Signature'), 'dispatch não assina');
assert.ok(receiver.includes('X-Flow-Signature'), 'receptor não valida assinatura');
assert.ok(receiver.includes('expectedBearer'), 'receptor não valida bearer');
assert.ok(receiver.includes('webhook_test_receipts'), 'receptor não grava receipt');
assert.ok(migration.includes('has_role'), 'RLS do receipt não é admin-only');

console.log('ok — 14 eventos, HMAC, bearer e receptor de teste com RLS');
