import { Outlet } from "react-router-dom";
import { AdminSidebar } from "./AdminSidebar";
import { ReactNode } from "react";

interface AdminLayoutProps {
  children?: ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <AdminSidebar />
      
      {/* Mobile Header Spacer */}
      <div className="md:hidden h-16" />
      
      <div className="md:pl-72">
        <main className="p-4 md:p-6">
          <div className="w-full">
            {children || <Outlet />}
          </div>
        </main>
      </div>
    </div>
  );
}
