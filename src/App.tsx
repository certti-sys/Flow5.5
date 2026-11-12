import React, { lazy, Suspense } from "react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider, QueryCache } from "@tanstack/react-query";
import { toast } from "sonner";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ThemeProvider } from "@/components/ThemeProvider";
import { PlatformSettingsProvider } from "@/components/PlatformSettingsProvider";
import ProtectedRoute from "@/components/ProtectedRoute";
import AdminProtectedRoute from "@/components/AdminProtectedRoute";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import { AdminLayout } from "./components/admin/AdminLayout";
import { ClientLayout } from "./components/ClientLayout";

// Rotas carregadas sob demanda: cada página só baixa seu bundle quando visitada.
// Login, layouts e NotFound ficam estáticos porque aparecem na primeira dobra.
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Course = lazy(() => import("./pages/Course"));
const CourseInfo = lazy(() => import("./pages/CourseInfo"));
const Lesson = lazy(() => import("./pages/Lesson"));
const Profile = lazy(() => import("./pages/Profile"));
const Leaderboard = lazy(() => import("./pages/Leaderboard"));
const CertificateView = lazy(() => import("./pages/CertificateView"));
const AdminDashboard = lazy(() => import("./pages/admin/Dashboard"));
const AdminCourses = lazy(() => import("./pages/admin/Courses"));
const AdminStudents = lazy(() => import("./pages/admin/Students"));
const AdminCarousels = lazy(() => import("./pages/admin/Carousels"));
const AdminNotifications = lazy(() => import("./pages/admin/Notifications"));
const CertificatesDashboard = lazy(() => import("./pages/admin/CertificatesDashboard"));
const ThemeCustomization = lazy(() => import("./pages/admin/ThemeCustomization"));
const WebhookHub = lazy(() => import("./pages/admin/WebhookHub"));
const AdminComments = lazy(() => import("./pages/admin/Comments"));
const EmailSettings = lazy(() => import("./pages/admin/EmailSettings"));
const AdminWhatsAppSettings = lazy(() => import("./pages/admin/WhatsAppSettings"));
const AdminMonitoringSettings = lazy(() => import("./pages/admin/MonitoringSettings"));
const Placeholder = lazy(() => import("./pages/admin/Placeholder"));
const GatewaysPage = lazy(() => import("./pages/admin/Gateways"));
const ProductsPage = lazy(() => import("./pages/admin/Products"));
const OrdersPage = lazy(() => import("./pages/admin/Orders"));
const SalesDashboard = lazy(() => import("./pages/admin/SalesDashboard"));
const CustomersPage = lazy(() => import("./pages/admin/Customers"));
const AdminDesignSandbox = lazy(() => import("./pages/admin/DesignSandbox"));
const CheckoutBuilderPage = lazy(() => import("./pages/admin/CheckoutBuilder"));
const OrderBumpsPage = lazy(() => import("./pages/admin/OrderBumps"));
const AdminCouponsPage = lazy(() => import("./pages/admin/Coupons"));
import { CheckoutLayout } from "./components/checkout/CheckoutLayout";
const CheckoutPage = lazy(() => import("./pages/checkout/Checkout"));
const ThankYouPage = lazy(() => import("./pages/checkout/ThankYou"));

const RouteFallback = () => (
  <div className="min-h-screen flex items-center justify-center" role="status" aria-label="Carregando página">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
  </div>
);

// Initialize React Query client with optimized defaults
const queryClient = new QueryClient({
  // P0-2/P1-9: qualquer query que falhe avisa o usuário — falha de
  // carregamento nunca mais fica só no console.
  // PGRST116 = "nenhuma linha encontrada" do PostgREST: é estado vazio
  // legítimo (ex.: .single() em tabela sem registros), não um erro real.
  queryCache: new QueryCache({
    onError: (error) => {
      const msg = error?.message || String(error);
      if (msg.includes("PGRST116")) return;
      toast.error("Não foi possível carregar alguns dados", {
        description: msg.slice(0, 160),
      });
    },
  }),
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
            <Sonner />
            <BrowserRouter>
              <Suspense fallback={<RouteFallback />}>
                <Routes>
                <Route path="/" element={<Navigate to="/login" replace />} />
                <Route path="/login" element={<Login />} />

                {/* Checkout Routes */}
                <Route element={<CheckoutLayout />}>
                  <Route path="/checkout/:productId" element={<CheckoutPage />} />
                  {/* Link público de venda por slug (ex.: /c/meu-curso) */}
                  <Route path="/c/:slug" element={<CheckoutPage />} />
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
                        <CheckoutBuilderPage />
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
                  path="/admin/cupons"
                  element={
                    <AdminProtectedRoute>
                      <AdminLayout>
                        <AdminCouponsPage />
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
                        <AdminWhatsAppSettings />
                      </AdminLayout>
                    </AdminProtectedRoute>
                  }
                />
                <Route
                  path="/admin/monitoring"
                  element={
                    <AdminProtectedRoute>
                      <AdminLayout>
                        <AdminMonitoringSettings />
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
              </Suspense>
            </BrowserRouter>
          </TooltipProvider>
        </PlatformSettingsProvider>
      </ThemeProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
