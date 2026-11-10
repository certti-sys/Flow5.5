import { AspectRatio } from "@/components/ui/aspect-ratio";
import { FileText, ExternalLink, File } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PremiumVideoPlayer } from "./PremiumVideoPlayer";
import { SecureEmbedPlayer } from "./SecureEmbedPlayer";
import { VideoMarker } from "@/types/video";
import { useStudentProgress } from "@/hooks/useStudentProgress";
import { useParams } from "react-router-dom";

interface LessonVideoPlayerProps {
  tipo: string;
  url?: string | null;
  arquivo?: string | null;
  nome: string;
  markers?: VideoMarker[];
  lessonId?: string;
  courseId?: string;
  moduleId?: string;
}

export function LessonVideoPlayer({ 
  tipo, 
  url, 
  arquivo, 
  nome, 
  markers = [],
  lessonId: propLessonId,
  courseId,
  moduleId,
}: LessonVideoPlayerProps) {
  const { lessonId: paramLessonId } = useParams<{ lessonId: string }>();
  const lessonId = propLessonId || paramLessonId;
  const { progress, updateWatchedTime } = useStudentProgress();
  
  // Find watched time for this lesson
  const lessonProgress = progress.find(p => p.lessonId === lessonId);
  const startTime = lessonProgress?.watchedSeconds || 0;

  const handleTimeUpdate = (time: number) => {
    if (lessonId && courseId && moduleId) {
      updateWatchedTime(lessonId, courseId, moduleId, Math.floor(time));
    }
  };

  const getVideoProvider = (url: string): "youtube" | "vimeo" | "panda_video" | "host_vsl" | "direct" => {
    // Verificar se é um embed HTML
    if (url.includes('<iframe')) {
      if (url.includes('pandavideo.com.br') || url.includes('player-vz')) {
        return "panda_video";
      }
      return "host_vsl";
    }
    if (url.includes("youtube.com") || url.includes("youtu.be")) {
      return "youtube";
    }
    if (url.includes("vimeo.com")) {
      return "vimeo";
    }
    return "direct";
  };

  // Renderizar conteúdo baseado no tipo
  const renderContent = () => {
    switch (tipo) {
      case "video":
      case "panda_video":
      case "host_vsl":
        if (url) {
          const provider = getVideoProvider(url);
          
          // Panda Video ou Host VSL (embeds HTML)
          if (provider === "panda_video" || provider === "host_vsl") {
            return <SecureEmbedPlayer embedCode={url} />;
          }
          
          // Use Premium Player for YouTube/Vimeo
          if (provider === "youtube" || provider === "vimeo") {
            return (
              <div className="absolute inset-0">
                <PremiumVideoPlayer
                  url={url}
                  provider={provider}
                  markers={markers}
                  startTime={startTime}
                  onTimeUpdate={handleTimeUpdate}
                />
              </div>
            );
          }
          
          // Fallback for other video URLs
          return (
            <iframe
              src={url}
              className="absolute inset-0 w-full h-full rounded-lg"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title={nome}
            />
          );
        }
        break;

      case "pdf":
        if (arquivo) {
          return (
            <iframe
              src={arquivo}
              className="absolute inset-0 w-full h-full rounded-lg"
              title={nome}
            />
          );
        }
        break;

      case "externo":
        if (url) {
          return (
            <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm rounded-lg">
              <div className="text-center space-y-4">
                <ExternalLink className="h-16 w-16 mx-auto text-primary" />
                <h3 className="text-xl font-semibold">Link Externo</h3>
                <Button
                  onClick={() => window.open(url, "_blank")}
                  className="btn-premium"
                >
                  Abrir Link
                </Button>
              </div>
            </div>
          );
        }
        break;

      case "arquivo":
        if (arquivo) {
          return (
            <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm rounded-lg">
              <div className="text-center space-y-4">
                <File className="h-16 w-16 mx-auto text-primary" />
                <h3 className="text-xl font-semibold">Arquivo para Download</h3>
                <Button
                  onClick={() => window.open(arquivo, "_blank")}
                  className="btn-premium"
                >
                  Baixar Arquivo
                </Button>
              </div>
            </div>
          );
        }
        break;
    }

    return (
      <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm rounded-lg">
        <p className="text-muted-foreground">Conteúdo não disponível</p>
      </div>
    );
  };

  return (
    <div className="w-full">
      <div className="relative rounded-xl overflow-hidden shadow-2xl border border-primary/20 hover:border-primary/40 transition-all duration-300">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
        <AspectRatio ratio={16 / 9} className="bg-black/90">
          {renderContent()}
        </AspectRatio>
      </div>
    </div>
  );
}
