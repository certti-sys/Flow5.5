import { readFileSync } from 'node:fs';
import { strict as assert } from 'node:assert';

const source = readFileSync(
  'C:/WWW Projetos/neo-vidya-stream-main/Flow5/.claude/worktrees/agent-acb7f926/supabase/functions/payment-ops/index.ts',
  'utf8'
);

// Verificar campos obrigatórios do contrato
assert.match(source, /action:\s*z\.enum\(\['create_paymentIntent', 'check_payment_status'\]\)/);
assert.match(source, /gatewayId:\s*z\.string\(\)\.optional\(\)/);
assert.match(source, /payment_method_id:\s*z\.string\(\)\.optional\(\)/);

// Verificar campos enviados pelo frontend atual
assert.match(source, /productId:\s*z\.string\(\)\.optional\(\)/);
assert.match(source, /token:\s*z\.string\(\)\.optional\(\)/);
assert.match(source, /installments:\s*z\.number\(\)\.optional\(\)/);
assert.match(source, /issuer_id:\s*z\.string\(\)\.optional\(\)/);
assert.match(source, /idempotencyKey:\s*z\.string\(\)\.optional\(\)/);
assert.match(source, /cpf:\s*z\.string\(\)\.optional\(\)/);
assert.match(source, /name:\s*z\.string\(\)\.optional\(\)/);
assert.match(source, /email:\s*z\.string\(\)\.email\(\)\.optional\(\)/);
assert.match(source, /phone:\s*z\.string\(\)\.optional\(\)/);
assert.match(source, /amount:\s*z\.number\(\)\.optional\(\)/);
assert.match(source, /orderBumps:\s*z\.array\(z\.string\(\)\)\.optional\(\)/);

// Verificar campos de cupom enviados pelo frontend
assert.match(source, /couponId:\s*z\.string\(\)\.optional\(\)/);
assert.match(source, /couponCode:\s*z\.string\(\)\.optional\(\)/);
assert.match(source, /discountAmount:\s*z\.number\(\)\.optional\(\)/);

console.log('PASS: payment-ops expõe o contrato mínimo esperado pelo checkout');
