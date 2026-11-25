import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Highlighter,
  Loader2,
  Maximize2,
  Minimize2,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { ZOOM_STEPS, nextZoom } from "@/lib/pdf-viewer";
import {
  HIGHLIGHT_CLASSES,
  HIGHLIGHT_COLORS,
  MAX_HIGHLIGHTS,
  isHighlightable,
  normalizeHighlights,
  rectFromPoints,
  type Highlight,
  type HighlightColor,
} from "@/lib/pdf-annotations";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

/**
 * Leitor de PDF em canvas.
 *
 * Cada página tem seu `<canvas>` e só é desenhada quando entra na tela: um deck
 * de 200 páginas renderizado de uma vez trava o navegador e consome memória na
 * casa dos GB.
 *
 * A URL vem assinada e curta da edge `lesson-file-url` — este componente não
 * sabe do bucket nem checa acesso.
 *
 * Marcações são por material (não por arquivo, como na referência): cada
 * material já é um PDF só. Coordenadas normalizadas sobre a página, salvas com
 * debounce de 450 ms.
 */

const ANNOTATION_DEBOUNCE_MS = 450;
const THUMB_SCALE = 0.18;

interface PdfViewerProps {
  url: string;
  title: string;
  /** Nome sugerido no download. */
  fileName?: string;
  /** Marca o PDF no banco para guardar as marcações do aluno. */
  materialId?: string;
  /** Chamado uma vez quando o aluno chega na última página. */
  onReachEnd?: () => void;
}

export function PdfViewer({ url, title, fileName, materialId, onReachEnd }: PdfViewerProps) {
  const { user } = useAuth();
  const containerRef = useRef<HTMLDivElement>(null);
  const pagesRef = useRef<HTMLDivElement>(null);
  const thumbScrollRef = useRef<HTMLDivElement>(null);
  const canvasRefs = useRef<Map<number, HTMLCanvasElement>>(new Map());
  const thumbRefs = useRef<Map<number, HTMLCanvasElement>>(new Map());
  const renderedThumbs = useRef<Set<number>>(new Set());
  // página -> escala já desenhada, para não redesenhar a cada mudança de scroll.
  const renderedRef = useRef<Map<number, number>>(new Map());
  const docRef = useRef<any>(null);
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [color, setColor] = useState<HighlightColor | null>(null);
  // Serializado: comparar o array a cada render custaria mais que o save.
  const savedRef = useRef("[]");
  const dragging = useRef<{ page: number; x: number; y: number } | null>(null);
  const [draft, setDraft] = useState<{ page: number; x: number; y: number; width: number; height: number } | null>(null);
  const reachEndFired = useRef(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setNumPages(0);
    setCurrentPage(1);
    renderedRef.current.clear();
    renderedThumbs.current.clear();
    reachEndFired.current = false;

    (async () => {
      try {
        const pdfjs = await import("pdfjs-dist");
        // Sem worker o parser roda na thread principal e a rolagem engasga.
        pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;
        const doc = await pdfjs.getDocument({ url }).promise;
        if (cancelled) {
          doc.destroy();
          return;
        }
        docRef.current = doc;
        setNumPages(doc.numPages);
        setLoading(false);
      } catch (err) {
        if (cancelled) return;
        console.error("Falha ao carregar PDF", err);
        setError("Não foi possível abrir este PDF.");
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      docRef.current?.destroy?.();
      docRef.current = null;
    };
  }, [url]);

  // Marcações do aluno neste material.
  useEffect(() => {
    setHighlights([]);
    savedRef.current = "[]";
    if (!materialId || !user) return;

    let active = true;
    supabase
      .from("lesson_pdf_annotations")
      .select("payload")
      .eq("material_id", materialId)
      .maybeSingle()
      .then(({ data, error: loadError }) => {
        if (!active) return;
        if (loadError) {
          console.error("Falha ao carregar marcações", loadError);
          return;
        }
        const list = normalizeHighlights(data?.payload);
        savedRef.current = JSON.stringify(list);
        setHighlights(list);
      });

    return () => {
      active = false;
    };
  }, [materialId, user]);

  const persist = useCallback(
    async (list: Highlight[]) => {
      if (!materialId || !user) return;
      const serialized = JSON.stringify(list);
      if (serialized === savedRef.current) return;
      savedRef.current = serialized;

      const { error: saveError } = await supabase.from("lesson_pdf_annotations").upsert(
        { user_id: user.id, material_id: materialId, payload: list, updated_at: new Date().toISOString() },
        { onConflict: "user_id,material_id" },
      );
      if (saveError) {
        // Falhou: libera o próximo save para tentar de novo.
        savedRef.current = "";
        console.error("Falha ao salvar marcações", saveError);
      }
    },
    [materialId, user],
  );

  useEffect(() => {
    if (JSON.stringify(highlights) === savedRef.current) return;
    const timer = setTimeout(() => persist(highlights), ANNOTATION_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [highlights, persist]);

  // Troca de material/navegação com marcação pendente: grava antes de perder.
  const latestRef = useRef(highlights);
  latestRef.current = highlights;
  useEffect(() => {
    return () => {
      void persist(latestRef.current);
    };
  }, [persist]);

  const renderPage = useCallback(async (pageNumber: number, scale: number) => {
    const doc = docRef.current;
    const canvas = canvasRefs.current.get(pageNumber);
    if (!doc || !canvas) return;
    if (renderedRef.current.get(pageNumber) === scale) return;

    try {
      const page = await doc.getPage(pageNumber);
      const viewport = page.getViewport({ scale });
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      canvas.width = Math.floor(viewport.width * dpr);
      canvas.height = Math.floor(viewport.height * dpr);
      canvas.style.width = `${Math.floor(viewport.width)}px`;
      canvas.style.height = `${Math.floor(viewport.height)}px`;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.scale(dpr, dpr);

      renderedRef.current.set(pageNumber, scale);
      await page.render({ canvasContext: ctx, viewport }).promise;
    } catch {
      // Render cancelado por troca de zoom: silencioso de propósito.
      renderedRef.current.delete(pageNumber);
    }
  }, []);

  // Miniaturas: renderizadas só quando entram na coluna, uma vez cada.
  const renderThumb = useCallback(async (pageNumber: number) => {
    const doc = docRef.current;
    const canvas = thumbRefs.current.get(pageNumber);
    if (!doc || !canvas || renderedThumbs.current.has(pageNumber)) return;
    renderedThumbs.current.add(pageNumber);

    try {
      const page = await doc.getPage(pageNumber);
      const viewport = page.getViewport({ scale: THUMB_SCALE });
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      await page.render({ canvasContext: ctx, viewport }).promise;
    } catch {
      renderedThumbs.current.delete(pageNumber);
    }
  }, []);

  useEffect(() => {
    const scroll = thumbScrollRef.current;
    if (!scroll || !numPages) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const page = Number(entry.target.getAttribute("data-thumb"));
          if (page) void renderThumb(page);
        });
      },
      { root: scroll, threshold: 0 },
    );

    scroll.querySelectorAll("[data-thumb]").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [numPages, renderThumb]);

  // Recriar o observer a cada zoom faz o callback inicial disparar de novo para
  // as páginas visíveis — é assim que elas são redesenhadas na nova escala.
  // `renderedRef` poupa as que já estão na escala atual.
  useEffect(() => {
    const container = pagesRef.current;
    if (!container || !numPages) return;

    // Zoom voltou para uma escala já usada: os canvas continuam com o bitmap da
    // escala anterior, então `renderedRef` mentiria e a página não redesenha.
    renderedRef.current.clear();

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        const page = visible?.target.getAttribute("data-page");
        if (!page) return;
        const n = Number(page);
        setCurrentPage(n);
        renderPage(n, zoom);
      },
      { root: container, threshold: [0.25, 0.6] },
    );

    container.querySelectorAll("[data-page]").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [numPages, zoom, renderPage]);

  // "Chegou na última página" = aula lida. Só uma vez por abertura.
  useEffect(() => {
    if (!numPages || currentPage < numPages || reachEndFired.current) return;
    reachEndFired.current = true;
    onReachEnd?.();
  }, [currentPage, numPages, onReachEnd]);

  const goToPage = useCallback(
    (page: number) => {
      const target = Math.min(Math.max(1, page), numPages || 1);
      pagesRef.current
        ?.querySelector(`[data-page="${target}"]`)
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
      setCurrentPage(target);
    },
    [numPages],
  );

  // Setas só em tela cheia: fora dela roubariam a navegação da página.
  useEffect(() => {
    if (!isFullscreen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "PageDown") {
        e.preventDefault();
        goToPage(currentPage + 1);
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        goToPage(currentPage - 1);
      } else if (e.key === "Escape") {
        setIsFullscreen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isFullscreen, currentPage, goToPage]);

  const zoomBy = (direction: 1 | -1) => {
    setZoom((z) => nextZoom(z, direction));
  };

  // ---- marcações -----------------------------------------------------------

  const pointOf = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return {
      x: Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width)),
      y: Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height)),
    };
  };

  const onPointerDown = (page: number) => (e: React.PointerEvent<HTMLDivElement>) => {
    if (!color) return;
    e.preventDefault();
    const point = pointOf(e);
    dragging.current = { page, ...point };
    setDraft({ page, ...point, width: 0, height: 0 });
  };

  const onPointerMove = (page: number) => (e: React.PointerEvent<HTMLDivElement>) => {
    const start = dragging.current;
    if (!start || start.page !== page) return;
    const point = pointOf(e);
    setDraft({ page, ...rectFromPoints(start, point) });
  };

  const onPointerUp = (page: number) => (e: React.PointerEvent<HTMLDivElement>) => {
    const start = dragging.current;
    dragging.current = null;
    setDraft(null);
    if (!start || start.page !== page || !color) return;

    const rect = rectFromPoints(start, pointOf(e));
    if (!isHighlightable(rect)) return;

    setHighlights((prev) => {
      if (prev.length >= MAX_HIGHLIGHTS) {
        toast.error(`Limite de ${MAX_HIGHLIGHTS} marcações por arquivo.`);
        return prev;
      }
      return [...prev, { id: crypto.randomUUID(), page, color, ...rect }];
    });
  };

  const removeHighlight = (id: string) => {
    setHighlights((prev) => prev.filter((item) => item.id !== id));
  };

  if (error) {
    return (
      <div className="rounded-[16px] border border-white/10 bg-black/20 p-8 text-center space-y-2">
        <p className="text-sm font-semibold">{error}</p>
        <p className="text-xs text-muted-foreground">
          O link do arquivo expira em 10 minutos. Recarregue a página para gerar outro.
        </p>
      </div>
    );
  }

  return (
    <div
      className={
        isFullscreen
          ? "fixed inset-0 z-[100] bg-black flex flex-col"
          : "rounded-[16px] border border-white/10 bg-black/30 overflow-hidden flex flex-col"
      }
    >
      <div className="flex items-center gap-2 px-3 py-2 border-b border-white/10 bg-black/40 flex-wrap">
        <span className="text-xs font-semibold truncate max-w-[30%]" title={title}>
          {title}
        </span>

        {materialId && (
          <div className="flex items-center gap-1" role="group" aria-label="Cor da marcação">
            <Highlighter className="w-3.5 h-3.5 text-muted-foreground" />
            {HIGHLIGHT_COLORS.map((item) => (
              <button
                key={item}
                type="button"
                title={color === item ? "Desligar marcação" : `Marcar em ${item}`}
                aria-label={color === item ? "Desligar marcação" : `Marcar em ${item}`}
                aria-pressed={color === item}
                onClick={() => setColor((current) => (current === item ? null : item))}
                className={`h-5 w-5 rounded-full border ${HIGHLIGHT_CLASSES[item]} ${
                  color === item ? "ring-2 ring-white ring-offset-1 ring-offset-black" : "opacity-70 hover:opacity-100"
                }`}
              />
            ))}
            {color && (
              <button
                type="button"
                onClick={() => setColor(null)}
                aria-label="Cancelar marcação"
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}

        <div className="flex items-center gap-1 ml-auto">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage <= 1}
            aria-label="Página anterior"
            className="h-8 w-8 p-0"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-xs tabular-nums text-muted-foreground min-w-[64px] text-center">
            {numPages ? `${currentPage} / ${numPages}` : "—"}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage >= numPages}
            aria-label="Próxima página"
            className="h-8 w-8 p-0"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>

          <div className="w-px h-5 bg-white/10 mx-1" />

          <Button
            variant="ghost"
            size="sm"
            onClick={() => zoomBy(-1)}
            disabled={zoom <= ZOOM_STEPS[0]}
            aria-label="Diminuir zoom"
            className="h-8 w-8 p-0"
          >
            <ZoomOut className="w-4 h-4" />
          </Button>
          <span className="text-xs tabular-nums text-muted-foreground min-w-[40px] text-center">
            {Math.round(zoom * 100)}%
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => zoomBy(1)}
            disabled={zoom >= ZOOM_STEPS[ZOOM_STEPS.length - 1]}
            aria-label="Aumentar zoom"
            className="h-8 w-8 p-0"
          >
            <ZoomIn className="w-4 h-4" />
          </Button>

          <div className="w-px h-5 bg-white/10 mx-1" />

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsFullscreen((v) => !v)}
            aria-label={isFullscreen ? "Sair da tela cheia" : "Tela cheia"}
            className="h-8 w-8 p-0"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </Button>
          <Button variant="ghost" size="sm" asChild className="h-8 w-8 p-0">
            <a href={url} download={fileName || title} aria-label="Baixar PDF">
              <Download className="w-4 h-4" />
            </a>
          </Button>
        </div>
      </div>

      {color && (
        <p className="px-3 py-1.5 text-[11px] text-amber-300 bg-amber-500/10 border-b border-amber-500/20">
          Arraste sobre a página para marcar. Clique na cor de novo para cancelar. Duplo clique apaga.
        </p>
      )}

      <div className={`flex min-h-0 ${isFullscreen ? "flex-1" : ""}`}>
        {/* Miniaturas: escondidas no celular, onde roubariam a largura da página. */}
        <aside
          ref={thumbScrollRef}
          className="hidden md:block w-28 shrink-0 overflow-y-auto border-r border-white/10 bg-black/40 p-2 space-y-2 max-h-[70vh]"
          aria-label="Miniaturas das páginas"
        >
          {Array.from({ length: numPages }, (_, i) => i + 1).map((page) => (
            <button
              key={page}
              type="button"
              data-thumb={page}
              onClick={() => goToPage(page)}
              aria-label={`Ir para a página ${page}`}
              className={`block w-full rounded border p-1 transition ${
                page === currentPage
                  ? "border-primary ring-1 ring-primary"
                  : "border-white/10 hover:border-white/40"
              }`}
            >
              <canvas
                ref={(el) => {
                  if (el) thumbRefs.current.set(page, el);
                  else thumbRefs.current.delete(page);
                }}
                className="block w-full h-auto rounded bg-white"
              />
              <span className="mt-1 block text-center text-[10px] text-muted-foreground tabular-nums">
                {page}
              </span>
            </button>
          ))}
        </aside>

        <div
          ref={pagesRef}
          className={`flex-1 overflow-auto bg-black/60 p-4 space-y-4 ${isFullscreen ? "h-full" : "max-h-[70vh]"}`}
        >
          {loading && (
            <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Carregando PDF…</span>
            </div>
          )}
          {Array.from({ length: numPages }, (_, i) => i + 1).map((page) => (
            <div
              key={page}
              data-page={page}
              className="relative mx-auto bg-white shadow-lg"
              // Altura mínima: sem ela o container fica vazio e o observer não
              // enxerga mais de uma página por vez.
              style={{ minHeight: 200 }}
            >
              <canvas
                ref={(el) => {
                  if (el) canvasRefs.current.set(page, el);
                  else canvasRefs.current.delete(page);
                }}
                className="block mx-auto"
              />

              {materialId && (
                <div
                  className={`absolute inset-0 ${color ? "cursor-crosshair" : "pointer-events-none"}`}
                  onPointerDown={onPointerDown(page)}
                  onPointerMove={onPointerMove(page)}
                  onPointerUp={onPointerUp(page)}
                  onPointerLeave={onPointerUp(page)}
                >
                  {highlights
                    .filter((item) => item.page === page)
                    .map((item) => (
                      <div
                        key={item.id}
                        title="Duplo clique para remover"
                        onDoubleClick={() => removeHighlight(item.id)}
                        className={`absolute mix-blend-multiply ${HIGHLIGHT_CLASSES[item.color]} ${
                          color ? "pointer-events-none" : "pointer-events-auto"
                        }`}
                        style={{
                          left: `${item.x * 100}%`,
                          top: `${item.y * 100}%`,
                          width: `${item.width * 100}%`,
                          height: `${item.height * 100}%`,
                        }}
                      />
                    ))}

                  {draft?.page === page && (
                    <div
                      className="pointer-events-none absolute border-2 border-dashed border-amber-300 bg-amber-400/20"
                      style={{
                        left: `${draft.x * 100}%`,
                        top: `${draft.y * 100}%`,
                        width: `${draft.width * 100}%`,
                        height: `${draft.height * 100}%`,
                      }}
                    />
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
