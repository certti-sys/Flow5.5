// Checagem do drip content: as regras de liberação que a UI aplica.
// Rodar: npm run check:drip   (usa o Vite só para resolver o alias "@/")
import assert from 'node:assert/strict';
import { createServer } from 'vite';

const server = await createServer({
  server: { middlewareMode: true },
  appType: 'custom',
  logLevel: 'error',
});

try {
  const { releaseColumns, releaseModeOf } = await server.ssrLoadModule(
    '/src/lib/release-schedule.ts',
  );

  // Formulário -> colunas: os dois modos são exclusivos (CHECK no banco).
  assert.deepEqual(
    releaseColumns('none', '7', '2026-12-01'),
    { release_after_days: null, release_at_date: null },
    'modo "imediata" não grava nenhuma regra',
  );
  assert.deepEqual(
    releaseColumns('days', '7', '2026-12-01'),
    { release_after_days: 7, release_at_date: null },
    'modo "dias" grava só os dias',
  );
  assert.deepEqual(
    releaseColumns('date', '7', '2026-12-01'),
    { release_after_days: null, release_at_date: '2026-12-01' },
    'modo "data" grava só a data',
  );

  // Dias inválidos não podem virar `NaN` na coluna — viraria erro de CHECK.
  assert.deepEqual(
    releaseColumns('days', '', ''),
    { release_after_days: null, release_at_date: null },
    'dias vazio não grava nada',
  );
  assert.deepEqual(
    releaseColumns('days', '0', ''),
    { release_after_days: null, release_at_date: null },
    'dias zero não grava nada',
  );
  assert.deepEqual(
    releaseColumns('date', '', ''),
    { release_after_days: null, release_at_date: null },
    'data vazia não grava nada',
  );

  // Colunas -> formulário: reabrir o item tem que mostrar o modo certo.
  assert.equal(releaseModeOf({ release_after_days: null, release_at_date: null }), 'none');
  assert.equal(releaseModeOf({ release_after_days: 7, release_at_date: null }), 'days');
  assert.equal(releaseModeOf({ release_after_days: null, release_at_date: '2026-12-01' }), 'date');

  // Ida e volta: editar sem mexer não pode corromper a regra salva.
  for (const stored of [
    { release_after_days: 30, release_at_date: null },
    { release_after_days: null, release_at_date: '2027-01-15' },
  ]) {
    const mode = releaseModeOf(stored);
    const back = releaseColumns(
      mode,
      stored.release_after_days ? String(stored.release_after_days) : '',
      stored.release_at_date || '',
    );
    assert.deepEqual(back, stored, `ida e volta mudou a regra: ${JSON.stringify(stored)}`);
  }

  console.log('check:drip OK — exclusividade dos modos e ida-e-volta do formulário');
} finally {
  await server.close();
}
