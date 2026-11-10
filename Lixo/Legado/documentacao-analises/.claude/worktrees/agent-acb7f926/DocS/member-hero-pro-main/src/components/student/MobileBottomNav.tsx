import { useLocation, useNavigate } from "react-router-dom";
import { Home, BookOpen, Users, User } from "lucide-react";
import { cn } from "@/lib/utils";

export function MobileBottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = [
    {
      icon: Home,
      label: "Início",
      path: "/student",
      active: location.pathname === "/student",
    },
    {
      icon: BookOpen,
      label: "Cursos",
      path: "/student/my-courses",
      active: location.pathname === "/student/my-courses",
    },
    // TODO: Reativar quando implementar comunidade
    // {
    //   icon: Users,
    //   label: "Comunidade",
    //   path: "/student/community",
    //   active: location.pathname === "/student/community",
    // },
    {
      icon: User,
      label: "Perfil",
      path: "/student/profile",
      active: location.pathname === "/student/profile" || location.pathname === "/student/settings",
    },
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-surface/95 backdrop-blur-lg border-t border-white/10 safe-area-bottom">
      <div className="flex items-center justify-around px-2 py-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                "flex flex-col items-center justify-center gap-1 py-2 px-4 rounded-xl transition-all touch-target min-w-[64px]",
                item.active
                  ? "text-primary bg-primary/10"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/5"
              )}
            >
              <Icon className={cn("h-5 w-5", item.active && "scale-110")} />
              <span className="text-xs font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
