import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Product, CheckoutConfig } from "@/types/payment";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Loader2, Palette, Package, BookOpen, DollarSign, FolderOpen } from "lucide-react";

interface ProductFormModalProps {
    product: Product | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

const formSchema = z.object({
    name: z.string().min(3, "Nome muito curto"),
    description: z.string().optional(),
    type: z.enum(["one_time", "subscription"]),
    active: z.boolean().default(true),
    price: z.number().min(0, "Preço inválido"),
    grant_type: z.enum(["course", "category", "none"]),
    course_id: z.string().optional(),
    category: z.string().optional(),
    // Customization
    primary_color: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, "Cor inválida"),
    banner_url: z.string().url("URL inválida").optional().or(z.literal("")),
    logo_url: z.string().url("URL inválida").optional().or(z.literal("")),
});

export function ProductFormModal({ product, open, onOpenChange }: ProductFormModalProps) {
    const queryClient = useQueryClient();
    const [priceDisplay, setPriceDisplay] = useState("");

    // Fetch courses for selector
    const { data: courses } = useQuery({
        queryKey: ["courses-list"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("courses")
                .select("id, title, category")
                .order("title");
            if (error) throw error;
            return data;
        }
    });

    // Extract unique categories
    const categories = [...new Set(courses?.map(c => c.category).filter(Boolean) || [])].sort();

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: "",
            description: "",
            type: "one_time",
            active: true,
            price: 0,
            grant_type: "none",
            course_id: "",
            category: "",
            primary_color: "#7C3AED",
            banner_url: "",
            logo_url: ""
        }
    });

    const grantType = form.watch("grant_type");

    useEffect(() => {
        if (product) {
            const priceInCents = (product as any).price || product.checkout_config?.price || 0;
            const productData = product as any;

            let grant_type: "course" | "category" | "none" = "none";
            if (productData.course_id) grant_type = "course";
            else if (productData.category) grant_type = "category";

            form.reset({
                name: product.name,
                description: product.description || "",
                type: product.type,
                active: product.active,
                price: priceInCents,
                grant_type,
                course_id: productData.course_id || "",
                category: productData.category || "",
                primary_color: product.checkout_config?.primary_color || "#7C3AED",
                banner_url: product.checkout_config?.banner_url || "",
                logo_url: product.checkout_config?.logo_url || ""
            });
            setPriceDisplay((priceInCents / 100).toFixed(2).replace(".", ","));
        } else {
            form.reset({
                name: "",
                description: "",
                type: "one_time",
                active: true,
                price: 0,
                grant_type: "none",
                course_id: "",
                category: "",
                primary_color: "#7C3AED",
                banner_url: "",
                logo_url: ""
            });
            setPriceDisplay("");
        }
    }, [product, open, form]);

    const handlePriceChange = (value: string) => {
        const cleaned = value.replace(/\D/g, "");
        const cents = parseInt(cleaned) || 0;
        form.setValue("price", cents);
        setPriceDisplay((cents / 100).toFixed(2).replace(".", ","));
    };

    const mutation = useMutation({
        mutationFn: async (values: z.infer<typeof formSchema>) => {
            const checkoutConfig: CheckoutConfig = {
                primary_color: values.primary_color,
                banner_url: values.banner_url || null,
                logo_url: values.logo_url || null,
                price: values.price,
            };

            const payload: any = {
                name: values.name,
                description: values.description,
                type: values.type,
                active: values.active,
                price: values.price,
                course_id: values.grant_type === "course" ? values.course_id : null,
                category: values.grant_type === "category" ? values.category : null,
                checkout_config: checkoutConfig
            };

            if (product?.id) {
                const { error } = await supabase.from("products").update(payload).eq("id", product.id);
                if (error) throw error;
            } else {
                const { error } = await supabase.from("products").insert(payload);
                if (error) throw error;
            }
        },
        onSuccess: () => {
            toast.success(product ? "Produto atualizado" : "Produto criado");
            queryClient.invalidateQueries({ queryKey: ["products"] });
            onOpenChange(false);
        },
        onError: (e: any) => toast.error(e.message)
    });

    const onSubmit = (values: z.infer<typeof formSchema>) => {
        if (values.grant_type === "course" && !values.course_id) {
            toast.error("Selecione um curso");
            return;
        }
        if (values.grant_type === "category" && !values.category) {
            toast.error("Selecione uma categoria");
            return;
        }
        mutation.mutate(values);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="glass-card border-white/10 rounded-[20px] sm:max-w-[600px] p-0 overflow-hidden bg-black/90 backdrop-blur-xl">
                <DialogHeader className="px-6 py-5 border-b border-white/5 bg-white/[0.02]">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center border border-primary/30 shrink-0">
                            <Package className="h-5 w-5 text-primary" />
                        </div>
                        <div className="text-left space-y-1">
                            <DialogTitle className="text-[20px] font-bold text-white tracking-tight">
                                {product ? "Editar Produto" : "Novo Produto"}
                            </DialogTitle>
                            <DialogDescription className="text-[14px] text-muted-foreground m-0">
                                Configure os detalhes, visual e acesso do produto
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <Tabs defaultValue="general" className="flex flex-col">
                            <div className="px-6 pt-4 border-b border-white/5">
                                <TabsList className="bg-transparent h-auto p-0 gap-6 w-full justify-start rounded-none">
                                    <TabsTrigger 
                                        value="general"
                                        className="relative rounded-none px-0 py-3 text-white/50 data-[state=active]:text-white data-[state=active]:bg-transparent data-[state=active]:shadow-none after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-primary after:opacity-0 data-[state=active]:after:opacity-100 transition-all font-medium"
                                    >
                                        Geral
                                    </TabsTrigger>
                                    <TabsTrigger 
                                        value="access" 
                                        className="relative rounded-none px-0 py-3 text-white/50 data-[state=active]:text-white data-[state=active]:bg-transparent data-[state=active]:shadow-none after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-primary after:opacity-0 data-[state=active]:after:opacity-100 transition-all font-medium flex items-center gap-2"
                                    >
                                        <BookOpen className="w-4 h-4" />
                                        Acesso
                                    </TabsTrigger>
                                    <TabsTrigger 
                                        value="customization" 
                                        className="relative rounded-none px-0 py-3 text-white/50 data-[state=active]:text-white data-[state=active]:bg-transparent data-[state=active]:shadow-none after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-primary after:opacity-0 data-[state=active]:after:opacity-100 transition-all font-medium flex items-center gap-2"
                                    >
                                        <Palette className="w-4 h-4" />
                                        Visual
                                    </TabsTrigger>
                                </TabsList>
                            </div>

                            <TabsContent value="general" className="p-6 m-0 focus-visible:outline-none focus-visible:ring-0">
                                <div className="bg-black/20 border border-white/5 rounded-[12px] p-5 space-y-4">
                                    <FormField
                                        control={form.control}
                                        name="name"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-white/80 font-medium">Nome do Produto</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="Curso Completo de..." {...field} className="bg-transparent border-white/10 focus-visible:ring-primary/50 text-white placeholder:text-muted-foreground/50 h-[44px]" />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="description"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-white/80 font-medium">Descrição</FormLabel>
                                                <FormControl>
                                                    <Textarea placeholder="Detalhes do curso..." {...field} className="bg-transparent border-white/10 focus-visible:ring-primary/50 text-white placeholder:text-muted-foreground/50 min-h-[100px] resize-none" />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <div className="grid grid-cols-2 gap-4">
                                        <FormField
                                            control={form.control}
                                            name="type"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-white/80 font-medium">Tipo</FormLabel>
                                                    <Select onValueChange={field.onChange} value={field.value}>
                                                        <FormControl>
                                                            <SelectTrigger className="bg-transparent border-white/10 h-[44px] text-white">
                                                                <SelectValue placeholder="Selecione" />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent className="bg-[#0f0f11] border-white/10">
                                                            <SelectItem value="one_time">Pagamento Único</SelectItem>
                                                            <SelectItem value="subscription">Assinatura</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormItem>
                                            <FormLabel className="text-white/80 font-medium">Preço (R$)</FormLabel>
                                            <div className="relative">
                                                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                                <Input
                                                    placeholder="0,00"
                                                    value={priceDisplay}
                                                    onChange={(e) => handlePriceChange(e.target.value)}
                                                    className="bg-transparent border-white/10 focus-visible:ring-primary/50 text-white pl-9 h-[44px]"
                                                />
                                            </div>
                                        </FormItem>
                                    </div>
                                </div>
                            </TabsContent>

                            <TabsContent value="access" className="p-6 m-0 focus-visible:outline-none focus-visible:ring-0">
                                <div className="bg-black/20 border border-white/5 rounded-[12px] p-5 space-y-5">
                                    <div className="text-[13px] text-muted-foreground bg-white/5 p-3 rounded-lg border border-white/5 leading-relaxed">
                                        Ao aprovar o pagamento deste produto, o cliente receberá acesso automático ao curso ou categoria selecionada.
                                    </div>

                                    {/* Tipo de Concessão */}
                                    <FormField
                                        control={form.control}
                                        name="grant_type"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-white/80 font-medium">Tipo de Concessão *</FormLabel>
                                                <Select
                                                    onValueChange={(v) => {
                                                        field.onChange(v);
                                                        form.setValue("course_id", "");
                                                        form.setValue("category", "");
                                                    }}
                                                    value={field.value}
                                                >
                                                    <FormControl>
                                                        <SelectTrigger className="bg-transparent border-white/10 h-[44px]">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent className="bg-[#0f0f11] border-white/10">
                                                        <SelectItem value="none">Nenhum (sem acesso automático)</SelectItem>
                                                        <SelectItem value="course">
                                                            <div className="flex items-center gap-2">
                                                                <BookOpen className="w-4 h-4 text-primary" />
                                                                Curso Individual
                                                            </div>
                                                        </SelectItem>
                                                        <SelectItem value="category">
                                                            <div className="flex items-center gap-2">
                                                                <FolderOpen className="w-4 h-4 text-emerald-500" />
                                                                Categoria (todos os cursos)
                                                            </div>
                                                        </SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    {/* Curso (condicional) */}
                                    {grantType === "course" && (
                                        <FormField
                                            control={form.control}
                                            name="course_id"
                                            render={({ field }) => (
                                                <FormItem className="animate-in fade-in slide-in-from-top-2 p-4 bg-white/[0.02] border border-white/5 rounded-[10px]">
                                                    <FormLabel className="text-white/80 font-medium">Curso *</FormLabel>
                                                    <Select onValueChange={field.onChange} value={field.value}>
                                                        <FormControl>
                                                            <SelectTrigger className="bg-transparent border-white/10 h-[44px]">
                                                                <SelectValue placeholder="Selecione o curso" />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent className="bg-[#0f0f11] border-white/10">
                                                            {courses?.map((course) => (
                                                                <SelectItem key={course.id} value={course.id}>
                                                                    {course.title}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    )}

                                    {/* Categoria (condicional) */}
                                    {grantType === "category" && (
                                        <FormField
                                            control={form.control}
                                            name="category"
                                            render={({ field }) => (
                                                <FormItem className="animate-in fade-in slide-in-from-top-2 p-4 bg-white/[0.02] border border-white/5 rounded-[10px]">
                                                    <FormLabel className="text-white/80 font-medium">Categoria *</FormLabel>
                                                    <Select onValueChange={field.onChange} value={field.value}>
                                                        <FormControl>
                                                            <SelectTrigger className="bg-transparent border-white/10 h-[44px]">
                                                                <SelectValue placeholder="Selecione a categoria" />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent className="bg-[#0f0f11] border-white/10">
                                                            {categories.map((cat) => (
                                                                <SelectItem key={cat} value={cat as string}>
                                                                    {cat}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                    <p className="text-[12px] text-muted-foreground mt-2">
                                                        O usuário terá acesso a todos os cursos desta categoria
                                                    </p>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    )}

                                    {/* Status Ativo */}
                                    <div className="flex items-center justify-between pt-4 border-t border-white/5 mt-4">
                                        <div>
                                            <Label className="text-[14px] text-white font-medium">Concessão Ativa</Label>
                                            <p className="text-[12px] text-muted-foreground mt-1">
                                                Desative para pausar a liberação de acesso
                                            </p>
                                        </div>
                                        <FormField
                                            control={form.control}
                                            name="active"
                                            render={({ field }) => (
                                                <Switch checked={field.value} onCheckedChange={field.onChange} />
                                            )}
                                        />
                                    </div>
                                </div>
                            </TabsContent>

                            <TabsContent value="customization" className="p-6 m-0 focus-visible:outline-none focus-visible:ring-0">
                                <div className="bg-black/20 border border-white/5 rounded-[12px] p-5 space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <FormField
                                            control={form.control}
                                            name="primary_color"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-white/80 font-medium">Cor Primária (Hex)</FormLabel>
                                                    <div className="flex gap-3">
                                                        <Input {...field} placeholder="#7C3AED" className="bg-transparent border-white/10 focus-visible:ring-primary/50 text-white font-mono h-[44px] uppercase" />
                                                        <div
                                                            className="w-[44px] h-[44px] rounded-[10px] border border-white/10 shrink-0 shadow-inner"
                                                            style={{ backgroundColor: field.value }}
                                                        />
                                                    </div>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                    <FormField
                                        control={form.control}
                                        name="banner_url"
                                        render={({ field }) => (
                                            <FormItem className="pt-2">
                                                <FormLabel className="text-white/80 font-medium">Banner URL (Topo do Checkout)</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="https://..." {...field} className="bg-transparent border-white/10 focus-visible:ring-primary/50 text-white placeholder:text-muted-foreground/50 h-[44px]" />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="logo_url"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-white/80 font-medium">Logo URL</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="https://..." {...field} className="bg-transparent border-white/10 focus-visible:ring-primary/50 text-white placeholder:text-muted-foreground/50 h-[44px]" />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </TabsContent>
                        </Tabs>

                        <div className="p-6 border-t border-white/5 bg-black/40 flex justify-end gap-3 rounded-b-[20px]">
                            <Button 
                                type="button" 
                                variant="outline" 
                                onClick={() => onOpenChange(false)}
                                className="h-[44px] px-6 glass-card border-white/10 hover:bg-white/5 rounded-[12px]"
                            >
                                Cancelar
                            </Button>
                            <Button 
                                type="submit" 
                                disabled={mutation.isPending}
                                className="h-[44px] px-6 rounded-[12px] font-bold"
                            >
                                {mutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                Salvar Alterações
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
