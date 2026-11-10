import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CheckCircle2, Award, BookOpen, Clock } from "lucide-react";

interface Activity {
  id: string;
  type: 'lesson_completed' | 'achievement_unlocked' | 'course_started';
  title: string;
  timestamp: string;
}

interface RecentActivityProps {
  activities: Activity[];
}

export const RecentActivity = ({ activities }: RecentActivityProps) => {
  const getIcon = (type: Activity['type']) => {
    switch (type) {
      case 'lesson_completed':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'achievement_unlocked':
        return <Award className="w-4 h-4 text-yellow-500" />;
      case 'course_started':
        return <BookOpen className="w-4 h-4 text-blue-500" />;
    }
  };

  const getLabel = (type: Activity['type']) => {
    switch (type) {
      case 'lesson_completed':
        return 'Aula concluída';
      case 'achievement_unlocked':
        return 'Conquista desbloqueada';
      case 'course_started':
        return 'Curso iniciado';
    }
  };

  if (activities.length === 0) {
    return (
      <div className="rounded-xl border border-white/[0.08] bg-card p-4">
        <h3 className="font-semibold mb-3 text-sm">📅 Atividade Recente</h3>
        <div className="text-center py-4 text-muted-foreground text-sm">
          <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>Nenhuma atividade recente</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border/50 bg-card p-4">
      <h3 className="font-semibold mb-3 text-sm">📅 Atividade Recente</h3>
      <div className="space-y-3">
        {activities.slice(0, 5).map((activity) => (
          <div key={activity.id} className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
              {getIcon(activity.type)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{activity.title}</p>
              <p className="text-xs text-muted-foreground">
                {getLabel(activity.type)} • {formatDistanceToNow(new Date(activity.timestamp), {
                  addSuffix: true,
                  locale: ptBR
                })}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
