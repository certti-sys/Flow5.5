// Contrato F1+F3 do modelo híbrido de assinaturas.
import assert from 'node:assert/strict';
import fs from 'node:fs';

const schema = fs.readFileSync('supabase/migrations/20261126090000_subscriptions_access.sql','utf8');
const drip = fs.readFileSync('supabase/migrations/20261126121000_drip_subscription_guard.sql','utf8');
const email = fs.readFileSync('supabase/migrations/20261126100000_drip_release_email.sql','utf8');
const fileUrl = fs.readFileSync('supabase/functions/lesson-file-url/index.ts','utf8');
const progress = fs.readFileSync('supabase/functions/lesson-progress/index.ts','utf8');

assert.ok(schema.includes("'expired','revoked'"), 'status da assinatura não ampliado');
assert.ok(schema.includes('expires_at'), 'user_course_access sem expires_at');
assert.ok(schema.includes('access_status'), 'user_course_access sem estado');
assert.ok(schema.includes("('active', 'blocked', 'revoked')"), 'CHECK de access_status ausente');
assert.ok(schema.includes('granted_at'), 'schema precisa documentar a âncora do drip');
assert.ok(schema.includes('subscription_notifications'), 'tabela de dedupe ausente');
assert.ok(schema.includes('subscription_access_active'), 'função de histórico ausente');
assert.ok(schema.includes('subscription_content_unlocked'), 'função de conteúdo novo ausente');
assert.ok(schema.includes("in ('active', 'blocked')"), 'blocked precisa passar no histórico');
assert.ok(drip.includes('get_course_release_map_for'), 'variante service_role não atualizada');
assert.ok(drip.includes('subscription_content_unlocked'), 'drip não checa assinatura');
assert.ok(drip.includes("now() + interval '1 day'"), 'bloqueio precisa devolver item travado');
assert.ok(email.includes('subscription_content_unlocked'), 'e-mail de drip ignora bloqueio');

// As edges usam a variante _for: bloqueio propaga sem mudar código delas.
assert.ok(fileUrl.includes('get_course_release_map_for'), 'lesson-file-url não usa a RPC');
assert.ok(progress.includes('get_course_release_map_for'), 'lesson-progress não usa a RPC');

console.log('ok — F1+F3: status, expires_at, funções, dedupe e drip com bloqueio');
