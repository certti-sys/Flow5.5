import React, { useEffect, useState } from "react";
import { 
  detectPlatform, 
  extractVideoUrl, 
  validateVideoUrl, 
  extractYouTubeVideoId, 
  extractVimeoVideoId,
  extractPandaVideoId,
  extractVTurbId,
  extractBunnyVideoId,
  extractGoogleDriveId
} from "@/lib/videoUtils";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";

interface VideoPreviewProps {
  url: string;
  platform?: string;
  onValidation?: (isValid: boolean) => void;
}

export function VideoPreview({ url, platform, onValidation }: VideoPreviewProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detectedPlatform, setDetectedPlatform] = useState<string>('');

  useEffect(() => {
    if (!url || url.trim() === '') {
      setIsLoading(false);
      setError(null);
      setDetectedPlatform('');
      onValidation?.(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    const cleanUrl = extractVideoUrl(url);
    const platformType = platform || detectPlatform(cleanUrl);
    setDetectedPlatform(platformType);

    const validation = validateVideoUrl(cleanUrl, platformType);
    
    if (!validation.valid) {
      setError(validation.error || 'URL inválida');
      setIsLoading(false);
      onValidation?.(false);
      return;
    }

    // Simulate loading for preview
    const timer = setTimeout(() => {
      setIsLoading(false);
      onValidation?.(true);
    }, 500);

    return () => clearTimeout(timer);
  }, [url, platform, onValidation]);

  if (!url || url.trim() === '') {
    return null;
  }

  const renderPreview = () => {
    const cleanUrl = extractVideoUrl(url);

    switch (detectedPlatform) {
      case 'youtube':
        const youtubeId = extractYouTubeVideoId(cleanUrl);
        if (youtubeId) {
          return (
            <iframe
              src={`https://www.youtube.com/embed/${youtubeId}`}
              className="w-full h-full rounded"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          );
        }
        break;

      case 'vimeo':
        const vimeoId = extractVimeoVideoId(cleanUrl);
        if (vimeoId) {
          return (
            <iframe
              src={`https://player.vimeo.com/video/${vimeoId}`}
              className="w-full h-full rounded"
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
            />
          );
        }
        break;

      case 'panda-video':
        // Panda Video uses the URL directly as embed
        return (
          <iframe
            src={cleanUrl}
            className="w-full h-full rounded"
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
          />
        );

      case 'vturb':
        const vturbId = extractVTurbId(cleanUrl);
        if (vturbId) {
          return (
            <iframe
              src={`https://player.vturb.com.br/${vturbId}`}
              className="w-full h-full rounded"
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
            />
          );
        }
        // Fallback to direct URL if ID extraction fails
        return (
          <iframe
            src={cleanUrl}
            className="w-full h-full rounded"
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
          />
        );

      case 'bunny':
        const bunnyData = extractBunnyVideoId(cleanUrl);
        if (bunnyData?.library && bunnyData?.videoId) {
          return (
            <iframe
              src={`https://iframe.mediadelivery.net/embed/${bunnyData.library}/${bunnyData.videoId}`}
              className="w-full h-full rounded"
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
            />
          );
        }
        // Check if it's a direct CDN URL
        if (cleanUrl.includes('.b-cdn.net')) {
          // Show video element for direct files
          if (cleanUrl.match(/\.(mp4|webm)(\?|$)/i)) {
            return (
              <video
                src={cleanUrl}
                className="w-full h-full rounded object-contain"
                controls
                preload="metadata"
              />
            );
          }
        }
        // Fallback
        return (
          <div className="flex items-center justify-center h-full bg-muted/30 rounded">
            <div className="text-center space-y-2 p-4">
              <CheckCircle2 className="w-8 h-8 mx-auto text-green-500" />
              <p className="text-sm text-muted-foreground">
                URL válida para Bunny.net
              </p>
            </div>
          </div>
        );

      case 'google-drive':
        const driveId = extractGoogleDriveId(cleanUrl);
        if (driveId) {
          return (
            <iframe
              src={`https://drive.google.com/file/d/${driveId}/preview`}
              className="w-full h-full rounded"
              allow="autoplay; fullscreen"
              allowFullScreen
            />
          );
        }
        break;

      case 'file':
        // Direct video files (MP4, WebM, etc.)
        return (
          <video
            src={cleanUrl}
            className="w-full h-full rounded object-contain"
            controls
            preload="metadata"
          />
        );

      default:
        return (
          <div className="flex items-center justify-center h-full bg-muted/30 rounded">
            <div className="text-center space-y-2 p-4">
              <CheckCircle2 className="w-8 h-8 mx-auto text-green-500" />
              <p className="text-sm text-muted-foreground">
                URL válida para {detectedPlatform || 'plataforma desconhecida'}
              </p>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="space-y-2">
      <div className="w-full aspect-video bg-black/50 rounded-lg overflow-hidden border border-white/[0.08]">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-2 p-4">
              <AlertCircle className="w-8 h-8 mx-auto text-destructive" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          </div>
        ) : (
          renderPreview()
        )}
      </div>
    </div>
  );
}
