import {
  LayoutDashboard,
  BookOpen,
  Users,
  Settings,
  Palette,
  Plus,
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
  CreditCard,
  Award
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { usePlatformSettingsContext } from "@/components/PlatformSettingsProvider";

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

// Gerenciamento Área de Membros
const membersAreaItems = [
  { title: "Dashboard", url: "/admin", icon: LayoutDashboard },
  { title: "Carrosséis", url: "/admin/carrosseis", icon: Plus },
  { title: "Cursos", url: "/admin/cursos", icon: BookOpen },
  { title: "Alunos", url: "/admin/alunos", icon: Users },
  { title: "Comentários", url: "/admin/comentarios", icon: MessageSquare },
  { title: "Certificados", url: "/admin/certificados", icon: Award },
  { title: "Personalização", url: "/admin/personalizacao", icon: Palette },
  { title: "Design Sandbox", url: "/admin/sandbox", icon: Layers },
];

// Gerenciamento de Pagamento
const paymentItems = [
  { title: "Vendas", url: "/admin/vendas", icon: CreditCard },
  { title: "Pedidos", url: "/admin/pedidos", icon: ShoppingCart },
  { title: "Clientes", url: "/admin/clientes", icon: Users },
  { title: "Produtos", url: "/admin/produtos", icon: Package },
  { title: "Checkout", url: "/admin/checkout", icon: ShoppingCart },
  { title: "Orderbump", url: "/admin/orderbump", icon: Layers },
  { title: "Webhooks", url: "/admin/webhooks", icon: Webhook },
  { title: "Gateways", url: "/admin/gateways", icon: CreditCard },
];

// Gerenciamento de Notificações
const notificationItems = [
  { title: "Notificações", url: "/admin/notificacoes", icon: Bell },
  { title: "Emails", url: "/admin/emails", icon: Mail },
  { title: "WhatsApp", url: "/admin/whatsapp", icon: MessageCircle },
];

export function AdminSidebar() {
  const { state, isMobile } = useSidebar();
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { settings } = usePlatformSettingsContext();
  // Em mobile, sempre mostrar expandido (com nomes)
  const collapsed = isMobile ? false : state === "collapsed";

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

  const renderMenuItems = (items: typeof membersAreaItems) => (
    <SidebarMenu>
      {items.map((item) => (
        <SidebarMenuItem key={item.title}>
          <SidebarMenuButton
            asChild
            isActive={isActive(item.url)}
            tooltip={collapsed ? item.title : undefined}
          >
            <NavLink
              to={item.url}
              end={item.url === "/admin"}
              className="flex items-center gap-2"
              activeClassName="bg-muted"
            >
              <item.icon className="h-4 w-4" />
              {!collapsed && <span>{item.title}</span>}
            </NavLink>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );

  return (
    <Sidebar collapsible={isMobile ? "offcanvas" : "icon"} className="border-r border-white/5 bg-sidebar/95 backdrop-blur-sm">
      {/* Header with Logo */}
      <SidebarHeader className="border-b border-white/5 px-4 py-4">
        <div className={`flex items-center gap-2 ${settings.logo_display_mode === 'horizontal' ? 'justify-center w-full' : ''}`}>
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
                  className="h-6 w-6 object-contain"
                />
              ) : (
                <GraduationCap className="h-6 w-6 text-primary" />
              )}
              {!collapsed && (
                <span className="font-semibold text-foreground">
                  {settings.logo_text || "EduStream"}
                </span>
              )}
            </>
          )}
        </div>
      </SidebarHeader>

      {/* Navigation */}
      <SidebarContent>
        {/* Back to Client Area */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  tooltip={collapsed ? "Área do Aluno" : undefined}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <NavLink
                    to="/dashboard"
                    className="flex items-center gap-2"
                  >
                    <Home className="h-4 w-4" />
                    {!collapsed && <span>Área do Aluno</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Gerenciamento Área de Membros */}
        <SidebarGroup>
          <SidebarGroupLabel>Área de Membros</SidebarGroupLabel>
          <SidebarGroupContent>
            {renderMenuItems(membersAreaItems)}
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Gerenciamento de Pagamento */}
        <SidebarGroup>
          <SidebarGroupLabel>Pagamento</SidebarGroupLabel>
          <SidebarGroupContent>
            {renderMenuItems(paymentItems)}
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Gerenciamento de Notificações */}
        <SidebarGroup>
          <SidebarGroupLabel>Notificações</SidebarGroupLabel>
          <SidebarGroupContent>
            {renderMenuItems(notificationItems)}
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer with Sign Out */}
      <SidebarFooter className="border-t border-white/5 p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={handleLogout}
              tooltip={collapsed ? "Sair" : undefined}
              className="text-muted-foreground hover:text-foreground hover:bg-muted"
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


