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
  CheckCircle2, XCircle, Send, Loader2, User, TrendingUp, Eye, Settings2, Plus, Trash2,
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

/** Textos por estágio. Vazio = texto padrão da edge `cart-recovery`. */
type StageTemplate = { subject?: string; body?: string };
type CartTemplates = {
  email?: StageTemplate[];
  whatsapp?: StageTemplate[];
  sms?: StageTemplate[];
};

interface CartRecoverySettings {
  enabled: boolean;
  stage_minutes: number[];
  channel_email: boolean;
  channel_whatsapp: boolean;
  channel_sms: boolean;
  templates: CartTemplates | null;
}

/**
 * Textos padrão por canal — espelham `stageMessage`/`stageSubject`/
 * `smsStageDefault` da edge `cart-recovery`. O WhatsApp usa `*negrito*`; o
 * e-mail sai sem os asteriscos, por isso são textos separados.
 */
const STAGE_DEFAULTS = [
  {
    subject: "Você esqueceu algo em {produto}",
    whatsapp: "Oi, {nome}! Vi que você começou a comprar *{produto}* ({preco}) e não terminou.\n\nSeu checkout continua aberto:\n{link}\n\nSe ficou alguma dúvida, é só responder aqui.",
    email: "Oi, {nome}! Vi que você começou a comprar {produto} ({preco}) e não terminou.\n\nSeu checkout continua aberto:\n{link}\n\nSe ficou alguma dúvida, é só responder aqui.",
    sms: "Retome {produto}: {link}",
  },
  {
    subject: "Seu acesso a {produto} está reservado",
    whatsapp: "Seu acesso a *{produto}* ainda está esperando por você.\n\nFinalize em 1 minuto:\n{link}",
    email: "Seu acesso a {produto} ainda está esperando por você.\n\nFinalize em 1 minuto:\n{link}",
    sms: "Ainda dá tempo: {link}",
  },
  {
    subject: "Última chance: {produto}",
    whatsapp: "Última mensagem sobre *{produto}* — depois dessa não volto a insistir.\n\n{link}",
    email: "Última mensagem sobre {produto} — depois dessa não volto a insistir.\n\n{link}",
    sms: "Último lembrete {produto}: {link}",
  },
];

const SMS_MAX = 160;

function humanMinutes(m: number) {
  return m >= 1440 ? `${Math.round(m / 1440)}d` : m >= 60 ? `${Math.round(m / 60)}h` : `${m}min`;
}

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
  const [manualChannel, setManualChannel] = useState<"whatsapp" | "email" | "sms">("whatsapp");
  const [manualText, setManualText] = useState("");
  const [manualSubject, setManualSubject] = useState("");
  const [sending, setSending] = useState(false);
  const [sweeping, setSweeping] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);
  const [draftMinutes, setDraftMinutes] = useState<number[]>([10, 300, 1440]);
  const [draftTemplates, setDraftTemplates] = useState<CartTemplates>({});
  const [savingConfig, setSavingConfig] = useState(false);
  const [templateChannel, setTemplateChannel] = useState<keyof CartTemplates>("email");

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
    channel_sms: boolean;
  }>) => {
    const { error } = await supabase.from("cart_recovery_settings").update(patch).eq("id", true);
    if (error) {
      toast.error("Não foi possível salvar a configuração.");
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["cart-recovery-settings"] });
  };

  const cfg = settings as CartRecoverySettings | null | undefined;

  const openConfig = () => {
    const base = cfg?.stage_minutes?.length ? cfg.stage_minutes : [10, 300, 1440];
    setDraftMinutes(base.slice(0, 6));
    setDraftTemplates(cfg?.templates ?? {});
    setConfigOpen(true);
  };

  const addStage = () => {
    if (draftMinutes.length >= 6) {
      toast.error("Máximo de 6 contatos.");
      return;
    }
    const last = draftMinutes[draftMinutes.length - 1] ?? 60;
    setDraftMinutes([...draftMinutes, last * 2]);
  };

  const removeStage = (index: number) => {
    if (draftMinutes.length <= 1) {
      toast.error("O funil precisa de pelo menos 1 contato.");
      return;
    }
    setDraftMinutes(draftMinutes.filter((_, i) => i !== index));
    // Remove o texto do estágio excluído para não deslocar os seguintes.
    setDraftTemplates((prev) => Object.fromEntries(
      Object.entries(prev).map(([channel, stages]) => [
        channel,
        (stages ?? []).filter((_, i) => i !== index),
      ]),
    ));
  };

  const saveConfig = async () => {
    const minutes = draftMinutes.map((m) => Math.max(1, Math.round(Number(m) || 1)));
    // Só grava o que foi escrito: estágio em branco continua usando o padrão
    // da edge, então apagar um texto nunca deixa o lead sem mensagem.
    const clean = Object.fromEntries(
      Object.entries(draftTemplates)
        .map(([channel, stages]) => [
          channel,
          (stages ?? []).map((s) => ({
            ...(s.subject?.trim() ? { subject: s.subject.trim() } : {}),
            ...(s.body?.trim() ? { body: s.body.trim() } : {}),
          })),
        ])
        .filter(([, stages]) => (stages as unknown[]).some((s) => Object.keys(s as object).length > 0)),
    );

    setSavingConfig(true);
    const { error } = await supabase
      .from("cart_recovery_settings")
      .update({ stage_minutes: minutes, templates: clean })
      .eq("id", true);
    setSavingConfig(false);

    if (error) {
      toast.error("Não foi possível salvar o funil.");
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["cart-recovery-settings"] });
    toast.success("Funil atualizado.");
    setConfigOpen(false);
  };

  const setStageField = (
    channel: keyof CartTemplates,
    index: number,
    field: "subject" | "body",
    value: string,
  ) => {
    setDraftTemplates((prev) => {
      const stages = [...(prev[channel] ?? [])];
      stages[index] = { ...(stages[index] ?? {}), [field]: value };
      return { ...prev, [channel]: stages };
    });
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
      toast.success(
        manualChannel === "email"
          ? "E-mail enfileirado."
          : manualChannel === "sms"
            ? "SMS enviado."
            : "Mensagem enviada no WhatsApp.",
      );
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
                {(cfg?.stage_minutes ?? [10, 300, 1440]).length} contatos por lead:{" "}
                {(cfg?.stage_minutes ?? [10, 300, 1440]).map(humanMinutes).join(" · ")}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-5">
            <div className="flex items-center gap-2">
              <Switch
                checked={!!cfg?.enabled}
                onCheckedChange={(v) => saveSettings({ enabled: v })}
                id="recovery-enabled"
              />
              <Label htmlFor="recovery-enabled" className="text-[13px] font-bold text-white/80">
                Funil ativo
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={cfg?.channel_email !== false}
                onCheckedChange={(v) => saveSettings({ channel_email: v })}
                id="recovery-email"
              />
              <Label htmlFor="recovery-email" className="text-[13px] text-white/70">E-mail</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={cfg?.channel_whatsapp === true}
                onCheckedChange={(v) => saveSettings({ channel_whatsapp: v })}
                id="recovery-whatsapp"
              />
              <Label htmlFor="recovery-whatsapp" className="text-[13px] text-white/70">WhatsApp</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={cfg?.channel_sms === true}
                onCheckedChange={(v) => saveSettings({ channel_sms: v })}
                id="recovery-sms"
              />
              <Label htmlFor="recovery-sms" className="text-[13px] text-white/70">SMS</Label>
            </div>
            <Button
              variant="ghost"
              onClick={openConfig}
              className="bg-white/5 border border-white/10 hover:bg-white/10 text-white/80 h-9 rounded-[10px] px-4 text-[12px] font-bold"
            >
              <Settings2 className="w-3.5 h-3.5 mr-2" />
              Editar funil
            </Button>
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

      <Dialog open={configOpen} onOpenChange={setConfigOpen}>
        <DialogContent className="glass-card border-white/10 rounded-[20px] max-w-2xl bg-black/90 backdrop-blur-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white text-lg font-bold flex items-center gap-2">
              <Settings2 className="w-5 h-5 text-primary" />
              Funil de recuperação
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-[13px]">
              Intervalo e texto de cada contato. Deixe o texto vazio para usar o padrão.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-[13px] font-bold text-white/80">Intervalo entre contatos (minutos)</Label>
                <Button
                  variant="ghost"
                  onClick={addStage}
                  disabled={draftMinutes.length >= 6}
                  className="h-8 px-3 rounded-[8px] text-[12px] font-bold bg-white/5 border border-white/10 hover:bg-white/10 text-white/80"
                >
                  <Plus className="w-3.5 h-3.5 mr-1.5" />
                  Contato
                </Button>
              </div>
              <div className="flex gap-2">
                {draftMinutes.map((value, i) => (
                  <div key={i} className="flex-1 space-y-1">
                    <Input
                      type="number"
                      min={1}
                      value={value}
                      onChange={(e) => {
                        const next = [...draftMinutes];
                        next[i] = Number(e.target.value);
                        setDraftMinutes(next);
                      }}
                      className="bg-black/40 border-white/10 text-white h-[42px] rounded-[10px]"
                    />
                    <p className="text-[11px] text-muted-foreground text-center">{humanMinutes(value || 0)}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-1 bg-white/5 rounded-lg p-0.5 w-fit">
              {(["email", "whatsapp", "sms"] as const).map((ch) => (
                <button
                  key={ch}
                  onClick={() => setTemplateChannel(ch)}
                  className={cn(
                    "px-3 py-1.5 rounded-md text-[12px] font-bold transition-all",
                    templateChannel === ch ? "bg-white/10 text-white" : "text-white/50 hover:text-white/80",
                  )}
                >
                  {ch === "email" ? "E-mail" : ch === "whatsapp" ? "WhatsApp" : "SMS"}
                </button>
              ))}
            </div>

            {templateChannel !== "email" && (
              <p className="text-[12px] text-muted-foreground">
                Variáveis: <code className="text-white/70">{"{nome}"}</code>{" "}
                <code className="text-white/70">{"{produto}"}</code>{" "}
                <code className="text-white/70">{"{preco}"}</code>{" "}
                <code className="text-white/70">{"{link}"}</code>
                {templateChannel === "sms" && " · limite de 160 caracteres por SMS · depende da integração IntegraX ativa"}
              </p>
            )}

            <div className="space-y-4">
              {draftMinutes.map((_, i) => {
                const stage = draftTemplates[templateChannel]?.[i];
                const body = stage?.body ?? "";
                // Acima do 3º contato a edge repete o último texto padrão.
                const defaults = STAGE_DEFAULTS[Math.min(i, STAGE_DEFAULTS.length - 1)];
                const fallback = templateChannel === "sms"
                  ? defaults?.sms
                  : templateChannel === "whatsapp"
                    ? defaults?.whatsapp
                    : defaults?.email;
                return (
                  <div key={i} className="rounded-xl border border-white/5 bg-white/[0.02] p-4 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                        {i + 1}º contato · após {humanMinutes(draftMinutes[i] || 0)}
                      </p>
                      <button
                        onClick={() => removeStage(i)}
                        title="Remover contato"
                        className="text-white/30 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {templateChannel === "email" && (
                      <Input
                        value={stage?.subject ?? ""}
                        onChange={(e) => setStageField("email", i, "subject", e.target.value)}
                        placeholder={STAGE_DEFAULTS[i]?.subject}
                        className="bg-black/40 border-white/10 text-white h-[42px] rounded-[10px]"
                      />
                    )}
                    <Textarea
                      value={body}
                      onChange={(e) => setStageField(templateChannel, i, "body", e.target.value)}
                      placeholder={fallback}
                      className="bg-black/40 border-white/10 text-white rounded-[10px] min-h-[90px] text-[13px]"
                    />
                    {templateChannel === "sms" && (
                      <p className={cn("text-[11px]", body.length > SMS_MAX ? "text-red-400" : "text-muted-foreground")}>
                        {body.length}/{SMS_MAX}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setConfigOpen(false)} className="text-white/60 hover:text-white">
              Cancelar
            </Button>
            <Button
              onClick={saveConfig}
              disabled={savingConfig}
              className="bg-primary text-black font-bold rounded-[10px]"
            >
              {savingConfig && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Salvar funil
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
                  {(["whatsapp", "email", "sms"] as const).map((ch) => (
                    <button
                      key={ch}
                      onClick={() => setManualChannel(ch)}
                      className={cn(
                        "px-3 py-1.5 rounded-md text-[12px] font-bold transition-all",
                        manualChannel === ch ? "bg-white/10 text-white" : "text-white/50 hover:text-white/80",
                      )}
                    >
                      {ch === "whatsapp" ? "WhatsApp" : ch === "email" ? "E-mail" : "SMS"}
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
                    : manualChannel === "sms"
                      ? "SMS (vazio usa o texto padrão do 1º contato) · máx. 160 caracteres"
                      : "Corpo do e-mail (vazio usa o texto padrão de recuperação)"
                }
                className="bg-black/40 border-white/10 text-white rounded-[10px] min-h-[110px] text-[13px]"
              />
              {manualChannel === "sms" && manualText.length > SMS_MAX && (
                <p className="text-[12px] text-red-400">
                  {manualText.length}/{SMS_MAX} — a IntegraX recusa acima do limite.
                </p>
              )}
              {manualChannel !== "email" && !selected?.phone && (
                <p className="text-[12px] text-amber-400">
                  Este lead não tem telefone — use e-mail.
                </p>
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
              disabled={sending || (manualChannel !== "email" && !selected?.phone)}
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
