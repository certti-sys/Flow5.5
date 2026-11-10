import { Link, useLocation, useNavigate } from "react-router-dom";
import { Home, BookOpen, User, Settings, LogOut, Menu, UsersRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useState } from "react";

const menuItems = [
  { icon: Home, label: "Vitrine", path: "/student" },
  { icon: BookOpen, label: "Meus Cursos", path: "/student/my-courses" },
  // { icon: UsersRound, label: "Comunidade", path: "/student/community" }, // TODO: Reativar quando implementar comunidade
  { icon: User, label: "Perfil", path: "/student/profile" },
  // { icon: Settings, label: "Configurações", path: "/student/settings" }, // TODO: Reativar quando implementar atualizações futuras
];

export function StudentSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, signOut } = useSupabaseAuth();
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);

  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    await signOut();
    navigate('/');
    setOpen(false);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const SidebarContent = () => (
    <>
      {/* Logo */}
      <div className="p-6 border-b border-border/50">
        <Link to="/student" className="flex items-center gap-3" onClick={() => setOpen(false)}>
          <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
            <span className="text-primary font-bold text-xl">M</span>
          </div>
          <div>
            <h1 className="font-bold text-lg text-foreground">MemberHero</h1>
            <p className="text-xs text-muted-foreground">Área do Aluno</p>
          </div>
        </Link>
      </div>

      {/* Menu */}
      <nav className="p-4">
        <ul className="space-y-2">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <li key={item.path}>
                <Link
                  to={item.path}
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                    isActive
                      ? "bg-primary/20 text-primary border border-primary/30"
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  }`}
                >
                  <item.icon className="h-5 w-5" />
                  <span className="font-medium">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User Info */}
      <div className="p-4 border-t border-border/50">
        <div className="flex items-center gap-3 mb-3 p-3 rounded-lg bg-surface/50">
          <Avatar className="w-10 h-10 border border-primary/30">
            <AvatarFallback className="bg-primary/20 text-primary font-semibold">
              {profile?.name ? getInitials(profile.name) : "U"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              {profile?.name || "Usuário"}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {profile?.email}
            </p>
          </div>
        </div>

        <Button
          variant="ghost"
          onClick={handleLogout}
          className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
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
            className="fixed top-4 left-4 z-50 lg:hidden glass-card hover:bg-white/10"
          >
            <Menu className="h-6 w-6" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0 bg-card/95 backdrop-blur-xl border-border/50">
          <div className="flex h-full flex-col overflow-hidden">
            <SidebarContent />
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  // Desktop version
  return (
    <aside className="hidden lg:flex fixed left-0 top-0 h-screen w-64 bg-card/50 backdrop-blur-xl border-r border-border/50 flex-col z-50 overflow-hidden">
      <SidebarContent />
    </aside>
  );
}
