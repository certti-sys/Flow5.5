import { readFileSync } from 'node:fs';
import { strict as assert } from 'node:assert';

const source = readFileSync(
  'c:/WWW Projetos/neo-vidya-stream-main/Flow5/supabase/functions/validate-coupon/index.ts',
  'utf8'
);

const allowHeadersMatch = source.match(/Access-Control-Allow-Headers'\s*:\s*'([^']+)'/);
assert.ok(allowHeadersMatch, 'Access-Control-Allow-Headers não encontrado');

const allowedHeaders = allowHeadersMatch[1]
  .split(',')
  .map((header) => header.trim().toLowerCase());

assert.ok(
  allowedHeaders.includes('x-requested-with'),
  `CORS não permite x-requested-with. Headers atuais: ${allowedHeaders.join(', ')}`
);

console.log('PASS: validate-coupon permite x-requested-with no CORS');
