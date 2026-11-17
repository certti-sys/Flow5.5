import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageContainerProps {
  children: ReactNode;
  className?: string;
}

/**
 * Wrapper padrão de página.
 *
 * Reproduz o espaçamento do Admin Dashboard: `container` centralizado
 * (máx. 1400px pelo tailwind.config) com padding responsivo
 * `p-4 sm:p-6`. Use em todas as páginas internas para manter o mesmo
 * gutter lateral; o Dashboard do aluno (carrossel) é a única exceção.
 *
 * `t-page` dá a entrada de página (fade + 8px): como o container monta por
 * rota, toda navegação tem o mesmo movimento, sem AnimatePresence global.
 */
export function PageContainer({ children, className }: PageContainerProps) {
  return (
    <div className={cn("container mx-auto p-4 sm:p-6 t-page", className)}>
      {children}
    </div>
  );
}
