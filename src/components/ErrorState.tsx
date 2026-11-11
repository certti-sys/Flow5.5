import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
}

/**
 * Estado de erro padrão para falhas de carregamento (P0-2).
 * Usar com `isError`/`refetch` do react-query:
 *
 * const { data, isError, refetch } = useQuery(...)
 * {isError ? <ErrorState onRetry={() => refetch()} /> : (...)}
 */
export function ErrorState({
  title = "Não foi possível carregar",
  description = "Ocorreu um erro ao buscar os dados. Verifique sua conexão e tente novamente.",
  onRetry,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center gap-4 py-12 px-4 text-center"
    >
      <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
        <AlertTriangle className="w-6 h-6 text-red-500" aria-hidden="true" />
      </div>
      <div className="space-y-1">
        <h3 className="text-[16px] font-bold text-white">{title}</h3>
        <p className="text-[13px] text-muted-foreground max-w-sm">{description}</p>
      </div>
      {onRetry && (
        <Button
          variant="outline"
          onClick={onRetry}
          className="glass-card border-white/10 hover:bg-white/5 rounded-[12px] bg-transparent text-white font-bold"
        >
          <RefreshCw className="w-4 h-4 mr-2" aria-hidden="true" />
          Tentar novamente
        </Button>
      )}
    </div>
  );
}
