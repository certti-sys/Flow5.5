export interface VideoConfig {
  youtube?: any;
  vimeo?: any;
  file?: any;
}

export function extractVideoUrl(input: string): string {
  if (!input || typeof input !== 'string') return '';

  const cleanInput = input.trim();

  if (cleanInput.startsWith('http://') || cleanInput.startsWith('https://')) {
    return cleanInput;
  }

  const iframeSrcMatch = cleanInput.match(/src=["']([^"']+)["']/i);
  if (iframeSrcMatch) {
    return iframeSrcMatch[1];
  }

  const embedSrcMatch = cleanInput.match(/<embed[^>]+src=["']([^"']+)["']/i);
  if (embedSrcMatch) {
    return embedSrcMatch[1];
  }

  if (cleanInput.includes('<') && cleanInput.includes('>')) {
    const urlMatch = cleanInput.match(/https?:\/\/[^\s"'<>]+/i);
    if (urlMatch) {
      return urlMatch[0];
    }
  }

  return cleanInput;
}

export function detectPlatform(url: string): string {
  const cleanUrl = extractVideoUrl(url).toLowerCase();

  if (cleanUrl.includes('youtube.com') || cleanUrl.includes('youtu.be')) {
    return 'youtube';
  }
  if (cleanUrl.includes('vimeo.com')) {
    return 'vimeo';
  }
  if (cleanUrl.includes('drive.google.com')) {
    return 'google-drive';
  }
  if (cleanUrl.includes('pandavideo.com')) {
    return 'panda-video';
  }
  if (cleanUrl.includes('vturb.com')) {
    return 'vturb';
  }
  if (cleanUrl.includes('bunnycdn.com') || cleanUrl.includes('b-cdn.net') || cleanUrl.includes('mediadelivery.net')) {
    return 'bunny';
  }
  if (cleanUrl.match(/\.(mp4|webm|ogg|mov)(\?|$)/i)) {
    return 'file';
  }

  return 'unknown';
}

export function getVideoConfig(url: string): VideoConfig {
  const platform = detectPlatform(url);
  const config: VideoConfig = {};
  const origin = typeof window !== 'undefined' ? window.location.origin : undefined;

  switch (platform) {
    case 'youtube':
      config.youtube = {
        playerVars: {
          controls: 0,
          modestbranding: 1,
          rel: 0,
          fs: 1,
          iv_load_policy: 3,
          cc_load_policy: 0,
          playsinline: 1,
          enablejsapi: 1,
          ...(origin ? { origin } : {}),
        },
        embedOptions: {
          host: 'https://www.youtube-nocookie.com',
          ...(origin ? { origin } : {}),
        },
      };
      break;

    case 'vimeo':
      config.vimeo = {
        playerOptions: {
          byline: false,
          portrait: false,
          title: false,
          autopause: true,
          dnt: true,
        },
      };
      break;

    case 'file':
      config.file = {
        attributes: {
          controlsList: 'nodownload noremoteplayback',
          disablePictureInPicture: true,
        },
      };
      break;
  }

  return config;
}

export function isValidVideoUrl(url: string): boolean {
  if (!url) return false;
  const platform = detectPlatform(url);
  return platform !== 'unknown';
}

export function extractYouTubeVideoId(url: string): string | null {
  const cleanUrl = extractVideoUrl(url);
  
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];

  for (const pattern of patterns) {
    const match = cleanUrl.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

export function extractVimeoVideoId(url: string): string | null {
  const cleanUrl = extractVideoUrl(url);
  
  const patterns = [
    /vimeo\.com\/(\d+)/,
    /player\.vimeo\.com\/video\/(\d+)/,
  ];

  for (const pattern of patterns) {
    const match = cleanUrl.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

export function normalizeVimeoUrl(url: string): string {
  const videoId = extractVimeoVideoId(url);
  if (!videoId) return url;
  return `https://player.vimeo.com/video/${videoId}`;
}

export function extractPandaVideoId(url: string): string | null {
  const cleanUrl = extractVideoUrl(url);
  const match = cleanUrl.match(/[?&]v=([a-zA-Z0-9-]+)/);
  return match ? match[1] : null;
}

export function normalizePandaVideoUrl(url: string): string {
  const videoId = extractPandaVideoId(url);
  if (!videoId) return url;
  
  // Extract library ID if present
  const libraryMatch = url.match(/player-vz-([a-zA-Z0-9-]+)\.tv\.pandavideo/);
  const library = libraryMatch ? libraryMatch[1] : '';
  
  if (library) {
    return `https://player-vz-${library}.tv.pandavideo.com.br/embed/?v=${videoId}`;
  }
  
  return url;
}

export function extractBunnyVideoId(url: string): { library?: string; videoId?: string } | null {
  const cleanUrl = extractVideoUrl(url);
  
  // Try embed URL format
  const embedMatch = cleanUrl.match(/iframe\.mediadelivery\.net\/embed\/([^/]+)\/([^/?]+)/);
  if (embedMatch) {
    return { library: embedMatch[1], videoId: embedMatch[2] };
  }
  
  // Try direct CDN URL format
  const cdnMatch = cleanUrl.match(/([a-zA-Z0-9-]+)\.b-cdn\.net/);
  if (cdnMatch) {
    return { library: cdnMatch[1] };
  }
  
  return null;
}

export function normalizeBunnyUrl(url: string): string {
  const videoData = extractBunnyVideoId(url);
  if (!videoData) return url;
  
  if (videoData.library && videoData.videoId) {
    return `https://iframe.mediadelivery.net/embed/${videoData.library}/${videoData.videoId}`;
  }
  
  return url;
}

export function extractVTurbId(url: string): string | null {
  const cleanUrl = extractVideoUrl(url);
  const match = cleanUrl.match(/player\.vturb\.com\.br\/([a-zA-Z0-9-]+)/);
  return match ? match[1] : null;
}

export function extractGoogleDriveId(url: string): string | null {
  const cleanUrl = extractVideoUrl(url);
  const match = cleanUrl.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}

export function normalizeGoogleDriveUrl(url: string): string {
  const fileId = extractGoogleDriveId(url);
  if (!fileId) return url;
  return `https://drive.google.com/file/d/${fileId}/preview`;
}

export function normalizeVTurbUrl(url: string): string {
  const videoId = extractVTurbId(url);
  if (!videoId) return url;
  return `https://player.vturb.com.br/${videoId}`;
}

export function validateVideoUrl(url: string, platform?: string): { valid: boolean; error?: string } {
  if (!url || url.trim() === '') {
    return { valid: false, error: 'URL é obrigatória' };
  }

  const cleanUrl = extractVideoUrl(url);
  const detectedPlatform = platform || detectPlatform(cleanUrl);

  switch (detectedPlatform) {
    case 'youtube':
      const youtubeId = extractYouTubeVideoId(cleanUrl);
      return youtubeId 
        ? { valid: true }
        : { valid: false, error: 'ID do vídeo do YouTube não encontrado' };
    
    case 'vimeo':
      const vimeoId = extractVimeoVideoId(cleanUrl);
      return vimeoId
        ? { valid: true }
        : { valid: false, error: 'ID do vídeo do Vimeo não encontrado' };
    
    case 'panda-video':
      const pandaId = extractPandaVideoId(cleanUrl);
      return pandaId
        ? { valid: true }
        : { valid: false, error: 'ID do vídeo do Panda Video não encontrado' };
    
    case 'bunny':
      const bunnyData = extractBunnyVideoId(cleanUrl);
      return bunnyData
        ? { valid: true }
        : { valid: false, error: 'Formato de URL do Bunny.net inválido' };
    
    case 'vturb':
      const vturbId = extractVTurbId(cleanUrl);
      return vturbId
        ? { valid: true }
        : { valid: false, error: 'ID do vídeo do VTurb não encontrado' };
    
    case 'google-drive':
      const driveId = extractGoogleDriveId(cleanUrl);
      return driveId
        ? { valid: true }
        : { valid: false, error: 'ID do arquivo do Google Drive não encontrado' };
    
    case 'file':
      return { valid: true };
    
    case 'unknown':
      return { valid: false, error: 'Plataforma de vídeo não reconhecida' };
    
    default:
      return { valid: true };
  }
}

export interface PlatformInfo {
  name: string;
  icon: string;
  urlPatterns: string[];
  exampleUrl: string;
}

export function getPlatformInfo(platform: string): PlatformInfo {
  const platforms: Record<string, PlatformInfo> = {
    youtube: {
      name: 'YouTube',
      icon: '📺',
      urlPatterns: [
        'https://www.youtube.com/watch?v=VIDEO_ID',
        'https://youtu.be/VIDEO_ID',
        'https://www.youtube.com/embed/VIDEO_ID',
      ],
      exampleUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    },
    vimeo: {
      name: 'Vimeo',
      icon: '🎬',
      urlPatterns: [
        'https://vimeo.com/VIDEO_ID',
        'https://player.vimeo.com/video/VIDEO_ID',
      ],
      exampleUrl: 'https://vimeo.com/148751763',
    },
    'panda-video': {
      name: 'Panda Video',
      icon: '🐼',
      urlPatterns: [
        'https://player-vz-LIBRARY.tv.pandavideo.com.br/embed/?v=VIDEO_ID',
      ],
      exampleUrl: 'https://player-vz-abc123.tv.pandavideo.com.br/embed/?v=xyz456',
    },
    bunny: {
      name: 'Bunny.net',
      icon: '🐰',
      urlPatterns: [
        'https://iframe.mediadelivery.net/embed/LIBRARY/VIDEO_ID',
        'https://LIBRARY.b-cdn.net/video.mp4',
      ],
      exampleUrl: 'https://iframe.mediadelivery.net/embed/12345/abcdef-1234',
    },
    vturb: {
      name: 'VTurb',
      icon: '▶️',
      urlPatterns: [
        'https://player.vturb.com.br/VIDEO_ID',
      ],
      exampleUrl: 'https://player.vturb.com.br/abc123xyz',
    },
    file: {
      name: 'Arquivo MP4',
      icon: '🎥',
      urlPatterns: [
        'https://example.com/video.mp4',
        'https://example.com/video.webm',
      ],
      exampleUrl: 'https://example.com/video.mp4',
    },
    'google-drive': {
      name: 'Google Drive',
      icon: '📂',
      urlPatterns: [
        'https://drive.google.com/file/d/FILE_ID/view',
      ],
      exampleUrl: 'https://drive.google.com/file/d/1ABC123xyz/view',
    },
  };

  return platforms[platform] || {
    name: 'Outro',
    icon: '🌐',
    urlPatterns: ['URL direta do vídeo'],
    exampleUrl: 'https://example.com/video',
  };
}

export function formatVideoTime(seconds: number): string {
  if (!seconds || isNaN(seconds)) return '0:00';

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}