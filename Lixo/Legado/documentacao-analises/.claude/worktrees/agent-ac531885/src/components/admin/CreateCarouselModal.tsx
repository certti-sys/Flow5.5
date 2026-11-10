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
import { Layout } from "lucide-react";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { DraggableCourseSelector } from "./DraggableCourseSelector";

const formSchema = z.object({
  title: z.string().min(3, "Título deve ter no mínimo 3 caracteres"),
  type: z.enum(["auto", "manual"]),
  category: z.string().optional(),
  cards_per_view_desktop: z.number().min(1).max(10),
  cards_per_view_tablet: z.number().min(1).max(8),
  cards_per_view_mobile: z.number().min(1).max(5),
  order_index: z.number().min(0),
});

interface CreateCarouselModalProps {
  open: boolean;
  onClose: () => void;
  carousel?: any;
}

export function CreateCarouselModal({ open, onClose, carousel }: CreateCarouselModalProps) {
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);
  const queryClient = useQueryClient();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      type: "auto",
      category: "",
      cards_per_view_desktop: 5,
      cards_per_view_tablet: 3,
      cards_per_view_mobile: 2,
      order_index: 0,
    },
  });

  const carouselType = form.watch("type");

  // Fetch categories from existing courses
  const { data: categories = [] } = useQuery({
    queryKey: ["courseCategories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("category")
        .order("category");
      
      if (error) throw error;
      const uniqueCategories = [...new Set(data.map(c => c.category))];
      return uniqueCategories;
    },
  });

  // Fetch carousel courses if editing
  const { data: carouselCourses = [] } = useQuery({
    queryKey: ["carouselCourses", carousel?.id],
    queryFn: async () => {
      if (!carousel?.id) return [];
      const { data, error } = await supabase
        .from("carousel_courses")
        .select("course_id, order_index")
        .eq("carousel_id", carousel.id)
        .order("order_index");
      
      if (error) throw error;
      return data;
    },
    enabled: !!carousel?.id && open,
  });

  useEffect(() => {
    if (carousel) {
      form.reset({
        title: carousel.title,
        type: carousel.type,
        category: carousel.category || "",
        cards_per_view_desktop: carousel.cards_per_view_desktop,
        cards_per_view_tablet: carousel.cards_per_view_tablet ?? 3,
        cards_per_view_mobile: carousel.cards_per_view_mobile,
        order_index: carousel.order_index,
      });
    } else {
      form.reset({
        title: "",
        type: "auto",
        category: "",
        cards_per_view_desktop: 5,
        cards_per_view_tablet: 3,
        cards_per_view_mobile: 2,
        order_index: 0,
      });
      setSelectedCourses([]);
    }
  }, [carousel, form, open]);

  useEffect(() => {
    if (carouselCourses.length > 0) {
      setSelectedCourses(carouselCourses.map(cc => cc.course_id));
    }
  }, [carouselCourses]);

  const saveMutation = useMutation({
    mutationFn: async (values: z.infer<typeof formSchema>) => {
      const carouselData = {
        title: values.title,
        type: values.type,
        category: values.type === "auto" ? values.category : null,
        cards_per_view_desktop: values.cards_per_view_desktop,
        cards_per_view_tablet: values.cards_per_view_tablet,
        cards_per_view_mobile: values.cards_per_view_mobile,
        order_index: values.order_index,
        is_active: true,
      };

      let carouselId: string;

      if (carousel?.id) {
        // Update existing carousel
        const { error } = await supabase
          .from("carousels")
          .update(carouselData)
          .eq("id", carousel.id);
        
        if (error) throw error;
        carouselId = carousel.id;
      } else {
        // Create new carousel
        const { data, error } = await supabase
          .from("carousels")
          .insert(carouselData)
          .select()
          .single();
        
        if (error) throw error;
        carouselId = data.id;
      }

      // If manual carousel, handle course associations
      if (values.type === "manual" && selectedCourses.length > 0) {
        // Delete existing associations
        await supabase
          .from("carousel_courses")
          .delete()
          .eq("carousel_id", carouselId);

        // Insert new associations
        const courseAssociations = selectedCourses.map((courseId, index) => ({
          carousel_id: carouselId,
          course_id: courseId,
          order_index: index,
        }));

        const { error: coursesError } = await supabase
          .from("carousel_courses")
          .insert(courseAssociations);

        if (coursesError) throw coursesError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminCarousels"] });
      toast.success(carousel ? "Carrossel atualizado!" : "Carrossel criado!");
      onClose();
    },
    onError: (error) => {
      console.error("Error saving carousel:", error);
      toast.error("Erro ao salvar carrossel");
    },
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    if (values.type === "manual" && selectedCourses.length === 0) {
      toast.error("Selecione pelo menos um curso para o carrossel manual");
      return;
    }
    saveMutation.mutate(values);
  };

  return (
    <Dialog open={open} onOpenChange={onClose} modal={true}>
      <DialogContent className="glass-card border-white/10 rounded-[20px] max-w-3xl p-0 overflow-hidden bg-black/90 backdrop-blur-xl">
        <DialogHeader className="px-6 py-5 border-b border-white/5 bg-white/[0.02]">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center border border-primary/30 shrink-0">
              <Layout className="h-5 w-5 text-primary" />
            </div>
            <div className="text-left space-y-1">
              <DialogTitle className="text-[20px] font-bold text-white tracking-tight">
                {carousel ? "Editar Carrossel" : "Criar Novo Carrossel"}
              </DialogTitle>
              <DialogDescription className="text-[14px] text-muted-foreground m-0">
                Configure o carrossel para exibir cursos no dashboard dos alunos
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} id="carousel-form" className="flex flex-col">
            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto scrollbar-styled">
              <div className="bg-black/20 border border-white/5 rounded-[12px] p-5 space-y-5">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white/80 font-medium">Título do Carrossel</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Ex: Cursos em Destaque" 
                          {...field} 
                          className="bg-transparent border-white/10 focus-visible:ring-primary/50 text-white placeholder:text-muted-foreground/50 h-[44px]"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white/80 font-medium">Tipo de Carrossel</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          value={field.value}
                          className="flex flex-col space-y-3"
                        >
                          <FormItem className="flex items-center space-x-3 space-y-0 bg-white/5 border border-white/10 p-3 rounded-[12px]">
                            <FormControl>
                              <RadioGroupItem value="auto" className="border-white/20 text-primary" />
                            </FormControl>
                            <FormLabel className="font-normal text-white/80">
                              Automático - Por categoria
                            </FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-3 space-y-0 bg-white/5 border border-white/10 p-3 rounded-[12px]">
                            <FormControl>
                              <RadioGroupItem value="manual" className="border-white/20 text-primary" />
                            </FormControl>
                            <FormLabel className="font-normal text-white/80">
                              Manual - Seleção de cursos
                            </FormLabel>
                          </FormItem>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

              {carouselType === "auto" && (
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white/80 font-medium">Categoria</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
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
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground pt-1">
                        Todos os cursos desta categoria serão exibidos automaticamente
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {carouselType === "manual" && (
                <DraggableCourseSelector
                  selectedCourses={selectedCourses}
                  onSelectionChange={setSelectedCourses}
                />
              )}
            </div>

            <div className="bg-black/20 border border-white/5 rounded-[12px] p-5 space-y-5 mt-6">
              <div className="grid grid-cols-3 gap-3">
                <FormField
                  control={form.control}
                  name="cards_per_view_desktop"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-white/80">Desktop</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          max={10}
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value))}
                          className="bg-transparent border-white/10 focus-visible:ring-primary/50 text-white placeholder:text-muted-foreground/50 h-[44px]"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="cards_per_view_tablet"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-white/80">Tablet</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          max={8}
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value))}
                          className="bg-transparent border-white/10 focus-visible:ring-primary/50 text-white placeholder:text-muted-foreground/50 h-[44px]"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="cards_per_view_mobile"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-white/80">Mobile</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          max={5}
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value))}
                          className="bg-transparent border-white/10 focus-visible:ring-primary/50 text-white placeholder:text-muted-foreground/50 h-[44px]"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="order_index"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white/80 font-medium">Ordem de Exibição</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                        className="bg-transparent border-white/10 focus-visible:ring-primary/50 text-white placeholder:text-muted-foreground/50 h-[44px]"
                      />
                    </FormControl>
                    <p className="text-xs text-muted-foreground pt-1">
                      Ordem em que o carrossel aparecerá (0 = primeiro)
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
            
          {/* Actions */}
          <div className="p-6 border-t border-white/5 bg-black/40 flex flex-col-reverse sm:flex-row items-center justify-end gap-3 rounded-b-[20px]">
             <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={saveMutation.isPending}
                className="w-full sm:w-auto h-[44px] px-6 glass-card border-white/10 hover:bg-white/5 rounded-[12px] text-white bg-transparent"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                form="carousel-form"
                disabled={saveMutation.isPending}
                className="w-full sm:w-auto h-[44px] px-6 rounded-[12px] font-bold bg-primary hover:bg-primary/90 text-white"
              >
                {saveMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : carousel ? (
                  "Atualizar"
                ) : (
                  "Criar"
                )}
              </Button>
          </div>
        </form>
      </Form>
    </DialogContent>
    </Dialog>
  );
}
