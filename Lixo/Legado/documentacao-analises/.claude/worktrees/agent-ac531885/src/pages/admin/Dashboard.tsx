import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAuth } from "@/hooks/useAuth";

// Dashboard Components
import { StatsOverview } from "@/components/admin/dashboard/StatsOverview";
import { ActivityChart } from "@/components/admin/dashboard/ActivityChart";
import { CourseDistributionChart } from "@/components/admin/dashboard/CourseDistributionChart";
import { CoursesMetricsTable } from "@/components/admin/dashboard/CoursesMetricsTable";
import { RecentStudents } from "@/components/admin/dashboard/RecentStudents";
import { RecentComments } from "@/components/admin/dashboard/RecentComments";
import { ActivityTimeline } from "@/components/admin/dashboard/ActivityTimeline";
import { WebhookStats } from "@/components/admin/dashboard/WebhookStats";
import { EngagementCard } from "@/components/admin/dashboard/EngagementCard";
import { ContentCard } from "@/components/admin/dashboard/ContentCard";
import { motion } from "framer-motion";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { Sparkles } from "lucide-react";

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1
    }
  }
};

const itemAnim = {
  hidden: { y: 20, opacity: 0 },
  show: { y: 0, opacity: 1 }
};

export default function AdminDashboard() {
  const { user } = useAuth();
  const userName = user?.email ? user.email.split('@')[0] : 'Administrador';

  // Fetch courses with modules and lessons count
  const { data: coursesData = [] } = useQuery({
    queryKey: ["adminDashboardCourses"],
    queryFn: async () => {
      const { data: courses, error } = await supabase
        .from("courses")
        .select(`
          id, 
          title,
          modules (
            id,
            lessons (id)
          ),
          user_course_access (id)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return courses.map((course: any) => ({
        id: course.id,
        title: course.title,
        modules: course.modules?.length || 0,
        lessons: course.modules?.reduce((acc: number, mod: any) =>
          acc + (mod.lessons?.length || 0), 0) || 0,
        students: course.user_course_access?.length || 0,
        progress: 0
      }));
    },
  });

  // Fetch total students
  const { data: totalStudents = 0 } = useQuery({
    queryKey: ["totalStudents"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });
      if (error) throw error;
      return count || 0;
    },
  });

  // Fetch active students (with progress)
  const { data: activeStudents = 0 } = useQuery({
    queryKey: ["activeStudents"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_progress")
        .select("user_id");
      if (error) throw error;
      return new Set(data.map(p => p.user_id)).size;
    },
  });

  // Fetch total lessons and modules
  const { data: contentStats = { lessons: 0, modules: 0 } } = useQuery({
    queryKey: ["contentStats"],
    queryFn: async () => {
      const [lessonsRes, modulesRes] = await Promise.all([
        supabase.from("lessons").select("*", { count: "exact", head: true }),
        supabase.from("modules").select("*", { count: "exact", head: true })
      ]);
      return {
        lessons: lessonsRes.count || 0,
        modules: modulesRes.count || 0
      };
    },
  });

  // Fetch completed lessons today
  const { data: completedToday = 0 } = useQuery({
    queryKey: ["completedToday"],
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { count, error } = await supabase
        .from("user_progress")
        .select("*", { count: "exact", head: true })
        .eq("completed", true)
        .gte("completed_at", today.toISOString());
      if (error) throw error;
      return count || 0;
    },
  });

  // Fetch total completed lessons
  const { data: totalCompleted = 0 } = useQuery({
    queryKey: ["totalCompleted"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("user_progress")
        .select("*", { count: "exact", head: true })
        .eq("completed", true);
      if (error) throw error;
      return count || 0;
    },
  });

  // Fetch activity data for last 7 days
  const { data: activityData = [] } = useQuery({
    queryKey: ["activityData"],
    queryFn: async () => {
      const days = [];
      for (let i = 6; i >= 0; i--) {
        const date = subDays(new Date(), i);
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        const { count } = await supabase
          .from("user_progress")
          .select("*", { count: "exact", head: true })
          .eq("completed", true)
          .gte("completed_at", startOfDay.toISOString())
          .lte("completed_at", endOfDay.toISOString());

        days.push({
          date: format(date, "EEE", { locale: ptBR }),
          completed: count || 0
        });
      }
      return days;
    },
  });

  const { data: recentStudents = [] } = useQuery({
    queryKey: ["recentStudents"],
    queryFn: async () => {
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("id, name, email, avatar_url, updated_at")
        .order("updated_at", { ascending: false })
        .limit(5);

      if (error) throw error;

      return Promise.all(
        profiles.map(async (profile) => {
          const { count } = await supabase
            .from("user_progress")
            .select("*", { count: "exact", head: true })
            .eq("user_id", profile.id)
            .eq("completed", true);
          return {
            ...profile,
            lastActivity: profile.updated_at,
            completedLessons: count || 0
          };
        })
      );
    },
  });

  const { data: recentComments = [] } = useQuery({
    queryKey: ["recentComments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("comments")
        .select(`id, content, created_at, user_id, lesson_id`)
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return Promise.all(
        data.map(async (comment) => {
          const [profileRes, lessonRes] = await Promise.all([
            supabase.from("profiles").select("name").eq("id", comment.user_id).single(),
            supabase.from("lessons").select("title, module_id").eq("id", comment.lesson_id).single()
          ]);
          let courseTitle = "";
          if (lessonRes.data?.module_id) {
            const moduleRes = await supabase.from("modules").select("course_id").eq("id", lessonRes.data.module_id).single();
            if (moduleRes.data?.course_id) {
              const courseRes = await supabase.from("courses").select("title").eq("id", moduleRes.data.course_id).single();
              courseTitle = courseRes.data?.title || "";
            }
          }
          return {
            id: comment.id,
            content: comment.content,
            authorName: profileRes.data?.name || "Usuário",
            lessonTitle: lessonRes.data?.title || "Aula",
            courseTitle,
            createdAt: comment.created_at
          };
        })
      );
    },
  });

  const { data: auditLogs = [] } = useQuery({
    queryKey: ["auditLogs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data;
    },
  });

  const { data: webhookStats = { total: 0, success: 0, errors: 0, last: null } } = useQuery({
    queryKey: ["webhookStats"],
    queryFn: async () => {
      const { count } = await supabase.from("webhook_transactions").select("*", { count: "exact", head: true });
      const { data: lastOne } = await supabase.from("webhook_transactions").select("created_at").order("created_at", { ascending: false }).limit(1);
      const { count: errorCount } = await supabase.from("webhook_transactions").select("*", { count: "exact", head: true }).eq("status", "error");
      return {
        total: count || 0,
        success: (count || 0) - (errorCount || 0),
        errors: errorCount || 0,
        last: lastOne?.[0]?.created_at || null
      };
    },
  });

  const courseDistribution = coursesData.slice(0, 5).map(course => ({
    name: course.title.length > 15 ? course.title.substring(0, 15) + "..." : course.title,
    value: course.students,
    color: ""
  }));

  const completionRate = contentStats.lessons > 0 && activeStudents > 0
    ? Math.round((totalCompleted / (contentStats.lessons * activeStudents)) * 100)
    : 0;
  const activityRate = totalStudents > 0 ? Math.round((activeStudents / totalStudents) * 100) : 0;
  const avgLessonsPerCourse = coursesData.length > 0 ? Math.round(contentStats.lessons / coursesData.length) : 0;
  const avgModulesPerCourse = coursesData.length > 0 ? Math.round(contentStats.modules / coursesData.length) : 0;
  const webhookSuccessRate = webhookStats.total > 0 ? Math.round((webhookStats.success / webhookStats.total) * 100) : 100;

  const [searchValue, setSearchValue] = useState("");

  // Filter courses based on search
  const filteredCourses = coursesData.filter(course => 
    course.title.toLowerCase().includes(searchValue.toLowerCase())
  );

  return (
    <motion.div 
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-8 pb-20"
    >
      <AdminHeader
        title={`Bem-vindo, ${userName}`}
        description="Esta é a central de inteligência da sua plataforma."
        showSearch={true}
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        searchPlaceholder="Procurar curso ou métrica..."
        actionButton={
            <div className="flex items-center gap-3 px-4 py-2 rounded-2xl bg-white/[0.03] border border-white/5 backdrop-blur-md">
                <Sparkles className="w-4 h-4 text-primary animate-pulse" />
                <span className="text-xs font-bold text-white/60 tracking-widest uppercase">
                    {format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })}
                </span>
            </div>
        }
      />

      {/* Stats Overview */}
      <motion.div variants={itemAnim}>
        <StatsOverview
          totalCourses={coursesData.length}
          totalStudents={totalStudents}
          completedToday={completedToday}
          completionRate={completionRate}
        />
      </motion.div>

      {/* Charts Bento Group */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <motion.div variants={itemAnim} className="lg:col-span-8 h-full">
          <ActivityChart data={activityData} />
        </motion.div>
        <motion.div variants={itemAnim} className="lg:col-span-4 h-full">
          <CourseDistributionChart data={courseDistribution} />
        </motion.div>
      </div>

      {/* Courses Details Table */}
      <motion.div variants={itemAnim}>
        <CoursesMetricsTable courses={filteredCourses} />
      </motion.div>

      {/* Social & Support Group */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div variants={itemAnim}>
          <RecentStudents students={recentStudents} />
        </motion.div>
        <motion.div variants={itemAnim}>
          <RecentComments comments={recentComments} />
        </motion.div>
      </div>

      {/* Engagement Insights Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div variants={itemAnim}>
          <EngagementCard
            activityRate={activityRate}
            avgCompletion={completionRate}
            activeStudents={activeStudents}
            totalStudents={totalStudents}
          />
        </motion.div>
        <motion.div variants={itemAnim}>
          <ContentCard
            avgLessonsPerCourse={avgLessonsPerCourse}
            avgModulesPerCourse={avgModulesPerCourse}
            totalModules={contentStats.modules}
            totalLessons={contentStats.lessons}
          />
        </motion.div>
        <motion.div variants={itemAnim}>
          <WebhookStats
            totalTransactions={webhookStats.total}
            successRate={webhookSuccessRate}
            lastWebhook={webhookStats.last}
            errorsCount={webhookStats.errors}
          />
        </motion.div>
      </div>

      {/* System Audit Log */}
      <motion.div variants={itemAnim}>
        <ActivityTimeline logs={auditLogs} />
      </motion.div>
    </motion.div>
  );
}
