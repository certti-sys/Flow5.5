import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Upload, X, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useCourses } from "@/hooks/useCourses";
import { useCategories } from "@/hooks/useCategories";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";

const tagsIntegracao = [
  "Hotmart",
  "Monetizze",
  "Eduzz",
  "Kiwify",
  "Bripe",
  "PerfectPay",
  "Outro",
];

export default function CourseForm() {
  const navigate = useNavigate();
  const { courseId } = useParams();
  const { toast } = useToast();
  const { cursos, criarCurso, editarCurso, obterCurso } = useCourses();
  const { categories, tags } = useCategories();

  const isEditing = !!courseId;

  const [formData, setFormData] = useState({
    titulo: "",
    descricao: "",
    descricaoLonga: "",
    categoria: "",
    categoriaId: "",
    tags: [] as string[],
    imagem: "",
    checkoutUrl: "",
    tagIntegracao: "",
    status: "Rascunho" as "Publicado" | "Rascunho",
  });

  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isEditing && courseId) {
      const curso = obterCurso(courseId);
      if (curso) {
        setFormData({
          titulo: curso.titulo,
          descricao: curso.descricao,
          descricaoLonga: (curso as any).descricaoLonga || "",
          categoria: curso.categoria,
          categoriaId: curso.categoriaId || "",
          tags: curso.tags || [],
          imagem: curso.imagem,
          checkoutUrl: (curso as any).checkoutUrl || "",
          tagIntegracao: (curso as any).tagIntegracao || "",
          status: curso.status,
        });
      }
    }
  }, [isEditing, courseId, cursos]);

  const handleImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Erro",
        description: "A imagem deve ter no máximo 5MB",
        variant: "destructive",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setFormData((prev) => ({ ...prev, imagem: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setFormData((prev) => ({ ...prev, imagem: "" }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

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
          categoriaId: formData.categoriaId,
          tags: formData.tags,
          imagem: formData.imagem,
          status: formData.status,
          checkoutUrl: formData.checkoutUrl,
          tagIntegracao: formData.tagIntegracao,
        } as any);
        toast({
          title: "Sucesso",
          description: "Curso atualizado com sucesso!",
        });
      } else {
        await criarCurso({
          titulo: formData.titulo,
          descricao: formData.descricao,
          categoria: formData.categoria,
          categoriaId: formData.categoriaId,
          tags: formData.tags,
          imagem: formData.imagem,
          banner: "",
          status: formData.status,
          modulos: 0,
          aulas: 0,
          checkoutUrl: formData.checkoutUrl,
          tagIntegracao: formData.tagIntegracao,
        } as any);
        toast({
          title: "Sucesso",
          description: "Curso criado com sucesso!",
        });
      }
      navigate("/admin/courses");
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/admin/courses")}
            className="hover:bg-primary/10 min-w-[44px] min-h-[44px]"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">
              {isEditing ? "Editar Curso" : "Criar Novo Curso"}
            </h1>
            <p className="text-muted-foreground">
              {isEditing
                ? "Atualize as informações do curso"
                : "Preencha os dados para criar um novo curso"}
            </p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full lg:w-auto">
          <Button
            variant="outline"
            onClick={() => navigate("/admin/courses")}
            className="border-border/50 w-full sm:w-auto min-h-[44px]"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isLoading}
            className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2 w-full sm:w-auto min-h-[44px]"
          >
            <Save className="h-4 w-4" />
            {isLoading ? "Salvando..." : "Salvar Curso"}
          </Button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna Principal */}
        <div className="lg:col-span-2 space-y-6">
          {/* Informações Básicas */}
          <Card className="glass-card border-border/50">
            <CardHeader>
              <CardTitle className="text-lg">Informações do Curso</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="titulo">Título do Curso *</Label>
                <Input
                  id="titulo"
                  value={formData.titulo}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, titulo: e.target.value }))
                  }
                  placeholder="Ex: Curso Completo de Marketing Digital"
                  className="bg-background/50 border-border/50"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="descricao">Descrição Curta</Label>
                <Textarea
                  id="descricao"
                  value={formData.descricao}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, descricao: e.target.value }))
                  }
                  placeholder="Uma breve descrição do curso (aparece na vitrine)"
                  rows={3}
                  className="bg-background/50 border-border/50"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="descricaoLonga">Descrição Completa</Label>
                <Textarea
                  id="descricaoLonga"
                  value={formData.descricaoLonga}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      descricaoLonga: e.target.value,
                    }))
                  }
                  placeholder="Descrição detalhada do curso (aparece na página do curso)"
                  rows={6}
                  className="bg-background/50 border-border/50"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="categoria">Categoria</Label>
                  <Select
                    value={formData.categoriaId}
                    onValueChange={(value) => {
                      const cat = categories.find(c => c.id === value);
                      setFormData((prev) => ({ 
                        ...prev, 
                        categoriaId: value,
                        categoria: cat?.nome || ''
                      }));
                    }}
                  >
                    <SelectTrigger className="bg-background/50 border-border/50 min-h-[44px]">
                      <SelectValue placeholder="Selecione uma categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.cor }} />
                            {cat.nome}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value: "Publicado" | "Rascunho") =>
                      setFormData((prev) => ({ ...prev, status: value }))
                    }
                  >
                    <SelectTrigger className="bg-background/50 border-border/50 min-h-[44px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Rascunho">Rascunho</SelectItem>
                      <SelectItem value="Publicado">Publicado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Tags (selecione uma ou mais)</Label>
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => {
                    const isSelected = formData.tags.includes(tag.id);
                    return (
                      <Badge
                        key={tag.id}
                        onClick={() => {
                          setFormData((prev) => ({
                            ...prev,
                            tags: isSelected
                              ? prev.tags.filter(t => t !== tag.id)
                              : [...prev.tags, tag.id]
                          }));
                        }}
                        style={{ 
                          backgroundColor: isSelected ? tag.cor : 'transparent',
                          borderColor: tag.cor,
                          color: isSelected ? '#000' : tag.cor,
                          cursor: 'pointer'
                        }}
                        className="border-2 transition-all hover:scale-105 min-h-[36px] px-3 py-2"
                      >
                        {tag.nome}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Imagens */}
          <Card className="glass-card border-border/50">
            <CardHeader>
              <CardTitle className="text-lg">Imagens</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Capa do Curso */}
              <div className="space-y-2">
                <Label>Capa do Curso *</Label>
                <p className="text-sm text-muted-foreground">
                  Imagem exibida nos cards da vitrine (recomendado: 400x600 proporção 2:3)
                </p>
                <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg">
                  <p className="text-xs text-muted-foreground">
                    💡 <strong>Dica:</strong> Esta capa é usada nos cards da vitrine. Para configurar o banner hero principal da página inicial, acesse <strong>Configuração da Vitrine</strong>.
                  </p>
                </div>
                {formData.imagem ? (
                  <div className="relative w-full max-w-md">
                    <img
                      src={formData.imagem}
                      alt="Capa do curso"
                      className="w-full aspect-[2/3] object-cover rounded-lg border border-border/50"
                    />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2 h-10 w-10"
                        onClick={removeImage}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-full max-w-md h-64 border-2 border-dashed border-border/50 rounded-lg cursor-pointer hover:border-primary/50 transition-colors bg-background/30">
                    <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                    <span className="text-sm text-muted-foreground">
                      Clique para fazer upload
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageUpload}
                    />
                  </label>
                )}
              </div>

            </CardContent>
          </Card>
        </div>

        {/* Coluna Lateral */}
        <div className="space-y-6">
          {/* Integração */}
          <Card className="glass-card border-border/50">
            <CardHeader>
              <CardTitle className="text-lg">Integração de Pagamento</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="checkoutUrl">URL do Checkout</Label>
                <Input
                  id="checkoutUrl"
                  type="url"
                  value={formData.checkoutUrl}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      checkoutUrl: e.target.value,
                    }))
                  }
                  placeholder="https://pay.hotmart.com/..."
                  className="bg-background/50 border-border/50"
                />
                <p className="text-xs text-muted-foreground">
                  Link para onde o aluno será redirecionado ao comprar
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tagIntegracao">Plataforma de Pagamento</Label>
                <Select
                  value={formData.tagIntegracao}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, tagIntegracao: value }))
                  }
                >
                  <SelectTrigger className="bg-background/50 border-border/50 min-h-[44px]">
                    <SelectValue placeholder="Selecione a plataforma" />
                  </SelectTrigger>
                  <SelectContent>
                    {tagsIntegracao.map((tag) => (
                      <SelectItem key={tag} value={tag}>
                        {tag}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Preview */}
          <Card className="glass-card border-border/50">
            <CardHeader>
              <CardTitle className="text-lg">Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {formData.imagem ? (
                  <img
                    src={formData.imagem}
                    alt="Preview"
                    className="w-full aspect-video object-cover rounded-lg"
                  />
                ) : (
                  <div className="w-full aspect-video bg-muted/30 rounded-lg flex items-center justify-center">
                    <span className="text-muted-foreground text-sm">
                      Sem imagem
                    </span>
                  </div>
                )}
                <h3 className="font-semibold truncate">
                  {formData.titulo || "Título do Curso"}
                </h3>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {formData.descricao || "Descrição do curso aparecerá aqui"}
                </p>
                {formData.categoria && (
                  <span className="inline-block text-xs px-2 py-1 rounded bg-primary/20 text-primary">
                    {formData.categoria}
                  </span>
                )}
                {formData.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {formData.tags.map(tagId => {
                      const tag = tags.find(t => t.id === tagId);
                      return tag ? (
                        <Badge key={tag.id} style={{ backgroundColor: tag.cor, color: '#000' }} className="text-xs">
                          {tag.nome}
                        </Badge>
                      ) : null;
                    })}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </form>
    </div>
  );
}
