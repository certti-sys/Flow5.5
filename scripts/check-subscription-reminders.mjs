// Contrato F4 das notificações de assinatura.
import assert from 'node:assert/strict';
import fs from 'node:fs';

const migration = fs.readFileSync('supabase/migrations/20261126130000_subscription_reminders.sql','utf8');
const cron = fs.readFileSync('supabase/migrations/20261126131000_subscription_reminders_cron.sql','utf8');
const final = fs.readFileSync('supabase/migrations/20261126133000_subscription_reminders_final.sql','utf8');
const edge = fs.readFileSync('supabase/functions/subscription-reminders/index.ts','utf8');
const queue = fs.readFileSync('supabase/functions/_shared/email-queue.ts','utf8');

for (const kind of ['expiry_warning','renewal','renewal_confirmed']) {
  assert.ok(migration.includes(kind), `kind ${kind} ausente da RPC`);
  assert.ok(edge.includes(`subscription_${kind}` === 'subscription_renewal_confirmed' ? 'subscription_renewal_confirmed' : `subscription_${kind}`), `template de ${kind} ausente na edge`);
}
assert.ok(migration.includes("grant execute on function public.get_subscription_reminders(date) to service_role"), 'RPC não é só service_role');
assert.ok(migration.includes('email_opt_outs'), 'opt-out não respeitado');
assert.ok(migration.includes('subscription_notifications'), 'dedupe ausente');
assert.ok(edge.includes('dryRun'), 'edge sem dryRun');
assert.ok(edge.includes("type: 'notification'"), 'e-mail deve usar notification');
assert.ok(final.includes("updated_at >  b.created_at + interval '1 minute'"), 'renovação confirmada sem detectar atualização real');
assert.ok(cron.includes("cron.schedule('subscription-reminders', '0 13 * * *'"), 'cron diário 13h UTC ausente');
assert.ok(queue.includes('"notification"'), 'notification precisa respeitar opt-out');

console.log('ok — F4: 3 avisos, dedupe, opt-out, cron e dryRun');
