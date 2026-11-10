import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus, Edit, Trash2, Eye, EyeOff, LayoutGrid, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { CreateCarouselModal } from "@/components/admin/CreateCarouselModal";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Carousel {
  id: string;
  title: string;
  type: 'auto' | 'manual';
  category: string | null;
  is_active: boolean;
  order_index: number;
  cards_per_view_desktop: number;
  cards_per_view_tablet: number;
  cards_per_view_mobile: number;
}

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const item = {
  hidden: { y: 20, opacity: 0 },
  show: { y: 0, opacity: 1 }
};

export default function AdminCarousels() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingCarousel, setEditingCarousel] = useState<Carousel | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: carousels = [], isLoading } = useQuery({
    queryKey: ["adminCarousels"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("carousels")
        .select("*")
        .order("order_index", { ascending: true });

      if (error) throw error;
      return data as Carousel[];
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("carousels")
        .update({ is_active: !is_active })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminCarousels"] });
      toast.success("Status atualizado com sucesso!");
    },
    onError: () => {
      toast.error("Erro ao atualizar status");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("carousels")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminCarousels"] });
      toast.success("Carrossel excluído com sucesso!");
      setDeletingId(null);
    },
    onError: () => {
      toast.error("Erro ao excluir carrossel");
      setDeletingId(null);
    },
  });

  const handleEdit = (carousel: Carousel) => {
    setEditingCarousel(carousel);
    setIsCreateModalOpen(true);
  };

  const handleDelete = (id: string) => {
    setDeletingId(id);
  };

  const confirmDelete = () => {
    if (deletingId) {
      deleteMutation.mutate(deletingId);
    }
  };

  const handleCloseModal = () => {
    setIsCreateModalOpen(false);
    setEditingCarousel(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <motion.div 
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-[32px] pb-20"
    >
      {/* Header aligned to DS (28px) */}
      <motion.div variants={item} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-semibold tracking-tight text-white leading-[36px]">
            Gerenciar Carrosséis
          </h1>
          <p className="text-[14px] text-muted-foreground mt-1 leading-[22px]">
            Configure carrosséis automáticos por categoria ou crie seleções personalizadas.
          </p>
        </div>

        <Button
          onClick={() => setIsCreateModalOpen(true)}
          className="gradient-primary shadow-glow hover:scale-105 transition-all h-[44px] px-6 rounded-[12px] font-bold text-white gap-2"
        >
          <Plus className="w-4 h-4" />
          Novo Carrossel
        </Button>
      </motion.div>

      {/* Carousels List in Glass Card */}
      <motion.div variants={item}>
        {carousels.length === 0 ? (
          <div className="glass-card rounded-[16px] p-16 text-center border-white/10">
            <div className="w-16 h-16 bg-primary/5 rounded-full flex items-center justify-center mx-auto mb-6">
              <LayoutGrid className="w-8 h-8 text-primary/40" />
            </div>
            <h3 className="text-[18px] font-semibold text-white mb-2">Nenhum carrossel encontrado</h3>
            <p className="text-[14px] text-muted-foreground mb-8 max-w-[400px] mx-auto">
              Comece criando seu primeiro carrossel para organizar os cursos na página inicial do aluno.
            </p>
            <Button
              onClick={() => setIsCreateModalOpen(true)}
              variant="outline"
              className="glass-card border-white/10 hover:bg-white/5 h-[40px] px-6 rounded-xl gap-2 font-bold uppercase tracking-wider text-[11px]"
            >
              <Plus className="w-4 h-4" />
              Criar Primeiro Carrossel
            </Button>
          </div>
        ) : (
          <div className="glass-card rounded-[16px] border-white/10 overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-white/[0.03] border-b border-white/10">
                  <tr>
                    <th className="px-8 py-5 text-left text-[12px] font-bold uppercase tracking-widest text-muted-foreground">
                      Título
                    </th>
                    <th className="px-6 py-5 text-left text-[12px] font-bold uppercase tracking-widest text-muted-foreground hidden md:table-cell">
                      Tipo
                    </th>
                    <th className="px-6 py-5 text-left text-[12px] font-bold uppercase tracking-widest text-muted-foreground hidden lg:table-cell">
                      Categoria
                    </th>
                    <th className="px-6 py-5 text-left text-[12px] font-bold uppercase tracking-widest text-muted-foreground hidden sm:table-cell">
                      Cards (D/T/M)
                    </th>
                    <th className="px-6 py-5 text-center text-[12px] font-bold uppercase tracking-widest text-muted-foreground">
                      Status
                    </th>
                    <th className="px-8 py-5 text-right text-[12px] font-bold uppercase tracking-widest text-muted-foreground">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.05]">
                  <AnimatePresence>
                    {carousels.map((carousel) => (
                      <motion.tr
                        key={carousel.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="hover:bg-white/[0.02] transition-all duration-300 group/row"
                      >
                        <td className="px-8 py-5">
                          <div className="font-bold text-white group-hover:text-primary transition-colors text-[14px]">
                            {carousel.title}
                          </div>
                          <div className="text-[12px] text-muted-foreground md:hidden mt-1 opacity-70">
                            {carousel.type === 'auto' ? 'Automático' : 'Manual'}
                          </div>
                        </td>
                        <td className="px-6 py-5 hidden md:table-cell">
                          <span className={`inline-flex items-center px-[10px] py-[4px] text-[10px] uppercase font-bold tracking-widest rounded-[6px] border ${
                            carousel.type === 'auto'
                              ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                              : 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                          }`}>
                            {carousel.type === 'auto' ? 'Automático' : 'Manual'}
                          </span>
                        </td>
                        <td className="px-6 py-5 text-[14px] text-muted-foreground hidden lg:table-cell font-medium">
                          {carousel.category || <span className="opacity-30">—</span>}
                        </td>
                        <td className="px-6 py-5 hidden sm:table-cell">
                          <div className="flex items-center gap-2">
                             <div className="flex items-center gap-1 text-[13px] font-bold text-white px-2 py-1 bg-black/40 rounded-xl border border-white/5">
                               {carousel.cards_per_view_desktop}
                               <span className="text-[10px] text-muted-foreground opacity-50">D</span>
                             </div>
                             <div className="flex items-center gap-1 text-[13px] font-bold text-white/80 px-2 py-1 bg-black/40 rounded-xl border border-white/5">
                               {carousel.cards_per_view_tablet}
                               <span className="text-[10px] text-muted-foreground opacity-50">T</span>
                             </div>
                             <div className="flex items-center gap-1 text-[13px] font-bold text-white/60 px-2 py-1 bg-black/40 rounded-xl border border-white/5">
                               {carousel.cards_per_view_mobile}
                               <span className="text-[10px] text-muted-foreground opacity-50">M</span>
                             </div>
                          </div>
                        </td>
                        <td className="px-6 py-5 text-center">
                          <button
                            onClick={() => toggleActiveMutation.mutate({
                              id: carousel.id,
                              is_active: carousel.is_active
                            })}
                            className={`p-2 rounded-full transition-all duration-300 ${
                              carousel.is_active 
                                ? 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.1)]' 
                                : 'bg-white/5 text-muted-foreground hover:bg-white/10 border border-white/10'
                            }`}
                          >
                            {carousel.is_active ? (
                              <Eye className="w-4 h-4" />
                            ) : (
                              <EyeOff className="w-4 h-4" />
                            )}
                          </button>
                        </td>
                        <td className="px-8 py-5">
                          <div className="flex items-center justify-end gap-3 opacity-40 group-hover/row:opacity-100 transition-opacity duration-300">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(carousel)}
                              className="w-9 h-9 rounded-xl hover:bg-primary/20 hover:text-primary border border-transparent hover:border-primary/30 transition-all"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(carousel.id)}
                              className="w-9 h-9 rounded-xl hover:bg-destructive/20 hover:text-destructive border border-transparent hover:border-destructive/30 transition-all"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          </div>
        )}
      </motion.div>

      {/* Create/Edit Modal */}
      <CreateCarouselModal
        open={isCreateModalOpen}
        onClose={handleCloseModal}
        carousel={editingCarousel}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingId} onOpenChange={() => setDeletingId(null)}>
        <AlertDialogContent className="glass-card border-white/10 rounded-[20px] max-w-[400px]">
          <AlertDialogHeader>
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="flex h-[60px] w-[60px] items-center justify-center rounded-full bg-red-500/10 border border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.1)]">
                <Trash2 className="h-7 w-7 text-red-500" />
              </div>
              <div>
                <AlertDialogTitle className="text-[20px] font-bold text-white tracking-tight">Excluir Carrossel</AlertDialogTitle>
                <AlertDialogDescription className="text-[14px] text-muted-foreground mt-2 leading-relaxed">
                  Tem certeza que deseja excluir este carrossel? Todos os dados configurados e ordem de exibição serão perdidos.
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-8 flex justify-center items-center gap-3 w-full sm:justify-center">
            <AlertDialogCancel className="flex-1 h-[44px] glass-card border-white/10 hover:bg-white/5 rounded-[12px] mt-0">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="flex-1 h-[44px] bg-red-500 hover:bg-red-600 text-white border-0 rounded-[12px] font-bold"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}
