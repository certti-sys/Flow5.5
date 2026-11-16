import { useState, useMemo, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Modal, ModalBody, ModalContent, ModalFooter, ModalHeader } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Upload, FileText, Download, AlertCircle, CheckCircle2 } from "lucide-react";
import { parseCsv, toCsv } from "@/lib/csv";

interface ParsedRow {
  line: number;
  name: string;
  email: string;
  whatsapp: string;
  password: string;
  problems: string[];
}

interface ImportResult {
  email: string;
  status: "created" | "exists" | "error";
  message?: string;
  emailSent?: boolean;
}

interface Summary {
  total: number;
  created: number;
  exists: number;
  errors: number;
  emailsSent: number;
}

/** Parser CSV mínimo: aspas duplas, campos com vírgula/ponto-e-vírgula e CRLF. */
const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);

interface ImportStudentsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ImportStudentsModal({ open, onOpenChange }: ImportStudentsModalProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [excluded, setExcluded] = useState<Set<number>>(new Set());
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);
  const [grantToExisting, setGrantToExisting] = useState(false);
  const [sendWelcome, setSendWelcome] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [results, setResults] = useState<ImportResult[]>([]);

  const { data: courses = [] } = useQuery({
    queryKey: ["allCourses"],
    queryFn: async () => {
      const { data, error } = await supabase.from("courses").select("id, title").order("title");
      if (error) throw error;
      return data as { id: string; title: string }[];
    },
    enabled: open,
  });

  const { data: existingEmails = [] } = useQuery({
    queryKey: ["adminStudentEmails"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("email");
      if (error) throw error;
      return (data as { email: string }[]).map((p) => p.email?.toLowerCase()).filter(Boolean);
    },
    enabled: open,
  });

  const existingSet = useMemo(() => new Set(existingEmails), [existingEmails]);
  const includedRows = rows.filter((r) => !excluded.has(r.line));

  const reset = () => {
    setFileName("");
    setRows([]);
    setExcluded(new Set());
    setSelectedCourses([]);
    setGrantToExisting(false);
    setSendWelcome(true);
    setProgress(0);
    setSummary(null);
    setResults([]);
  };

  const handleFile = async (file: File) => {
    if (!/\.csv$/i.test(file.name)) {
      toast.error("Envie um arquivo .csv");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Arquivo muito grande (máx. 2 MB).");
      return;
    }

    const text = await file.text();
    const parsed = parseCsv(text);
    if (parsed.length < 2) {
      toast.error("CSV vazio ou sem linhas de dados.");
      return;
    }

    const header = parsed[0].map((h) => h.trim().toLowerCase());
    const idx = {
      name: header.indexOf("name"),
      email: header.indexOf("email"),
      whatsapp: header.indexOf("whatsapp"),
      password: header.indexOf("password"),
    };

    if (idx.name === -1 || idx.email === -1) {
      toast.error("Colunas obrigatórias ausentes: name e email.");
      return;
    }

    const seen = new Set<string>();
    const parsedRows: ParsedRow[] = parsed.slice(1).map((cells, i) => {
      const email = (cells[idx.email] ?? "").trim().toLowerCase();
      const name = (cells[idx.name] ?? "").trim();
      const problems: string[] = [];

      if (!name) problems.push("Nome vazio");
      if (!isValidEmail(email)) problems.push("E-mail inválido");
      else if (seen.has(email)) problems.push("Duplicado no arquivo");
      else if (existingSet.has(email)) problems.push("Já cadastrado");

      if (email) seen.add(email);

      return {
        line: i + 2,
        name,
        email,
        whatsapp: (cells[idx.whatsapp] ?? "").trim(),
        password: (cells[idx.password] ?? "").trim(),
        problems,
      };
    });

    setFileName(file.name);
    setRows(parsedRows);
    // Linhas inválidas começam desmarcadas: o admin vê o motivo e decide.
    setExcluded(new Set(parsedRows.filter((r) => r.problems.length > 0).map((r) => r.line)));
    setSummary(null);
    setResults([]);
  };

  const toggleRow = (line: number) => {
    setExcluded((prev) => {
      const next = new Set(prev);
      if (next.has(line)) next.delete(line);
      else next.add(line);
      return next;
    });
  };

  const toggleCourse = (courseId: string) => {
    setSelectedCourses((prev) =>
      prev.includes(courseId) ? prev.filter((id) => id !== courseId) : [...prev, courseId],
    );
  };

  const downloadTemplate = () => {
    const csv = toCsv(
      ["name", "email", "whatsapp", "password"],
      [["Maria Silva", "maria@exemplo.com", "5511999999999", ""]],
    );
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "modelo-importacao-alunos.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async () => {
    if (includedRows.length === 0) {
      toast.error("Nenhuma linha selecionada para importar.");
      return;
    }
    if (!sendWelcome && includedRows.some((r) => !r.password)) {
      toast.error("Sem e-mail de acesso, todos precisam ter senha na planilha.");
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      toast.error("Sessão expirada. Faça login novamente.");
      return;
    }

    setIsImporting(true);
    setProgress(0);

    // Lotes de 25: a função limita 100 por requisição e o rate limit é por admin.
    const BATCH = 25;
    const allResults: ImportResult[] = [];

    try {
      for (let i = 0; i < includedRows.length; i += BATCH) {
        const batch = includedRows.slice(i, i + BATCH);

        const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-user`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
            "X-Requested-With": "XMLHttpRequest",
          },
          body: JSON.stringify({
            users: batch.map((r) => ({
              name: r.name,
              email: r.email,
              whatsapp: r.whatsapp || undefined,
              password: r.password || undefined,
            })),
            courseIds: selectedCourses,
            grantToExisting,
            sendWelcome,
          }),
        });

        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Falha na importação");

        allResults.push(...(json.results ?? []));
        setProgress(Math.min(i + BATCH, includedRows.length));
      }

      const finalSummary: Summary = {
        total: allResults.length,
        created: allResults.filter((r) => r.status === "created").length,
        exists: allResults.filter((r) => r.status === "exists").length,
        errors: allResults.filter((r) => r.status === "error").length,
        emailsSent: allResults.filter((r) => r.emailSent).length,
      };

      setResults(allResults);
      setSummary(finalSummary);
      queryClient.invalidateQueries({ queryKey: ["adminStudents"] });
      queryClient.invalidateQueries({ queryKey: ["adminStudentCourses"] });
      queryClient.invalidateQueries({ queryKey: ["adminStudentEmails"] });

      toast.success(`${finalSummary.created} aluno(s) importado(s).`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao importar alunos");
    } finally {
      setIsImporting(false);
    }
  };

  const closeAndReset = (value: boolean) => {
    if (!value) reset();
    onOpenChange(value);
  };

  const step = summary ? "result" : rows.length > 0 ? "review" : "upload";

  return (
    <Modal open={open} onOpenChange={closeAndReset}>
      <ModalContent className="max-w-4xl">
        <ModalHeader
          title="Importar Alunos"
          description={step === "upload" ? "Envie um CSV com nome, e-mail e whatsapp." : fileName}
          icon={<Upload className="h-5 w-5" />}
          tone="success"
        />

        <ModalBody>
          {step === "upload" && (
            <div className="space-y-4">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFile(file);
                  e.target.value = "";
                }}
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full border-2 border-dashed border-white/10 hover:border-primary/40 rounded-[12px] p-10 flex flex-col items-center gap-3 transition-colors bg-white/[0.01]"
              >
                <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <span className="text-[14px] font-bold text-white">Selecionar arquivo CSV</span>
                <span className="text-[12px] text-muted-foreground">Máximo 2 MB · até 100 alunos por lote</span>
              </button>

              <div className="flex items-center justify-between gap-3 p-4 bg-black/20 border border-white/5 rounded-[12px]">
                <div className="text-[12px] text-muted-foreground">
                  Colunas: <code className="text-white/70">name</code>,{" "}
                  <code className="text-white/70">email</code>,{" "}
                  <code className="text-white/70">whatsapp</code>,{" "}
                  <code className="text-white/70">password</code> (opcional)
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={downloadTemplate}
                  className="glass-card border-white/10 hover:bg-white/5 h-[36px] px-4 rounded-[10px] text-[12px] font-bold text-white bg-transparent shrink-0"
                >
                  <Download className="w-3.5 h-3.5 mr-2" />
                  Modelo
                </Button>
              </div>
            </div>
          )}

          {step === "review" && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-3 text-[12px]">
                <Badge className="bg-white/5 text-white/70 border-white/10 font-bold">
                  {includedRows.length} de {rows.length} selecionado(s)
                </Badge>
                {rows.some((r) => r.problems.length > 0) && (
                  <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 font-bold">
                    {rows.filter((r) => r.problems.length > 0).length} com problema
                  </Badge>
                )}
                <Button
                  type="button"
                  variant="link"
                  onClick={() => { reset(); }}
                  className="text-muted-foreground hover:text-white text-[12px] h-auto p-0 ml-auto"
                >
                  Trocar arquivo
                </Button>
              </div>

              <div className="max-h-[240px] overflow-y-auto scrollbar-styled border border-white/5 rounded-[12px]">
                <table className="w-full text-[12px]">
                  <thead className="sticky top-0 bg-[#141415]">
                    <tr className="text-muted-foreground uppercase tracking-wider">
                      <th className="px-3 py-2 text-left w-8"></th>
                      <th className="px-3 py-2 text-left">Nome</th>
                      <th className="px-3 py-2 text-left">E-mail</th>
                      <th className="px-3 py-2 text-left hidden sm:table-cell">WhatsApp</th>
                      <th className="px-3 py-2 text-left">Situação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {rows.map((row) => {
                      const isExcluded = excluded.has(row.line);
                      return (
                        <tr key={row.line} className={isExcluded ? "opacity-50" : ""}>
                          <td className="px-3 py-2">
                            <Checkbox
                              checked={!isExcluded}
                              onCheckedChange={() => toggleRow(row.line)}
                              className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                              aria-label={`Incluir ${row.email}`}
                            />
                          </td>
                          <td className="px-3 py-2 text-white/90 truncate max-w-[160px]">{row.name || "—"}</td>
                          <td className="px-3 py-2 text-muted-foreground truncate max-w-[200px]">{row.email || "—"}</td>
                          <td className="px-3 py-2 text-muted-foreground hidden sm:table-cell">{row.whatsapp || "—"}</td>
                          <td className="px-3 py-2">
                            {row.problems.length === 0 ? (
                              <span className="flex items-center gap-1 text-green-400">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Válido
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-amber-400" title={row.problems.join(", ")}>
                                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                <span className="truncate max-w-[160px]">{row.problems.join(", ")}</span>
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="bg-black/20 border border-white/5 rounded-[12px] p-5 space-y-4">
                <div>
                  <p className="text-[13px] font-bold text-white mb-1">Conceder acesso aos cursos</p>
                  <p className="text-[12px] text-muted-foreground">
                    Aplicado a todos os alunos deste lote.
                  </p>
                </div>

                <div className="space-y-2 max-h-[160px] overflow-y-auto scrollbar-styled pr-1">
                  {courses.length === 0 ? (
                    <p className="text-[12px] text-muted-foreground">Nenhum curso cadastrado.</p>
                  ) : (
                    courses.map((course) => (
                      <label
                        key={course.id}
                        className="flex items-center gap-3 p-2.5 rounded-[10px] bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-colors cursor-pointer"
                      >
                        <Checkbox
                          checked={selectedCourses.includes(course.id)}
                          onCheckedChange={() => toggleCourse(course.id)}
                          className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                        />
                        <span className="text-[13px] text-white/80">{course.title}</span>
                      </label>
                    ))
                  )}
                </div>

                <div className="space-y-2 pt-2 border-t border-white/5">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <Checkbox
                      checked={sendWelcome}
                      onCheckedChange={(v) => setSendWelcome(!!v)}
                      className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                    />
                    <span className="text-[13px] text-white/80">
                      Enviar e-mail de acesso
                      <span className="text-muted-foreground"> (link para definir a senha)</span>
                    </span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <Checkbox
                      checked={grantToExisting}
                      onCheckedChange={(v) => setGrantToExisting(!!v)}
                      className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                    />
                    <span className="text-[13px] text-white/80">
                      Conceder acesso também a e-mails já cadastrados
                    </span>
                  </label>
                </div>
              </div>

              {isImporting && (
                <div className="space-y-2">
                  <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full gradient-primary transition-all duration-300"
                      style={{ width: `${(progress / includedRows.length) * 100}%` }}
                    />
                  </div>
                  <p className="text-[12px] text-muted-foreground text-center">
                    Importando {progress} de {includedRows.length}...
                  </p>
                </div>
              )}
            </div>
          )}

          {step === "result" && summary && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: "Criados", value: summary.created, tone: "text-green-400" },
                  { label: "Já existiam", value: summary.exists, tone: "text-amber-400" },
                  { label: "Erros", value: summary.errors, tone: "text-red-400" },
                  { label: "E-mails", value: summary.emailsSent, tone: "text-primary" },
                ].map((stat) => (
                  <div key={stat.label} className="bg-black/20 border border-white/5 rounded-[12px] p-4 text-center">
                    <p className={`text-[22px] font-black ${stat.tone}`}>{stat.value}</p>
                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-bold">{stat.label}</p>
                  </div>
                ))}
              </div>

              <div className="max-h-[240px] overflow-y-auto scrollbar-styled border border-white/5 rounded-[12px] divide-y divide-white/5">
                {results.map((r, i) => (
                  <div key={`${r.email}-${i}`} className="flex items-center justify-between gap-3 px-4 py-2.5">
                    <span className="text-[12px] text-white/80 truncate">{r.email}</span>
                    <span className={`text-[11px] font-bold uppercase tracking-wider shrink-0 ${
                      r.status === "created" ? "text-green-400" : r.status === "exists" ? "text-amber-400" : "text-red-400"
                    }`}>
                      {r.status === "created" ? `Criado${r.emailSent ? " + e-mail" : ""}` : r.status === "exists" ? "Já existia" : "Erro"}
                    </span>
                  </div>
                ))}
              </div>

              {summary.errors > 0 && (
                <div className="flex gap-2 p-3 bg-red-500/5 border border-red-500/20 rounded-[10px]">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <p className="text-[12px] text-red-300">
                    Linhas com erro não foram criadas. Corrija o CSV e importe apenas elas novamente.
                  </p>
                </div>
              )}
            </div>
          )}
        </ModalBody>

        {step === "review" && (
          <ModalFooter
            onCancel={() => closeAndReset(false)}
            onConfirm={handleImport}
            confirmLabel={`Importar ${includedRows.length} aluno(s)`}
            pendingLabel="Importando..."
            isPending={isImporting}
            confirmDisabled={includedRows.length === 0}
            tone="success"
          />
        )}

        {step === "result" && (
          <div className="p-6 border-t border-white/5 bg-black/40 flex justify-end">
            <Button
              onClick={() => closeAndReset(false)}
              className="h-[44px] px-6 rounded-[12px] text-[13px] font-bold gradient-primary shadow-glow"
            >
              Concluir
            </Button>
          </div>
        )}
      </ModalContent>
    </Modal>
  );
}
