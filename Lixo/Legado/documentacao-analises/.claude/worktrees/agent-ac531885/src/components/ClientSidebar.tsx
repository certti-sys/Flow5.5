import { LayoutDashboard, User, Settings, LogOut, GraduationCap, Trophy, Flame, Medal } from "lucide-react";
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
  const { state } = useSidebar();
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
    <Sidebar collapsible="icon" className="border-r border-white/5 bg-sidebar/95 backdrop-blur-sm">
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
                <span className="font-semibold text-foreground tracking-tight">
                  {settings.logo_text || "EduStream"}
                </span>
              )}
            </>
          )}
        </div>
      </SidebarHeader>

      {/* User Profile Section */}
      <div className={`border-b border-white/5 py-4 flex flex-col items-center ${collapsed ? 'px-2' : 'px-4'}`}>
        {/* Avatar */}
        <Avatar className={`${collapsed ? 'h-10 w-10' : 'h-16 w-16'} ring-2 ring-primary/30 transition-all`}>
          <AvatarImage src={profile?.avatar_url || ""} alt={profile?.name || "Usuário"} />
          <AvatarFallback className="bg-primary/10 text-primary font-semibold">
            {profile?.name ? getInitials(profile.name) : "U"}
          </AvatarFallback>
        </Avatar>

        {!collapsed && (
          <>
            {/* Name */}
            <span className="mt-3 font-medium text-foreground text-sm text-center line-clamp-1 tracking-tight">
              {profile?.name || "Usuário"}
            </span>

            {/* Level Badge */}
            <div className="flex items-center gap-1.5 mt-1.5 group cursor-default">
              <div className="bg-amber-500/10 rounded-full p-1 animate-pulse shadow-[0_0_10px_rgba(245,158,11,0.3)]">
                <Trophy className="h-3 w-3 text-amber-500" />
              </div>
              <span className="text-xs font-black text-amber-500 tracking-wider uppercase drop-shadow-[0_0_8px_rgba(245,158,11,0.2)]">
                Nível {userStats?.level || 1}
              </span>
            </div>

            {/* XP Progress */}
            <div className="w-full mt-3 space-y-1">
              <Progress 
                value={xpProgress.percentage} 
                className="h-1.5" 
              />
              <p className="text-[10px] text-amber-500 font-bold text-center tracking-tight">
                {xpProgress.current} / {xpProgress.required} XP
              </p>
            </div>

            {/* Streak */}
            <div className="flex items-center gap-1.5 mt-2.5 bg-muted/40 backdrop-blur-sm rounded-full px-3 py-1.5 border border-white/5 transition-all hover:bg-muted/60 group/streak cursor-default">
              <Flame className="h-3.5 w-3.5 text-orange-500 fill-orange-500/10 group-hover/streak:animate-bounce" />
              <span className="text-[11px] font-bold text-foreground/80 tracking-tight">
                OFENSIVA: <span className="text-orange-500">{userStats?.current_streak || 0} DIAS</span>
              </span>
            </div>
          </>
        )}
      </div>

      {/* Navigation */}
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navegação</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    tooltip={collapsed ? item.title : undefined}
                  >
                    <NavLink
                      to={item.url}
                      end={item.url === "/dashboard"}
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
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Admin Section */}
        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>Administração</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive("/admin")}
                    tooltip={collapsed ? "Admin Panel" : undefined}
                  >
                    <NavLink
                      to="/admin"
                      className="flex items-center gap-2"
                      activeClassName="bg-muted"
                    >
                      <Settings className="h-4 w-4" />
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
      <SidebarFooter className="border-t border-white/5 p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={handleLogout}
              tooltip={collapsed ? "Sair" : undefined}
              className="text-muted-foreground hover:text-red-400 hover:bg-red-500/5 transition-colors"
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
