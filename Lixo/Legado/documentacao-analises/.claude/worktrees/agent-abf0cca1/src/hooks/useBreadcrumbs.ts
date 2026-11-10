import { useLocation, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface Breadcrumb {
  label: string;
  href?: string;
}

export function useBreadcrumbs(): Breadcrumb[] {
  const location = useLocation();
  const params = useParams();
  const path = location.pathname;

  // Fetch course name if on course page
  const { data: courseName } = useQuery({
    queryKey: ["courseName", params.courseId],
    queryFn: async () => {
      if (!params.courseId) return null;
      const { data } = await supabase
        .from("courses")
        .select("title")
        .eq("id", params.courseId)
        .single();
      return data?.title || "Curso";
    },
    enabled: !!params.courseId,
  });

  // Fetch lesson name if on lesson page
  const { data: lessonName } = useQuery({
    queryKey: ["lessonName", params.lessonId],
    queryFn: async () => {
      if (!params.lessonId) return null;
      const { data } = await supabase
        .from("lessons")
        .select("title")
        .eq("id", params.lessonId)
        .single();
      return data?.title || "Aula";
    },
    enabled: !!params.lessonId,
  });

  const breadcrumbs: Breadcrumb[] = [{ label: "Home", href: "/dashboard" }];

  // Dashboard
  if (path === "/dashboard") {
    breadcrumbs.push({ label: "Dashboard" });
  }
  // Profile
  else if (path === "/perfil") {
    breadcrumbs.push({ label: "Perfil" });
  }
  // Course
  else if (path.startsWith("/curso/") && !path.includes("/info")) {
    breadcrumbs.push({ label: "Cursos", href: "/dashboard" });
    breadcrumbs.push({ label: courseName || "Curso" });
  }
  // Course Info
  else if (path.includes("/info")) {
    breadcrumbs.push({ label: "Cursos", href: "/dashboard" });
    breadcrumbs.push({ label: courseName || "Informações" });
  }
  // Lesson
  else if (path.startsWith("/aula/")) {
    breadcrumbs.push({ label: "Cursos", href: "/dashboard" });
    breadcrumbs.push({ label: lessonName || "Aula" });
  }
  // Admin routes
  else if (path.startsWith("/admin")) {
    breadcrumbs.push({ label: "Admin", href: "/admin" });
    
    if (path === "/admin") {
      breadcrumbs.push({ label: "Dashboard" });
    } else if (path === "/admin/cursos") {
      breadcrumbs.push({ label: "Cursos" });
    } else if (path === "/admin/alunos") {
      breadcrumbs.push({ label: "Alunos" });
    } else if (path === "/admin/notificacoes") {
      breadcrumbs.push({ label: "Notificações" });
    } else if (path === "/admin/estatisticas") {
      breadcrumbs.push({ label: "Estatísticas" });
    } else if (path === "/admin/carrosseis") {
      breadcrumbs.push({ label: "Carrosséis" });
    } else if (path === "/admin/webhooks") {
      breadcrumbs.push({ label: "Webhooks" });
    } else if (path === "/admin/personalizacao") {
      breadcrumbs.push({ label: "Personalização" });
    } else if (path === "/admin/configuracoes") {
      breadcrumbs.push({ label: "Configurações" });
    }
  }

  return breadcrumbs;
}
