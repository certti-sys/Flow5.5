// Contrato do tracking de cliques em campanhas (item 9 das pendências).
import assert from 'node:assert/strict';
import fs from 'node:fs';

const track = fs.readFileSync('supabase/functions/campaign-track/index.ts','utf8');
const send = fs.readFileSync('supabase/functions/send-campaign/index.ts','utf8');
const admin = fs.readFileSync('src/pages/admin/EmailCampaigns.tsx','utf8');

assert.ok(track.includes('action === "click"'), 'edge não trata a=click');
assert.ok(track.includes('clicked_at'), 'edge não grava clicked_at');
assert.ok(track.includes('.is("clicked_at", null)'), 'clique deve ser registrado só uma vez');
assert.ok(track.includes('candidate.protocol === "http:"'), 'allowlist http ausente');
assert.ok(track.includes('candidate.protocol === "https:"'), 'allowlist https ausente');
assert.ok(track.includes('status: 302'), 'click deve redirecionar');
assert.ok(send.includes('a=click&u='), 'envio não reescreve links');
assert.ok(send.includes('encodeURIComponent'), 'destino precisa ser codificado');
assert.ok(admin.includes('clicked_at') && admin.includes('Cliques'), 'tela admin sem coluna Cliques');
assert.ok(admin.includes('engagement?.'), 'tela admin não lê os cliques');

console.log('ok — clique: allowlist http/https, clicked_at uma vez, coluna na admin');
