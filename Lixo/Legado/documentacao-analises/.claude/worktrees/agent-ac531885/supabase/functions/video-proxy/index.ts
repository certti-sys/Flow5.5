import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, validateCSRF } from "../_shared/cors.ts";
import { logger } from "../_shared/logger.ts";
import { checkRateLimit } from "../_shared/rate-limiter.ts";
import { z } from "https://esm.sh/zod@3.25.76";

// --- SCHEMAS ---

const VideoProxySchema = z.object({
  source: z.enum(['youtube', 'vimeo', 'panda', 'bunny', 'vturb', 'google-drive', 'file']),
  id: z.string().min(1).max(500), // Increased length and removed strict regex for URL support
  lib: z.string().regex(/^[a-zA-Z0-9._-]+$/).max(100).optional(),
  token: z.string().min(1) 
});


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

// Bunny Stream - Multiple extraction strategies
async function getBunny(lib: string, id: string): Promise<string> {
  try {
    const html = await fetchWithFallback(`https://iframe.mediadelivery.net/embed/${lib}/${id}`);
    
    // Strategy 1: Extract from <source> tag (most reliable)
    const sourceMatch = html.match(/<source[^>]+src="([^"]*playlist\.m3u8[^"]*)"/i);
    if (sourceMatch) {
      return sourceMatch[1];
    }
    
    // Strategy 2: Extract from og:video meta tag
    const ogMatch = html.match(/og:video:url"\s+content="([^"]*\.mp4[^"]*)"/i);
    if (ogMatch) {
      return ogMatch[1];
    }
    
    // Strategy 3: Extract from urlPlaylistUrl variable in script
    const varMatch = html.match(/urlPlaylistUrl\s*=\s*'([^']*)'/);
    if (varMatch) {
      return varMatch[1];
    }
    
    // Strategy 4: Extract CDN hostname from any b-cdn.net reference
    const cdnMatch = html.match(/(https:\/\/[a-zA-Z0-9-]+\.b-cdn\.net)/);
    if (cdnMatch) {
      return `${cdnMatch[1]}/${id}/playlist.m3u8`;
    }
    
    logger.warn('No stream URL found in Bunny HTML, constructing fallback');
  } catch (err) {
    logger.warn('Failed to fetch Bunny embed page, using constructed URL', { error: (err as Error).message });
  }
  
  // Fallback: Construct the direct MP4 URL (works for most Bunny videos)
  return `https://iframe.mediadelivery.net/embed/${lib}/${id}`;
}

// VTurb
async function getVTurb(id: string): Promise<string> {
  const html = await fetchWithFallback(`https://vturb.com.br/player/${id}`);
  const match = html.match(/"videoUrl":"([^"]*mp4[^"]*)/);
  if (!match) throw new Error('VTurb stream não encontrado');
  return JSON.parse(`"${match[1]}"`);
}

// Google Drive
async function getGoogleDrive(id: string): Promise<string> {
  // Retorna a URL de preview/embed que é o que o iframe precisa
  return `https://drive.google.com/file/d/${id}/preview`;
}

// Direct File
async function getFile(url: string): Promise<string> {
  // Validação básica se é um link de vídeo
  if (!url.match(/\.(mp4|webm|m3u8|mov|avi)(\?|$)/i) && !url.includes('supabase.co/storage/v1/object/public/')) {
    throw new Error('Arquivo de vídeo não reconhecido ou domínio não autorizado');
  }
  return url;
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('Origin'));
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // --- CSRF PROTECTION ---
  const csrfError = validateCSRF(req);
  if (csrfError) return csrfError;

  try {
    const bodyRaw = await req.json();
    const validation = VideoProxySchema.safeParse(bodyRaw);

    if (!validation.success) {
      logger.error('Invalid video-proxy payload', validation.error.format());
      return new Response(JSON.stringify({ error: "Dados inválidos", details: validation.error.format() }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { source, id, lib, token } = validation.data;
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

    // --- RATE LIMITING ---
    const rateLimit = await checkRateLimit(supabase, user.id, 'video-proxy', 100, 60);
    if (!rateLimit.allowed) {
        logger.warn(`Rate limit hit for video-proxy: ${user.id}`);
        return new Response(
            JSON.stringify({ error: 'Muitas solicitações.', retryAfter: rateLimit.retryAfter }), 
            { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Retry-After': String(rateLimit.retryAfter) } }
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
      case 'google-drive':
        videoUrl = await getGoogleDrive(id);
        break;
      case 'file':
        videoUrl = await getFile(id);
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
