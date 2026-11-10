import { Upload, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import type { CourseFormData } from "@/pages/admin/CourseManagement";

const categorias = [
  "Marketing Digital",
  "Programação",
  "Design",
  "Negócios",
  "Finanças",
  "Desenvolvimento Pessoal",
  "Saúde e Bem-estar",
  "Idiomas",
  "Outros",
];

interface CourseDetailsTabProps {
  formData: CourseFormData;
  updateFormData: (updates: Partial<CourseFormData>) => void;
}

export function CourseDetailsTab({ formData, updateFormData }: CourseDetailsTabProps) {
  const { toast } = useToast();

  const handleImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    field: "imagem" | "banner"
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
      updateFormData({ [field]: reader.result as string });
    };
    reader.readAsDataURL(file);
  };

  const removeImage = (field: "imagem" | "banner") => {
    updateFormData({ [field]: "" });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
                onChange={(e) => updateFormData({ titulo: e.target.value })}
                placeholder="Ex: Curso Completo de Marketing Digital"
                className="bg-background/50 border-border/50"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="descricao">Descrição Curta</Label>
              <Textarea
                id="descricao"
                value={formData.descricao}
                onChange={(e) => updateFormData({ descricao: e.target.value })}
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
                onChange={(e) => updateFormData({ descricaoLonga: e.target.value })}
                placeholder="Descrição detalhada do curso (aparece na página do curso)"
                rows={6}
                className="bg-background/50 border-border/50"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="categoria">Categoria</Label>
                <Select
                  value={formData.categoria}
                  onValueChange={(value) => updateFormData({ categoria: value })}
                >
                  <SelectTrigger className="bg-background/50 border-border/50">
                    <SelectValue placeholder="Selecione uma categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {categorias.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
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
                    updateFormData({ status: value })
                  }
                >
                  <SelectTrigger className="bg-background/50 border-border/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Rascunho">Rascunho</SelectItem>
                    <SelectItem value="Publicado">Publicado</SelectItem>
                  </SelectContent>
                </Select>
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
              <Label>Capa do Curso</Label>
              <p className="text-sm text-muted-foreground">
                Imagem exibida na listagem de cursos (recomendado: 400x225)
              </p>
              {formData.imagem ? (
                <div className="relative w-full max-w-md">
                  <img
                    src={formData.imagem}
                    alt="Capa do curso"
                    className="w-full aspect-video object-cover rounded-lg border border-border/50"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2"
                    onClick={() => removeImage("imagem")}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full max-w-md h-40 border-2 border-dashed border-border/50 rounded-lg cursor-pointer hover:border-primary/50 transition-colors bg-background/30">
                  <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                  <span className="text-sm text-muted-foreground">
                    Clique para fazer upload
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleImageUpload(e, "imagem")}
                  />
                </label>
              )}
            </div>

            {/* Banner Principal */}
            <div className="space-y-2">
              <Label>Banner Principal</Label>
              <p className="text-sm text-muted-foreground">
                Banner grande exibido na vitrine Netflix (recomendado: 1920x600)
              </p>
              {formData.banner ? (
                <div className="relative w-full">
                  <img
                    src={formData.banner}
                    alt="Banner do curso"
                    className="w-full aspect-[3/1] object-cover rounded-lg border border-border/50"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2"
                    onClick={() => removeImage("banner")}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-border/50 rounded-lg cursor-pointer hover:border-primary/50 transition-colors bg-background/30">
                  <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                  <span className="text-sm text-muted-foreground">
                    Clique para fazer upload do banner
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleImageUpload(e, "banner")}
                  />
                </label>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Coluna Lateral - Preview */}
      <div className="space-y-6">
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
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
