import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

type LegalPageKind = "terms" | "privacy" | "lgpd";

const FALLBACK: Record<LegalPageKind, { title: string; content: string }> = {
  terms: {
    title: "Termos de Uso",
    content: "Documento em elaboração. Entre em contato com o suporte para esclarecimentos.",
  },
  privacy: {
    title: "Política de Privacidade",
    content: "Documento em elaboração. Entre em contato com o suporte para esclarecimentos.",
  },
  lgpd: {
    title: "Privacidade e LGPD",
    content: "Documento em elaboração. Entre em contato com o suporte para esclarecimentos.",
  },
};

/**
 * Página legal pública. Conteúdo vem de `legal_pages` e é texto puro —
 * renderizado por whitespace-pre-wrap, nunca como HTML.
 */
export function LegalPage({ kind }: { kind: LegalPageKind }) {
  const [page, setPage] = useState(FALLBACK[kind]);

  useEffect(() => {
    let active = true;
    supabase
      .from("legal_pages")
      .select("title, content")
      .eq("slug", kind)
      .maybeSingle()
      .then(({ data }) => {
        if (active && data?.title && data?.content) {
          setPage({ title: data.title, content: data.content });
        }
      });
    return () => {
      active = false;
    };
  }, [kind]);

  return (
    <div className="min-h-screen bg-[#0b0d0c] text-[#e8ece6]">
      <header className="border-b border-white/10 px-6 py-5">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4">
          <Link to="/login" className="text-lg font-bold tracking-tight">
            EduStream
          </Link>
          <nav className="flex flex-wrap items-center gap-4 text-sm text-white/60">
            <Link to="/termos" className="hover:text-white">Termos</Link>
            <Link to="/privacidade" className="hover:text-white">Privacidade</Link>
            <Link to="/lgpd" className="hover:text-white">LGPD</Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="mb-8 text-3xl font-bold tracking-tight">{page.title}</h1>
        <article className="whitespace-pre-wrap text-[15px] leading-7 text-white/80">
          {page.content}
        </article>
        <p className="mt-12 text-xs text-white/40">
          Última atualização: conteúdo gerenciado em Admin → LGPD.
        </p>
      </main>
    </div>
  );
}
