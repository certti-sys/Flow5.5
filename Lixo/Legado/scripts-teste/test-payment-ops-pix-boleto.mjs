import { readFileSync } from 'node:fs';
import { strict as assert } from 'node:assert';

const source = readFileSync(
  'c:/WWW Projetos/neo-vidya-stream-main/Flow5/supabase/functions/payment-ops/index.ts',
  'utf8'
);

// Verificar que Pix e boleto não exigem token
assert.match(
  source,
  /if \(paymentMethod !== 'pix' && paymentMethod !== 'bolbradesco'\)/
);

// Verificar que o fallback padrão é Pix
assert.match(
  source,
  /const paymentMethod = order\.metadata\?\.payment_method_id \|\| 'pix'/
);

// Verificar que token é obrigatório apenas para cartão
assert.match(
  source,
  /if \(!order\.metadata\?\.token\) throw new Error\("Token obrigatório para pagamentos com cartão"\)/
);

console.log('PASS: payment-ops aceita Pix e boleto sem token de cartão');