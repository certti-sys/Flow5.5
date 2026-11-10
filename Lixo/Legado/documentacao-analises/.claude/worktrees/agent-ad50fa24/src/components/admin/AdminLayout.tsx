import { ReactNode, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AdminSidebar } from "./AdminSidebar";
import { ContentHeader } from "@/components/ContentHeader";

import { useIsMobile } from "@/hooks/use-mobile";

interface AdminLayoutProps {
  children: ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isMobile = useIsMobile();

  // Check if user is admin
  const { data: isAdmin, isLoading: isCheckingAdmin } = useQuery({
    queryKey: ["isAdmin", user?.id],
    queryFn: async () => {
      if (!user) return false;
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();

      return !!data;
    },
    enabled: !!user,
  });

  // Redirect if not admin
  useEffect(() => {
    if (!isCheckingAdmin && !isAdmin) {
      toast.error("Acesso negado. Você precisa ser administrador.");
      navigate("/dashboard");
    }
  }, [isAdmin, isCheckingAdmin, navigate]);

  if (isCheckingAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAdmin) {
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
            <div className="container mx-auto p-4 sm:p-6">
              {children}
            </div>
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
            <div className="container mx-auto p-6">
              {children}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
