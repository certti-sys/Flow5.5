// Checagem do preset global: tokens esperados e contraste WCAG de todos os pares.
// Rodar: npm run check:theme   (usa o Vite só para resolver o alias "@/")
import assert from 'node:assert/strict';
import { createServer } from 'vite';

const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });
try {
  const { buildPresetVariables, presetRadiusVariables, contrastRatio } = await server.ssrLoadModule('/src/lib/colorGenerator.ts');
  const { THEME_PRESETS } = await server.ssrLoadModule('/src/types/theme-presets.ts');

  assert.deepEqual(buildPresetVariables(null), {}, 'sem preset não escreve nada');
  assert.deepEqual(buildPresetVariables('nao-existe'), {}, 'id inválido não escreve nada');

  // Pares reais de texto/fundo. Antes só o CTA era validado — por isso 10
  // botões destrutivos e 14 sidebars reprovavam AA sem o check acusar.
  const PAIRS = [
    ['--background', '--foreground'],
    ['--card', '--card-foreground'],
    ['--popover', '--popover-foreground'],
    ['--primary', '--primary-foreground'],
    ['--secondary', '--secondary-foreground'],
    ['--muted', '--muted-foreground'],
    ['--accent', '--accent-foreground'],
    ['--destructive', '--destructive-foreground'],
    ['--sidebar-background', '--sidebar-foreground'],
    ['--sidebar-primary', '--sidebar-primary-foreground'],
    ['--sidebar-accent', '--sidebar-accent-foreground'],
  ];

  let pares = 0;
  for (const preset of THEME_PRESETS) {
    const vars = buildPresetVariables(preset.id);
    assert.ok(Object.keys(vars).length > 0, `${preset.id}: preset vazio`);
    assert.equal(vars['--primary'], preset.dark['--primary'], `${preset.id}: primary`);
    assert.equal(vars['--preset-font'], preset.font ?? undefined, `${preset.id}: fonte`);
    assert.equal(vars['--radius'], preset.radius ?? undefined, `${preset.id}: raio`);
    assert.equal(vars['--radius-xl'], presetRadiusVariables(preset.radius)['--radius-xl'], `${preset.id}: raio de card`);
    assert.ok(!('CheckoutPreset' in preset), `${preset.id}: tipo`);

    for (const [bg, fg] of PAIRS) {
      if (!vars[bg] || !vars[fg]) continue;
      const c = contrastRatio(vars[bg], vars[fg]);
      assert.ok(c >= 4.5, `${preset.id}: ${fg}/${bg} reprovou AA (${c.toFixed(2)})`);
      pares++;
    }

    // A sidebar precisa acompanhar o preset: fundo derivado do card e borda
    // do preset. Sem isso ela fica fixa na cor do tema padrão.
    assert.equal(vars['--sidebar-background'], preset.dark['--card'] ?? preset.dark['--background'], `${preset.id}: sidebar bg`);
    assert.ok(vars['--sidebar-border'], `${preset.id}: sidebar border`);
    assert.ok(vars['--sidebar-foreground'], `${preset.id}: sidebar fg`);
  }

  console.log(`ok — ${THEME_PRESETS.length} presets, ${pares} pares fg/bg com AA`);
} finally {
  await server.close();
}
