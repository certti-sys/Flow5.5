import { PanelLeft, PanelRight, User as UserIcon, LogOut as LogOutIcon, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/ui/sidebar";
import { useBreadcrumbs } from "@/hooks/useBreadcrumbs";
import { SearchBar } from "@/components/SearchBar";
import { NotificationBell } from "@/components/NotificationBell";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link, useNavigate } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Fragment } from "react";

interface ContentHeaderProps {
  showSearch?: boolean;
  showNotifications?: boolean;
  showAvatar?: boolean;
}

export function ContentHeader({
  showSearch = true,
  showNotifications = true,
  showAvatar = true,
}: ContentHeaderProps) {
  const { toggleSidebar, open } = useSidebar();
  const breadcrumbs = useBreadcrumbs();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const isSidebarOpen = open;

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

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <header className="sticky top-0 z-40 transition-colors duration-300 bg-transparent! backdrop-blur-none! border-none">
      <div className="px-4 md:px-6 lg:px-8">
        <div className="grid grid-cols-2 items-center h-16 md:h-14 gap-3">
          {/* Column 1: Sidebar toggle + dynamic logo + breadcrumbs */}
          <div className="flex items-center gap-3 min-w-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 shrink-0 rounded-xl bg-white/5 hover:bg-white/10 transition-colors border border-white/[0.08] text-white/80"
              onClick={toggleSidebar}
            >
              {isSidebarOpen ? (
                <PanelRight className="h-4.5 w-4.5" />
              ) : (
                <PanelLeft className="h-4.5 w-4.5" />
              )}
              <span className="sr-only">{isSidebarOpen ? "Recolher sidebar" : "Expandir sidebar"}</span>
            </Button>

            {/* Breadcrumbs */}
            <Breadcrumb className="hidden xl:flex min-w-0 transition-opacity duration-300">
              <BreadcrumbList className="flex-nowrap">
                {breadcrumbs.map((crumb, index) => (
                  <Fragment key={index}>
                    {index > 0 && <BreadcrumbSeparator className="text-white/60" />}
                    <BreadcrumbItem>
                      {index === breadcrumbs.length - 1 ? (
                        <BreadcrumbPage className="text-white/60 font-medium text-xs truncate">
                          {crumb.label}
                        </BreadcrumbPage>
                      ) : (
                        <BreadcrumbLink asChild>
                          <Link
                            to={crumb.href || "#"}
                            className="text-white/60 hover:text-white font-medium text-xs transition-colors inline-flex items-center py-1.5"
                          >
                            {crumb.label}
                          </Link>
                        </BreadcrumbLink>
                      )}
                    </BreadcrumbItem>
                  </Fragment>
                ))}
              </BreadcrumbList>
            </Breadcrumb>
          </div>

          {/* Column 2: Right Side Actions (same as Navbar) */}
          <div className="flex items-center justify-end gap-2 md:gap-3">
            {showSearch && <SearchBar />}

            <div className="flex items-center gap-1 md:gap-2">
              {showNotifications && <NotificationBell />}

              {showAvatar && profile && (
                <DropdownMenu>
                  <DropdownMenuTrigger className="flex items-center gap-2 pl-1.5 pr-2 py-1 rounded-xl bg-white/5 border border-white/[0.08] hover:bg-white/10 transition-colors outline-none">
                    <Avatar className="w-7 h-7 ring-1 ring-primary/10">
                      <AvatarImage src={profile.avatar_url || ""} alt={profile.name || "User"} />
                      <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                        {getInitials(profile.name || "U")}
                      </AvatarFallback>
                    </Avatar>
                    <ChevronDown className="w-4 h-4 text-white/60" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium text-white leading-none line-clamp-1">
                          {profile.name || "Usuário"}
                        </p>
                        <p className="text-xs leading-none text-white/60 truncate">{user?.email}</p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator className="border-white/[0.1]" />
                    <DropdownMenuItem onClick={() => navigate("/perfil")} className="cursor-pointer">
                      <UserIcon className="mr-2 h-4 w-4" /> Perfil
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="border-white/[0.1]" />
                    <DropdownMenuItem
                      onClick={handleLogout}
                      className="text-destructive focus:text-destructive hover:bg-destructive/10 cursor-pointer"
                    >
                      <LogOutIcon className="mr-2 h-4 w-4" /> Sair
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
