import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GraduationCap, Mail, Lock, User, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
});

const signupSchema = loginSchema.extend({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
});

const Login = () => {
  const navigate = useNavigate();
  const { user, signIn, signUp, resetPassword } = useAuth();
  const { settings } = usePlatformSettings();
  const [isSignup, setIsSignup] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Estados para recuperação de senha
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);

  useEffect(() => {
    if (user) {
      navigate("/dashboard");
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setLoading(true);

    try {
      if (isSignup) {
        const result = signupSchema.safeParse(formData);
        if (!result.success) {
          const fieldErrors: Record<string, string> = {};
          result.error.issues.forEach((err) => {
            if (err.path[0]) {
              fieldErrors[err.path[0].toString()] = err.message;
            }
          });
          setErrors(fieldErrors);
          setLoading(false);
          return;
        }

        const { error } = await signUp(formData.email, formData.password, formData.name);
        if (!error) {
          navigate("/dashboard");
        }
      } else {
        const result = loginSchema.safeParse(formData);
        if (!result.success) {
          const fieldErrors: Record<string, string> = {};
          result.error.issues.forEach((err) => {
            if (err.path[0]) {
              fieldErrors[err.path[0].toString()] = err.message;
            }
          });
          setErrors(fieldErrors);
          setLoading(false);
          return;
        }

        const { error } = await signIn(formData.email, formData.password);
        if (!error) {
          navigate("/dashboard");
        }
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!resetEmail) return;

    setResetLoading(true);
    const { error } = await resetPassword(resetEmail);
    setResetLoading(false);

    if (!error) {
      setShowForgotPassword(false);
      setResetEmail("");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background - conditional based on settings */}
      {settings.login_background_url ? (
        <>
          {/* Custom background image */}
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{
              backgroundImage: `url(${settings.login_background_url})`
            }}
          />
          {/* Dark overlay for readability */}
          <div
            className="absolute inset-0 bg-black transition-opacity duration-300"
            style={{
              opacity: (settings.login_overlay_opacity ?? 50) / 100
            }}
          />
        </>
      ) : (
        <>
          {/* Default gradient background */}
          <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-primary/10" />

          {/* Animated Circles */}
          <div className="absolute top-20 right-20 w-72 h-72 bg-primary/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-20 left-20 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse delay-1000" />
        </>
      )}

      <div className="relative z-10 w-full max-w-md flex flex-col items-center">
        {/* Logo FORA do card */}
        <div className="mb-6 animate-fade-in">
          {settings.logo_image_url ? (
            <img
              src={settings.logo_image_url}
              alt="Logo"
              className="h-14 object-contain"
            />
          ) : (
            <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center animate-glow">
              <GraduationCap className="w-10 h-10 text-white" />
            </div>
          )}
        </div>

        {/* Card do formulário - Glass card com sombra sutil */}
        <div className="glass-card rounded-2xl p-6 sm:p-8 shadow-lg shadow-white/10 animate-fade-in w-full max-w-sm border border-white/[0.06]">
          {/* Hierarquia visual: Título grande e escuro */}
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight text-center mb-1">
            {isSignup ? "Criar Conta" : "Bem-vindo de volta"}
          </h1>
          {/* Subtítulo menor e cinza claro */}
          <p className="text-sm sm:text-base text-white/60 text-center mb-6">
            {isSignup
              ? "Cadastre-se para começar sua jornada"
              : "Acesse sua conta para continuar aprendendo"}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
            {isSignup && (
              <div className="space-y-2">
                <Label htmlFor="name" className="text-xs font-semibold text-white/50 uppercase tracking-wider">
                  Nome completo
                </Label>
                <div className="relative flex items-center">
                  <User className="absolute left-3 w-5 h-5 text-white/40 pointer-events-none" />
                  <Input
                    id="name"
                    type="text"
                    placeholder="Seu nome completo"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="pl-10 bg-white/5 border-white/10 focus:border-primary focus:ring-primary/20 transition-colors text-white placeholder:text-white/40"
                    disabled={loading}
                  />
                </div>
                {errors.name && <p className="text-xs text-red-400 font-medium">{errors.name}</p>}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs font-semibold text-white/50 uppercase tracking-wider">
                E-mail
              </Label>
              <div className="relative flex items-center">
                <Mail className="absolute left-3 w-5 h-5 text-white/40 pointer-events-none" />
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="pl-10 bg-white/5 border-white/10 focus:border-primary focus:ring-primary/20 transition-colors text-white placeholder:text-white/40"
                  disabled={loading}
                />
              </div>
              {errors.email && <p className="text-xs text-red-400 font-medium">{errors.email}</p>}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-xs font-semibold text-white/50 uppercase tracking-wider">
                  Senha
                </Label>
                {!isSignup && (
                  <button
                    type="button"
                    onClick={() => setShowForgotPassword(true)}
                    className="text-xs text-primary/70 hover:text-primary transition-colors font-medium"
                  >
                    Esqueceu a senha?
                  </button>
                )}
              </div>
              <div className="relative flex items-center">
                <Lock className="absolute left-3 w-5 h-5 text-white/40 pointer-events-none" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="pl-10 pr-10 bg-white/5 border-white/10 focus:border-primary focus:ring-primary/20 transition-colors text-white placeholder:text-white/40"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 text-white/40 hover:text-white transition-colors cursor-pointer"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
              {errors.password && <p className="text-xs text-red-400 font-medium">{errors.password}</p>}
            </div>

            {/* Botão primário - apenas o CTA chama atenção */}
            <Button
              type="submit"
              className="w-full bg-primary text-white font-semibold py-3 px-6 rounded-xl hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/20 transition-all duration-200 text-base"
              disabled={loading}
            >
              {loading ? "Processando..." : isSignup ? "Criar Conta" : "Entrar na Plataforma"}
            </Button>
          </form>

          <p className="text-center text-sm text-white/60 mt-6">
            {isSignup ? "Já tem uma conta?" : "Não tem uma conta?"}{" "}
            <button
              onClick={() => setIsSignup(!isSignup)}
              className="text-primary hover:text-primary/90 font-medium transition-colors cursor-pointer"
              disabled={loading}
            >
              {isSignup ? "Fazer login" : "Criar conta"}
            </button>
          </p>
        </div>

        {/* Rodapé de segurança */}
        <p className="text-center text-xs text-white/50 mt-8 flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-white/40" />
          <span className="text-white/50">Protegido por criptografia de ponta a ponta</span>
        </p>
      </div>

      {/* Modal de Recuperação de Senha */}
      <Dialog open={showForgotPassword} onOpenChange={setShowForgotPassword}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Recuperar Senha</DialogTitle>
            <DialogDescription>
              Digite seu email para receber um link de recuperação de senha.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reset-email">E-mail</Label>
              <div className="relative flex items-center">
                <Mail className="absolute left-3 w-5 h-5 text-muted-foreground pointer-events-none" />
                <Input
                  id="reset-email"
                  type="email"
                  placeholder="seu@email.com"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  className="pl-10"
                  disabled={resetLoading}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleResetPassword();
                    }
                  }}
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setShowForgotPassword(false)}
              disabled={resetLoading}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleResetPassword}
              disabled={resetLoading || !resetEmail}
            >
              {resetLoading ? "Enviando..." : "Enviar Link"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Login;

