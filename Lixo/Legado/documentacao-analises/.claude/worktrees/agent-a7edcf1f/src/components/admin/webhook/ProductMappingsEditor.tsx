import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Package, BookOpen, FolderOpen, Search } from "lucide-react";
import { ConfirmDeleteDialog } from "@/components/admin/ConfirmDeleteDialog";

interface ProductMappingsEditorProps {
  platforms: any[];
  selectedPlatform: string | null;
  onSelectPlatform: (id: string | null) => void;
}

interface ProductMapping {
  id: string;
  platform_id: string;
  external_product_id: string;
  external_product_name: string | null;
  course_id: string | null;
  category: string | null;
  grant_type: string;
  is_active: boolean;
  platform?: {
    name: string;
    display_name: string;
  };
  course?: {
    title: string;
  };
}

export function ProductMappingsEditor({
  platforms,
  selectedPlatform,
  onSelectPlatform
}: ProductMappingsEditorProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingMapping, setEditingMapping] = useState<ProductMapping | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingMappingId, setDeletingMappingId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Form state
  const [formData, setFormData] = useState({
    platform_id: "",
    external_product_id: "",
    external_product_name: "",
    grant_type: "course" as "course" | "category",
    course_id: "",
    category: "",
    is_active: true
  });

  // Buscar mapeamentos de produtos
  const { data: mappings, isLoading } = useQuery({
    queryKey: ['product-mappings', selectedPlatform],
    queryFn: async () => {
      let query = supabase
        .from('product_mappings')
        .select(`
          *,
          platform:webhook_platforms(name, display_name),
          course:courses(title)
        `)
        .order('created_at', { ascending: false });

      if (selectedPlatform) {
        query = query.eq('platform_id', selectedPlatform);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as ProductMapping[];
    }
  });

  // Buscar cursos disponíveis
  const { data: courses } = useQuery({
    queryKey: ['courses-for-mapping'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('courses')
        .select('id, title, category')
        .order('title');
      if (error) throw error;
      return data;
    }
  });

  // Extrair categorias únicas dos cursos
  const categories = [...new Set(courses?.map(c => c.category) || [])].sort();

  // Criar/Atualizar mapeamento
  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const payload = {
        platform_id: data.platform_id,
        external_product_id: data.external_product_id,
        external_product_name: data.external_product_name || null,
        grant_type: data.grant_type,
        course_id: data.grant_type === 'course' ? data.course_id : null,
        category: data.grant_type === 'category' ? data.category : null,
        is_active: data.is_active
      };

      if (editingMapping) {
        const { error } = await supabase
          .from('product_mappings')
          .update(payload)
          .eq('id', editingMapping.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('product_mappings')
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-mappings'] });
      toast.success(editingMapping ? "Mapeamento atualizado!" : "Mapeamento criado!");
      closeModal();
    },
    onError: (error: any) => {
      toast.error(`Erro: ${error.message}`);
    }
  });

  // Deletar mapeamento
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('product_mappings')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-mappings'] });
      toast.success("Mapeamento excluído!");
    },
    onError: (error: any) => {
      toast.error(`Erro: ${error.message}`);
    }
  });

  // Toggle ativo/inativo
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('product_mappings')
        .update({ is_active })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-mappings'] });
    }
  });

  const openCreateModal = () => {
    setEditingMapping(null);
    setFormData({
      platform_id: selectedPlatform || "",
      external_product_id: "",
      external_product_name: "",
      grant_type: "course",
      course_id: "",
      category: "",
      is_active: true
    });
    setModalOpen(true);
  };

  const openEditModal = (mapping: ProductMapping) => {
    setEditingMapping(mapping);
    setFormData({
      platform_id: mapping.platform_id,
      external_product_id: mapping.external_product_id,
      external_product_name: mapping.external_product_name || "",
      grant_type: mapping.grant_type as "course" | "category",
      course_id: mapping.course_id || "",
      category: mapping.category || "",
      is_active: mapping.is_active
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingMapping(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.platform_id) {
      toast.error("Selecione uma plataforma");
      return;
    }
    if (!formData.external_product_id) {
      toast.error("Informe o ID do produto externo");
      return;
    }
    if (formData.grant_type === 'course' && !formData.course_id) {
      toast.error("Selecione um curso");
      return;
    }
    if (formData.grant_type === 'category' && !formData.category) {
      toast.error("Selecione uma categoria");
      return;
    }

    saveMutation.mutate(formData);
  };

  // Filtrar mapeamentos
  const filteredMappings = mappings?.filter(m => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      m.external_product_id.toLowerCase().includes(term) ||
      m.external_product_name?.toLowerCase().includes(term) ||
      m.course?.title?.toLowerCase().includes(term) ||
      m.category?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Select value={selectedPlatform || "__all__"} onValueChange={(v) => onSelectPlatform(v === "__all__" ? null : v)}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Todas as Plataformas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Todas as Plataformas</SelectItem>
            {platforms.map((p) => (
              <SelectItem key={p.id} value={p.id}>{p.display_name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por ID, nome ou curso..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>

        <Button onClick={openCreateModal} className="shrink-0">
          <Plus className="w-4 h-4 mr-2" />
          Novo Mapeamento
        </Button>
      </div>

      {/* Lista de Mapeamentos */}
      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Carregando...</div>
      ) : filteredMappings && filteredMappings.length > 0 ? (
        <div className="grid gap-3">
          {filteredMappings.map((mapping) => (
            <Card key={mapping.id} className={!mapping.is_active ? "opacity-60" : ""}>
              <CardContent className="py-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-muted">
                      <Package className="w-5 h-5 text-primary" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">ID: {mapping.external_product_id}</span>
                        {mapping.external_product_name && (
                          <span className="text-muted-foreground text-sm">
                            ({mapping.external_product_name})
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Badge variant="outline" className="text-xs">
                          {mapping.platform?.display_name || 'Plataforma'}
                        </Badge>
                        <span className="text-muted-foreground">→</span>
                        {mapping.grant_type === 'course' ? (
                          <Badge variant="secondary" className="text-xs">
                            <BookOpen className="w-3 h-3 mr-1" />
                            {mapping.course?.title || 'Curso não encontrado'}
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">
                            <FolderOpen className="w-3 h-3 mr-1" />
                            Categoria: {mapping.category}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Switch
                      checked={mapping.is_active}
                      onCheckedChange={(checked) =>
                        toggleActiveMutation.mutate({ id: mapping.id, is_active: checked })
                      }
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditModal(mapping)}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setDeletingMappingId(mapping.id);
                        setDeleteDialogOpen(true);
                      }}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-8 text-center">
            <Package className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
            <p className="text-muted-foreground mb-4">
              Nenhum mapeamento de produto encontrado.
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              Mapeie os IDs de produtos das plataformas de pagamento para os cursos do sistema.
            </p>
            <Button onClick={openCreateModal}>
              <Plus className="w-4 h-4 mr-2" />
              Criar Mapeamento
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Modal de Criação/Edição */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingMapping ? "Editar Mapeamento" : "Novo Mapeamento de Produto"}
            </DialogTitle>
            <DialogDescription>
              Associe o ID do produto externo a um curso ou categoria do sistema.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Plataforma */}
            <div className="space-y-2">
              <Label>Plataforma *</Label>
              <Select
                value={formData.platform_id}
                onValueChange={(v) => setFormData(prev => ({ ...prev, platform_id: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a plataforma" />
                </SelectTrigger>
                <SelectContent>
                  {platforms.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.display_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* ID do Produto Externo */}
            <div className="space-y-2">
              <Label>ID do Produto Externo *</Label>
              <Input
                placeholder="Ex: 12345, PROD_ABC, etc."
                value={formData.external_product_id}
                onChange={(e) => setFormData(prev => ({ ...prev, external_product_id: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">
                O ID que a plataforma de pagamento envia no webhook
              </p>
            </div>

            {/* Nome do Produto (opcional) */}
            <div className="space-y-2">
              <Label>Nome do Produto (opcional)</Label>
              <Input
                placeholder="Ex: Curso de Design UI/UX"
                value={formData.external_product_name}
                onChange={(e) => setFormData(prev => ({ ...prev, external_product_name: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">
                Nome para identificação interna (apenas referência)
              </p>
            </div>

            {/* Tipo de Concessão */}
            <div className="space-y-2">
              <Label>Tipo de Concessão *</Label>
              <Select
                value={formData.grant_type}
                onValueChange={(v: "course" | "category") =>
                  setFormData(prev => ({ ...prev, grant_type: v, course_id: "", category: "" }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="course">
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4" />
                      Curso Individual
                    </div>
                  </SelectItem>
                  <SelectItem value="category">
                    <div className="flex items-center gap-2">
                      <FolderOpen className="w-4 h-4" />
                      Categoria (todos os cursos)
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Seleção de Curso ou Categoria */}
            {formData.grant_type === 'course' ? (
              <div className="space-y-2">
                <Label>Curso *</Label>
                <Select
                  value={formData.course_id}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, course_id: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o curso" />
                  </SelectTrigger>
                  <SelectContent>
                    {courses?.map((course) => (
                      <SelectItem key={course.id} value={course.id}>
                        {course.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Categoria *</Label>
                <Select
                  value={formData.category}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, category: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  O usuário terá acesso a todos os cursos desta categoria
                </p>
              </div>
            )}

            {/* Ativo */}
            <div className="flex items-center justify-between">
              <div>
                <Label>Mapeamento Ativo</Label>
                <p className="text-xs text-muted-foreground">
                  Desative para pausar a concessão de acesso
                </p>
              </div>
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
              />
            </div>

            <DialogFooter className="mt-6 pt-4 border-t border-white/5">
              <Button type="button" variant="outline" onClick={closeModal}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "Salvando..." : (editingMapping ? "Atualizar" : "Criar")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          setDeleteDialogOpen(open);
          if (!open) setDeletingMappingId(null);
        }}
        onConfirm={() => {
          if (deletingMappingId) {
            deleteMutation.mutate(deletingMappingId, {
              onSettled: () => {
                setDeleteDialogOpen(false);
                setDeletingMappingId(null);
              }
            });
          }
        }}
        title="Excluir Mapeamento"
        description="Tem certeza que deseja excluir este mapeamento de produto? Novos webhooks não serão mais processados para este produto."
        confirmLabel="Excluir Mapeamento"
        isPending={deleteMutation.isPending}
      />
    </div>
  );
}
