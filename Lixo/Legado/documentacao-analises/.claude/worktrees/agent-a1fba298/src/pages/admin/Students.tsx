import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import {
  MoreVertical,
  UserPlus,
  Edit,
  BookOpen,
  KeyRound,
  Ban,
  CheckCircle,
  Trash2,
  Eye,
  Mail,
  Smartphone,
  Calendar,
} from "lucide-react";
import { toast } from "sonner";
import { CreateStudentModal } from "@/components/admin/CreateStudentModal";
import { EditStudentModal } from "@/components/admin/EditStudentModal";
import { AssignCoursesModal } from "@/components/admin/AssignCoursesModal";
import { ResetPasswordModal } from "@/components/admin/ResetPasswordModal";
import { SuspendStudentModal } from "@/components/admin/SuspendStudentModal";
import { ViewStudentProgressModal } from "@/components/admin/ViewStudentProgressModal";
import { AdminHeader } from "@/components/admin/AdminHeader";

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05
    }
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

export default function AdminStudents() {
  const queryClient = useQueryClient();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [assignCoursesModalOpen, setAssignCoursesModalOpen] = useState(false);
  const [resetPasswordModalOpen, setResetPasswordModalOpen] = useState(false);
  const [suspendModalOpen, setSuspendModalOpen] = useState(false);
  const [progressModalOpen, setProgressModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: students = [], isLoading } = useQuery({
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

  const filteredStudents = students.filter(s => 
    s.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const deleteStudentMutation = useMutation({
    mutationFn: async (studentId: string) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Sessão não encontrada.');
      const { data, error } = await supabase.functions.invoke('delete-user', {
        body: { userId: studentId },
        headers: { Authorization: `Bearer ${session.access_token}` }
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
    },
    onSuccess: () => {
      toast.success("Aluno excluído com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["adminStudents"] });
      setDeleteDialogOpen(false);
      setSelectedStudent(null);
    },
    onError: (error: Error) => {
      toast.error(`Erro ao excluir aluno: ${error.message}`);
    },
  });

  const handleEditStudent = (student: Student) => {
    setSelectedStudent(student);
    setEditModalOpen(true);
  };

  const handleAssignCourses = (student: Student) => {
    setSelectedStudent(student);
    setAssignCoursesModalOpen(true);
  };

  const handleResetPassword = (student: Student) => {
    setSelectedStudent(student);
    setResetPasswordModalOpen(true);
  };

  const handleSuspend = (student: Student) => {
    setSelectedStudent(student);
    setSuspendModalOpen(true);
  };

  const handleViewProgress = (student: Student) => {
    setSelectedStudent(student);
    setProgressModalOpen(true);
  };

  const handleDeleteStudent = (student: Student) => {
    setSelectedStudent(student);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (selectedStudent) {
      deleteStudentMutation.mutate(selectedStudent.id);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <motion.div 
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-6 pb-20"
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
            className="gradient-primary shadow-glow hover:scale-105 transition-all h-[44px] px-6 rounded-[12px] font-bold text-white gap-2"
          >
            <UserPlus className="w-4 h-4" />
            Criar Aluno
          </Button>
        }
        filters={
          <div className="flex items-center gap-1.5 p-1 bg-white/5 rounded-xl border border-white/5 font-inter">
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

      <motion.div variants={item} className="glass-card rounded-2xl border-white/10 overflow-hidden shadow-2xl bg-white/[0.01]">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-white/[0.03] border-b border-white/5 text-muted-foreground/60">
                <th className="px-6 py-4 text-left text-[11px] font-bold uppercase tracking-[0.1em]">
                  Perfil do Aluno
                </th>
                <th className="px-6 py-4 text-center text-[11px] font-bold uppercase tracking-[0.1em] hidden sm:table-cell">
                  Status
                </th>
                <th className="px-6 py-4 text-left text-[11px] font-bold uppercase tracking-[0.1em] hidden lg:table-cell">
                  Membro Desde
                </th>
                <th className="px-6 py-4 text-right text-[11px] font-bold uppercase tracking-[0.1em]">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 overflow-hidden">
              <AnimatePresence mode="popLayout">
                {filteredStudents.map((student) => (
                  <motion.tr
                    key={student.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="hover:bg-white/[0.03] transition-all group/row border-l-2 border-l-transparent hover:border-l-primary/40"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          <Avatar className="h-10 w-10 rounded-xl border border-white/10 shadow-2xl group-hover/row:scale-110 transition-transform duration-500">
                            <AvatarImage src={student.avatar_url} alt={student.name} />
                            <AvatarFallback className="bg-primary/20 text-primary font-bold text-xs uppercase">
                              {student.name?.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          {student.status !== "suspended" && (
                            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-[#0A0A0A] rounded-full shadow-[0_0_8px_rgba(34,197,94,0.4)]" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-[14px] text-white/90 leading-tight group-hover/row:text-primary transition-colors">
                            {student.name}
                          </p>
                          <div className="flex items-center gap-3 mt-1 text-[12px] text-muted-foreground">
                            <span className="flex items-center gap-1 group-hover/row:text-white/60 transition-colors">
                              <Mail className="w-3 h-3 opacity-40" />
                              {student.email}
                            </span>
                            {student.whatsapp && (
                              <span className="hidden lg:flex items-center gap-1 group-hover/row:text-white/60 transition-colors">
                                <Smartphone className="w-3 h-3 opacity-40" />
                                {student.whatsapp}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 hidden sm:table-cell text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 border border-white/5 text-[10px] font-bold uppercase tracking-wider rounded-full ${
                        student.status === "suspended" ? "bg-red-500/10 text-red-400" : "bg-green-500/10 text-green-400"
                      }`}>
                        {student.status === "suspended" ? "Suspenso" : "Ativo"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-[13px] text-muted-foreground/60 hidden lg:table-cell">
                      <div className="flex items-center gap-2 font-inter">
                        <Calendar className="w-3 h-3 opacity-30" />
                        {new Date(student.member_since).toLocaleDateString("pt-BR")}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="ghost" size="icon"
                          onClick={() => handleViewProgress(student)}
                          className="w-9 h-9 rounded-xl hover:bg-primary/20 hover:text-primary border border-white/5 hover:border-primary/20 transition-all duration-300"
                          title="Ver Progresso"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="w-9 h-9 rounded-xl hover:bg-white/10 border border-white/5 hover:border-white/20 transition-all duration-300">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-56 glass-card border-white/10 p-1.5 rounded-[12px] bg-black/90 backdrop-blur-xl">
                            <DropdownMenuItem onClick={() => handleEditStudent(student)} className="rounded-lg gap-2.5 px-3 py-2.5 focus:bg-white/5 focus:text-primary transition-colors cursor-pointer">
                              <Edit className="h-4 w-4" /> <span className="font-semibold text-[13px]">Editar Perfil</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleAssignCourses(student)} className="rounded-lg gap-2.5 px-3 py-2.5 focus:bg-white/5 focus:text-primary transition-colors cursor-pointer">
                              <BookOpen className="h-4 w-4" /> <span className="font-semibold text-[13px]">Atribuir Cursos</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleResetPassword(student)} className="rounded-lg gap-2.5 px-3 py-2.5 focus:bg-white/5 focus:text-primary transition-colors cursor-pointer">
                              <KeyRound className="h-4 w-4" /> <span className="font-semibold text-[13px]">Resetar Senha</span>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-white/5 my-1" />
                            <DropdownMenuItem onClick={() => handleSuspend(student)} className="rounded-lg gap-2.5 px-3 py-2.5 focus:bg-white/5 transition-colors cursor-pointer">
                              {student.status === "suspended" ? (
                                <><CheckCircle className="h-4 w-4 text-green-500" /><span className="font-semibold text-[13px]">Reativar Conta</span></>
                              ) : (
                                <><Ban className="h-4 w-4 text-orange-400" /><span className="font-semibold text-[13px]">Suspender Conta</span></>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-white/5 my-1" />
                            <DropdownMenuItem onClick={() => handleDeleteStudent(student)} className="rounded-lg gap-2.5 px-3 py-2.5 focus:bg-red-500/10 text-red-500 transition-colors cursor-pointer">
                              <Trash2 className="h-4 w-4" /> <span className="font-semibold text-[13px]">Excluir Conta</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                  </motion.tr>
                ))}
                {filteredStudents.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-20 text-center">
                      <p className="text-muted-foreground text-[14px]">Nenhum aluno encontrado.</p>
                      <Button variant="link" onClick={() => { setSearchTerm(""); setStatusFilter("all"); }} className="text-primary font-bold mt-2">Limpar Filtros</Button>
                    </td>
                  </tr>
                )}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Modals */}
      <CreateStudentModal open={createModalOpen} onOpenChange={setCreateModalOpen} />
      <EditStudentModal open={editModalOpen} onOpenChange={setEditModalOpen} student={selectedStudent} />
      <AssignCoursesModal open={assignCoursesModalOpen} onOpenChange={setAssignCoursesModalOpen} student={selectedStudent} />
      <ResetPasswordModal open={resetPasswordModalOpen} onOpenChange={setResetPasswordModalOpen} student={selectedStudent} />
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
            <AlertDialogCancel disabled={deleteStudentMutation.isPending} className="flex-1 h-[44px] glass-card border-white/10 hover:bg-white/5 rounded-[12px] mt-0">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); confirmDelete(); }} disabled={deleteStudentMutation.isPending} className="flex-1 h-[44px] bg-red-500 hover:bg-red-600 text-white border-0 rounded-[12px] font-bold">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}
