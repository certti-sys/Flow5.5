import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { getCorsHeaders } from "../_shared/cors.ts";
import { logger } from "../_shared/logger.ts";

// CORS proxies com fallback
const CORS_PROXIES = [
  'https://api.allorigins.win/raw?url=',
  'https://corsproxy.io/?',
  'https://api.codetabs.com/v1/proxy?quest=',
];

// Cache de URLs de vídeo (10 minutos)
const videoCache = new Map<string, { url: string; expires: number }>();

/* ---------- Parsers com fallback ---------- */

async function fetchWithFallback(url: string): Promise<string> {
  let lastError: Error | null = null;
  
  for (const proxy of CORS_PROXIES) {
    try {
      const response = await fetch(proxy + encodeURIComponent(url), {
        headers: { 'User-Agent': 'Mozilla/5.0' },
      });
      if (response.ok) {
        return await response.text();
      }
    } catch (error) {
      lastError = error as Error;
      logger.warn(`Proxy ${proxy} failed`, { error: lastError.message });
    }
  }
  
  throw lastError || new Error('Todos os proxies falharam');
}

// YouTube - Retorna URL do iframe (mais confiável)
async function getYouTube(id: string): Promise<string> {
  return `https://www.youtube.com/embed/${id}`;
}

// Vimeo - Múltiplos métodos de parsing
async function parseVimeoMethod1(html: string): Promise<string | null> {
  const match = html.match(/"url":"([^"]*mp4[^"]*progressive[^"]*)/);
  if (!match) return null;
  return JSON.parse(`"${match[1]}"`);
}

async function parseVimeoMethod2(html: string): Promise<string | null> {
  const match = html.match(/\"files\":\[{\"quality\":\"[^\"]*\",\"type\":\"video\/mp4\",\"url\":\"([^"]*)\"/);
  if (!match) return null;
  return match[1];
}

async function getVimeo(id: string): Promise<string> {
  const html = await fetchWithFallback(`https://vimeo.com/${id}`);
  
  let url = await parseVimeoMethod1(html);
  if (url) return url;
  
  url = await parseVimeoMethod2(html);
  if (url) return url;
  
  throw new Error('Nenhum parser do Vimeo funcionou');
}

// Panda Video
async function getPanda(id: string): Promise<string> {
  const html = await fetchWithFallback(`https://player.pandavideo.com.br/embed/?v=${id}`);
  const match = html.match(/"url":"([^"]*m3u8[^"]*)/);
  if (!match) throw new Error('Panda stream não encontrado');
  return JSON.parse(`"${match[1]}"`);
}

// Bunny Stream
async function getBunny(lib: string, id: string): Promise<string> {
  const html = await fetchWithFallback(`https://iframe.mediadelivery.net/embed/${lib}/${id}`);
  const match = html.match(/"sources":\s*\[\s*{\s*"file":"([^"]*)/);
  if (!match) throw new Error('Bunny stream não encontrado');
  return JSON.parse(`"${match[1]}"`);
}

// VTurb
async function getVTurb(id: string): Promise<string> {
  const html = await fetchWithFallback(`https://vturb.com.br/player/${id}`);
  const match = html.match(/"videoUrl":"([^"]*mp4[^"]*)/);
  if (!match) throw new Error('VTurb stream não encontrado');
  return JSON.parse(`"${match[1]}"`);
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('Origin'));
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { source, id, lib, token } = await req.json();
    logger.info(`Video proxy request`, { source, id, lib });

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Token inválido ou expirado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const cacheKey = `${source}-${id}-${lib || ''}`;
    const cached = videoCache.get(cacheKey);
    if (cached && cached.expires > Date.now()) {
      return new Response(
        JSON.stringify({ url: cached.url, cached: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let videoUrl: string;
    switch (source) {
      case 'youtube':
        videoUrl = await getYouTube(id);
        break;
      case 'vimeo':
        videoUrl = await getVimeo(id);
        break;
      case 'panda':
        videoUrl = await getPanda(id);
        break;
      case 'bunny':
        videoUrl = await getBunny(lib, id);
        break;
      case 'vturb':
        videoUrl = await getVTurb(id);
        break;
      default:
        throw new Error('Fonte não suportada');
    }

    videoCache.set(cacheKey, {
      url: videoUrl,
      expires: Date.now() + 10 * 60 * 1000,
    });

    return new Response(
      JSON.stringify({ url: videoUrl, cached: false }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    logger.error(`Error in video-proxy`, error);
    return new Response(
      JSON.stringify({ error: error.message || 'Erro ao processar vídeo' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
