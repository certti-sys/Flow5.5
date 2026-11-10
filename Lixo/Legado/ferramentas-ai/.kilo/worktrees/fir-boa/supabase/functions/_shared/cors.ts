const ALLOWED_ORIGINS = [
  'https://neovidyastream.com',
  'https://app.neovidyastream.com',
  'https://admin.neovidyastream.com',
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:8080',
  'http://localhost:8081',
];

export const getCorsHeaders = (origin: string | null) => {
  const allowedOrigin = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-source, x-hotmart-signature, x-kiwify-signature, x-wc-webhook-signature, x-pagseguro-token, x-stripe-signature, x-mercadopago-signature, x-hub-signature, x-test-mode',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
  };
};

