import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Layers, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { toast } from "@/components/ui/sonner";

const Register = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { signUp, isAuthenticated } = useSupabaseAuth();
  const navigate = useNavigate();

  // Redirecionar se já estiver autenticado
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/student');
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name || !email || !password || !confirmPassword) {
      toast.error("Preencha todos os campos");
      return;
    }

    if (password.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("As senhas não coincidem");
      return;
    }

    setIsLoading(true);
    
    const result = await signUp(name, email, password);
    
    if (result.success) {
      toast.success("Conta criada com sucesso! Verifique seu email para confirmar.");
      navigate("/login");
    } else {
      toast.error(result.error || "Erro ao criar conta");
    }
    
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-background grid grid-cols-1 lg:grid-cols-2">
      {/* Coluna Esquerda - Branding */}
      <div className="hidden lg:flex flex-col justify-between p-12 glass-card rounded-none border-r border-white/10">
        {/* Área central com placeholder */}
        <div className="flex-1 flex items-center justify-center">
          <div className="w-64 h-64 rounded-2xl border border-white/10 bg-white/5 flex items-center justify-center backdrop-blur-sm">
            <ImageIcon className="w-20 h-20 text-white/20" />
          </div>
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
              Crie sua conta
            </h1>
            <p className="text-muted-foreground">
              Comece sua jornada de aprendizado hoje mesmo.
            </p>
          </div>

          {/* Formulário */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Nome */}
            <div className="space-y-2">
              <Label htmlFor="name" className="text-foreground">Nome completo</Label>
              <Input
                id="name"
                type="text"
                placeholder="Seu nome"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-12 bg-surface border-white/10 text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-primary"
              />
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-foreground">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="seuemail@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12 bg-surface border-white/10 text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-primary"
              />
            </div>

            {/* Senha */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-foreground">Senha</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Mínimo 6 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12 bg-surface border-white/10 text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-primary pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Confirmar Senha */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-foreground">Confirmar senha</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Digite a senha novamente"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="h-12 bg-surface border-white/10 text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-primary pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Botão Criar Conta */}
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 gold-button text-base font-semibold mt-2"
            >
              {isLoading ? "Criando conta..." : "Criar conta"}
            </Button>
          </form>

          {/* Link Login */}
          <p className="text-center text-muted-foreground">
            Já tem uma conta?{" "}
            <Link 
              to="/login" 
              className="text-primary hover:text-[hsl(var(--gold-light))] transition-colors font-medium"
            >
              Entrar
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
