import { readFileSync } from 'node:fs';
import { strict as assert } from 'node:assert';

const source = readFileSync(
  'c:/WWW Projetos/neo-vidya-stream-main/Flow5/supabase/functions/payment-ops/index.ts',
  'utf8'
);

assert.match(source, /action:\s*z\.enum\(\['create_paymentIntent', 'check_payment_status'\]\)/);
assert.match(source, /gatewayId:\s*z\.string\(\)\.optional\(\)/);
assert.match(source, /payment_method_id:\s*z\.string\(\)\.optional\(\)/);
assert.match(source, /discountAmount:\s*z\.number\(\)\.optional\(\)/);
assert.match(source, /couponId:\s*z\.string\(\)\.uuid\(\)\.nullable\(\)\.optional\(\)/);
assert.match(source, /couponCode:\s*z\.string\(\)\.nullable\(\)\.optional\(\)/);
assert.match(source, /orderBumps:\s*z\.array\(z\.string\(\)\)\.optional\(\)/);

console.log('PASS: payment-ops expõe o contrato mínimo esperado pelo checkout');
