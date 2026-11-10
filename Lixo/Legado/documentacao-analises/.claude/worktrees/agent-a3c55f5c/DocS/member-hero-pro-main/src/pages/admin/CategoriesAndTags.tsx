import { useState } from "react";
import { Pencil, Trash2, Plus, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useCategories, Category, Tag } from "@/hooks/useSupabaseCategories";
import { useToast } from "@/hooks/use-toast";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

function SortableCategoryItem({ category, onEdit, onDelete }: { 
  category: Category; 
  onEdit: (category: Category) => void;
  onDelete: (id: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: category.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 p-3 rounded-lg glass-card border border-border/50 group"
    >
      <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-2 -m-2">
        <GripVertical className="h-5 w-5 text-muted-foreground" />
      </div>
      
      <div
        className="w-4 h-4 rounded-full border border-border/50 flex-shrink-0"
        style={{ backgroundColor: category.cor }}
      />
      
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{category.nome}</p>
        {category.descricao && (
          <p className="text-sm text-muted-foreground truncate">{category.descricao}</p>
        )}
      </div>

      {/* Mobile: always visible / Desktop: hover */}
      <div className="flex gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onEdit(category)}
          className="h-10 w-10 min-h-[44px] min-w-[44px] hover:bg-primary/10"
        >
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onDelete(category.id)}
          className="h-10 w-10 min-h-[44px] min-w-[44px] hover:bg-destructive/10 text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function TagItem({ tag, onEdit, onDelete }: { 
  tag: Tag; 
  onEdit: (tag: Tag) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg glass-card border border-border/50 group">
      <div
        className="w-4 h-4 rounded-full border border-border/50 flex-shrink-0"
        style={{ backgroundColor: tag.cor }}
      />
      
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{tag.nome}</p>
        {tag.descricao && (
          <p className="text-sm text-muted-foreground truncate">{tag.descricao}</p>
        )}
      </div>

      {/* Mobile: always visible / Desktop: hover */}
      <div className="flex gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onEdit(tag)}
          className="h-10 w-10 min-h-[44px] min-w-[44px] hover:bg-primary/10"
        >
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onDelete(tag.id)}
          className="h-10 w-10 min-h-[44px] min-w-[44px] hover:bg-destructive/10 text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

const predefinedColors = [
  '#D4AF37', '#3b82f6', '#ec4899', '#22c55e', '#f97316',
  '#8b5cf6', '#ef4444', '#06b6d4', '#f59e0b', '#10b981'
];

export default function CategoriesAndTags() {
  const { categories, tags, addCategory, updateCategory, deleteCategory, reorderCategories, addTag, updateTag, deleteTag } = useCategories();
  const { toast } = useToast();

  const [categoryDialog, setCategoryDialog] = useState(false);
  const [tagDialog, setTagDialog] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);

  const [categoryForm, setCategoryForm] = useState({ nome: '', cor: '#D4AF37', descricao: '' });
  const [tagForm, setTagForm] = useState({ nome: '', cor: '#D4AF37', descricao: '' });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = categories.findIndex((cat) => cat.id === active.id);
      const newIndex = categories.findIndex((cat) => cat.id === over.id);
      const newOrder = arrayMove(categories, oldIndex, newIndex);
      reorderCategories(newOrder);
    }
  };

  const openCategoryDialog = (category?: Category) => {
    if (category) {
      setEditingCategory(category);
      setCategoryForm({ nome: category.nome, cor: category.cor, descricao: category.descricao || '' });
    } else {
      setEditingCategory(null);
      setCategoryForm({ nome: '', cor: '#D4AF37', descricao: '' });
    }
    setCategoryDialog(true);
  };

  const openTagDialog = (tag?: Tag) => {
    if (tag) {
      setEditingTag(tag);
      setTagForm({ nome: tag.nome, cor: tag.cor, descricao: tag.descricao || '' });
    } else {
      setEditingTag(null);
      setTagForm({ nome: '', cor: '#D4AF37', descricao: '' });
    }
    setTagDialog(true);
  };

  const handleSaveCategory = () => {
    if (!categoryForm.nome.trim()) {
      toast({ title: "Erro", description: "Nome é obrigatório", variant: "destructive" });
      return;
    }

    if (editingCategory) {
      updateCategory(editingCategory.id, categoryForm);
      toast({ title: "Sucesso", description: "Categoria atualizada!" });
    } else {
      addCategory({ ...categoryForm, ordem: categories.length });
      toast({ title: "Sucesso", description: "Categoria criada!" });
    }
    setCategoryDialog(false);
  };

  const handleSaveTag = () => {
    if (!tagForm.nome.trim()) {
      toast({ title: "Erro", description: "Nome é obrigatório", variant: "destructive" });
      return;
    }

    if (editingTag) {
      updateTag(editingTag.id, tagForm);
      toast({ title: "Sucesso", description: "Tag atualizada!" });
    } else {
      addTag(tagForm);
      toast({ title: "Sucesso", description: "Tag criada!" });
    }
    setTagDialog(false);
  };

  const handleDeleteCategory = (id: string) => {
    if (confirm("Tem certeza que deseja excluir esta categoria?")) {
      deleteCategory(id);
      toast({ title: "Sucesso", description: "Categoria excluída!" });
    }
  };

  const handleDeleteTag = (id: string) => {
    if (confirm("Tem certeza que deseja excluir esta tag?")) {
      deleteTag(id);
      toast({ title: "Sucesso", description: "Tag excluída!" });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Categorias e Tags</h1>
        <p className="text-muted-foreground">Organize seus cursos com categorias e tags personalizadas</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Categorias */}
        <Card className="glass-card border-border/50">
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <CardTitle className="text-lg">📁 Categorias</CardTitle>
              <Button onClick={() => openCategoryDialog()} size="sm" className="gap-2 min-h-[44px]">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Nova Categoria</span>
                <span className="sm:hidden">Nova</span>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={categories.map(c => c.id)} strategy={verticalListSortingStrategy}>
                {categories.map((category) => (
                  <SortableCategoryItem
                    key={category.id}
                    category={category}
                    onEdit={openCategoryDialog}
                    onDelete={handleDeleteCategory}
                  />
                ))}
              </SortableContext>
            </DndContext>
            {categories.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhuma categoria cadastrada
              </p>
            )}
          </CardContent>
        </Card>

        {/* Tags */}
        <Card className="glass-card border-border/50">
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <CardTitle className="text-lg">🏷️ Tags</CardTitle>
              <Button onClick={() => openTagDialog()} size="sm" className="gap-2 min-h-[44px]">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Nova Tag</span>
                <span className="sm:hidden">Nova</span>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {tags.map((tag) => (
              <TagItem
                key={tag.id}
                tag={tag}
                onEdit={openTagDialog}
                onDelete={handleDeleteTag}
              />
            ))}
            {tags.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhuma tag cadastrada
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Category Dialog */}
      <Dialog open={categoryDialog} onOpenChange={setCategoryDialog}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingCategory ? 'Editar Categoria' : 'Nova Categoria'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input
                value={categoryForm.nome}
                onChange={(e) => setCategoryForm({ ...categoryForm, nome: e.target.value })}
                placeholder="Ex: Marketing Digital"
                className="min-h-[44px]"
              />
            </div>
            <div className="space-y-2">
              <Label>Cor</Label>
              <div className="flex gap-2 flex-wrap">
                {predefinedColors.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setCategoryForm({ ...categoryForm, cor: color })}
                    className={`w-10 h-10 min-w-[44px] min-h-[44px] rounded-full border-2 transition-all ${
                      categoryForm.cor === color ? 'border-primary scale-110' : 'border-border/50'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Descrição (opcional)</Label>
              <Textarea
                value={categoryForm.descricao}
                onChange={(e) => setCategoryForm({ ...categoryForm, descricao: e.target.value })}
                placeholder="Breve descrição da categoria"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setCategoryDialog(false)} className="min-h-[44px] w-full sm:w-auto">Cancelar</Button>
            <Button onClick={handleSaveCategory} className="min-h-[44px] w-full sm:w-auto">Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Tag Dialog */}
      <Dialog open={tagDialog} onOpenChange={setTagDialog}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingTag ? 'Editar Tag' : 'Nova Tag'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input
                value={tagForm.nome}
                onChange={(e) => setTagForm({ ...tagForm, nome: e.target.value })}
                placeholder="Ex: Best-seller"
                className="min-h-[44px]"
              />
            </div>
            <div className="space-y-2">
              <Label>Cor</Label>
              <div className="flex gap-2 flex-wrap">
                {predefinedColors.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setTagForm({ ...tagForm, cor: color })}
                    className={`w-10 h-10 min-w-[44px] min-h-[44px] rounded-full border-2 transition-all ${
                      tagForm.cor === color ? 'border-primary scale-110' : 'border-border/50'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Descrição (opcional)</Label>
              <Textarea
                value={tagForm.descricao}
                onChange={(e) => setTagForm({ ...tagForm, descricao: e.target.value })}
                placeholder="Breve descrição da tag"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setTagDialog(false)} className="min-h-[44px] w-full sm:w-auto">Cancelar</Button>
            <Button onClick={handleSaveTag} className="min-h-[44px] w-full sm:w-auto">Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}