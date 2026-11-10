import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
} from "lucide-react";
import { toast } from "sonner";
import { CreateStudentModal } from "@/components/admin/CreateStudentModal";
import { EditStudentModal } from "@/components/admin/EditStudentModal";
import { AssignCoursesModal } from "@/components/admin/AssignCoursesModal";
import { ResetPasswordModal } from "@/components/admin/ResetPasswordModal";
import { SuspendStudentModal } from "@/components/admin/SuspendStudentModal";
import { ViewStudentProgressModal } from "@/components/admin/ViewStudentProgressModal";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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

interface Student {
  id: string;
  name: string;
  email: string;
  whatsapp?: string;
  avatar_url?: string;
  member_since: string;
  status: string;
}

const StudentCard = ({ student, onEdit, onAssignCourses, onResetPassword, onSuspend, onViewProgress, onDelete }: { 
  student: Student;
  onEdit: () => void;
  onAssignCourses: () => void;
  onResetPassword: () => void;
  onSuspend: () => void;
  onViewProgress: () => void;
  onDelete: () => void;
}) => {
  return (
    <motion.div
      key={student.id}
      variants={item}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="relative rounded-[20px] border-white/10 p-6 hover:border-white/10 transition-all duration-300 bg-white/[0.01] z-0 overflow-visible"
    >
      <div className="relative z-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Avatar className="h-12 w-12 rounded-2xl border border-white/10 shadow-2xl group-hover:scale-105 transition-transform duration-500">
                <AvatarImage src={student.avatar_url} alt={student.name} />
                <AvatarFallback className="bg-primary/20 text-primary font-bold text-xs uppercase">
                  {student.name?.charAt(0)}
                </AvatarFallback>
              </Avatar>
              {student.status !== "suspended" && (
                <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 border-2 border-[#0A0A0A] rounded-full shadow-[0_0_8px_rgba(34,197,94,0.4)]" />
              )}
            </div>
            <div className="min-w-0">
              <p className="font-bold text-[15px] text-white/90 leading-tight group-hover:text-primary transition-colors">
                {student.name}
              </p>
              <div className="flex items-center gap-3 mt-1 text-[12px] text-muted-foreground">
                <span className="flex items-center gap-1 group-hover:text-white/60 transition-colors">
                  <Mail className="w-3 h-3 opacity-40" />
                  {student.email}
                </span>
                {student.whatsapp && (
                  <span className="hidden md:flex items-center gap-1 group-hover:text-white/60 transition-colors">
                    <Smartphone className="w-3 h-3 opacity-40" />
                    {student.whatsapp}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className={`inline-flex items-center px-2.5 py-1 border border-white/5 text-[10px] font-bold uppercase tracking-widest rounded-full ${
              student.status === "suspended" ? "bg-red-500/10 text-red-400" : "bg-green-500/10 text-green-400"
            }`}>
              {student.status === "suspended" ? "Suspenso" : "Ativo"}
            </span>
            <div className="flex items-center gap-2 text-[12px] text-muted-foreground/60">
              <Calendar className="w-3 h-3 opacity-40" />
              <span>{new Date(student.member_since).toLocaleDateString("pt-BR")}</span>
            </div>
          </div>
        </div>
        {/* Container dos botões de ação - sempre visível e na frente */}
        <div className="mt-4 pt-4 border-t border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-3 w-full">
          <div className="flex items-center gap-2 z-50 pointer-events-auto">
            <Button
              variant="ghost" size="icon"
              onClick={onViewProgress}
              className="w-10 h-10 rounded-xl hover:bg-primary/20 hover:text-primary border border-white/5 transition-all bg-white/5 text-white shadow-lg relative z-50"
              title="Ver Progresso"
            >
              <Eye className="w-5 h-5" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="w-10 h-10 rounded-xl hover:bg-white/10 border border-white/5 hover:border-white/20 transition-all bg-white/5 text-white shadow-lg relative z-50">
                  <Edit className="w-5 h-5" />
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
                  {student.status === "suspended" ? (
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
          <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/60 flex items-center gap-1">
            <span>ID: #{student.id.slice(0, 4)}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default function AdminStudents() {
  const queryClient = useQueryClient();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [suspendModalOpen, setSuspendModalOpen] = useState(false);
  const [progressModalOpen, setProgressModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const { data: students = [], isLoading, error } = useQuery({
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
  });

  if (error) {
    toast.error(`Erro ao carregar alunos: ${error.message}`);
  }

  const filteredStudents = students.filter(s =>
    s.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleEdit = () => {
    setEditModalOpen(true);
  };

  const handleAssignCourses = () => {
    setAssignModalOpen(true);
  };

  const handleResetPassword = () => {
    setResetModalOpen(true);
  };

  const handleSuspend = () => {
    setSuspendModalOpen(true);
  };

  const handleViewProgress = () => {
    setProgressModalOpen(true);
  };

  const handleDelete = () => {
    setDeleteDialogOpen(true);
  };

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
        onSearchChange={setSearchTerm}
        searchPlaceholder="Buscar por nome ou e-mail..."
        actionButton={
          <Button
            onClick={() => setCreateModalOpen(true)}
            className="gradient-primary shadow-glow h-[44px] px-6 rounded-[12px] font-bold text-[13px] tracking-tight"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Criar Aluno
          </Button>
        }
        filters={
          <div className="flex items-center gap-2 pl-2 border-l border-white/10 ml-2">
            <button
              onClick={() => setStatusFilter("all")}
              className={`px-3 py-1.5 text-[12px] font-bold rounded-xl transition-all ${
                statusFilter === "all" ? "bg-primary text-white shadow-glow-sm" : "text-muted-foreground hover:text-white"
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setStatusFilter("active")}
              className={`px-3 py-1.5 text-[12px] font-bold rounded-xl transition-all ${
                statusFilter === "active" ? "bg-primary text-white shadow-glow-sm" : "text-muted-foreground hover:text-white"
              }`}
            >
              Ativos
            </button>
            <button
              onClick={() => setStatusFilter("suspended")}
              className={`px-3 py-1.5 text-[12px] font-bold rounded-xl transition-all ${
                statusFilter === "suspended" ? "bg-primary text-white shadow-glow-sm" : "text-muted-foreground hover:text-white"
              }`}
            >
              Suspensos
            </button>
          </div>
        }
      />

      <motion.div
        variants={item}
        className="relative rounded-[24px] border-white/10 overflow-visible shadow-2xl bg-white/[0.01] z-0"
      >
        <div className="relative z-10 p-6">
          {filteredStudents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-6">
                <div className="w-10 h-10 text-white/10">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                </div>
              </div>
              <p className="text-muted-foreground text-[14px]">Nenhum aluno encontrado.</p>
              <Button variant="link" onClick={() => { setSearchTerm(""); setStatusFilter("all"); }} className="text-primary font-bold mt-2">Limpar Filtros</Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredStudents.map((student) => (
                <StudentCard
                  key={student.id}
                  student={student}
                  onEdit={() => { setSelectedStudent(student); setEditModalOpen(true); }}
                  onAssignCourses={() => { setSelectedStudent(student); setAssignModalOpen(true); }}
                  onResetPassword={() => { setSelectedStudent(student); setResetModalOpen(true); }}
                  onSuspend={() => { setSelectedStudent(student); setSuspendModalOpen(true); }}
                  onViewProgress={() => { setSelectedStudent(student); setProgressModalOpen(true); }}
                  onDelete={() => { setSelectedStudent(student); setDeleteDialogOpen(true); }}
                />
              ))}
            </div>
          )}
        </div>
      </motion.div>

      {/* Modais - renderizados no nível pai para evitar sobreposição de z-index */}
      <CreateStudentModal open={createModalOpen} onOpenChange={setCreateModalOpen} />
      <EditStudentModal open={editModalOpen} onOpenChange={setEditModalOpen} student={selectedStudent} />
      <AssignCoursesModal open={assignModalOpen} onOpenChange={setAssignModalOpen} student={selectedStudent} />
      <ResetPasswordModal open={resetModalOpen} onOpenChange={setResetModalOpen} student={selectedStudent} />
      <SuspendStudentModal open={suspendModalOpen} onOpenChange={setSuspendModalOpen} student={selectedStudent} />
      <ViewStudentProgressModal open={progressModalOpen} onOpenChange={setProgressModalOpen} student={selectedStudent} />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="glass-card border-white/10 rounded-[20px] max-w-[440px]">
          <AlertDialogHeader>
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="flex h-[60px] w-[60px] items-center justify-center rounded-full bg-red-500/10 border border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.1)]">
                <Trash2 className="h-7 w-7 text-red-500" />
              </div>
              <AlertDialogTitle className="text-[20px] font-bold text-white tracking-tight">Excluir Aluno</AlertDialogTitle>
              <AlertDialogDescription className="text-[14px] text-muted-foreground mt-2 leading-relaxed">
                Tem certeza que deseja excluir permanentemente <strong className="text-white">{selectedStudent?.name}</strong>?
              </AlertDialogDescription>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-8 flex justify-center items-center gap-3 w-full sm:justify-center">
            <AlertDialogCancel className="flex-1 h-[44px] glass-card border-white/10 hover:bg-white/5 rounded-[12px] mt-0">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => setDeleteDialogOpen(false)} className="flex-1 h-[44px] bg-red-500 hover:bg-red-600 text-white border-0 rounded-[12px] font-bold">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}