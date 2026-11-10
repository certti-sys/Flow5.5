import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Layers, GraduationCap, Shield } from "lucide-react";
import loginHero from "@/assets/login-hero.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OptimizedImage } from "@/components/ui/optimized-image";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { toast } from "@/components/ui/sonner";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

const Login = () => {
  const [loginType, setLoginType] = useState<'student' | 'admin'>('student');
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { signIn, isAuthenticated, role } = useSupabaseAuth();
  const navigate = useNavigate();

  // Redirecionar se já estiver autenticado
  useEffect(() => {
    if (isAuthenticated && role) {
      navigate(role === 'admin' ? '/admin' : '/student');
    }
  }, [isAuthenticated, role, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Preencha todos os campos");
      return;
    }
    setIsLoading(true);

    const result = await signIn(email, password);
    if (result.success) {
      toast.success("Login realizado com sucesso!");
      // O redirecionamento será feito pelo useEffect quando o role for carregado
    } else {
      toast.error(result.error || "Erro ao fazer login");
    }
    setIsLoading(false);
  };

  const handleSocialLogin = (provider: string) => {
    toast.info(`Login com ${provider} em breve disponível`);
  };

  const handleForgotPassword = () => {
    toast.info("Funcionalidade de recuperação de senha em breve");
  };

  const handleQuickLogin = async (type: 'admin' | 'student') => {
    const credentials = type === 'admin' 
      ? { email: "admin@memberhero.com", password: "admin123" }
      : { email: "aluno@memberhero.com", password: "aluno123" };
    
    setEmail(credentials.email);
    setPassword(credentials.password);
    setIsLoading(true);
    
    const result = await signIn(credentials.email, credentials.password);
    if (result.success) {
      toast.success("Login realizado com sucesso!");
      // O redirecionamento será feito pelo useEffect
    } else {
      toast.error(result.error || "Erro ao fazer login");
    }
    setIsLoading(false);
  };
  return <div className="min-h-screen bg-background grid grid-cols-1 lg:grid-cols-2">
      {/* Coluna Esquerda - Branding */}
      <div className="hidden lg:flex flex-col justify-between p-8 glass-card rounded-none border-r border-white/10">
        {/* Imagem de destaque */}
        <div className="flex-1 flex items-center justify-center relative overflow-hidden rounded-2xl">
          <OptimizedImage
            src={loginHero}
            alt="Plataforma de cursos online"
            className="w-full h-full object-cover object-top absolute inset-0 rounded-2xl"
            priority={true}
            sizes="50vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent rounded-2xl" />
        </div>
        
        {/* Rodapé com ícone e texto */}
        <div className="space-y-4">
          <Layers className="w-10 h-10 text-primary" />
          <p className="text-xl text-white/80 font-light leading-relaxed">
            Aprenda. Evolua.<br />
            Transforme sua jornada.
          </p>
        </div>
      </div>

      {/* Coluna Direita - Formulário */}
      <div className="flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md space-y-8">
          {/* Logo Mobile */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <Layers className="w-8 h-8 text-primary" />
            <span className="text-xl font-bold text-white">MemberHero</span>
          </div>

          {/* Título */}
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-foreground">
              Bem-vindo(a) de volta
            </h1>
            <p className="text-muted-foreground">
              Acesse sua conta para continuar {loginType === 'student' ? 'aprendendo' : 'gerenciando'}.
            </p>
          </div>

          {/* Login Type Tabs */}
          <Tabs value={loginType} onValueChange={(v) => setLoginType(v as 'student' | 'admin')} className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-surface border border-white/10">
              <TabsTrigger value="student" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
                <GraduationCap className="w-4 h-4 mr-2" />
                Aluno
              </TabsTrigger>
              <TabsTrigger value="admin" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
                <Shield className="w-4 h-4 mr-2" />
                Administrador
              </TabsTrigger>
            </TabsList>

            <TabsContent value="student" className="mt-0"></TabsContent>
            <TabsContent value="admin" className="mt-0"></TabsContent>
          </Tabs>

          {/* Formulário */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-foreground">Email</Label>
              <Input id="email" type="email" placeholder="seuemail@exemplo.com" value={email} onChange={e => setEmail(e.target.value)} className="h-12 bg-surface border-white/10 text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-primary" />
            </div>

            {/* Senha */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-foreground">Senha</Label>
              <div className="relative">
                <Input id="password" type={showPassword ? "text" : "password"} placeholder="Digite sua senha" value={password} onChange={e => setPassword(e.target.value)} className="h-12 bg-surface border-white/10 text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-primary pr-12" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors">
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Link Esqueceu Senha */}
            <div className="flex justify-end">
              <button type="button" onClick={handleForgotPassword} className="text-sm text-primary hover:text-[hsl(var(--gold-light))] transition-colors">
                Esqueceu a senha?
              </button>
            </div>

            {/* Botão Entrar */}
            <Button type="submit" disabled={isLoading} className="w-full h-12 gold-button text-base font-semibold">
              {isLoading ? "Entrando..." : "Entrar"}
            </Button>
          </form>

          {/* Divisor */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-background text-muted-foreground">
                ou entre com
              </span>
            </div>
          </div>

          {/* Botões Sociais */}
          <div className="space-y-3">
            
            
            
          </div>

          {/* Link Registro */}
          <p className="text-center text-muted-foreground">
            Ainda não tem conta?{" "}
            <Link to="/register" className="text-primary hover:text-[hsl(var(--gold-light))] transition-colors font-medium">
              Criar conta
            </Link>
          </p>

          {/* Credenciais de Teste - Desenvolvimento */}
          <div className="mt-4 p-4 rounded-lg border border-primary/20 bg-primary/5 space-y-3">
            <p className="text-xs text-muted-foreground mb-2 text-center">
              Acesso rápido para teste:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleQuickLogin('admin')}
                disabled={isLoading}
                className="p-3 rounded-md bg-primary/10 border border-primary/30 hover:bg-primary/20 transition-colors text-center"
              >
                <p className="text-xs text-primary font-medium">Admin</p>
                <p className="text-xs text-muted-foreground">admin@memberhero.com</p>
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('student')}
                disabled={isLoading}
                className="p-3 rounded-md bg-primary/10 border border-primary/30 hover:bg-primary/20 transition-colors text-center"
              >
                <p className="text-xs text-primary font-medium">Aluno</p>
                <p className="text-xs text-muted-foreground">aluno@memberhero.com</p>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>;
};
export default Login;