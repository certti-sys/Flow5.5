import { useState, useEffect } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useCourses } from "@/hooks/useSupabaseCourses";
import { CourseDetailsTab } from "@/components/admin/course/CourseDetailsTab";
import { ModulesTab } from "@/components/admin/course/ModulesTab";
import { CourseSettingsTab } from "@/components/admin/course/CourseSettingsTab";

import type { IntegrationPlatform } from "@/hooks/useSupabaseCourses";

export interface CourseFormData {
  titulo: string;
  descricao: string;
  descricaoLonga: string;
  categoria: string;
  imagem: string;
  banner: string;
  checkoutUrl: string;
  tagIntegracao: string;
  status: "Publicado" | "Rascunho";
  // Novos campos de integração - Fase A
  integrationEnabled: boolean;
  integrationPlatform: IntegrationPlatform;
  externalProductId: string;
  externalProductName: string;
  integrationNotes: string;
}

export default function CourseManagement() {
  const navigate = useNavigate();
  const { courseId } = useParams();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { cursos, criarCurso, editarCurso, obterCurso } = useCourses();

  const isEditing = !!courseId;
  const initialTab = searchParams.get('tab') || 'detalhes';
  const [activeTab, setActiveTab] = useState(initialTab);
  const [isLoading, setIsLoading] = useState(false);
  const [savedCourseId, setSavedCourseId] = useState<string | null>(courseId || null);

  const [formData, setFormData] = useState<CourseFormData>({
    titulo: "",
    descricao: "",
    descricaoLonga: "",
    categoria: "",
    imagem: "",
    banner: "",
    checkoutUrl: "",
    tagIntegracao: "",
    status: "Rascunho",
    // Novos campos de integração - Fase A
    integrationEnabled: false,
    integrationPlatform: "",
    externalProductId: "",
    externalProductName: "",
    integrationNotes: "",
  });

  useEffect(() => {
    if (isEditing && courseId) {
      const curso = obterCurso(courseId);
      if (curso) {
        setFormData({
          titulo: curso.titulo,
          descricao: curso.descricao,
          descricaoLonga: (curso as any).descricaoLonga || "",
          categoria: curso.categoria,
          imagem: curso.imagem,
          banner: curso.banner || "",
          checkoutUrl: curso.checkoutUrl || "",
          tagIntegracao: curso.tagIntegracao || "",
          status: curso.status,
          // Novos campos de integração - Fase A
          integrationEnabled: curso.integrationEnabled || false,
          integrationPlatform: curso.integrationPlatform || "",
          externalProductId: curso.externalProductId || "",
          externalProductName: curso.externalProductName || "",
          integrationNotes: curso.integrationNotes || "",
        });
        setSavedCourseId(courseId);
      }
    }
  }, [isEditing, courseId, cursos]);

  const handleSave = async () => {
    if (!formData.titulo.trim()) {
      toast({
        title: "Erro",
        description: "O título do curso é obrigatório",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      if (isEditing && courseId) {
        await editarCurso(courseId, {
          titulo: formData.titulo,
          descricao: formData.descricao,
          categoria: formData.categoria,
          imagem: formData.imagem,
          banner: formData.banner,
          status: formData.status,
          checkoutUrl: formData.checkoutUrl,
          tagIntegracao: formData.tagIntegracao,
          // Novos campos de integração - Fase A
          integrationEnabled: formData.integrationEnabled,
          integrationPlatform: formData.integrationPlatform,
          externalProductId: formData.externalProductId,
          externalProductName: formData.externalProductName,
          integrationNotes: formData.integrationNotes,
        } as any);
        toast({
          title: "Sucesso",
          description: "Curso atualizado com sucesso!",
        });
      } else {
        const novoCurso = await criarCurso({
          titulo: formData.titulo,
          descricao: formData.descricao,
          categoria: formData.categoria,
          imagem: formData.imagem,
          banner: formData.banner,
          status: formData.status,
          modulos: 0,
          aulas: 0,
          checkoutUrl: formData.checkoutUrl,
          tagIntegracao: formData.tagIntegracao,
          // Novos campos de integração - Fase A
          integrationEnabled: formData.integrationEnabled,
          integrationPlatform: formData.integrationPlatform,
          externalProductId: formData.externalProductId,
          externalProductName: formData.externalProductName,
          integrationNotes: formData.integrationNotes,
        } as any);
        if (novoCurso) {
          setSavedCourseId(novoCurso.id);
          toast({
            title: "Sucesso",
            description: "Curso criado! Agora adicione módulos e aulas.",
          });
          // Navigate to the same page but with the new course ID
          navigate(`/admin/courses/${novoCurso.id}`, { replace: true });
        }
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao salvar o curso",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickPublish = async () => {
    if (!currentCourseId) return;
    
    try {
      await editarCurso(currentCourseId, {
        status: "Publicado",
      } as any);
      updateFormData({ status: "Publicado" });
      toast({
        title: "Curso Publicado!",
        description: "O curso agora está visível para os alunos na vitrine.",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao publicar o curso",
        variant: "destructive",
      });
    }
  };

  const updateFormData = (updates: Partial<CourseFormData>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  };

  const currentCourseId = savedCourseId || courseId;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/admin/courses")}
            className="hover:bg-primary/10 h-11 w-11 min-w-[44px] min-h-[44px]"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">
              {isEditing ? `Gerenciar: ${formData.titulo || "Curso"}` : "Criar Novo Curso"}
            </h1>
            <p className="text-muted-foreground text-sm sm:text-base">
              {isEditing
                ? "Gerencie detalhes, módulos e aulas do curso"
                : "Configure seu curso, adicione módulos e aulas"}
            </p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <Button
            variant="outline"
            onClick={() => navigate("/admin/courses")}
            className="border-border/50 min-h-[44px] w-full sm:w-auto"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={isLoading}
            className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2 min-h-[44px] w-full sm:w-auto"
          >
            <Save className="h-4 w-4" />
            {isLoading ? "Salvando..." : "Salvar Curso"}
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-card/50 border border-border/50">
          <TabsTrigger value="detalhes" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            Detalhes
          </TabsTrigger>
          <TabsTrigger 
            value="modulos" 
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            disabled={!currentCourseId}
          >
            Módulos e Aulas
          </TabsTrigger>
          <TabsTrigger 
            value="configuracoes" 
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            Configurações
          </TabsTrigger>
        </TabsList>

        <TabsContent value="detalhes">
          <CourseDetailsTab formData={formData} updateFormData={updateFormData} />
        </TabsContent>

        <TabsContent value="modulos">
          {currentCourseId ? (
            <ModulesTab 
              courseId={currentCourseId} 
              courseStatus={formData.status}
              onPublishCourse={handleQuickPublish}
            />
          ) : (
            <div className="glass-card border-border/50 rounded-xl p-12 text-center">
              <p className="text-muted-foreground">
                Salve o curso primeiro para adicionar módulos e aulas.
              </p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="configuracoes">
          <CourseSettingsTab formData={formData} updateFormData={updateFormData} courseId={currentCourseId || undefined} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
