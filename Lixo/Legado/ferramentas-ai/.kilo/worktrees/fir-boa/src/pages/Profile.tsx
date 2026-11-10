import { useState, useMemo, useEffect } from "react";
import { EditProfileModal } from "@/components/EditProfileModal";
import { ProfileHero } from "@/components/profile/ProfileHero";
import { CoursesInProgress } from "@/components/profile/CoursesInProgress";
import { AchievementsGrid } from "@/components/gamification/AchievementsGrid";
import { useGamification } from "@/hooks/useGamification";
import { Target, BookOpen, Clock, CheckCircle, TrendingUp, Award, ArrowRight } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const Profile = () => {
  // Scroll to top when page loads
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  const { user } = useAuth();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const {
    userStats,
    achievements,
    userAchievements,
    isLoading: gamificationLoading,
    getXpProgress,
  } = useGamification();

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

  // Fetch user progress with courses
  const { data: userProgress = [] } = useQuery({
    queryKey: ["userProgressProfile", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("user_progress")
        .select(`
          *,
          lessons (
            *,
            modules (
              *,
              courses (*)
            )
          )
        `)
        .eq("user_id", user.id);

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch user certificates
  const { data: userCertificates = [] } = useQuery({
    queryKey: ["userCertificates", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("certificates")
        .select(`
          id,
          issued_at,
          courses ( title )
        `)
        .eq("user_id", user.id)
        .order("issued_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch all courses with their lessons count for accurate progress
  const { data: allCourses = [] } = useQuery({
    queryKey: ["allCoursesForProfile"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select(`
          id,
          title,
          thumbnail,
          modules (
            id,
            lessons (id)
          )
        `);

      if (error) throw error;
      return data;
    },
  });

  // Calculate courses in progress with accurate data
  const coursesWithProgress = useMemo(() => {
    const courseProgressMap = new Map<string, { completed: number; total: number }>();

    // Count completed lessons per course
    userProgress.forEach((p: any) => {
      const courseId = p.lessons?.modules?.courses?.id;
      if (courseId && p.completed) {
        const current = courseProgressMap.get(courseId) || { completed: 0, total: 0 };
        courseProgressMap.set(courseId, { ...current, completed: current.completed + 1 });
      }
    });

    // Map courses with progress
    return allCourses
      .map((course: any) => {
        const totalLessons = course.modules?.reduce((acc: number, mod: any) =>
          acc + (mod.lessons?.length || 0), 0) || 0;
        const completedLessons = courseProgressMap.get(course.id)?.completed || 0;

        // Only include courses user has started
        if (completedLessons === 0) return null;

        return {
          id: course.id,
          title: course.title,
          thumbnail: course.thumbnail,
          completedLessons,
          totalLessons,
        };
      })
      .filter(Boolean)
      .sort((a: any, b: any) => {
        // Sort by progress percentage (ascending - less complete first)
        const progressA = a.completedLessons / a.totalLessons;
        const progressB = b.completedLessons / b.totalLessons;
        return progressA - progressB;
      })
      .slice(0, 4); // Show max 4 courses
  }, [allCourses, userProgress]);

  // Calculate statistics
  const completedCourses = useMemo(() => {
    return coursesWithProgress.filter((c: any) =>
      c.completedLessons === c.totalLessons && c.totalLessons > 0
    ).length;
  }, [coursesWithProgress]);

  const inProgressCourses = useMemo(() => {
    return coursesWithProgress.filter((c: any) =>
      c.completedLessons < c.totalLessons
    ).length;
  }, [coursesWithProgress]);

  const totalLessonsWatched = userProgress.filter((p: any) => p.completed).length;
  const studyHours = Math.round(totalLessonsWatched * 0.5);

  const xpProgress = getXpProgress();

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-primary/5">
      <main className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Hero Section with XP/Level */}
        <ProfileHero
          profile={profile}
          userEmail={user?.email}
          onEditClick={() => setIsEditModalOpen(true)}
          userStats={userStats}
          xpProgress={xpProgress}
        />

        {/* Main Content - 2 Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Column (2/3) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Courses In Progress */}
            <CoursesInProgress courses={coursesWithProgress} />

            {/* User Certificates */}
            {userCertificates.length > 0 && (
              <div className="rounded-xl border border-white/[0.08] bg-card p-6 animate-fade-in">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 tracking-tight">
                  <Award className="w-5 h-5 text-amber-500" />
                  Meus Certificados
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {userCertificates.map((cert: any) => (
                    <Link
                      key={cert.id}
                      to={`/certificado/${cert.id}`}
                      className="group flex flex-col justify-between p-4 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2 mb-4">
                        <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                          <Award className="w-4 h-4 text-amber-500" />
                        </div>
                        <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm line-clamp-2 leading-tight mb-1 group-hover:text-amber-500 transition-colors">
                          {cert.courses?.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Concluído em: {new Date(cert.issued_at).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Achievements - Limited to 8 */}
            <div className="rounded-xl border border-white/[0.08] bg-card p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 tracking-tight">
                <Target className="w-5 h-5 text-primary" />
                Conquistas
                <span className="text-sm text-muted-foreground font-normal ml-auto">
                  {userAchievements?.length || 0} / {achievements?.length || 0}
                </span>
              </h2>

              {achievements && userAchievements && (
                <AchievementsGrid
                  achievements={achievements}
                  userAchievements={userAchievements}
                  maxItems={8}
                />
              )}
              {gamificationLoading && (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar Column (1/3) - Simplified Stats Only */}
          <div className="space-y-4">
            {/* Quick Stats Card */}
            <div className="rounded-xl border border-white/[0.08] bg-card p-5">
              <h3 className="text-sm font-medium text-muted-foreground mb-4 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Estatísticas
              </h3>

              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{completedCourses}</p>
                    <p className="text-xs text-muted-foreground">Cursos Concluídos</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <BookOpen className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{inProgressCourses}</p>
                    <p className="text-xs text-muted-foreground">Em Andamento</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                    <Target className="w-5 h-5 text-purple-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{totalLessonsWatched}</p>
                    <p className="text-xs text-muted-foreground">Aulas Assistidas</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-orange-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{studyHours}h</p>
                    <p className="text-xs text-muted-foreground">Horas de Estudo</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <EditProfileModal
        open={isEditModalOpen}
        onOpenChange={setIsEditModalOpen}
        profile={profile}
      />
    </div>
  );
};

export default Profile;
