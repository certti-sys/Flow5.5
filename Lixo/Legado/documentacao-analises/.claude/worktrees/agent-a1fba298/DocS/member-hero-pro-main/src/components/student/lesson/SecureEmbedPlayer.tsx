import { useMemo } from "react";
import { AlertTriangle } from "lucide-react";
import { sanitizeEmbed } from "@/utils/videoSourceDetector";
import { cn } from "@/lib/utils";

interface SecureEmbedPlayerProps {
  embedCode: string;
  className?: string;
}

/**
 * Componente seguro para renderizar embeds de vídeo (Panda Video, Host VSL)
 * Aplica sanitização XSS antes de renderizar
 */
export function SecureEmbedPlayer({ embedCode, className }: SecureEmbedPlayerProps) {
  const sanitizedEmbed = useMemo(() => {
    return sanitizeEmbed(embedCode);
  }, [embedCode]);

  if (!sanitizedEmbed) {
    return (
      <div className={cn(
        "absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-lg",
        className
      )}>
        <div className="text-center space-y-3 p-6">
          <AlertTriangle className="h-12 w-12 mx-auto text-destructive" />
          <h3 className="text-lg font-semibold text-foreground">Conteúdo Inválido</h3>
          <p className="text-sm text-muted-foreground max-w-xs">
            O código de vídeo não pôde ser carregado por motivos de segurança.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={cn("absolute inset-0 w-full h-full", className)}
      dangerouslySetInnerHTML={{ __html: sanitizedEmbed }}
    />
  );
}
