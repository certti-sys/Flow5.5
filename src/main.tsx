import React from "react";
import { createRoot } from "react-dom/client";
import "./index.css";

/**
 * Bootstrap defensivo.
 *
 * Antes, `src/integrations/supabase/client.ts` lançava uma exceção no topo do
 * módulo quando as variáveis de ambiente estavam ausentes. Como esse throw
 * acontecia durante a importação estática, o React nunca renderizava e a tela
 * ficava totalmente branca, sem nenhuma mensagem.
 *
 * Aqui a aplicação é importada dinamicamente, permitindo exibir o erro real
 * na tela em vez de uma página em branco.
 */

function renderFatalError(
  root: HTMLElement,
  title: string,
  message: string,
  hint?: string,
) {
  root.innerHTML = "";

  const wrapper = document.createElement("div");
  wrapper.style.cssText =
    "min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;background:#0b0b0f;color:#fff;font-family:Inter,system-ui,sans-serif;";

  const card = document.createElement("div");
  card.style.cssText = "max-width:620px;width:100%;";

  const heading = document.createElement("h1");
  heading.textContent = title;
  heading.style.cssText = "font-size:22px;margin:0 0 12px;";

  const text = document.createElement("pre");
  text.textContent = message;
  text.style.cssText =
    "white-space:pre-wrap;word-break:break-word;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:12px;font-size:12px;color:#fca5a5;max-height:280px;overflow:auto;margin:0 0 16px;";

  card.appendChild(heading);
  card.appendChild(text);

  if (hint) {
    const hintEl = document.createElement("p");
    hintEl.textContent = hint;
    hintEl.style.cssText = "color:rgba(255,255,255,0.75);font-size:14px;line-height:1.5;margin:0 0 16px;";
    card.appendChild(hintEl);
  }

  const button = document.createElement("button");
  button.textContent = "Recarregar página";
  button.style.cssText =
    "padding:10px 16px;border-radius:8px;border:none;cursor:pointer;background:#FF4136;color:#fff;font-weight:600;";
  button.addEventListener("click", () => window.location.reload());
  card.appendChild(button);

  wrapper.appendChild(card);
  root.appendChild(wrapper);
}

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error('Elemento "#root" não encontrado no index.html.');
}

const missingEnvVars = [
  !import.meta.env.VITE_SUPABASE_URL && "VITE_SUPABASE_URL",
  !import.meta.env.VITE_SUPABASE_ANON_KEY && "VITE_SUPABASE_ANON_KEY",
].filter(Boolean) as string[];

if (missingEnvVars.length > 0) {
  renderFatalError(
    rootElement,
    "Configuração incompleta",
    `Variáveis de ambiente ausentes: ${missingEnvVars.join(", ")}`,
    "Crie um arquivo .env na raiz do projeto (use .env.example como base), preencha a URL e a anon key do Supabase e reinicie o servidor com `npm run dev`. Em produção (Vercel), configure essas variáveis em Project Settings > Environment Variables.",
  );
} else {
  Promise.all([
    import("./App.tsx"),
    import("./components/ErrorBoundary"),
    import("./lib/monitoring"),
  ])
    .then(([appModule, errorBoundaryModule, monitoring]) => {
      monitoring.initMonitoring().catch((err) => {
        console.warn("[Monitoring] Falha ao inicializar:", err);
      });

      const App = appModule.default;
      const { ErrorBoundary } = errorBoundaryModule;

      createRoot(rootElement).render(
        <React.StrictMode>
          <ErrorBoundary>
            <App />
          </ErrorBoundary>
        </React.StrictMode>,
      );
    })
    .catch((error) => {
      console.error("Falha ao inicializar a aplicação:", error);
      renderFatalError(
        rootElement,
        "Falha ao carregar a aplicação",
        error instanceof Error ? `${error.message}\n\n${error.stack ?? ""}`.trim() : String(error),
        "Abra o console do navegador (F12) para mais detalhes.",
      );
    });
}
