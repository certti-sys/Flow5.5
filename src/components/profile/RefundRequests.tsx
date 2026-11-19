import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Undo2, Loader2, Clock } from "lucide-react";

interface Eligibility {
  course_id: string;
  course_title: string;
  enabled: boolean;
  can_request: boolean;
  reason_code: string;
  message: string | null;
  days_remaining: number | null;
}

interface Props {
  courses: Array<{ id: string; title: string }>;
}

/**
 * Reembolso aparece no perfil, não na página do curso: quem tem acesso é
 * redirecionado para a aula, então a página do curso nunca seria vista.
 */
export function RefundRequests({ courses }: Props) {
  const queryClient = useQueryClient();
  const [target, setTarget] = useState<Eligibility | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const courseIds = useMemo(() => courses.map((c) => c.id).sort().join(","), [courses]);

  const { data: rows = [] } = useQuery({
    queryKey: ["refund-eligibility", courseIds],
    enabled: courses.length > 0,
    queryFn: async () => {
      const results = await Promise.all(
        courses.map(async (course) => {
          const { data, error } = await supabase.rpc("refund_eligibility", { p_course_id: course.id });
          if (error) return null;
          const payload = data as any;
          if (!payload?.enabled) return null;
          return { ...payload, course_id: course.id, course_title: course.title } as Eligibility;
        }),
      );
      return results.filter(Boolean) as Eligibility[];
    },
  });

  // Só interessa o que ainda dá para pedir ou o que está em análise.
  const visible = rows.filter((r) => r.can_request || r.reason_code === "pending_request");
  if (visible.length === 0) return null;

  const submit = async () => {
    if (!target) return;
    setBusy(true);
    try {
      const { error } = await supabase.rpc("request_refund", {
        p_course_id: target.course_id,
        p_reason: reason.trim(),
      });
      if (error) throw error;
      toast.success("Solicitação enviada. Você será avisado quando for analisada.");
      setTarget(null);
      setReason("");
      queryClient.invalidateQueries({ queryKey: ["refund-eligibility"] });
    } catch (e: any) {
      toast.error(e?.message || "Não foi possível solicitar o reembolso.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="glass-card rounded-[24px] border-white/10 p-6">
      <h2 className="text-lg font-bold mb-4 flex items-center gap-2 tracking-tight">
        <Undo2 className="w-5 h-5 text-primary" />
        Reembolsos
      </h2>

      <div className="space-y-3">
        {visible.map((row) => (
          <div
            key={row.course_id}
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-[16px] border border-white/5 bg-white/[0.03]"
          >
            <div className="min-w-0">
              <p className="font-bold text-sm truncate">{row.course_title}</p>
              {row.can_request ? (
                <p className="text-[12px] text-muted-foreground flex items-center gap-1 mt-1">
                  <Clock className="w-3 h-3" />
                  {row.days_remaining === 0
                    ? "Último dia para solicitar"
                    : `${row.days_remaining} dia(s) restante(s)`}
                </p>
              ) : (
                <p className="text-[12px] text-muted-foreground mt-1">{row.message}</p>
              )}
            </div>

            {row.can_request ? (
              <Button
                variant="outline"
                onClick={() => setTarget(row)}
                className="h-10 rounded-[12px] border-white/10 bg-transparent hover:bg-white/5 text-[13px] font-bold shrink-0"
              >
                Solicitar reembolso
              </Button>
            ) : (
              <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-[11px] font-bold uppercase tracking-wider shrink-0">
                Em análise
              </Badge>
            )}
          </div>
        ))}
      </div>

      <Dialog open={!!target} onOpenChange={(open) => !open && setTarget(null)}>
        <DialogContent className="max-w-lg glass-card border-white/10">
          <DialogHeader>
            <DialogTitle>Solicitar reembolso</DialogTitle>
            <DialogDescription>
              {target?.course_title}. A solicitação passa por análise antes do estorno.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <p className="text-[12px] font-bold uppercase tracking-wider text-white/70">Por que quer o reembolso?</p>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Conte o motivo (mínimo 10 caracteres)"
              className="bg-transparent border-white/10 min-h-[96px]"
            />
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setTarget(null)} className="h-[44px] rounded-[12px]">
              Cancelar
            </Button>
            <Button
              onClick={submit}
              disabled={busy || reason.trim().length < 10}
              className="h-[44px] rounded-[12px] font-bold gradient-primary"
            >
              {busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Enviar solicitação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
