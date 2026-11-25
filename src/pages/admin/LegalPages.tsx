import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

type LegalSlug = "terms" | "privacy" | "lgpd";

const PAGES: { slug: LegalSlug; title: string; hint: string; rota: string }[] = [
  {
    slug: "terms",
    title: "Termos de Uso",
    hint: "Exibido em /termos e no consentimento do checkout.",
    rota: "/termos",
  },
  {
    slug: "privacy",
    title: "Política de Privacidade",
    hint: "Exibido em /privacidade e no rodapé do checkout.",
    rota: "/privacidade",
  },
  {
    slug: "lgpd",
    title: "Privacidade e LGPD",
    hint: "Exibido em /lgpd e no rodapé da área do aluno.",
    rota: "/lgpd",
  },
];

export default function LegalPages() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<Record<LegalSlug, { title: string; content: string }>>({
    terms: { title: "", content: "" },
    privacy: { title: "", content: "" },
    lgpd: { title: "", content: "" },
  });

  const { isLoading } = useQuery({
    queryKey: ["legal-pages"],
    queryFn: async () => {
      const { data, error } = await supabase.from("legal_pages").select("slug, title, content");
      if (error) throw error;
      const next = { ...form };
      for (const row of data ?? []) {
        if (row.slug in next) {
          next[row.slug as LegalSlug] = { title: row.title, content: row.content };
        }
      }
      setForm(next);
      return data;
    },
  });

  const save = useMutation({
    mutationFn: async ({ slug, title, content }: { slug: LegalSlug; title: string; content: string }) => {
      const { data: auth } = await supabase.auth.getUser();
      const { error } = await supabase.from("legal_pages").upsert(
        { slug, title, content, updated_at: new Date().toISOString(), updated_by: auth.user?.id ?? null },
        { onConflict: "slug" },
      );
      if (error) throw error;
    },
    onSuccess: (_r, v) => {
      toast.success(`${PAGES.find((p) => p.slug === v.slug)?.title} salva`);
      queryClient.invalidateQueries({ queryKey: ["legal-pages"] });
    },
    onError: (e) => toast.error(`Erro ao salvar: ${e.message}`),
  });

  useEffect(() => {
    document.title = "LGPD e páginas legais — Admin";
  }, []);

  return (
    <div className="space-y-6 p-4 md:p-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">LGPD e páginas legais</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Conteúdo público, editável aqui. Texto puro — quebras de linha são preservadas; HTML não é interpretado.
        </p>
      </header>

      {isLoading ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
        </div>
      ) : (
        <div className="grid gap-5 xl:grid-cols-3">
          {PAGES.map((page) => (
            <Card key={page.slug}>
              <CardHeader>
                <CardTitle className="text-base">{page.title}</CardTitle>
                <p className="text-xs text-muted-foreground">
                  {page.hint} Rota: <code>{page.rota}</code>
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor={`title-${page.slug}`}>Título</Label>
                  <Input
                    id={`title-${page.slug}`}
                    value={form[page.slug].title}
                    onChange={(e) =>
                      setForm((s) => ({ ...s, [page.slug]: { ...s[page.slug], title: e.target.value } }))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`content-${page.slug}`}>Conteúdo</Label>
                  <Textarea
                    id={`content-${page.slug}`}
                    value={form[page.slug].content}
                    onChange={(e) =>
                      setForm((s) => ({ ...s, [page.slug]: { ...s[page.slug], content: e.target.value } }))
                    }
                    rows={14}
                    className="whitespace-pre-wrap font-sans"
                  />
                  <p className="text-xs text-muted-foreground">
                    Use Enter para quebrar linha. Sem HTML, sem links clicáveis no conteúdo.
                  </p>
                </div>
                <Button
                  onClick={() =>
                    save.mutate({
                      slug: page.slug,
                      title: form[page.slug].title.trim(),
                      content: form[page.slug].content,
                    })
                  }
                  disabled={save.isPending}
                >
                  {save.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Salvar
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
