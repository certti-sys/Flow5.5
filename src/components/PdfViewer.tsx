import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Loader2,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { ZOOM_STEPS, nextZoom } from "@/lib/pdf-viewer";

/**
 * Leitor de PDF em canvas.
 *
 * Cada página tem seu `<canvas>` e só é desenhada quando entra na tela: um deck
 * de 200 páginas renderizado de uma vez trava o navegador e consome memória na
 * casa dos GB.
 *
 * A URL vem assinada e curta da edge `lesson-file-url` — este componente não
 * sabe do bucket nem checa acesso.
 */

interface PdfViewerProps {
  url: string;
  title: string;
  /** Nome sugerido no download. */
  fileName?: string;
}

export function PdfViewer({ url, title, fileName }: PdfViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRefs = useRef<Map<number, HTMLCanvasElement>>(new Map());
  // página -> escala já desenhada, para não redesenhar a cada mudança de scroll.
  const renderedRef = useRef<Map<number, number>>(new Map());
  const docRef = useRef<any>(null);
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setNumPages(0);
    setCurrentPage(1);
    renderedRef.current.clear();

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

  // Recriar o observer a cada zoom faz o callback inicial disparar de novo para
  // as páginas visíveis — é assim que elas são redesenhadas na nova escala.
  // `renderedRef` poupa as que já estão na escala atual.
  useEffect(() => {
    const container = containerRef.current;
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

  const goToPage = useCallback(
    (page: number) => {
      const target = Math.min(Math.max(1, page), numPages || 1);
      containerRef.current
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
        <span className="text-xs font-semibold truncate max-w-[40%]" title={title}>
          {title}
        </span>

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

      <div
        ref={containerRef}
        className={`overflow-auto bg-black/60 p-4 space-y-4 ${isFullscreen ? "flex-1" : "max-h-[70vh]"}`}
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
            className="mx-auto bg-white shadow-lg"
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
          </div>
        ))}
      </div>
    </div>
  );
}
