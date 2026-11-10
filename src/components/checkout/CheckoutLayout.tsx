
import { Outlet } from "react-router-dom";
import { GraduationCap, Lock } from "lucide-react";

export function CheckoutLayout() {
    return (
        <div className="min-h-screen bg-muted/40 flex flex-col">
            {/* Header Minimalista */}
            <header className="bg-background border-b py-4">
                <div className="container max-w-6xl mx-auto px-4 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <GraduationCap className="h-6 w-6 text-primary" />
                        <span className="font-semibold text-lg">EduStream</span>
                    </div>
                    <div className="flex items-center gap-1 text-sm text-green-600 font-medium">
                        <Lock className="w-4 h-4" />
                        <span>Ambiente Seguro</span>
                    </div>
                </div>
            </header>

            {/* Conteúdo Central */}
            <main className="flex-1 container max-w-6xl mx-auto px-4 py-8">
                <Outlet />
            </main>

            {/* Footer Minimalista */}
            <footer className="bg-background border-t py-6 text-center text-sm text-muted-foreground">
                <p>&copy; {new Date().getFullYear()} EduStream. Todos os direitos reservados.</p>
                <div className="mt-2 flex justify-center gap-4">
                    <span>Termos de Uso</span>
                    <span>Política de Privacidade</span>
                </div>
            </footer>
        </div>
    );
}
