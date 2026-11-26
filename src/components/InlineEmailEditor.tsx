import { useCallback, useEffect, useRef, useState } from "react";
import { MousePointer2, Pencil, Check } from "lucide-react";
import { cn } from "@/lib/utils";

/** Edição inline no preview: clique no texto e altere sem destruir o HTML. */
interface InlinePreviewProps { html: string; onChange: (html: string) => void }
const EDITAVEIS = "p, h1, h2, h3, h4, td, th, li, a, strong, span, b";

export function InlineEmailEditor({ html, onChange }: InlinePreviewProps) {
  const root = useRef<HTMLDivElement>(null);
  const editando = useRef<HTMLElement | null>(null);
  const onChangeRef = useRef(onChange);
  const [ativo, setAtivo] = useState(false);
  const [dica, setDica] = useState(false);

  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);

  // Só ressincroniza quando o HTML externo muda de verdade
  useEffect(() => {
    if (!editando.current && root.current && root.current.innerHTML !== html) {
      root.current.innerHTML = html;
    }
  }, [html]);

  const finalizar = useCallback(() => {
    const el = editando.current;
    if (!el || !root.current) return;
    el.contentEditable = "false";
    el.classList.remove("inline-editing");
    editando.current = null;
    setAtivo(false);

    const clone = root.current.cloneNode(true) as HTMLElement;
    clone.querySelectorAll("[data-flow-tracking]").forEach((n) => n.remove());
    const resultado = clone.innerHTML;
    if (resultado) onChangeRef.current(resultado);
  }, []);

  // focusout nativo: o blur de contenteditable nem sempre chega ao onBlur do React
  useEffect(() => {
    const node = root.current;
    if (!node) return;
    const handler = (ev: FocusEvent) => {
      if (editando.current && (!ev.relatedTarget || !node.contains(ev.relatedTarget as Node))) finalizar();
    };
    node.addEventListener("focusout", handler);
    return () => node.removeEventListener("focusout", handler);
  }, [finalizar]);

  const editar = (ev: React.MouseEvent<HTMLDivElement>) => {
    if (editando.current) return;
    const alvo = (ev.target as HTMLElement).closest(EDITAVEIS);
    if (!alvo || alvo.closest("[data-flow-tracking]")) return;
    ev.preventDefault();
    const el = alvo as HTMLElement;
    el.contentEditable = "true";
    el.classList.add("inline-editing");
    el.focus();
    const range = document.createRange();
    range.selectNodeContents(el);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
    editando.current = el;
    setAtivo(true);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[12px] uppercase tracking-widest text-muted-foreground font-bold">Prévia editável</span>
          <span className="text-white/40 cursor-help" title="Clique em qualquer texto para editar"
            onMouseEnter={() => setDica(true)} onMouseLeave={() => setDica(false)}>
            <MousePointer2 className="w-3.5 h-3.5" />
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-white/40 flex items-center gap-1.5">
            {ativo ? <><Check className="w-3 h-3 text-emerald-400" /> editando — clique fora ou salve</>
                    : <><Pencil className="w-3 h-3" /> clique no texto para editar</>}
          </span>
          {ativo && (
            <button type="button" onClick={finalizar}
              className="px-2.5 py-1 rounded-md bg-primary/15 text-primary text-[11px] font-bold">
              Salvar edição
            </button>
          )}
        </div>
      </div>
      {dica && <p className="text-[11px] text-amber-400">Rodapé e pixel são gerados no envio e não podem ser editados aqui.</p>}
      <div ref={root} onClick={editar}
        className={cn("rounded-xl overflow-hidden border border-white/10 bg-white",
          "[&_.inline-editing]:outline-none [&_.inline-editing]:ring-2 [&_.inline-editing]:ring-primary/40",
          "[&_.inline-editing]:bg-primary/5 [&_.inline-editing]:rounded",
          "[&_[data-flow-tracking]]:opacity-70 [&_[data-flow-tracking]]:pointer-events-none")}
        dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}
