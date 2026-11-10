import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import {
  Users, Eye, RefreshCw, Mail, Phone,
  ShoppingCart, Link2, Trash2, TrendingUp, UserCheck, Clock
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { AdminHeader } from "@/components/admin/AdminHeader";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Customer {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  cpf: string | null;
  user_id: string | null;
  source: string;
  created_at: string;
}

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05
    }
  }
};

const item = {
  hidden: { y: 20, opacity: 0 },
  show: { y: 0, opacity: 1 }
};

export default function Customers() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
  const queryClient = useQueryClient();

  const { data: customers, isLoading, refetch } = useQuery({
    queryKey: ["admin-customers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("customer_email, customer_name, customer_phone, customer_cpf, user_id, created_at, total_amount")
        .not("customer_email", "is", null)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const customersMap = new Map<string, any>();
      data?.forEach((order) => {
        if (order.customer_email) {
          const existing = customersMap.get(order.customer_email);
          if (!existing) {
            customersMap.set(order.customer_email, {
              id: order.customer_email,
              email: order.customer_email,
              name: order.customer_name,
              phone: order.customer_phone,
              cpf: order.customer_cpf,
              user_id: order.user_id,
              source: 'checkout',
              created_at: order.created_at,
              total_spent: order.total_amount || 0,
              orders_count: 1
            });
          } else {
            existing.total_spent += (order.total_amount || 0);
            existing.orders_count += 1;
          }
        }
      });

      return Array.from(customersMap.values());
    }
  });

  const { data: customerOrders } = useQuery({
    queryKey: ["customer-orders", selectedCustomer?.email],
    queryFn: async () => {
      if (!selectedCustomer?.email) return [];
      const { data, error } = await supabase
        .from("orders")
        .select(`
          id, status, total_amount, created_at,
          order_items(product:products(name))
        `)
        .eq("customer_email", selectedCustomer.email)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!selectedCustomer?.email
  });

  const linkUserMutation = useMutation({
    mutationFn: async ({ email }: { email: string }) => {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", email)
        .limit(1);

      if (!profiles || profiles.length === 0) {
        throw new Error("Nenhum usuário encontrado com este email");
      }

      const { error } = await supabase
        .from("orders")
        .update({ user_id: profiles[0].id })
        .eq("customer_email", email);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Cliente vinculado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["admin-customers"] });
    },
    onError: (e: any) => toast.error(e.message)
  });

  const deleteMutation = useMutation({
    mutationFn: async (email: string) => {
      const { error: orderError } = await supabase
        .from("orders")
        .delete()
        .eq("customer_email", email);
      if (orderError) throw orderError;
    },
    onSuccess: () => {
      toast.success("Cliente excluído com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["admin-customers"] });
      setCustomerToDelete(null);
    },
    onError: (error: any) => {
      toast.error("Erro ao excluir cliente: " + error.message);
    }
  });

  const filteredCustomers = customers?.filter(c => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      c.email.toLowerCase().includes(term) ||
      c.name?.toLowerCase().includes(term) ||
      c.phone?.includes(term)
    );
  });

  const stats = {
    total: customers?.length || 0,
    linked: customers?.filter(c => c.user_id).length || 0,
    avgTicket: customers?.length ? (customers.reduce((acc, c) => acc + c.total_spent, 0) / customers.length) : 0
  };

  const formatCurrency = (amount: number) => {
    return `R$ ${(amount / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  };

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-6 pb-20"
    >
      <AdminHeader
        title="Gestão de Clientes"
        description="Visualize e gerencie as pessoas que compram seus produtos."
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Buscar por nome, e-mail ou telefone..."
        actionButton={
          <Button
            onClick={() => refetch()}
            variant="outline"
            className="glass-card border-white/10 hover:bg-white/5 text-white shadow-glow-sm h-[44px] px-5 rounded-[12px] font-bold text-[13px] tracking-tight"
          >
            <RefreshCw className={cn("w-4 h-4 mr-2", isLoading && "animate-spin")} />
            Sincronizar
          </Button>
        }
      />

      {/* Bento Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {[
          { label: "Total de Clientes", value: stats.total, icon: Users, color: "primary" },
          { label: "Contas Vinculadas", value: stats.linked, icon: UserCheck, color: "green" },
          { label: "LTV Médio", value: formatCurrency(stats.avgTicket), icon: TrendingUp, color: "blue" }
        ].map((stat, i) => (
          <motion.div
            key={i}
            variants={item}
            className="glass-card p-6 rounded-[24px] border-white/5 bg-white/[0.01] relative overflow-hidden group"
          >
            <div className={cn(
              "absolute -right-4 -top-4 w-24 h-24 rounded-full blur-3xl opacity-10 transition-opacity group-hover:opacity-20",
              stat.color === "primary" ? "bg-primary" : stat.color === "green" ? "bg-emerald-500" : "bg-blue-500"
            )} />
            <div className="relative z-10 flex items-center gap-4">
              <div className={cn(
                "w-12 h-12 rounded-2xl flex items-center justify-center border border-white/5 shadow-inner",
                stat.color === "primary" ? "bg-primary/10 text-primary" : stat.color === "green" ? "bg-emerald-500/10 text-emerald-500" : "bg-blue-500/10 text-blue-500"
              )}>
                <stat.icon className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[12px] font-bold uppercase tracking-wider text-muted-foreground/60">{stat.label}</p>
                <h3 className="text-2xl font-black text-white mt-0.5">{stat.value}</h3>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Customers List */}
      <div className="glass-card rounded-[24px] border-white/5 overflow-hidden bg-white/[0.01]">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-white/5 bg-white/[0.02]">
                <th className="text-left px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-muted-foreground/50">Cliente</th>
                <th className="text-left px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-muted-foreground/50 hidden md:table-cell">Financeiro</th>
                <th className="text-left px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-muted-foreground/50 hidden lg:table-cell">Cadastro</th>
                <th className="text-right px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-muted-foreground/50">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              <AnimatePresence mode="popLayout">
                {filteredCustomers?.map((customer) => (
                  <motion.tr
                    key={customer.id}
                    variants={item}
                    layout
                    className="group/row hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <Avatar className="h-12 w-12 rounded-2xl border border-white/10 group-hover/row:scale-105 transition-transform duration-500">
                          <AvatarFallback className="bg-primary/20 text-primary font-black uppercase text-xs">
                            {(customer.name || customer.email).slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white group-hover/row:text-primary transition-colors truncate max-w-[180px]">
                              {customer.name || "Sem Nome"}
                            </span>
                            {customer.user_id ? (
                              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[9px] uppercase font-black px-1.5 h-4">
                                Vinculado
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-white/5 text-muted-foreground/40 border-white/5 text-[9px] uppercase font-black px-1.5 h-4">
                                Lead
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground/60 flex items-center gap-1.5 mt-0.5">
                            <Mail className="w-3 h-3 opacity-40" />
                            {customer.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 hidden md:table-cell">
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-white">{formatCurrency(customer.total_spent)}</p>
                        <p className="text-[10px] text-muted-foreground/60 uppercase tracking-tighter">
                          {customer.orders_count} {customer.orders_count === 1 ? 'pedido' : 'pedidos'}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4 hidden lg:table-cell">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground/60">
                        <Clock className="w-3 h-3 opacity-40" />
                        {format(new Date(customer.created_at), "dd MMM, yyyy", { locale: ptBR })}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2 z-20">
                        <Button
                          variant="ghost" size="icon"
                          onClick={() => setSelectedCustomer(customer)}
                          className="w-10 h-10 rounded-xl hover:bg-primary/20 hover:text-primary transition-all border border-white/5 hover:border-primary/20 shadow-lg relative z-50 bg-white/5 text-white"
                        >
                          <Eye className="w-5 h-5" />
                        </Button>
                        <Button
                          variant="ghost" size="icon"
                          onClick={() => setCustomerToDelete(customer)}
                          className="w-10 h-10 rounded-xl hover:bg-red-500/20 text-red-500 hover:text-red-500 border border-white/5 transition-all shadow-lg relative z-50 bg-white/5 text-white"
                        >
                          <Trash2 className="w-5 h-5" />
                        </Button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!selectedCustomer} onOpenChange={() => setSelectedCustomer(null)}>
        <DialogContent className="glass-card border-white/10 rounded-[32px] max-w-2xl p-0 overflow-hidden bg-black/90 backdrop-blur-3xl">
          {selectedCustomer && (
            <>
              <DialogHeader className="p-8 border-b border-white/5 bg-white/[0.02]">
                <div className="flex items-center gap-6">
                  <div className="relative group">
                    <div className="absolute inset-0 bg-primary rounded-3xl blur-2xl opacity-20 group-hover:opacity-40 transition-opacity" />
                    <Avatar className="w-20 h-20 rounded-3xl border-2 border-white/10 relative z-10 shadow-2xl">
                      <AvatarFallback className="bg-primary/10 text-primary text-2xl font-black uppercase">
                        {(selectedCustomer.name || selectedCustomer.email).slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  <div>
                    <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px] uppercase font-black tracking-widest mb-2 px-3">Cliente Profile</Badge>
                    <DialogTitle className="text-3xl font-black text-white tracking-tighter">
                      {selectedCustomer.name || "Sem Nome Definido"}
                    </DialogTitle>
                    <div className="flex items-center gap-3 mt-1.5 text-muted-foreground/80">
                      <span className="flex items-center gap-1.5 text-sm">
                        <Mail className="w-3.5 h-3.5" />
                        {selectedCustomer.email}
                      </span>
                      {selectedCustomer.phone && (
                        <>
                          <div className="w-1 h-1 rounded-full bg-white/10" />
                          <span className="flex items-center gap-1.5 text-sm">
                            <Phone className="w-3.5 h-3.5" />
                            {selectedCustomer.phone}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </DialogHeader>

              <div className="p-8 space-y-8 max-h-[60vh] overflow-y-auto scrollbar-styled">
                {/* Secondary Info Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/5 group hover:bg-white/[0.05] transition-colors">
                    <span className="text-[10px] text-muted-foreground font-black uppercase tracking-widest block mb-1">Documento CPF</span>
                    <span className="text-white font-mono font-bold tracking-widest">{selectedCustomer.cpf || "NÃO INFORMADO"}</span>
                  </div>
                  <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/5 group hover:bg-white/[0.05] transition-colors">
                    <span className="text-[10px] text-muted-foreground font-black uppercase tracking-widest block mb-1">Status da Conta</span>
                    <div className="mt-1 flex items-center justify-between">
                      {selectedCustomer.user_id ? (
                        <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                          <UserCheck className="w-4 h-4" /> Conta Ativa
                        </div>
                      ) : (
                        <Button
                          size="sm" variant="ghost"
                          className="h-7 text-[10px] font-black uppercase bg-primary/10 text-primary hover:bg-primary/20 transition-all rounded-full px-3"
                          onClick={() => linkUserMutation.mutate({ email: selectedCustomer.email })}
                        >
                          Vincular Agora
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                <Separator className="bg-white/5" />

                {/* Purchase History */}
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h4 className="text-lg font-black text-white flex items-center gap-3">
                      <div className="w-1.5 h-5 bg-primary rounded-full shadow-glow" />
                      Histórico de Consumo
                    </h4>
                    <Badge variant="outline" className="text-white bg-white/5 border-white/10 font-black px-2 py-0.5">{customerOrders?.length || 0} Itens</Badge>
                  </div>

                  <div className="space-y-3">
                    {customerOrders && customerOrders.length > 0 ? (
                      customerOrders.map((order) => (
                        <div key={order.id} className="group relative">
                          <div className="absolute inset-0 bg-primary/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
                          <div className="relative p-5 bg-white/[0.02] border border-white/5 rounded-2xl flex items-center justify-between group-hover:border-primary/20 transition-all">
                            <div className="flex items-center gap-4">
                              <div className="relative group/thumb">
                                {order.order_items?.[0]?.product?.image_url ? (
                                  <img
                                    src={order.order_items[0].product.image_url}
                                    className="w-12 h-12 rounded-xl object-cover border border-white/10 shadow-lg group-hover/row:scale-105 transition-transform duration-500"
                                    alt=""
                                  />
                                ) : (
                                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-orange-500/10 flex items-center justify-center border border-white/10 group-hover/row:scale-105 transition-transform duration-500">
                                    <ShoppingCart className="w-5 h-5 text-primary" />
                                  </div>
                                )}
                              </div>
                              <div>
                                <p className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-widest">PEDIDO #{order.id.slice(0, 8)}</p>
                                <p className="text-white font-bold text-sm mt-0.5 line-clamp-1">
                                  {order.order_items?.map(i => i.product?.name).join(", ") || "Sem produtos"}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-emerald-400 font-black text-[15px]">{formatCurrency(order.total_amount)}</p>
                              <p className="text-[10px] text-muted-foreground/60 font-bold uppercase mt-0.5">{order.status}</p>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="py-12 text-center bg-white/[0.01] rounded-3xl border border-dashed border-white/10">
                        <ShoppingCart className="w-8 h-8 text-white/5 mx-auto mb-2" />
                        <p className="text-muted-foreground text-sm">Nenhuma transação encontrada.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-8 border-t border-white/5 bg-black/40 flex items-center justify-end rounded-b-[32px]">
                <Button
                  onClick={() => setSelectedCustomer(null)}
                  className="h-12 px-10 glass-card border-white/10 hover:bg-white/10 rounded-2xl font-black uppercase tracking-widest text-[11px] text-white bg-transparent"
                >
                  Fechar Registro
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!customerToDelete} onOpenChange={() => setCustomerToDelete(null)}>
        <AlertDialogContent className="glass-card border-white/10 rounded-[28px] max-w-[460px] p-8 overflow-hidden bg-black/90 backdrop-blur-3xl">
          <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 rounded-full blur-3xl -mr-16 -mt-16" />
          <AlertDialogHeader>
            <div className="flex flex-col items-center text-center space-y-5">
              <div className="flex h-[72px] w-[72px] items-center justify-center rounded-[22px] bg-red-500/10 border border-red-500/20 shadow-glow-red">
                <Trash2 className="h-8 w-8 text-red-500" />
              </div>
              <div className="space-y-2">
                <AlertDialogTitle className="text-2xl font-black text-white tracking-tighter uppercase">Excluir Cliente?</AlertDialogTitle>
                <AlertDialogDescription className="text-sm text-muted-foreground leading-relaxed">
                  Isso apagará permanentemente o histórico de compras de <strong className="text-white">{customerToDelete?.email}</strong>. Esta ação não pode ser desfeita.
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-10 flex flex-col sm:flex-row gap-3">
            <AlertDialogCancel className="h-12 flex-1 glass-card border-white/10 hover:bg-white/5 rounded-xl font-bold uppercase tracking-widest text-[10px] mt-0 text-white bg-transparent">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => customerToDelete && deleteMutation.mutate(customerToDelete.email)}
              className="h-12 flex-1 bg-red-500 hover:bg-red-600 text-white border-0 rounded-xl font-black uppercase tracking-widest text-[10px] shadow-glow-red"
            >
              Confirmar Exclusão
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}