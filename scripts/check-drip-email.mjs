// Contrato do e-mail de liberação do drip (item 7 das pendências).
// A RPC é só service_role e a edge não pode usar auth.uid().
import assert from 'node:assert/strict';
import fs from 'node:fs';

const migration = fs.readFileSync('supabase/migrations/20261126100000_drip_release_email.sql','utf8');
const cron = fs.readFileSync('supabase/migrations/20261126101000_drip_release_cron.sql','utf8');
const edge = fs.readFileSync('supabase/functions/drip-release-email/index.ts','utf8');
const queue = fs.readFileSync('supabase/functions/_shared/email-queue.ts','utf8');
const settings = fs.readFileSync('src/pages/admin/EmailSettings.tsx','utf8');

assert.ok(migration.includes("grant execute on function public.get_drip_releases_for_date(date) to service_role"), 'RPC precisa ser só service_role');
assert.ok(!migration.includes('to authenticated') || !migration.includes('get_drip_releases_for_date(date) to authenticated'), 'RPC vazou para authenticated');
assert.ok(migration.includes("at time zone 'America/Sao_Paulo'"), 'fuso de Brasília obrigatório');
assert.ok(migration.includes('greatest('), 'aula travada = max(aula, módulo)');
assert.ok(migration.includes('drip_release_notifications'), 'tabela de dedupe ausente');
assert.ok(migration.includes('email_opt_outs'), 'opt-out não respeitado na RPC');
assert.ok(cron.includes("cron.schedule('drip-release-email', '0 12 * * *'"), 'cron diário às 12:00 UTC');
assert.ok(edge.includes('dryRun'), 'edge sem modo dryRun');
assert.ok(edge.includes("type: 'notification'"), 'e-mail deve usar tipo notification');
assert.ok(edge.includes('drip-release-email'), 'source ausente no log');
assert.ok(queue.includes('"notification"'), 'notification precisa respeitar opt-out');
assert.ok(settings.includes('id: "notification"'), 'template notification ausente no admin');

console.log('ok — drip email: RPC service_role, dedupe, opt-out, cron e template');
