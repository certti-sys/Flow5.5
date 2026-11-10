import {
  LayoutDashboard,
  BookOpen,
  Users,
  Palette,
  Images,
  Bell,
  Webhook,
  GraduationCap,
  LogOut,
  Home,
  MessageSquare,
  Mail,
  MessageCircle,
  ShoppingCart,
  Package,
  Layers,
  Award,
  Activity,
  CreditCard,
  TrendingUp,
  UserCheck,
  Tag,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { usePlatformSettingsContext } from "@/components/PlatformSettingsProvider";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

// 1. Visão Geral
const overviewItems = [
  { title: "Dashboard", url: "/admin", icon: LayoutDashboard },
];

// 2. Acadêmico
const academicItems = [
  { title: "Carrosséis", url: "/admin/carrosseis", icon: Images },
  { title: "Cursos", url: "/admin/cursos", icon: BookOpen },
  { title: "Alunos", url: "/admin/alunos", icon: Users },
  { title: "Comentários", url: "/admin/comentarios", icon: MessageSquare },
  { title: "Certificados", url: "/admin/certificados", icon: Award },
];

// 3. Comercial
const commercialItems = [
  { title: "Vendas", url: "/admin/vendas", icon: TrendingUp },
  { title: "Pedidos", url: "/admin/pedidos", icon: ShoppingCart },
  { title: "Clientes", url: "/admin/clientes", icon: UserCheck },
  { title: "Produtos", url: "/admin/produtos", icon: Package },
  { title: "Cupons", url: "/admin/cupons", icon: Tag },
  { title: "Orderbumps", url: "/admin/orderbump", icon: Layers },
];

// 4. Canais de Comunicação
const communicationItems = [
  { title: "Notificações", url: "/admin/notificacoes", icon: Bell },
  { title: "Emails", url: "/admin/emails", icon: Mail },
  { title: "WhatsApp", url: "/admin/whatsapp", icon: MessageCircle },
];

// 5. Configurações do Sistema
const systemItems = [
  { title: "Gateways", url: "/admin/gateways", icon: CreditCard },
  { title: "Webhooks", url: "/admin/webhooks", icon: Webhook },
  { title: "Monitoramento", url: "/admin/monitoring", icon: Activity },
];

// 6. Aparência & Design
const appearanceItems = [
  { title: "Personalização", url: "/admin/personalizacao", icon: Palette },
];

export function AdminSidebar() {
  const { state, isMobile, toggleSidebar } = useSidebar();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { settings } = usePlatformSettingsContext();
  const collapsed = isMobile ? false : state === "collapsed";

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from("profiles")
        .select("name, avatar_url")
        .eq("id", user.id)
        .single();
      return data;
    },
    enabled: !!user?.id,
  });

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  const isActive = (path: string) => {
    if (path === "/admin") {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  const renderMenuItems = (items: typeof overviewItems) => (
    <SidebarMenu>
      {items.map((item) => {
        const active = isActive(item.url);
        return (
          <SidebarMenuItem key={item.title}>
            <SidebarMenuButton
              asChild
              tooltip={collapsed ? item.title : undefined}
              className={
                active
                  ? "bg-primary text-primary-foreground shadow-md hover:bg-primary hover:text-primary-foreground"
                  : "text-white/50 hover:text-white hover:bg-white/5"
              }
            >
              <NavLink
                to={item.url}
                end={item.url === "/admin"}
                className="flex items-center gap-2"
              >
                <item.icon className="h-4 w-4" />
                {!collapsed && <span>{item.title}</span>}
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );

  return (
    <Sidebar collapsible={isMobile ? "offcanvas" : "icon"} className="border-r border-white/[0.1] bg-sidebar/95 backdrop-blur-md">
      {/* Header with Logo */}
      <SidebarHeader className="border-b border-white/[0.1] px-4 py-4">
        <div className={cn("flex items-center gap-2.5", settings.logo_display_mode === 'horizontal' && "justify-center w-full")}>
          {settings.logo_display_mode === 'horizontal' && settings.logo_horizontal_url ? (
            <img
              src={settings.logo_horizontal_url}
              alt={settings.logo_text || "Logo"}
              className="h-8 w-auto object-contain"
            />
          ) : (
            <>
              {settings.logo_image_url ? (
                <img
                  src={settings.logo_image_url}
                  alt="Logo"
                  className="w-8 h-8 rounded-lg object-cover shrink-0"
                />
              ) : (
                <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center shrink-0">
                  <GraduationCap className="w-4 h-4 text-white" />
                </div>
              )}
              {!collapsed && (
                <span className="font-bold text-base text-foreground tracking-tight truncate">
                  {settings.logo_text || "EduStream"}
                </span>
              )}
            </>
          )}
        </div>
      </SidebarHeader>

      {/* User Profile Section */}
      <div className={`border-b border-white/[0.1] ${collapsed ? 'px-2 py-4' : 'px-3 py-4'}`}>
        {collapsed ? (
          <div className="relative flex justify-center">
            <Avatar className="h-10 w-10 ring-2 ring-primary/20">
              <AvatarImage src={profile?.avatar_url || ""} alt={profile?.name || "Administrador"} />
              <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                {profile?.name?.charAt(0)?.toUpperCase() || "A"}
              </AvatarFallback>
            </Avatar>
            <button
              onClick={toggleSidebar}
              className="absolute right-0 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full bg-primary text-primary-foreground shadow-md flex items-center justify-center hover:opacity-90 transition-opacity"
              aria-label="Expandir sidebar"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <div className="rounded-2xl bg-white/5 border border-white/[0.08] p-2.5">
            <div className="flex items-center gap-2.5 min-w-0">
              <Avatar className="h-11 w-11 ring-2 ring-primary/20 shrink-0">
                <AvatarImage src={profile?.avatar_url || ""} alt={profile?.name || "Administrador"} />
                <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                  {profile?.name?.charAt(0)?.toUpperCase() || "A"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm text-foreground leading-tight truncate">
                  {profile?.name || "Administrador"}
                </p>
                <p className="text-[10px] text-white/40 truncate">{user?.email || "Painel administrativo"}</p>
              </div>
              <button
                onClick={toggleSidebar}
                className="h-7 w-7 shrink-0 rounded-lg bg-white/5 hover:bg-white/10 border border-white/[0.08] flex items-center justify-center text-white/60 transition-colors"
                aria-label="Recolher sidebar"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      <SidebarContent>
        {/* Back to Client Area */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  tooltip={collapsed ? "Área do Aluno" : undefined}
                  className="text-white/50 hover:text-white hover:bg-white/5"
                >
                  <NavLink
                    to="/dashboard"
                    className="flex items-center gap-2"
                  >
                    <Home className="h-4 w-4" />
                    {!collapsed && (
                      <span>Área do Aluno</span>
                    )}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* 1. Visão Geral */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] font-bold uppercase tracking-widest text-white/40 px-3">Visão Geral</SidebarGroupLabel>
          <SidebarGroupContent>
            {renderMenuItems(overviewItems)}
          </SidebarGroupContent>
        </SidebarGroup>

        {/* 2. Acadêmico */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] font-bold uppercase tracking-widest text-white/40 px-3">Acadêmico</SidebarGroupLabel>
          <SidebarGroupContent>
            {renderMenuItems(academicItems)}
          </SidebarGroupContent>
        </SidebarGroup>

        {/* 3. Comercial */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] font-bold uppercase tracking-widest text-white/40 px-3">Comercial</SidebarGroupLabel>
          <SidebarGroupContent>
            {renderMenuItems(commercialItems)}
          </SidebarGroupContent>
        </SidebarGroup>

        {/* 6. Aparência & Design */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] font-bold uppercase tracking-widest text-white/40 px-3">Aparência & Design</SidebarGroupLabel>
          <SidebarGroupContent>
            {renderMenuItems(appearanceItems)}
          </SidebarGroupContent>
        </SidebarGroup>

        {/* 4. Canais de Comunicação */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] font-bold uppercase tracking-widest text-white/40 px-3">Canais de Comunicação</SidebarGroupLabel>
          <SidebarGroupContent>
            {renderMenuItems(communicationItems)}
          </SidebarGroupContent>
        </SidebarGroup>

        {/* 5. Configurações do Sistema */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] font-bold uppercase tracking-widest text-white/40 px-3">Configurações do Sistema</SidebarGroupLabel>
          <SidebarGroupContent>
            {renderMenuItems(systemItems)}
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-white/[0.1] p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={handleLogout}
              tooltip={collapsed ? "Sair" : undefined}
              className="text-white/50 hover:text-destructive hover:bg-destructive/10 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              {!collapsed && <span>Sair</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}


