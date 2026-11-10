import { PanelLeft, Search, Bell, LayoutGrid, User as UserIcon, Headphones, GraduationCap, LogOut as LogOutIcon, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/ui/sidebar";
import { useBreadcrumbs } from "@/hooks/useBreadcrumbs";
import { SearchBar } from "@/components/SearchBar";
import { NotificationBell } from "@/components/NotificationBell";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useLocation } from "react-router-dom";
import { usePlatformSettingsContext } from "@/components/PlatformSettingsProvider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Link } from "react-router-dom";
import { Fragment } from "react";

interface ContentHeaderProps {
  showSearch?: boolean;
  showNotifications?: boolean;
  showAvatar?: boolean;
}

export function ContentHeader({ 
  showSearch = true, 
  showNotifications = true, 
  showAvatar = true 
}: ContentHeaderProps) {
  const { toggleSidebar, state } = useSidebar();
  const breadcrumbs = useBreadcrumbs();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { settings } = usePlatformSettingsContext();

  const isCollapsed = state === "collapsed";
  
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

  // Check if user is admin - same logic as navbar for consistency
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

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const NavItem = ({ to, icon, label, isActive }: { to: string, icon: any, label: string, isActive: boolean }) => (
    <Link
      to={to}
      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl transition-all tracking-tight ${
        isActive
          ? "bg-primary text-white shadow-premium"
          : "text-muted-foreground hover:text-white"
      }`}
    >
      {icon}
      <span>{label}</span>
    </Link>
  );

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center border-b border-white/[0.05] bg-background/95 backdrop-blur-md px-4 lg:px-6 shadow-2xl">
      <div className="flex items-center gap-4 flex-1">
        {/* Left: Sidebar Toggle + Brand if needed */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0 rounded-full bg-muted/30 hover:bg-muted/50 transition-colors border border-white/[0.08] text-white"
            onClick={toggleSidebar}
          >
            <PanelLeft className="h-4.5 w-4.5" />
            <span className="sr-only">Toggle sidebar</span>
          </Button>

          {/* Dynamic Logo (shows when sidebar collapsed) */}
          {isCollapsed && (
            <Link to="/dashboard" className="flex items-center gap-2 pr-2 border-r border-white/5 animate-in fade-in slide-in-from-left-2 duration-300">
              {settings.logo_image_url ? (
                <img src={settings.logo_image_url} alt="Logo" className="w-7 h-7 rounded-lg object-cover" />
              ) : (
                <div className="w-7 h-7 rounded-lg gradient-primary flex items-center justify-center">
                  <GraduationCap className="w-4 h-4 text-white" />
                </div>
              )}
            </Link>
          )}

          {/* Breadcrumbs (Optional/Secondary) */}
          <Breadcrumb className="hidden lg:flex transition-opacity duration-300">
            <BreadcrumbList>
              {breadcrumbs.map((crumb, index) => (
                <Fragment key={index}>
                  {index > 0 && <BreadcrumbSeparator className="text-white/20" />}
                  <BreadcrumbItem>
                    {index === breadcrumbs.length - 1 ? (
                      <BreadcrumbPage className="text-white/60 font-medium text-xs">{crumb.label}</BreadcrumbPage>
                    ) : (
                      <BreadcrumbLink asChild>
                        <Link to={crumb.href || "#"} className="text-white/40 hover:text-white font-medium text-xs transition-colors">{crumb.label}</Link>
                      </BreadcrumbLink>
                    )}
                  </BreadcrumbItem>
                </Fragment>
              ))}
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        {/* Center: Superior Pill Navigation */}
        <div className="hidden md:flex flex-1 items-center justify-center">
          <div className="flex items-center gap-0.5 p-1 bg-muted/20 rounded-full border border-white/[0.08] backdrop-blur-sm shadow-inner">
            <NavItem
              to="/dashboard"
              icon={<LayoutGrid className="w-3.5 h-3.5" />}
              label="Cursos"
              isActive={location.pathname === "/dashboard"}
            />
            <NavItem
              to="/perfil"
              icon={<UserIcon className="w-3.5 h-3.5" />}
              label="Perfil"
              isActive={location.pathname === "/perfil"}
            />
            {isAdmin && (
              <NavItem
                to="/admin"
                icon={<Headphones className="w-3.5 h-3.5" />}
                label="Admin"
                isActive={location.pathname.startsWith("/admin")}
              />
            )}
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2 sm:gap-4 ml-auto lg:ml-0">
          {showSearch && (
            <div className="hidden sm:block">
              <SearchBar />
            </div>
          )}

          <div className="flex items-center gap-2 sm:gap-3">
            {showNotifications && <NotificationBell />}

            {showAvatar && profile && (
              <DropdownMenu>
                <DropdownMenuTrigger className="flex items-center gap-2 pl-1.5 pr-2 py-1 rounded-full bg-muted/30 hover:bg-muted/50 transition-colors border border-white/[0.08] outline-none">
                    <Avatar className="h-7 w-7 ring-1 ring-primary/10">
                      <AvatarImage src={profile.avatar_url || ""} alt={profile.name} />
                      <AvatarFallback className="text-[10px] bg-primary/10 text-primary font-bold">
                        {getInitials(profile.name || "U")}
                      </AvatarFallback>
                    </Avatar>
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground/60" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 glass-card border-white/10 rounded-2xl p-2 shadow-2xl">
                  <div className="px-3 py-3 border-b border-white/5 mb-2">
                    <p className="text-sm font-bold text-white line-clamp-1">{profile.name}</p>
                    <p className="text-[10px] text-muted-foreground/60 truncate uppercase font-bold tracking-widest">{user?.email}</p>
                  </div>
                  <DropdownMenuItem 
                    onClick={() => navigate("/perfil")}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 cursor-pointer text-sm font-medium transition-colors"
                  >
                    <UserIcon className="w-4 h-4 text-primary" />
                    Meu Perfil
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-white/5" />
                  <DropdownMenuItem 
                    onClick={handleLogout}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-destructive hover:bg-destructive/10 cursor-pointer text-sm font-bold transition-colors"
                  >
                    <LogOutIcon className="w-4 h-4" />
                    Sair
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
