import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  Mail, Plus, Send, Pause, Play, XCircle, Trash2, Users, Loader2, Eye, RefreshCw, AlertTriangle, Copy,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type CampaignStatus = "draft" | "sending" | "paused" | "sent" | "cancelled";

interface Campaign {
  id: string;
  name: string;
  subject: string;
  body_html: string;
  filter_config: { all_customers?: boolean; product_ids?: string[]; course_ids?: string[] } | null;
  status: CampaignStatus;
  total_recipients: number;
  sent_count: number;
  failed_count: number;
  scheduled_at: string | null;
  sent_at: string | null;
  last_error: string | null;
  created_at: string;
}

const STATUS = {
  draft: { label: "Rascunho", cls: "bg-white/5 text-white/60 border-white/10" },
  sending: { label: "Enviando", cls: "bg-primary/10 text-primary border-primary/20" },
  paused: { label: "Pausada", cls: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  sent: { label: "Enviada", cls: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  cancelled: { label: "Cancelada", cls: "bg-white/5 text-white/40 border-white/10" },
} as const;

const EMPTY = {
  id: "",
  name: "",
  subject: "",
  body_html: "",
  all: false,
  productIds: [] as string[],
  courseIds: [] as string[],
};

export default function EmailCampaigns() {
  const queryClient = useQueryClient();
  const [editor, setEditor] = useState<typeof EMPTY | null>(null);
  const [preview, setPreview] = useState<Campaign | null>(null);
  const [livePreview, setLivePreview] = useState<string>("");
  const [testEmail, setTestEmail] = useState("");
  const [audience, setAudience] = useState<number | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const { data: campaigns, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["email-campaigns"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_campaigns")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Campaign[];
    },
    refetchInterval: (q) =>
      (q.state.data ?? []).some((c) => c.status === "sending" || c.status === "paused") ? 5000 : false,
  });

  const { data: products } = useQuery({
    queryKey: ["campaign-products"],
    queryFn: async () => {
      const { data } = await supabase.from("products").select("id, name").eq("active", true).order("name");
      return data ?? [];
    },
  });

  const { data: courses } = useQuery({
    queryKey: ["campaign-courses"],
    queryFn: async () => {
      const { data } = await supabase.from("courses").select("id, title").order("title");
      return data ?? [];
    },
  });

  // Aberturas e cliques por campanha. Sem isto a tabela mostraria só o enviado.
  const { data: engagement } = useQuery({
    queryKey: ["campaign-engagement"],
    queryFn: async () => {
      const { data } = await supabase
        .from("email_campaign_sends")
        .select("campaign_id, opened_at, clicked_at")
        .or("opened_at.not.is.null,clicked_at.not.is.null")
        .limit(20000);
      const map: Record<string, { opens: number; clicks: number }> = {};
      for (const row of (data ?? []) as Array<{ campaign_id: string; opened_at: string | null; clicked_at: string | null }>) {
        const item = map[row.campaign_id] ?? { opens: 0, clicks: 0 };
        if (row.opened_at) item.opens++;
        if (row.clicked_at) item.clicks++;
        map[row.campaign_id] = item;
      }
      return map;
    },
  });

  const filterConfig = useMemo(() => {
    if (!editor) return {};
    return {
      all_customers: editor.all,
      product_ids: editor.productIds,
      course_ids: editor.courseIds,
    };
  }, [editor]);

  // Contagem vem do banco: montar a lista no cliente daria número diferente do
  // que a edge usa no envio.
  useEffect(() => {
    if (!editor) return;
    let alive = true;
    setAudience(null);
    const timer = window.setTimeout(async () => {
      const { data, error } = await supabase.rpc("campaign_recipient_count", { p_filter: filterConfig });
      if (alive) setAudience(error ? null : (data ?? 0));
    }, 400);
    return () => {
      alive = false;
      window.clearTimeout(timer);
    };
  }, [editor?.id, editor?.all, editor?.productIds, editor?.courseIds, filterConfig]);

  // Preview fiel: chama a edge que usa a mesma funcao withCampaignTracking do envio.
  useEffect(() => {
    if (!editor) { setLivePreview(""); return; }
    let alive = true;
    const timer = window.setTimeout(async () => {
      const { data } = await supabase.functions.invoke("preview-campaign", {
        body: { html: editor.body_html },
      });
      if (alive && typeof data?.html === "string") setLivePreview(data.html);
    }, 350);
    return () => { alive = false; window.clearTimeout(timer); };
  }, [editor?.body_html]);

  const openNew = () => {
    setEditor({ ...EMPTY });
    setTestEmail("");
  };

  const openEdit = (c: Campaign) => {
    setEditor({
      id: c.id,
      name: c.name,
      subject: c.subject,
      body_html: c.body_html,
      all: !!c.filter_config?.all_customers,
      productIds: c.filter_config?.product_ids ?? [],
      courseIds: c.filter_config?.course_ids ?? [],
    });
    setTestEmail("");
  };

  const duplicateAsDraft = async (c: Campaign) => {
    setBusy("duplicate");
    try {
      const { error } = await supabase.from("email_campaigns").insert({
        name: `${c.name} (cópia)`,
        subject: c.subject,
        body_html: c.body_html,
        filter_config: c.filter_config,
        status: "draft",
      });
      if (error) throw error;
      toast.success("Cópia criada como rascunho. Você pode editar livremente.");
      queryClient.invalidateQueries({ queryKey: ["email-campaigns"] });
    } catch (error: any) {
      toast.error(error?.message || "Falha ao duplicar.");
    } finally {
      setBusy(null);
    }
  };

  const save = async () => {
    if (!editor) return;
    if (!editor.name.trim() || !editor.subject.trim()) {
      toast.error("Nome e assunto são obrigatórios.");
      return;
    }
    if (!editor.all && editor.productIds.length === 0 && editor.courseIds.length === 0) {
      toast.error("Escolha o segmento: todos, produtos ou cursos.");
      return;
    }

    const payload = {
      name: editor.name.trim(),
      subject: editor.subject.trim(),
      body_html: editor.body_html,
      filter_config: filterConfig,
    };

    setBusy("save");
    try {
      const { error } = editor.id
        ? await supabase.from("email_campaigns").update(payload).eq("id", editor.id).select().single()
        : await supabase.from("email_campaigns").insert({ ...payload, status: "draft" }).select().single();
      if (error) throw error;
      toast.success(editor.id ? "Campanha atualizada." : "Campanha criada.");
      setEditor(null);
      queryClient.invalidateQueries({ queryKey: ["email-campaigns"] });
    } catch (error: any) {
      toast.error(error?.message || "Falha ao salvar.");
    } finally {
      setBusy(null);
    }
  };

  const invoke = async (label: string, body: Record<string, unknown>) => {
    setBusy(label);
    try {
      const { data, error } = await supabase.functions.invoke("send-campaign", { body });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    } catch (error: any) {
      toast.error(error?.message || "Falha na operação.");
      return null;
    } finally {
      setBusy(null);
      queryClient.invalidateQueries({ queryKey: ["email-campaigns"] });
    }
  };

  const send = async (c: Campaign) => {
    const out = await invoke("send", { action: "prepare", campaignId: c.id });
    if (out) toast.success(`Enviando para ${out.recipients} destinatário(s). O cron entrega 30 por minuto.`);
  };

  const sendTest = async (c: Campaign) => {
    if (!testEmail.trim()) {
      toast.error("Informe o e-mail de teste.");
      return;
    }
    const out = await invoke("test", { action: "test", campaignId: c.id, email: testEmail.trim() });
    if (out) toast.success("E-mail de teste enviado.");
  };

  const setStatus = async (c: Campaign, status: CampaignStatus, label: string) => {
    setBusy(label);
    const { error } = await supabase.from("email_campaigns").update({ status }).eq("id", c.id);
    setBusy(null);
    if (error) {
      toast.error("Falha ao mudar o status.");
      return;
    }
    toast.success("Status atualizado.");
    queryClient.invalidateQueries({ queryKey: ["email-campaigns"] });
  };

  const remove = async (c: Campaign) => {
    if (!confirm(`Apagar a campanha "${c.name}"? Os envios registrados também saem.`)) return;
    const { error } = await supabase.from("email_campaigns").delete().eq("id", c.id);
    if (error) {
      toast.error("Falha ao apagar.");
      return;
    }
    toast.success("Campanha apagada.");
    queryClient.invalidateQueries({ queryKey: ["email-campaigns"] });
  };

  const toggleIn = (list: string[], id: string) =>
    list.includes(id) ? list.filter((x) => x !== id) : [...list, id];

  return (
    <div className="space-y-6 pb-20">
      <AdminHeader
        title="Campanhas de E-mail"
        description="Envio em massa para alunos e compradores, com segmento, pausa e descadastro automático."
        actionButton={
          <div className="flex items-center gap-2">
            <Button
              onClick={() => refetch()}
              variant="ghost"
              className="bg-white/5 border border-white/5 hover:bg-white/10 text-white/80 h-[44px] w-[44px] rounded-[12px]"
            >
              <RefreshCw className={cn("w-4 h-4", isFetching && "animate-spin")} />
            </Button>
            <Button
              onClick={openNew}
              className="bg-primary text-black font-bold h-[44px] rounded-[12px] px-5 text-[13px]"
            >
              <Plus className="w-4 h-4 mr-2" /> Nova campanha
            </Button>
          </div>
        }
      />

      <div className="glass-card rounded-[20px] border-white/10 p-4 bg-white/[0.01] text-[13px] text-muted-foreground">
        A entrega roda a 30 e-mails por minuto. Todo envio leva link de descadastro — quem clica sai da lista
        na hora e não recebe campanha nenhuma depois.
      </div>

      <div className="glass-card rounded-[20px] border-white/10 overflow-hidden bg-white/[0.01]">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-white/[0.03] border-b border-white/5 text-muted-foreground text-[12px] font-bold uppercase tracking-[0.1em]">
                <th className="px-6 py-4 text-left">Campanha</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-center">Progresso</th>
                <th className="px-6 py-4 text-center">Aberturas</th>
                <th className="px-6 py-4 text-center">Cliques</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {isLoading ? (
                Array(3).fill(0).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={6} className="px-6 py-8"><div className="h-4 bg-white/5 rounded w-full" /></td>
                  </tr>
                ))
              ) : campaigns && campaigns.length > 0 ? (
                campaigns.map((c) => {
                  const meta = STATUS[c.status];
                  const progress = c.total_recipients > 0
                    ? Math.round(((c.sent_count + c.failed_count) / c.total_recipients) * 100)
                    : 0;
                  return (
                    <motion.tr
                      key={c.id}
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="hover:bg-white/[0.03] transition-all border-l-2 border-l-transparent hover:border-l-primary/40"
                    >
                      <td className="px-6 py-4">
                        <p className="font-bold text-[14px] text-white/90">{c.name}</p>
                        <p className="text-[12px] text-muted-foreground truncate max-w-[420px]">{c.subject}</p>
                        {c.last_error && (
                          <p className="text-[11px] text-amber-400 flex items-center gap-1 mt-1">
                            <AlertTriangle className="w-3 h-3" /> {c.last_error}
                          </p>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <Badge variant="outline" className={cn("text-[11px] font-bold uppercase tracking-wider", meta.cls)}>
                          {meta.label}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <p className="text-[13px] text-white/80 font-semibold">
                          {c.sent_count}/{c.total_recipients || "—"}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {c.failed_count > 0 ? `${c.failed_count} falha(s)` : `${progress}%`}
                        </p>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <p className="text-[13px] text-white/80 font-semibold">
                          {engagement?.[c.id]?.opens ?? 0}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {c.sent_count > 0
                            ? `${Math.round(((engagement?.[c.id]?.opens ?? 0) / c.sent_count) * 100)}%`
                            : "—"}
                        </p>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <p className="text-[13px] text-white/80 font-semibold">
                          {engagement?.[c.id]?.clicks ?? 0}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {c.sent_count > 0
                            ? `${Math.round(((engagement?.[c.id]?.clicks ?? 0) / c.sent_count) * 100)}%`
                            : "—"}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            title="Prévia e teste"
                            onClick={() => setPreview(c)}
                            className="w-9 h-9 rounded-xl flex items-center justify-center bg-white/5 text-white/70 border border-white/10 hover:bg-white/10"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {c.status === "draft" && (
                            <button
                              title="Enviar"
                              onClick={() => send(c)}
                              disabled={busy === "send"}
                              className="w-9 h-9 rounded-xl flex items-center justify-center bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 disabled:opacity-40"
                            >
                              {busy === "send" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                            </button>
                          )}
                          {c.status === "sending" && (
                            <button
                              title="Pausar"
                              onClick={() => setStatus(c, "paused", "pause")}
                              className="w-9 h-9 rounded-xl flex items-center justify-center bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20"
                            >
                              <Pause className="w-4 h-4" />
                            </button>
                          )}
                          {c.status === "paused" && (
                            <button
                              title="Retomar"
                              onClick={() => setStatus(c, "sending", "resume")}
                              className="w-9 h-9 rounded-xl flex items-center justify-center bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20"
                            >
                              <Play className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            title={c.status === "sent" ? "Editar conteúdo e segmento" : "Editar"}
                            onClick={() => openEdit(c)}
                            className="w-9 h-9 rounded-xl flex items-center justify-center bg-white/5 text-white/70 border border-white/10 hover:bg-white/10"
                          >
                            <Mail className="w-4 h-4" />
                          </button>
                          {(c.status === "draft" || c.status === "paused") && (
                            <button
                              title="Cancelar"
                              onClick={() => setStatus(c, "cancelled", "cancel")}
                              className="w-9 h-9 rounded-xl flex items-center justify-center bg-white/5 text-white/70 border border-white/10 hover:bg-white/10"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          )}
                          {(c.status === "sent" || c.status === "sending" || c.status === "cancelled") && (
                            <button
                              title="Duplicar como rascunho para editar"
                              onClick={() => duplicateAsDraft(c)}
                              className="w-9 h-9 rounded-xl flex items-center justify-center bg-white/5 text-white/70 border border-white/10 hover:bg-white/10"
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            title="Apagar"
                            onClick={() => remove(c)}
                            className="w-9 h-9 rounded-xl flex items-center justify-center bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center">
                    <Mail className="w-8 h-8 text-white/15 mx-auto mb-3" />
                    <p className="text-white/70 font-bold text-sm">Nenhuma campanha ainda</p>
                    <p className="text-muted-foreground text-[13px] mt-1 max-w-[380px] mx-auto">
                      Crie a primeira para falar com seus alunos e compradores.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Editor */}
      <Dialog open={!!editor} onOpenChange={(o) => !o && setEditor(null)}>
        <DialogContent className="glass-card border-white/10 rounded-[20px] max-w-3xl bg-black/90 backdrop-blur-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white text-lg font-bold">
              {editor?.id ? "Editar campanha" : "Nova campanha"}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-[13px]">
              O corpo aceita HTML. O rodapé de descadastro é adicionado no envio.
              {editor?.id && campaigns?.find((c) => c.id === editor.id)?.status === "sent" && (
                <span className="block text-amber-400 mt-1">
                  Campanha já enviada: editar o conteúdo muda o que aparece na prévia, mas não reenvia nem altera os e-mails já entregues.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          {editor && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-[12px] uppercase tracking-widest text-muted-foreground font-bold">Nome</Label>
                  <Input
                    value={editor.name}
                    onChange={(e) => setEditor({ ...editor, name: e.target.value })}
                    placeholder="Ex.: Semana de lançamento"
                    className="bg-black/40 border-white/10 text-white h-[42px] rounded-[10px]"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[12px] uppercase tracking-widest text-muted-foreground font-bold">Assunto</Label>
                  <Input
                    value={editor.subject}
                    onChange={(e) => setEditor({ ...editor, subject: e.target.value })}
                    placeholder="Ex.: Sua vaga abre amanhã"
                    className="bg-black/40 border-white/10 text-white h-[42px] rounded-[10px]"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[12px] uppercase tracking-widest text-muted-foreground font-bold">Corpo (HTML)</Label>
                <Textarea
                  value={editor.body_html}
                  onChange={(e) => setEditor({ ...editor, body_html: e.target.value })}
                  placeholder="<h1>Olá!</h1><p>...</p>"
                  className="bg-black/40 border-white/10 text-white rounded-[10px] min-h-[180px] text-[13px] font-mono"
                />
              </div>

              {/* Preview ao vivo: mesma funcao de tracking do envio */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-[12px] uppercase tracking-widest text-muted-foreground font-bold">
                    Prévia ao vivo
                  </Label>
                  <span className="text-[11px] text-white/40">inclui rodapé, pixel e links rastreados</span>
                </div>
                <div className="rounded-xl overflow-hidden border border-white/10 bg-white">
                  <iframe
                    title="Prévia ao vivo da campanha"
                    srcDoc={livePreview}
                    className="w-full h-[260px] bg-white"
                    sandbox=""
                  />
                </div>
              </div>

              <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-[12px] uppercase tracking-widest text-muted-foreground font-bold">
                    Segmento
                  </Label>
                  <span className="text-[12px] text-white/70 inline-flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" />
                    {audience === null ? "calculando…" : `${audience} destinatário(s)`}
                  </span>
                </div>

                <label className="flex items-center gap-2 text-[13px] text-white/80">
                  <Checkbox
                    checked={editor.all}
                    onCheckedChange={(v) => setEditor({ ...editor, all: !!v })}
                  />
                  Todos os alunos e compradores
                </label>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-widest text-muted-foreground font-bold mb-1.5">
                      Quem comprou
                    </p>
                    <div className="max-h-[140px] overflow-y-auto space-y-1 pr-1">
                      {(products ?? []).map((p) => (
                        <label key={p.id} className="flex items-center gap-2 text-[13px] text-white/70">
                          <Checkbox
                            checked={editor.productIds.includes(p.id)}
                            onCheckedChange={() =>
                              setEditor({ ...editor, productIds: toggleIn(editor.productIds, p.id) })
                            }
                          />
                          {p.name}
                        </label>
                      ))}
                      {(products ?? []).length === 0 && (
                        <p className="text-[12px] text-muted-foreground">Nenhum produto ativo.</p>
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-widest text-muted-foreground font-bold mb-1.5">
                      Quem tem acesso ao curso
                    </p>
                    <div className="max-h-[140px] overflow-y-auto space-y-1 pr-1">
                      {(courses ?? []).map((c) => (
                        <label key={c.id} className="flex items-center gap-2 text-[13px] text-white/70">
                          <Checkbox
                            checked={editor.courseIds.includes(c.id)}
                            onCheckedChange={() =>
                              setEditor({ ...editor, courseIds: toggleIn(editor.courseIds, c.id) })
                            }
                          />
                          {c.title}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setEditor(null)} className="text-white/60 hover:text-white">
              Cancelar
            </Button>
            <Button
              onClick={save}
              disabled={busy === "save"}
              className="bg-primary text-black font-bold rounded-[10px]"
            >
              {busy === "save" ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Prévia + teste */}
      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="glass-card border-white/10 rounded-[20px] max-w-2xl bg-black/90 backdrop-blur-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white text-lg font-bold">{preview?.subject}</DialogTitle>
            <DialogDescription className="text-muted-foreground text-[13px]">
              {preview && `${preview.sent_count} de ${preview.total_recipients} enviados`}
              {preview?.sent_at
                ? ` · finalizada em ${format(new Date(preview.sent_at), "dd/MM HH:mm", { locale: ptBR })}`
                : ""}
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-xl overflow-hidden border border-white/10 bg-white">
            <iframe
              title="Prévia da campanha"
              srcDoc={preview?.body_html ?? ""}
              className="w-full h-[320px] bg-white"
              sandbox=""
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-[12px] uppercase tracking-widest text-muted-foreground font-bold">
              Enviar cópia de teste
            </Label>
            <div className="flex gap-2">
              <Input
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="voce@exemplo.com"
                className="bg-black/40 border-white/10 text-white h-[42px] rounded-[10px]"
              />
              <Button
                onClick={() => preview && sendTest(preview)}
                disabled={busy === "test"}
                variant="ghost"
                className="bg-white/5 border border-white/10 text-white/80 h-[42px] rounded-[10px] px-4"
              >
                {busy === "test" ? <Loader2 className="w-4 h-4 animate-spin" /> : "Enviar"}
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setPreview(null)} className="text-white/60 hover:text-white">
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
