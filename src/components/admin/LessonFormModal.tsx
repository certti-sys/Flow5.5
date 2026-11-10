import React, { useState, useEffect } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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
import { toast } from "sonner";
import { z } from "zod";
import { detectPlatform, getPlatformInfo, extractVideoUrl, normalizeVimeoUrl, normalizePandaVideoUrl, normalizeBunnyUrl, normalizeVTurbUrl, normalizeGoogleDriveUrl } from "@/lib/videoUtils";
import { VideoPreview } from "./VideoPreview";
import { MaterialEditor, Material, MaterialType } from "./MaterialEditor";
import { Info, AlertTriangle, Plus, GripVertical, Trash2, Pencil, Link2, FileText, Download, Code, Play } from "lucide-react";

// Schema now makes video_url and duration optional
const lessonSchema = z.object({
  title: z.string().min(3, "Título deve ter no mínimo 3 caracteres"),
  duration: z.string().optional(),
  video_url: z.string().url("URL de vídeo inválida").optional().or(z.literal("")),
  module_id: z.string().uuid("Selecione um módulo"),
  description: z.string().optional(),
  is_public: z.boolean().optional(),
});

const materialIcons: Record<MaterialType, React.ReactNode> = {
  link: <Link2 className="w-4 h-4" />,
  text: <FileText className="w-4 h-4" />,
  download: <Download className="w-4 h-4" />,
  embed: <Code className="w-4 h-4" />,
};

interface LessonFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseId: string;
  lesson?: any;
  preselectedModuleId?: string;
}

export function LessonFormModal({
  open,
  onOpenChange,
  courseId,
  lesson,
  preselectedModuleId,
}: LessonFormModalProps) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [duration, setDuration] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [moduleId, setModuleId] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [hasVideo, setHasVideo] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [selectedPlatform, setSelectedPlatform] = useState<string>("");
  const [isUrlValid, setIsUrlValid] = useState(false);
  
  // Materials state
  const [materials, setMaterials] = useState<Material[]>([]);
  const [materialEditorOpen, setMaterialEditorOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | undefined>(undefined);

  // Fetch existing materials when editing
  const { data: existingMaterials = [] } = useQuery({
    queryKey: ["lessonMaterials", lesson?.id],
    queryFn: async () => {
      if (!lesson?.id) return [];
      const { data, error } = await supabase
        .from("lesson_materials")
        .select("*")
        .eq("lesson_id", lesson.id)
        .order("order_index");
      if (error) throw error;
      return data;
    },
    enabled: open && !!lesson?.id,
  });

  // Sync form state with lesson prop when modal opens
  useEffect(() => {
    if (open && lesson) {
      setTitle(lesson.title || "");
      setDuration(lesson.duration || "");
      setVideoUrl(lesson.video_url || "");
      setHasVideo(!!lesson.video_url);
      setModuleId(lesson.module_id || preselectedModuleId || "");
      setDescription(lesson.description || "");
      setIsPublic(lesson.is_public ?? true);
      
      // Auto-detect platform from existing URL
      if (lesson.video_url) {
        const cleanUrl = extractVideoUrl(lesson.video_url);
        const platform = detectPlatform(cleanUrl);
        setSelectedPlatform(platform);
      }
    } else if (open && !lesson) {
      setTitle("");
      setDuration("");
      setVideoUrl("");
      setHasVideo(true);
      setModuleId(preselectedModuleId || "");
      setDescription("");
      setIsPublic(true);
      setSelectedPlatform("");
      setMaterials([]);
    }
  }, [open, lesson, preselectedModuleId]);

  // Sync materials when existing materials are loaded
  useEffect(() => {
    if (existingMaterials.length > 0) {
      setMaterials(existingMaterials.map((m: any) => ({
        id: m.id,
        type: m.type as MaterialType,
        title: m.title,
        content: m.content,
        description: m.description,
        is_required: m.is_required,
        order_index: m.order_index,
      })));
    }
  }, [existingMaterials]);

  // Auto-detect platform when URL changes
  useEffect(() => {
    if (videoUrl) {
      const cleanUrl = extractVideoUrl(videoUrl);
      const platform = detectPlatform(cleanUrl);
      setSelectedPlatform(platform);
    }
  }, [videoUrl]);

  // Clear errors when modal closes
  useEffect(() => {
    if (!open) {
      setErrors({});
    }
  }, [open]);

  const { data: modules = [] } = useQuery({
    queryKey: ["courseModules", courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("modules")
        .select("*")
        .eq("course_id", courseId)
        .order("order_index");
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  // Material handlers
  const handleAddMaterial = (material: Omit<Material, "id" | "order_index">) => {
    setMaterials((prev) => [
      ...prev,
      {
        ...material,
        id: `temp-${Date.now()}`,
        order_index: prev.length,
      },
    ]);
  };

  const handleEditMaterial = (material: Omit<Material, "id" | "order_index">) => {
    if (!editingMaterial) return;
    setMaterials((prev) =>
      prev.map((m) =>
        m.id === editingMaterial.id ? { ...m, ...material } : m
      )
    );
    setEditingMaterial(undefined);
  };

  const handleDeleteMaterial = (id: string) => {
    setMaterials((prev) => prev.filter((m) => m.id !== id));
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      // Normalize URL based on platform (only if has video)
      let normalizedUrl = hasVideo ? videoUrl : null;
      
      if (hasVideo && videoUrl) {
        const cleanUrl = extractVideoUrl(videoUrl);
        const platform = detectPlatform(cleanUrl);
        
        switch (platform) {
          case 'vimeo':
            normalizedUrl = normalizeVimeoUrl(cleanUrl);
            break;
          case 'panda-video':
            normalizedUrl = normalizePandaVideoUrl(cleanUrl);
            break;
          case 'bunny':
            normalizedUrl = normalizeBunnyUrl(cleanUrl);
            break;
          case 'vturb':
            normalizedUrl = normalizeVTurbUrl(cleanUrl);
            break;
          case 'google-drive':
            normalizedUrl = normalizeGoogleDriveUrl(cleanUrl);
            break;
          default:
            normalizedUrl = cleanUrl;
        }
      }

      // Only validate video_url if hasVideo is true
      const dataToValidate: any = {
        title,
        module_id: moduleId,
        description,
        is_public: isPublic,
      };

      if (hasVideo) {
        dataToValidate.video_url = normalizedUrl;
        dataToValidate.duration = duration;
      }

      const validation = lessonSchema.safeParse(dataToValidate);

      if (!validation.success) {
        const formattedErrors: Record<string, string> = {};
        validation.error.issues.forEach((err) => {
          if (err.path[0]) {
            formattedErrors[err.path[0].toString()] = err.message;
          }
        });
        setErrors(formattedErrors);
        throw new Error("Validação falhou");
      }

      let lessonId = lesson?.id;

      if (lesson) {
        const { error } = await supabase
          .from("lessons")
          .update({
            title,
            duration: hasVideo ? duration : null,
            video_url: normalizedUrl,
            module_id: moduleId,
            description,
            is_public: isPublic,
          })
          .eq("id", lesson.id);
        if (error) throw error;
      } else {
        const { data: maxOrder } = await supabase
          .from("lessons")
          .select("order_index")
          .eq("module_id", moduleId)
          .order("order_index", { ascending: false })
          .limit(1)
          .maybeSingle();

        const { data: newLesson, error } = await supabase.from("lessons").insert({
          title,
          duration: hasVideo ? duration : null,
          video_url: normalizedUrl,
          module_id: moduleId,
          description,
          is_public: isPublic,
          order_index: (maxOrder?.order_index || 0) + 1,
        }).select().single();
        
        if (error) throw error;
        lessonId = newLesson.id;
      }

      // Save materials
      if (lessonId) {
        // Delete existing materials first
        await supabase
          .from("lesson_materials")
          .delete()
          .eq("lesson_id", lessonId);

        // Insert new materials
        if (materials.length > 0) {
          const materialsToInsert = materials.map((m, index) => ({
            lesson_id: lessonId,
            type: m.type,
            title: m.title,
            content: m.content,
            description: m.description || null,
            is_required: m.is_required,
            order_index: index,
          }));

          const { error: materialError } = await supabase
            .from("lesson_materials")
            .insert(materialsToInsert);

          if (materialError) throw materialError;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["courseModules"] });
      queryClient.invalidateQueries({ queryKey: ["lessonMaterials"] });
      toast.success(lesson ? "Aula atualizada!" : "Aula criada!");
      onOpenChange(false);
      setTitle("");
      setDuration("");
      setVideoUrl("");
      setHasVideo(true);
      setModuleId(preselectedModuleId || "");
      setDescription("");
      setIsPublic(true);
      setMaterials([]);
      setErrors({});
    },
    onError: (error: any) => {
      if (error.message !== "Validação falhou") {
        toast.error(error.message || "Erro ao salvar aula");
      }
    },
  });

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange} modal={true}>
        <DialogContent className="glass-card border-white/10 rounded-[20px] sm:max-w-[600px] max-h-[90vh] overflow-y-auto p-0 bg-black/90 backdrop-blur-xl scrollbar-styled">
          <DialogHeader className="px-6 py-5 border-b border-white/5 bg-white/[0.02]">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center border border-primary/30 shrink-0">
                <Play className="h-5 w-5 text-primary ml-0.5" />
              </div>
              <div className="text-left space-y-1">
                <DialogTitle className="text-[20px] font-bold text-white tracking-tight">
                  {lesson ? "Editar Aula" : "Nova Aula"}
                </DialogTitle>
                <DialogDescription className="text-[14px] text-muted-foreground m-0">
                  {lesson ? "Atualize as informações da aula" : "Preencha os dados para criar uma nova aula"}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="p-6 space-y-6">
            <div className="bg-black/20 border border-white/5 rounded-[12px] p-5 space-y-5">
              <div className="space-y-2">
                <Label htmlFor="module" className="text-white/80 font-medium">Módulo</Label>
                <Select value={moduleId} onValueChange={setModuleId}>
                  <SelectTrigger className="bg-transparent border-white/10 focus-visible:ring-primary/50 text-white h-[44px]">
                    <SelectValue placeholder="Selecione um módulo" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1C1C1E] border-white/10 text-white rounded-[12px]">
                    {modules.map((module) => (
                      <SelectItem key={module.id} value={module.id} className="focus:bg-white/10 focus:text-white">
                        {module.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.module_id && (
                  <p className="text-sm text-destructive">{errors.module_id}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="title" className="text-white/80 font-medium">Título da Aula</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Introdução ao React"
                  className="bg-transparent border-white/10 focus-visible:ring-primary/50 text-white placeholder:text-muted-foreground/50 h-[44px]"
                />
                {errors.title && (
                  <p className="text-sm text-destructive">{errors.title}</p>
                )}
              </div>
            </div>

            {/* Video Toggle */}
            <div className="flex items-center justify-between p-4 bg-black/20 border border-white/5 rounded-[12px]">
              <div className="space-y-0.5">
                <Label htmlFor="has_video" className="text-white/80 font-medium">Esta aula tem vídeo</Label>
                <p className="text-xs text-muted-foreground">
                  Desative para aulas com apenas texto ou links
                </p>
              </div>
                <Switch
                  id="has_video"
                  checked={hasVideo}
                  onCheckedChange={setHasVideo}
                  className="data-[state=checked]:bg-primary"
                />
            </div>

            {/* Video Section - Only show if hasVideo is true */}
            {hasVideo && (
              <div className="bg-black/20 border border-white/5 rounded-[12px] p-5 space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="duration" className="text-white/80 font-medium">Duração</Label>
                  <Input
                    id="duration"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    placeholder="Ex: 15min ou 1h30min"
                    className="bg-transparent border-white/10 focus-visible:ring-primary/50 text-white placeholder:text-muted-foreground/50 h-[44px]"
                  />
                  {errors.duration && (
                    <p className="text-sm text-destructive">{errors.duration}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="platform" className="text-white/80 font-medium">Plataforma de Vídeo</Label>
                  <Select value={selectedPlatform} onValueChange={setSelectedPlatform}>
                    <SelectTrigger className="bg-transparent border-white/10 focus-visible:ring-primary/50 text-white h-[44px]">
                      <SelectValue placeholder="Auto-detectar da URL" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1C1C1E] border-white/10 text-white rounded-[12px]">
                      <SelectItem value="youtube" className="focus:bg-white/10 focus:text-white">📺 YouTube</SelectItem>
                      <SelectItem value="vimeo" className="focus:bg-white/10 focus:text-white">🎬 Vimeo</SelectItem>
                      <SelectItem value="panda-video" className="focus:bg-white/10 focus:text-white">🐼 Panda Video</SelectItem>
                      <SelectItem value="bunny" className="focus:bg-white/10 focus:text-white">🐰 Bunny.net</SelectItem>
                      <SelectItem value="vturb" className="focus:bg-white/10 focus:text-white">▶️ VTurb</SelectItem>
                      <SelectItem value="file" className="focus:bg-white/10 focus:text-white">🎥 Arquivo MP4</SelectItem>
                      <SelectItem value="google-drive" className="focus:bg-white/10 focus:text-white">📂 Google Drive</SelectItem>
                    </SelectContent>
                  </Select>
                  {selectedPlatform && (
                    <div className="flex items-start gap-2 p-3 bg-primary/10 border border-primary/20 rounded-lg">
                      <Info className="w-4 h-4 mt-0.5 text-primary flex-shrink-0" />
                      <div className="text-xs text-white/80 space-y-1">
                        <p className="font-medium">Formatos aceitos para {getPlatformInfo(selectedPlatform).name}:</p>
                        {getPlatformInfo(selectedPlatform).urlPatterns.map((pattern, i) => (
                          <p key={i} className="font-mono opacity-80">• {pattern}</p>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="video_url" className="text-white/80 font-medium">URL do Vídeo</Label>
                  <Input
                    id="video_url"
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    placeholder="Cole a URL do vídeo aqui..."
                    className="bg-transparent border-white/10 focus-visible:ring-primary/50 text-white placeholder:text-muted-foreground/50 h-[44px]"
                  />
                  {errors.video_url && (
                    <p className="text-sm text-destructive">{errors.video_url}</p>
                  )}
                </div>

                {videoUrl && (
                  <div className="space-y-2">
                    <Label className="text-white/80 font-medium">Preview do Vídeo</Label>
                    <VideoPreview 
                      url={videoUrl} 
                      platform={selectedPlatform}
                      onValidation={setIsUrlValid}
                    />
                  </div>
                )}

                {['panda-video', 'vturb', 'bunny', 'google-drive'].includes(selectedPlatform) && (
                  <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                    <AlertTriangle className="w-4 h-4 mt-0.5 text-amber-500 flex-shrink-0" />
                    <p className="text-xs text-amber-500">
                      Esta plataforma não suporta rastreamento automático de progresso. 
                      O aluno precisará marcar a aula como concluída manualmente.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Materials Section */}
            <div className="bg-black/20 border border-white/5 rounded-[12px] p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-white/80 font-medium">📎 Materiais Complementares</Label>
                  <p className="text-xs text-muted-foreground pt-1">
                    Links, textos, downloads ou embeds
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEditingMaterial(undefined);
                    setMaterialEditorOpen(true);
                  }}
                  className="bg-white/5 border-white/10 hover:bg-white/10 text-white rounded-[10px]"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Adicionar
                </Button>
              </div>

              {materials.length > 0 ? (
                <div className="space-y-2">
                  {materials.map((material, index) => (
                    <div
                      key={material.id}
                      className="flex items-center gap-2 p-3 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors group cursor-move"
                    >
                      <GripVertical className="w-4 h-4 text-white/30 group-hover:text-white/60 flex-shrink-0" />
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className="flex-shrink-0 text-white/60">{materialIcons[material.type]}</span>
                        <span className="text-sm truncate text-white/80">{material.title}</span>
                        {material.is_required && (
                          <span className="text-[10px] text-primary bg-primary/20 border border-primary/30 px-1.5 py-0.5 rounded flex-shrink-0 font-medium uppercase tracking-wider">
                            Obrigatório
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-white/60 hover:text-white hover:bg-white/10"
                          onClick={() => {
                            setEditingMaterial(material);
                            setMaterialEditorOpen(true);
                          }}
                        >
                          <Pencil className="w-3 h-3" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-white/60 hover:text-destructive hover:bg-destructive/20"
                          onClick={() => handleDeleteMaterial(material.id!)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-6 border border-dashed border-white/10 rounded-[12px] bg-black/10">
                  <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center mb-2">
                    <FileText className="w-5 h-5 text-white/40" />
                  </div>
                  <p className="text-sm text-white/40 font-medium">Nenhum material adicionado</p>
                </div>
              )}
            </div>

            <div className="bg-black/20 border border-white/5 rounded-[12px] p-5 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="description" className="text-white/80 font-medium">Descrição (opcional)</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Descreva o conteúdo da aula..."
                  rows={3}
                  className="bg-transparent border-white/10 focus-visible:ring-primary/50 text-white placeholder:text-muted-foreground/50 resize-none"
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-[12px]">
                <div className="space-y-0.5">
                  <Label htmlFor="is_public" className="text-white/80 font-medium">Aula Pública</Label>
                  <p className="text-xs text-muted-foreground pt-1">
                    Aulas públicas são visíveis sem login
                  </p>
                </div>
                <Switch
                  id="is_public"
                  checked={isPublic}
                  onCheckedChange={setIsPublic}
                  className="data-[state=checked]:bg-primary"
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="p-6 border-t border-white/5 bg-black/40 flex items-center justify-end gap-3 rounded-b-[20px]">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="h-[44px] px-6 glass-card border-white/10 hover:bg-white/5 rounded-[12px] text-white bg-transparent w-full sm:w-auto"
            >
              Cancelar
            </Button>
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              className="h-[44px] px-6 rounded-[12px] font-bold bg-primary hover:bg-primary/90 text-white w-full sm:w-auto min-w-[120px]"
            >
              {saveMutation.isPending ? "Salvando..." : "Salvar Aula"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Material Editor Modal */}
      <MaterialEditor
        open={materialEditorOpen}
        onOpenChange={setMaterialEditorOpen}
        material={editingMaterial}
        onSave={editingMaterial ? handleEditMaterial : handleAddMaterial}
      />
    </>
  );
}

