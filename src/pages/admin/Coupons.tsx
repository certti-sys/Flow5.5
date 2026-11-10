import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { Plus, Tag, Edit, Trash2, TrendingUp, CheckCircle, XCircle, Clock } from "lucide-react";
import { Coupon } from "@/features/coupons/types";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { AdminCouponFormDialog } from "@/features/coupons/components/AdminCouponFormDialog";

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
};

const itemAnim = {
  hidden: { y: 20, opacity: 0 },
  show: { y: 0, opacity: 1 }
};

const CouponStatCard = ({ title, value, icon: Icon, colorClass }: any) => (
  <Card className="glass-card p-6 relative overflow-hidden group border-white/5 hover:border-white/10 transition-all duration-500 rounded-[20px] bg-white/[0.01]">
    <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-[100px] -mr-32 -mt-32 opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
    <div className="relative z-10">
      <div className="flex items-center gap-3 relative z-10">
        <div className={cn("p-2.5 rounded-[12px] bg-white/[0.03] border border-white/5", colorClass)}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex flex-col">
          <span className="text-[12px] font-bold text-muted-foreground uppercase tracking-wider">{title}</span>
          <h3 className="text-[22px] font-black text-white leading-none mt-1 uppercase tracking-tighter">{value}</h3>
        </div>
      </div>
    </div>
  </Card>
);

export default function AdminCouponsPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);

  const { data: coupons = [], isLoading } = useQuery({
    queryKey: ["admin-coupons"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coupons")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Coupon[];
    }
  });

  const { data: products = [] } = useQuery({
    queryKey: ["admin-coupon-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name")
        .order("name", { ascending: true });
      if (error) throw error;
      return data;
    }
  });

  const filteredCoupons = useMemo(() => {
    if (!searchTerm) return coupons;
    const term = searchTerm.toLowerCase();
    return coupons.filter(coupon => coupon.code.toLowerCase().includes(term));
  }, [coupons, searchTerm]);

  const stats = useMemo(() => {
    const total = coupons.length;
    const active = coupons.filter(c => c.is_active).length;
    const expired = coupons.filter(c => c.valid_until && new Date(c.valid_until) < new Date()).length;
    const used = coupons.reduce((acc, c) => acc + c.uses_count, 0);
    return { total, active, expired, used };
  }, [coupons]);

  const deleteCouponMutation = useMutation({
    mutationFn: async (couponId: string) => {
      const { error } = await supabase.from("coupons").delete().eq("id", couponId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Cupom removido com sucesso");
      queryClient.invalidateQueries({ queryKey: ["admin-coupons"] });
    },
    onError: (error: any) => toast.error(error.message || "Erro ao remover cupom")
  });

  const handleDelete = (couponId: string) => {
    deleteCouponMutation.mutate(couponId);
  };

  if (isLoading) {
    return (
      <div className="space-y-6 pb-20">
        <AdminHeader
          title="Gestão de Cupons"
          description="Crie, edite e monitore cupons de desconto da plataforma."
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder="Buscar por código do cupom..."
        />
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-6 pb-20"
    >
      <AdminHeader
        title="Gestão de Cupons"
        description="Crie, edite e monitore cupons de desconto da plataforma."
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Buscar por código do cupom..."
        actionButton={
          <Button
            onClick={() => setDialogOpen(true)}
            className="gradient-primary shadow-glow h-[44px] px-6 rounded-[12px] font-bold text-[13px] tracking-tight gap-2"
          >
            <Plus className="w-4 h-4" />
            Novo Cupom
          </Button>
        }
      />

      <motion.div
        variants={itemAnim}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        <CouponStatCard title="Total de Cupons" value={stats.total} icon={Tag} colorClass="text-primary" />
        <CouponStatCard title="Cupons Ativos" value={stats.active} icon={CheckCircle} colorClass="text-green-400" />
        <CouponStatCard title="Expirados" value={stats.expired} icon={XCircle} colorClass="text-red-400" />
        <CouponStatCard title="Usos Totais" value={stats.used} icon={TrendingUp} colorClass="text-blue-400" />
      </motion.div>

      <div className="glass-card rounded-[20px] border-white/10 overflow-hidden shadow-2xl bg-white/[0.01]">
        <div className="p-6 border-b border-white/5">
          <h2 className="text-[16px] font-black uppercase tracking-wider">Todos os Cupons</h2>
        </div>
        <div className="overflow-x-auto p-4">
          <table className="w-full">
            <thead className="bg-white/[0.02]">
              <tr>
                <th className="px-6 py-4 text-left text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Código</th>
                <th className="px-6 py-4 text-left text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Tipo</th>
                <th className="px-6 py-4 text-left text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Valor</th>
                <th className="px-6 py-4 text-left text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Validade</th>
                <th className="px-6 py-4 text-left text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Uso</th>
                <th className="px-6 py-4 text-left text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-right text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredCoupons.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center">
                        <Tag className="w-10 h-10 text-muted-foreground/30" />
                      </div>
                      <p className="text-muted-foreground text-sm">Nenhum cupom encontrado</p>
                      <Button onClick={() => setDialogOpen(true)} variant="outline" className="gap-2 h-10 px-6 rounded-[12px] font-bold text-[12px]">
                        <Plus className="w-4 h-4" />
                        Criar primeiro cupom
                      </Button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredCoupons.map((coupon) => (
                  <tr key={coupon.id} className="motion.tr hover:bg-white/[0.03] transition-all group/row border-l-2 border-l-transparent hover:border-l-primary/40">
                    <td className="px-6 py-4 font-mono text-[13px] font-bold text-primary">
                      {coupon.code}
                    </td>
                    <td className="px-6 py-4 text-[13px]">
                      {coupon.discount_type === 'percent' ? 'Percentual' : 'Fixo'}
                    </td>
                    <td className="px-6 py-4 text-[13px] font-bold text-white">
                      {coupon.discount_type === 'percent' ? `${coupon.discount_value}%` : `R$ ${coupon.discount_value}`}
                    </td>
                    <td className="px-6 py-4 text-[13px] text-muted-foreground">
                      {coupon.valid_until ? new Date(coupon.valid_until).toLocaleDateString('pt-BR') : '—'}
                    </td>
                    <td className="px-6 py-4 text-[13px] text-white">
                      {coupon.uses_count} / {coupon.max_uses || '∞'}
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant="outline" className={cn("rounded-full px-2.5 py-0.5 font-bold text-[10px] uppercase tracking-wider border-white/5",
                        coupon.is_active ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'
                      )}>
                        {coupon.is_active ? <CheckCircle className="w-3 h-3 mr-1.5" /> : <XCircle className="w-3 h-3 mr-1.5" />}
                        {coupon.is_active ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 z-20">
                        <Button variant="ghost" size="icon" onClick={() => { setEditingCoupon(coupon); setDialogOpen(true); }} className="w-10 h-10 rounded-xl hover:bg-primary/20 hover:text-primary border border-white/5 hover:border-primary/20 transition-all shadow-lg relative z-50 bg-white/5 text-white">
                          <Edit className="w-5 h-5" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(coupon.id)} className="w-10 h-10 rounded-xl hover:bg-red-500/20 text-red-500 hover:text-red-500 border border-white/5 transition-all shadow-lg relative z-50 bg-white/5 text-white">
                          <Trash2 className="w-5 h-5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AdminCouponFormDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditingCoupon(null);
        }}
        coupon={editingCoupon}
        products={products as any}
      />
    </motion.div>
  );
}