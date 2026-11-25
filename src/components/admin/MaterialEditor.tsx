import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Link2, FileText, Download, Code, BookOpen, Upload, Loader2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type MaterialType = "link" | "text" | "download" | "embed" | "pdf";

export interface Material {
  id?: string;
  type: MaterialType;
  title: string;
  content: string;
  description?: string;
  is_required: boolean;
  order_index: number;
  /** Só para type=pdf: content é o caminho no bucket lesson-files. */
  file_meta?: { size?: number; name?: string };
}

interface MaterialEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  material?: Material;
  onSave: (material: Omit<Material, "id" | "order_index">) => void;
}

const materialTypeInfo: Record<MaterialType, { icon: React.ReactNode; label: string; placeholder: string; hint: string }> = {
  link: {
    icon: <Link2 className="w-4 h-4" />,
    label: "Link Externo",
    placeholder: "https://exemplo.com/documentacao",
    hint: "URL que será aberta em uma nova aba",
  },
  text: {
    icon: <FileText className="w-4 h-4" />,
    label: "Texto/Artigo",
    placeholder: "Digite o conteúdo do texto ou artigo...",
    hint: "Conteúdo em texto que será exibido na aula",
  },
  download: {
    icon: <Download className="w-4 h-4" />,
    label: "Download",
    placeholder: "https://exemplo.com/arquivo.pdf",
    hint: "URL do arquivo para download",
  },
  embed: {
    icon: <Code className="w-4 h-4" />,
    label: "Embed",
    placeholder: "https://www.figma.com/embed?...",
    hint: "URL de embed (Figma, Canva, Google Docs, etc.)",
  },
  pdf: {
    icon: <BookOpen className="w-4 h-4" />,
    label: "PDF (leitor)",
    placeholder: "",
    hint: "Arquivo enviado para o bucket privado e aberto no leitor da aula",
  },
};

const MAX_PDF_BYTES = 50 * 1024 * 1024;

export function MaterialEditor({
  open,
  onOpenChange,
  material,
  onSave,
}: MaterialEditorProps) {
  const [type, setType] = useState<MaterialType>("link");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [description, setDescription] = useState("");
  const [isRequired, setIsRequired] = useState(false);
  const [fileMeta, setFileMeta] = useState<{ size?: number; name?: string } | undefined>();
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync form state with material prop when modal opens
  useEffect(() => {
    if (open && material) {
      setType(material.type);
      setTitle(material.title);
      setContent(material.content);
      setDescription(material.description || "");
      setIsRequired(material.is_required);
      setFileMeta(material.file_meta);
    } else if (open && !material) {
      setType("link");
      setTitle("");
      setContent("");
      setDescription("");
      setIsRequired(false);
      setFileMeta(undefined);
    }
  }, [open, material]);

  const uploadPdf = async (file: File) => {
    if (file.type !== "application/pdf") {
      toast.error("Envie um arquivo PDF.");
      return;
    }
    if (file.size > MAX_PDF_BYTES) {
      toast.error("PDF acima de 50 MB.");
      return;
    }

    setUploading(true);
    try {
      // Nome aleatório: caminho não adivinhável, e o bucket é privado de todo
      // jeito — o aluno só lê por URL assinada.
      const path = `pdf/${crypto.randomUUID()}.pdf`;
      const { error } = await supabase.storage
        .from("lesson-files")
        .upload(path, file, { cacheControl: "3600", upsert: false, contentType: "application/pdf" });
      if (error) throw error;

      setContent(path);
      setFileMeta({ size: file.size, name: file.name });
      if (!title.trim()) setTitle(file.name.replace(/\.pdf$/i, ""));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha no upload do PDF");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = () => {
    if (!title.trim() || !content.trim()) return;

    onSave({
      type,
      title: title.trim(),
      content: content.trim(),
      description: description.trim() || undefined,
      is_required: isRequired,
      file_meta: type === "pdf" ? fileMeta : undefined,
    });

    onOpenChange(false);
  };

  const info = materialTypeInfo[type];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 sm:max-w-[500px]">
        <DialogHeader className="px-6 py-5 border-b border-white/5 bg-white/[0.02]">
          <DialogTitle className="text-[20px] font-bold text-white tracking-tight">
            {material ? "Editar Material" : "Adicionar Material"}
          </DialogTitle>
          <DialogDescription className="text-[14px] text-muted-foreground m-0">
            Adicione materiais complementares para enriquecer a aula
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 px-6 py-5">
          <div className="space-y-2">
            <Label>Tipo de Material</Label>
            <Select value={type} onValueChange={(v) => setType(v as MaterialType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(materialTypeInfo).map(([key, info]) => (
                  <SelectItem key={key} value={key}>
                    <span className="flex items-center gap-2">
                      {info.icon}
                      {info.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="material-title">Título</Label>
            <Input
              id="material-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Documentação Oficial"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="material-content">
              {type === "text" ? "Conteúdo" : type === "pdf" ? "Arquivo PDF" : "URL"}
            </Label>
            {type === "text" ? (
              <Textarea
                id="material-content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={info.placeholder}
                rows={5}
              />
            ) : type === "pdf" ? (
              <div className="space-y-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void uploadPdf(file);
                    e.target.value = "";
                  }}
                />
                {content ? (
                  <div className="flex items-center gap-2 rounded-[10px] border border-white/10 bg-white/[0.02] px-3 py-2">
                    <BookOpen className="w-4 h-4 text-primary shrink-0" />
                    <span className="text-sm truncate flex-1">
                      {fileMeta?.name || content.split("/").pop()}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setContent("");
                        setFileMeta(undefined);
                      }}
                      aria-label="Remover arquivo"
                      className="h-7 w-7 p-0 shrink-0"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="w-full h-[44px] gap-2 glass-card border-white/10 bg-transparent"
                  >
                    {uploading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4" />
                    )}
                    {uploading ? "Enviando…" : "Escolher PDF"}
                  </Button>
                )}
              </div>
            ) : (
              <Input
                id="material-content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={info.placeholder}
              />
            )}
            <p className="text-xs text-muted-foreground">{info.hint}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="material-description">Descrição (opcional)</Label>
            <Textarea
              id="material-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Breve descrição do material..."
              rows={2}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="is_required">Material Obrigatório</Label>
              <p className="text-xs text-muted-foreground">
                Marque se este material é essencial para a aula
              </p>
            </div>
            <Switch
              id="is_required"
              checked={isRequired}
              onCheckedChange={setIsRequired}
            />
          </div>
        </div>

        <DialogFooter className="px-6 py-5 border-t border-white/5 bg-black/40 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="h-[44px] px-6 glass-card border-white/10 hover:bg-white/5 rounded-[12px] text-white bg-transparent font-bold"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={!title.trim() || !content.trim()}
            className="h-[44px] px-6 rounded-[12px] font-bold"
          >
            {material ? "Atualizar" : "Adicionar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
