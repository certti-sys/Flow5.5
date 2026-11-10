import { Link, useLocation, useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Menu, User, LogOut, GraduationCap, ChevronDown, LayoutGrid, Search, Headphones, Trophy } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { usePlatformSettingsContext } from "@/components/PlatformSettingsProvider";
import { SearchBar } from "@/components/SearchBar";
import { NotificationBell } from "@/components/NotificationBell";

interface NavbarProps {
  hideLogo?: boolean;
  hideNavLinks?: boolean;
  showMobileSidebar?: boolean;
}

interface NavItemProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  badge?: number;
}

const NavItem = ({ to, icon, label, isActive, badge }: NavItemProps) => (
  <Link
    to={to}
    className={cn(
      "flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-full transition-all",
      isActive
        ? "bg-primary text-primary-foreground shadow-md"
        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
    )}
  >
    {icon}
    <span>{label}</span>
    {badge !== undefined && badge > 0 && (
      <span className="ml-1 px-1.5 py-0.5 text-xs font-bold bg-background/20 rounded-full">
        {badge}
      </span>
    )}
  </Link>
);

export const Navbar = ({ hideLogo = false, hideNavLinks = false, showMobileSidebar = false }: NavbarProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { settings } = usePlatformSettingsContext();

  // Fetch user profile
  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Check if user is admin
  const { data: isAdminData } = useQuery({
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

  const isAdmin = isAdminData || false;

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  const getUserBadge = () => {
    if (isAdmin) return { label: "Admin", className: "bg-primary/20 text-primary" };
    return { label: "Aluno", className: "bg-muted text-muted-foreground" };
  };

  const badge = getUserBadge();

  return (
    <nav className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-white/5">
      <div className={cn(
        "px-4 md:px-6 lg:px-8",
        hideLogo && "pl-0"
      )}>
        <div className="grid grid-cols-2 md:grid-cols-3 items-center h-16 md:h-14 gap-4">
          {/* Column 1: Logo */}
          <div className="flex items-center gap-4">
            {!hideLogo && (
              <Link to="/dashboard" className="flex items-center gap-2.5 group shrink-0">
                {settings.logo_display_mode === 'horizontal' && settings.logo_horizontal_url ? (
                  <img
                    src={settings.logo_horizontal_url}
                    alt={settings.logo_text || "Logo"}
                    className="h-8 md:h-9 w-auto object-contain"
                  />
                ) : (
                  <>
                    {settings.logo_image_url ? (
                      <img
                        src={settings.logo_image_url}
                        alt="Logo"
                        className="w-8 h-8 md:w-9 md:h-9 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="w-8 h-8 md:w-9 md:h-9 rounded-lg gradient-primary flex items-center justify-center">
                        <GraduationCap className="w-4 h-4 md:w-5 md:h-5 text-white" />
                      </div>
                    )}
                    <span className="text-base md:text-lg font-bold tracking-tight hidden sm:block">
                      {settings.logo_text || 'EduStream'}
                    </span>
                  </>
                )}
              </Link>
            )}
          </div>

          {/* Column 2: Centered Navigation Links - Shared Desktop/Tablet */}
          <div className="hidden md:flex items-center justify-center">
            {!hideNavLinks && (
              <div className="flex items-center gap-0.5 p-1 bg-muted/20 rounded-full border border-white/[0.08]">
                <NavItem
                  to="/dashboard"
                  icon={<LayoutGrid className="w-4 h-4" />}
                  label="Cursos"
                  isActive={location.pathname === "/dashboard"}
                />
                <NavItem
                  to="/perfil"
                  icon={<User className="w-4 h-4" />}
                  label="Perfil"
                  isActive={location.pathname === "/perfil"}
                />
                <NavItem
                  to="/ranking"
                  icon={<Trophy className="w-4 h-4" />}
                  label="Ranking"
                  isActive={location.pathname === "/ranking"}
                />
                {isAdmin && (
                  <NavItem
                    to="/admin"
                    icon={<Headphones className="w-4 h-4" />}
                    label="Admin"
                    isActive={location.pathname.startsWith("/admin")}
                  />
                )}
              </div>
            )}
          </div>

          {/* Column 3: Right Side Actions */}
          <div className="flex items-center justify-end gap-1 md:gap-3">
            {/* Unified Search - Icon based modal */}
            <SearchBar />

            {/* Notifications and Profile - Desktop/Tablet */}
            <div className="flex items-center gap-1 md:gap-2">
              <NotificationBell />

              <div className="hidden md:block">
                <DropdownMenu>
                  <DropdownMenuTrigger className="flex items-center gap-2 pl-1.5 pr-2 py-1 rounded-full bg-muted/30 hover:bg-muted/50 transition-colors border border-white/[0.08]">
                    <Avatar className="w-7 h-7 ring-1 ring-primary/10">
                      <AvatarImage src={profile?.avatar_url || ""} alt={profile?.name || "User"} />
                      <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                        {profile?.name?.charAt(0) || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">{profile?.name || "Usuário"}</p>
                        <p className="text-xs leading-none text-muted-foreground">{profile?.email}</p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => navigate("/perfil")}>
                      <User className="mr-2 h-4 w-4" /> Perfil
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                      <LogOut className="mr-2 h-4 w-4" /> Sair
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Mobile Menu Dropdown */}
            <div className="flex md:hidden items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="w-10 h-10 rounded-full bg-muted/30 hover:bg-muted/50 border border-white/[0.08]">
                    <Menu className="w-5 h-5 text-foreground/80" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[280px] p-2 bg-popover/95 backdrop-blur-xl border-white/[0.08] rounded-2xl shadow-2xl animate-in fade-in zoom-in duration-200">
                  <div className="p-3 mb-2 border-b border-white/5 overflow-hidden">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10 ring-2 ring-primary/10">
                        <AvatarImage src={profile?.avatar_url || ""} />
                        <AvatarFallback className="bg-primary/10 text-primary font-bold">
                          {profile?.name?.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col min-w-0">
                        <span className="font-bold text-sm truncate">{profile?.name}</span>
                        <span className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider truncate">{badge.label}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <DropdownMenuItem asChild>
                      <Link to="/dashboard" className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted transition-colors cursor-pointer group">
                        <LayoutGrid className="w-4 h-4 text-primary group-hover:scale-110 transition-transform" />
                        <span className="font-medium text-sm">Cursos</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/perfil" className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted transition-colors cursor-pointer group">
                        <User className="w-4 h-4 text-primary group-hover:scale-110 transition-transform" />
                        <span className="font-medium text-sm">Meu Perfil</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/ranking" className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted transition-colors cursor-pointer group">
                        <Trophy className="w-4 h-4 text-primary group-hover:scale-110 transition-transform" />
                        <span className="font-medium text-sm">Ranking Global</span>
                      </Link>
                    </DropdownMenuItem>
                    {isAdmin && (
                      <DropdownMenuItem asChild>
                        <Link to="/admin" className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted transition-colors cursor-pointer group">
                          <Headphones className="w-4 h-4 text-primary group-hover:scale-110 transition-transform" />
                          <span className="font-medium text-sm">Área Admin</span>
                        </Link>
                      </DropdownMenuItem>
                    )}
                  </div>

                  <div className="mt-2 pt-2 border-t border-white/5">
                    <DropdownMenuItem onClick={handleLogout} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-destructive hover:bg-destructive/10 focus:bg-destructive/10 cursor-pointer transition-colors group">
                      <LogOut className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                      <span className="font-medium text-sm">Sair da Conta</span>
                    </DropdownMenuItem>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};
