import { useState } from "react";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { CommunityShelf } from "@/hooks/useCommunity";
import { SortableRow } from "@/components/admin/SortableRow";
import {
  Dialog,
  DialogContent,
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

interface CommunityShelfConfigProps {
  shelves: CommunityShelf[];
  onAdd: (shelf: Omit<CommunityShelf, 'id' | 'ordem'>) => void;
  onUpdate: (id: string, updates: Partial<CommunityShelf>) => void;
  onDelete: (id: string) => void;
  onReorder: (shelves: CommunityShelf[]) => void;
}

const shelfTypes = [
  { value: 'trilhas', label: 'Trilhas de Conteúdo', icon: '🎯' },
  { value: 'materiais', label: 'Materiais do Grupo', icon: '📚' },
  { value: 'replays', label: 'Replays de Lives', icon: '🎬' },
  { value: 'desafios', label: 'Desafios', icon: '🏆' },
  { value: 'manual', label: 'Prateleira Manual', icon: '📋' },
] as const;

export function CommunityShelfConfig({ shelves, onAdd, onUpdate, onDelete, onReorder }: CommunityShelfConfigProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingShelf, setEditingShelf] = useState<CommunityShelf | null>(null);
  const [formData, setFormData] = useState({
    titulo: '',
    tipo: 'manual' as CommunityShelf['tipo'],
    ativo: true,
    itensIds: [] as string[],
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = shelves.findIndex((s) => s.id === active.id);
      const newIndex = shelves.findIndex((s) => s.id === over.id);
      const newShelves = arrayMove(shelves, oldIndex, newIndex);
      onReorder(newShelves);
    }
  };

  const openDialog = (shelf?: CommunityShelf) => {
    if (shelf) {
      setEditingShelf(shelf);
      setFormData({
        titulo: shelf.titulo,
        tipo: shelf.tipo,
        ativo: shelf.ativo,
        itensIds: shelf.itensIds,
      });
    } else {
      setEditingShelf(null);
      setFormData({
        titulo: '',
        tipo: 'manual',
        ativo: true,
        itensIds: [],
      });
    }
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (editingShelf) {
      onUpdate(editingShelf.id, formData);
    } else {
      onAdd(formData);
    }
    setIsDialogOpen(false);
  };

  const getTypeIcon = (tipo: CommunityShelf['tipo']) => {
    return shelfTypes.find(t => t.value === tipo)?.icon || '📋';
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-foreground">Prateleiras da Vitrine</h3>
        <Button onClick={() => openDialog()} className="gap-2">
          <Plus className="w-4 h-4" />
          Nova Prateleira
        </Button>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={shelves.map(s => s.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {shelves.map((shelf) => (
              <SortableRow key={shelf.id} id={shelf.id}>
                <div className="flex items-center justify-between glass-card border border-border/50 rounded-xl p-4">
                  <div className="flex items-center gap-4 flex-1">
                    <span className="text-2xl">{getTypeIcon(shelf.tipo)}</span>
                    <div className="flex-1">
                      <h4 className="font-medium text-foreground">{shelf.titulo}</h4>
                      <p className="text-sm text-muted-foreground">
                        {shelf.itensIds.length} itens configurados
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={shelf.ativo}
                      onCheckedChange={(ativo) => onUpdate(shelf.id, { ativo })}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openDialog(shelf)}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onDelete(shelf.id)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </SortableRow>
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingShelf ? 'Editar Prateleira' : 'Nova Prateleira'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Título da Prateleira</Label>
              <Input
                value={formData.titulo}
                onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                placeholder="Ex: Trilhas de Conteúdo"
              />
            </div>

            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select
                value={formData.tipo}
                onValueChange={(tipo: CommunityShelf['tipo']) => setFormData({ ...formData, tipo })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {shelfTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.icon} {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={formData.ativo}
                onCheckedChange={(ativo) => setFormData({ ...formData, ativo })}
              />
              <Label>Prateleira ativa</Label>
            </div>

            <div className="text-sm text-muted-foreground p-4 glass-card rounded-lg">
              💡 Os itens desta prateleira poderão ser gerenciados após a criação
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>
              {editingShelf ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
