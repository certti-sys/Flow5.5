import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  ShoppingCart, RefreshCw, Mail, MessageCircle, Package, Clock,
  CheckCircle2, XCircle, Send, Loader2, User, TrendingUp, Eye,
} from "lucide-react";
import { cn } from "@/lib/utils";

type LeadStatus = "open" | "recovered" | "dismissed" | "expired";

interface Lead {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  cpf: string | null;
  product_id: string | null;
  status: LeadStatus;
  stage: number;
  stage_started_at: string;
  abandoned_at: string | null;
  recovered_at: string | null;
  last_activity_at: string;
  created_at: string;
  metadata: Record<string, any> | null;
  products?: { name: string | null; price: number | null; checkout_slug: string | null } | null;
  orders?: { id: string }[];
}

const STAGE_LABELS = ["aguardando", "1º contato", "2º contato", "3º contato"];

function money(cents: number | null | undefined) {
  return `R$${((cents ?? 0) / 100).toFixed(2).replace(".", ",")}`;
}

function statusBadge(status: LeadStatus) {
  const map = {
    open: { label: "Aberto", cls: "bg-amber-500/10 text-amber-400 border-amber-500/20", Icon: Clock },
    recovered: { label: "Recuperado", cls: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", Icon: CheckCircle2 },
    dismissed: { label: "Descartado", cls: "bg-white/5 text-white/60 border-white/10", Icon: XCircle },
    expired: { label: "Encerrado", cls: "bg-white/5 text-white/50 border-white/10", Icon: XCircle },
  }[status];
  const { Icon } = map;
  return (
    <Badge variant="outline" className={cn("gap-1 text-[11px] font-bold uppercase tracking-wider", map.cls)}>
      <Icon className="h-3 w-3" /> {map.label}
    </Badge>
  );
}

export default function AbandonedCarts() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<"open" | "recovered" | "all">("open");
  const [selected, setSelected] = useState<Lead | null>(null);
  const [manualChannel, setManualChannel] = useState<"whatsapp" | "email">("whatsapp");
  const [manualText, setManualText] = useState("");
  const [manualSubject, setManualSubject] = useState("");
  const [sending, setSending] = useState(false);
  const [sweeping, setSweeping] = useState(false);

  const { data: settings } = useQuery({
    queryKey: ["cart-recovery-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cart_recovery_settings")
        .select("*")
        .eq("id", true)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: leads, refetch, isLoading, isFetching } = useQuery({
    queryKey: ["cart-leads", filter],
    queryFn: async () => {
      let query = supabase
        .from("cart_leads")
        .select("*, products:product_id(name, price, checkout_slug)")
        .order("created_at", { ascending: false })
        .limit(200);

      if (filter !== "all") query = query.eq("status", filter);

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as Lead[];
    },
  });

  const stats = useMemo(() => {
    const all = leads ?? [];
    const open = all.filter((l) => l.status === "open");
    const recovered = all.filter((l) => l.status === "recovered");
    const potential = open.reduce((sum, l) => sum + (l.products?.price ?? 0), 0);
    const recoveredValue = recovered.reduce((sum, l) => sum + (l.products?.price ?? 0), 0);
    const total = all.length;
    return {
      open: open.length,
      recovered: recovered.length,
      potential,
      recoveredValue,
      rate: total > 0 ? Math.round((recovered.length / total) * 100) : 0,
      withPhone: open.filter((l) => l.phone).length,
    };
  }, [leads]);

  const saveSettings = async (patch: Partial<{
    enabled: boolean;
    channel_email: boolean;
    channel_whatsapp: boolean;
    discount_percent: number;
  }>) => {
    const { error } = await supabase.from("cart_recovery_settings").update(patch).eq("id", true);
    if (error) {
      toast.error("Não foi possível salvar a configuração.");
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["cart-recovery-settings"] });
  };

  const runSweep = async () => {
    setSweeping(true);
    try {
      const { data, error } = await supabase.functions.invoke("cart-recovery", {
        body: { action: "sweep" },
      });
      if (error) throw error;
      toast.success(
        `Funil processado: ${data?.abandoned ?? 0} novo(s) abandono(s), ${data?.sent ?? 0} mensagem(ns).`,
      );
      refetch();
    } catch (error: any) {
      toast.error(error?.message || "Falha ao processar o funil.");
    } finally {
      setSweeping(false);
    }
  };

  const sendManual = async () => {
    if (!selected) return;
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("cart-recovery", {
        body: {
          action: "manual",
          leadId: selected.id,
          channel: manualChannel,
          message: manualText.trim() || undefined,
          subject: manualChannel === "email" ? manualSubject.trim() || undefined : undefined,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(manualChannel === "email" ? "E-mail enfileirado." : "Mensagem enviada no WhatsApp.");
      setSelected(null);
      setManualText("");
      setManualSubject("");
      refetch();
    } catch (error: any) {
      toast.error(error?.message || "Falha no envio.");
    } finally {
      setSending(false);
    }
  };

  const waLink = (phone: string, lead: Lead) =>
    `https://wa.me/${phone.replace(/\D/g, "").replace(/^(?!55)/, "55")}?text=${encodeURIComponent(
      `Oi${lead.name ? `, ${lead.name}` : ""}! Vi que você quase garantiu ${lead.products?.name ?? "seu curso"}. Ficou alguma dúvida?`,
    )}`;

  return (
    <div className="space-y-6 pb-20">
      <AdminHeader
        title="Carrinho Abandonado"
        description="Quem preencheu o checkout e não pagou. Recupere por WhatsApp, e-mail ou deixe o funil automático cuidar."
        actionButton={
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              onClick={runSweep}
              disabled={sweeping}
              className="bg-white/5 border border-white/5 hover:bg-white/10 text-white/80 h-[44px] rounded-[12px] px-5 font-bold text-[13px]"
            >
              {sweeping ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
              Processar agora
            </Button>
            <Button
              variant="ghost"
              onClick={() => refetch()}
              className="bg-white/5 border border-white/5 hover:bg-white/10 text-white/80 h-[44px] w-[44px] rounded-[12px]"
            >
              <RefreshCw className={cn("w-4 h-4", isFetching && "animate-spin")} />
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card rounded-[20px] border-white/10 p-5 bg-white/[0.01]">
          <p className="text-[12px] font-bold uppercase tracking-widest text-muted-foreground">Em aberto</p>
          <p className="text-2xl font-black text-white mt-1">{stats.open}</p>
          <p className="text-xs text-muted-foreground mt-1">{stats.withPhone} com telefone</p>
        </div>
        <div className="glass-card rounded-[20px] border-white/10 p-5 bg-emerald-500/5 border-emerald-500/20">
          <p className="text-[12px] font-bold uppercase tracking-widest text-emerald-400">Recuperados</p>
          <p className="text-2xl font-black text-white mt-1">{stats.recovered}</p>
          <p className="text-xs text-muted-foreground mt-1">{money(stats.recoveredValue)} salvos</p>
        </div>
        <div className="glass-card rounded-[20px] border-white/10 p-5 bg-white/[0.01]">
          <p className="text-[12px] font-bold uppercase tracking-widest text-muted-foreground">Valor em risco</p>
          <p className="text-2xl font-black text-white mt-1">{money(stats.potential)}</p>
          <p className="text-xs text-muted-foreground mt-1">soma dos abertos</p>
        </div>
        <div className="glass-card rounded-[20px] border-white/10 p-5 bg-white/[0.01]">
          <p className="text-[12px] font-bold uppercase tracking-widest text-muted-foreground">Taxa de recuperação</p>
          <p className="text-2xl font-black text-white mt-1">{stats.rate}%</p>
          <p className="text-xs text-muted-foreground mt-1">dos leads recuperados</p>
        </div>
      </div>

      <div className="glass-card rounded-[20px] border-white/10 p-5 bg-white/[0.01]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20">
              <TrendingUp className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-bold text-white text-sm">Recuperação automática</p>
              <p className="text-xs text-muted-foreground">
                3 contatos por lead:{" "}
                {(settings?.stage_minutes ?? [10, 300, 1440])
                  .map((m: number) => (m >= 1440 ? `${Math.round(m / 1440)}d` : m >= 60 ? `${Math.round(m / 60)}h` : `${m}min`))
                  .join(" · ")}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-5">
            <div className="flex items-center gap-2">
              <Switch
                checked={!!settings?.enabled}
                onCheckedChange={(v) => saveSettings({ enabled: v })}
                id="recovery-enabled"
              />
              <Label htmlFor="recovery-enabled" className="text-[13px] font-bold text-white/80">
                Funil ativo
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={settings?.channel_email !== false}
                onCheckedChange={(v) => saveSettings({ channel_email: v })}
                id="recovery-email"
              />
              <Label htmlFor="recovery-email" className="text-[13px] text-white/70">E-mail</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={settings?.channel_whatsapp === true}
                onCheckedChange={(v) => saveSettings({ channel_whatsapp: v })}
                id="recovery-whatsapp"
              />
              <Label htmlFor="recovery-whatsapp" className="text-[13px] text-white/70">WhatsApp</Label>
            </div>
          </div>
        </div>
      </div>

      <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
        <TabsList className="bg-white/5 border border-white/5 p-1 rounded-[12px]">
          <TabsTrigger value="open" className="data-[state=active]:bg-white/10 rounded-[9px] text-[12px] font-bold uppercase tracking-widest">
            Em aberto
          </TabsTrigger>
          <TabsTrigger value="recovered" className="data-[state=active]:bg-white/10 rounded-[9px] text-[12px] font-bold uppercase tracking-widest">
            Recuperados
          </TabsTrigger>
          <TabsTrigger value="all" className="data-[state=active]:bg-white/10 rounded-[9px] text-[12px] font-bold uppercase tracking-widest">
            Todos
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="glass-card rounded-[20px] border-white/10 overflow-hidden bg-white/[0.01]">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-white/[0.03] border-b border-white/5 text-muted-foreground text-[12px] font-bold uppercase tracking-[0.1em]">
                <th className="px-6 py-4 text-left">Cliente</th>
                <th className="px-6 py-4 text-left">Produto</th>
                <th className="px-6 py-4 text-center">Funil</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-right">Abandonou</th>
                <th className="px-6 py-4 text-right">Contato</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {isLoading ? (
                Array(4).fill(0).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={6} className="px-6 py-8"><div className="h-4 bg-white/5 rounded w-full" /></td>
                  </tr>
                ))
              ) : leads && leads.length > 0 ? (
                leads.map((lead) => (
                  <motion.tr
                    key={lead.id}
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="hover:bg-white/[0.03] transition-all group/row border-l-2 border-l-transparent hover:border-l-primary/40 cursor-pointer"
                    onClick={() => { setSelected(lead); setManualText(""); setManualSubject(""); }}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-xl bg-primary/15 border border-white/10 flex items-center justify-center text-[12px] font-bold uppercase text-white/80">
                          {(lead.name || lead.email).slice(0, 2)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-[14px] text-white/90 leading-tight truncate">
                            {lead.name || "Sem nome"}
                          </p>
                          <p className="text-[12px] text-muted-foreground truncate">{lead.email}</p>
                          {lead.phone && (
                            <p className="text-[11px] text-muted-foreground/70">{lead.phone}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-[13px] text-white/80 font-semibold flex items-center gap-1.5">
                        <Package className="w-3.5 h-3.5 text-muted-foreground" />
                        {lead.products?.name ?? "—"}
                      </p>
                      <p className="text-[12px] text-muted-foreground mt-0.5">{money(lead.products?.price)}</p>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <Badge variant="outline" className="text-[11px] font-bold uppercase tracking-wider bg-white/5 border-white/10 text-white/70">
                        {STAGE_LABELS[lead.stage] ?? `estágio ${lead.stage}`}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-center">{statusBadge(lead.status)}</td>
                    <td className="px-6 py-4 text-right text-[12px] text-muted-foreground">
                      {format(new Date(lead.abandoned_at ?? lead.created_at), "dd/MM HH:mm", { locale: ptBR })}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                        {lead.phone && (
                          <a
                            href={waLink(lead.phone, lead)}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Chamar no WhatsApp"
                            className="w-9 h-9 rounded-xl flex items-center justify-center bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all"
                          >
                            <MessageCircle className="w-4 h-4" />
                          </a>
                        )}
                        <button
                          title="Enviar e-mail"
                          onClick={() => {
                            setSelected(lead);
                            setManualChannel("email");
                            setManualText("");
                            setManualSubject("");
                          }}
                          className="w-9 h-9 rounded-xl flex items-center justify-center bg-white/5 text-white/70 border border-white/10 hover:bg-white/10 transition-all"
                        >
                          <Mail className="w-4 h-4" />
                        </button>
                        <button
                          title="Ver detalhes"
                          onClick={() => setSelected(lead)}
                          className="w-9 h-9 rounded-xl flex items-center justify-center bg-white/5 text-white/70 border border-white/10 hover:bg-white/10 transition-all"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center">
                    <ShoppingCart className="w-8 h-8 text-white/15 mx-auto mb-3" />
                    <p className="text-white/70 font-bold text-sm">Nenhum carrinho nesta visão</p>
                    <p className="text-muted-foreground text-[13px] mt-1 max-w-[380px] mx-auto">
                      Assim que alguém preencher o formulário de checkout e não pagar, o lead aparece aqui.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="glass-card border-white/10 rounded-[20px] max-w-2xl bg-black/90 backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle className="text-white text-lg font-bold flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              {selected?.name || "Lead sem nome"}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-[13px]">
              {selected?.email}
              {selected?.phone ? ` · ${selected.phone}` : " · sem telefone"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
                <p className="text-[11px] uppercase tracking-widest text-muted-foreground font-bold">Produto</p>
                <p className="text-white text-sm font-semibold mt-1">{selected?.products?.name ?? "—"}</p>
                <p className="text-muted-foreground text-[12px]">{money(selected?.products?.price)}</p>
              </div>
              <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
                <p className="text-[11px] uppercase tracking-widest text-muted-foreground font-bold">Status</p>
                <div className="mt-1.5">{selected && statusBadge(selected.status)}</div>
                <p className="text-muted-foreground text-[12px] mt-1">
                  {STAGE_LABELS[selected?.stage ?? 0] ?? `estágio ${selected?.stage}`}
                </p>
              </div>
            </div>

            {selected?.metadata?.tracking && Object.keys(selected.metadata.tracking).length > 0 && (
              <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
                <p className="text-[11px] uppercase tracking-widest text-muted-foreground font-bold mb-2">Origem</p>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(selected.metadata.tracking as Record<string, string>).map(([k, v]) => (
                    <Badge key={k} variant="outline" className="text-[11px] bg-white/5 border-white/10 text-white/60">
                      {k}: {v}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-[13px] font-bold text-white/80">Enviar mensagem</Label>
                <div className="flex items-center gap-1 bg-white/5 rounded-lg p-0.5">
                  {(["whatsapp", "email"] as const).map((ch) => (
                    <button
                      key={ch}
                      onClick={() => setManualChannel(ch)}
                      className={cn(
                        "px-3 py-1.5 rounded-md text-[12px] font-bold transition-all",
                        manualChannel === ch ? "bg-white/10 text-white" : "text-white/50 hover:text-white/80",
                      )}
                    >
                      {ch === "whatsapp" ? "WhatsApp" : "E-mail"}
                    </button>
                  ))}
                </div>
              </div>
              {manualChannel === "email" && (
                <Input
                  value={manualSubject}
                  onChange={(e) => setManualSubject(e.target.value)}
                  placeholder="Assunto (opcional)"
                  className="bg-black/40 border-white/10 text-white h-[42px] rounded-[10px]"
                />
              )}
              <Textarea
                value={manualText}
                onChange={(e) => setManualText(e.target.value)}
                placeholder={
                  manualChannel === "whatsapp"
                    ? "Mensagem do WhatsApp (vazio usa o texto padrão de recuperação)"
                    : "Corpo do e-mail (vazio usa o texto padrão de recuperação)"
                }
                className="bg-black/40 border-white/10 text-white rounded-[10px] min-h-[110px] text-[13px]"
              />
              {manualChannel === "whatsapp" && !selected?.phone && (
                <p className="text-[12px] text-amber-400">Este lead não tem telefone — use e-mail.</p>
              )}
              {manualChannel === "whatsapp" && selected?.phone && (
                <a
                  href={waLink(selected.phone, selected)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[12px] text-emerald-400 hover:underline inline-flex items-center gap-1"
                >
                  <MessageCircle className="w-3 h-3" /> Abrir conversa manualmente no WhatsApp
                </a>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="ghost"
              onClick={() => setSelected(null)}
              className="text-white/60 hover:text-white"
            >
              Fechar
            </Button>
            <Button
              onClick={sendManual}
              disabled={sending || (manualChannel === "whatsapp" && !selected?.phone)}
              className="bg-primary text-black font-bold rounded-[10px]"
            >
              {sending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
              Enviar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
