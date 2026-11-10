import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Upload, Image as ImageIcon, Loader2 } from "lucide-react";
import { CommunitySettings, useSupabaseCommunity } from "@/hooks/useSupabaseCommunity";
import { useCourses } from "@/hooks/useCourses";
import { useStudents } from "@/hooks/useStudents";
import { CourseSelector } from "./CourseSelector";
import { StudentAccessList } from "./StudentAccessList";
import { useAuthContext } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Configurações de validação de imagens
const IMAGE_REQUIREMENTS = {
  imagemCapa: {
    minWidth: 360,
    maxWidth: 440,
    minHeight: 540,
    maxHeight: 660,
    aspectRatio: 2/3,
    recommended: "400×600px"
  },
  bannerPrincipal: {
    minWidth: 1280,
    maxWidth: 2560,
    minHeight: 720,
    maxHeight: 1440,
    aspectRatio: 16/9,
    recommended: "1920×1080px"
  }
};

// Função para carregar imagem e obter dimensões
const getImageDimensions = (file: File): Promise<{ width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(img.src);
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
};

// Função para validar proporção
const validateAspectRatio = (width: number, height: number, expectedRatio: number, tolerance = 0.1): boolean => {
  const actualRatio = width / height;
  const minRatio = expectedRatio * (1 - tolerance);
  const maxRatio = expectedRatio * (1 + tolerance);
  return actualRatio >= minRatio && actualRatio <= maxRatio;
};

interface CommunityGeneralSettingsProps {
  settings: CommunitySettings;
  onUpdate: (updates: Partial<CommunitySettings>) => void;
}

export function CommunityGeneralSettings({ settings, onUpdate }: CommunityGeneralSettingsProps) {
  const { cursos: courses } = useCourses();
  const { students = [], isLoading } = useStudents();
  const { user } = useAuthContext();
  const { grantAccess, revokeAccess, manualAccess = [] } = useSupabaseCommunity();
  const [uploading, setUploading] = React.useState<'imagemCapa' | 'bannerPrincipal' | null>(null);

  const handleImageUpload = (field: 'imagemCapa' | 'bannerPrincipal') => async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(field);
      
      // 1. Obter dimensões da imagem
      const { width, height } = await getImageDimensions(file);
      const requirements = IMAGE_REQUIREMENTS[field];
      
      // 2. Validar proporção (aspect ratio)
      if (!validateAspectRatio(width, height, requirements.aspectRatio)) {
        const expectedRatio = field === 'imagemCapa' ? '2:3 (vertical)' : '16:9 (horizontal)';
        toast.error(`Proporção incorreta! Use imagem ${expectedRatio}`);
        setUploading(null);
        return;
      }
      
      // 3. Validar dimensões mínimas
      if (width < requirements.minWidth || height < requirements.minHeight) {
        toast.error(`Imagem muito pequena! Mínimo: ${requirements.minWidth}×${requirements.minHeight}px`);
        setUploading(null);
        return;
      }
      
      // 4. Aviso se muito grande (mas permite)
      if (width > requirements.maxWidth || height > requirements.maxHeight) {
        toast.warning(`Imagem grande. Recomendado: até ${requirements.maxWidth}×${requirements.maxHeight}px`);
      }

      // 5. Gerar nome único para o arquivo
      const fileExt = file.name.split('.').pop();
      const fileName = `${field}-${Date.now()}.${fileExt}`;
      const filePath = fileName;

      // 6. Upload para Supabase Storage
      const { data, error } = await supabase.storage
        .from('community-images')
        .upload(filePath, file, { upsert: true });

      if (error) {
        toast.error("Erro ao fazer upload da imagem");
        console.error("Upload error:", error);
        setUploading(null);
        return;
      }

      // 7. Obter URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('community-images')
        .getPublicUrl(filePath);

      // 8. Atualizar settings com a URL
      onUpdate({ [field]: publicUrl });
      toast.success("Imagem enviada com sucesso!");
    } catch (error) {
      console.error("Error uploading image:", error);
      toast.error("Erro ao processar imagem");
    } finally {
      setUploading(null);
    }
  };

  const toggleCourse = (courseId: string) => {
    const cursosVinculados = settings.cursosVinculados.includes(courseId)
      ? settings.cursosVinculados.filter(id => id !== courseId)
      : [...settings.cursosVinculados, courseId];
    onUpdate({ cursosVinculados });
  };

  const toggleStudent = async (studentId: string) => {
    if (!user?.id) return;
    
    const hasAccess = manualAccess.some(access => access.user_id === studentId);
    
    try {
      if (hasAccess) {
        await revokeAccess(studentId);
      } else {
        await grantAccess({ userId: studentId, grantedBy: user.id });
      }
    } catch (error) {
      console.error("Erro ao alterar acesso:", error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Nome e Descrição */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="nome">Nome da Comunidade</Label>
          <Input
            id="nome"
            value={settings.nome}
            onChange={(e) => onUpdate({ nome: e.target.value })}
            placeholder="Ex: Comunidade Premium"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="icone">Ícone</Label>
          <Input
            id="icone"
            value={settings.icone}
            onChange={(e) => onUpdate({ icone: e.target.value })}
            placeholder="🏛️"
            maxLength={2}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="descricao">Descrição</Label>
        <Textarea
          id="descricao"
          value={settings.descricao}
          onChange={(e) => onUpdate({ descricao: e.target.value })}
          placeholder="Descrição curta da comunidade"
          rows={3}
        />
      </div>

      {/* Uploads de Imagens */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Imagem de Capa 400x600 */}
        <div className="space-y-2">
          <Label>Imagem de Capa (400×600)</Label>
          <div className="glass-card border border-border/50 rounded-xl p-4">
            {settings.imagemCapa ? (
              <div className="relative aspect-[2/3] w-full max-w-[200px] mx-auto">
                <img 
                  src={settings.imagemCapa} 
                  alt="Capa" 
                  className="w-full h-full object-cover rounded-lg"
                />
                <Button
                  variant="destructive"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={() => onUpdate({ imagemCapa: "" })}
                >
                  Remover
                </Button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center aspect-[2/3] w-full max-w-[200px] mx-auto cursor-pointer hover:bg-white/5 transition-colors rounded-lg border-2 border-dashed border-border">
                {uploading === 'imagemCapa' ? (
                  <>
                    <Loader2 className="w-12 h-12 text-primary animate-spin mb-2" />
                    <span className="text-sm text-muted-foreground">Enviando...</span>
                  </>
                ) : (
                  <>
                    <ImageIcon className="w-12 h-12 text-muted-foreground mb-2" />
                    <span className="text-sm text-muted-foreground font-medium">Upload</span>
                    <span className="text-xs text-muted-foreground/70 mt-1">400×600px • 2:3</span>
                  </>
                )}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload('imagemCapa')}
                  disabled={uploading === 'imagemCapa'}
                />
              </label>
            )}
          </div>
        </div>

        {/* Banner Principal 16:9 */}
        <div className="space-y-2">
          <Label>Banner Principal (16:9)</Label>
          <div className="glass-card border border-border/50 rounded-xl p-4">
            {settings.bannerPrincipal ? (
              <div className="relative aspect-video w-full">
                <img 
                  src={settings.bannerPrincipal} 
                  alt="Banner" 
                  className="w-full h-full object-cover rounded-lg"
                />
                <Button
                  variant="destructive"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={() => onUpdate({ bannerPrincipal: "" })}
                >
                  Remover
                </Button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center aspect-video w-full cursor-pointer hover:bg-white/5 transition-colors rounded-lg border-2 border-dashed border-border">
                {uploading === 'bannerPrincipal' ? (
                  <>
                    <Loader2 className="w-12 h-12 text-primary animate-spin mb-2" />
                    <span className="text-sm text-muted-foreground">Enviando...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-12 h-12 text-muted-foreground mb-2" />
                    <span className="text-sm text-muted-foreground font-medium">Upload</span>
                    <span className="text-xs text-muted-foreground/70 mt-1">1920×1080px • 16:9</span>
                  </>
                )}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload('bannerPrincipal')}
                  disabled={uploading === 'bannerPrincipal'}
                />
              </label>
            )}
          </div>
        </div>
      </div>

      {/* Cor de Destaque */}
      <div className="space-y-2">
        <Label htmlFor="corDestaque">Cor de Destaque</Label>
        <div className="flex gap-2">
          <Input
            id="corDestaque"
            type="color"
            value={settings.corDestaque}
            onChange={(e) => onUpdate({ corDestaque: e.target.value })}
            className="w-20 h-10"
          />
          <Input
            value={settings.corDestaque}
            onChange={(e) => onUpdate({ corDestaque: e.target.value })}
            placeholder="#D4AF37"
          />
        </div>
      </div>

      {/* Mensagem de Boas-vindas */}
      <div className="space-y-2">
        <Label htmlFor="mensagem">Mensagem de Boas-vindas</Label>
        <Textarea
          id="mensagem"
          value={settings.mensagemBoasVindas}
          onChange={(e) => onUpdate({ mensagemBoasVindas: e.target.value })}
          placeholder="Seja bem-vindo à nossa comunidade..."
          rows={4}
        />
      </div>

      {/* Seção: Vincular Acesso aos Cursos */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-foreground">
          Vincular Acesso aos Cursos
        </h3>
        <p className="text-sm text-muted-foreground">
          Alunos que comprarem os cursos selecionados terão acesso automático à comunidade
        </p>
        
        <CourseSelector
          courses={courses}
          selectedCourses={settings.cursosVinculados}
          onToggleCourse={toggleCourse}
        />
      </div>

      {/* Seção: Acesso Manual Individual */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-foreground">
          Liberar Acesso Manual para Alunos Específicos
        </h3>
        <p className="text-sm text-muted-foreground">
          Selecione alunos individuais para dar acesso direto à comunidade, independente de compras
        </p>
        
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">
            Carregando alunos...
          </div>
        ) : (
          <StudentAccessList
            students={students}
            grantedAccess={manualAccess.map(a => a.user_id)}
            onToggleAccess={toggleStudent}
          />
        )}
      </div>
    </div>
  );
}
