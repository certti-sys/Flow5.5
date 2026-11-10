import { useState, useMemo, useEffect } from "react";
import { EditProfileModal } from "@/components/EditProfileModal";
import { ProfileHero } from "@/components/profile/ProfileHero";
import { MyProfileCourses } from "@/components/profile/MyProfileCourses";
import { useGamification } from "@/hooks/useGamification";
import { useCourseAccess } from "@/hooks/useCourseAccess";
import { Target, Trophy, BookOpen, Clock, CheckCircle, TrendingUp, Award, ArrowRight, CheckCircle2, Lock } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { PageContainer } from "@/components/layout/PageContainer";
import { motion } from "framer-motion";

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
        .select("*")
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

  // Check access for all courses using the established hook
  const courseIdsForAccess = useMemo(() => allCourses.map((c: any) => c.id), [allCourses]);
  const { accessMap, loading: accessLoading } = useCourseAccess(courseIdsForAccess);

  // Calculate courses user has access to
  const userAccessedCourses = useMemo(() => {
    return allCourses.filter((course: any) => accessMap[course.id]);
  }, [allCourses, accessMap]);

  // Calculate courses in progress with accurate data
  const coursesWithProgress = useMemo(() => {
    // Map courses with progress by matching user_progress.lesson_id to the course lessons
    return allCourses
      .map((course: any) => {
        const lessonIds = new Set<string>(
          course.modules?.flatMap((module: any) =>
            (module.lessons || []).map((lesson: any) => lesson.id)
          ) || []
        );
        const totalLessons = lessonIds.size;
        const completedLessons = userProgress.filter(
          (p: any) => p.completed && p.lesson_id && lessonIds.has(p.lesson_id)
        ).length;

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
      <PageContainer>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="pb-20 space-y-6"
        >
        <AdminHeader
          title="Meu Perfil"
          description="Acompanhe seu progresso, conquistas e as informações da sua conta."
          showSearch={false}
        />

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
            {/* User Certificates */}
            {userCertificates.length > 0 && (
              <div className="glass-card rounded-[24px] border-white/10 p-6 animate-fade-in">
                <h2 className="text-lg font-bold mb-4 flex items-center gap-2 tracking-tight">
                  <Award className="w-5 h-5 text-amber-500" />
                  Meus Certificados
                </h2>
                <div className="flex flex-col gap-3">
                  {userCertificates.map((cert: any) => (
                    <Link
                      key={cert.id}
                      to={`/certificado/${cert.id}`}
                      className="group flex items-center justify-between p-4 rounded-[16px] border border-white/5 bg-white/[0.03] hover:bg-white/[0.06] hover:border-primary/20 transition-all duration-300"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-[12px] bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0 shadow-inner">
                          <Award className="w-5 h-5 text-amber-500" />
                        </div>
                        <div>
                          <p className="font-bold text-sm leading-tight group-hover:text-amber-500 transition-colors">
                            {cert.courses?.title}
                          </p>
                          <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest mt-1">
                            Concluído em: {new Date(cert.issued_at).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="hidden sm:flex bg-amber-500/5 text-amber-500 border-amber-500/20 text-[10px] uppercase font-black tracking-tighter">
                          Verificado
                        </Badge>
                        <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Achievements - Limited to 8 */}
            <div className="glass-card rounded-[24px] border-white/10 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold flex items-center gap-2 tracking-tight">
                  <Trophy className="w-5 h-5 text-amber-500" />
                  Galeria de Conquistas
                </h2>
                <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-full">
                  <span className="text-xs font-black text-amber-500 uppercase tracking-widest">
                    {userAchievements?.length || 0} / {achievements?.length || 0}
                  </span>
                </div>
              </div>

              {gamificationLoading ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {achievements && [...achievements]
                    .sort((a, b) => {
                      const aUnlocked = userAchievements?.some(ua => ua.achievement_id === a.id);
                      const bUnlocked = userAchievements?.some(ua => ua.achievement_id === b.id);
                      if (aUnlocked && !bUnlocked) return -1;
                      if (!aUnlocked && bUnlocked) return 1;
                      return (a.order_index || 0) - (b.order_index || 0);
                    })
                    .map((achievement) => {
                      const isUnlocked = userAchievements?.some(ua => ua.achievement_id === achievement.id);
                      const unlockedData = userAchievements?.find(ua => ua.achievement_id === achievement.id);

                    return (
                      <Card 
                        key={achievement.id}
                        className={cn(
                          "relative group overflow-hidden rounded-[16px] border transition-all duration-300 hover:shadow-xl",
                          isUnlocked 
                            ? "border-amber-500/30 bg-amber-500/[0.02]" 
                            : "border-white/5 bg-white/[0.01] grayscale opacity-60"
                        )}
                      >
                        <CardHeader className="relative flex flex-row items-start gap-4 space-y-0 p-4">
                          <div className={cn(
                            "w-12 h-12 rounded-[12px] flex items-center justify-center text-2xl shadow-inner shrink-0",
                            isUnlocked ? "bg-amber-500/10" : "bg-muted/50"
                          )}>
                            {achievement.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <CardTitle className="text-sm font-bold truncate group-hover:text-amber-500 transition-colors">
                                {achievement.title}
                              </CardTitle>
                              {isUnlocked && <CheckCircle2 className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
                            </div>
                            <CardDescription className="text-xs line-clamp-2 mt-1 leading-relaxed">
                              {achievement.description}
                            </CardDescription>
                            <Badge variant="outline" className={cn(
                              "mt-2 text-[8px] font-black uppercase tracking-widest px-1.5 py-0",
                              isUnlocked ? "bg-amber-500/10 text-amber-500 border-amber-500/20" : "text-muted-foreground"
                            )}>
                              +{achievement.xp_reward} XP
                            </Badge>
                          </div>
                        </CardHeader>
                        <div className="px-4 pb-3 flex items-center justify-between border-t border-white/5 pt-2">
                          {isUnlocked ? (
                            <span className="text-[9px] text-muted-foreground font-medium italic">
                              Conquistado em {new Date(unlockedData!.unlocked_at).toLocaleDateString()}
                            </span>
                          ) : (
                            <div className="flex items-center gap-1 text-[9px] font-bold text-muted-foreground uppercase tracking-widest">
                              <Lock className="w-2.5 h-2.5" />
                              Bloqueado
                            </div>
                          )}
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar Column (1/3) - Simplified Stats Only */}
          <div className="space-y-6">
            {/* Quick Stats Card */}
            <div className="glass-card rounded-[24px] border-white/10 p-5">
              <h3 className="text-sm font-bold text-white/90 mb-4 flex items-center gap-2 tracking-tight">
                <TrendingUp className="w-4 h-4 text-primary" />
                Estatísticas
              </h3>

              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-[12px] bg-green-500/10 border border-green-500/20 flex items-center justify-center shrink-0">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold leading-none">{completedCourses}</p>
                    <p className="text-xs text-muted-foreground mt-1">Cursos Concluídos</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-[12px] bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
                    <BookOpen className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold leading-none">{inProgressCourses}</p>
                    <p className="text-xs text-muted-foreground mt-1">Em Andamento</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-[12px] bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0">
                    <Target className="w-5 h-5 text-purple-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold leading-none">{totalLessonsWatched}</p>
                    <p className="text-xs text-muted-foreground mt-1">Aulas Assistidas</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-[12px] bg-orange-500/10 border border-orange-500/20 flex items-center justify-center shrink-0">
                    <Clock className="w-5 h-5 text-orange-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold leading-none">{studyHours}h</p>
                    <p className="text-xs text-muted-foreground mt-1">Horas de Estudo</p>
                  </div>
                </div>
              </div>
            </div>

            {/* My Courses Section */}
            <MyProfileCourses 
              courses={userAccessedCourses} 
              isLoading={accessLoading} 
            />
          </div>
        </div>
      </motion.div>
      </PageContainer>

      <EditProfileModal
        open={isEditModalOpen}
        onOpenChange={setIsEditModalOpen}
        profile={profile}
      />
    </div>
  );
};

export default Profile;
