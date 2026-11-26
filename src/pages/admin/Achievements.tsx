import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { ConfirmDeleteDialog } from "@/components/admin/ConfirmDeleteDialog";
import { toast } from "sonner";
import { Loader2, Plus, Pencil, Trash2, Award } from "lucide-react";

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  criteria_type: string;
  criteria_value: number;
  xp_reward: number;
  order_index: number;
}

type Form = Omit<Achievement, "id">;

const CRITERIOS = [
  { value: "lessons_completed", label: "Aulas concluídas" },
  { value: "streak_days", label: "Dias de ofensiva" },
  { value: "daily_lessons", label: "Aulas no dia" },
  { value: "course_completed", label: "Cursos concluídos" },
  { value: "comments_count", label: "Comentários" },
];

const vazio: Form = {
  title: "", description: "", icon: "🏆", criteria_type: "lessons_completed",
  criteria_value: 1, xp_reward: 50, order_index: 0,
};

export default function AdminAchievements() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editando, setEditando] = useState<Achievement | null>(null);
  const [form, setForm] = useState<Form>(vazio);
  const [excluir, setExcluir] = useState<Achievement | null>(null);

  const { data: conquistas = [], isLoading } = useQuery({
    queryKey: ["admin-achievements"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("achievements").select("*").order("order_index");
      if (error) throw error;
      return (data ?? []) as Achievement[];
    },
  });

  const salvar = useMutation({
    mutationFn: async () => {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        icon: form.icon.trim() || "🏆",
        criteria_type: form.criteria_type,
        criteria_value: Math.max(1, Number(form.criteria_value) || 1),
        xp_reward: Math.max(0, Number(form.xp_reward) || 0),
        order_index: Number(form.order_index) || 0,
      };
      const { error } = editando
        ? await supabase.from("achievements").update(payload).eq("id", editando.id)
        : await supabase.from("achievements").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(editando ? "Conquista atualizada" : "Conquista criada");
      qc.invalidateQueries({ queryKey: ["admin-achievements"] });
      setOpen(false);
    },
    onError: (e) => toast.error(`Erro ao salvar: ${e.message}`),
  });

  const remover = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("achievements").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Conquista removida");
      qc.invalidateQueries({ queryKey: ["admin-achievements"] });
      setExcluir(null);
    },
    onError: (e) => toast.error(`Erro ao remover: ${e.message}`),
  });

  const abrirNovo = () => {
    setEditando(null);
    setForm({ ...vazio, order_index: conquistas.length });
    setOpen(true);
  };

  const abrirEdicao = (a: Achievement) => {
    setEditando(a);
    setForm({
      title: a.title, description: a.description, icon: a.icon,
      criteria_type: a.criteria_type, criteria_value: a.criteria_value,
      xp_reward: a.xp_reward, order_index: a.order_index,
    });
    setOpen(true);
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      <AdminHeader
        title="Conquistas"
        description="Critérios e recompensas da gamificação. Alterações valem para todos os alunos."
        showSearch={false}
        actionButton={<Button onClick={abrirNovo}><Plus className="mr-2 h-4 w-4" />Nova conquista</Button>}
      />

      {isLoading ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {conquistas.map((a) => (
            <Card key={a.id}>
              <CardHeader className="flex flex-row items-start justify-between gap-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <span className="text-2xl">{a.icon}</span> {a.title}
                </CardTitle>
                <div className="flex shrink-0 gap-1">
                  <Button variant="ghost" size="icon" onClick={() => abrirEdicao(a)} aria-label="Editar">
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => setExcluir(a)} aria-label="Remover">
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>{a.description || "Sem descrição"}</p>
                <p>
                  Critério: <strong className="text-foreground">
                    {CRITERIOS.find((c) => c.value === a.criteria_type)?.label ?? a.criteria_type}
                  </strong> ≥ {a.criteria_value}
                </p>
                <p>Recompensa: <strong className="text-foreground">{a.xp_reward} XP</strong></p>
              </CardContent>
            </Card>
          ))}
          {conquistas.length === 0 && (
            <p className="flex items-center gap-2 text-muted-foreground">
              <Award className="h-4 w-4" /> Nenhuma conquista cadastrada.
            </p>
          )}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editando ? "Editar conquista" : "Nova conquista"}</DialogTitle>
            <DialogDescription>O critério é avaliado pelo motor de conquistas a cada acesso do aluno.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="ach-title">Título</Label>
              <Input id="ach-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ach-desc">Descrição</Label>
              <Textarea id="ach-desc" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="ach-icon">Ícone (emoji)</Label>
                <Input id="ach-icon" value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Critério</Label>
                <Select value={form.criteria_type} onValueChange={(v) => setForm({ ...form, criteria_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CRITERIOS.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ach-value">Valor do critério</Label>
                <Input id="ach-value" type="number" min={1} value={form.criteria_value} onChange={(e) => setForm({ ...form, criteria_value: Number(e.target.value) })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ach-xp">XP de recompensa</Label>
                <Input id="ach-xp" type="number" min={0} value={form.xp_reward} onChange={(e) => setForm({ ...form, xp_reward: Number(e.target.value) })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={() => salvar.mutate()} disabled={salvar.isPending || !form.title.trim()}>
              {salvar.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={Boolean(excluir)}
        onOpenChange={(v) => !v && setExcluir(null)}
        title="Remover conquista?"
        description={`A conquista "${excluir?.title ?? ""}" será removida. O XP já concedido não é descontado.`}
        onConfirm={() => excluir && remover.mutate(excluir.id)}
      />
    </div>
  );
}
