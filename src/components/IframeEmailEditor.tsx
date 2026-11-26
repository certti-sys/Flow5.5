import { useCallback, useEffect, useRef, useState } from "react";
import { MousePointer2, Pencil, Check, RotateCcw } from "lucide-react";
import { limparPreviewParaSalvar } from "@/lib/inline-email";

/**
 * Editor visual que edita o DENTRO de um iframe com o documento completo.
 *
 * Diferente da abordagem anterior (injetar body.innerHTML num <div>), o iframe
 * mantém doctype, <head>, <style> e tabelas intactos — e isola o CSS do e-mail
 * da interface administrativa. O clique marca o nó como contenteditable; ao
 * salvar, serializamos documentElement.outerHTML e removemos apenas o que o
 * envio adiciona (rodapé, pixel e links rastreados).
 */
const EDITAVEIS = "p, h1, h2, h3, h4, h5, h6, td, th, li, a, strong, b, span, small, div";

interface IframeEmailEditorProps {
  html: string;
  onChange: (html: string) => void;
  altura?: number;
}

export function IframeEmailEditor({ html, onChange, altura = 460 }: IframeEmailEditorProps) {
  const frame = useRef<HTMLIFrameElement>(null);
  const docAtual = useRef<Document | null>(null);
  const handlers = useRef<{ click: (e: MouseEvent) => void; focusout: (e: FocusEvent) => void } | null>(null);
  const editando = useRef<HTMLElement | null>(null);
  const onChangeRef = useRef(onChange);
  const [ativo, setAtivo] = useState(false);
  const [dica, setDica] = useState(false);
  const [versao, setVersao] = useState(0);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const finalizar = useCallback(() => {
    const el = editando.current;
    const doc = frame.current?.contentDocument;
    if (!el || !doc) return;

    el.removeAttribute("contenteditable");
    el.style.outline = "";
    el.style.outlineOffset = "";
    el.style.borderRadius = "";
    editando.current = null;
    setAtivo(false);

    const doctype = doc.doctype ? `<!DOCTYPE ${doc.doctype.name}>` : "";
    const bruto = `${doctype}\n${doc.documentElement.outerHTML}`;
    const limpo = limparPreviewParaSalvar(bruto);
    if (limpo) onChangeRef.current(limpo);
  }, []);

  const preparar = useCallback(() => {
    const doc = frame.current?.contentDocument;
    if (!doc?.body) return;

    if (docAtual.current && handlers.current) {
      docAtual.current.removeEventListener("click", handlers.current.click);
      docAtual.current.removeEventListener("focusout", handlers.current.focusout);
    }

    const click = (ev: MouseEvent) => {
      if (editando.current) return;
      const alvo = (ev.target as HTMLElement).closest?.(EDITAVEIS);
      if (!alvo || alvo.closest("[data-flow-tracking]")) return;
      ev.preventDefault();

      const el = alvo as HTMLElement;
      el.setAttribute("contenteditable", "true");
      el.style.outline = "2px solid rgba(52, 211, 153, .8)";
      el.style.outlineOffset = "2px";
      el.style.borderRadius = "3px";
      el.focus();

      const range = doc.createRange();
      range.selectNodeContents(el);
      const sel = doc.defaultView?.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);

      editando.current = el;
      setAtivo(true);
    };

    const focusout = (ev: FocusEvent) => {
      if (!editando.current) return;
      const proximo = ev.relatedTarget as Node | null;
      if (!proximo || !doc.contains(proximo)) finalizar();
    };

    doc.addEventListener("click", click);
    doc.addEventListener("focusout", focusout);
    docAtual.current = doc;
    handlers.current = { click, focusout };
  }, [finalizar]);

  useEffect(
    () => () => {
      if (docAtual.current && handlers.current) {
        docAtual.current.removeEventListener("click", handlers.current.click);
        docAtual.current.removeEventListener("focusout", handlers.current.focusout);
      }
    },
    [],
  );

  const descartar = () => {
    editando.current = null;
    setAtivo(false);
    setVersao((v) => v + 1);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-[12px] uppercase tracking-widest text-muted-foreground font-bold">
            Prévia editável
          </span>
          <span
            className="text-white/40 cursor-help"
            title="Clique em qualquer texto do e-mail para editar no próprio preview"
            onMouseEnter={() => setDica(true)}
            onMouseLeave={() => setDica(false)}
          >
            <MousePointer2 className="w-3.5 h-3.5" />
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-white/40 flex items-center gap-1.5">
            {ativo ? (
              <>
                <Check className="w-3 h-3 text-emerald-400" /> editando — clique fora ou salve
              </>
            ) : (
              <>
                <Pencil className="w-3 h-3" /> clique no texto para editar
              </>
            )}
          </span>
          {ativo && (
            <button
              type="button"
              onClick={finalizar}
              className="px-2.5 py-1 rounded-md bg-primary/15 text-primary text-[11px] font-bold"
            >
              Salvar edição
            </button>
          )}
          <button
            type="button"
            onClick={descartar}
            title="Recarregar o preview e descartar alterações não salvas"
            className="p-1 rounded-md text-white/40 hover:text-white hover:bg-white/10"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      {dica && (
        <p className="text-[11px] text-amber-400">
          Rodapé e pixel são gerados no envio e não podem ser editados aqui.
        </p>
      )}
      <div className="rounded-xl overflow-hidden border border-white/10 bg-white">
        <iframe
          key={versao}
          ref={frame}
          title="Prévia editável do e-mail"
          srcDoc={html}
          sandbox="allow-same-origin"
          onLoad={preparar}
          style={{ width: "100%", height: altura, display: "block", background: "#fff" }}
        />
      </div>
    </div>
  );
}
