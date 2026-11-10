import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Achievement } from "@/hooks/useGamification";
import { Sparkles } from "lucide-react";

interface AchievementUnlockedModalProps {
  achievement: Achievement | null;
  xpGained: number;
  open: boolean;
  onClose: () => void;
}

export const AchievementUnlockedModal = ({
  achievement,
  xpGained,
  open,
  onClose,
}: AchievementUnlockedModalProps) => {
  if (!achievement) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <div className="text-center space-y-4 py-4">
          {/* Ícone de Conquista com Animação */}
          <div className="flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-primary to-purple-500 rounded-full blur-xl opacity-50 animate-pulse" />
              <div className="relative text-8xl animate-bounce">
                {achievement.icon}
              </div>
            </div>
          </div>

          {/* Título */}
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-gradient">
              🎉 Conquista Desbloqueada!
            </h2>
            <h3 className="text-xl font-semibold text-foreground">
              {achievement.title}
            </h3>
            <p className="text-muted-foreground">
              {achievement.description}
            </p>
          </div>

          {/* XP Ganho */}
          <div className="glass-card border-white/10 p-4 rounded-lg">
            <div className="flex items-center justify-center gap-2">
              <Sparkles className="text-primary" size={20} />
              <span className="text-lg font-bold text-gradient">
                +{xpGained} XP
              </span>
            </div>
          </div>

          {/* Botão de Fechar */}
          <Button onClick={onClose} className="w-full" size="lg">
            Continuar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};