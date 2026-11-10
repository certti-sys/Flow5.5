import { Trophy, Clock, Play, Timer } from "lucide-react";

interface QuickStatsProps {
  completedCourses: number;
  inProgressCourses: number;
  totalLessonsWatched: number;
  studyHours: number;
}

export const QuickStats = ({ 
  completedCourses, 
  inProgressCourses, 
  totalLessonsWatched,
  studyHours 
}: QuickStatsProps) => {
  const stats = [
    {
      icon: Trophy,
      label: "Cursos Concluídos",
      value: completedCourses,
      color: "text-green-500",
      bg: "bg-green-500/10"
    },
    {
      icon: Clock,
      label: "Em Andamento",
      value: inProgressCourses,
      color: "text-yellow-500",
      bg: "bg-yellow-500/10"
    },
    {
      icon: Play,
      label: "Aulas Assistidas",
      value: totalLessonsWatched,
      color: "text-blue-500",
      bg: "bg-blue-500/10"
    },
    {
      icon: Timer,
      label: "Horas de Estudo",
      value: `${studyHours}h`,
      color: "text-purple-500",
      bg: "bg-purple-500/10"
    }
  ];

  return (
    <div className="rounded-xl border border-white/[0.08] bg-card p-4">
      <h3 className="font-semibold mb-3 text-sm">📈 Estatísticas</h3>
      <div className="space-y-3">
        {stats.map((stat, index) => (
          <div key={index} className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-lg ${stat.bg} flex items-center justify-center shrink-0`}>
              <stat.icon className={`w-4 h-4 ${stat.color}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground truncate">{stat.label}</p>
              <p className="font-semibold">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
