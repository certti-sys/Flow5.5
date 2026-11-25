import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  ArrowUpRight, Copy, Loader2, Plus, RefreshCw, RotateCcw, Send, Trash2,
} from "lucide-react";

/**
 * Webhooks de saída (Flow → integrador).
 *
 * A assinatura é HMAC, não bearer: o destinatário valida o corpo e o
 * timestamp, o que também barra replay. O segredo só aparece uma vez, na
 * criação — depois disso o painel não consegue lê-lo (RLS + service role).
 */

export const OUTBOUND_EVENTS = [
  { value: "order.pending", label: "Pedido pendente", group: "Pagamento", description: "Pedido criado aguardando confirmação do pagamento." },
  { value: "order.paid", label: "Pedido pago", group: "Pagamento", description: "Pagamento confirmado pelo gateway." },
  { value: "order.failed", label: "Pagamento falhou", group: "Pagamento", description: "Recusado pelo gateway ou antifraude." },
  { value: "order.canceled", label: "Pedido cancelado", group: "Pagamento", description: "Cancelado antes da conclusão." },
  { value: "order.expired", label: "Pedido expirado", group: "Pagamento", description: "Pix/boleto venceu sem pagamento." },
  { value: "order.refunded", label: "Reembolso", group: "Pagamento", description: "Estorno total ou chargeback." },
  { value: "payment.pix_generated", label: "Pix gerado", group: "Pagamento", description: "QR/copia-e-cola emitido (payload traz o código)." },
  { value: "payment.boleto_generated", label: "Boleto gerado", group: "Pagamento", description: "Boleto emitido com linha digitável e vencimento." },
  { value: "cart.abandoned", label: "Carrinho abandonado", group: "Funil", description: "Formulário preenchido sem pagamento após o período de graça." },
  { value: "access.ready", label: "Acesso liberado", group: "Área de membros", description: "Aluno recebeu acesso a um curso (um por curso)." },
] as const;

type Endpoint = {
  id: string;
  name: string;
  url: string;
  bearer_token?: string | null;
  events: string[];
  is_active: boolean;
  created_at: string;
};

type Delivery = {
  id: string;
  endpoint_id: string;
  event: string;
  status: "pending" | "delivered" | "failed";
  attempt: number;
  max_attempts: number;
  next_attempt_at: string;
  response_status: number | null;
  response_body: string | null;
  error: string | null;
  delivered_at: string | null;
  created_at: string;
};

function randomSecret(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function eventLabel(event: string): string {
  if (event === "test.ping") return "Teste de endpoint";
  return OUTBOUND_EVENTS.find((e) => e.value === event)?.label ?? event;
}

const STATUS_STYLES: Record<Delivery["status"], string> = {
  delivered: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  pending: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  failed: "bg-red-500/10 text-red-400 border-red-500/20",
};

export function WebhookOutbound() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Endpoint | null>(null);
  const [form, setForm] = useState({ name: "", url: "", bearer_token: "", events: [] as string[], is_active: true });
  const [revealedSecret, setRevealedSecret] = useState<string | null>(null);
  const [selectedEndpoint, setSelectedEndpoint] = useState<string | null>(null);

  const { data: endpoints, isLoading } = useQuery({
    queryKey: ["webhook-endpoints"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("webhook_endpoints")
        .select("id, name, url, events, is_active, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Endpoint[];
    },
  });

  const { data: deliveries } = useQuery({
    queryKey: ["webhook-deliveries", selectedEndpoint],
    queryFn: async () => {
      let query = supabase
        .from("webhook_deliveries")
        .select("id, endpoint_id, event, status, attempt, max_attempts, next_attempt_at, response_status, response_body, error, delivered_at, created_at")
        .order("created_at", { ascending: false })
        .limit(100);
      if (selectedEndpoint) query = query.eq("endpoint_id", selectedEndpoint);
      const { data, error } = await query;
      if (error) throw error;
      return data as Delivery[];
    },
  });

  const resetForm = () => {
    setForm({ name: "", url: "", bearer_token: "", events: [], is_active: true });
    setEditing(null);
    setRevealedSecret(null);
  };

  const openCreate = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEdit = (endpoint: Endpoint) => {
    setEditing(endpoint);
    setForm({
      name: endpoint.name,
      url: endpoint.url,
      bearer_token: endpoint.bearer_token ?? "",
      events: endpoint.events ?? [],
      is_active: endpoint.is_active,
    });
    setRevealedSecret(null);
    setDialogOpen(true);
  };

  const save = useMutation({
    mutationFn: async () => {
      if (!form.url.match(/^https?:\/\//)) throw new Error("A URL precisa começar com http:// ou https://");
      if (form.events.length === 0) throw new Error("Selecione ao menos um evento");

      if (editing) {
        const { error } = await supabase
          .from("webhook_endpoints")
          .update({ name: form.name, url: form.url, bearer_token: form.bearer_token || null, events: form.events, is_active: form.is_active })
          .eq("id", editing.id);
        if (error) throw error;
        return null;
      }

      const secret = randomSecret();
      const { error } = await supabase
        .from("webhook_endpoints")
        .insert({ name: form.name, url: form.url, bearer_token: form.bearer_token || null, events: form.events, is_active: form.is_active, secret });
      if (error) throw error;
      return secret;
    },
    onSuccess: (secret) => {
      queryClient.invalidateQueries({ queryKey: ["webhook-endpoints"] });
      if (secret) {
        // Única vez que o segredo é mostrado.
        setRevealedSecret(secret);
        toast.success("Endpoint criado. Copie o segredo agora — ele não será exibido de novo.");
      } else {
        setDialogOpen(false);
        resetForm();
        toast.success("Endpoint atualizado");
      }
    },
    onError: (error: any) => toast.error(error.message ?? "Falha ao salvar endpoint"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("webhook_endpoints").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["webhook-endpoints"] });
      toast.success("Endpoint removido");
    },
    onError: (error: any) => toast.error(error.message ?? "Falha ao remover endpoint"),
  });

  const redeliver = useMutation({
    mutationFn: async (delivery: Delivery) => {
      const { error } = await supabase.rpc("requeue_webhook_delivery", { p_delivery_id: delivery.id });
      if (error) throw error;

      // Dispara a drenagem no mesmo instante; o cron é o plano B.
      const { error: dispatchError } = await supabase.functions.invoke("dispatch-webhooks", {
        body: { deliveryId: delivery.id },
      });
      if (dispatchError) return { warning: dispatchError.message };
      return {};
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["webhook-deliveries"] });
      if ((result as any)?.warning) {
        toast.warning("Reenfileirado. A entrega sai na próxima rodada do agendador.");
      } else {
        toast.success("Entrega reenfileirada");
      }
    },
    onError: (error: any) => toast.error(error.message ?? "Falha ao reenfileirar"),
  });

  const testEndpoint = useMutation({
    mutationFn: async (endpoint: Endpoint) => {
      const { error } = await supabase.rpc("enqueue_test_webhook", { p_endpoint_id: endpoint.id });
      if (error) throw error;

      // Drena no mesmo instante; o cron é o plano B. O worker ignora o corpo
      // e apenas processa a fila, então o enfileiramento acima é o que importa.
      const { error: dispatchError } = await supabase.functions.invoke("dispatch-webhooks", {
        body: { endpointId: endpoint.id },
      });
      if (dispatchError) return { warning: dispatchError.message };
      return {};
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["webhook-deliveries"] });
      if ((result as any)?.warning) {
        toast.warning("Teste enfileirado. Sai na próxima rodada do agendador.");
      } else {
        toast.success("Teste enviado — veja o resultado na lista de entregas");
      }
    },
    onError: (error: any) => toast.error(error.message ?? "Falha ao enfileirar o teste"),
  });

  const copy = async (value: string, label: string) => {
    await navigator.clipboard.writeText(value);
    toast.success(`${label} copiado`);
  };

  const stats = useMemo(() => {
    const list = deliveries ?? [];
    return {
      total: list.length,
      delivered: list.filter((d) => d.status === "delivered").length,
      pending: list.filter((d) => d.status === "pending").length,
      failed: list.filter((d) => d.status === "failed").length,
    };
  }, [deliveries]);

  return (
    <div className="space-y-6">
      {/* Endpoints */}
      <div className="glass-card p-6 border border-white/10 rounded-[16px]">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
          <div>
            <h3 className="text-[18px] font-bold tracking-tight text-white">Endpoints de saída</h3>
            <p className="text-[13px] text-white/50 mt-1">
              O Flow envia um evento assinado para cada URL quando o pedido muda de estado.
            </p>
          </div>
          <Button onClick={openCreate} className="gradient-primary shadow-glow h-[40px] px-5 rounded-[12px] font-bold text-[13px]">
            <Plus className="w-4 h-4 mr-2" /> Novo endpoint
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => <div key={i} className="h-[76px] animate-pulse bg-white/5 rounded-[12px]" />)}
          </div>
        ) : (endpoints?.length ?? 0) === 0 ? (
          <div className="text-center py-10 border border-dashed border-white/10 rounded-[12px]">
            <ArrowUpRight className="w-8 h-8 text-white/20 mx-auto mb-3" />
            <p className="text-[13px] text-white/60">Nenhum endpoint configurado.</p>
            <p className="text-[12px] text-white/40 mt-1">Crie um para receber eventos em Zapier, n8n ou seu próprio sistema.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {endpoints!.map((endpoint) => (
              <div key={endpoint.id} className="p-4 rounded-[12px] bg-black/30 border border-white/10 hover:border-white/20 transition-all">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-[14px] text-white truncate">{endpoint.name}</span>
                      <Badge variant="outline" className={cn("text-[10px] uppercase tracking-wider font-bold px-2 py-0.5",
                        endpoint.is_active
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          : "bg-white/5 text-white/40 border-white/10")}>
                        {endpoint.is_active ? "Ativo" : "Inativo"}
                      </Badge>
                    </div>
                    <p className="text-[12px] font-mono text-white/50 truncate mt-1">{endpoint.url}</p>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {(endpoint.events ?? []).map((event) => (
                        <span key={event} className="text-[10px] px-2 py-0.5 rounded-[6px] bg-white/5 text-white/60 font-medium">
                          {eventLabel(event)}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button variant="ghost" size="icon" onClick={() => copy(endpoint.url, "URL")} className="h-8 w-8 text-white/50 hover:text-white">
                      <Copy className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => testEndpoint.mutate(endpoint)}
                      disabled={testEndpoint.isPending}
                      title="Envia um payload de teste para esta URL"
                      className="text-[12px] text-white/60 hover:text-white"
                    >
                      {testEndpoint.isPending ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Send className="w-3.5 h-3.5 mr-1.5" />}
                      Testar
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => openEdit(endpoint)} className="text-[12px] text-white/60 hover:text-white">
                      Editar
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => { if (confirm(`Remover "${endpoint.name}"? As entregas pendentes serão descartadas.`)) remove.mutate(endpoint.id); }}
                      className="h-8 w-8 text-white/40 hover:text-red-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Entregas */}
      <div className="glass-card p-6 border border-white/10 rounded-[16px]">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
          <div>
            <h3 className="text-[18px] font-bold tracking-tight text-white">Entregas</h3>
            <p className="text-[13px] text-white/50 mt-1">
              {stats.total} nos últimos 100 · {stats.delivered} entregues · {stats.pending} na fila · {stats.failed} falharam
            </p>
          </div>
          <div className="flex gap-2">
            <select
              value={selectedEndpoint ?? ""}
              onChange={(e) => setSelectedEndpoint(e.target.value || null)}
              className="h-[40px] px-3 rounded-[12px] bg-black/40 border border-white/10 text-[12px] text-white/70"
            >
              <option value="">Todos os endpoints</option>
              {(endpoints ?? []).map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
            <Button
              variant="outline"
              onClick={() => queryClient.invalidateQueries({ queryKey: ["webhook-deliveries"] })}
              className="glass-card border-white/10 h-[40px] px-4 rounded-[12px] text-[12px]"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-2" /> Atualizar
            </Button>
          </div>
        </div>

        {(deliveries?.length ?? 0) === 0 ? (
          <p className="text-[13px] text-white/40 text-center py-8">Nenhuma entrega registrada ainda.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/10">
                  {["Evento", "Status", "Tentativa", "Resposta", "Quando", ""].map((h) => (
                    <th key={h} className="py-2.5 pr-3 text-[10px] uppercase tracking-widest font-bold text-white/40">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {deliveries!.map((delivery) => (
                  <tr key={delivery.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                    <td className="py-3 pr-3 text-[12px] font-medium text-white/80">{eventLabel(delivery.event)}</td>
                    <td className="py-3 pr-3">
                      <Badge variant="outline" className={cn("text-[10px] uppercase tracking-wider font-bold px-2 py-0.5", STATUS_STYLES[delivery.status])}>
                        {delivery.status === "delivered" ? "Entregue" : delivery.status === "pending" ? "Na fila" : "Falhou"}
                      </Badge>
                    </td>
                    <td className="py-3 pr-3 text-[12px] text-white/50">{delivery.attempt}/{delivery.max_attempts}</td>
                    <td className="py-3 pr-3 text-[12px] font-mono text-white/50">
                      {delivery.response_status ?? "—"}
                      {delivery.error && !delivery.response_status ? (
                        <span className="block text-[11px] text-red-400/70 truncate max-w-[220px]" title={delivery.error}>{delivery.error}</span>
                      ) : null}
                    </td>
                    <td className="py-3 pr-3 text-[12px] text-white/40 whitespace-nowrap">
                      {new Date(delivery.created_at).toLocaleString("pt-BR")}
                    </td>
                    <td className="py-3 text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Reenviar"
                        onClick={() => redeliver.mutate(delivery)}
                        disabled={redeliver.isPending}
                        className="h-8 w-8 text-white/40 hover:text-white"
                      >
                        {redeliver.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Dialog de endpoint */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar endpoint" : "Novo endpoint"}</DialogTitle>
            <DialogDescription>
              {editing
                ? "O segredo não muda ao editar. Para rotacioná-lo, remova e crie outro endpoint."
                : "O segredo de assinatura é exibido uma única vez, após salvar."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Ex.: n8n — liberar acesso"
              />
            </div>

            <div className="space-y-2">
              <Label>URL</Label>
              <Input
                value={form.url}
                onChange={(e) => setForm({ ...form, url: e.target.value })}
                placeholder="https://seu-servidor.com/webhooks/flow"
                className="font-mono text-[12px]"
              />
            </div>

            <div className="space-y-2">
              <Label>Token Bearer (opcional)</Label>
              <Input
                value={form.bearer_token}
                onChange={(e) => setForm({ ...form, bearer_token: e.target.value })}
                placeholder="Enviado como Authorization: Bearer …"
                className="font-mono text-[12px]"
              />
              <p className="text-[11px] text-white/40">Além da assinatura HMAC. Deixe vazio para usar só a assinatura.</p>
            </div>

            <div className="space-y-2">
              <Label>Eventos</Label>
              <div className="space-y-1.5">
                {OUTBOUND_EVENTS.map((event, index) => (
                  <div key={event.value}>
                    {OUTBOUND_EVENTS[index - 1]?.group !== event.group && (
                      <p className="text-[10px] uppercase tracking-widest font-bold text-white/30 pt-2 pb-1">
                        {event.group}
                      </p>
                    )}
                    <label className="flex items-start gap-2.5 p-2 rounded-[8px] hover:bg-white/5 cursor-pointer">
                      <Checkbox
                        checked={form.events.includes(event.value)}
                        onCheckedChange={(checked) => setForm({
                          ...form,
                          events: checked
                            ? [...form.events, event.value]
                            : form.events.filter((e) => e !== event.value),
                        })}
                        className="mt-0.5"
                      />
                      <span>
                        <span className="block text-[13px] text-white/90 font-medium">{event.label}</span>
                        <span className="block text-[11px] text-white/40">{event.description}</span>
                      </span>
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <label className="flex items-center gap-2.5 cursor-pointer">
              <Checkbox
                checked={form.is_active}
                onCheckedChange={(checked) => setForm({ ...form, is_active: checked === true })}
              />
              <span className="text-[13px] text-white/70">Ativo</span>
            </label>

            {revealedSecret && (
              <div className="p-3 rounded-[10px] bg-amber-500/10 border border-amber-500/20 space-y-2">
                <p className="text-[12px] font-bold text-amber-400">Segredo de assinatura (copie agora)</p>
                <div className="flex gap-2">
                  <Input readOnly value={revealedSecret} className="font-mono text-[11px] bg-black/40 border-white/10" />
                  <Button variant="outline" size="icon" onClick={() => copy(revealedSecret, "Segredo")} className="shrink-0 h-9 w-9">
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-[11px] text-amber-400/70">
                  Valide com <code className="font-mono">X-Flow-Signature: t=&lt;unix&gt;,v1=HMAC_SHA256(secret, `${"{t}"}.${"{body}"}`)</code>.
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            {revealedSecret ? (
              <Button onClick={() => { setDialogOpen(false); resetForm(); }} className="gradient-primary">
                <Send className="w-4 h-4 mr-2" /> Entendi
              </Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>Cancelar</Button>
                <Button onClick={() => save.mutate()} disabled={save.isPending} className="gradient-primary">
                  {save.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  {editing ? "Salvar" : "Criar endpoint"}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
