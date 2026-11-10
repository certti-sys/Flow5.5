import { ArrowLeft, Bell } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface LessonTopBarProps {
  courseTitle: string;
  courseId: string;
}

export function LessonTopBar({ courseTitle, courseId }: LessonTopBarProps) {
  const navigate = useNavigate();
  const { profile, signOut } = useSupabaseAuth();

  const handleLogout = async () => {
    await signOut();
    navigate('/');
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
    <div className="h-14 sm:h-16 border-b border-border/40 bg-background/95 backdrop-blur-sm sticky top-0 z-50">
      <div className="h-full max-w-[2000px] mx-auto px-3 sm:px-4 flex items-center justify-between">
        {/* Botão Voltar */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/student')}
          className="glass-card hover:bg-primary/10 hover:text-primary transition-all min-h-[40px]"
        >
          <ArrowLeft className="h-4 w-4 sm:mr-2" />
          <span className="hidden sm:inline">Voltar à Vitrine</span>
        </Button>

        {/* Espaço vazio para manter layout centralizado */}
        <div className="hidden md:block" />

        {/* Ações à direita */}
        <div className="flex items-center gap-3">
          {/* Notificações */}
          <Button
            variant="ghost"
            size="icon"
            className="relative hover:bg-primary/10 hover:text-primary"
            onClick={() => navigate("/student/notifications")}
          >
            <Bell className="h-5 w-5" />
            <span className="absolute top-1 right-1 h-2 w-2 bg-primary rounded-full" />
          </Button>

          {/* Avatar com Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                <Avatar className="h-10 w-10 border-2 border-primary/20">
                  <AvatarImage src={profile?.avatar_url || ""} alt={profile?.name || ""} />
                  <AvatarFallback className="bg-primary/20 text-primary font-semibold">
                    {profile?.name ? getInitials(profile.name) : "U"}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 glass-card" align="end">
              <div className="flex flex-col gap-1 p-2">
                <p className="text-sm font-medium">{profile?.name}</p>
                <p className="text-xs text-muted-foreground">{profile?.email}</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate("/student/profile")}>
                Meu Perfil
              </DropdownMenuItem>
              {/* TODO: Reativar quando implementar atualizações futuras
              <DropdownMenuItem onClick={() => navigate("/student/settings")}>
                Configurações
              </DropdownMenuItem>
              */}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
