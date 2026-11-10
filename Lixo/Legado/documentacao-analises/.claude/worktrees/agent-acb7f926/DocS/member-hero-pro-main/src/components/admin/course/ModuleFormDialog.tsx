import { useState, useEffect } from "react";
import { Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import type { Module } from "@/hooks/useModules";

interface ModuleFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  module: Module | null;
  onSave: (data: Omit<Module, 'id' | 'criadoEm'>) => void;
}

export function ModuleFormDialog({
  open,
  onOpenChange,
  module,
  onSave,
}: ModuleFormDialogProps) {
  const { toast } = useToast();
  const isEditing = !!module;

  const [formData, setFormData] = useState({
    nome: "",
    descricao: "",
    imagem: "",
    status: "Rascunho" as "Publicado" | "Rascunho",
  });

  useEffect(() => {
    if (module) {
      setFormData({
        nome: module.nome,
        descricao: module.descricao,
        imagem: module.imagem || "",
        status: module.status,
      });
    } else {
      setFormData({
        nome: "",
        descricao: "",
        imagem: "",
        status: "Rascunho",
      });
    }
  }, [module, open]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Erro",
        description: "A imagem deve ter no máximo 5MB",
        variant: "destructive",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setFormData((prev) => ({ ...prev, imagem: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = () => {
    if (!formData.nome.trim()) {
      toast({
        title: "Erro",
        description: "O nome do módulo é obrigatório",
        variant: "destructive",
      });
      return;
    }

    onSave({
      ...formData,
      cursoId: module?.cursoId || "",
      ordem: module?.ordem || 1,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar Módulo" : "Criar Novo Módulo"}
          </DialogTitle>
          <DialogDescription>
            Configure as informações e a thumbnail do módulo
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="nome">Nome do Módulo *</Label>
            <Input
              id="nome"
              value={formData.nome}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, nome: e.target.value }))
              }
              placeholder="Ex: Introdução ao Marketing"
              className="bg-background/50 border-border/50"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="descricao">Descrição</Label>
            <Textarea
              id="descricao"
              value={formData.descricao}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, descricao: e.target.value }))
              }
              placeholder="Descreva o conteúdo deste módulo"
              rows={3}
              className="bg-background/50 border-border/50"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="imagem">Thumbnail do Módulo</Label>
            <p className="text-xs text-muted-foreground">
              Imagem exibida na vitrine do curso (recomendado: 16:10 ou 16:9)
            </p>
            <div className="space-y-4">
              {formData.imagem && (
                <div className="relative w-full aspect-video rounded-lg overflow-hidden border border-border">
                  <img
                    src={formData.imagem}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, imagem: "" }))}
                    className="absolute top-2 right-2 p-1.5 bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
              <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-border/50 rounded-lg cursor-pointer hover:border-primary/50 transition-colors bg-background/30">
                <Upload className="h-6 w-6 text-muted-foreground mb-1" />
                <span className="text-sm text-muted-foreground">
                  Clique para fazer upload
                </span>
                <input
                  id="imagem"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                />
              </label>
            </div>
          </div>

          <div className="flex items-center justify-between py-2">
            <div className="space-y-0.5">
              <Label htmlFor="status">Publicar módulo</Label>
              <p className="text-sm text-muted-foreground">
                Módulos publicados ficam visíveis para os alunos
              </p>
            </div>
            <Switch
              id="status"
              checked={formData.status === "Publicado"}
              onCheckedChange={(checked) =>
                setFormData((prev) => ({
                  ...prev,
                  status: checked ? "Publicado" : "Rascunho",
                }))
              }
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} className="bg-primary text-primary-foreground">
            {isEditing ? "Salvar Alterações" : "Criar Módulo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
