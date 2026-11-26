// Contrato do tracking de cliques em campanhas (item 9 das pendências).
import assert from 'node:assert/strict';
import fs from 'node:fs';

const track = fs.readFileSync('supabase/functions/campaign-track/index.ts','utf8');
const send = fs.readFileSync('supabase/functions/send-campaign/index.ts','utf8');
const shared = fs.readFileSync('supabase/functions/_shared/campaign-tracking.ts','utf8');
const preview = fs.readFileSync('supabase/functions/preview-campaign/index.ts','utf8');
const editor = fs.readFileSync('src/components/IframeEmailEditor.tsx','utf8');
const helpers = fs.readFileSync('src/lib/inline-email.ts','utf8');
const admin = fs.readFileSync('src/pages/admin/EmailCampaigns.tsx','utf8');

assert.ok(track.includes('action === "click"'), 'edge não trata a=click');
assert.ok(track.includes('clicked_at'), 'edge não grava clicked_at');
assert.ok(track.includes('.is("clicked_at", null)'), 'clique deve ser registrado só uma vez');
assert.ok(track.includes('candidate.protocol === "http:"'), 'allowlist http ausente');
assert.ok(track.includes('candidate.protocol === "https:"'), 'allowlist https ausente');
assert.ok(track.includes('status: 302'), 'click deve redirecionar');
assert.ok(shared.includes('a=click&u='), 'helper não reescreve links');
assert.ok(send.includes('withCampaignTracking(campaign.body_html'), 'envio não usa o helper');
assert.ok(preview.includes('withCampaignTracking(html'), 'preview não usa o mesmo helper');
assert.ok(shared.includes('encodeURIComponent'), 'destino precisa ser codificado');
assert.ok(admin.includes('livePreview'), 'editor sem preview ao vivo');
assert.ok(shared.includes('data-flow-tracking'), 'tracking sem marcador para o editor');
assert.ok(editor.includes('sandbox="allow-same-origin"'), 'editor nao isola o CSS do e-mail');
assert.ok(editor.includes('documentElement.outerHTML'), 'editor nao preserva o documento completo');
assert.ok(helpers.includes('data-flow-tracking') && helpers.includes('remove()'), 'editor nao protege rodape/pixel');
assert.ok(helpers.includes('decodeURIComponent'), 'editor nao desfaz a reescrita de links');
assert.ok(editor.includes('Salvar edição'), 'editor sem botao de salvar');
assert.ok(admin.includes('duplicateAsDraft'), 'campanha enviada sem opção de duplicar');
assert.ok(admin.includes('.select().single()'), 'save não confirma a gravação');
assert.ok(admin.includes('clicked_at') && admin.includes('Cliques'), 'tela admin sem coluna Cliques');
assert.ok(admin.includes('engagement?.'), 'tela admin não lê os cliques');

console.log('ok — clique: allowlist http/https, clicked_at uma vez, editor em iframe preserva o HTML');
