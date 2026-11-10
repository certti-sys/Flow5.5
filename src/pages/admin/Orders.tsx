import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { ConfirmDeleteDialog } from "@/components/admin/ConfirmDeleteDialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";
import { toast } from "sonner";
import { ptBR } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  ShoppingCart, Search, Filter, Eye, RefreshCw,
  CheckCircle, Clock, XCircle, DollarSign, User, Package, Trash2,
  TrendingUp, CreditCard, Calendar, ArrowUpRight, Copy, ChevronRight
} from "lucide-react";
import { AdminHeader } from "@/components/admin/AdminHeader";

interface Order {
  id: string;
  user_id: string;
  status: string;
  total_amount: number;
  currency: string;
  created_at: string;
  customer_email?: string;
  customer_name?: string;
  customer_phone?: string;
  customer_cpf?: string;
  profile?: {
    name: string;
    email: string;
    whatsapp?: string;
    avatar_url?: string;
  };
  payments?: Array<{
    id: string;
    status: string;
    payment_method_type: string;
    external_payment_id: string;
  }>;
  order_items?: Array<{
    id: string;
    quantity: number;
    unit_amount: number;
    product?: {
      name: string;
    };
  }>;
}

const statusConfig: Record<string, { label: string; color: string; icon: any; border: string }> = {
  paid: {
    label: "Pago",
    color: "bg-emerald-500/10 text-emerald-400",
    border: "border-emerald-500/20",
    icon: CheckCircle
  },
  pending: {
    label: "Pendente",
    color: "bg-amber-500/10 text-amber-400",
    border: "border-amber-500/20",
    icon: Clock
  },
  failed: {
    label: "Falhou",
    color: "bg-red-500/10 text-red-500",
    border: "border-red-500/20",
    icon: XCircle
  },
  refunded: {
    label: "Reembolsado",
    color: "bg-slate-500/10 text-slate-400",
    border: "border-slate-500/20",
    icon: RefreshCw
  },
};

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

export default function Orders() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingOrderId, setDeletingOrderId] = useState<string | null>(null);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);

  const deleteMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const { error } = await supabase.from('orders').delete().eq('id', orderId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Pedido deletado!', {
        style: { background: '#111', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }
      });
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
    },
    onError: (e: any) => toast.error(e.message || 'Erro ao deletar pedido')
  });

  const deleteMultipleMutation = useMutation({
    mutationFn: async (orderIds: string[]) => {
      const { error } = await supabase.from('orders').delete().in('id', orderIds);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(`${selectedIds.length} pedidos deletados!`);
      setSelectedIds([]);
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
    },
    onError: (e: any) => toast.error(e.message || 'Erro ao deletar pedidos')
  });

  const { data: orders, isLoading, refetch } = useQuery({
    queryKey: ["admin-orders", statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("orders")
        .select(`
          *,
          payments(id, status, payment_method_type, external_payment_id),
          order_items(id, quantity, unit_amount, product:products(name))
        `)
        .order("created_at", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Order[];
    }
  });

  const filteredOrders = useMemo(() => {
    return orders?.filter(order => {
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      return (
        order.id.toLowerCase().includes(term) ||
        order.customer_name?.toLowerCase().includes(term) ||
        order.customer_email?.toLowerCase().includes(term) ||
        order.profile?.name?.toLowerCase().includes(term) ||
        order.profile?.email?.toLowerCase().includes(term)
      );
    });
  }, [orders, searchTerm]);

  const stats = useMemo(() => {
    if (!orders) return { total: 0, paid: 0, waiting: 0, average: 0 };

    const total = orders.reduce((acc, curr) => acc + curr.total_amount, 0);
    const paid = orders
      .filter(o => o.status === 'paid')
      .reduce((acc, curr) => acc + curr.total_amount, 0);
    const waiting = orders
      .filter(o => o.status === 'pending')
      .reduce((acc, curr) => acc + curr.total_amount, 0);

    const paidCount = orders.filter(o => o.status === 'paid').length;
    const average = paidCount > 0 ? paid / paidCount : 0;

    return { total, paid, waiting, average };
  }, [orders]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(amount / 100);
  };

  const StatusBadge = ({ status }: { status: string }) => {
    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;
    return (
      <Badge variant="outline" className={cn("rounded-full px-2.5 py-0.5 font-bold text-[10px] uppercase tracking-wider border-white/5", config.color, config.border)}>
        <Icon className="w-3 h-3 mr-1.5" />
        {config.label}
      </Badge>
    );
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("ID copiado!", {
      style: { background: '#111', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }
    });
  };

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-6 pb-20"
    >
      <AdminHeader
        title="Gestão de Pedidos"
        description="Controle centralizado de vendas, transações e status de pagamento."
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Buscar por cliente ou ID..."
        actionButton={
          <div className="flex items-center gap-3">
            <AnimatePresence>
              {selectedIds.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="flex items-center gap-2"
                >
                  <Button
                    onClick={() => setSelectedIds([])}
                    variant="ghost"
                    className="text-white/40 hover:text-white font-bold text-[13px]"
                  >
                    Limpar ({selectedIds.length})
                  </Button>
                  <Button
                    onClick={() => setBulkDeleteDialogOpen(true)}
                    className="bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20 rounded-[12px] h-[44px] px-4 font-bold"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Apagar Seleção
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
            <Button
              onClick={() => refetch()}
              variant="ghost"
              className="bg-white/5 border border-white/5 hover:bg-white/10 text-white/80 h-[44px] rounded-[12px] px-5 font-bold font-inter text-[13px]"
            >
              <RefreshCw className={cn("w-4 h-4 mr-2", isLoading && "animate-spin")} />
              Sincronizar
            </Button>
          </div>
        }
        filters={
          <div className="flex items-center gap-1.5 p-1 bg-white/5 rounded-xl border border-white/5">
            {[
              { id: 'all', label: 'Todos' },
              { id: 'paid', label: 'Pagos' },
              { id: 'pending', label: 'Pendentes' },
              { id: 'failed', label: 'Falhos' }
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setStatusFilter(f.id)}
                className={cn(
                  "px-4 py-1.5 text-[12px] font-bold rounded-lg transition-all",
                  statusFilter === f.id
                    ? "bg-primary text-white shadow-glow-sm"
                    : "text-muted-foreground hover:text-white"
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        }
      />

      {/* Stats Section */}
      <motion.div layout className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card p-6 rounded-[20px] border-white/10 overflow-hidden relative group h-[140px] bg-gradient-to-tr from-emerald-500/10 to-emerald-500/5 border-emerald-500/20">
          <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/20 rounded-full blur-[100px] -mr-24 -mt-24 opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
          <div className="relative z-10">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-widest mb-1 block">Faturamento Total</span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-2xl font-black text-white">{formatCurrency(stats.total)}</span>
                </div>
              </div>
              <div className="p-3 rounded-full bg-emerald-500/20 border border-emerald-500/30">
                <DollarSign className="w-5 h-5 text-emerald-500" />
              </div>
            </div>
          </div>
        </div>
        <div className="glass-card p-6 rounded-[20px] border-white/10 overflow-hidden relative group h-[140px] bg-white/[0.01] border-white/5">
          <div className="relative z-10">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-blue-400 uppercase tracking-widest mb-1 block">Vendas Pagas</span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-2xl font-black text-white">{formatCurrency(stats.paid)}</span>
                </div>
                <span className="text-xs text-blue-400/60 mt-1 font-bold uppercase tracking-wider">+8% vs 7d</span>
              </div>
              <div className="p-3 rounded-full bg-primary/10 border border-primary/20">
                <CheckCircle className="w-5 h-5 text-blue-400" />
              </div>
            </div>
          </div>
        </div>
        <div className="glass-card p-6 rounded-[20px] border-white/10 overflow-hidden relative group h-[140px] bg-white/[0.01] border-white/5">
          <div className="relative z-10">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-amber-400 uppercase tracking-widest mb-1 block">Pendentes</span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-2xl font-black text-white">{formatCurrency(stats.waiting)}</span>
                </div>
              </div>
              <div className="p-3 rounded-full bg-amber-500/20 border border-amber-500/30">
                <Clock className="w-5 h-5 text-amber-400" />
              </div>
            </div>
          </div>
        </div>
        <div className="glass-card p-6 rounded-[20px] border-white/10 overflow-hidden relative group h-[140px] bg-white/[0.01] border-white/5">
          <div className="relative z-10">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-purple-400 uppercase tracking-widest mb-1 block">Ticket Médio</span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-2xl font-black text-white">{formatCurrency(stats.average)}</span>
                </div>
              </div>
              <div className="p-3 rounded-full bg-purple-500/20 border border-purple-500/30">
                <TrendingUp className="w-5 h-5 text-purple-400" />
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Listagem de Pedidos */}
      <motion.div variants={item} className="glass-card rounded-[20px] border-white/10 overflow-hidden shadow-2xl bg-white/[0.01]">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-white/[0.03] border-b border-white/5 text-muted-foreground/60 text-[11px] font-bold uppercase tracking-[0.1em]">
                <th className="px-6 py-4 text-left w-[40px]"></th>
                <th className="px-6 py-4 text-left">Pedido / Cliente</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-5 text-right">Valor Total</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {isLoading ? (
                Array(5).fill(0).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={5} className="px-6 py-8"><div className="h-4 bg-white/5 rounded w-full"></div></td>
                  </tr>
                ))
              ) : (
                <AnimatePresence mode="popLayout">
                  {filteredOrders?.map((order) => (
                    <motion.tr
                      key={order.id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="hover:bg-white/[0.03] transition-all group/row border-l-2 border-l-transparent hover:border-l-primary/40"
                      onClick={() => setSelectedOrder(order)}
                    >
                      <td className="px-6 py-5" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedIds.includes(order.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedIds([...selectedIds, order.id]);
                            } else {
                              setSelectedIds(selectedIds.filter(id => id !== order.id));
                            }
                          }}
                          className="border-white/20 data-[state=checked]:bg-primary rounded-md"
                        />
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-4">
                          <Avatar className="h-10 w-10 rounded-xl border border-white/10 shadow-sm transition-transform group-hover/row:scale-105 duration-500">
                            <AvatarImage src={order.profile?.avatar_url} />
                            <AvatarFallback className="bg-primary/20 text-primary font-bold uppercase text-[10px]">
                              {(order.customer_name || order.profile?.name || "U").slice(0, 2)}
                            </AvatarFallback>
                          </Avatar>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-bold text-[14px] text-white/90 leading-tight group-hover/row:text-primary transition-colors">
                                {order.customer_name || order.profile?.name || "Sem nome"}
                              </p>
                              <span className="text-[10px] font-mono text-white/30 truncate hidden sm:inline">#{order.id.slice(0, 8)}</span>
                            </div>
                            <div className="flex items-center gap-2 mt-1 text-[12px] text-muted-foreground group-hover/row:text-white/60 transition-colors">
                              <span className="flex items-center gap-1">
                                <span className="w-3 h-3 opacity-30 rounded-full bg-white/5" />
                                {order.customer_email || order.profile?.email}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-center">
                        <StatusBadge status={order.status} />
                      </td>
                      <td className="px-6 py-5 text-right font-black text-white text-[15px] tracking-tight">
                        {formatCurrency(order.total_amount)}
                      </td>
                      <td className="px-6 py-5 text-right">
                        <div className="flex items-center justify-end gap-2 z-20">
                          <Button
                            variant="ghost" size="icon"
                            onClick={(e) => { e.stopPropagation(); setSelectedOrder(order); }}
                            className="w-10 h-10 rounded-xl hover:bg-primary/20 hover:text-primary border border-white/5 hover:border-primary/20 transition-all shadow-lg relative z-50 bg-white/5 text-white"
                          >
                            <Eye className="w-5 h-5" />
                          </Button>
                          <Button
                            variant="ghost" size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeletingOrderId(order.id);
                              setDeleteDialogOpen(true);
                            }}
                            className="w-10 h-10 rounded-xl hover:bg-red-500/20 text-red-500 hover:text-red-500 border border-white/5 transition-all shadow-lg relative z-50 bg-white/5 text-white"
                          >
                            <Trash2 className="w-5 h-5" />
                          </Button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Mensagem quando não há pedidos */}
      {!isLoading && filteredOrders?.length === 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-20 text-center glass-card rounded-[20px] border-white/10 border-dashed">
          <ShoppingCart className="w-12 h-12 text-white/10 mx-auto mb-4" />
          <p className="text-muted-foreground font-bold text-lg">Nenhum pedido encontrado para os filtros aplicados.</p>
          <Button variant="link" onClick={() => { setSearchTerm(""); setStatusFilter("all"); }} className="text-primary mt-2">Limpar Tudo</Button>
        </motion.div>
      )}

      {/* Modal de Detalhes */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="glass-card border-white/10 rounded-[24px] max-w-2xl p-0 overflow-hidden bg-black/95 backdrop-blur-2xl">
          {selectedOrder && (
            <>
              <DialogHeader className="px-8 py-6 border-b border-white/5 bg-white/[0.01]">
                <div className="flex items-center gap-5">
                  <Avatar className="w-16 h-16 rounded-[16px] border border-white/10 shadow-2xl">
                    <AvatarImage src={selectedOrder.profile?.avatar_url} />
                    <AvatarFallback className="bg-primary/20 text-primary text-[20px] font-black uppercase">
                      {(selectedOrder.customer_name || selectedOrder.profile?.name || "U").slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="text-left">
                    <DialogTitle className="text-[22px] font-black text-white tracking-tight uppercase">
                      {selectedOrder.customer_name || selectedOrder.profile?.name || "Cliente"}
                    </DialogTitle>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="text-muted-foreground text-[14px] flex items-center gap-1.5"><span className="w-3.5 h-3.5 opacity-40 rounded-full bg-white/5" />{selectedOrder.customer_email || selectedOrder.profile?.email}</span>
                      <span className="w-1 h-1 rounded-full bg-white/10" />
                      <span className="text-primary font-mono text-[13px] font-bold">#{selectedOrder.id.slice(0, 12)}</span>
                    </div>
                  </div>
                </div>
              </DialogHeader>

              <div className="p-8 space-y-8 max-h-[60vh] overflow-y-auto scrollbar-styled">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-5 rounded-[16px] bg-white/[0.02] border border-white/5">
                    <span className="text-[11px] text-muted-foreground uppercase font-black tracking-widest block mb-2">Status do Pedido</span>
                    <StatusBadge status={selectedOrder.status} />
                  </div>
                  <div className="p-5 rounded-[16px] bg-white/[0.02] border border-white/5 text-right flex flex-col items-end">
                    <span className="text-[11px] text-muted-foreground uppercase font-black tracking-widest block mb-2">Total do Checkout</span>
                    <span className="text-[24px] font-black text-white leading-none tracking-tighter">{formatCurrency(selectedOrder.total_amount)}</span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-white font-bold text-[14px] uppercase tracking-wider">
                    <Package className="w-4 h-4 text-primary" />
                    Composição do Carrinho
                  </div>
                  <div className="space-y-3">
                    {selectedOrder.order_items?.map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-4 bg-white/[0.01] border border-white/5 rounded-[14px]">
                        <div className="flex items-center gap-4">
                          <div className="w-11 h-11 rounded-[12px] bg-white/[0.03] border border-white/5 flex items-center justify-center">
                            <Package className="w-5 h-5 text-white/20" />
                          </div>
                          <div>
                            <div className="font-bold text-white text-[14px] underline decoration-primary/20 underline-offset-4">{item.product?.name || "Item Adquirido"}</div>
                            <div className="text-[12px] text-muted-foreground mt-1 font-bold">QTD: {item.quantity} × {formatCurrency(item.unit_amount)}</div>
                          </div>
                        </div>
                        <div className="font-black text-white text-[14px]">{formatCurrency(item.unit_amount * item.quantity)}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-white/10">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-white font-bold text-[14px] uppercase tracking-wider">
                      <DollarSign className="w-4 h-4 text-primary" />
                      Gateway / Pagamento
                    </div>
                    {selectedOrder.payments?.map((payment) => (
                      <div key={payment.id} className="bg-white/[0.02] border border-white/5 p-4 rounded-[14px] flex flex-col gap-3">
                        <Badge variant="outline" className="w-fit bg-primary/10 text-primary border-primary/20 text-[10px] uppercase font-black">
                          {payment.payment_method_type === 'pix' ? 'PIX' : 'CARTÃO DE CRÉDITO'}
                        </Badge>
                        <div className="text-[11px] font-mono text-white/30 truncate bg-black/40 p-2 rounded-lg border border-white/5">
                          EXT_ID: {payment.external_payment_id}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-white font-bold text-[14px] uppercase tracking-wider">
                      <Calendar className="w-4 h-4 text-primary" />
                      Data da Transação
                    </div>
                    <div className="bg-white/[0.02] border border-white/5 p-4 rounded-[14px]">
                      <div className="text-[18px] font-black text-white leading-tight uppercase tracking-widest">
                        {format(new Date(selectedOrder.created_at), "dd MMM yyyy", { locale: ptBR })}
                      </div>
                      <div className="text-[14px] text-muted-foreground mt-1 font-bold">
                        Horário: {format(new Date(selectedOrder.created_at), "HH:mm 'hs'", { locale: ptBR })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <DialogFooter className="p-8 border-t border-white/5 bg-white/[0.01]">
                <Button onClick={() => setSelectedOrder(null)} className="h-[48px] px-8 glass-card border-white/10 hover:bg-white/5 rounded-[12px] text-white font-black uppercase tracking-widest bg-transparent flex-1 sm:flex-none">
                  Fechar Detalhes
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation - Premium Red */}
      <ConfirmDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          setDeleteDialogOpen(open);
          if (!open) setDeletingOrderId(null);
        }}
        onConfirm={() => {
          if (deletingOrderId) {
            deleteMutation.mutate(deletingOrderId, {
              onSettled: () => {
                setDeleteDialogOpen(false);
                setDeletingOrderId(null);
              }
            });
          }
        }}
        title="EXCLUIR REGISTRO"
        description={`Atenção: A transação #${deletingOrderId?.slice(0, 8)} será removida permanentemente. Esta ação não poderá ser revertida.`}
        confirmLabel="Excluir Transação"
        isPending={deleteMutation.isPending}
      />
      <ConfirmDeleteDialog
        open={bulkDeleteDialogOpen}
        onOpenChange={setBulkDeleteDialogOpen}
        onConfirm={() => {
          deleteMultipleMutation.mutate(selectedIds, {
            onSettled: () => setBulkDeleteDialogOpen(false)
          });
        }}
        title="AÇÃO EM MASSA"
        description={`Você selecionou ${selectedIds.length} pedidos para exclusão definitiva. Deseja continuar?`}
        confirmLabel={`Excluir ${selectedIds.length} Pedidos`}
        isPending={deleteMultipleMutation.isPending}
      />
    </motion.div>
  );
}

const Mail = ({ className, ...props }: any) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
  </svg>
);