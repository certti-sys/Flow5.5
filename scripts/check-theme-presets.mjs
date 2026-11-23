// Checagem do preset global: tokens esperados e contraste WCAG do CTA.
// Rodar: npm run check:theme   (usa o Vite só para resolver o alias "@/")
import assert from 'node:assert/strict';
import { createServer } from 'vite';

const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });
try {
  const { buildPresetVariables, presetRadiusVariables } = await server.ssrLoadModule('/src/lib/colorGenerator.ts');
  const { THEME_PRESETS } = await server.ssrLoadModule('/src/types/theme-presets.ts');

  // HSL -> luminância relativa (mesma conta do colorGenerator).
  const lum = (hsl) => {
    const [h, s, l] = hsl.split(' ').map(parseFloat);
    const a = (s / 100) * Math.min(l / 100, 1 - l / 100);
    const f = (n) => {
      const k = (n + h / 30) % 12;
      return (l / 100) - a * Math.max(-1, Math.min(k - 3, Math.min(9 - k, 1)));
    };
    const lin = (v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
    return 0.2126 * lin(f(0)) + 0.7152 * lin(f(8)) + 0.0722 * lin(f(4));
  };
  const ratio = (x, y) => {
    const [a, b] = [lum(x), lum(y)].sort((p, q) => q - p);
    return (a + 0.05) / (b + 0.05);
  };

  assert.deepEqual(buildPresetVariables(null), {}, 'sem preset não escreve nada');
  assert.deepEqual(buildPresetVariables('nao-existe'), {}, 'id inválido não escreve nada');

  for (const preset of THEME_PRESETS) {
    const vars = buildPresetVariables(preset.id);
    assert.ok(Object.keys(vars).length > 0, `${preset.id}: preset vazio`);
    assert.equal(vars['--primary'], preset.dark['--primary'], `${preset.id}: primary`);
    assert.equal(vars['--preset-font'], preset.font ?? undefined, `${preset.id}: fonte`);
    assert.equal(vars['--radius'], preset.radius ?? undefined, `${preset.id}: raio`);
    assert.equal(vars['--radius-xl'], presetRadiusVariables(preset.radius)['--radius-xl'], `${preset.id}: raio de card`);

    const cta = ratio(vars['--primary-foreground'], vars['--primary']);
    assert.ok(cta >= 4.5, `${preset.id}: CTA reprovou AA (${cta.toFixed(2)})`);
  }

  console.log(`ok — ${THEME_PRESETS.length} presets, CTA AA em todos`);
} finally {
  await server.close();
}
