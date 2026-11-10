import { useMemo } from "react";
import { Play, AlertCircle } from "lucide-react";
import { VideoSource } from "@/utils/videoSourceDetector";
import { SecureEmbedPlayer } from "@/components/student/lesson/SecureEmbedPlayer";

interface VideoPreviewProps {
  url: string;
  detectedSource: VideoSource | null;
  isValid: boolean;
  className?: string;
}

function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

function extractVimeoId(url: string): string | null {
  const patterns = [
    /vimeo\.com\/(?:video\/)?(\d+)/,
    /player\.vimeo\.com\/video\/(\d+)/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

export function VideoPreview({ url, detectedSource, isValid, className }: VideoPreviewProps) {
  const previewContent = useMemo(() => {
    if (!url.trim() || !detectedSource) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
          <Play className="h-12 w-12 opacity-30" />
          <span className="text-sm">Cole uma URL ou embed para visualizar</span>
        </div>
      );
    }

    if (!isValid) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-destructive gap-2">
          <AlertCircle className="h-12 w-12 opacity-70" />
          <span className="text-sm">Embed inválido ou inseguro</span>
        </div>
      );
    }

    switch (detectedSource.type) {
      case "youtube": {
        const videoId = extractYouTubeId(url);
        if (!videoId) {
          return (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
              <AlertCircle className="h-8 w-8" />
              <span className="text-sm">ID do YouTube não encontrado</span>
            </div>
          );
        }
        return (
          <iframe
            src={`https://www.youtube.com/embed/${videoId}?controls=1&rel=0`}
            className="absolute inset-0 w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title="YouTube Preview"
          />
        );
      }

      case "vimeo": {
        const videoId = extractVimeoId(url);
        if (!videoId) {
          return (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
              <AlertCircle className="h-8 w-8" />
              <span className="text-sm">ID do Vimeo não encontrado</span>
            </div>
          );
        }
        return (
          <iframe
            src={`https://player.vimeo.com/video/${videoId}?controls=1`}
            className="absolute inset-0 w-full h-full"
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
            title="Vimeo Preview"
          />
        );
      }

      case "panda_video":
      case "host_vsl": {
        return (
          <SecureEmbedPlayer 
            embedCode={url} 
            className="absolute inset-0 w-full h-full"
          />
        );
      }

      case "direct":
      default: {
        // For direct URLs, try to render as iframe
        if (url.startsWith("http")) {
          return (
            <iframe
              src={url}
              className="absolute inset-0 w-full h-full"
              allowFullScreen
              title="Video Preview"
            />
          );
        }
        return (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
            <Play className="h-12 w-12 opacity-30" />
            <span className="text-sm">Preview não disponível para este formato</span>
          </div>
        );
      }
    }
  }, [url, detectedSource, isValid]);

  return (
    <div className={className}>
      <div className="relative aspect-video bg-black/90 rounded-lg overflow-hidden border border-border/50">
        {previewContent}
      </div>
    </div>
  );
}
