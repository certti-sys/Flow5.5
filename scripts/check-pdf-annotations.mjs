// Checagem das marcações do leitor de PDF: normalização, retângulo e limites.
// Rodar: npm run check:annotations
import assert from 'node:assert/strict';
import { createServer } from 'vite';

const server = await createServer({
  server: { middlewareMode: true },
  appType: 'custom',
  logLevel: 'error',
});

try {
  const {
    HIGHLIGHT_COLORS,
    MAX_HIGHLIGHTS,
    isHighlightColor,
    normalizeHighlights,
    rectFromPoints,
    isHighlightable,
    MIN_HIGHLIGHT_SIZE,
  } = await server.ssrLoadModule('/src/lib/pdf-annotations.ts');

  assert.deepEqual([...HIGHLIGHT_COLORS], ['yellow', 'green', 'pink']);
  assert.equal(isHighlightColor('yellow'), true);
  assert.equal(isHighlightColor('blue'), false);
  assert.equal(MAX_HIGHLIGHTS, 500);

  // Válido sobrevive; lixo é descartado sem derrubar os outros.
  const ok = { id: 'a', page: 2, color: 'green', x: 0.1, y: 0.2, width: 0.3, height: 0.05 };
  assert.deepEqual(normalizeHighlights([ok, null, 42, { ...ok, id: 'b', color: 'blue' }]), [ok]);

  // Coordenada fora da página é grampeada em 0..1, não descartada.
  const clamped = normalizeHighlights([{ ...ok, x: -0.4, y: 1.8, width: 2 }])[0];
  assert.deepEqual([clamped.x, clamped.y, clamped.width], [0, 1, 1]);

  // Página é número inteiro ≥ 1.
  assert.deepEqual(normalizeHighlights([{ ...ok, page: 0 }]), []);
  assert.equal(normalizeHighlights([{ ...ok, page: '3' }])[0].page, 3);

  // Teto de 500: o que passa é cortado, não rejeitado em bloco.
  const many = Array.from({ length: MAX_HIGHLIGHTS + 10 }, (_, i) => ({ ...ok, id: `h${i}` }));
  assert.equal(normalizeHighlights(many).length, MAX_HIGHLIGHTS);

  // Arrastar em qualquer direção dá o mesmo retângulo normalizado.
  assert.deepEqual(rectFromPoints({ x: 0.5, y: 0.5 }, { x: 0.2, y: 0.1 }), {
    x: 0.2, y: 0.1, width: 0.3, height: 0.4,
  });
  assert.deepEqual(rectFromPoints({ x: 0.2, y: 0.1 }, { x: 0.5, y: 0.5 }), {
    x: 0.2, y: 0.1, width: 0.3, height: 0.4,
  });

  // Clique (arrasto zero) não vira marcação.
  assert.equal(isHighlightable({ width: 0, height: 0 }), false);
  assert.equal(isHighlightable({ width: MIN_HIGHLIGHT_SIZE, height: MIN_HIGHLIGHT_SIZE }), true);

  console.log('check:annotations OK - normalizacao, retangulo e limites');
} finally {
  await server.close();
}
