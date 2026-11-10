import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  BookOpen,
  Users,
  BarChart3,
  Settings,
  LogOut,
  Crown,
  Webhook,
  LayoutGrid,
  Tags,
  Menu,
  UsersRound,
  Megaphone,
  Trophy,
  MessagesSquare,
  Zap,
  ChevronDown,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useState } from "react";

const menuGroups = [
  {
    label: "Conteúdo",
    items: [
      { icon: LayoutDashboard, label: "Dashboard", path: "/admin" },
      { icon: BookOpen, label: "Cursos", path: "/admin/courses" },
      { icon: Users, label: "Alunos", path: "/admin/students" },
      { icon: Tags, label: "Categorias & Tags", path: "/admin/categories" },
      { icon: LayoutGrid, label: "Vitrine", path: "/admin/showcase-config" },
    ]
  },
  // TODO: Seção Comunidade - descomentada quando implementarmos no futuro
  // {
  //   label: "Comunidade",
  //   items: [
  //     { icon: UsersRound, label: "Comunidade", path: "/admin/community" },
  //     { icon: MessagesSquare, label: "Fórum", path: "/admin/forum", comingSoon: true },
  //     { icon: Trophy, label: "Gamificação", path: "/admin/gamification", comingSoon: true },
  //   ]
  // },
  {
    label: "Ferramentas",
    items: [
      // TODO: Itens para implementar no futuro
      // { icon: Megaphone, label: "Marketing", path: "/admin/marketing", comingSoon: true },
      // { icon: Zap, label: "Automações", path: "/admin/automations", comingSoon: true },
      { icon: BarChart3, label: "Vendas", path: "/admin/sales" },
      { icon: Webhook, label: "Integrações", path: "/admin/webhooks" },
      // { icon: TrendingUp, label: "Analytics", path: "/admin/webhook-analytics" },
    ]
  },
  {
    label: "Sistema",
    items: [
      { icon: Settings, label: "Configurações", path: "/admin/settings" },
    ]
  },
];

export function AdminSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, signOut } = useSupabaseAuth();
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  
  // Controla quais grupos estão abertos (inicializa com o grupo da rota atual)
  const [openGroups, setOpenGroups] = useState<string[]>(() => {
    const currentGroup = menuGroups.find(group => 
      group.items.some(item => location.pathname === item.path)
    );
    return currentGroup ? [currentGroup.label] : ["Conteúdo"];
  });

  const toggleGroup = (label: string) => {
    setOpenGroups(prev => 
      prev.includes(label) 
        ? prev.filter(g => g !== label) 
        : [...prev, label]
    );
  };

  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    await signOut();
    navigate("/");
    setOpen(false);
  };

  const SidebarContent = () => (
    <>
      {/* Logo */}
      <div className="flex items-center gap-3 p-6 border-b border-border/50">
        <div className="p-2 rounded-xl bg-primary/20">
          <Crown className="h-6 w-6 text-primary" />
        </div>
        <span className="text-xl font-bold text-foreground">MemberHero</span>
      </div>

      {/* Admin Info */}
      <div className="flex items-center gap-3 p-4 border-b border-border/50">
        <Avatar className="h-10 w-10 border-2 border-primary/30">
          <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.name} />
          <AvatarFallback className="bg-primary/20 text-primary">
            {profile?.name?.charAt(0) || "A"}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">
            {profile?.name || "Administrador"}
          </p>
          <p className="text-xs text-muted-foreground truncate">
            {profile?.email || "admin@memberhero.com"}
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {menuGroups.map((group) => {
          const isOpen = openGroups.includes(group.label);
          const hasActiveItem = group.items.some(item => location.pathname === item.path);
          
          return (
            <Collapsible 
              key={group.label} 
              open={isOpen} 
              onOpenChange={() => toggleGroup(group.label)}
            >
              <CollapsibleTrigger className="flex items-center justify-between w-full px-4 py-2 rounded-xl hover:bg-white/5 transition-colors">
                <span className={cn(
                  "text-xs font-semibold uppercase tracking-wider",
                  hasActiveItem ? "text-primary" : "text-muted-foreground/60"
                )}>
                  {group.label}
                </span>
                <ChevronDown className={cn(
                  "h-4 w-4 text-muted-foreground transition-transform duration-200",
                  isOpen && "rotate-180"
                )} />
              </CollapsibleTrigger>
              
              <CollapsibleContent className="space-y-1 mt-1">
                {group.items.map((item) => {
                  const isActive = location.pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setOpen(false)}
                      className={cn(
                        "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200",
                        isActive
                          ? "bg-primary/20 text-primary"
                          : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                      )}
                    >
                      <item.icon className={cn("h-5 w-5", isActive && "text-primary")} />
                      <span className="font-medium">{item.label}</span>
                      {'comingSoon' in item && item.comingSoon && (
                        <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-primary/20 text-primary font-medium whitespace-nowrap">
                          Em breve
                        </span>
                      )}
                    </Link>
                  );
                })}
              </CollapsibleContent>
            </Collapsible>
          );
        })}
      </nav>

      {/* Bottom Actions */}
      <div className="p-4 border-t border-border/50">
        <Button
          variant="ghost"
          onClick={handleLogout}
          className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground hover:bg-white/5"
        >
          <LogOut className="h-5 w-5" />
          Sair
        </Button>
      </div>
    </>
  );

  // Mobile version with Sheet
  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="fixed top-4 left-4 z-50 md:hidden glass-card hover:bg-white/10"
          >
            <Menu className="h-6 w-6" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-72 p-0 glass-card border-border/50 overflow-y-auto">
          <div className="flex h-full flex-col overflow-y-auto">
            <SidebarContent />
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  // Desktop version
  return (
    <aside className="hidden md:flex fixed left-0 top-0 z-40 h-screen w-72 glass-card border-r border-border/50 flex-col">
      <SidebarContent />
    </aside>
  );
}
