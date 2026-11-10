import { useState, useEffect, useRef, useMemo } from "react";
import { Video, FileText, File, Link2, Upload, X, CheckCircle2, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { converterParaBase64, Lesson } from "@/hooks/useLessons";
import { detectVideoSource, isValidEmbed, getVideoSourceLabel } from "@/utils/videoSourceDetector";
import { VideoPreview } from "./VideoPreview";

type TipoConteudo = "video" | "pdf" | "arquivo" | "externo" | "panda_video" | "host_vsl";

const tiposConteudo: { value: TipoConteudo; label: string; icon: React.ElementType }[] = [
  { value: "video", label: "Vídeo", icon: Video },
  { value: "pdf", label: "PDF", icon: FileText },
  { value: "arquivo", label: "Arquivo", icon: File },
  { value: "externo", label: "Link", icon: Link2 },
];

interface LessonFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lesson: Lesson | null;
  moduleId: string;
  courseId: string;
  onSave: (data: Omit<Lesson, "id" | "criadoEm">) => void;
}

export function LessonFormDialog({
  open,
  onOpenChange,
  lesson,
  moduleId,
  courseId,
  onSave,
}: LessonFormDialogProps) {
  const { toast } = useToast();
  const isEditing = !!lesson;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);
  const materialsInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    nome: "",
    descricao: "",
    tipo: "video" as TipoConteudo,
    url: "",
    thumbnail: "",
    arquivo: "",
    arquivoNome: "",
    materiaisExtras: [] as string[],
    status: "Rascunho" as "Publicado" | "Rascunho",
  });

  useEffect(() => {
    if (lesson) {
      setFormData({
        nome: lesson.nome,
        descricao: lesson.descricao,
        tipo: lesson.tipo,
        url: lesson.url,
        thumbnail: lesson.thumbnail,
        arquivo: lesson.arquivo,
        arquivoNome: "",
        materiaisExtras: lesson.materiaisExtras,
        status: lesson.status,
      });
    } else {
      setFormData({
        nome: "",
        descricao: "",
        tipo: "video",
        url: "",
        thumbnail: "",
        arquivo: "",
        arquivoNome: "",
        materiaisExtras: [],
        status: "Rascunho",
      });
    }
  }, [lesson, open]);

  const handleThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const base64 = await converterParaBase64(file);
        setFormData((prev) => ({ ...prev, thumbnail: base64 }));
      } catch (error) {
        toast({
          title: "Erro ao carregar imagem",
          description: "Não foi possível processar a imagem.",
          variant: "destructive",
        });
      }
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const base64 = await converterParaBase64(file);
        setFormData((prev) => ({ ...prev, arquivo: base64, arquivoNome: file.name }));
      } catch (error) {
        toast({
          title: "Erro ao carregar arquivo",
          description: "Não foi possível processar o arquivo.",
          variant: "destructive",
        });
      }
    }
  };

  const handleMaterialsUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    try {
      const newMaterials: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const base64 = await converterParaBase64(files[i]);
        newMaterials.push(base64);
      }
      setFormData((prev) => ({
        ...prev,
        materiaisExtras: [...prev.materiaisExtras, ...newMaterials],
      }));
      toast({
        title: "Materiais adicionados",
        description: `${newMaterials.length} arquivo(s) adicionado(s)`,
      });
    } catch (error) {
      toast({
        title: "Erro ao carregar materiais",
        description: "Não foi possível processar os arquivos.",
        variant: "destructive",
      });
    }
  };

  const handleAddMaterialLink = () => {
    const link = prompt("Cole o link do material (Google Drive, Dropbox, etc.):");
    if (link && link.trim()) {
      setFormData((prev) => ({
        ...prev,
        materiaisExtras: [...prev.materiaisExtras, link.trim()],
      }));
      toast({
        title: "Link adicionado",
        description: "Material complementar adicionado",
      });
    }
  };

  const handleRemoveMaterial = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      materiaisExtras: prev.materiaisExtras.filter((_, i) => i !== index),
    }));
  };

  // Detectar automaticamente o tipo de vídeo quando URL muda
  const detectedSource = useMemo(() => {
    if (formData.tipo !== "video" || !formData.url.trim()) {
      return null;
    }
    try {
      return detectVideoSource(formData.url);
    } catch {
      return null;
    }
  }, [formData.url, formData.tipo]);

  // Validar embed quando é Panda Video ou Host VSL
  const embedValidation = useMemo(() => {
    if (!detectedSource?.isEmbed) {
      return null;
    }
    return isValidEmbed(formData.url);
  }, [detectedSource, formData.url]);

  const handleSubmit = () => {
    if (!formData.nome.trim()) {
      toast({
        title: "Campo obrigatório",
        description: "Digite o nome da aula.",
        variant: "destructive",
      });
      return;
    }

    if ((formData.tipo === "video" || formData.tipo === "externo") && !formData.url.trim()) {
      toast({
        title: "Campo obrigatório",
        description: "Digite a URL do conteúdo.",
        variant: "destructive",
      });
      return;
    }

    // Validar embed se for Panda Video ou Host VSL
    if (detectedSource?.isEmbed && embedValidation && !embedValidation.valid) {
      toast({
        title: "Embed inválido",
        description: embedValidation.error || "O código embed contém elementos não permitidos.",
        variant: "destructive",
      });
      return;
    }

    if ((formData.tipo === "pdf" || formData.tipo === "arquivo") && !formData.arquivo) {
      toast({
        title: "Campo obrigatório",
        description: "Faça upload do arquivo.",
        variant: "destructive",
      });
      return;
    }

    // Determinar o tipo final baseado na detecção automática
    let tipoFinal: TipoConteudo = formData.tipo;
    if (formData.tipo === "video" && detectedSource) {
      if (detectedSource.type === "panda_video") {
        tipoFinal = "panda_video";
      } else if (detectedSource.type === "host_vsl") {
        tipoFinal = "host_vsl";
      }
    }

    onSave({
      moduloId: moduleId,
      cursoId: courseId,
      nome: formData.nome,
      descricao: formData.descricao,
      tipo: tipoFinal,
      url: formData.url,
      thumbnail: formData.thumbnail,
      arquivo: formData.arquivo,
      materiaisExtras: formData.materiaisExtras,
      status: formData.status,
      ordem: lesson?.ordem || 1,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Aula" : "Criar Nova Aula"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Atualize as informações da aula"
              : "Preencha os dados para criar uma nova aula"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Nome */}
          <div className="space-y-2">
            <Label htmlFor="nome">Nome da Aula *</Label>
            <Input
              id="nome"
              value={formData.nome}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, nome: e.target.value }))
              }
              placeholder="Ex: Aula 1 - Introdução"
              className="bg-background/50 border-border/50"
            />
          </div>

          {/* Descrição */}
          <div className="space-y-2">
            <Label htmlFor="descricao">Descrição</Label>
            <Textarea
              id="descricao"
              value={formData.descricao}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, descricao: e.target.value }))
              }
              placeholder="Descreva o conteúdo desta aula"
              rows={2}
              className="bg-background/50 border-border/50"
            />
          </div>

          {/* Tipo de Conteúdo */}
          <div className="space-y-2">
            <Label>Tipo de Conteúdo</Label>
            <div className="grid grid-cols-4 gap-2">
              {tiposConteudo.map((item) => {
                const Icon = item.icon;
                const isSelected = formData.tipo === item.value;
                return (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() =>
                      setFormData((prev) => ({ ...prev, tipo: item.value }))
                    }
                    className={`flex flex-col items-center justify-center gap-1 p-3 rounded-lg border transition-all ${
                      isSelected
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background/50 border-border/50 hover:border-primary/50"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="text-xs font-medium">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* URL (Video/Externo) */}
          {(formData.tipo === "video" || formData.tipo === "externo") && (
            <div className="space-y-2">
              <Label htmlFor="url">
                {formData.tipo === "video" ? "URL ou Código Embed" : "URL Externa"}
              </Label>
              <Textarea
                id="url"
                value={formData.url}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, url: e.target.value }))
                }
                placeholder={
                  formData.tipo === "video"
                    ? "Cole a URL (YouTube, Vimeo) ou código embed (Panda Video, Host VSL)"
                    : "Cole a URL externa"
                }
                rows={formData.url.includes('<iframe') ? 4 : 1}
                className="bg-background/50 border-border/50 resize-none"
              />
              
              {/* Feedback de detecção automática */}
              {formData.tipo === "video" && detectedSource && (
                <div className="flex items-center gap-2">
                  <Badge 
                    variant={embedValidation?.valid === false ? "destructive" : "secondary"}
                    className="text-xs"
                  >
                    {embedValidation?.valid === false ? (
                      <>⚠️ {embedValidation.error}</>
                    ) : (
                      <>
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Detectado: {getVideoSourceLabel(detectedSource.type)}
                      </>
                    )}
                  </Badge>
                </div>
              )}

              {/* Preview do Vídeo */}
              {formData.tipo === "video" && formData.url.trim() && (
                <div className="space-y-2 mt-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Eye className="h-4 w-4" />
                    <span>Preview do Vídeo</span>
                  </div>
                  <VideoPreview
                    url={formData.url}
                    detectedSource={detectedSource}
                    isValid={embedValidation?.valid !== false}
                  />
                </div>
              )}
            </div>
          )}

          {/* Upload de Arquivo (PDF/Arquivo) */}
          {(formData.tipo === "pdf" || formData.tipo === "arquivo") && (
            <div className="space-y-2">
              <Label>Upload de Arquivo</Label>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept={formData.tipo === "pdf" ? ".pdf" : ".pdf,.zip,.docx,.doc"}
                className="hidden"
              />
              {formData.arquivo ? (
                <div className="flex items-center justify-between p-3 bg-background/50 rounded-lg border border-border/50">
                  <div className="flex items-center gap-3">
                    <FileText className="h-6 w-6 text-primary" />
                    <span className="text-sm">
                      {formData.arquivoNome || "Arquivo carregado"}
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        arquivo: "",
                        arquivoNome: "",
                      }))
                    }
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full border-2 border-dashed border-border/50 rounded-lg p-6 hover:border-primary/50 transition-colors flex flex-col items-center justify-center gap-2"
                >
                  <Upload className="h-6 w-6 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    Clique para upload
                  </span>
                </button>
              )}
            </div>
          )}

          {/* Thumbnail (Video) */}
          {formData.tipo === "video" && (
            <div className="space-y-2">
              <Label>Miniatura (Opcional)</Label>
              <input
                type="file"
                ref={thumbnailInputRef}
                onChange={handleThumbnailUpload}
                accept="image/*"
                className="hidden"
              />
              {formData.thumbnail ? (
                <div className="relative w-full max-w-xs">
                  <img
                    src={formData.thumbnail}
                    alt="Miniatura"
                    className="w-full aspect-video object-cover rounded-lg"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2 h-6 w-6"
                    onClick={() =>
                      setFormData((prev) => ({ ...prev, thumbnail: "" }))
                    }
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => thumbnailInputRef.current?.click()}
                  className="w-full max-w-xs border-2 border-dashed border-border/50 rounded-lg p-4 hover:border-primary/50 transition-colors flex flex-col items-center justify-center gap-1"
                >
                  <Upload className="h-5 w-5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    Upload miniatura
                  </span>
                </button>
              )}
            </div>
          )}

          {/* Materiais Complementares */}
          <div className="space-y-3 pt-4 border-t border-border/40">
            <Label>Materiais Complementares</Label>
            <p className="text-sm text-muted-foreground">
              Adicione PDFs, documentos ou links externos
            </p>

            <input
              type="file"
              ref={materialsInputRef}
              onChange={handleMaterialsUpload}
              accept=".pdf,.doc,.docx,.zip,.txt"
              multiple
              className="hidden"
            />

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => materialsInputRef.current?.click()}
                className="flex-1"
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload Arquivos
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddMaterialLink}
                className="flex-1"
              >
                <Link2 className="h-4 w-4 mr-2" />
                Adicionar Link
              </Button>
            </div>

            {formData.materiaisExtras.length > 0 && (
              <div className="space-y-2">
                {formData.materiaisExtras.map((material, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 bg-background/50 rounded border border-border/50"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {material.startsWith("data:") ? (
                        <FileText className="h-4 w-4 text-primary flex-shrink-0" />
                      ) : (
                        <Link2 className="h-4 w-4 text-primary flex-shrink-0" />
                      )}
                      <span className="text-sm truncate">
                        {material.startsWith("data:")
                          ? `Arquivo ${index + 1}`
                          : material}
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 flex-shrink-0"
                      onClick={() => handleRemoveMaterial(index)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Status */}
          <div className="flex items-center justify-between py-2">
            <div className="space-y-0.5">
              <Label htmlFor="status">Publicar aula</Label>
              <p className="text-sm text-muted-foreground">
                Aulas publicadas ficam visíveis para os alunos
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
          <Button
            onClick={handleSubmit}
            className="bg-primary text-primary-foreground"
          >
            {isEditing ? "Salvar Alterações" : "Criar Aula"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
