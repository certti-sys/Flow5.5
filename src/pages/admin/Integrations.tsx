import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter,
} from "@/components/ui/sheet";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ErrorState } from "@/components/ErrorState";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { CheckCircle2, Info, RefreshCw, Settings, XCircle, Zap } from "lucide-react";
import { CATALOG, catalogEntry, type CatalogEntry, type IntegrationKind } from "@/lib/integration-catalog";

type Integration = {
  id: string;
  kind: IntegrationKind;
  name: string;
  config: Record<string, any>;
  has_secret: boolean;
  is_active: boolean;
  product_ids: string[];
  last_tested_at: string | null;
  last_error: string | null;
};

type Store = {
  kind: IntegrationKind;
  name: string;
  description: string;
};

const COLUMNS =
  "id, kind, name, config, has_secret, is_active, product_ids, last_tested_at, last_error";

export default function IntegrationsPage() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<Store | null>(null);
  const [open, setOpen] = useState(false);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["integrations"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("integrations")
        .select(COLUMNS)
        .order("created_at");
      if (error) throw error;
      return (data ?? []) as Integration[];
    },
  });

  const { data: products } = useQuery({
    queryKey: ["integrations-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name")
        .order("name");
      if (error) throw error;
      return (data ?? []) as Array<{ id: string; name: string }>;
    },
  });

  const toggle = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await (supabase as any)
        .from("integrations")
        .update({ is_active: active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["integrations"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const byKind = useMemo(() => {
    const map = new Map<string, Integration>();
    for (const i of data ?? []) {
      // Uma linha por kind: a config é única, então reconectar atualiza.
      if (!map.has(i.kind)) map.set(i.kind, i);
    }
    return map;
  }, [data]);

  const apps = CATALOG.filter((c) => c.mode === "server");
  const pixels = CATALOG.filter((c) => c.mode === "browser");
  const activeCount = [...byKind.values()].filter((i) => i.is_active).length;

  const openConfig = (entry: CatalogEntry) => {
    const existing = byKind.get(entry.kind);
    setEditing({ kind: entry.kind, name: entry.name, description: entry.description });
    setOpen(true);
  };

  if (isError) return <ErrorState onRetry={() => refetch()} />;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 pb-20">
      <AdminHeader
        title="Integrações"
        description="Conecte ferramentas de tráfego, nota fiscal e pixels de conversão."
        showSearch={false}
        actionButton={
          <Button
            onClick={() => refetch()}
            variant="outline"
            className="glass-card border-white/10 hover:bg-white/5 h-[44px] px-5 rounded-[12px] font-bold text-[13px] tracking-tight"
          >
            <RefreshCw className={cn("w-4 h-4 mr-2", isLoading && "animate-spin")} />
            Atualizar
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: "Integrações ativas", value: String(activeCount), icon: Zap, color: "text-emerald-400" },
          { label: "Aplicativos", value: `${apps.length}`, icon: Settings, color: "text-blue-400" },
          { label: "Pixels", value: `${pixels.length}`, icon: CheckCircle2, color: "text-violet-400" },
        ].map((stat) => (
          <div key={stat.label} className="glass-card p-6 rounded-[20px] border border-white/10">
            <div className="flex items-center gap-3 mb-3">
              <div className={cn("p-2.5 rounded-[12px] bg-black/40 border border-white/10", stat.color)}>
                <stat.icon className="w-4 h-4" />
              </div>
              <span className="text-[13px] text-muted-foreground">{stat.label}</span>
            </div>
            <p className="text-2xl font-bold text-white">{stat.value}</p>
          </div>
        ))}
      </div>

      <Section
        title="Aplicativos"
        description="Enviam eventos do pedido para um serviço externo, pela fila do servidor."
        entries={apps}
        byKind={byKind}
        onConfigure={openConfig}
        onToggle={(id, active) => toggle.mutate({ id, active })}
      />

      <Section
        title="Pixels de conversão"
        description="Carregam no navegador do visitante, sem passar pela fila."
        entries={pixels}
        byKind={byKind}
        onConfigure={openConfig}
        onToggle={(id, active) => toggle.mutate({ id, active })}
      />

      <ConfigSheet
        store={editing}
        integration={editing ? byKind.get(editing.kind) : undefined}
        entry={editing ? catalogEntry(editing.kind) : undefined}
        products={products ?? []}
        open={open}
        onOpenChange={setOpen}
        onSaved={() => queryClient.invalidateQueries({ queryKey: ["integrations"] })}
      />
    </motion.div>
  );
}

function Section({
  title, description, entries, byKind, onConfigure, onToggle,
}: {
  title: string;
  description: string;
  entries: CatalogEntry[];
  byKind: Map<string, Integration>;
  onConfigure: (entry: CatalogEntry) => void;
  onToggle: (id: string, active: boolean) => void;
}) {
  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-[15px] font-bold text-white tracking-tight">{title}</h2>
        <p className="text-[13px] text-muted-foreground">{description}</p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {entries.map((entry) => {
          const saved = byKind.get(entry.kind);
          const Icon = entry.icon;
          return (
            <div
              key={entry.kind}
              className="glass-card p-5 rounded-[20px] border border-white/10 hover:border-white/20 transition-all"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 rounded-[14px] bg-black/40 border border-white/10 flex items-center justify-center">
                    <Icon className={cn("w-5 h-5", entry.accent)} />
                  </div>
                  <div>
                    <h3 className="font-bold text-[15px] text-white">{entry.name}</h3>
                    <p className="text-[12.5px] text-muted-foreground mt-0.5 max-w-[320px]">
                      {entry.description}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2 shrink-0">
                  {saved ? (
                    <Badge
                      variant="outline"
                      className={cn(
                        "rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider",
                        saved.is_active
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          : "bg-white/5 text-white/60 border-white/10",
                      )}
                    >
                      {saved.is_active ? "Ativa" : "Inativa"}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider bg-white/5 text-white/50 border-white/10">
                      Não conectada
                    </Badge>
                  )}
                  {saved && (
                    <Switch
                      checked={saved.is_active}
                      onCheckedChange={(active) => onToggle(saved.id, active)}
                      aria-label={`Ativar ${entry.name}`}
                    />
                  )}
                </div>
              </div>

              {saved?.last_error && (
                <p className="mt-3 flex items-start gap-2 text-[12px] text-amber-400/90">
                  <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  {saved.last_error}
                </p>
              )}

              <div className="mt-4 flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onConfigure(entry)}
                  className="glass-card border-white/10 hover:bg-white/5 h-[38px] rounded-[10px] text-[12px] uppercase tracking-widest font-bold text-white"
                >
                  <Settings className="w-3.5 h-3.5 mr-2" />
                  {saved ? "Editar" : "Conectar"}
                </Button>
                {saved && !saved.has_secret && saved.kind !== "pixel_script" && (
                  <span className="flex items-center gap-1 text-[12px] text-amber-400/90">
                    <XCircle className="w-3.5 h-3.5" />
                    Falta credencial
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ConfigSheet({
  store, integration, entry, products, open, onOpenChange, onSaved,
}: {
  store: Store | null;
  integration: Integration | undefined;
  entry: CatalogEntry | undefined;
  products: Array<{ id: string; name: string }>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [secret, setSecret] = useState("");
  const [productIds, setProductIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  // Reabrir o mesmo app precisa recarregar os valores salvos, então reseta
  // sempre que a linha muda.
  useEffect(() => {
    if (!entry) return;
    const next: Record<string, string> = {};
    for (const field of entry.fields) {
      if (field.secret) continue;
      next[field.key] = String(integration?.config?.[field.key] ?? field.options?.[0]?.value ?? "");
    }
    setValues(next);
    setSecret("");
    setProductIds(integration?.product_ids ?? []);
  }, [entry, integration, open]);

  if (!entry || !store) return null;

  const handleSave = async () => {
    if (entry.mode === "server" && !integration?.has_secret && !secret) {
      toast.error("Informe a credencial antes de salvar.");
      return;
    }

    setSaving(true);
    const row = {
      kind: entry.kind,
      name: entry.name,
      config: values,
      is_active: integration?.is_active ?? true,
      product_ids: productIds,
      ...(secret ? { secret } : {}),
    };

    const query = (supabase as any).from("integrations");
    const { error } = integration
      ? await query.update(row).eq("id", integration.id)
      : await query.insert(row);

    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(integration ? "Integração atualizada." : "Integração conectada.");
    onSaved();
    onOpenChange(false);
  };

  const handleDisconnect = async () => {
    if (!integration) return;
    setSaving(true);
    const { error } = await (supabase as any).from("integrations").delete().eq("id", integration.id);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Integração removida.");
    onSaved();
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-[460px] bg-[#0a0a0c] border-white/10 overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-white">{store.name}</SheetTitle>
          <SheetDescription>{store.description}</SheetDescription>
        </SheetHeader>

        <div className="space-y-5 mt-6">
          {entry.fields.map((field) => (
            <div key={field.key} className="space-y-2">
              <Label className="text-[13px] text-white/80">{field.label}</Label>

              {field.type === "select" ? (
                <Select
                  value={values[field.key] || field.options?.[0]?.value}
                  onValueChange={(v) => setValues((prev) => ({ ...prev, [field.key]: v }))}
                >
                  <SelectTrigger className="bg-black/40 border-white/10 h-[42px] rounded-[10px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {field.options?.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : field.type === "textarea" ? (
                <Textarea
                  value={values[field.key] ?? ""}
                  onChange={(e) => setValues((prev) => ({ ...prev, [field.key]: e.target.value }))}
                  placeholder={field.placeholder}
                  className="bg-black/40 border-white/10 min-h-[180px] font-mono text-[12px] rounded-[10px]"
                />
              ) : field.secret ? (
                <Input
                  type="password"
                  value={secret}
                  onChange={(e) => setSecret(e.target.value)}
                  placeholder={integration?.has_secret ? "•••••••• (salvo)" : field.placeholder}
                  className="bg-black/40 border-white/10 h-[42px] rounded-[10px] font-mono"
                  autoComplete="new-password"
                />
              ) : (
                <Input
                  value={values[field.key] ?? ""}
                  onChange={(e) => setValues((prev) => ({ ...prev, [field.key]: e.target.value }))}
                  placeholder={field.placeholder}
                  className="bg-black/40 border-white/10 h-[42px] rounded-[10px]"
                />
              )}

              {field.help && <p className="text-[12px] text-muted-foreground">{field.help}</p>}
            </div>
          ))}

          <div className="space-y-2">
            <Label className="text-[13px] text-white/80">Produtos</Label>
            <p className="text-[12px] text-muted-foreground">
              Sem seleção, vale para todos os produtos.
            </p>
            <div className="max-h-[180px] overflow-y-auto rounded-[10px] border border-white/10 bg-black/40 divide-y divide-white/5">
              {products.length === 0 && (
                <p className="p-3 text-[12px] text-muted-foreground">Nenhum produto cadastrado.</p>
              )}
              {products.map((p) => {
                const checked = productIds.includes(p.id);
                return (
                  <label key={p.id} className="flex items-center gap-2.5 px-3 py-2 cursor-pointer hover:bg-white/5">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() =>
                        setProductIds((prev) =>
                          checked ? prev.filter((id) => id !== p.id) : [...prev, p.id],
                        )
                      }
                      className="accent-primary"
                    />
                    <span className="text-[13px] text-white/80">{p.name}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {integration?.last_error && (
            <div className="rounded-[10px] border border-amber-500/20 bg-amber-500/5 p-3 text-[12px] text-amber-400">
              Último erro: {integration.last_error}
            </div>
          )}
        </div>

        <SheetFooter className="mt-8 gap-2">
          {integration && (
            <Button
              variant="outline"
              onClick={handleDisconnect}
              disabled={saving}
              className="border-red-500/20 text-red-400 hover:bg-red-500/10 rounded-[10px]"
            >
              Remover
            </Button>
          )}
          <Button onClick={handleSave} disabled={saving} className="rounded-[10px]">
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
