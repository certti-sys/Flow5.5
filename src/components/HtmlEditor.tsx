import { useEffect } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { Bold, Italic, List, ListOrdered, Link2, Unlink, Code2, Eye } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Editor de HTML com duas visões: Visual (WYSIWYG) e Código.
 * O HTML gerado é o mesmo que alimenta o preview e o envio — a aba Visual
 * só edita o DOM do Tiptap; a aba Código edita a string diretamente.
 */
interface HtmlEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

export function HtmlEditor({ value, onChange, placeholder = "Escreva seu e-mail…" }: HtmlEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Link.configure({ openOnClick: false, HTMLAttributes: { rel: "noopener noreferrer" } }),
      Placeholder.configure({ placeholder }),
    ],
    content: value || "",
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        class: "tiptap-content min-h-[240px] outline-none px-4 py-3 text-[14px] leading-relaxed",
      },
    },
  });

  // Sincroniza quando o valor muda de fora (ex.: abrir outra campanha).
  useEffect(() => {
    if (!editor) return;
    if (editor.getHTML() !== value && !editor.isFocused) {
      editor.commands.setContent(value || "", { emitUpdate: false });
    }
  }, [editor, value]);

  if (!editor) return null;

  const btn = (label: string, title: string, active: boolean, onClick: () => void, Icon: any) => (
    <button
      type="button"
      key={label}
      title={title}
      onClick={onClick}
      className={cn(
        "w-8 h-8 rounded-lg flex items-center justify-center border text-white/70",
        active ? "bg-primary/15 border-primary/30 text-primary" : "bg-white/5 border-white/10 hover:bg-white/10",
      )}
    >
      <Icon className="w-3.5 h-3.5" />
    </button>
  );

  const setLink = () => {
    const anterior = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("URL do link", anterior ?? "https://");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };

  return (
    <div className="rounded-xl border border-white/10 bg-black/40 overflow-hidden">
      <div className="flex items-center gap-1.5 flex-wrap p-2 border-b border-white/10 bg-white/[0.02]">
        {btn("bold", "Negrito", editor.isActive("bold"), () => editor.chain().focus().toggleBold().run(), Bold)}
        {btn("italic", "Itálico", editor.isActive("italic"), () => editor.chain().focus().toggleItalic().run(), Italic)}
        {btn("h1", "Título", editor.isActive("heading", { level: 1 }), () => editor.chain().focus().toggleHeading({ level: 1 }).run(), Eye)}
        {btn("ul", "Lista", editor.isActive("bulletList"), () => editor.chain().focus().toggleBulletList().run(), List)}
        {btn("ol", "Lista numerada", editor.isActive("orderedList"), () => editor.chain().focus().toggleOrderedList().run(), ListOrdered)}
        {btn("link", "Inserir link", editor.isActive("link"), setLink, Link2)}
        {btn("unlink", "Remover link", false, () => editor.chain().focus().unsetLink().run(), Unlink)}
        <span className="ml-auto text-[10px] font-mono uppercase tracking-widest text-white/30">WYSIWYG</span>
      </div>

      <EditorContent editor={editor} />

      <div className="border-t border-white/10 flex items-center gap-2 px-3 py-2">
        <Code2 className="w-3.5 h-3.5 text-white/30" />
        <span className="text-[11px] text-white/40">HTML gerado — edite em Código no painel de campanha</span>
      </div>
    </div>
  );
}
