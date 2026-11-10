import { LayoutDashboard, User, LogOut, GraduationCap, Trophy, Flame, Headphones, ChevronLeft, ChevronRight } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePlatformSettingsContext } from "@/components/PlatformSettingsProvider";
import { useGamification } from "@/hooks/useGamification";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";

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

const navigationItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Meu Perfil", url: "/perfil", icon: User },
  { title: "Ranking Global", url: "/ranking", icon: Trophy },
];

interface ClientSidebarProps {
  showUserInfo?: boolean;
}

export function ClientSidebar({ showUserInfo = false }: ClientSidebarProps) {
  const { state, toggleSidebar } = useSidebar();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { settings } = usePlatformSettingsContext();
  const { userStats, getXpProgress } = useGamification();
  const collapsed = state === "collapsed";
  const xpProgress = getXpProgress();

  // Fetch user profile
  const { data: profile } = useQuery({
    queryKey: ["userProfile", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from("profiles")
        .select("name, avatar_url")
        .eq("id", user.id)
        .single();
      return data;
    },
    enabled: !!user,
  });

  // Check if user is admin
  const { data: isAdmin } = useQuery({
    queryKey: ["isAdmin", user?.id],
    queryFn: async () => {
      if (!user) return false;
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();
      return !!data;
    },
    enabled: !!user,
  });

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  const isActive = (path: string) => {
    if (path === "/dashboard") {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  // Get user initials for avatar fallback
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-white/[0.1] bg-sidebar/95 backdrop-blur-md">
      {/* Header with Logo */}
      <SidebarHeader className="border-b border-white/[0.1] px-4 py-4">
        <div className={`flex items-center gap-2.5 ${settings.logo_display_mode === 'horizontal' ? 'justify-center w-full' : ''}`}>
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
              <AvatarImage src={profile?.avatar_url || ""} alt={profile?.name || "Usuário"} />
              <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                {profile?.name ? getInitials(profile.name) : "U"}
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
                <AvatarImage src={profile?.avatar_url || ""} alt={profile?.name || "Usuário"} />
                <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                  {profile?.name ? getInitials(profile.name) : "U"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm text-foreground leading-tight truncate">
                  {profile?.name || "Usuário"}
                </p>
                <p className="text-[10px] text-white/40 truncate">{user?.email || "Aluno"}</p>
              </div>
              <button
                onClick={toggleSidebar}
                className="h-7 w-7 shrink-0 rounded-lg bg-white/5 hover:bg-white/10 border border-white/[0.08] flex items-center justify-center text-white/60 transition-colors"
                aria-label="Recolher sidebar"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            </div>

            {/* Gamification compact */}
            <div className="mt-2.5 pt-2.5 border-t border-white/[0.06] space-y-1.5">
              <div className="flex items-center justify-between text-[10px] font-medium">
                <span className="flex items-center gap-1 font-bold text-amber-500">
                  <Trophy className="h-3 w-3" />
                  Nível {userStats?.level || 1}
                </span>
                <span className="text-white/40">
                  {xpProgress.current}/{xpProgress.required} XP
                </span>
                <span className="flex items-center gap-1 font-bold text-orange-500">
                  <Flame className="h-3 w-3" />
                  {userStats?.current_streak || 0}d
                </span>
              </div>
              <Progress value={xpProgress.percentage} className="h-1" />
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] font-bold uppercase tracking-widest text-white/40 px-3">
            Navegação
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => {
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
                        end={item.url === "/dashboard"}
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
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Admin Section */}
        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-[10px] font-bold uppercase tracking-widest text-white/40 px-3">
              Administração
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    tooltip={collapsed ? "Admin Panel" : undefined}
                    className={
                      isActive("/admin")
                        ? "bg-primary text-primary-foreground shadow-md hover:bg-primary hover:text-primary-foreground"
                        : "text-white/50 hover:text-white hover:bg-white/5"
                    }
                  >
                    <NavLink
                      to="/admin"
                      className="flex items-center gap-2"
                    >
                      <Headphones className="h-4 w-4" />
                      {!collapsed && <span>Admin Panel</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      {/* Footer with Sign Out */}
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
