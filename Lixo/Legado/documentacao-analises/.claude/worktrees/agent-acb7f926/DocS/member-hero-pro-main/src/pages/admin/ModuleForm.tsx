import { useState, useEffect } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, Upload, Minus, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useModules } from "@/hooks/useModules";
import { useCourses } from "@/hooks/useCourses";
import { toast } from "sonner";

export default function ModuleForm() {
  const navigate = useNavigate();
  const { moduleId } = useParams();
  const [searchParams] = useSearchParams();
  const courseIdFromUrl = searchParams.get("courseId");
  
  const { obterModulo, criarModulo, editarModulo, obterModulosPorCurso } = useModules();
  const { obterCurso } = useCourses();
  
  const isEditing = !!moduleId;
  
  const [formData, setFormData] = useState({
    cursoId: courseIdFromUrl || "",
    nome: "",
    descricao: "",
    imagem: "",
    ordem: 1,
    status: "Rascunho" as "Publicado" | "Rascunho",
  });
  
  const [cursoNome, setCursoNome] = useState("");

  // Carregar dados do módulo se estiver editando
  useEffect(() => {
    if (isEditing && moduleId) {
      const modulo = obterModulo(moduleId);
      if (modulo) {
        setFormData({
          cursoId: modulo.cursoId,
          nome: modulo.nome,
          descricao: modulo.descricao,
          imagem: modulo.imagem || "",
          ordem: modulo.ordem,
          status: modulo.status || "Rascunho",
        });
        
        const curso = obterCurso(modulo.cursoId);
        if (curso) setCursoNome(curso.titulo);
      }
    } else if (courseIdFromUrl) {
      const curso = obterCurso(courseIdFromUrl);
      if (curso) setCursoNome(curso.titulo);
      
      // Definir ordem como próximo número
      const modulosExistentes = obterModulosPorCurso(courseIdFromUrl);
      setFormData(prev => ({
        ...prev,
        ordem: modulosExistentes.length + 1
      }));
    }
  }, [moduleId, courseIdFromUrl, isEditing, obterModulo, obterCurso, obterModulosPorCurso]);

  const handleInputChange = (field: string, value: string | number | boolean) => {
    if (field === "status") {
      setFormData(prev => ({ ...prev, status: value ? "Publicado" : "Rascunho" }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Por favor, selecione uma imagem válida.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setFormData(prev => ({ ...prev, imagem: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setFormData(prev => ({ ...prev, imagem: "" }));
  };

  const incrementOrdem = () => {
    setFormData(prev => ({ ...prev, ordem: prev.ordem + 1 }));
  };

  const decrementOrdem = () => {
    setFormData(prev => ({ ...prev, ordem: Math.max(1, prev.ordem - 1) }));
  };

  const handleSubmit = async () => {
    if (!formData.nome.trim()) {
      toast.error("O nome do módulo é obrigatório.");
      return;
    }

    if (!formData.cursoId) {
      toast.error("Selecione um curso para este módulo.");
      return;
    }

    try {
      if (isEditing && moduleId) {
        await editarModulo(moduleId, formData);
        toast.success("Módulo atualizado com sucesso!");
      } else {
        await criarModulo(formData);
        toast.success("Módulo criado com sucesso!");
      }
      navigate(`/admin/courses/${formData.cursoId}/modules`);
    } catch (error) {
      toast.error("Erro ao salvar o módulo.");
    }
  };

  const handleCancel = () => {
    if (formData.cursoId) {
      navigate(`/admin/courses/${formData.cursoId}/modules`);
    } else {
      navigate("/admin/courses");
    }
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleCancel}
            className="h-10 w-10 rounded-xl"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              {isEditing ? "Editar Módulo" : "Criar Módulo"}
            </h1>
            {cursoNome && (
              <p className="text-muted-foreground mt-1">
                Curso: {cursoNome}
              </p>
            )}
          </div>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={handleCancel} className="border-border/50">
            Cancelar
          </Button>
          <Button onClick={handleSubmit} className="gold-button">
            Salvar Módulo
          </Button>
        </div>
      </div>

      {/* Conteúdo Principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna Principal */}
        <div className="lg:col-span-2 space-y-6">
          {/* Detalhes do Módulo */}
          <div className="glass-card rounded-xl p-6 border border-border/50 space-y-6">
            <h2 className="text-lg font-semibold text-foreground">Detalhes do Módulo</h2>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome do Módulo</Label>
                <Input
                  id="nome"
                  placeholder="Digite o nome do módulo..."
                  value={formData.nome}
                  onChange={(e) => handleInputChange("nome", e.target.value)}
                  className="bg-card/50 border-border/50 focus:border-primary/50"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="descricao">Descrição do Módulo</Label>
                <Textarea
                  id="descricao"
                  placeholder="Adicione uma descrição detalhada deste módulo..."
                  value={formData.descricao}
                  onChange={(e) => handleInputChange("descricao", e.target.value)}
                  className="min-h-[120px] bg-card/50 border-border/50 focus:border-primary/50"
                />
              </div>
            </div>
          </div>

          {/* Imagem Ilustrativa */}
          <div className="glass-card rounded-xl p-6 border border-border/50 space-y-4">
            <h2 className="text-lg font-semibold text-foreground">Imagem Ilustrativa (Opcional)</h2>
            
            {formData.imagem ? (
              <div className="relative">
                <img
                  src={formData.imagem}
                  alt="Preview"
                  className="w-full h-48 object-cover rounded-xl"
                />
                <Button
                  variant="destructive"
                  size="icon"
                  onClick={removeImage}
                  className="absolute top-2 right-2 h-8 w-8"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <label className="border-2 border-dashed border-border/50 rounded-xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-primary/50 transition-colors">
                <div className="p-3 rounded-full bg-primary/10">
                  <Upload className="h-6 w-6 text-primary" />
                </div>
                <div className="text-center">
                  <p className="text-foreground font-medium">Clique para fazer upload</p>
                  <p className="text-sm text-muted-foreground">PNG, JPG (máx. 2MB)</p>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status */}
          <div className="glass-card rounded-xl p-6 border border-border/50 space-y-4">
            <h2 className="text-lg font-semibold text-foreground">Status</h2>
            <p className="text-sm text-muted-foreground">
              Defina se o módulo está publicado ou em rascunho.
            </p>
            
            <div className="flex items-center justify-between pt-2">
              <Label htmlFor="status" className="text-foreground">
                {formData.status === "Publicado" ? "Publicado" : "Rascunho"}
              </Label>
              <Switch
                id="status"
                checked={formData.status === "Publicado"}
                onCheckedChange={(checked) => handleInputChange("status", checked)}
              />
            </div>
          </div>

          {/* Ordem */}
          <div className="glass-card rounded-xl p-6 border border-border/50 space-y-4">
            <h2 className="text-lg font-semibold text-foreground">Ordem do Módulo</h2>
            <p className="text-sm text-muted-foreground">
              Defina a posição deste módulo no curso.
            </p>
            
            <div className="flex items-center justify-center gap-4 pt-2">
              <Button
                variant="outline"
                size="icon"
                onClick={decrementOrdem}
                disabled={formData.ordem <= 1}
                className="h-10 w-10 border-border/50"
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="text-3xl font-bold text-primary min-w-[60px] text-center">
                {formData.ordem}
              </span>
              <Button
                variant="outline"
                size="icon"
                onClick={incrementOrdem}
                className="h-10 w-10 border-border/50"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
