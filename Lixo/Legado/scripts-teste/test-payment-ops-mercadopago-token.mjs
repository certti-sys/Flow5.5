import { readFileSync } from 'node:fs';
import { strict as assert } from 'node:assert';

const source = readFileSync(
  'c:/WWW Projetos/neo-vidya-stream-main/Flow5/supabase/functions/payment-ops/index.ts',
  'utf8'
);

assert.doesNotMatch(
  source,
  /credentials\.access_token\s*\|\|\s*credentials\.secret_key\s*\|\|\s*credentials\.public_key/
);

assert.match(
  source,
  /const token = credentials\.access_token \|\| credentials\.secret_key;/
);

console.log('PASS: payment-ops usa apenas credenciais secretas para Mercado Pago');
