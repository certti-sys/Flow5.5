import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ThemeProvider } from "@/components/ThemeProvider";
import { PlatformSettingsProvider } from "@/components/PlatformSettingsProvider";
import ProtectedRoute from "@/components/ProtectedRoute";
import AdminProtectedRoute from "@/components/AdminProtectedRoute";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Course from "./pages/Course";
import CourseInfo from "./pages/CourseInfo";
import Lesson from "./pages/Lesson";
import Profile from "./pages/Profile";
import Leaderboard from "./pages/Leaderboard";
import CertificateView from "./pages/CertificateView";
import NotFound from "./pages/NotFound";
import { AdminLayout } from "./components/admin/AdminLayout";
import { ClientLayout } from "./components/ClientLayout";
import AdminDashboard from "./pages/admin/Dashboard";
import AdminCourses from "./pages/admin/Courses";
import AdminStudents from "./pages/admin/Students";
import AdminCarousels from "./pages/admin/Carousels";
import AdminNotifications from "./pages/admin/Notifications";
import CertificatesDashboard from "./pages/admin/CertificatesDashboard";
import ThemeCustomization from "./pages/admin/ThemeCustomization";
import WebhookHub from "./pages/admin/WebhookHub";
import AdminComments from "./pages/admin/Comments";
import EmailSettings from "./pages/admin/EmailSettings";
import WhatsAppSettings from "./pages/admin/WhatsAppSettings";
import Placeholder from "./pages/admin/Placeholder"; // Mantendo para outros usos se houver
import GatewaysPage from "./pages/admin/Gateways";
import ProductsPage from "./pages/admin/Products";
import OrdersPage from "./pages/admin/Orders";
import SalesDashboard from "./pages/admin/SalesDashboard";
import CustomersPage from "./pages/admin/Customers";
import AdminDesignSandbox from "./pages/admin/DesignSandbox";
import OrderBumpsPage from "./pages/admin/OrderBumps";
import { CheckoutLayout } from "./components/checkout/CheckoutLayout";
import CheckoutPage from "./pages/checkout/Checkout";
import ThankYouPage from "./pages/checkout/ThankYou";
import { ShoppingCart, Package, Layers, CreditCard } from "lucide-react";

// Initialize React Query client with optimized defaults
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 1 minuto - dados ficam "frescos" por mais tempo
      gcTime: 1000 * 60 * 5, // 5 minutos - cache mantido por mais tempo (antigo cacheTime)
      retry: 1, // Apenas 1 retry em caso de erro
      refetchOnWindowFocus: false, // Evita refetch ao focar na janela
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <ThemeProvider>
        <PlatformSettingsProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<Navigate to="/login" replace />} />
                <Route path="/login" element={<Login />} />

                {/* Checkout Routes */}
                <Route element={<CheckoutLayout />}>
                  <Route path="/checkout/:productId" element={<CheckoutPage />} />
                  <Route path="/checkout/obrigado/:orderId" element={<ThankYouPage />} />
                </Route>

                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <ClientLayout>
                        <Dashboard />
                      </ClientLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/ranking"
                  element={
                    <ProtectedRoute>
                      <ClientLayout>
                        <Leaderboard />
                      </ClientLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/curso/:courseId"
                  element={
                    <ProtectedRoute>
                      <ClientLayout>
                        <Course />
                      </ClientLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/curso/:courseId/info"
                  element={
                    <ProtectedRoute>
                      <ClientLayout>
                        <CourseInfo />
                      </ClientLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/aula/:lessonId"
                  element={
                    <ProtectedRoute>
                      <ClientLayout>
                        <Lesson />
                      </ClientLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin"
                  element={
                    <AdminProtectedRoute>
                      <AdminLayout>
                        <AdminDashboard />
                      </AdminLayout>
                    </AdminProtectedRoute>
                  }
                />
                <Route
                  path="/certificado/:id"
                  element={<CertificateView />}
                />
                <Route
                  path="/admin/cursos"
                  element={
                    <AdminProtectedRoute>
                      <AdminLayout>
                        <AdminCourses />
                      </AdminLayout>
                    </AdminProtectedRoute>
                  }
                />
                <Route
                  path="/admin/alunos"
                  element={
                    <AdminProtectedRoute>
                      <AdminLayout>
                        <AdminStudents />
                      </AdminLayout>
                    </AdminProtectedRoute>
                  }
                />
                <Route
                  path="/admin/certificados"
                  element={
                    <AdminProtectedRoute>
                      <AdminLayout>
                        <CertificatesDashboard />
                      </AdminLayout>
                    </AdminProtectedRoute>
                  }
                />
                <Route
                  path="/admin/notificacoes"
                  element={
                    <AdminProtectedRoute>
                      <AdminLayout>
                        <AdminNotifications />
                      </AdminLayout>
                    </AdminProtectedRoute>
                  }
                />
                <Route
                  path="/admin/comentarios"
                  element={
                    <AdminProtectedRoute>
                      <AdminLayout>
                        <AdminComments />
                      </AdminLayout>
                    </AdminProtectedRoute>
                  }
                />
                <Route
                  path="/admin/checkout"
                  element={
                    <AdminProtectedRoute>
                      <AdminLayout>
                        <Placeholder
                          title="Checkout"
                          description="Configure sua página de checkout"
                          icon={<ShoppingCart className="w-8 h-8 text-primary" />}
                        />
                      </AdminLayout>
                    </AdminProtectedRoute>
                  }
                />
                <Route
                  path="/admin/produtos"
                  element={
                    <AdminProtectedRoute>
                      <AdminLayout>
                        <ProductsPage />
                      </AdminLayout>
                    </AdminProtectedRoute>
                  }
                />
                <Route
                  path="/admin/pedidos"
                  element={
                    <AdminProtectedRoute>
                      <AdminLayout>
                        <OrdersPage />
                      </AdminLayout>
                    </AdminProtectedRoute>
                  }
                />
                <Route
                  path="/admin/vendas"
                  element={
                    <AdminProtectedRoute>
                      <AdminLayout>
                        <SalesDashboard />
                      </AdminLayout>
                    </AdminProtectedRoute>
                  }
                />
                <Route
                  path="/admin/clientes"
                  element={
                    <AdminProtectedRoute>
                      <AdminLayout>
                        <CustomersPage />
                      </AdminLayout>
                    </AdminProtectedRoute>
                  }
                />
                <Route
                  path="/admin/orderbump"
                  element={
                    <AdminProtectedRoute>
                      <AdminLayout>
                        <OrderBumpsPage />
                      </AdminLayout>
                    </AdminProtectedRoute>
                  }
                />
                <Route
                  path="/admin/carrosseis"
                  element={
                    <AdminProtectedRoute>
                      <AdminLayout>
                        <AdminCarousels />
                      </AdminLayout>
                    </AdminProtectedRoute>
                  }
                />
                <Route
                  path="/admin/sandbox"
                  element={
                    <AdminProtectedRoute>
                      <AdminLayout>
                        <AdminDesignSandbox />
                      </AdminLayout>
                    </AdminProtectedRoute>
                  }
                />
                <Route
                  path="/admin/personalizacao"
                  element={
                    <AdminProtectedRoute>
                      <AdminLayout>
                        <ThemeCustomization />
                      </AdminLayout>
                    </AdminProtectedRoute>
                  }
                />
                <Route
                  path="/admin/gateways"
                  element={
                    <AdminProtectedRoute>
                      <AdminLayout>
                        <GatewaysPage />
                      </AdminLayout>
                    </AdminProtectedRoute>
                  }
                />
                <Route
                  path="/admin/webhooks"
                  element={
                    <AdminProtectedRoute>
                      <AdminLayout>
                        <WebhookHub />
                      </AdminLayout>
                    </AdminProtectedRoute>
                  }
                />
                <Route
                  path="/admin/emails"
                  element={
                    <AdminProtectedRoute>
                      <AdminLayout>
                        <EmailSettings />
                      </AdminLayout>
                    </AdminProtectedRoute>
                  }
                />
                <Route
                  path="/admin/whatsapp"
                  element={
                    <AdminProtectedRoute>
                      <AdminLayout>
                        <WhatsAppSettings />
                      </AdminLayout>
                    </AdminProtectedRoute>
                  }
                />
                <Route
                  path="/perfil"
                  element={
                    <ProtectedRoute>
                      <ClientLayout>
                        <Profile />
                      </ClientLayout>
                    </ProtectedRoute>
                  }
                />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </PlatformSettingsProvider>
      </ThemeProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
