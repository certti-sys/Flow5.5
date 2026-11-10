import { ReactNode, useEffect } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: 'admin' | 'student';
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { isAuthenticated, role, isLoading } = useSupabaseAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && isAuthenticated && requiredRole && role !== requiredRole) {
      // Redireciona para a área correta baseado no role do usuário
      navigate(role === 'admin' ? '/admin' : '/student', { replace: true });
    }
  }, [isLoading, isAuthenticated, role, requiredRole, navigate]);

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-[#D4AF37] text-xl">Carregando...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  if (requiredRole && role !== requiredRole) {
    return null; // O useEffect já está lidando com o redirecionamento
  }

  return <>{children}</>;
}
