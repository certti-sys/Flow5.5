import { Outlet } from "react-router-dom";
import { StudentSidebar } from "./StudentSidebar";
import { MobileBottomNav } from "./MobileBottomNav";

export function StudentLayout() {
  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <StudentSidebar />
      
      {/* Mobile Header Spacer */}
      <div className="lg:hidden h-16" />
      
      <div className="lg:pl-64">
        <main className="pb-safe">
          <Outlet />
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav />
    </div>
  );
}
