import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Video, FileText, Link2, File, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Lesson } from "@/hooks/useLessons";

interface LessonPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lesson: Lesson | null;
}

function convertToEmbedUrl(url: string): string {
  if (!url) return '';
  
  // YouTube - various formats
  const youtubeMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]+)/);
  if (youtubeMatch) {
    return `https://www.youtube.com/embed/${youtubeMatch[1]}`;
  }
  
  // Vimeo
  const vimeoMatch = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeoMatch) {
    return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
  }
  
  return url;
}

const tipoIcons: Record<string, React.ElementType> = {
  video: Video,
  pdf: FileText,
  arquivo: File,
  externo: Link2,
};

export function LessonPreviewDialog({ open, onOpenChange, lesson }: LessonPreviewDialogProps) {
  if (!lesson) return null;

  const Icon = tipoIcons[lesson.tipo] || File;

  const renderPreview = () => {
    switch (lesson.tipo) {
      case 'video':
        const embedUrl = convertToEmbedUrl(lesson.url || '');
        if (!embedUrl) {
          return (
            <div className="aspect-video w-full rounded-lg bg-background/50 flex items-center justify-center border border-border/50">
              <div className="text-center">
                <Video className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">URL do vídeo não configurada</p>
              </div>
            </div>
          );
        }
        return (
          <div className="aspect-video w-full rounded-lg overflow-hidden bg-black">
            <iframe
              src={embedUrl}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title={lesson.nome}
            />
          </div>
        );

      case 'pdf':
        const pdfUrl = lesson.arquivo || lesson.url;
        if (!pdfUrl) {
          return (
            <div className="h-[500px] w-full rounded-lg bg-background/50 flex items-center justify-center border border-border/50">
              <div className="text-center">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">PDF não configurado</p>
              </div>
            </div>
          );
        }
        return (
          <div className="h-[500px] w-full rounded-lg overflow-hidden border border-border/30">
            <iframe
              src={pdfUrl}
              className="w-full h-full bg-white"
              title={lesson.nome}
            />
          </div>
        );

      case 'externo':
        return (
          <div className="py-12 px-6 rounded-lg bg-background/30 border border-border/30 text-center">
            <Link2 className="h-16 w-16 mx-auto text-primary mb-4" />
            <p className="text-sm text-muted-foreground mb-4">Link externo</p>
            {lesson.url ? (
              <Button asChild variant="outline" className="gap-2 border-primary/30 text-primary hover:bg-primary/10">
                <a href={lesson.url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" />
                  Abrir Link
                </a>
              </Button>
            ) : (
              <p className="text-muted-foreground text-sm">URL não configurada</p>
            )}
          </div>
        );

      case 'arquivo':
        return (
          <div className="py-12 px-6 rounded-lg bg-background/30 border border-border/30 text-center">
            <File className="h-16 w-16 mx-auto text-primary mb-4" />
            <p className="text-sm text-muted-foreground mb-4">Arquivo para download</p>
            {lesson.arquivo ? (
              <Button asChild variant="outline" className="gap-2 border-primary/30 text-primary hover:bg-primary/10">
                <a href={lesson.arquivo} download>
                  <ExternalLink className="h-4 w-4" />
                  Baixar Arquivo
                </a>
              </Button>
            ) : (
              <p className="text-muted-foreground text-sm">Arquivo não configurado</p>
            )}
          </div>
        );

      default:
        return (
          <div className="py-12 text-center">
            <p className="text-muted-foreground">Preview não disponível para este tipo de aula</p>
          </div>
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl bg-card border-border/50">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <span className="block">{lesson.nome}</span>
              {lesson.status === 'Rascunho' && (
                <span className="text-xs text-muted-foreground font-normal">(Rascunho)</span>
              )}
            </div>
          </DialogTitle>
        </DialogHeader>
        
        <div className="mt-4">
          {renderPreview()}
        </div>

        {lesson.descricao && (
          <div className="mt-4 p-4 rounded-lg bg-background/30 border border-border/30">
            <p className="text-sm text-muted-foreground">{lesson.descricao}</p>
          </div>
        )}

        {lesson.thumbnail && (
          <div className="mt-4">
            <p className="text-xs text-muted-foreground mb-2">Thumbnail:</p>
            <img 
              src={lesson.thumbnail} 
              alt="Thumbnail" 
              className="h-20 w-auto rounded-lg border border-border/30"
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
