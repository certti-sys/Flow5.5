import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import {
  UserPlus,
  Mail,
  Smartphone,
  Calendar,
  Eye,
  Edit,
  BookOpen,
  KeyRound,
  Ban,
  CheckCircle,
  Trash2,
  Download,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { CreateStudentModal } from "@/components/admin/CreateStudentModal";
import { EditStudentModal } from "@/components/admin/EditStudentModal";
import { AssignCoursesModal } from "@/components/admin/AssignCoursesModal";
import { ResetPasswordModal } from "@/components/admin/ResetPasswordModal";
import { SuspendStudentModal } from "@/components/admin/SuspendStudentModal";
import { ViewStudentProgressModal } from "@/components/admin/ViewStudentProgressModal";
import { ImportStudentsModal } from "@/components/admin/ImportStudentsModal";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toCsv } from "@/lib/csv";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
};

const item = {
  hidden: { y: 20, opacity: 0 },
  show: { y: 0, opacity: 1 }
};

/** Acima disso a lista pagina; abaixo, mostrar tudo evita ruído de paginação. */
const PAGE_SIZE = 50;

interface Student {
  id: string;
  name: string;
  email: string;
  whatsapp?: string;
  avatar_url?: string;
  member_since: string;
  created_at?: string;
  status: string;
}

const StudentRow = ({ student, courseCount, onEdit, onAssignCourses, onResetPassword, onSuspend, onViewProgress, onDelete }: {
  student: Student;
  courseCount: number;
  onEdit: () => void;
  onAssignCourses: () => void;
  onResetPassword: () => void;
  onSuspend: () => void;
  onViewProgress: () => void;
  onDelete: () => void;
}) => {
  const suspended = student.status === "suspended";

  return (
    <tr className="hover:bg-white/[0.03] transition-colors group/row">
      <td className="px-4 sm:px-6 py-4">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="relative shrink-0">
            <Avatar className="h-10 w-10 rounded-xl border border-white/10">
              <AvatarImage src={student.avatar_url} alt="" />
              <AvatarFallback className="bg-primary/20 text-foreground font-bold text-[12px] uppercase">
                {student.name?.charAt(0)}
              </AvatarFallback>
            </Avatar>
            {!suspended && (
              <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 border-2 border-[#0A0A0A] rounded-full" />
            )}
          </div>
          <div className="min-w-0">
            <p className="font-bold text-[14px] text-white/90 leading-tight truncate group-hover/row:text-primary transition-colors">
              {student.name}
            </p>
            <span className="sm:hidden text-[12px] text-muted-foreground">{student.email}</span>
          </div>
        </div>
      </td>

      <td className="px-6 py-4 hidden sm:table-cell">
        <span className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
          <Mail className="w-3.5 h-3.5 opacity-40 shrink-0" />
          <span className="truncate max-w-[240px]">{student.email}</span>
        </span>
      </td>

      <td className="px-6 py-4 hidden lg:table-cell">
        <span className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
          <Smartphone className="w-3.5 h-3.5 opacity-40 shrink-0" />
          {student.whatsapp || "—"}
        </span>
      </td>

      <td className="px-6 py-4 hidden md:table-cell">
        <span className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground">
          <BookOpen className="w-3.5 h-3.5 opacity-40 shrink-0" />
          {courseCount}
        </span>
      </td>

      <td className="px-4 sm:px-6 py-4">
        <span className={`inline-flex items-center px-2.5 py-1 border border-white/5 text-[11px] font-bold uppercase tracking-widest rounded-full ${
          suspended ? "bg-red-500/10 text-red-400" : "bg-green-500/10 text-green-400"
        }`}>
          {suspended ? "Suspenso" : "Ativo"}
        </span>
      </td>

      <td className="px-6 py-4 hidden xl:table-cell">
        <span className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
          <Calendar className="w-3.5 h-3.5 opacity-40 shrink-0" />
          {new Date(student.member_since).toLocaleDateString("pt-BR")}
        </span>
      </td>

      <td className="px-4 sm:px-6 py-4">
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="ghost" size="icon"
            onClick={onViewProgress}
            aria-label={`Ver progresso de ${student.name}`}
            className="w-9 h-9 rounded-xl hover:bg-primary/20 hover:text-primary border border-white/5 transition-all bg-white/5 text-white"
          >
            <Eye className="w-4 h-4" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost" size="icon"
                aria-label={`Mais ações de ${student.name}`}
                className="w-9 h-9 rounded-xl hover:bg-white/10 border border-white/5 hover:border-white/20 transition-all bg-white/5 text-white"
              >
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60 glass-card border-white/10 p-1.5 rounded-[12px] bg-black/90 backdrop-blur-xl z-[99999]">
              <DropdownMenuItem onClick={onEdit} className="rounded-lg gap-2.5 px-3 py-2.5 focus:bg-white/5 focus:text-primary transition-colors cursor-pointer">
                <Edit className="h-4 w-4" /> <span className="font-semibold text-[13px]">Editar Perfil</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onAssignCourses} className="rounded-lg gap-2.5 px-3 py-2.5 focus:bg-white/5 focus:text-primary transition-colors cursor-pointer">
                <BookOpen className="h-4 w-4" /> <span className="font-semibold text-[13px]">Atribuir Cursos</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onResetPassword} className="rounded-lg gap-2.5 px-3 py-2.5 focus:bg-white/5 focus:text-primary transition-colors cursor-pointer">
                <KeyRound className="h-4 w-4" /> <span className="font-semibold text-[13px]">Resetar Senha</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-white/5 my-1" />
              <DropdownMenuItem onClick={onSuspend} className="rounded-lg gap-2.5 px-3 py-2.5 focus:bg-white/5 transition-colors cursor-pointer">
                {suspended ? (
                  <>
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="font-semibold text-[13px]">Reativar Conta</span>
                  </>
                ) : (
                  <>
                    <Ban className="h-4 w-4 text-orange-400" />
                    <span className="font-semibold text-[13px]">Suspender Conta</span>
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-white/5 my-1" />
              <DropdownMenuItem onClick={onDelete} className="rounded-lg gap-2.5 px-3 py-2.5 focus:bg-red-500/10 text-red-500 transition-colors cursor-pointer">
                <Trash2 className="h-4 w-4" /> <span className="font-semibold text-[13px]">Excluir Conta</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </td>
    </tr>
  );
};

export default function AdminStudents() {
  const queryClient = useQueryClient();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(0);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [suspendModalOpen, setSuspendModalOpen] = useState(false);
  const [progressModalOpen, setProgressModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);

  const { data: students = [], isLoading, isFetching, error } = useQuery({
    queryKey: ["adminStudents", statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("profiles")
        .select("*");
      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }
      const { data, error } = await query.order("created_at", { ascending: false });
      if (error) throw error;
      return data as Student[];
    },
    // Trocar o filtro de status não pode derrubar a página para o spinner:
    // mantém a lista anterior na tela até a nova chegar.
    placeholderData: (previous) => previous,
  });

  if (error) {
    toast.error(`Erro ao carregar alunos: ${error.message}`);
  }

  // Mesma chave de AssignCoursesModal: compartilha o cache da lista de cursos.
  const { data: courses = [] } = useQuery({
    queryKey: ["allCourses"],
    queryFn: async () => {
      const { data, error } = await supabase.from("courses").select("id, title").order("title");
      if (error) throw error;
      return data as { id: string; title: string }[];
    },
  });

  const { data: accessRows = [] } = useQuery({
    queryKey: ["adminStudentCourses"],
    queryFn: async () => {
      const { data, error } = await supabase.from("user_course_access").select("user_id, course_id");
      if (error) throw error;
      return data as { user_id: string; course_id: string }[];
    },
  });

  const accessByUser = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const row of accessRows) {
      const list = map.get(row.user_id);
      if (list) list.push(row.course_id);
      else map.set(row.user_id, [row.course_id]);
    }
    return map;
  }, [accessRows]);

  const courseTitles = useMemo(
    () => new Map(courses.map((c) => [c.id, c.title])),
    [courses],
  );

  const filteredStudents = useMemo(
    () => students.filter(s =>
      s.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.email?.toLowerCase().includes(searchTerm.toLowerCase())
    ),
    [students, searchTerm],
  );

  const pageCount = Math.ceil(filteredStudents.length / PAGE_SIZE);
  const safePage = Math.min(page, Math.max(0, pageCount - 1));
  const visibleStudents = filteredStudents.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setPage(0);
  };

  const handleStatusFilter = (value: string) => {
    setStatusFilter(value);
    setPage(0);
  };

  const handleExport = () => {
    if (filteredStudents.length === 0) {
      toast.error("Nada para exportar com os filtros atuais.");
      return;
    }

    const header = ["name", "email", "whatsapp", "status", "member_since", "courses", "courses_names"];
    const rows = filteredStudents.map((student) => {
      const ids = accessByUser.get(student.id) ?? [];
      return [
        student.name,
        student.email,
        student.whatsapp ?? "",
        student.status ?? "active",
        student.member_since ? new Date(student.member_since).toISOString() : "",
        ids.join(";"),
        ids.map((id) => courseTitles.get(id) ?? id).join(";"),
      ];
    });

    // BOM + ; : Excel pt-BR abre com acentos e colunas corretas.
    const csv = toCsv(header, rows);
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `alunos-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    toast.success(`${rows.length} aluno(s) exportado(s).`);
  };

  const deleteMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Sessão expirada. Faça login novamente.");

      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-user`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
          "X-Requested-With": "XMLHttpRequest",
        },
        body: JSON.stringify({ userId }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Erro ao excluir aluno");
    },
    onSuccess: () => {
      toast.success("Aluno excluído com sucesso.");
      queryClient.invalidateQueries({ queryKey: ["adminStudents"] });
      queryClient.invalidateQueries({ queryKey: ["adminStudentCourses"] });
      setDeleteDialogOpen(false);
      setSelectedStudent(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center py-24">
        <div className="glass-card border-white/10 rounded-[24px] p-8 flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
          <p className="text-sm text-white/60 mt-3">Carregando alunos...</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-6 pb-20 overflow-visible"
    >
      <AdminHeader
        title="Gerenciar Alunos"
        description="Visualize e gerencie todos os alunos cadastrados na sua plataforma."
        searchValue={searchTerm}
        onSearchChange={handleSearch}
        searchPlaceholder="Buscar por nome ou e-mail..."
        actionButton={
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setImportModalOpen(true)}
              variant="outline"
              className="glass-card border-white/10 hover:bg-white/5 h-[44px] px-5 rounded-[12px] font-bold text-[13px] tracking-tight text-white bg-transparent"
            >
              <Upload className="w-4 h-4 mr-2" />
              Importar
            </Button>
            <Button
              onClick={handleExport}
              variant="outline"
              className="glass-card border-white/10 hover:bg-white/5 h-[44px] px-5 rounded-[12px] font-bold text-[13px] tracking-tight text-white bg-transparent"
            >
              <Download className="w-4 h-4 mr-2" />
              Exportar
            </Button>
            <Button
              onClick={() => setCreateModalOpen(true)}
              className="gradient-primary shadow-glow h-[44px] px-6 rounded-[12px] font-bold text-[13px] tracking-tight"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Criar Aluno
            </Button>
          </div>
        }
        filters={
          <div className="flex items-center gap-2 pl-2 border-l border-white/10 ml-2">
            <button
              onClick={() => handleStatusFilter("all")}
              className={`px-3 py-1.5 text-[12px] font-bold rounded-xl transition-all ${
                statusFilter === "all" ? "bg-primary text-primary-foreground shadow-glow-sm" : "text-muted-foreground hover:text-primary-foreground"
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => handleStatusFilter("active")}
              className={`px-3 py-1.5 text-[12px] font-bold rounded-xl transition-all ${
                statusFilter === "active" ? "bg-primary text-primary-foreground shadow-glow-sm" : "text-muted-foreground hover:text-primary-foreground"
              }`}
            >
              Ativos
            </button>
            <button
              onClick={() => handleStatusFilter("suspended")}
              className={`px-3 py-1.5 text-[12px] font-bold rounded-xl transition-all ${
                statusFilter === "suspended" ? "bg-primary text-primary-foreground shadow-glow-sm" : "text-muted-foreground hover:text-primary-foreground"
              }`}
            >
              Suspensos
            </button>
          </div>
        }
      />

      <motion.div
        variants={item}
        className="glass-card rounded-[20px] border-white/10 overflow-hidden shadow-2xl bg-white/[0.01]"
      >
        {/* Framer controla `opacity` neste motion.div; o esmaecimento do
            refetch vive num filho comum para não ser sobrescrito inline. */}
        <div className={cn("transition-opacity duration-quick ease-smooth-out", isFetching && "t-fetching")}>
        {filteredStudents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-6">
              <div className="w-10 h-10 text-white/10">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
              </div>
            </div>
            <p className="text-muted-foreground text-[14px]">Nenhum aluno encontrado.</p>
            <Button variant="link" onClick={() => { setSearchTerm(""); setStatusFilter("all"); setPage(0); }} className="text-primary font-bold mt-2">Limpar Filtros</Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-white/[0.03] border-b border-white/5 text-muted-foreground text-[12px] font-bold uppercase tracking-[0.1em]">
                  <th className="px-4 sm:px-6 py-4 text-left">Aluno</th>
                  <th className="px-6 py-4 text-left hidden sm:table-cell">E-mail</th>
                  <th className="px-6 py-4 text-left hidden lg:table-cell">WhatsApp</th>
                  <th className="px-6 py-4 text-left hidden md:table-cell">Cursos</th>
                  <th className="px-4 sm:px-6 py-4 text-left">Status</th>
                  <th className="px-6 py-4 text-left hidden xl:table-cell">Desde</th>
                  <th className="px-4 sm:px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {visibleStudents.map((student) => (
                  <StudentRow
                    key={student.id}
                    student={student}
                    courseCount={accessByUser.get(student.id)?.length ?? 0}
                    onEdit={() => { setSelectedStudent(student); setEditModalOpen(true); }}
                    onAssignCourses={() => { setSelectedStudent(student); setAssignModalOpen(true); }}
                    onResetPassword={() => { setSelectedStudent(student); setResetModalOpen(true); }}
                    onSuspend={() => { setSelectedStudent(student); setSuspendModalOpen(true); }}
                    onViewProgress={() => { setSelectedStudent(student); setProgressModalOpen(true); }}
                    onDelete={() => { setSelectedStudent(student); setDeleteDialogOpen(true); }}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
        </div>
      </motion.div>

      {pageCount > 1 && (
        <div className="flex items-center justify-between gap-4">
          <span className="text-[13px] text-muted-foreground">
            {safePage * PAGE_SIZE + 1}–{Math.min((safePage + 1) * PAGE_SIZE, filteredStudents.length)} de {filteredStudents.length}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              disabled={safePage === 0}
              onClick={() => setPage(safePage - 1)}
              aria-label="Página anterior"
              className="glass-card border-white/10 hover:bg-white/5 rounded-xl h-9 w-9 text-white bg-transparent"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-[13px] font-bold text-white/80 tabular-nums">
              {safePage + 1} / {pageCount}
            </span>
            <Button
              variant="outline"
              size="icon"
              disabled={safePage >= pageCount - 1}
              onClick={() => setPage(safePage + 1)}
              aria-label="Próxima página"
              className="glass-card border-white/10 hover:bg-white/5 rounded-xl h-9 w-9 text-white bg-transparent"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      <CreateStudentModal open={createModalOpen} onOpenChange={setCreateModalOpen} />
      <ImportStudentsModal open={importModalOpen} onOpenChange={setImportModalOpen} />
      <EditStudentModal open={editModalOpen} onOpenChange={setEditModalOpen} student={selectedStudent} />
      <AssignCoursesModal open={assignModalOpen} onOpenChange={setAssignModalOpen} student={selectedStudent} />
      <ResetPasswordModal open={resetModalOpen} onOpenChange={setResetModalOpen} student={selectedStudent} />
      <SuspendStudentModal open={suspendModalOpen} onOpenChange={setSuspendModalOpen} student={selectedStudent} />
      <ViewStudentProgressModal open={progressModalOpen} onOpenChange={setProgressModalOpen} student={selectedStudent} />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="p-0 max-w-[440px]">
          <AlertDialogHeader className="px-6 py-5 border-b border-white/5 bg-white/[0.02]">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="flex h-[60px] w-[60px] items-center justify-center rounded-full bg-red-500/10 border border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.1)]">
                <Trash2 className="h-7 w-7 text-red-500" />
              </div>
              <AlertDialogTitle className="text-[20px] font-bold text-white tracking-tight">Excluir Aluno</AlertDialogTitle>
              <AlertDialogDescription className="text-[14px] text-muted-foreground mt-2 leading-relaxed">
                Tem certeza que deseja excluir permanentemente <strong className="text-white">{selectedStudent?.name}</strong>?
                O acesso aos cursos e o histórico serão removidos e não poderão ser recuperados.
              </AlertDialogDescription>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter className="px-6 py-5 border-t border-white/5 bg-black/40 flex flex-col-reverse sm:flex-row gap-3 rounded-b-[20px] sm:justify-end">
            <AlertDialogCancel className="h-[44px] px-6 glass-card border-white/10 hover:bg-white/5 rounded-[12px] mt-0 text-white bg-transparent font-bold">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                if (selectedStudent) deleteMutation.mutate(selectedStudent.id);
              }}
              disabled={deleteMutation.isPending}
              className="flex-1 h-[44px] bg-red-500 hover:bg-red-600 text-white border-0 rounded-[12px] font-bold disabled:opacity-60"
            >
              {deleteMutation.isPending ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}
