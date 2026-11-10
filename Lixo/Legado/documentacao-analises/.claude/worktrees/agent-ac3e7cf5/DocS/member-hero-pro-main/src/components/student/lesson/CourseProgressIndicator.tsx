import { Progress } from "@/components/ui/progress";
import { Clock, CheckCircle2 } from "lucide-react";

interface CourseProgressIndicatorProps {
  totalLessons: number;
  completedLessons: number;
}

export function CourseProgressIndicator({
  totalLessons,
  completedLessons,
}: CourseProgressIndicatorProps) {
  const percentage = totalLessons > 0 
    ? Math.round((completedLessons / totalLessons) * 100) 
    : 0;
  
  const remainingLessons = totalLessons - completedLessons;
  
  // Estimativa: ~8 minutos por aula em média
  const estimatedMinutesPerLesson = 8;
  const remainingMinutes = remainingLessons * estimatedMinutesPerLesson;
  
  // Formatar tempo restante
  const formatRemainingTime = (minutes: number) => {
    if (minutes === 0) return "Concluído!";
    if (minutes < 60) return `${minutes} min restantes`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (mins === 0) return `${hours}h restantes`;
    return `${hours}h ${mins}min restantes`;
  };

  return (
    <div className="glass-card rounded-xl p-4 border border-border/40 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">
          Seu Progresso
        </h3>
        <span className="text-2xl font-bold text-primary">
          {percentage}%
        </span>
      </div>

      {/* Progress Bar */}
      <Progress 
        value={percentage} 
        className="h-2 bg-white/10 [&>div]:bg-gradient-to-r [&>div]:from-primary [&>div]:to-[#F5D46E]"
      />

      {/* Stats */}
      <div className="flex items-center justify-between text-sm">
        {/* Aulas completadas */}
        <div className="flex items-center gap-2 text-muted-foreground">
          <CheckCircle2 className="h-4 w-4 text-green-500" />
          <span>{completedLessons}/{totalLessons} aulas</span>
        </div>

        {/* Tempo restante */}
        <div className="flex items-center gap-2 text-muted-foreground">
          <Clock className="h-4 w-4 text-primary" />
          <span className="text-xs">{formatRemainingTime(remainingMinutes)}</span>
        </div>
      </div>

      {/* Mensagem motivacional (se próximo de concluir) */}
      {percentage >= 80 && percentage < 100 && (
        <p className="text-xs text-primary text-center pt-2 border-t border-border/20">
          🔥 Você está quase lá! Continue assim!
        </p>
      )}
      
      {percentage === 100 && (
        <p className="text-xs text-green-500 text-center pt-2 border-t border-border/20">
          🎉 Parabéns! Curso concluído!
        </p>
      )}
    </div>
  );
}
