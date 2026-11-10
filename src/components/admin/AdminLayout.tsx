import { ReactNode, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AdminSidebar } from "./AdminSidebar";
import { ContentHeader } from "@/components/ContentHeader";
import { PageContainer } from "@/components/layout/PageContainer";

import { useIsMobile } from "@/hooks/use-mobile";

interface AdminLayoutProps {
  children: ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isMobile = useIsMobile();

  // Check if user is admin
  const { data: isAdmin, isLoading: isCheckingAdmin, error: adminError } = useQuery({
    queryKey: ["isAdmin", user?.id],
    queryFn: async () => {
      if (!user) return false;
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();

      if (error) throw error;
      return !!data;
    },
    enabled: !!user,
  });

  // Redirect if not admin (only redirect if we know for sure the user is not admin)
  useEffect(() => {
    if (adminError) return; // Don't redirect on error, show error instead
    if (!isCheckingAdmin && isAdmin === false) {
      toast.error("Acesso negado. Você precisa ser administrador.");
      navigate("/dashboard");
    }
  }, [isAdmin, isCheckingAdmin, adminError, navigate]);

  // Show error if admin check failed
  if (adminError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="glass-card border-red-500/50 bg-red-500/10 p-6 sm:p-8 rounded-2xl text-center max-w-md border border-red-500/20 shadow-lg">
          <h2 className="text-red-400 font-bold text-lg sm:text-xl mb-2 tracking-tight">
            Erro de Administrador
          </h2>
          <p className="text-red-100 text-sm sm:text-base mb-4 leading-relaxed">
            {adminError.message}
          </p>
          <button onClick={() => window.location.reload()} className="bg-primary text-white font-semibold py-2 px-6 rounded-lg hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/20 transition-all duration-200 text-sm sm:text-base">
            Recarregar Página
          </button>
        </div>
      </div>
    );
  }

  if (isCheckingAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary text-primary">
          <span className="sr-only">Carregando...</span>
        </div>
      </div>
    );
  }

  if (isAdmin === false) {
    return null;
  }

  // Mobile: Use SidebarProvider with Sheet for mobile admin sidebar
  if (isMobile) {
    return (
      <SidebarProvider defaultOpen={false}>
        <AdminSidebar />
        <div className="min-h-screen flex flex-col w-full overflow-y-auto">
          <ContentHeader />
          <main className="flex-1 pb-20">
            <PageContainer>
              {children}
            </PageContainer>
          </main>
        </div>
      </SidebarProvider>
    );
  }

  // Desktop: ALWAYS use AdminSidebar + ContentHeader (ignores navigation_layout setting)
  return (
    <SidebarProvider defaultOpen={true}>
      <div className="h-screen overflow-hidden flex w-full" data-sidebar-layout>
        <AdminSidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <ContentHeader />
          <main className="flex-1 overflow-y-auto scrollbar-styled">
            <PageContainer>
              {children}
            </PageContainer>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
