import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { 
  ActivitySquare, ShieldAlert, ShieldCheck, UserX, 
  RefreshCw, CheckCircle2, XCircle, Search, Mail, Key
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Database } from "@/integrations/supabase/types";

type ViewHealthAuditRow = Database['public']['Views']['view_data_health_audit']['Row'];

export function DataHealthPanel() {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState<string>("ALL_ISSUES");
  const queryClient = useQueryClient();

  const { data: auditLogs, isLoading, refetch } = useQuery({
    queryKey: ['data-health-audit'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('view_data_health_audit')
        .select('*')
        .order('processed_at', { ascending: false });
      
      if (error) {
        toast.error("Erro ao carregar auditoria");
        throw error;
      }
      return data as ViewHealthAuditRow[];
    }
  });

  const fixAccessMutation = useMutation({
    mutationFn: async ({ action, payload }: { action: 'grant' | 'revoke', payload: ViewHealthAuditRow }) => {
      console.log('[DataHealth] Ação:', action, 'Payload:', JSON.stringify(payload, null, 2));

      if (action === 'grant') {
        let targetUserId = payload.user_id;

        // Ensure we have a valid course_id to bind
        if (!payload.course_id) {
            throw new Error("Produto não está mapeado com nenhum Curso do sistema. Por favor, crie o Mapeamento primeiro!");
        }

        // Auto-heal: SEMPRE buscar pelo email para garantir o ID correto
        if (payload.customer_email) {
          const emailToSearch = payload.customer_email.trim();
          console.log('[DataHealth] Buscando perfil por email:', emailToSearch);
          
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('id, email, name')
            .ilike('email', emailToSearch)
            .maybeSingle();

          console.log('[DataHealth] Resultado busca perfil:', { profile, profileError });

          if (profile) {
            targetUserId = profile.id;
            console.log('[DataHealth] Auto-heal: Trocando user_id de', payload.user_id, 'para', profile.id);
            
            // Atualiza a transação do webhook (não-bloqueante: se falhar, segue em frente)
            try {
              const { error: updateError } = await supabase
                .from('webhook_transactions')
                .update({ user_id: profile.id })
                .eq('id', payload.transaction_id);
              if (updateError) console.warn('[DataHealth] Aviso: Não conseguiu atualizar webhook_transaction:', updateError);
            } catch (e) {
              console.warn('[DataHealth] Aviso ao atualizar transação (ignorando):', e);
            }
          } else {
            throw new Error(`O e-mail "${emailToSearch}" não foi encontrado no sistema. Crie a conta do aluno primeiro no menu Gerenciar Alunos.`);
          }
        }

        if (!targetUserId) {
             throw new Error("ID de usuário inválido. A conta do aluno não existe.");
        }

        console.log('[DataHealth] Inserindo acesso:', { user_id: targetUserId, course_id: payload.course_id });
        
        const { error } = await supabase
          .from('user_course_access')
          .insert({ user_id: targetUserId, course_id: payload.course_id });
        
        if (error) {
            console.error("[DataHealth] Erro no insert do user_course_access:", error);
            if (error.code === '23505') throw new Error("O aluno já possui acesso ativo a este curso.");
            throw new Error(error.message || 'Erro ao conceder acesso');
        }
        
        console.log('[DataHealth] ✅ Acesso concedido com sucesso!');
      } else {
        const { error } = await supabase
          .from('user_course_access')
          .delete()
          .eq('user_id', payload.user_id)
          .eq('course_id', payload.course_id);
        if (error) throw error;
      }
    },
    onSuccess: (_, variables) => {
      toast.success(variables.action === 'grant' ? '✅ Acesso Concedido com Sucesso!' : '🚫 Acesso Revogado!');
      queryClient.invalidateQueries({ queryKey: ['data-health-audit'] });
    },
    onError: (error: Error) => {
      console.error('[DataHealth] Mutation error:', error);
      toast.error(`Falha: ${error.message}`);
    }
  });

  const logs = auditLogs || [];
  const missingAccess = logs.filter(log => log.health_status === 'MISSING_ACCESS');
  const unauthorized = logs.filter(log => log.health_status === 'UNAUTHORIZED_ACCESS');
  const missingWhatsapp = logs.filter(log => log.health_status === 'MISSING_WHATSAPP');
  const healthy = logs.filter(log => log.health_status === 'HEALTHY');

  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.customer_email?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          log.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          log.course_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (!matchesSearch) return false;
    if (activeFilter === "ALL_ISSUES") return log.health_status !== 'HEALTHY';
    if (activeFilter === "ALL") return true;
    return log.health_status === activeFilter;
  });

  return (
    <div className="space-y-6">
      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { id: 'MISSING_ACCESS', label: "Acessos Retidos", value: missingAccess.length, icon: Key, color: "text-rose-500", bg: "bg-rose-500/10", border: activeFilter === 'MISSING_ACCESS' ? "border-rose-500/50" : "border-rose-500/20" },
          { id: 'UNAUTHORIZED_ACCESS', label: "Acessos Indevidos", value: unauthorized.length, icon: ShieldAlert, color: "text-amber-500", bg: "bg-amber-500/10", border: activeFilter === 'UNAUTHORIZED_ACCESS' ? "border-amber-500/50" : "border-amber-500/20" },
          { id: 'MISSING_WHATSAPP', label: "Falta WhatsApp", value: missingWhatsapp.length, icon: UserX, color: "text-blue-500", bg: "bg-blue-500/10", border: activeFilter === 'MISSING_WHATSAPP' ? "border-blue-500/50" : "border-blue-500/20" },
          { id: 'HEALTHY', label: "Saudáveis", value: healthy.length, icon: ShieldCheck, color: "text-emerald-500", bg: "bg-emerald-500/10", border: activeFilter === 'HEALTHY' ? "border-emerald-500/50" : "border-emerald-500/20" },
        ].map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            onClick={() => setActiveFilter(stat.id)}
            className={`glass-card p-5 cursor-pointer hover:-translate-y-1 transition-all rounded-[16px] border ${stat.border}`}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className={`p-2.5 rounded-[12px] ${stat.bg} ${stat.color}`}>
                <stat.icon className="w-5 h-5" />
              </div>
              <span className="text-[13px] font-medium text-muted-foreground">{stat.label}</span>
            </div>
            <h3 className="text-[28px] font-bold tracking-tighter text-white">{stat.value}</h3>
          </motion.div>
        ))}
      </div>

      {/* Tabela Interativa */}
      <div className="glass-card border border-white/10 rounded-[16px] overflow-hidden flex flex-col">
        <div className="p-4 border-b border-white/5 flex flex-col sm:flex-row justify-between items-center gap-4 bg-black/20">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative w-full sm:w-[300px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <Input 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por e-mail, nome ou curso..."
                className="pl-9 h-10 bg-black/40 border-white/10 rounded-[10px] text-[13px] font-medium text-white/70"
              />
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setActiveFilter("ALL_ISSUES")}
              className={`h-10 w-10 shrink-0 border-white/10 rounded-[10px] 
                ${activeFilter === 'ALL_ISSUES' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/80'}
              `}
              title="Mostrar apenas Problemas"
            >
              <ActivitySquare className="w-4 h-4" />
            </Button>
          </div>
          <Button 
            variant="outline" 
            onClick={() => refetch()}
            className="glass-card border-white/10 hover:bg-white/10 h-10 w-full sm:w-auto rounded-[10px]"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Re-Auditar
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-black/40 border-b border-white/5">
                <th className="px-6 py-4 text-[11px] font-bold text-white/40 uppercase tracking-widest whitespace-nowrap">Aluno</th>
                <th className="px-6 py-4 text-[11px] font-bold text-white/40 uppercase tracking-widest whitespace-nowrap">Produto</th>
                <th className="px-6 py-4 text-[11px] font-bold text-white/40 uppercase tracking-widest whitespace-nowrap">Status Financeiro</th>
                <th className="px-6 py-4 text-[11px] font-bold text-white/40 uppercase tracking-widest whitespace-nowrap">Discrepância / KPI</th>
                <th className="px-6 py-4 text-[11px] font-bold text-white/40 uppercase tracking-widest whitespace-nowrap text-right">Ação</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-white/40 text-[13px]">Auditoria em andamento...</td>
                  </tr>
                ) : filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-white/40 text-[13px]">Nenhum registro encontrado para este filtro.</td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => (
                    <motion.tr 
                      key={log.transaction_id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="border-b border-white/5 hover:bg-white/5 transition-colors group"
                    >
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-[14px] font-semibold text-white/90">{log.customer_name || 'Desconhecido'}</span>
                          <span className="text-[12px] text-white/50 flex items-center gap-1 mt-0.5">
                            <Mail className="w-3 h-3" /> {log.customer_email || 'S/ Email'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-[13px] text-white/80 font-medium">{log.course_name || 'Produto Não Mapeado'}</span>
                          <span className="text-[11px] text-white/40 truncate max-w-[200px]">ID: {log.course_id}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant="outline" className={`text-[10px] uppercase font-bold tracking-wider rounded-full 
                          ${log.transaction_status === 'approved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 
                            log.transaction_status === 'refunded' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 
                            'bg-white/5 text-white/40 border-white/10'}`}
                        >
                          {log.transaction_status}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        {log.health_status === 'MISSING_ACCESS' && (
                          <div className="flex items-center gap-2 text-rose-400 text-[12px] font-bold">
                            <Key className="w-4 h-4" /> Pagou, mas sem Acesso
                          </div>
                        )}
                        {log.health_status === 'UNAUTHORIZED_ACCESS' && (
                          <div className="flex items-center gap-2 text-amber-400 text-[12px] font-bold">
                            <ShieldAlert className="w-4 h-4" /> Cancelou, mas com Acesso
                          </div>
                        )}
                        {log.health_status === 'MISSING_WHATSAPP' && (
                          <div className="flex items-center gap-2 text-blue-400 text-[12px] font-bold">
                            <UserX className="w-4 h-4" /> Faltando Telefone
                          </div>
                        )}
                        {log.health_status === 'HEALTHY' && (
                          <div className="flex items-center gap-2 text-emerald-400 text-[12px] font-bold">
                            <CheckCircle2 className="w-4 h-4" /> Saudável
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {log.health_status === 'MISSING_ACCESS' && (
                          <Button 
                            size="sm"
                            disabled={fixAccessMutation.isPending}
                            onClick={() => fixAccessMutation.mutate({ action: 'grant', payload: log })}
                            className="bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 border border-rose-500/50 rounded-[8px] h-8 text-[11px] font-bold"
                          >
                            Conceder Acesso
                          </Button>
                        )}
                        {log.health_status === 'UNAUTHORIZED_ACCESS' && (
                          <Button 
                            size="sm"
                            disabled={fixAccessMutation.isPending}
                            onClick={() => fixAccessMutation.mutate({ action: 'revoke', payload: log })}
                            className="bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 border border-amber-500/50 rounded-[8px] h-8 text-[11px] font-bold"
                          >
                            Revogar Acesso
                          </Button>
                        )}
                        {log.health_status === 'HEALTHY' && (
                          <span className="text-[12px] text-white/20 font-bold mr-4">-</span>
                        )}
                         {log.health_status === 'MISSING_WHATSAPP' && (
                          <span className="text-[11px] text-blue-400/60 font-bold bg-blue-500/10 px-2 py-1 rounded-[6px] border border-blue-500/20">Action na página do Aluno</span>
                        )}
                      </td>
                    </motion.tr>
                  ))
                )}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
