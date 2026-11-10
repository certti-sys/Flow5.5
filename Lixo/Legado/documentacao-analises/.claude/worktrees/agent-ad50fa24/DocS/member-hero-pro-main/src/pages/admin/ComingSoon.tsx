import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface ComingSoonProps {
  title?: string;
}

export default function ComingSoon({ title = "Novo Recurso" }: ComingSoonProps) {
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-8rem)]">
      <div className="text-center space-y-6 max-w-md px-6">
        {/* Ícone animado */}
        <div className="flex justify-center">
          <div className="p-6 rounded-2xl glass-card border border-border/50 animate-pulse">
            <Sparkles className="h-16 w-16 text-primary" />
          </div>
        </div>

        {/* Título */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground">
            {title}
          </h1>
          <p className="text-lg text-primary font-medium">
            Em Desenvolvimento
          </p>
        </div>

        {/* Descrição */}
        <p className="text-muted-foreground leading-relaxed">
          Este recurso estará disponível em breve. Estamos trabalhando para 
          trazer a melhor experiência para você!
        </p>

        {/* Botão */}
        <Button
          onClick={() => navigate("/admin")}
          className="mt-4 bg-primary hover:bg-primary/90 text-primary-foreground"
        >
          Voltar ao Dashboard
        </Button>
      </div>
    </div>
  );
}
