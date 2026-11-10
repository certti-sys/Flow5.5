// Página de Configuração da Comunidade
import { useState, useEffect } from "react";
import { Eye, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSupabaseCommunity, CommunitySettings } from "@/hooks/useSupabaseCommunity";
import { CommunityGeneralSettings } from "@/components/community/CommunityGeneralSettings";
import { toast } from "sonner";

export default function CommunityConfig() {
  const { settings, updateSettings, loadingSettings } = useSupabaseCommunity();
  const [localSettings, setLocalSettings] = useState<CommunitySettings | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Initialize local settings when data loads
  useEffect(() => {
    if (settings && !localSettings) {
      setLocalSettings(settings);
    }
  }, [settings]);

  const handlePreview = () => {
    window.open('/student/community', '_blank');
  };

  const handleLocalUpdate = (updates: Partial<CommunitySettings>) => {
    if (!localSettings) return;
    setLocalSettings({ ...localSettings, ...updates });
  };

  const handleSave = async () => {
    if (!localSettings) return;
    
    setIsSaving(true);
    try {
      await updateSettings(localSettings);
      toast.success("Comunidade salva com sucesso!");
    } catch (error) {
      console.error("Erro ao salvar:", error);
      toast.error("Erro ao salvar configurações");
    } finally {
      setIsSaving(false);
    }
  };

  if (loadingSettings || !localSettings) {
    return (
      <div className="min-h-screen bg-background p-6 lg:p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando configurações...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              Configuração da Comunidade
            </h1>
            <p className="text-muted-foreground mt-1">
              Configure sua comunidade - cursos vinculados geram prateleiras automáticas
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handlePreview} className="gap-2">
              <Eye className="w-4 h-4" />
              Ver Preview
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={isSaving}
              className="gap-2 bg-primary hover:bg-primary/90"
            >
              <Save className="w-4 h-4" />
              {isSaving ? "Salvando..." : "Salvar Tudo"}
            </Button>
          </div>
        </div>

        {/* Settings */}
        <div className="glass-card border border-border/50 rounded-xl p-6">
          <CommunityGeneralSettings
            settings={localSettings}
            onUpdate={handleLocalUpdate}
          />
        </div>

        {/* Info Box */}
        <div className="glass-card border border-border/50 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-foreground mb-2">
            Como funciona a Comunidade
          </h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>• <strong>Vinculação:</strong> Escolha quais cursos/módulos dão acesso à comunidade</li>
            <li>• <strong>Seções:</strong> Organize o conteúdo interno com categorias personalizadas</li>
            <li>• <strong>Vitrine:</strong> Crie prateleiras estilo Netflix para destacar conteúdos</li>
            <li>• <strong>Cards:</strong> Formato vertical 400×600 (2:3) para melhor visualização</li>
            <li>• <strong>Acesso:</strong> Alunos sem acesso verão conteúdo bloqueado com opção de compra</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
