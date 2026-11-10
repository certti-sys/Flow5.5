import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    strictPort: true,
    headers: {
      "Content-Security-Policy": "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://sdk.mercadopago.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' https://*.supabase.co https://*.lovable.dev https://i.ytimg.com https://img.youtube.com https://*.mediadelivery.net https://*.b-cdn.net https://*.mercadopago.com https://*.mercadolibre.com https://*.mercadolivre.com data: blob:; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.brevo.com https://*.b-cdn.net https://*.bunnycdn.com https://*.googlevideo.com https://*.vimeocdn.com https://api.mercadopago.com https://*.mercadopago.com https://*.mercadolibre.com https://*.mercadolivre.com; frame-src 'self' https://www.youtube.com https://youtube.com https://*.youtube.com https://www.youtube-nocookie.com https://vimeo.com https://*.vimeo.com https://player.vimeo.com https://*.wistia.com https://*.wistia.net https://iframe.mediadelivery.net https://*.pandavideo.com.br https://*.vturb.com.br https://player.vturb.com.br https://drive.google.com https://*.mercadopago.com https://*.mercadolibre.com https://*.mercadolivre.com; media-src 'self' https://*.supabase.co https://*.b-cdn.net https://*.bunnycdn.com https://*.googlevideo.com https://*.vimeo.com; upgrade-insecure-requests;",
      "X-Frame-Options": "SAMEORIGIN",
      "X-Content-Type-Options": "nosniff",
      "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
      "Referrer-Policy": "no-referrer-when-downgrade"
    }
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
