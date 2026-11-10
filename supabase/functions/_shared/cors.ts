const ALLOWED_ORIGINS = [
  'https://neovidyastream.com',
  'https://app.neovidyastream.com',
  'https://admin.neovidyastream.com',
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:8080',
  'http://localhost:8081',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  'http://127.0.0.1:8080',
  'http://127.0.0.1:8081',
];

export const getCorsHeaders = (origin: string | null) => {
  const allowedOrigin = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-source, x-hotmart-signature, x-kiwify-signature, x-wc-webhook-signature, x-pagseguro-token, x-stripe-signature, x-mercadopago-signature, x-hub-signature, x-test-mode, x-requested-with',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
    'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' https://*.supabase.co https://*.lovable.dev https://i.ytimg.com https://img.youtube.com https://*.mediadelivery.net https://*.b-cdn.net https://api.qrserver.com data: blob:; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.brevo.com https://*.b-cdn.net https://*.bunnycdn.com https://*.googlevideo.com https://*.vimeocdn.com; frame-src 'self' https://www.youtube.com https://youtube.com https://*.youtube.com https://www.youtube-nocookie.com https://vimeo.com https://*.vimeo.com https://player.vimeo.com https://*.wistia.com https://*.wistia.net https://iframe.mediadelivery.net https://*.pandavideo.com.br https://*.vturb.com.br https://player.vturb.com.br https://drive.google.com; media-src 'self' https://*.supabase.co https://*.b-cdn.net https://*.bunnycdn.com https://*.googlevideo.com https://*.vimeo.com; upgrade-insecure-requests;",
    'X-Frame-Options': 'SAMEORIGIN',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer-when-downgrade'
  };
};

export const validateCSRF = (req: Request): Response | null => {
  const method = req.method.toUpperCase();
  const stateChangingMethods = ['POST', 'PUT', 'DELETE', 'PATCH'];

  if (stateChangingMethods.includes(method)) {
    const requestedWith = req.headers.get('x-requested-with');
    const origin = req.headers.get('origin');

    if (!requestedWith) {
      console.warn(`CSRF Blocked: Missing X-Requested-With header. Method: ${method}, Origin: ${origin}`);
      return new Response(
        JSON.stringify({ error: 'Security Breach: Missing Security Header (CSRF).' }),
        {
          status: 403,
          headers: { ...getCorsHeaders(origin), 'Content-Type': 'application/json' }
        }
      );
    }

    if (origin && !ALLOWED_ORIGINS.includes(origin)) {
      console.warn(`CSRF Blocked: Unauthorized Origin: ${origin}. Method: ${method}`);
      return new Response(
        JSON.stringify({ error: 'Security Breach: Unauthorized Origin (CSRF).' }),
        {
          status: 403,
          headers: { ...getCorsHeaders(origin), 'Content-Type': 'application/json' }
        }
      );
    }
  }
  return null;
};
