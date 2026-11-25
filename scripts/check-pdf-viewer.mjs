// Checagem do leitor de PDF: escada de zoom.
// Rodar: npm run check:pdf
import assert from 'node:assert/strict';
import { createServer } from 'vite';

const server = await createServer({
  server: { middlewareMode: true },
  appType: 'custom',
  logLevel: 'error',
});

try {
  const { ZOOM_STEPS, nextZoom } = await server.ssrLoadModule('/src/lib/pdf-viewer.ts');

  assert.deepEqual(ZOOM_STEPS, [0.5, 0.75, 1, 1.25, 1.5, 2, 2.5, 3]);

  // A partir da escala padrão.
  assert.equal(nextZoom(1, 1), 1.25, 'aumentar a partir de 100%');
  assert.equal(nextZoom(1, -1), 0.75, 'diminuir a partir de 100%');

  // Limites não estouram o array.
  assert.equal(nextZoom(3, 1), 3, 'máximo fica no máximo');
  assert.equal(nextZoom(0.5, -1), 0.5, 'mínimo fica no mínimo');

  // Escala arbitrária cai no degrau vizinho, não em `atual ± passo`.
  assert.equal(nextZoom(1.1, 1), 1.25);
  assert.equal(nextZoom(1.1, -1), 1);
  assert.equal(nextZoom(2.9, 1), 3);

  console.log('check:pdf OK — escada de zoom');
} finally {
  await server.close();
}
