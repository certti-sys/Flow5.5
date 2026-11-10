import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Plus, Pencil, Trash2, X, Check, Tags } from "lucide-react";
import { toast } from "sonner";

interface Category {
    id: string;
    name: string;
}

interface CategoryManagerModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export const CategoryManagerModal = ({ open, onOpenChange }: CategoryManagerModalProps) => {
    const queryClient = useQueryClient();
    const [newCategory, setNewCategory] = useState("");
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState("");
    const [originalName, setOriginalName] = useState("");

    // Fetch categories
    const { data: categories = [], isLoading } = useQuery({
        queryKey: ["adminCourseCategories"], // Key diferente do modal de curso (que retorna apenas strings)
        queryFn: async () => {
            const { data, error } = await supabase
                .from("course_categories")
                .select("id, name")
                .order("name");
            if (error) throw error;
            return data as Category[];
        },
    });

    // Create mutation
    const createMutation = useMutation({
        mutationFn: async (name: string) => {
            const { error } = await supabase.from("course_categories").insert([{ name }]);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["adminCourseCategories"] });
            queryClient.invalidateQueries({ queryKey: ["courseCategories"] }); // Invalida tbm o select do form
            setNewCategory("");
            toast.success("Categoria criada");
        },
        onError: (e: any) => {
            // Handle unique constraint error gracefully
            if (e.code === '23505') {
                toast.error("Esta categoria já existe");
            } else {
                toast.error("Erro ao criar categoria");
            }
        },
    });

    // Update mutation
    const updateMutation = useMutation({
        mutationFn: async ({ id, name, oldName }: { id: string; name: string; oldName: string }) => {
            // 1. Atualizar na tabela de categorias
            const { error } = await supabase
                .from("course_categories")
                .update({ name })
                .eq("id", id);
            if (error) throw error;

            // 2. Propagar mudança para os cursos que usam essa categoria (já que usamos string denormalizada)
            if (oldName && oldName !== name) {
                const { error: courseError } = await supabase
                    .from("courses")
                    .update({ category: name })
                    .eq("category", oldName);

                if (courseError) console.error("Erro ao atualizar cursos:", courseError);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["adminCourseCategories"] });
            queryClient.invalidateQueries({ queryKey: ["courseCategories"] });
            queryClient.invalidateQueries({ queryKey: ["adminCourses"] }); // Recarregar cursos para ver o novo nome
            setEditingId(null);
            toast.success("Categoria atualizada e propagada para os cursos");
        },
        onError: (e: any) => toast.error(e.message),
    });

    // ... (rest of code logic remains similar, skipping unchanged deleteMutation for brevity if replace handles blocks)
    // Wait, replace_file_content needs exact context matching.
    // I will replace the query block and the render block separately to be safe.
    // Let's do Query Block first.

    // Handle renaming propagation (optional but nice)
    // Since we use text column in courses, renaming in manage categories doesn't affect courses.
    // For now, I will keep it simple. Renaming affects available options.

    // Delete mutation
    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase.from("course_categories").delete().eq("id", id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["adminCourseCategories"] });
            queryClient.invalidateQueries({ queryKey: ["courseCategories"] });
            toast.success("Categoria removida");
        },
        onError: (e: any) => toast.error("Erro ao remover: pode estar em uso?"),
    });

    const handleAdd = () => {
        if (!newCategory.trim()) return;
        createMutation.mutate(newCategory.trim());
    };

    const startEdit = (cat: Category) => {
        setEditingId(cat.id);
        setEditName(cat.name);
        setOriginalName(cat.name);
    };

    const saveEdit = () => {
        if (!editName.trim() || !editingId) return;
        updateMutation.mutate({ id: editingId, name: editName.trim(), oldName: originalName });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="glass-card border-white/10 rounded-[20px] max-w-md p-0 overflow-hidden bg-black/90 backdrop-blur-xl">
                <DialogHeader className="px-6 py-5 border-b border-white/5 bg-white/[0.02]">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30 shrink-0">
                            <Tags className="h-5 w-5 text-indigo-500" />
                        </div>
                        <div className="text-left space-y-1">
                            <DialogTitle className="text-[20px] font-bold text-white tracking-tight">Gerenciar Categorias</DialogTitle>
                        </div>
                    </div>
                </DialogHeader>

                <div className="p-6 space-y-4">
                    <div className="flex gap-2">
                        <Input
                            placeholder="Nova Categoria"
                            value={newCategory}
                            onChange={(e) => setNewCategory(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                            className="bg-white/5 border-white/5 h-12 rounded-[12px] focus:bg-white/[0.08] transition-all text-white"
                        />
                        <Button 
                            onClick={handleAdd} 
                            disabled={createMutation.isPending}
                            className="h-12 w-12 rounded-[12px] bg-indigo-500 hover:bg-indigo-600 text-white shrink-0 p-0"
                        >
                            {createMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                        </Button>
                    </div>

                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 scrollbar-styled">
                        {isLoading ? (
                            <div className="flex justify-center py-4"><Loader2 className="animate-spin text-white/50" /></div>
                        ) : categories.map((cat) => (
                            <div key={cat.id} className="flex items-center justify-between p-3 bg-white/[0.02] border border-white/5 rounded-[12px] group hover:bg-white/[0.04] transition-colors">
                                {editingId === cat.id ? (
                                    <div className="flex gap-2 flex-1 items-center">
                                        <Input
                                            value={editName}
                                            onChange={(e) => setEditName(e.target.value)}
                                            className="h-9 bg-black/40 border-white/10 text-white text-[14px]"
                                            autoFocus
                                        />
                                        <Button size="sm" onClick={saveEdit} variant="ghost" className="h-9 w-9 p-0 hover:bg-emerald-500/20 rounded-[8px]">
                                            <Check className="w-4 h-4 text-emerald-500" />
                                        </Button>
                                        <Button size="sm" onClick={() => setEditingId(null)} variant="ghost" className="h-9 w-9 p-0 hover:bg-red-500/20 rounded-[8px]">
                                            <X className="w-4 h-4 text-red-500" />
                                        </Button>
                                    </div>
                                ) : (
                                    <>
                                        <span className="text-[14px] font-medium text-white/90 px-1">{cat.name}</span>
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button size="sm" variant="ghost" onClick={() => startEdit(cat)} className="h-8 w-8 p-0 hover:bg-white/10 rounded-[8px]">
                                                <Pencil className="w-4 h-4 text-white/70" />
                                            </Button>
                                            <Button size="sm" variant="ghost" onClick={() => deleteMutation.mutate(cat.id)} className="h-8 w-8 p-0 hover:text-red-400 hover:bg-red-500/10 rounded-[8px]">
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </>
                                )}
                            </div>
                        ))}
                        {categories.length === 0 && (
                            <p className="text-center text-white/40 text-[14px] py-4">Nenhuma categoria encontrada.</p>
                        )}
                    </div>
                </div>

                <div className="p-6 border-t border-white/5 bg-black/40 flex justify-end rounded-b-[20px]">
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        className="h-[44px] px-8 glass-card border-white/10 hover:bg-white/5 rounded-[12px] text-white bg-transparent font-bold"
                    >
                        Fechar
                    </Button>
                </div>
            </DialogContent>
        </Dialog >
    );
};
