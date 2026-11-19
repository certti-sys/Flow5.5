import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion } from "framer-motion";
import {
  Undo2, RefreshCw, CheckCircle2, XCircle, Loader2, AlertTriangle,
  User, Clock, Banknote,
} from "lucide-react";
import { cn } from "@/lib/utils";

type RefundStatus = "pending" | "processing" | "completed" | "rejected" | "failed";

interface RefundRow {
  id: string;
  order_id: string;
  status: RefundStatus;
  reason: string;
  gateway: string | null;
  gateway_refund_id: string | null;
  manual_refund_required: boolean;
  last_error: string | null;
  admin_notes: string | null;
  created_at: string;
  reviewed_at: string | null;
  completed_at: string | null;
  orders?: {
    id: string;
    total_amount: number | null;
    customer_name: string | null;
    customer_email: string | null;
    status: string;
  } | null;
  products?: { name: string | null } | null;
  profiles?: { name: string | null } | null;
}

const STATUS: Record<RefundStatus, { label: string; cls: string; Icon: any }> = {
  pending: { label: "Aguardando", cls: "bg-amber-500/10 text-amber-400 border-amber-500/20", Icon: Clock },
  processing: { label: "Processando", cls: "bg-blue-500/10 text-blue-400 border-blue-500/20", Icon: Loader2 },
  completed: { label: "Reembolsado", cls: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", Icon: CheckCircle2 },
  rejected: { label: "Recusado", cls: "bg-white/5 text-white/60 border-white/10", Icon: XCircle },
  failed: { label: "Falhou", cls: "bg-red-500/10 text-red-400 border-red-500/20", Icon: AlertTriangle },
};

function money(cents: number | null | undefined) {
  return `R$${((cents ?? 0) / 100).toFixed(2).replace(".", ",")}`;
}

function statusBadge(status: RefundStatus) {
  const { label, cls, Icon } = STATUS[status] ?? STATUS.pending;
  return (
    <Badge variant="outline" className={cn("gap-1 text-[11px] font-bold uppercase tracking-wider", cls)}>
      <Icon className="h-3 w-3" /> {label}
    </Badge>
  );
}

export default function Refunds() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<"open" | "completed" | "all">("open");
  const [selected, setSelected] = useState<RefundRow | null>(null);
  const [decision, setDecision] = useState<"approve" | "reject" | "confirm">("approve");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  const { data: requests = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ["refund-requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("refund_requests")
        .select(`
          *,
          orders:order_id(id, total_amount, customer_name, customer_email, status),
          products:product_id(name)
        `)
        .order("created_at", { ascending: false })
        .limit(300);
      if (error) throw error;
      return (data ?? []) as RefundRow[];
    },
  });

  const filtered = useMemo(() => {
    if (filter === "all") return requests;
    if (filter === "completed") return requests.filter((r) => r.status === "completed");
    return requests.filter((r) => ["pending", "processing", "failed"].includes(r.status));
  }, [requests, filter]);

  const stats = useMemo(() => {
    const open = requests.filter((r) => ["pending", "processing", "failed"].includes(r.status));
    const done = requests.filter((r) => r.status === "completed");
    return {
      open: open.length,
      done: done.length,
      manual: open.filter((r) => r.manual_refund_required).length,
      amount: done.reduce((sum, r) => sum + (r.orders?.total_amount ?? 0), 0),
    };
  }, [requests]);

  const openDialog = (row: RefundRow) => {
    setSelected(row);
    setNotes(row.admin_notes ?? "");
    setDecision(row.manual_refund_required || row.status === "failed" ? "confirm" : "approve");
  };

  const submit = async () => {
    if (!selected) return;
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("payment-ops", {
        body: {
          action: "refund",
          payload: {
            refundRequestId: selected.id,
            decision,
            notes: notes.trim() || undefined,
          },
        },
      });
      if (error) throw error;

      if (data?.ok) {
        toast.success(
          decision === "reject"
            ? "Solicitação recusada."
            : decision === "confirm"
              ? "Reembolso confirmado e acesso revogado."
              : "Reembolso enviado ao gateway.",
        );
      } else {
        toast.warning(data?.message || data?.error || "Gateway não concluiu o estorno.");
      }

      setSelected(null);
      queryClient.invalidateQueries({ queryKey: ["refund-requests"] });
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
    } catch (e: any) {
      toast.error(e?.message || "Falha ao processar o reembolso.");
    } finally {
      setBusy(false);
    }
  };

  const canAct = selected && ["pending", "processing", "failed"].includes(selected.status);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 pb-20">
      <AdminHeader
        title="Reembolsos"
        description="Solicitações de estorno dos alunos. O acesso só é revogado após o reembolso confirmado."
        actionButton={
          <Button
            onClick={() => refetch()}
            variant="ghost"
            className="bg-white/5 border border-white/5 hover:bg-white/10 text-white/80 h-[44px] rounded-[12px] px-5 font-bold text-[13px]"
          >
            <RefreshCw className={cn("w-4 h-4 mr-2", isFetching && "animate-spin")} />
            Sincronizar
          </Button>
        }
        filters={
          <div className="flex items-center gap-1.5 p-1 bg-white/5 rounded-xl border border-white/5">
            {[
              { id: "open" as const, label: "Em aberto" },
              { id: "completed" as const, label: "Reembolsados" },
              { id: "all" as const, label: "Todos" },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={cn(
                  "px-4 py-1.5 text-[12px] font-bold rounded-lg transition-all",
                  filter === f.id
                    ? "bg-primary text-primary-foreground shadow-glow-sm"
                    : "text-muted-foreground hover:text-white",
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Em aberto", value: stats.open, Icon: Clock, cls: "text-amber-400" },
          { label: "Estorno manual", value: stats.manual, Icon: AlertTriangle, cls: "text-red-400" },
          { label: "Reembolsados", value: stats.done, Icon: CheckCircle2, cls: "text-emerald-400" },
          { label: "Valor devolvido", value: money(stats.amount), Icon: Banknote, cls: "text-blue-400" },
        ].map((card) => (
          <div key={card.label} className="glass-card p-6 rounded-[20px] border-white/10">
            <div className="flex items-center gap-3">
              <div className={cn("p-2.5 rounded-[12px] bg-white/[0.03] border border-white/5", card.cls)}>
                <card.Icon className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[12px] font-bold text-muted-foreground uppercase tracking-wider block">
                  {card.label}
                </span>
                <h3 className="text-[22px] font-black text-white leading-none mt-1">{card.value}</h3>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="glass-card rounded-[20px] border-white/10 overflow-hidden bg-white/[0.01]">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-white/[0.03] border-b border-white/5 text-muted-foreground text-[12px] font-bold uppercase tracking-[0.1em]">
                <th className="px-6 py-4 text-left">Cliente</th>
                <th className="px-6 py-4 text-left hidden md:table-cell">Produto</th>
                <th className="px-6 py-4 text-center hidden sm:table-cell">Status</th>
                <th className="px-6 py-4 text-right">Valor</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {isLoading ? (
                Array(3).fill(0).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={5} className="px-6 py-8">
                      <div className="h-4 bg-white/5 rounded w-full" />
                    </td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-20 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center">
                        <Undo2 className="w-8 h-8 text-white/10" />
                      </div>
                      <p className="text-white/60 font-bold uppercase tracking-widest text-[12px]">
                        {filter === "open" ? "Nenhuma solicitação em aberto" : "Nenhum reembolso aqui"}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((row) => (
                  <tr key={row.id} className="hover:bg-white/[0.03] transition-colors">
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-[12px] bg-white/[0.03] border border-white/5 flex items-center justify-center shrink-0">
                          <User className="w-4 h-4 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-[14px] text-white/90 truncate">
                            {row.orders?.customer_name || "Cliente"}
                          </p>
                          <p className="text-[12px] text-muted-foreground truncate">
                            {row.orders?.customer_email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5 hidden md:table-cell text-[13px] text-white/70">
                      {row.products?.name ?? "—"}
                    </td>
                    <td className="px-6 py-5 hidden sm:table-cell text-center">
                      <div className="flex flex-col items-center gap-1">
                        {statusBadge(row.status)}
                        {row.manual_refund_required && (
                          <span className="text-[10px] font-bold uppercase tracking-wider text-red-400">
                            estorno manual
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-5 text-right font-black text-white text-[15px]">
                      {money(row.orders?.total_amount)}
                    </td>
                    <td className="px-6 py-5 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openDialog(row)}
                        className="h-9 rounded-xl border border-white/5 bg-white/5 hover:bg-primary/20 hover:text-primary text-[12px] font-bold"
                      >
                        {["pending", "processing", "failed"].includes(row.status) ? "Analisar" : "Detalhes"}
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-lg glass-card border-white/10">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Undo2 className="w-5 h-5 text-primary" />
              Solicitação de reembolso
            </DialogTitle>
            <DialogDescription>
              {selected?.orders?.customer_name} · {money(selected?.orders?.total_amount)}
            </DialogDescription>
          </DialogHeader>

          {selected && (
            <div className="space-y-4">
              <div className="rounded-[12px] border border-white/10 bg-black/20 p-4">
                <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1">
                  Motivo do aluno
                </p>
                <p className="text-[13px] text-white/80 whitespace-pre-wrap">{selected.reason}</p>
                <p className="text-[11px] text-muted-foreground mt-2">
                  Pedido em {format(new Date(selected.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  {selected.gateway ? ` · ${selected.gateway}` : ""}
                </p>
              </div>

              {selected.last_error && (
                <div className="rounded-[12px] border border-red-500/20 bg-red-500/5 p-3">
                  <p className="text-[12px] text-red-300">{selected.last_error}</p>
                </div>
              )}

              {selected.gateway_refund_id && (
                <p className="text-[12px] text-muted-foreground">
                  Estorno no gateway: <span className="text-white/80">{selected.gateway_refund_id}</span>
                </p>
              )}

              {canAct && (
                <>
                  <div className="space-y-2">
                    <Label className="text-white/70 text-[12px] font-bold uppercase tracking-wider">Ação</Label>
                    <Select value={decision} onValueChange={(v) => setDecision(v as any)}>
                      <SelectTrigger className="bg-transparent border-white/10 h-[44px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="approve">Aprovar e estornar no gateway</SelectItem>
                        <SelectItem value="confirm">Já estornei no painel do provedor</SelectItem>
                        <SelectItem value="reject">Recusar solicitação</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-[11px] text-muted-foreground">
                      {decision === "approve"
                        ? "Chama a API do gateway. O acesso é revogado ao concluir."
                        : decision === "confirm"
                          ? "Use quando o estorno foi feito fora da API. Revoga o acesso agora."
                          : "O aluno é avisado e o pedido continua pago."}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-white/70 text-[12px] font-bold uppercase tracking-wider">
                      Observação (opcional)
                    </Label>
                    <Textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Anotação interna sobre este reembolso"
                      className="bg-transparent border-white/10 min-h-[72px]"
                    />
                  </div>

                  {selected.gateway && decision === "confirm" && (
                    <p className="text-[11px] text-muted-foreground">
                      Gateways sem API de estorno (PushinPay, Efí, CajuPay cartão, link do Pagar.me,
                      checkout hospedado do Asaas) precisam ser estornados no painel do provedor.
                    </p>
                  )}
                </>
              )}
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setSelected(null)} className="h-[44px] rounded-[12px]">
              Fechar
            </Button>
            {canAct && (
              <Button
                onClick={submit}
                disabled={busy}
                className={cn(
                  "h-[44px] rounded-[12px] font-bold",
                  decision === "reject" ? "bg-red-500 hover:bg-red-600" : "gradient-primary",
                )}
              >
                {busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {decision === "reject" ? "Recusar" : decision === "confirm" ? "Confirmar estorno" : "Aprovar e estornar"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
