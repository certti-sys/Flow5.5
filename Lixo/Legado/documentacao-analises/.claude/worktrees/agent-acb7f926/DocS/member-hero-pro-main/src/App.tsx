// MemberHero - App Principal
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import NotFound from "./pages/NotFound";
import { AdminLayout } from "./components/admin/AdminLayout";
import Dashboard from "./pages/admin/Dashboard";
import Courses from "./pages/admin/Courses";
import CourseManagement from "./pages/admin/CourseManagement";
import WebhooksConfig from "./pages/admin/WebhooksConfig";
import WebhookLogs from "./pages/admin/WebhookLogs";
import Settings from "./pages/admin/Settings";
import Students from "./pages/admin/Students";
import ShowcaseConfig from "./pages/admin/ShowcaseConfig";
import CategoriesAndTags from "./pages/admin/CategoriesAndTags";
import CommunityConfig from "./pages/admin/CommunityConfig";
import ComingSoon from "./pages/admin/ComingSoon";
import Sales from "./pages/admin/Sales";
import AdminProfile from "./pages/admin/AdminProfile";
import WebhookAnalytics from "./pages/admin/WebhookAnalytics";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import LoginNew from "./pages/auth/LoginNew";
import RegisterNew from "./pages/auth/RegisterNew";
import { StudentLayout } from "./components/student/StudentLayout";
import Showcase from "./pages/student/Showcase";
import LessonPlayer from "./pages/student/LessonPlayer";
import Notifications from "./pages/student/Notifications";
import MyCourses from "./pages/student/MyCourses";
import Profile from "./pages/student/Profile";
import StudentSettings from "./pages/student/StudentSettings";
import Community from "./pages/student/Community";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
        <Routes>
          <Route path="/" element={<LoginNew />} />
          <Route path="/register" element={<RegisterNew />} />
          <Route path="/login-old" element={<Login />} />
          <Route path="/register-old" element={<Register />} />
          
          {/* Admin Routes - Protected */}
          <Route path="/admin" element={
            <ProtectedRoute requiredRole="admin">
              <AdminLayout />
            </ProtectedRoute>
          }>
            <Route index element={<Dashboard />} />
            <Route path="profile" element={<AdminProfile />} />
            <Route path="courses" element={<Courses />} />
            <Route path="courses/new" element={<CourseManagement />} />
            <Route path="courses/:courseId" element={<CourseManagement />} />
            <Route path="community" element={<CommunityConfig />} />
            <Route path="marketing" element={<ComingSoon title="Marketing" />} />
            <Route path="gamification" element={<ComingSoon title="Gamificação" />} />
            <Route path="forum" element={<ComingSoon title="Fórum" />} />
            <Route path="automations" element={<ComingSoon title="Automações" />} />
            <Route path="categories" element={<CategoriesAndTags />} />
            <Route path="webhooks" element={<WebhooksConfig />} />
            <Route path="webhooks/logs" element={<WebhookLogs />} />
            <Route path="webhook-analytics" element={<WebhookAnalytics />} />
            <Route path="sales" element={<Sales />} />
            <Route path="showcase-config" element={<ShowcaseConfig />} />
            <Route path="settings" element={<Settings />} />
            <Route path="students" element={<Students />} />
          </Route>

          {/* Student Routes - Protected */}
          <Route path="/student" element={
            <ProtectedRoute requiredRole="student">
              <StudentLayout />
            </ProtectedRoute>
          }>
            <Route index element={<Showcase />} />
            <Route path="my-courses" element={<MyCourses />} />
            <Route path="community" element={<Community />} />
            <Route path="profile" element={<Profile />} />
            <Route path="settings" element={<StudentSettings />} />
            <Route path="notifications" element={<Notifications />} />
          </Route>
          <Route path="/student/lesson/:lessonId" element={
            <ProtectedRoute requiredRole="student">
              <LessonPlayer />
            </ProtectedRoute>
          } />

          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
