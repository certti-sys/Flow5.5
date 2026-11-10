import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Upload, X, BookOpen } from "lucide-react";

const courseSchema = z.object({
  title: z.string().min(3, "Título deve ter no mínimo 3 caracteres"),
  description: z.string().max(500, "Descrição deve ter no máximo 500 caracteres").optional(),
  category: z.string().min(1, "Categoria é obrigatória"),
  instructor: z.string().min(1, "Instrutor é obrigatório"),
  duration: z.string().min(1, "Duração é obrigatória"),
  thumbnail: z.string().min(1, "Thumbnail é obrigatória"),
  show_card_overlay: z.boolean().default(true),
  show_category_badge: z.boolean().default(true),
  checkout_url: z.string().url("URL inválida").optional().or(z.literal("")),
});

type CourseFormData = z.infer<typeof courseSchema>;

interface CourseFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  course?: any;
}

export const CourseFormModal = ({ open, onOpenChange, course }: CourseFormModalProps) => {
  const queryClient = useQueryClient();
  const [thumbnailPreview, setThumbnailPreview] = useState("");
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const form = useForm<CourseFormData>({
    resolver: zodResolver(courseSchema),
    defaultValues: {
      title: "",
      description: "",
      category: "",
      instructor: "",
      duration: "",
      thumbnail: "",
      show_card_overlay: true,
      show_category_badge: true,
      checkout_url: "",
    },
  });

  // Fetch existing categories
  const { data: categories = [] } = useQuery({
    queryKey: ["courseCategories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("course_categories")
        .select("name")
        .order("name");

      // Fallback para buscar de cursos se tabela estiver vazia (migração gradual/segurança)
      if (!data || data.length === 0) {
        const { data: courseData } = await supabase
          .from("courses")
          .select("category")
          .order("category");

        if (courseData) {
          return [...new Set(courseData.map((c) => c.category))];
        }
        return [];
      }

      if (error) throw error;
      return data.map((c) => c.name);
    },
  });

  // Set form values when editing
  useEffect(() => {
    if (course) {
      form.reset({
        title: course.title,
        description: course.description || "",
        category: course.category,
        instructor: course.instructor,
        duration: course.duration,
        thumbnail: course.thumbnail,
        show_card_overlay: course.show_card_overlay !== false,
        show_category_badge: course.show_category_badge !== false,
        checkout_url: course.checkout_url || "",
      });
      setThumbnailPreview(course.thumbnail);
    } else {
      form.reset({
        title: "",
        description: "",
        category: "",
        instructor: "",
        duration: "",
        thumbnail: "",
        show_card_overlay: true,
        show_category_badge: true,
        checkout_url: "",
      });
      setThumbnailPreview("");
    }
  }, [course, form]);

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type)) {
      toast.error("Formato inválido. Use JPG, PNG ou WebP");
      return;
    }

    // Validate file size (2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Arquivo muito grande. Máximo 2MB");
      return;
    }

    setThumbnailFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setThumbnailPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Upload thumbnail to Supabase Storage
  const uploadThumbnail = async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${crypto.randomUUID()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('course-thumbnails')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('course-thumbnails')
      .getPublicUrl(filePath);

    return publicUrl;
  };

  // Create/Update mutation
  const saveMutation = useMutation({
    mutationFn: async (data: CourseFormData) => {
      let thumbnailUrl = data.thumbnail;

      // Upload new thumbnail if file was selected
      if (thumbnailFile) {
        setIsUploading(true);
        try {
          thumbnailUrl = await uploadThumbnail(thumbnailFile);
        } catch (error) {
          throw new Error("Erro ao fazer upload da thumbnail");
        } finally {
          setIsUploading(false);
        }
      }

      const courseData = { ...data, thumbnail: thumbnailUrl };

      if (course) {
        // Update
        const { data: updatedData, error } = await supabase
          .from("courses")
          .update(courseData)
          .eq("id", course.id)
          .select();

        if (error) throw error;
      } else {
        // Create
        const { data: createdData, error } = await supabase
          .from("courses")
          .insert([courseData])
          .select();

        if (error) throw error;
      }
    },
    onSuccess: async (data, variables) => {
      // Se criou nova categoria via Select, inserir na tabela de categorias
      const category = variables.category;
      // Verificar se já existe na lista atual (ou se é nova via input manual)
      // Com a mudança na lógica do select, talvez não precise de muito aqui se o input manual salva?
      // O componente Select com input manual apenas seta o valor no form.
      // Vamos garantir que seja salva no banco course_categories se não existir.
      if (category && !categories.includes(category)) {
        await supabase.from("course_categories").insert({ name: category }).select().maybeSingle();
      }

      queryClient.invalidateQueries({ queryKey: ["adminCourses"] });
      queryClient.invalidateQueries({ queryKey: ["courseCategories"] });
      toast.success(course ? "Curso atualizado com sucesso!" : "Curso criado com sucesso!");
      setThumbnailFile(null);
      setThumbnailPreview("");
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao salvar curso");
    },
  });

  const onSubmit = (data: CourseFormData) => {
    saveMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} modal={true}>
      <DialogContent className="glass-card border-white/10 rounded-[20px] max-w-3xl p-0 overflow-hidden bg-black/90 backdrop-blur-xl">
        <DialogHeader className="px-6 py-5 border-b border-white/5 bg-white/[0.02]">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center border border-primary/30 shrink-0">
              <BookOpen className="h-5 w-5 text-primary" />
            </div>
            <div className="text-left space-y-1">
              <DialogTitle className="text-[20px] font-bold text-white tracking-tight">
                {course ? "Editar Curso" : "Novo Curso"}
              </DialogTitle>
              <DialogDescription className="text-[14px] text-muted-foreground m-0">
                {course ? "Atualize as informações do curso" : "Preencha os dados para criar um novo curso"}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} id="course-form" className="flex flex-col">
            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto scrollbar-styled">
              <div className="bg-black/20 border border-white/5 rounded-[12px] p-5 space-y-5">
                {/* Title */}
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white/80 font-medium">Título *</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Nome do curso" 
                          {...field} 
                          className="bg-transparent border-white/10 focus-visible:ring-primary/50 text-white placeholder:text-muted-foreground/50 h-[44px]"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Description */}
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white/80 font-medium">Descrição</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Breve descrição do curso"
                          className="resize-none bg-transparent border-white/10 focus-visible:ring-primary/50 text-white placeholder:text-muted-foreground/50"
                          rows={3}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Category */}
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white/80 font-medium">Categoria *</FormLabel>
                      {!showNewCategoryInput ? (
                        <Select
                          onValueChange={(value) => {
                            if (value === "__new__") {
                              setShowNewCategoryInput(true);
                              field.onChange("");
                            } else {
                              field.onChange(value);
                            }
                          }}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="bg-transparent border-white/10 focus-visible:ring-primary/50 text-white h-[44px]">
                              <SelectValue placeholder="Selecione uma categoria" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-[#1C1C1E] border-white/10 text-white rounded-[12px]">
                            {categories.map((cat) => (
                              <SelectItem key={cat} value={cat} className="focus:bg-white/10 focus:text-white">
                                {cat}
                              </SelectItem>
                            ))}
                            <SelectItem value="__new__" className="focus:bg-white/10 focus:text-white">
                              + Nova categoria
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <div className="space-y-2">
                          <FormControl>
                            <Input
                              placeholder="Digite a nova categoria"
                              {...field}
                              className="bg-transparent border-white/10 focus-visible:ring-primary/50 text-white placeholder:text-muted-foreground/50 h-[44px]"
                            />
                          </FormControl>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setShowNewCategoryInput(false);
                              field.onChange("");
                            }}
                            className="text-xs text-muted-foreground hover:text-white"
                          >
                            Cancelar
                          </Button>
                        </div>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Instructor */}
                <FormField
                  control={form.control}
                  name="instructor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white/80 font-medium">Instrutor *</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Nome do instrutor" 
                          {...field} 
                          className="bg-transparent border-white/10 focus-visible:ring-primary/50 text-white placeholder:text-muted-foreground/50 h-[44px]"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

              {/* Duration and Checkout URL row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="duration"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white/80 font-medium">Duração *</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Ex: 8h, 12h, 3 dias" 
                          {...field} 
                          className="bg-transparent border-white/10 focus-visible:ring-primary/50 text-white placeholder:text-muted-foreground/50 h-[44px]"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Checkout URL */}
                <FormField
                  control={form.control}
                  name="checkout_url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white/80 font-medium">Link do Checkout Externo</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="https://pay.hotmart.com/..."
                          {...field}
                          className="bg-transparent border-white/10 focus-visible:ring-primary/50 text-white placeholder:text-muted-foreground/50 h-[44px]"
                        />
                      </FormControl>
                      <p className="text-xs text-muted-foreground">
                        Link de redirecionamento (Opcional)
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Thumbnail Upload */}
              <FormField
                control={form.control}
                name="thumbnail"
                render={({ field }) => (
                  <FormItem className="bg-black/20 border border-white/5 rounded-[12px] p-5">
                    <FormLabel className="text-white/80 font-medium">Thumbnail *</FormLabel>
                    <FormControl>
                      <div className="space-y-4">
                        {/* File Input */}
                        <div className="flex items-center gap-4">
                          <label
                            htmlFor="thumbnail-upload"
                            className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 text-white rounded-[12px] cursor-pointer hover:bg-white/10 transition-colors h-[44px]"
                          >
                            <Upload className="w-4 h-4" />
                            <span className="text-sm font-medium">
                              {thumbnailFile ? "Alterar Imagem" : "Escolher Imagem"}
                            </span>
                          </label>
                          <input
                            id="thumbnail-upload"
                            type="file"
                            accept="image/jpeg,image/jpg,image/png,image/webp"
                            onChange={(e) => {
                              handleFileChange(e);
                              field.onChange("file-selected");
                            }}
                            className="hidden"
                          />
                          {thumbnailFile && (
                            <span className="text-sm text-muted-foreground truncate flex-1">
                              {thumbnailFile.name}
                            </span>
                          )}
                        </div>

                        {/* Preview */}
                        {thumbnailPreview && (
                          <div className="relative">
                            <img
                              src={thumbnailPreview}
                              alt="Preview"
                              className="w-full h-48 object-cover rounded-[12px] border border-white/[0.08]"
                            />
                            <Button
                              type="button"
                              variant="destructive"
                              size="icon"
                              className="absolute top-2 right-2 rounded-full h-8 w-8"
                              onClick={() => {
                                setThumbnailFile(null);
                                setThumbnailPreview("");
                                field.onChange("");
                              }}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        )}

                        <div className="text-xs text-muted-foreground space-y-1">
                          <p>Formatos aceitos: JPG, PNG, WebP. Tamanho máximo: 2MB</p>
                          <p className="text-primary/80">
                            📐 Dimensões ideais: 600px × 900px (proporção 2:3)
                          </p>
                        </div>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Show Card Overlay Checkbox */}
                <FormField
                  control={form.control}
                  name="show_card_overlay"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-[12px] border border-white/10 bg-black/20 p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="text-white/80 font-medium">
                          Exibir overlays no card
                        </FormLabel>
                        <p className="text-xs text-muted-foreground pt-1">
                          Desmarque se a imagem já tiver título
                        </p>
                      </div>
                    </FormItem>
                  )}
                />

                {/* Show Category Badge Checkbox */}
                <FormField
                  control={form.control}
                  name="show_category_badge"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-[12px] border border-white/10 bg-black/20 p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="text-white/80 font-medium">
                          Exibir categoria
                        </FormLabel>
                        <p className="text-xs text-muted-foreground pt-1">
                          Mostrar badge de categoria sobre a capa
                        </p>
                      </div>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Actions */}
            <div className="p-6 border-t border-white/5 bg-black/40 flex items-center justify-end gap-3 rounded-b-[20px]">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={saveMutation.isPending}
                className="h-[44px] px-6 glass-card border-white/10 hover:bg-white/5 rounded-[12px] text-white bg-transparent"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                form="course-form"
                disabled={saveMutation.isPending || isUploading}
                className="h-[44px] px-6 rounded-[12px] font-bold bg-primary hover:bg-primary/90 text-white"
              >
                {saveMutation.isPending || isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {isUploading ? "Enviando imagem..." : "Salvando..."}
                  </>
                ) : course ? (
                  "Atualizar Curso"
                ) : (
                  "Criar Curso"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
