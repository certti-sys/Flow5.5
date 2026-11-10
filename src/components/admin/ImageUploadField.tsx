import { useState, useRef, useEffect } from "react";
import { Upload, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface ImageUploadFieldProps {
  label: string;
  currentImageUrl?: string | null;
  onImageUpload: (file: File) => Promise<string>;
  onImageRemove?: () => void;
  aspectRatio?: string;
  maxSizeMB?: number;
  maxPreviewWidth?: string;
  description?: string;
}

export const ImageUploadField = ({
  label,
  currentImageUrl,
  onImageUpload,
  onImageRemove,
  aspectRatio = "16/9",
  maxSizeMB = 5,
  maxPreviewWidth,
  description,
}: ImageUploadFieldProps) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentImageUrl || null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Settings carregam de forma assíncrona: sincroniza o preview quando a URL
  // persistida chega depois da montagem (ex.: após atualizar a página).
  useEffect(() => {
    setPreviewUrl(currentImageUrl || null);
  }, [currentImageUrl]);

  const validateFile = (file: File): boolean => {
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast.error('Formato inválido. Use JPG, PNG ou WEBP');
      return false;
    }

    const maxSize = maxSizeMB * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error(`Arquivo muito grande. Tamanho máximo: ${maxSizeMB}MB`);
      return false;
    }

    return true;
  };

  const handleFileSelect = async (file: File) => {
    if (!validateFile(file)) return;

    setIsUploading(true);
    try {
      const url = await onImageUpload(file);
      setPreviewUrl(url);
      toast.success('Imagem carregada com sucesso!');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Erro ao fazer upload da imagem');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  const handleRemove = () => {
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    onImageRemove?.();
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-foreground">{label}</label>
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}

      <div
        className={`relative border-2 border-dashed rounded-lg transition-colors ${isDragging ? 'border-primary bg-primary/5' : 'border-white/[0.08]'
          }`}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFileSelect(file);
          }}
        />

        {previewUrl ? (
          <div
            className="relative group mx-auto"
            style={maxPreviewWidth ? { maxWidth: maxPreviewWidth } : undefined}
          >
            <img
              src={previewUrl}
              alt="Preview"
              className="w-full rounded-lg object-cover"
              style={{ aspectRatio }}
            />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => fileInputRef.current?.click()}
              >
                Alterar
              </Button>
              <Button
                type="button"
                size="sm"
                variant="destructive"
                onClick={handleRemove}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ) : (
          <div
            className="flex flex-col items-center justify-center py-8 px-4 cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            {isUploading ? (
              <Loader2 className="w-10 h-10 text-muted-foreground animate-spin" />
            ) : (
              <>
                <Upload className="w-10 h-10 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground text-center">
                  Arraste ou clique para selecionar
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  JPG, PNG ou WEBP (máx. {maxSizeMB}MB)
                </p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
