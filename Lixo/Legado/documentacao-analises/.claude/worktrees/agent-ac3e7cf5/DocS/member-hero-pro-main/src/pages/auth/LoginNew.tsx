import { useState, FormEvent, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { z } from "zod";
import loginHero from "@/assets/login-hero.png";

const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres"),
});

export default function LoginNew() {
  const navigate = useNavigate();
  const { signIn, signUp, isAuthenticated, role } = useSupabaseAuth();
  const [loginType, setLoginType] = useState<'student' | 'admin'>('student');
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  // Redirect if already authenticated (usando useEffect para evitar loops)
  useEffect(() => {
    if (isAuthenticated) {
      navigate(role === 'admin' ? '/admin' : '/student', { replace: true });
    }
  }, [isAuthenticated, role, navigate]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    // Validation
    const validation = loginSchema.safeParse({ email, password });
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }

    setIsLoading(true);

    try {
      const result = await signIn(email, password);

      if (!result.success) {
        toast.error(result.error || "Erro ao fazer login");
        return;
      }

      toast.success("Login realizado com sucesso!");
      // Navigation will happen automatically via AuthContext
    } catch (error) {
      toast.error("Erro inesperado ao fazer login");
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = () => {
    toast.info("Funcionalidade de recuperação de senha em breve!");
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const { clientX, clientY, currentTarget } = e;
    const { width, height, left, top } = currentTarget.getBoundingClientRect();
    
    // Calcula posição relativa (-1 a 1)
    const x = ((clientX - left) / width - 0.5) * 2;
    const y = ((clientY - top) / height - 0.5) * 2;
    
    setMousePosition({ x, y });
  };

  // Credenciais de teste
  const TEST_CREDENTIALS = {
    admin: { email: 'admin@memberhero.com', password: 'Admin123!', name: 'Administrador Teste' },
    student: { email: 'aluno@memberhero.com', password: 'Aluno123!', name: 'Aluno Teste' }
  };

  const handleQuickLogin = async (type: 'admin' | 'student') => {
    const creds = TEST_CREDENTIALS[type];
    setEmail(creds.email);
    setPassword(creds.password);
    setIsLoading(true);
    
    try {
      // Tenta fazer login
      let result = await signIn(creds.email, creds.password);
      
      // Se falhar, tenta registrar primeiro
      if (!result.success) {
        await signUp(creds.name, creds.email, creds.password);
        // Aguarda um pouco para o trigger criar o usuário
        await new Promise(resolve => setTimeout(resolve, 1000));
        // Tenta login novamente
        result = await signIn(creds.email, creds.password);
      }
      
      if (result.success) {
        toast.success(`Login como ${type === 'admin' ? 'Admin' : 'Aluno'} realizado!`);
        // Navigation will be handled by AuthContext based on user role
      } else {
        toast.error(result.error || "Erro no login rápido");
      }
    } catch (error) {
      toast.error('Erro no login rápido');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Mobile Hero - Miniatura no topo (apenas mobile/tablet) */}
      <div className="lg:hidden w-full h-48 relative overflow-hidden">
        <img 
          src={loginHero} 
          alt="Hero"
          onLoad={() => setImageLoaded(true)}
          className={`absolute inset-0 w-full h-full object-cover transition-all duration-1000 ease-out ${
            imageLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-105'
          }`}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#0A0A0A]" />
      </div>

      {/* Desktop Hero - Esquerda com parallax */}
      <div 
        className="hidden lg:flex lg:w-1/2 relative overflow-hidden"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setMousePosition({ x: 0, y: 0 })}
      >
        {/* Imagem de fundo com parallax e fade-in */}
        <img 
          src={loginHero} 
          alt="Hero"
          onLoad={() => setImageLoaded(true)}
          style={{
            transform: `translate(${mousePosition.x * -15}px, ${mousePosition.y * -15}px) scale(1.1)`,
            transition: 'transform 0.1s ease-out'
          }}
          className={`absolute inset-0 w-full h-full object-cover transition-all duration-1000 ease-out ${
            imageLoaded ? 'opacity-100 scale-110' : 'opacity-0 scale-[1.15]'
          }`}
        />
        
        {/* Overlay com gradiente premium para escurecer levemente */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-black/60" />
        
        {/* Gradiente dourado sutil no canto */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#D4AF37]/10 to-transparent" />
      </div>

      {/* Right side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-4 sm:p-6 lg:p-8 bg-[#0A0A0A] overflow-y-auto">
        <div className="w-full max-w-md space-y-8">
          <div>
            <h2 className="text-3xl font-bold text-white mb-2">Bem-vindo de volta</h2>
            <p className="text-white/60">Entre com suas credenciais para continuar</p>
          </div>

          {/* Login Type Tabs */}
          <div className="flex gap-2 p-1 bg-white/5 rounded-lg backdrop-blur-sm border border-white/10">
            <button
              onClick={() => setLoginType('student')}
              className={`flex-1 py-2 px-4 rounded-md transition-all ${
                loginType === 'student'
                  ? 'bg-[#D4AF37] text-black font-medium'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              Aluno
            </button>
            <button
              onClick={() => setLoginType('admin')}
              className={`flex-1 py-2 px-4 rounded-md transition-all ${
                loginType === 'admin'
                  ? 'bg-[#D4AF37] text-black font-medium'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              Administrador
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-white">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-white/40" />
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/40"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-white">Senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-white/40" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10 bg-white/5 border-white/10 text-white placeholder:text-white/40"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={handleForgotPassword}
                className="text-sm text-[#D4AF37] hover:text-[#F5D46E] transition-colors"
              >
                Esqueceu a senha?
              </button>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#D4AF37] hover:bg-[#F5D46E] text-black font-medium"
            >
              {isLoading ? "Entrando..." : "Entrar"}
            </Button>
          </form>

          <div className="text-center text-sm text-white/60">
            Não tem uma conta?{" "}
            <button
              onClick={() => navigate("/register")}
              className="text-[#D4AF37] hover:text-[#F5D46E] font-medium transition-colors"
            >
              Cadastre-se
            </button>
          </div>

          {/* Botões de Login Rápido para Testes */}
          <div className="mt-6 pt-6 border-t border-white/10">
            <p className="text-center text-xs text-white/40 mb-3">Acesso Rápido (Testes)</p>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleQuickLogin('student')}
                disabled={isLoading}
                className="flex-1 border-[#D4AF37]/30 text-[#D4AF37] hover:bg-[#D4AF37]/10 hover:text-[#F5D46E]"
              >
                🎓 Entrar como Aluno
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleQuickLogin('admin')}
                disabled={isLoading}
                className="flex-1 border-[#D4AF37]/30 text-[#D4AF37] hover:bg-[#D4AF37]/10 hover:text-[#F5D46E]"
              >
                ⚙️ Entrar como Admin
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
