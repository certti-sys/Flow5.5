import { Outlet } from "react-router-dom";
import { GraduationCap, Lock } from "lucide-react";

export function CheckoutLayout() {
    return (
        <div
            className="min-h-screen flex flex-col"
            style={{ backgroundColor: 'var(--checkout-bg, hsl(var(--background)))' }}
        >
            {/* Header Minimalista */}
            <header className="bg-card border-b py-4">
                <div className="container max-w-5xl mx-auto px-4 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <GraduationCap className="h-6 w-6 text-primary" />
                        <span className="font-semibold text-lg">EduStream</span>
                    </div>
                    <div className="flex items-center gap-1 text-sm font-medium text-green-600 [body[data-checkout-theme='light']_&]:text-emerald-700">
                        <Lock className="w-4 h-4" />
                        <span>Ambiente Seguro</span>
                    </div>
                </div>
            </header>

            {/* Conteúdo Central */}
            <main className="flex-1 container max-w-5xl mx-auto px-4 py-6">
                <Outlet />
            </main>

            {/* Footer Minimalista */}
            <footer className="bg-card border-t py-6 text-center text-sm text-muted-foreground">
                <p>&copy; {new Date().getFullYear()} EduStream. Todos os direitos reservados.</p>
                <div className="mt-2 flex justify-center gap-4">
                    <span>Termos de Uso</span>
                    <span>Política de Privacidade</span>
                </div>
            </footer>
        </div>
    );
}
