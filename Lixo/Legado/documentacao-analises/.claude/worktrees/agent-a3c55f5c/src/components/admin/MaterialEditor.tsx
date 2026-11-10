import React, { useState, useEffect } from "react";
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
import { Link2, FileText, Download, Code } from "lucide-react";

export type MaterialType = "link" | "text" | "download" | "embed";

export interface Material {
  id?: string;
  type: MaterialType;
  title: string;
  content: string;
  description?: string;
  is_required: boolean;
  order_index: number;
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
};

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

  // Sync form state with material prop when modal opens
  useEffect(() => {
    if (open && material) {
      setType(material.type);
      setTitle(material.title);
      setContent(material.content);
      setDescription(material.description || "");
      setIsRequired(material.is_required);
    } else if (open && !material) {
      setType("link");
      setTitle("");
      setContent("");
      setDescription("");
      setIsRequired(false);
    }
  }, [open, material]);

  const handleSave = () => {
    if (!title.trim() || !content.trim()) return;

    onSave({
      type,
      title: title.trim(),
      content: content.trim(),
      description: description.trim() || undefined,
      is_required: isRequired,
    });

    onOpenChange(false);
  };

  const info = materialTypeInfo[type];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {material ? "Editar Material" : "Adicionar Material"}
          </DialogTitle>
          <DialogDescription>
            Adicione materiais complementares para enriquecer a aula
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
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
              {type === "text" ? "Conteúdo" : "URL"}
            </Label>
            {type === "text" ? (
              <Textarea
                id="material-content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={info.placeholder}
                rows={5}
              />
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

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={!title.trim() || !content.trim()}
            className="gradient-primary"
          >
            {material ? "Atualizar" : "Adicionar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
