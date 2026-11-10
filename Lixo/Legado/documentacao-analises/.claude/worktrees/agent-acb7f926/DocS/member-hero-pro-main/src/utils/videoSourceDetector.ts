// Tipos de vídeo suportados
export type VideoSourceType = 'youtube' | 'vimeo' | 'panda_video' | 'host_vsl' | 'direct';

export interface VideoSource {
  type: VideoSourceType;
  url?: string;
  embed?: string;
  isEmbed: boolean;
}

// Atributos permitidos para iframes (segurança XSS)
const ALLOWED_IFRAME_ATTRIBUTES = [
  'src',
  'allow',
  'allowfullscreen',
  'width',
  'height',
  'style',
  'frameborder',
  'title',
  'loading',
  'referrerpolicy',
];

// Padrões perigosos para bloquear
const DANGEROUS_PATTERNS = [
  /javascript:/gi,
  /data:/gi,
  /on\w+\s*=/gi, // onload, onerror, onclick, etc.
  /<script/gi,
  /<\/script/gi,
];

/**
 * Detecta automaticamente o tipo de fonte de vídeo baseado no input
 * Suporta URLs (YouTube, Vimeo) e códigos embed (Panda Video, Host VSL genérico)
 */
export function detectVideoSource(input: string): VideoSource {
  const value = input.trim();
  
  if (!value) {
    throw new Error('Conteúdo de vídeo não pode estar vazio');
  }

  // Verificar se é um embed HTML (contém <iframe)
  if (value.includes('<iframe')) {
    // Panda Video
    if (value.includes('pandavideo.com.br') || value.includes('player-vz')) {
      return { type: 'panda_video', embed: value, isEmbed: true };
    }
    // Host VSL genérico
    return { type: 'host_vsl', embed: value, isEmbed: true };
  }

  // URLs de vídeo
  if (value.includes('youtube.com') || value.includes('youtu.be')) {
    return { type: 'youtube', url: value, isEmbed: false };
  }

  if (value.includes('vimeo.com')) {
    return { type: 'vimeo', url: value, isEmbed: false };
  }

  // Fallback para URL direta
  return { type: 'direct', url: value, isEmbed: false };
}

/**
 * Valida se um embed é seguro (sem scripts maliciosos)
 */
export function isValidEmbed(embedCode: string): { valid: boolean; error?: string } {
  const code = embedCode.trim();

  // Deve conter <iframe
  if (!code.includes('<iframe')) {
    return { valid: false, error: 'O código deve conter um iframe válido' };
  }

  // Verificar padrões perigosos
  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(code)) {
      return { 
        valid: false, 
        error: 'O código contém elementos não permitidos por segurança' 
      };
    }
  }

  // Verificar se não contém <script>
  if (/<script[\s\S]*?>/gi.test(code)) {
    return { valid: false, error: 'Scripts não são permitidos' };
  }

  return { valid: true };
}

/**
 * Sanitiza o código embed removendo atributos perigosos
 * Mantém apenas atributos permitidos para segurança XSS
 */
export function sanitizeEmbed(embedCode: string): string | null {
  const validation = isValidEmbed(embedCode);
  if (!validation.valid) {
    console.warn('[sanitizeEmbed] Embed inválido:', validation.error);
    return null;
  }

  try {
    // Usar DOMParser para parse seguro
    const parser = new DOMParser();
    const doc = parser.parseFromString(embedCode, 'text/html');
    const iframe = doc.querySelector('iframe');

    if (!iframe) {
      return null;
    }

    // Criar novo iframe limpo com apenas atributos permitidos
    const cleanIframe = document.createElement('iframe');
    
    // Copiar apenas atributos permitidos
    for (const attr of ALLOWED_IFRAME_ATTRIBUTES) {
      const value = iframe.getAttribute(attr);
      if (value) {
        // Validar src para não ter javascript: ou data:
        if (attr === 'src') {
          if (/^(javascript:|data:)/i.test(value)) {
            continue;
          }
        }
        cleanIframe.setAttribute(attr, value);
      }
    }

    // Garantir dimensões responsivas se não definidas
    if (!cleanIframe.style.width) {
      cleanIframe.style.width = '100%';
    }
    if (!cleanIframe.style.height) {
      cleanIframe.style.height = '100%';
    }
    
    // Adicionar atributos de segurança e acessibilidade
    cleanIframe.setAttribute('allowfullscreen', 'true');
    cleanIframe.style.border = 'none';
    cleanIframe.style.position = 'absolute';
    cleanIframe.style.top = '0';
    cleanIframe.style.left = '0';

    return cleanIframe.outerHTML;
  } catch (error) {
    console.error('[sanitizeEmbed] Erro ao sanitizar embed:', error);
    return null;
  }
}

/**
 * Retorna label amigável para o tipo de vídeo
 */
export function getVideoSourceLabel(type: VideoSourceType): string {
  const labels: Record<VideoSourceType, string> = {
    youtube: 'YouTube',
    vimeo: 'Vimeo',
    panda_video: 'Panda Video',
    host_vsl: 'Host VSL',
    direct: 'Link Direto',
  };
  return labels[type] || type;
}
