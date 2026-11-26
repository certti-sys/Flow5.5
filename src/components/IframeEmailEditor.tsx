import { useCallback, useEffect, useRef, useState } from "react";
import {
  Bold, Italic, Link2, Unlink, RotateCcw, MousePointer2, Pencil, Check, Type, X,
} from "lucide-react";
import { toast } from "sonner";
import { limparPreviewParaSalvar } from "@/lib/inline-email";

/**
 * Editor visual que edita o DENTRO de um iframe com o documento completo.
 *
 * O iframe mantém doctype, <head>, <style> e tabelas intactos e isola o CSS do
 * e-mail da admin. A barra de formatação executa comandos no contentDocument
 * (bold/italic/link) e aplica fonte/tamanho via style inline — nada é
 * reescrito globalmente, então o layout original sobrevive.
 */
const EDITAVEIS = "p, h1, h2, h3, h4, h5, h6, td, th, li, a, strong, b, span, small, div";
const TAMANHOS = ["12px", "14px", "16px", "18px", "20px", "24px", "28px", "32px", "40px"];
const FONTES = ["Arial", "Helvetica", "Verdana", "Tahoma", "Georgia", "Times New Roman"];

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
  const pausarBlur = useRef(false);
  const rangeSalva = useRef<Range | null>(null);

  const [ativo, setAtivo] = useState(false);
  const [dica, setDica] = useState(false);
  const [versao, setVersao] = useState(0);
  const [linkAberto, setLinkAberto] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [erroLink, setErroLink] = useState(false);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const doc = () => frame.current?.contentDocument ?? null;
  const selecao = () => doc()?.defaultView?.getSelection() ?? null;

  const finalizar = useCallback(() => {
    const el = editando.current;
    const d = frame.current?.contentDocument;
    if (!el || !d) return;

    el.removeAttribute("contenteditable");
    el.style.outline = "";
    el.style.outlineOffset = "";
    el.style.borderRadius = "";
    editando.current = null;
    setAtivo(false);
    setLinkAberto(false);

    const doctype = d.doctype ? `<!DOCTYPE ${d.doctype.name}>` : "";
    const bruto = `${doctype}\n${d.documentElement.outerHTML}`;
    const limpo = limparPreviewParaSalvar(bruto);
    if (limpo) onChangeRef.current(limpo);
  }, []);

  const preparar = useCallback(() => {
    const d = frame.current?.contentDocument;
    if (!d?.body) return;

    if (docAtual.current && handlers.current) {
      docAtual.current.removeEventListener("click", handlers.current.click);
      docAtual.current.removeEventListener("focusout", handlers.current.focusout);
    }

    const click = (ev: MouseEvent) => {
      if (editando.current || pausarBlur.current) return;
      const alvo = (ev.target as HTMLElement).closest?.(EDITAVEIS);
      if (!alvo || alvo.closest("[data-flow-tracking]")) return;
      ev.preventDefault();

      const el = alvo as HTMLElement;
      el.setAttribute("contenteditable", "true");
      el.style.outline = "2px solid rgba(52, 211, 153, .8)";
      el.style.outlineOffset = "2px";
      el.style.borderRadius = "3px";
      el.focus();

      const range = d.createRange();
      range.selectNodeContents(el);
      const sel = d.defaultView?.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);

      editando.current = el;
      rangeSalva.current = range.cloneRange();
      setAtivo(true);
    };

    const focusout = (ev: FocusEvent) => {
      if (!editando.current || pausarBlur.current) return;
      const proximo = ev.relatedTarget as Node | null;
      if (!proximo || !d.contains(proximo)) finalizar();
    };

    d.addEventListener("click", click);
    d.addEventListener("focusout", focusout);
    docAtual.current = d;
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

  const guardarSelecao = () => {
    const sel = selecao();
    if (sel?.rangeCount) rangeSalva.current = sel.getRangeAt(0).cloneRange();
  };

  // O foco sai do iframe quando se usa input/select da barra. Restaurar o
  // range antes de executar é obrigatório: execCommand age no documento ativo.
  const restaurarSelecao = () => {
    const d = doc();
    const el = editando.current;
    if (!d || !el) return false;
    el.focus();
    const sel = d.defaultView?.getSelection();
    if (rangeSalva.current && sel) {
      sel.removeAllRanges();
      sel.addRange(rangeSalva.current);
    }
    return true;
  };

  const aplicarEstilo = (propriedade: string, valor: string) => {
    const d = doc();
    const el = editando.current;
    if (!d || !el) return;

    const sel = selecao();
    if (sel && !sel.isCollapsed && sel.rangeCount) {
      const range = sel.getRangeAt(0);
      const span = d.createElement("span");
      span.style.setProperty(propriedade, valor);
      try {
        range.surroundContents(span);
      } catch {
        el.style.setProperty(propriedade, valor);
      }
    } else {
      el.style.setProperty(propriedade, valor);
    }
  };

  const abrirLink = (ev: React.MouseEvent) => {
    ev.preventDefault();
    guardarSelecao();
    pausarBlur.current = true;
    setErroLink(false);
    setLinkUrl("");
    setLinkAberto(true);
  };

  const aplicarLink = () => {
    const url = linkUrl.trim();
    if (!/^(https?:\/\/|\/)/i.test(url)) {
      setErroLink(true);
      toast.error("Use uma URL http://, https:// ou um caminho começando com /.");
      return;
    }
    const d = doc();
    if (!d || !restaurarSelecao()) return;
    d.execCommand("createLink", false, url);
    rangeSalva.current = null;
    pausarBlur.current = false;
    setLinkAberto(false);
    setLinkUrl("");
  };

  const cancelarLink = () => {
    rangeSalva.current = null;
    pausarBlur.current = false;
    setLinkAberto(false);
    setLinkUrl("");
  };

  const descartar = () => {
    editando.current = null;
    pausarBlur.current = false;
    setAtivo(false);
    setLinkAberto(false);
    setVersao((v) => v + 1);
  };

  const btn = "p-1.5 rounded-md text-white/70 hover:text-white hover:bg-white/10 disabled:opacity-30";

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

      {ativo && (
        <div className="flex flex-wrap items-center gap-1 p-1.5 rounded-lg border border-white/10 bg-white/5">
          <button
            type="button"
            className={btn}
            title="Negrito"
            onMouseDown={(e) => {
              e.preventDefault();
              guardarSelecao();
              aplicarEstilo("font-weight", "700");
            }}
          >
            <Bold className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            className={btn}
            title="Itálico"
            onMouseDown={(e) => {
              e.preventDefault();
              guardarSelecao();
              aplicarEstilo("font-style", "italic");
            }}
          >
            <Italic className="w-3.5 h-3.5" />
          </button>
          <span className="w-px h-5 bg-white/10 mx-1" />
          <button type="button" className={btn} title="Inserir ou editar link" onMouseDown={abrirLink}>
            <Link2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            className={btn}
            title="Remover link"
            onMouseDown={(e) => {
              e.preventDefault();
              guardarSelecao();
              doc()?.execCommand("unlink");
            }}
          >
            <Unlink className="w-3.5 h-3.5" />
          </button>
          <span className="w-px h-5 bg-white/10 mx-1" />
          <span className="flex items-center gap-1 text-[11px] text-white/50">
            <Type className="w-3.5 h-3.5" />
            <select
              aria-label="Fonte"
              defaultValue=""
              onMouseDown={() => { pausarBlur.current = true; guardarSelecao(); }}
              onBlur={() => { pausarBlur.current = false; }}
              onChange={(e) => {
                pausarBlur.current = false;
                restaurarSelecao();
                if (e.target.value) aplicarEstilo("font-family", `'${e.target.value}', Arial, sans-serif`);
              }}
              className="bg-black/40 border border-white/10 rounded text-[11px] text-white px-1.5 py-1"
            >
              <option value="">Fonte</option>
              {FONTES.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
            <select
              aria-label="Tamanho"
              defaultValue=""
              onMouseDown={() => { pausarBlur.current = true; guardarSelecao(); }}
              onBlur={() => { pausarBlur.current = false; }}
              onChange={(e) => {
                pausarBlur.current = false;
                restaurarSelecao();
                if (e.target.value) aplicarEstilo("font-size", e.target.value);
              }}
              className="bg-black/40 border border-white/10 rounded text-[11px] text-white px-1.5 py-1"
            >
              <option value="">Tamanho</option>
              {TAMANHOS.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </span>
          {linkAberto && (
            <span className="flex items-center gap-1 ml-auto">
              <input
                autoFocus
                value={linkUrl}
                onChange={(e) => { setLinkUrl(e.target.value); setErroLink(false); }}
                onKeyDown={(e) => { if (e.key === "Enter") aplicarLink(); if (e.key === "Escape") cancelarLink(); }}
                placeholder="https://..."
                className={`bg-black/40 border rounded px-2 py-1 text-[11px] text-white w-56 ${erroLink ? "border-red-500" : "border-white/10"}`}
              />
              <button type="button" onClick={aplicarLink} className="px-2 py-1 rounded bg-primary/15 text-primary text-[11px] font-bold">
                Aplicar
              </button>
              <button type="button" onClick={cancelarLink} className={btn} title="Cancelar">
                <X className="w-3.5 h-3.5" />
              </button>
            </span>
          )}
        </div>
      )}

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
