// Checagem da normalização de upsell/downsell em `checkout_config`.
// Rodar: npm run check:upsell   (usa o Vite só para resolver o alias "@/")
import assert from 'node:assert/strict';
import { createServer } from 'vite';

const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });
try {
  const { DEFAULT_CHECKOUT_CONFIG, normalizeCheckoutConfig } = await server.ssrLoadModule('/src/types/checkout-config.ts');

  // Default: desligado e sem ofertas.
  const base = normalizeCheckoutConfig({});
  assert.equal(base.upsell.enabled, false);
  assert.deepEqual(base.upsell.products, []);
  assert.equal(base.upsell.downsell.enabled, false);
  assert.equal(base.upsell.downsell.product_id, null);
  assert.deepEqual(DEFAULT_CHECKOUT_CONFIG.upsell, base.upsell);

  // Formato do Getfy: products com product_id, downsell por produto.
  const fromGetfy = normalizeCheckoutConfig({
    upsell: {
      enabled: true,
      products: [
        { product_id: 'p1', title_override: 'Bônus', description: 'd', image_url: 'i' },
        { product_id: '', title_override: 'sem produto' },
        { title_override: 'sem id' },
        'lixo',
      ],
      downsell: { enabled: true, product_id: 'p2', description: 'menos' },
    },
  });
  assert.equal(fromGetfy.upsell.enabled, true);
  assert.deepEqual(fromGetfy.upsell.products, [
    { product_id: 'p1', title_override: 'Bônus', description: 'd', image_url: 'i' },
  ]);
  assert.equal(fromGetfy.upsell.downsell.enabled, true);
  assert.equal(fromGetfy.upsell.downsell.product_id, 'p2');

  // enabled sem oferta válida é inútil: desliga.
  assert.equal(normalizeCheckoutConfig({ upsell: { enabled: true, products: [] } }).upsell.enabled, false);
  assert.equal(
    normalizeCheckoutConfig({ upsell: { enabled: true, downsell: { enabled: true } } }).upsell.downsell.enabled,
    false,
  );

  // JSON inválido não quebra o checkout.
  assert.deepEqual(normalizeCheckoutConfig({ upsell: 'x' }).upsell, DEFAULT_CHECKOUT_CONFIG.upsell);
  assert.deepEqual(normalizeCheckoutConfig(null).upsell, DEFAULT_CHECKOUT_CONFIG.upsell);

  // Round-trip: salvar e reler o que a UI grava não perde nada.
  const saved = fromGetfy;
  assert.deepEqual(normalizeCheckoutConfig(JSON.parse(JSON.stringify(saved))).upsell, saved.upsell);

  // Páginas pós-compra: texto puro, sempre presentes, com defaults vazios.
  const pages = normalizeCheckoutConfig({});
  assert.deepEqual(pages.thank_you, { headline: '', subtitle: '', body: '', image_url: '', video_url: '' });
  assert.deepEqual(pages.upsell.page, pages.thank_you);
  assert.deepEqual(pages.upsell.downsell.page, pages.thank_you);
  assert.deepEqual(DEFAULT_CHECKOUT_CONFIG.thank_you, pages.thank_you);

  // Lixo em qualquer nível vira campo vazio, nunca vaza objeto para a tela.
  const dirty = normalizeCheckoutConfig({
    thank_you: { headline: '  Obrigado!  ', subtitle: 42, body: null, image_url: 'https://x/y.png', video_url: 'x' },
    upsell: { enabled: true, products: [{ product_id: 'p1' }], page: 'nope' },
  });
  assert.equal(dirty.thank_you.headline, 'Obrigado!');
  assert.equal(dirty.thank_you.subtitle, '');
  assert.equal(dirty.thank_you.body, '');
  assert.equal(dirty.thank_you.image_url, 'https://x/y.png');
  assert.deepEqual(dirty.upsell.page, DEFAULT_CHECKOUT_CONFIG.thank_you);

  // Interpolação de variáveis: nunca deixa chave crua na tela.
  const { fillPostPurchaseVars } = await server.ssrLoadModule('/src/lib/post-purchase.ts');
  assert.equal(fillPostPurchaseVars('Oi {nome}, seu {produto}', { nome: 'Ana', produto: 'Curso' }), 'Oi Ana, seu Curso');
  assert.equal(fillPostPurchaseVars('Oi {nome}!', { nome: null }), 'Oi !');
  assert.equal(fillPostPurchaseVars('{nome}{produto}', {}), '');
  assert.deepEqual(normalizeCheckoutConfig(null).upsell, DEFAULT_CHECKOUT_CONFIG.upsell);

  // Métodos de pagamento: default ligado, só `false` desliga.
  // `default` é o método inicial (novo), não entra na comparação dos booleanos.
  const flags = (c) => {
    const { card, pix, boleto } = c.payment_methods;
    return { card, pix, boleto };
  };
  const methods = normalizeCheckoutConfig({});
  assert.deepEqual(flags(methods), { card: true, pix: true, boleto: true });
  assert.equal(methods.payment_methods.default, 'card');
  assert.deepEqual(
    flags(normalizeCheckoutConfig({ payment_methods: { boleto: false, pix: 'x' } })),
    { card: true, pix: true, boleto: false },
  );
  // Default configurado e ligado é preservado; desligado cai no primeiro ativo.
  assert.equal(
    normalizeCheckoutConfig({ payment_methods: { default: 'pix' } }).payment_methods.default,
    'pix',
  );
  assert.equal(
    normalizeCheckoutConfig({ payment_methods: { pix: false, default: 'pix' } }).payment_methods.default,
    'card',
  );
  // Todos desligados (ou JSON inválido) volta a ligar o cartão.
  assert.equal(
    normalizeCheckoutConfig({ payment_methods: { card: false, pix: false, boleto: false } }).payment_methods.card,
    true,
  );
  assert.deepEqual(flags(normalizeCheckoutConfig('x')), { card: true, pix: true, boleto: true });

  // Resolução de gateway respeita o método desligado.
  // (o módulo importa o cliente Supabase, que espera `document` no browser)
  globalThis.document = globalThis.document ?? { cookie: '' };
  const { resolveCheckoutGateways } = await server.ssrLoadModule('/src/lib/checkout-gateways.ts');
  const gateways = [{ slug: 'mercadopago', name: 'Mercado Pago', isDefault: true, methods: ['credit_card', 'pix', 'bolbradesco'] }];
  assert.deepEqual(resolveCheckoutGateways(methods, gateways, '').methods, ['credit_card', 'pix', 'bolbradesco']);
  const noBoleto = normalizeCheckoutConfig({ payment_methods: { boleto: false } });
  assert.deepEqual(resolveCheckoutGateways(noBoleto, gateways, '').methods, ['credit_card', 'pix']);

  console.log('ok: upsell/downsell e métodos de pagamento normalizados');
  process.exit(0); // o cliente Supabase importado acima não tem DOM aqui
} finally {
  await server.close();
}
