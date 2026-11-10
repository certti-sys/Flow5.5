import { ReactNode, useMemo } from "react";
import { Navbar } from "@/components/Navbar";
import { ClientSidebar } from "@/components/ClientSidebar";
import { ContentHeader } from "@/components/ContentHeader";
import { SidebarProvider } from "@/components/ui/sidebar";
import { usePlatformSettingsContext } from "@/components/PlatformSettingsProvider";
import { useIsMobile } from "@/hooks/use-mobile";

interface ClientLayoutProps {
  children: ReactNode;
}

// Get cached layout from localStorage (set by index.html script or previous session)
const getCachedLayout = (): 'horizontal' | 'sidebar' | 'both' | null => {
  try {
    const cached = localStorage.getItem('navigation_layout');
    if (cached && ['horizontal', 'sidebar', 'both'].includes(cached)) {
      return cached as 'horizontal' | 'sidebar' | 'both';
    }
  } catch (e) {
    // localStorage may be unavailable
  }
  return null;
};

export const ClientLayout = ({ children }: ClientLayoutProps) => {
  const { settings, isLoading } = usePlatformSettingsContext();

  // Use cached layout while settings is loading to prevent flash
  const layout = useMemo(() => {
    // If settings has loaded, use it
    if (!isLoading && settings.navigation_layout) {
      return settings.navigation_layout;
    }

    // While loading, use cached value from localStorage
    const cached = getCachedLayout();
    if (cached) {
      return cached;
    }

    // Ultimate fallback
    return 'horizontal';
  }, [settings.navigation_layout, isLoading]);

  const defaultCollapsed = settings.sidebar_default_collapsed || false;
  const isMobile = useIsMobile();

  // Mobile: Always use horizontal navbar with hamburger menu
  if (isMobile) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar showMobileSidebar={layout !== 'horizontal'} />
        <main className="flex-1">
          {children}
        </main>
      </div>
    );
  }

  // Desktop: Layout Horizontal (default)
  if (layout === 'horizontal') {
    return (
      <div className="min-h-screen">
        <Navbar />
        {children}
      </div>
    );
  }

  // Desktop: Both (Sidebar + Navbar) - Use ContentHeader instead of Navbar
  return (
    <SidebarProvider defaultOpen={!defaultCollapsed}>
      <div className="h-screen overflow-hidden flex w-full" data-sidebar-layout>
        <ClientSidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <ContentHeader />
          <main className="flex-1 overflow-y-auto scrollbar-styled">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};
