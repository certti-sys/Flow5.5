import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Calendar, Mail, Zap, Trophy } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface ProfileHeroProps {
  profile: any;
  userEmail?: string;
  onEditClick: () => void;
  userStats?: {
    level: number;
    total_xp: number;
    current_streak: number;
  } | null;
  xpProgress?: {
    current: number;
    required: number;
    percentage: number;
  };
}

export const ProfileHero = ({ profile, userEmail, onEditClick, userStats, xpProgress }: ProfileHeroProps) => {
  const memberSince = new Date(profile?.member_since || Date.now()).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-white/[0.08] p-6 mb-6">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-primary/20 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

      <div className="relative flex flex-col lg:flex-row items-start gap-6">
        {/* Left: Avatar + Name */}
        <div className="flex items-center gap-4 flex-1 min-w-0">
          {/* Avatar */}
          <div className="relative group shrink-0">
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-primary to-primary/50 blur-lg opacity-50 group-hover:opacity-75 transition-opacity" />
            <Avatar className="relative w-20 h-20 ring-2 ring-primary/30">
              <AvatarImage src={profile?.avatar_url || ""} alt={profile?.name || "User"} />
              <AvatarFallback className="text-2xl bg-primary/10">{profile?.name?.charAt(0) || "U"}</AvatarFallback>
            </Avatar>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-3 mb-1">
              <h1 className="text-2xl sm:text-3xl font-bold truncate">
                {profile?.name || "Usuário"}
              </h1>
              <Badge variant="secondary" className="shrink-0">
                🎓 Estudante Ativo
              </Badge>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                Membro desde {memberSince}
              </span>
              <span className="flex items-center gap-1.5">
                <Mail className="w-4 h-4" />
                {profile?.email || userEmail}
              </span>
            </div>
          </div>
        </div>

        {/* Right: XP + Level Stats */}
        <div className="flex items-center gap-6 shrink-0">
          {/* Level & XP Box */}
          <div className="flex items-center gap-4 bg-card/50 rounded-xl px-5 py-3 border border-white/[0.08]">
            {/* Level */}
            <div className="text-center">
              <div className="flex items-center justify-center gap-1.5 text-primary">
                <Trophy className="w-5 h-5" />
                <span className="text-2xl font-bold">{userStats?.level || 1}</span>
              </div>
              <span className="text-xs text-muted-foreground">Nível</span>
            </div>

            {/* Divider */}
            <div className="w-px h-10 bg-border/50" />

            {/* XP */}
            <div className="text-center min-w-[80px]">
              <div className="flex items-center justify-center gap-1.5 text-yellow-500">
                <Zap className="w-5 h-5" />
                <span className="text-2xl font-bold">{userStats?.total_xp || 0}</span>
              </div>
              <span className="text-xs text-muted-foreground">XP Total</span>
            </div>
          </div>

          {/* Edit Button */}
          <Button
            onClick={onEditClick}
            variant="outline"
            size="sm"
            className="shrink-0"
          >
            <Edit className="w-4 h-4 mr-2" />
            Editar Perfil
          </Button>
        </div>
      </div>

      {/* XP Progress Bar */}
      {xpProgress && (
        <div className="mt-4 pt-4 border-t border-white/5">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-muted-foreground">Progresso para Nível {(userStats?.level || 1) + 1}</span>
            <span className="font-medium text-primary">{xpProgress.current} / {xpProgress.required} XP</span>
          </div>
          <Progress value={xpProgress.percentage} className="h-2" />
          <p className="text-xs text-muted-foreground mt-1">
            Faltam {xpProgress.required - xpProgress.current} XP para o próximo nível
          </p>
        </div>
      )}
    </div>
  );
};
