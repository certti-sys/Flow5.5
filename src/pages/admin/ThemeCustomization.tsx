import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, Palette, Save, RotateCcw, Loader2, Check, Copy, Image as ImageIcon, Layout as LayoutIcon } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { generatePalette, ColorPalette, resetThemeToDefault, hslToHex, getContrastColor } from "@/lib/colorGenerator";
import { useTheme } from "@/hooks/useTheme";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { BrandingCustomization } from "@/components/admin/BrandingCustomization";
import { LayoutCustomization } from "@/components/admin/LayoutCustomization";
import { motion } from "framer-motion";
import { toast } from "sonner";

export default function ThemeCustomization() {
  const [selectedColor, setSelectedColor] = useState("#ea384c");
  const [generatedPalette, setGeneratedPalette] = useState<ColorPalette | null>(null);
  const [copiedColor, setCopiedColor] = useState<string | null>(null);
  const { activeTheme, applyPreview, saveTheme, isSaving } = useTheme();

  // Generate initial palette
  useEffect(() => {
    if (activeTheme?.primary_color) {
      setSelectedColor(activeTheme.primary_color);
      setGeneratedPalette(activeTheme.color_palette);
    } else {
      handleGeneratePalette("#ea384c");
    }
  }, [activeTheme]);

  const handleGeneratePalette = (color: string) => {
    if (!color || color.length < 7) return;

    try {
      const palette = generatePalette(color);
      setGeneratedPalette(palette);
    } catch (error) {
      console.error("Error generating palette:", error);
    }
  };

  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const color = e.target.value;
    setSelectedColor(color);
    handleGeneratePalette(color);
  };

  const handleApplyPreview = () => {
    if (generatedPalette) {
      applyPreview(generatedPalette);
      toast.success("Preview aplicado temporariamente!");
    }
  };

  const handleSaveTheme = () => {
    if (generatedPalette) {
      saveTheme({
        primaryColor: selectedColor,
        colorPalette: generatedPalette,
      });
    }
  };

  const handleResetToDefault = () => {
    setSelectedColor("#ea384c");
    handleGeneratePalette("#ea384c");
    resetThemeToDefault();
    toast.info("Cores resetadas para o padrão.");
  };

  const copyToClipboard = (hex: string) => {
    navigator.clipboard.writeText(`#${hex}`);
    setCopiedColor(hex);
    toast.success(`Cor #${hex} copiada!`);
    setTimeout(() => setCopiedColor(null), 2000);
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6 pb-20"
    >
      {/* Header */}
      <AdminHeader
        title="Personalização"
        description="Personalize cores, branding e identidade visual da sua plataforma para transformá-la em uma experiência única."
        showSearch={false}
      />

      <Tabs defaultValue="colors" className="w-full">
        <div className="glass-card border border-white/10 rounded-[16px] p-[6px] mb-6">
          <TabsList className="!flex w-full overflow-x-auto scrollbar-none bg-transparent gap-1">
            <TabsTrigger 
              value="colors" 
              className="flex-shrink-0 text-[11px] uppercase tracking-widest font-bold gap-1.5 px-4 py-2.5 rounded-[10px] transition-all data-[state=active]:bg-white/10 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=inactive]:text-white/40"
            >
              <Palette className="h-3.5 w-3.5" /> Cores do Tema
            </TabsTrigger>
            <TabsTrigger 
              value="branding" 
              className="flex-shrink-0 text-[11px] uppercase tracking-widest font-bold gap-1.5 px-4 py-2.5 rounded-[10px] transition-all data-[state=active]:bg-white/10 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=inactive]:text-white/40"
            >
              <ImageIcon className="h-3.5 w-3.5" /> Branding
            </TabsTrigger>
            <TabsTrigger 
              value="layout" 
              className="flex-shrink-0 text-[11px] uppercase tracking-widest font-bold gap-1.5 px-4 py-2.5 rounded-[10px] transition-all data-[state=active]:bg-white/10 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=inactive]:text-white/40"
            >
              <LayoutIcon className="h-3.5 w-3.5" /> Layout
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="colors" className="space-y-6 mt-0 focus-visible:outline-none outline-none">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Color Picker Section - Bento Left */}
              <Card className="lg:col-span-4 glass-card border-white/10 p-6 flex flex-col gap-6 rounded-[12px]">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-primary/10 border border-primary/20">
                    <Palette className="w-5 h-5 text-primary shadow-glow-sm" />
                  </div>
                  <h2 className="text-[18px] font-bold text-white">Cor Primária</h2>
                </div>

                <div className="space-y-6">
                  <div className="space-y-3">
                    <Label className="text-[13px] font-bold text-muted-foreground/50 uppercase tracking-widest pl-1">HEX Code</Label>
                    <div className="flex gap-3">
                      <Input
                        type="text"
                        value={selectedColor}
                        onChange={handleColorChange}
                        placeholder="#EA384C"
                        className="font-mono glass-card border-white/10 h-[44px] rounded-[12px] focus:border-primary/50 text-[14px]"
                      />
                      <div className="relative group overflow-hidden rounded-[12px]">
                        <Input
                          type="color"
                          value={selectedColor}
                          onChange={handleColorChange}
                          className="w-14 h-[44px] p-0 border-0 cursor-pointer bg-transparent"
                        />
                        <div className="absolute inset-0 pointer-events-none border border-white/10 rounded-[12px]" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-[13px] font-bold text-muted-foreground/50 uppercase tracking-widest pl-1">Live Preview</Label>
                    <div
                      className="h-28 rounded-[16px] border-2 border-white/10 shadow-glow transition-all relative overflow-hidden"
                      style={{ backgroundColor: selectedColor }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-tr from-black/20 to-transparent pointer-events-none" />
                    </div>
                  </div>
                </div>
              </Card>

              {/* Generated Palette - Bento Right Top */}
              <Card className="lg:col-span-8 glass-card border-white/10 p-6 flex flex-col gap-6 rounded-[20px]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-primary/10 border border-primary/20">
                      <Palette className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h2 className="text-[18px] font-bold text-white leading-none">Paleta Gerada</h2>
                      <p className="text-[12px] text-muted-foreground/40 mt-1">Geração automática de tons baseada na sua cor</p>
                    </div>
                  </div>
                </div>

                {generatedPalette && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-11 gap-3">
                    {Object.entries(generatedPalette).map(([shade, hslValue]) => {
                      const hexCode = hslToHex(hslValue);
                      const textColor = getContrastColor(hslValue);
                      const isCopied = copiedColor === hexCode;

                      return (
                        <motion.div
                          key={shade}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          className="flex flex-col items-center group cursor-pointer"
                          onClick={() => copyToClipboard(hexCode)}
                        >
                          <div
                            className="w-full aspect-square rounded-xl flex items-center justify-center text-[13px] font-bold shadow-lg border border-white/10 relative overflow-hidden group-hover:shadow-glow-sm transition-all"
                            style={{ backgroundColor: `hsl(${hslValue})`, color: textColor }}
                          >
                            <div className="absolute inset-0 bg-gradient-to-tr from-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                            {isCopied ? <Check className="w-4 h-4" /> : shade}
                          </div>
                          <span className="text-[11px] font-mono font-medium text-muted-foreground/50 mt-2 flex items-center gap-1">
                            {hexCode}
                            <Copy className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </span>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </Card>
            </div>

            {/* Component Preview - Full Width Bento */}
            <div>
              <Card className="glass-card border-white/10 p-8 flex flex-col gap-8 rounded-[24px] relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 blur-[80px] -z-10" />
                
                <div className="flex flex-col gap-1">
                  <h2 className="text-[20px] font-bold text-white tracking-tight">Preview Studio</h2>
                  <p className="text-[14px] text-muted-foreground/50">Veja como suas novas cores se comportam em elementos reais da interface.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                  {/* Interactive Elements */}
                  <div className="space-y-6">
                    <div>
                      <Label className="text-[12px] font-bold text-muted-foreground/30 uppercase tracking-widest block mb-4">Interatividade</Label>
                      <div className="flex flex-wrap gap-3">
                        <Button className="gradient-primary shadow-glow h-[44px] px-6 rounded-[12px] font-bold text-[13px]">Principal</Button>
                        <Button variant="outline" className="glass-card border-white/10 hover:bg-white/5 h-[44px] px-6 rounded-[12px] font-bold text-[13px]">Outline</Button>
                        <Button variant="secondary" className="bg-white/5 hover:bg-white/10 h-[44px] px-6 rounded-[12px] font-bold border-0 text-[13px]">Acessório</Button>
                      </div>
                    </div>
                    
                    <Separator className="bg-white/5" />

                    <div>
                      <Label className="text-[12px] font-bold text-muted-foreground/30 uppercase tracking-widest block mb-4">Sinalização</Label>
                      <div className="flex flex-wrap gap-2">
                        <Badge className="bg-primary/10 text-primary border-primary/20 px-3 py-1 rounded-full font-bold">Premium</Badge>
                        <Badge className="bg-white/5 text-muted-foreground border-white/10 px-3 py-1 rounded-full font-bold">Destaque</Badge>
                        <Badge className="gradient-primary text-white border-0 px-3 py-1 rounded-full font-bold shadow-glow-sm">Hot</Badge>
                      </div>
                    </div>
                  </div>

                  {/* Sandbox Card */}
                  <div className="lg:col-span-2">
                    <Label className="text-[12px] font-bold text-muted-foreground/30 uppercase tracking-widest block mb-4">Card de Prateleira</Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <Card className="glass-card border-white/10 p-0 rounded-[20px] overflow-hidden group cursor-pointer hover:border-primary/30 transition-all">
                        <div className="aspect-video bg-black/40 flex items-center justify-center relative">
                           <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                           <Palette className="w-10 h-10 text-white/10 group-hover:text-primary/20 transition-colors" />
                        </div>
                        <div className="p-5 space-y-3">
                          <Badge className="bg-primary/20 text-primary border-0 rounded-md text-[10px] font-black uppercase">Design System</Badge>
                          <h3 className="text-[17px] font-bold text-white tracking-tight group-hover:text-primary transition-colors">
                            Laboratório de Cores
                          </h3>
                          <p className="text-[13px] text-muted-foreground/60 leading-relaxed line-clamp-2">
                            Entenda como a percepção visual afeta o engajamento dos seus alunos na plataforma.
                          </p>
                          <div className="pt-2 flex items-center justify-between">
                             <div className="flex items-center gap-1.5">
                               <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                                  <div className="w-2.5 h-2.5 rounded-full bg-primary shadow-glow-sm" />
                               </div>
                               <span className="text-[11px] font-bold text-muted-foreground/80 uppercase">Ativo</span>
                             </div>
                             <Button size="sm" className="h-8 rounded-[8px] text-[11px] px-4 font-black">EDITAR</Button>
                          </div>
                        </div>
                      </Card>

                      <div className="p-6 rounded-[20px] bg-primary/5 border border-primary/20 border-dashed flex flex-col items-center justify-center text-center gap-3">
                         <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                            <AlertCircle className="w-6 h-6" />
                         </div>
                         <h4 className="text-[15px] font-bold text-white">Sobre a Visualização</h4>
                         <p className="text-[13px] text-muted-foreground/50 px-4">
                           Esta área é apenas um simulador para garantir que a acessibilidade e contraste estejam perfeitos antes de publicar.
                         </p>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </div>

            {/* Action Bar */}
            <div className="relative z-20 flex flex-wrap justify-end gap-3 mt-6">
              <Button
                variant="outline"
                onClick={handleResetToDefault}
                className="h-[44px] px-6 rounded-[12px] text-[14px] font-bold glass-card hover:bg-white/5 border-white/10"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Padrão
              </Button>
              <Button
                variant="secondary"
                onClick={handleApplyPreview}
                disabled={!generatedPalette}
                className="h-[44px] px-6 rounded-[12px] text-[14px] font-bold bg-white/5 hover:bg-white/10 border border-white/5"
              >
                Visualizar
              </Button>
              <Button
                onClick={handleSaveTheme}
                disabled={!generatedPalette || isSaving}
                className="h-[44px] px-8 rounded-[12px] text-[14px] font-bold gradient-primary shadow-glow hover:scale-105 transition-all min-w-[140px]"
              >
                {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Salvar
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="branding" className="mt-0 focus-visible:outline-none outline-none">
            <div>
              <BrandingCustomization />
            </div>
          </TabsContent>

          <TabsContent value="layout" className="mt-0 focus-visible:outline-none outline-none">
            <div>
              <LayoutCustomization />
            </div>
          </TabsContent>
      </Tabs>
    </motion.div>
  );
}
