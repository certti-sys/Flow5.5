import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2, Save, Layout as LayoutIcon, Sidebar, PanelTop, Check, RotateCcw } from "lucide-react";
import { usePlatformSettings, PlatformSettings } from "@/hooks/usePlatformSettings";
import { motion } from "framer-motion";
import { toast } from "sonner";

export const LayoutCustomization = () => {
  const { settings, updateSettings, isSaving } = usePlatformSettings();

  const [formData, setFormData] = useState<Partial<PlatformSettings>>({
    navigation_layout: settings.navigation_layout || 'sidebar',
    sidebar_default_collapsed: settings.sidebar_default_collapsed,
  });

  useEffect(() => {
    setFormData({
      navigation_layout: settings.navigation_layout || 'sidebar',
      sidebar_default_collapsed: settings.sidebar_default_collapsed,
    });
  }, [settings]);

  const handleSave = () => {
    updateSettings(formData);
    toast.success("Configurações de layout atualizadas!");
  };

  const handleReset = () => {
    setFormData({
      navigation_layout: 'sidebar',
      sidebar_default_collapsed: false,
    });
    toast.info("Layout resetado localmente. Clique em salvar para aplicar.");
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 gap-8">
        {/* Navegação & Estrutura */}
        <motion.div variants={itemVariants}>
          <Card className="glass-card border-white/10 rounded-[16px] overflow-hidden h-full">
            <CardHeader className="p-8 border-b border-white/5 bg-white/[0.02]">
              <div className="flex items-center gap-4">
                 <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/10 border border-blue-500/20">
                    <LayoutIcon className="w-6 h-6 text-blue-500 shadow-glow-sm" />
                 </div>
                 <div>
                    <CardTitle className="text-[20px] font-bold text-white tracking-tight">Arquitetura de Navegação</CardTitle>
                    <CardDescription className="text-[14px] text-muted-foreground/40 font-medium">Escolha como os alunos navegam pela escola.</CardDescription>
                 </div>
              </div>
            </CardHeader>
            <CardContent className="p-8 space-y-8">
              <div className="space-y-6">
                <Label className="text-[13px] font-bold text-muted-foreground/40 uppercase tracking-widest block mb-4">Selecione o Layout</Label>
                
                <RadioGroup
                  value={formData.navigation_layout}
                  onValueChange={(value: 'sidebar' | 'horizontal' | 'both') =>
                    setFormData({ ...formData, navigation_layout: value })
                  }
                  className="grid grid-cols-1 md:grid-cols-2 gap-6"
                >
                  {/* Sidebar Option */}
                  <div 
                    onClick={() => setFormData({ ...formData, navigation_layout: 'sidebar' })}
                    className={`relative group cursor-pointer transition-all ${formData.navigation_layout === 'sidebar' ? 'ring-2 ring-primary ring-offset-4 ring-offset-black rounded-[12px]' : ''}`}
                  >
                    <div className={`p-4 rounded-[12px] border-2 transition-all overflow-hidden bg-black/40 ${formData.navigation_layout === 'sidebar' ? 'border-primary/50 bg-primary/5' : 'border-white/5 hover:border-white/10'}`}>
                      <div className="aspect-[1.5] w-full bg-white/[0.03] rounded-[12px] border border-white/5 relative flex p-2 gap-2">
                         <div className="w-1/4 h-full bg-primary/20 rounded-md border border-primary/20 flex flex-col p-1 gap-1">
                            <div className="w-full h-2 bg-primary/40 rounded-sm" />
                            <div className="w-2/3 h-1 bg-primary/20 rounded-sm" />
                            <div className="w-2/3 h-1 bg-primary/20 rounded-sm" />
                            <div className="w-2/3 h-1 bg-primary/20 rounded-sm" />
                         </div>
                         <div className="flex-1 h-full bg-white/5 rounded-md border border-white/5 p-1">
                            <div className="w-1/3 h-2 bg-white/10 rounded-sm mb-1" />
                            <div className="grid grid-cols-2 gap-1">
                               <div className="aspect-square bg-white/5 rounded-sm" />
                               <div className="aspect-square bg-white/5 rounded-sm" />
                            </div>
                         </div>
                      </div>
                      <div className="mt-4 flex items-center justify-between">
                         <div className="flex items-center gap-2">
                            <Sidebar className={`w-4 h-4 ${formData.navigation_layout === 'sidebar' ? 'text-primary' : 'text-muted-foreground/40'}`} />
                            <span className={`text-[14px] font-bold ${formData.navigation_layout === 'sidebar' ? 'text-white' : 'text-muted-foreground/60'}`}>Menu Lateral</span>
                         </div>
                         {formData.navigation_layout === 'sidebar' && (
                            <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                               <Check className="w-3 h-3 text-white" strokeWidth={4} />
                            </div>
                         )}
                      </div>
                    </div>
                  </div>

                  {/* Topbar Option */}
                  <div 
                    onClick={() => setFormData({ ...formData, navigation_layout: 'horizontal' })}
                    className={`relative group cursor-pointer transition-all ${formData.navigation_layout === 'horizontal' ? 'ring-2 ring-primary ring-offset-4 ring-offset-black rounded-[12px]' : ''}`}
                  >
                    <div className={`p-4 rounded-[12px] border-2 transition-all overflow-hidden bg-black/40 ${formData.navigation_layout === 'horizontal' ? 'border-primary/50 bg-primary/5' : 'border-white/5 hover:border-white/10'}`}>
                      <div className="aspect-[1.5] w-full bg-white/[0.03] rounded-[12px] border border-white/5 relative flex flex-col p-2 gap-2">
                         <div className="w-full h-4 bg-primary/20 rounded-md border border-primary/20 flex items-center px-2 gap-2">
                            <div className="w-4 h-2 bg-primary/40 rounded-sm" />
                            <div className="w-4 h-1 bg-primary/20 rounded-sm" />
                            <div className="w-4 h-1 bg-primary/20 rounded-sm" />
                         </div>
                         <div className="flex-1 h-full bg-white/5 rounded-md border border-white/5 p-1">
                            <div className="w-1/3 h-2 bg-white/10 rounded-sm mb-1" />
                            <div className="grid grid-cols-3 gap-1">
                               <div className="aspect-square bg-white/5 rounded-sm" />
                               <div className="aspect-square bg-white/5 rounded-sm" />
                               <div className="aspect-square bg-white/5 rounded-sm" />
                            </div>
                         </div>
                      </div>
                      <div className="mt-4 flex items-center justify-between">
                         <div className="flex items-center gap-2">
                            <PanelTop className={`w-4 h-4 ${formData.navigation_layout === 'horizontal' ? 'text-primary' : 'text-muted-foreground/40'}`} />
                            <span className={`text-[14px] font-bold ${formData.navigation_layout === 'horizontal' ? 'text-white' : 'text-muted-foreground/60'}`}>Menu Superior</span>
                         </div>
                         {formData.navigation_layout === 'horizontal' && (
                            <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                               <Check className="w-3 h-3 text-white" strokeWidth={4} />
                            </div>
                         )}
                      </div>
                    </div>
                  </div>
                </RadioGroup>
              </div>

              {formData.navigation_layout === 'sidebar' && (
                <div className="flex items-center justify-between p-6 glass-card border-white/5 rounded-[12px] bg-white/[0.01] transition-all">
                  <div className="space-y-1">
                    <Label htmlFor="compact" className="text-[15px] font-bold text-white cursor-pointer">
                      Sidebar Compacta por Padrão
                    </Label>
                    <p className="text-[13px] text-muted-foreground/40 font-medium">Inicia o menu apenas com ícones para maior foco no conteúdo.</p>
                  </div>
                  <Switch
                    id="compact"
                    checked={formData.sidebar_default_collapsed}
                    onCheckedChange={(checked) => setFormData({ ...formData, sidebar_default_collapsed: checked })}
                    className="data-[state=checked]:bg-primary"
                  />
                </div>
              )}

               <div className="mt-8 p-6 glass-card border-white/5 rounded-[12px]">
                  <p className="text-[11px] font-black text-white/20 uppercase tracking-widest mb-4 flex items-center gap-2">
                     <div className="w-1 h-1 rounded-full bg-primary" />
                     Dica de UX
                  </p>
                  <p className="text-[13px] text-muted-foreground/60 leading-relaxed font-medium">
                     Layouts <span className="text-white">Topbar</span> são ótimos para escolas com poucos cursos, enquanto a <span className="text-white">Sidebar</span> é recomendada para bibliotecas de conteúdo mais densas.
                  </p>
               </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

       {/* Action Bar */}
       <div className="flex justify-end gap-3 pt-4">
         <Button
           variant="outline"
           onClick={handleReset}
           disabled={isSaving}
           className="h-[44px] px-6 rounded-[12px] text-[14px] font-medium glass-card hover:bg-white/5 border-white/10"
         >
           Resetar
         </Button>
         <Button
           onClick={handleSave}
           disabled={isSaving}
           className="h-[44px] px-8 rounded-[12px] text-[14px] font-medium gradient-primary shadow-glow min-w-[170px]"
         >
           {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
           Salvar Layout
         </Button>
       </div>
    </div>
  );
};
