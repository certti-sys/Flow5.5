import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Slider } from "@/components/ui/slider";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Info, Loader2, Save, Send, Link, Monitor, Layout as LayoutIcon, Image as ImageIcon, Heart, RotateCcw, Palette } from "lucide-react";
import { ImageUploadField } from "./ImageUploadField";
import { usePlatformSettings, PlatformSettings } from "@/hooks/usePlatformSettings";
import { motion } from "framer-motion";
import { toast } from "sonner";

export const BrandingCustomization = () => {
  const { settings, updateSettings, isSaving, uploadAsset } = usePlatformSettings();

  const [formData, setFormData] = useState<Partial<PlatformSettings>>({
    banner_badge_text: settings.banner_badge_text,
    banner_title_line1: settings.banner_title_line1,
    banner_title_line2: settings.banner_title_line2,
    banner_title_line3: settings.banner_title_line3,
    banner_subtitle: settings.banner_subtitle,
    banner_button_primary_text: settings.banner_button_primary_text,
    banner_button_primary_link: settings.banner_button_primary_link,
    banner_button_secondary_text: settings.banner_button_secondary_text,
    banner_button_secondary_link: settings.banner_button_secondary_link,
    banner_background_url: settings.banner_background_url,
    banner_show_stats_card: settings.banner_show_stats_card,
    logo_text: settings.logo_text,
    logo_image_url: settings.logo_image_url,
    logo_horizontal_url: settings.logo_horizontal_url,
    logo_display_mode: settings.logo_display_mode,
    favicon_url: settings.favicon_url,
    page_title: settings.page_title,
    gradient_start_color: settings.gradient_start_color,
    gradient_end_color: settings.gradient_end_color,
    certificate_signature_url: settings.certificate_signature_url ?? null,
    certificate_instructor_name: settings.certificate_instructor_name ?? '',
    login_background_url: settings.login_background_url,
    login_overlay_opacity: settings.login_overlay_opacity ?? 50,
  });

  useEffect(() => {
    setFormData({
      banner_badge_text: settings.banner_badge_text,
      banner_title_line1: settings.banner_title_line1,
      banner_title_line2: settings.banner_title_line2,
      banner_title_line3: settings.banner_title_line3,
      banner_subtitle: settings.banner_subtitle,
      banner_button_primary_text: settings.banner_button_primary_text,
      banner_button_primary_link: settings.banner_button_primary_link,
      banner_button_secondary_text: settings.banner_button_secondary_text,
      banner_button_secondary_link: settings.banner_button_secondary_link,
      banner_background_url: settings.banner_background_url,
      banner_show_stats_card: settings.banner_show_stats_card,
      logo_text: settings.logo_text,
      logo_image_url: settings.logo_image_url,
      logo_horizontal_url: settings.logo_horizontal_url,
      logo_display_mode: settings.logo_display_mode,
      favicon_url: settings.favicon_url,
      page_title: settings.page_title,
      gradient_start_color: settings.gradient_start_color,
      gradient_end_color: settings.gradient_end_color,
      certificate_signature_url: settings.certificate_signature_url ?? null,
      certificate_instructor_name: settings.certificate_instructor_name ?? '',
      login_background_url: settings.login_background_url,
      login_overlay_opacity: settings.login_overlay_opacity ?? 50,
    });
  }, [settings]);

  const handleBannerImageUpload = async (file: File) => {
    const url = await uploadAsset(file, 'banner');
    setFormData(prev => ({ ...prev, banner_background_url: url }));
    return url;
  };

  const handleLogoImageUpload = async (file: File) => {
    const url = await uploadAsset(file, 'logo-icon');
    setFormData(prev => ({ ...prev, logo_image_url: url }));
    return url;
  };

  const handleLogoHorizontalUpload = async (file: File) => {
    const url = await uploadAsset(file, 'logo-horizontal');
    setFormData(prev => ({ ...prev, logo_horizontal_url: url }));
    return url;
  };

  const handleFaviconUpload = async (file: File) => {
    const url = await uploadAsset(file, 'favicon');
    setFormData(prev => ({ ...prev, favicon_url: url }));
    return url;
  };

  const handleLoginBackgroundUpload = async (file: File) => {
    const url = await uploadAsset(file, 'login-background');
    setFormData(prev => ({ ...prev, login_background_url: url }));
    return url;
  };

  const handleSave = async () => {
    try {
      await updateSettings(formData);
    } catch {
      // O hook já exibe o toast de erro.
    }
  };

  const handleReset = () => {
    setFormData({
      banner_badge_text: '✨ Nova Experiência de Aprendizado',
      banner_title_line1: 'Inspire-se,',
      banner_title_line2: 'Aprenda,',
      banner_title_line3: 'Cresça.',
      banner_subtitle: 'Acesse cursos premium, aprenda no seu ritmo e transforme seu conhecimento em resultados reais.',
      banner_button_primary_text: 'Explorar Cursos',
      banner_button_primary_link: '/dashboard',
      banner_button_secondary_text: 'Meu Progresso',
      banner_button_secondary_link: '/perfil',
      banner_background_url: null,
      banner_show_stats_card: false,
      logo_text: 'EduStream',
      logo_image_url: null,
      logo_horizontal_url: null,
      logo_display_mode: 'icon_text',
      favicon_url: null,
      page_title: 'EduStream',
      gradient_start_color: '#FF4136',
      gradient_end_color: '#FF851B',
      certificate_signature_url: null,
      certificate_instructor_name: 'Diretoria Executiva',
      login_background_url: null,
      login_overlay_opacity: 50,
    });
    toast.info("Configurações resetadas localmente. Clique em salvar para aplicar.");
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <div className="space-y-6">
      <motion.div variants={itemVariants}>
        <Alert className="glass-card border-primary/20 bg-primary/5 rounded-[16px] py-4">
          <Info className="h-5 w-5 text-primary" />
          <AlertDescription className="text-[14px] text-primary/80 font-medium ml-2">
            As mudanças de branding são aplicadas globalmente para todos os alunos da plataforma.
          </AlertDescription>
        </Alert>
      </motion.div>

      {/* Banner Hero Studio */}
      <motion.div variants={itemVariants}>
        <Card className="glass-card border-white/10 rounded-[16px] overflow-hidden">
          <CardHeader className="p-8 border-b border-white/5 bg-white/[0.02]">
            <div className="flex items-center gap-4">
               <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20">
                  <Monitor className="w-6 h-6 text-primary shadow-glow-sm" />
               </div>
               <div>
                  <CardTitle className="text-[20px] font-bold text-white tracking-tight">Banner Principal (Hero)</CardTitle>
                  <CardDescription className="text-[14px] text-muted-foreground/40 font-medium">Configure a primeira impressão dos seus alunos.</CardDescription>
               </div>
            </div>
          </CardHeader>
          <CardContent className="p-8 space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div>
                  <Label className="text-[13px] font-bold text-muted-foreground/40 uppercase tracking-widest block mb-2.5">Texto do Badge</Label>
                  <div className="relative">
                    <Send className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/20" />
                    <Input
                      id="badge"
                      value={formData.banner_badge_text}
                      onChange={(e) => setFormData({ ...formData, banner_badge_text: e.target.value })}
                      placeholder="✨ Nova Experiência de Aprendizado"
                      className="glass-card border-white/10 h-[44px] pl-12 rounded-[12px] focus:border-primary/50 text-[14px]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-[13px] font-bold text-muted-foreground/40 uppercase tracking-widest block mb-2.5">Linha 1</Label>
                    <Input
                      id="title1"
                      value={formData.banner_title_line1}
                      onChange={(e) => setFormData({ ...formData, banner_title_line1: e.target.value })}
                      className="glass-card border-white/10 h-[44px] rounded-[12px] focus:border-primary/50 text-[14px]"
                    />
                  </div>
                  <div>
                    <Label className="text-[13px] font-bold text-muted-foreground/40 uppercase tracking-widest block mb-2.5">Linha 2</Label>
                    <Input
                      id="title2"
                      value={formData.banner_title_line2}
                      onChange={(e) => setFormData({ ...formData, banner_title_line2: e.target.value })}
                      className="glass-card border-white/10 h-[44px] rounded-[12px] focus:border-primary/50 text-[14px]"
                    />
                  </div>
                  <div>
                    <Label className="text-[13px] font-bold text-muted-foreground/40 uppercase tracking-widest block mb-2.5 pl-1">Linha 3 (Destaque)</Label>
                    <Input
                      id="title3"
                      value={formData.banner_title_line3}
                      onChange={(e) => setFormData({ ...formData, banner_title_line3: e.target.value })}
                      className="glass-card border-primary/20 bg-primary/5 h-[44px] rounded-[12px] focus:border-primary/50 text-[14px] font-bold text-primary"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-[13px] font-bold text-muted-foreground/40 uppercase tracking-widest block mb-2.5">Subtítulo</Label>
                  <Textarea
                    id="subtitle"
                    value={formData.banner_subtitle}
                    onChange={(e) => setFormData({ ...formData, banner_subtitle: e.target.value })}
                    rows={4}
                    className="glass-card border-white/10 rounded-[12px] focus:border-primary/50 text-[14px] resize-none p-4 leading-relaxed min-h-[100px]"
                  />
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <Label className="text-[13px] font-bold text-muted-foreground/40 uppercase tracking-widest block mb-4 pr-2">Configuração dos Botões</Label>
                  <div className="p-6 glass-card border-white/5 rounded-[12px] bg-white/[0.01] space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                       <div className="space-y-2.5">
                          <Label className="text-[11px] font-black text-white/20 uppercase tracking-tighter">Botão Primário</Label>
                          <Input
                            id="btn1"
                            value={formData.banner_button_primary_text}
                            onChange={(e) => setFormData({ ...formData, banner_button_primary_text: e.target.value })}
                            placeholder="Texto"
                            className="bg-black/20 border-white/10 h-[44px] rounded-[12px] text-[13px]"
                          />
                          <div className="relative">
                            <Link className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground/20" />
                            <Input
                              value={formData.banner_button_primary_link}
                              onChange={(e) => setFormData({ ...formData, banner_button_primary_link: e.target.value })}
                              placeholder="/link"
                              className="bg-black/20 border-white/10 h-[44px] pl-8 rounded-[12px] text-[13px] font-mono"
                            />
                          </div>
                       </div>
                       <div className="space-y-2.5">
                          <Label className="text-[11px] font-black text-white/20 uppercase tracking-tighter">Botão Secundário</Label>
                          <Input
                            id="btn2"
                            value={formData.banner_button_secondary_text}
                            onChange={(e) => setFormData({ ...formData, banner_button_secondary_text: e.target.value })}
                            placeholder="Texto"
                            className="bg-black/20 border-white/10 h-[44px] rounded-[12px] text-[13px]"
                          />
                          <div className="relative">
                            <Link className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground/20" />
                            <Input
                              value={formData.banner_button_secondary_link}
                              onChange={(e) => setFormData({ ...formData, banner_button_secondary_link: e.target.value })}
                              placeholder="/link"
                              className="bg-black/20 border-white/10 h-[44px] pl-8 rounded-[12px] text-[13px] font-mono"
                            />
                          </div>
                       </div>
                    </div>
                  </div>
                </div>

                <div>
                   <Label className="text-[13px] font-bold text-muted-foreground/40 uppercase tracking-widest block mb-4">Mídia de Fundo</Label>
                   <ImageUploadField
                    label=""
                    currentImageUrl={formData.banner_background_url}
                    onImageUpload={handleBannerImageUpload}
                    onImageRemove={() => setFormData({ ...formData, banner_background_url: null })}
                    aspectRatio="21/9"
                    maxSizeMB={5}
                  />
                </div>

                <div className="flex items-center justify-between p-4 glass-card border-white/5 rounded-[12px] bg-white/[0.01]">
                  <div className="flex items-center gap-3">
                    <LayoutIcon className="w-5 h-5 text-muted-foreground/30" />
                    <Label htmlFor="stats-card" className="cursor-pointer text-[14px] font-bold text-white/60">
                      Mostrar card de estatísticas
                    </Label>
                  </div>
                  <Switch
                    id="stats-card"
                    checked={formData.banner_show_stats_card}
                    onCheckedChange={(checked) => setFormData({ ...formData, banner_show_stats_card: checked })}
                    className="data-[state=checked]:bg-primary"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Identidade Visual - Logo & Favicon */}
      <motion.div variants={itemVariants}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="glass-card border-white/10 rounded-[16px]">
            <CardHeader className="p-8 border-b border-white/5">
               <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20">
                     <ImageIcon className="w-6 h-6 text-primary shadow-glow-sm" />
                  </div>
                  <div>
                     <CardTitle className="text-[20px] font-bold text-white tracking-tight">Logotipo</CardTitle>
                     <CardDescription className="text-[14px] text-muted-foreground/40 font-medium">A marca principal da sua escola.</CardDescription>
                  </div>
               </div>
            </CardHeader>
            <CardContent className="p-8 space-y-8">
              <div className="space-y-4">
                <Label className="text-[13px] font-bold text-muted-foreground/40 uppercase tracking-widest block mb-4">Modo de Exibição na Navbar</Label>
                <RadioGroup
                  value={formData.logo_display_mode}
                  onValueChange={(value: 'icon_text' | 'horizontal') =>
                    setFormData({ ...formData, logo_display_mode: value })
                  }
                  className="grid grid-cols-2 gap-4"
                >
                  <div 
                    onClick={() => setFormData({ ...formData, logo_display_mode: 'icon_text' })}
                    className={`flex items-center gap-3 p-4 rounded-[12px] border cursor-pointer transition-all ${formData.logo_display_mode === 'icon_text' ? 'border-primary bg-primary/5 shadow-glow-sm' : 'border-white/5 bg-white/[0.02] hover:bg-white/[0.05]'}`}
                  >
                    <RadioGroupItem value="icon_text" id="icon_text" className="hidden" />
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${formData.logo_display_mode === 'icon_text' ? 'border-primary' : 'border-white/20'}`}>
                       {formData.logo_display_mode === 'icon_text' && <div className="w-2 h-2 rounded-full bg-primary" />}
                    </div>
                    <span className="text-[14px] font-bold text-white">Ícone + Texto</span>
                  </div>
                  
                  <div 
                    onClick={() => setFormData({ ...formData, logo_display_mode: 'horizontal' })}
                    className={`flex items-center gap-3 p-4 rounded-[12px] border cursor-pointer transition-all ${formData.logo_display_mode === 'horizontal' ? 'border-primary bg-primary/5 shadow-glow-sm' : 'border-white/5 bg-white/[0.02] hover:bg-white/[0.05]'}`}
                  >
                    <RadioGroupItem value="horizontal" id="horizontal" className="hidden" />
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${formData.logo_display_mode === 'horizontal' ? 'border-primary' : 'border-white/20'}`}>
                       {formData.logo_display_mode === 'horizontal' && <div className="w-2 h-2 rounded-full bg-primary" />}
                    </div>
                    <span className="text-[14px] font-bold text-white">Logo Horizontal</span>
                  </div>
                </RadioGroup>
              </div>

              <div className="p-6 rounded-[12px] bg-white/[0.01] border border-white/5 space-y-6">
                {formData.logo_display_mode === 'icon_text' ? (
                  <>
                    <div>
                      <Label className="text-[13px] font-bold text-muted-foreground/30 uppercase tracking-widest block mb-2.5">Nome da Plataforma</Label>
                      <Input
                        id="logo-text"
                        value={formData.logo_text}
                        onChange={(e) => setFormData({ ...formData, logo_text: e.target.value })}
                        placeholder="Nome da sua escola"
                        className="bg-black/20 border-white/10 h-[44px] rounded-[12px] text-[14px] font-bold"
                      />
                    </div>

                    <ImageUploadField
                      label="Ícone da Logo (1:1)"
                      description="Aparece ao lado do nome"
                      currentImageUrl={formData.logo_image_url}
                      onImageUpload={handleLogoImageUpload}
                      onImageRemove={() => setFormData({ ...formData, logo_image_url: null })}
                      aspectRatio="1/1"
                      maxSizeMB={1}
                      maxPreviewWidth="100px"
                    />
                  </>
                ) : (
                  <ImageUploadField
                    label="Logo Horizontal (Full)"
                    description="Substitui o ícone + texto"
                    currentImageUrl={formData.logo_horizontal_url}
                    onImageUpload={handleLogoHorizontalUpload}
                    onImageRemove={() => setFormData({ ...formData, logo_horizontal_url: null })}
                    aspectRatio="4/1"
                    maxSizeMB={2}
                    maxPreviewWidth="260px"
                  />
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card border-white/10 rounded-[16px] h-full">
             <CardHeader className="p-8 border-b border-white/5">
                <div className="flex items-center gap-4">
                   <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary/10 border border-white/10">
                      <LayoutIcon className="w-6 h-6 text-white/60" />
                   </div>
                   <div>
                      <CardTitle className="text-[20px] font-bold text-white tracking-tight">Presença Digital</CardTitle>
                      <CardDescription className="text-[14px] text-muted-foreground/40 font-medium">Configure como você aparece no navegador.</CardDescription>
                   </div>
                </div>
             </CardHeader>
             <CardContent className="p-8 space-y-8">
                <div>
                  <Label className="text-[13px] font-bold text-muted-foreground/30 uppercase tracking-widest block mb-2.5 pl-1">Título do Navegador</Label>
                  <Input
                    id="page-title"
                    value={formData.page_title}
                    onChange={(e) => setFormData({ ...formData, page_title: e.target.value })}
                    placeholder="Ex: Nome da Escola - Dashboard"
                    className="glass-card border-white/10 h-[44px] rounded-[12px] focus:border-primary/50 text-[14px] font-medium"
                  />
                  <p className="text-[11px] text-muted-foreground/20 mt-2 font-mono uppercase tracking-tighter">Este texto aparece no topo da aba do browser.</p>
                </div>

                <div className="p-6 rounded-[12px] bg-white/[0.01] border border-white/5">
                  <ImageUploadField
                    label="Favicon (Ícone da Aba)"
                    description="Imagem quadrada 32x32px recomendada."
                    currentImageUrl={formData.favicon_url}
                    onImageUpload={handleFaviconUpload}
                    onImageRemove={() => setFormData({ ...formData, favicon_url: null })}
                    aspectRatio="1/1"
                    maxSizeMB={0.5}
                    maxPreviewWidth="80px"
                  />
                </div>
             </CardContent>
          </Card>
        </div>
      </motion.div>

      {/* Gradientes & Estética */}
      <motion.div variants={itemVariants}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <Card className="lg:col-span-2 glass-card border-white/10 rounded-[16px]">
             <CardHeader className="p-8 border-b border-white/5">
                <div className="flex items-center gap-4">
                   <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500/10 border border-orange-500/20">
                      <Palette className="w-6 h-6 text-orange-500 shadow-glow-sm" />
                   </div>
                   <div>
                      <CardTitle className="text-[20px] font-bold text-white tracking-tight">Gradiente de Texto</CardTitle>
                      <CardDescription className="text-[14px] text-muted-foreground/40 font-medium">Personalize as cores de destaque visual.</CardDescription>
                   </div>
                </div>
             </CardHeader>
             <CardContent className="p-8 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <Label className="text-[13px] font-bold text-muted-foreground/30 uppercase tracking-widest block mb-2.5">Cor Inicial</Label>
                    <div className="flex gap-3">
                      <div className="relative group overflow-hidden rounded-[12px] flex-shrink-0">
                         <Input
                           type="color"
                           value={formData.gradient_start_color}
                           onChange={(e) => setFormData({ ...formData, gradient_start_color: e.target.value })}
                           className="w-14 h-11 p-0 border-0 cursor-pointer bg-transparent"
                         />
                         <div className="absolute inset-0 pointer-events-none border border-white/10 rounded-[12px]" />
                      </div>
                      <Input
                        type="text"
                        value={formData.gradient_start_color}
                        onChange={(e) => setFormData({ ...formData, gradient_start_color: e.target.value })}
                        placeholder="#FF4136"
                        className="glass-card border-white/10 h-[44px] rounded-[12px] font-mono text-[14px]"
                      />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <Label className="text-[13px] font-bold text-muted-foreground/30 uppercase tracking-widest block mb-2.5">Cor Final</Label>
                    <div className="flex gap-3">
                      <div className="relative group overflow-hidden rounded-[12px] flex-shrink-0">
                         <Input
                           type="color"
                           value={formData.gradient_end_color}
                           onChange={(e) => setFormData({ ...formData, gradient_end_color: e.target.value })}
                           className="w-14 h-11 p-0 border-0 cursor-pointer bg-transparent"
                         />
                         <div className="absolute inset-0 pointer-events-none border border-white/10 rounded-[12px]" />
                      </div>
                      <Input
                        type="text"
                        value={formData.gradient_end_color}
                        onChange={(e) => setFormData({ ...formData, gradient_end_color: e.target.value })}
                        placeholder="#FF851B"
                        className="glass-card border-white/10 h-[44px] rounded-[12px] font-mono text-[14px]"
                      />
                    </div>
                  </div>
                </div>

                <div className="p-10 rounded-[24px] glass-card border-white/10 relative overflow-hidden flex items-center justify-center text-center">
                   <div className="absolute inset-0 bg-gradient-to-tr from-black/20 to-transparent pointer-events-none" />
                   <div className="relative z-10">
                      <p className="text-[11px] font-black text-white/20 uppercase tracking-widest mb-4">Preview do Gradiente</p>
                      <h2 
                        className="text-4xl sm:text-5xl font-black italic tracking-tighter"
                        style={{ 
                          background: `linear-gradient(to right, ${formData.gradient_start_color}, ${formData.gradient_end_color})`,
                          WebkitBackgroundClip: 'text',
                          WebkitTextFillColor: 'transparent'
                        }}
                      >
                        {formData.logo_text || "FLOW MEMBERS"}
                      </h2>
                   </div>
                </div>
             </CardContent>
          </Card>

          <Card className="glass-card border-white/10 rounded-[16px]">
             <CardHeader className="p-8 border-b border-white/5">
                <div className="flex items-center gap-4">
                   <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-500/10 border border-purple-500/20">
                      <Heart className="w-6 h-6 text-purple-500 shadow-glow-sm" />
                   </div>
                   <div>
                      <CardTitle className="text-[20px] font-bold text-white tracking-tight">Tela de Login</CardTitle>
                      <CardDescription className="text-[14px] text-muted-foreground/40 font-medium">Branding fora da plataforma.</CardDescription>
                   </div>
                </div>
             </CardHeader>
             <CardContent className="p-8 space-y-8">
                <ImageUploadField
                  label="Wallpaper de Login"
                  currentImageUrl={formData.login_background_url}
                  onImageUpload={handleLoginBackgroundUpload}
                  onImageRemove={() => setFormData({ ...formData, login_background_url: null })}
                  aspectRatio="16/9"
                  maxSizeMB={5}
                />

                {formData.login_background_url && (
                  <div className="space-y-4 p-5 glass-card border-white/5 rounded-[12px] bg-white/[0.01]">
                    <div className="flex items-center justify-between">
                      <Label className="text-[13px] font-bold text-white/60">Overlay Escuro</Label>
                      <span className="text-[12px] font-black text-primary font-mono bg-primary/10 px-2 py-0.5 rounded-md">
                        {formData.login_overlay_opacity}%
                      </span>
                    </div>
                    <Slider
                      min={0}
                      max={100}
                      step={5}
                      value={[formData.login_overlay_opacity ?? 50]}
                      onValueChange={(value) =>
                        setFormData({ ...formData, login_overlay_opacity: value[0] })
                      }
                      className="cursor-pointer"
                    />
                  </div>
                )}
              </CardContent>
           </Card>
        </div>
      </motion.div>

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
          Salvar Branding
        </Button>
      </div>
    </div>
  );
};
