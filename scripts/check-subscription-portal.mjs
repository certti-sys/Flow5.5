// Contrato F5 do plano de assinaturas: periodicidade no produto + portal.
import assert from 'node:assert/strict';
import fs from 'node:fs';

const config = fs.readFileSync('src/types/checkout-config.ts','utf8');
const form = fs.readFileSync('src/components/admin/ProductFormModal.tsx','utf8');
const page = fs.readFileSync('src/pages/RenewalPage.tsx','utf8');
const migration = fs.readFileSync('supabase/migrations/20261126140000_renewal_portal.sql','utf8');
const app = fs.readFileSync('src/App.tsx','utf8');
const reminders = fs.readFileSync('supabase/functions/subscription-reminders/index.ts','utf8');

for (const i of ['monthly','quarterly','semiannual','annual']) {
  assert.ok(config.includes(`'${i}'`), `intervalo ${i} ausente do tipo`);
  assert.ok(form.includes(`value="${i}"`), `intervalo ${i} ausente do Select`);
}
assert.ok(config.includes('billing: CheckoutBilling'), 'billing ausente do CheckoutConfig');
assert.ok(config.includes('intervals.includes(billing.interval)'), 'normalização de billing ausente');
assert.ok(form.includes('F2) ainda não está ativa'), 'aviso de F2 pendente ausente');
assert.ok(page.includes('get_renewal_info'), 'portal não consulta a RPC');
assert.ok(migration.includes('security definer') && migration.includes('grant execute'), 'RPC do portal sem grant');
assert.ok(app.includes('/renovar/:token'), 'rota de renovação ausente');
assert.ok(reminders.includes('renewal_url'), 'aviso de renovação sem link');

console.log('ok — F5: 4 intervalos, aviso F2, portal e rota');
