import { useState } from "react";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { CommunitySection } from "@/hooks/useCommunity";
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

interface CommunitySectionsConfigProps {
  sections: CommunitySection[];
  onAdd: (section: Omit<CommunitySection, 'id' | 'ordem'>) => void;
  onUpdate: (id: string, updates: Partial<CommunitySection>) => void;
  onDelete: (id: string) => void;
  onReorder: (sections: CommunitySection[]) => void;
}

const sectionTypes = [
  { value: 'avisos', label: 'Avisos', icon: '📢' },
  { value: 'encontros', label: 'Encontros ao Vivo', icon: '📅' },
  { value: 'materiais', label: 'Materiais', icon: '📁' },
  { value: 'projetos', label: 'Projetos', icon: '🎯' },
  { value: 'feed', label: 'Feed da Comunidade', icon: '💬' },
  { value: 'trilhas', label: 'Trilhas', icon: '🛤️' },
  { value: 'replays', label: 'Replays', icon: '🎬' },
  { value: 'desafios', label: 'Desafios', icon: '🏆' },
] as const;

export function CommunitySectionsConfig({ sections, onAdd, onUpdate, onDelete, onReorder }: CommunitySectionsConfigProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<CommunitySection | null>(null);
  const [formData, setFormData] = useState({
    nome: '',
    tipo: 'avisos' as CommunitySection['tipo'],
    limite: 10,
    ativo: true,
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
      const oldIndex = sections.findIndex((s) => s.id === active.id);
      const newIndex = sections.findIndex((s) => s.id === over.id);
      const newSections = arrayMove(sections, oldIndex, newIndex);
      onReorder(newSections);
    }
  };

  const openDialog = (section?: CommunitySection) => {
    if (section) {
      setEditingSection(section);
      setFormData({
        nome: section.nome,
        tipo: section.tipo,
        limite: section.limite,
        ativo: section.ativo,
      });
    } else {
      setEditingSection(null);
      setFormData({
        nome: '',
        tipo: 'avisos',
        limite: 10,
        ativo: true,
      });
    }
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (editingSection) {
      onUpdate(editingSection.id, formData);
    } else {
      onAdd(formData);
    }
    setIsDialogOpen(false);
  };

  const getTypeIcon = (tipo: CommunitySection['tipo']) => {
    return sectionTypes.find(t => t.value === tipo)?.icon || '📋';
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-foreground">Seções da Comunidade</h3>
        <Button onClick={() => openDialog()} className="gap-2">
          <Plus className="w-4 h-4" />
          Adicionar Seção
        </Button>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={sections.map(s => s.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {sections.map((section) => (
              <SortableRow key={section.id} id={section.id}>
                <div className="flex items-center justify-between glass-card border border-border/50 rounded-xl p-4">
                  <div className="flex items-center gap-4 flex-1">
                    <span className="text-2xl">{getTypeIcon(section.tipo)}</span>
                    <div className="flex-1">
                      <h4 className="font-medium text-foreground">{section.nome}</h4>
                      <p className="text-sm text-muted-foreground">
                        Limite: {section.limite} itens
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={section.ativo}
                      onCheckedChange={(ativo) => onUpdate(section.id, { ativo })}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openDialog(section)}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onDelete(section.id)}
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
              {editingSection ? 'Editar Seção' : 'Nova Seção'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome da Seção</Label>
              <Input
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                placeholder="Ex: Avisos Importantes"
              />
            </div>

            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select
                value={formData.tipo}
                onValueChange={(tipo: CommunitySection['tipo']) => setFormData({ ...formData, tipo })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {sectionTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.icon} {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Limite de Itens</Label>
              <Input
                type="number"
                value={formData.limite}
                onChange={(e) => setFormData({ ...formData, limite: parseInt(e.target.value) || 0 })}
                min={1}
              />
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={formData.ativo}
                onCheckedChange={(ativo) => setFormData({ ...formData, ativo })}
              />
              <Label>Seção ativa</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>
              {editingSection ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
