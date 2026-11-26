import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, AlertTriangle } from "lucide-react";

interface RenewalInfo {
  product: string;
  status: string;
  period_end: string | null;
}

/**
 * Portal público de renovação (/renovar/:token).
 *
 * F5 do plano: o token vem de subscriptions.metadata.renewal_url (gravado
 * pelo aviso de renovação). A cobrança recorrente (F2) ainda não existe —
 * esta página mostra o estado da assinatura e orienta o contato, sem cobrar.
 */
export default function RenewalPage() {
  const { token } = useParams();
  const [info, setInfo] = useState<RenewalInfo | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data, error } = await supabase.rpc("get_renewal_info", { p_token: token ?? "" });
      if (!active) return;
      if (error || !data || data.length === 0) {
        setErro("Link de renovação inválido ou expirado.");
      } else {
        setInfo(data[0] as RenewalInfo);
      }
      setLoading(false);
    })();
    return () => { active = false; };
  }, [token]);

  return (
    <div className="min-h-screen bg-[#0b0d0c] text-[#e8ece6] flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/[0.03] p-8">
        <h1 className="text-2xl font-bold tracking-tight mb-2">Renovação de assinatura</h1>
        <p className="text-sm text-white/60 mb-6">Confira o estado da sua assinatura antes de continuar.</p>

        {loading ? (
          <div className="flex items-center gap-2 text-white/60">
            <Loader2 className="h-4 w-4 animate-spin" /> Consultando…
          </div>
        ) : erro ? (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
            <p className="text-sm text-amber-500">{erro}</p>
          </div>
        ) : info && (
          <div className="space-y-4">
            <div className="rounded-lg border border-white/10 p-4 space-y-2 text-sm">
              <p><span className="text-white/50">Produto:</span> <strong>{info.product}</strong></p>
              <p><span className="text-white/50">Status:</span> <strong>{info.status}</strong></p>
              <p>
                <span className="text-white/50">Vigência até:</span>{" "}
                <strong>{info.period_end ? new Date(info.period_end).toLocaleDateString("pt-BR") : "—"}</strong>
              </p>
            </div>
            {info.status === "active" ? (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                <p className="text-sm text-emerald-500">Sua assinatura está ativa. Não é necessário renovar agora.</p>
              </div>
            ) : (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                <p className="text-sm text-amber-500">A cobrança recorrente ainda não está ativa. Entre em contato com o suporte para renovar.</p>
              </div>
            )}
          </div>
        )}

        <Button asChild variant="outline" className="w-full mt-6">
          <Link to="/login">Voltar para a plataforma</Link>
        </Button>
      </div>
    </div>
  );
}
