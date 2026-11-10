import { Card } from "@/components/ui/card";
import { motion } from "framer-motion";
import { 
  Users, 
  TrendingUp, 
  ShoppingCart, 
  ArrowUpRight,
  ChevronRight,
  Activity,
  DollarSign
} from "lucide-react";
import { Button } from "@/components/ui/button";

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
  hidden: { y: 20, opacity: 0 },
  show: { y: 0, opacity: 1 }
};

export default function DesignSandbox() {
  const stats = [
    { label: "Vendas Totais", value: "R$ 45.231,89", icon: DollarSign, trend: "+12.5%", color: "text-emerald-500" },
    { label: "Novos Alunos", value: "1,284", icon: Users, trend: "+8.2%", color: "text-blue-500" },
    { label: "Pedidos Pagos", value: "856", icon: ShoppingCart, trend: "+15.3%", color: "text-amber-500" },
    { label: "Taxa de Conversão", value: "4.2%", icon: Activity, trend: "-2.1%", color: "text-rose-500" },
  ];

  return (
    <div className="space-y-8 pb-20">
      {/* Cinematic Header - Typography aligned to DS (28px) */}
      <motion.div 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-[28px] font-semibold tracking-tight text-white leading-[36px]">Design Sandbox</h1>
          <p className="text-[14px] text-muted-foreground mt-1 leading-[22px]">
            Referência visual 1:1 do sistema "Premium Sandbox" seguindo a documentação oficial.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="glass-card border-white/10 hover:bg-white/5 h-[40px] px-4 rounded-[12px]">
            Refrescar Dados
          </Button>
          <Button className="gradient-primary shadow-glow hover:scale-105 transition-all h-[40px] px-6 rounded-[12px] font-medium">
            Nova Venda <ArrowUpRight className="ml-2 w-4 h-4" />
          </Button>
        </div>
      </motion.div>

      {/* Bento Grid Stats - 4 Columns */}
      <motion.div 
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-[16px]"
      >
        {stats.map((stat, i) => (
          <motion.div key={i} variants={item}>
            <Card className="glass-card p-[24px] relative overflow-hidden group border-white/10 hover:border-white/20 transition-all duration-500 rounded-[16px]">
              <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-3xl -mr-12 -mt-12 group-hover:bg-primary/10 transition-all duration-500" />
              
              <div className="flex items-center gap-[8px] mb-[16px]">
                <div className={`p-[10px] rounded-[12px] bg-black/40 border border-white/10 ${stat.color}`}>
                  <stat.icon className="w-5 h-5" />
                </div>
                <span className="text-[13px] font-medium text-muted-foreground">{stat.label}</span>
              </div>
              
              <div className="flex items-baseline justify-between">
                <h3 className="text-[24px] font-bold font-geist tracking-tighter leading-[28px]">{stat.value}</h3>
                <span className={`text-[12px] font-bold px-[8px] py-[2px] rounded-full bg-black/40 border border-white/10 ${stat.trend.startsWith('+') ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {stat.trend}
                </span>
              </div>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {/* Main Grid - 12 Columns Total */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-[24px]">
        {/* Main List Box - 8 Columns */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="lg:col-span-8 glass-card p-[24px] border-white/10 rounded-[16px]"
        >
          <div className="flex items-center justify-between mb-[24px]">
            <h2 className="text-[20px] font-semibold tracking-tight leading-[28px]">Transações Recentes</h2>
            <Button variant="ghost" size="sm" className="text-[12px] uppercase tracking-widest text-muted-foreground hover:text-white">
              Ver Tudo <ChevronRight className="ml-1 w-3 h-3" />
            </Button>
          </div>

          <div className="space-y-[12px]">
            {[1, 2, 3, 4].map((_, i) => (
              <div key={i} className="flex items-center justify-between p-[16px] rounded-[12px] bg-black/20 border border-white/10 hover:bg-white/5 transition-all group cursor-pointer">
                <div className="flex items-center gap-[16px]">
                  <div className="w-[40px] h-[40px] rounded-[10px] bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center border border-white/10 group-hover:scale-110 transition-transform">
                    <ShoppingCart className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="text-[14px] font-medium">Pedido #00{i + 1}75</h4>
                    <p className="text-[12px] text-muted-foreground">há {i + 2} horas • leandro@exemplo.com</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[14px] font-bold text-gradient">R$ 197,90</p>
                  <span className="text-[10px] uppercase tracking-tighter font-bold text-emerald-500/80">Confirmado</span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Sidebar Analytics - 4 Columns */}
        <div className="lg:col-span-4 space-y-[24px]">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="glass-card p-[24px] border-white/20 rounded-[16px] relative overflow-hidden h-full shadow-lg"
          >
            <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />
            <h2 className="text-[20px] font-semibold tracking-tight mb-[24px] relative z-10">Meta Mensal</h2>
            <div className="space-y-[24px] relative z-10">
              <div>
                <div className="flex justify-between text-[13px] mb-[8px]">
                  <span className="text-muted-foreground font-medium">Progresso</span>
                  <span className="font-bold text-primary">75%</span>
                </div>
                <div className="h-[8px] w-full bg-black/40 rounded-full overflow-hidden border border-white/10">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: "75%" }}
                    transition={{ duration: 1.5, delay: 1 }}
                    className="h-full gradient-primary" 
                  />
                </div>
              </div>
              
              <div className="p-[16px] rounded-[12px] bg-primary/10 border border-primary/20">
                <h5 className="text-[11px] font-bold uppercase tracking-widest text-primary mb-[4px]">Dica Premium</h5>
                <p className="text-[12px] text-muted-foreground leading-[18px]">
                  Aumente sua conversão aplicando Order Bumps em sessões de alta visualização.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-[16px]">
                <div className="p-[16px] rounded-[12px] bg-black/40 border border-white/10 text-center group hover:border-primary/30 transition-all">
                  <p className="text-[20px] font-bold font-geist tracking-tighter">128</p>
                  <p className="text-[10px] text-muted-foreground uppercase font-semibold">Clicks</p>
                </div>
                <div className="p-[16px] rounded-[12px] bg-black/40 border border-white/10 text-center group hover:border-primary/30 transition-all">
                  <p className="text-[20px] font-bold font-geist tracking-tighter">42</p>
                  <p className="text-[10px] text-muted-foreground uppercase font-semibold">Leads</p>
                </div>
              </div>

              <Button className="w-full h-[48px] glass-card border-white/10 hover:bg-white/10 text-[11px] uppercase tracking-widest font-bold">
                Explorar Insights
              </Button>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
