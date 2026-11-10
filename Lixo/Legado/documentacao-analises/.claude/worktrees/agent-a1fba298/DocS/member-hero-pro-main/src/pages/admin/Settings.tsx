import { useState, useRef } from "react";
import { Settings as SettingsIcon, Palette, Globe, Plug, Shield, Upload, RotateCcw, Download, Upload as ImportIcon, Bell, AlertTriangle } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useSupabaseSettings } from "@/hooks/useSupabaseSettings";
import { useNotificationSettings } from "@/hooks/useNotificationSettings";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";

export default function Settings() {
  const { settings, updateSettings, resetToDefaults, exportSettings, importSettings, DEFAULT_SETTINGS, isLoading } = useSupabaseSettings();
  const { settings: notificationSettings, updateSettings: updateNotificationSettings, isLoading: isLoadingNotifications } = useNotificationSettings();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  const platforms = [
    { id: 'hotmart', label: 'Hotmart' },
    { id: 'kiwify', label: 'Kiwify' },
    { id: 'monetizze', label: 'Monetizze' },
    { id: 'eduzz', label: 'Eduzz' },
    { id: 'bripe', label: 'Bripe' },
  ];

  const handlePlatformToggle = (platformId: string) => {
    if (!notificationSettings) return;
    const currentPlatforms = notificationSettings.platforms_to_monitor || [];
    const newPlatforms = currentPlatforms.includes(platformId)
      ? currentPlatforms.filter(p => p !== platformId)
      : [...currentPlatforms, platformId];
    updateNotificationSettings({ platforms_to_monitor: newPlatforms });
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        updateSettings({ logo: reader.result as string });
        toast({ title: "Logo atualizado", description: "O logo foi carregado com sucesso." });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFaviconUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        updateSettings({ favicon: reader.result as string });
        toast({ title: "Favicon atualizado", description: "O favicon foi carregado com sucesso." });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleExport = () => {
    const json = exportSettings();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'memberhero-settings.json';
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Exportado", description: "Configurações exportadas com sucesso." });
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const success = importSettings(reader.result as string);
        if (success) {
          toast({ title: "Importado", description: "Configurações importadas com sucesso." });
        } else {
          toast({ title: "Erro", description: "Arquivo de configuração inválido.", variant: "destructive" });
        }
      };
      reader.readAsText(file);
    }
  };

  const handleResetColors = () => {
    updateSettings({
      primaryColor: DEFAULT_SETTINGS.primaryColor,
      backgroundColor: DEFAULT_SETTINGS.backgroundColor,
      surfaceColor: DEFAULT_SETTINGS.surfaceColor,
      textColor: DEFAULT_SETTINGS.textColor,
    });
    toast({ title: "Cores restauradas", description: "As cores foram restauradas para o padrão." });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2 md:gap-3">
          <SettingsIcon className="h-6 w-6 md:h-8 md:w-8 text-primary shrink-0" />
          Configurações da Plataforma
        </h1>
        <p className="text-muted-foreground mt-1 text-sm md:text-base">
          Personalize a aparência e comportamento da sua área de membros
        </p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="visual" className="space-y-6">
        <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0 scrollbar-hide">
          <TabsList className="bg-card/50 border border-border/50 p-1 w-max md:w-auto inline-flex">
            <TabsTrigger 
              value="visual" 
              className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary whitespace-nowrap min-h-[44px] px-3 md:px-4 text-sm"
            >
              <Upload className="h-4 w-4 mr-1.5 md:mr-2 shrink-0" />
              Identidade Visual
            </TabsTrigger>
            <TabsTrigger 
              value="colors" 
              className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary whitespace-nowrap min-h-[44px] px-3 md:px-4 text-sm"
            >
              <Palette className="h-4 w-4 mr-1.5 md:mr-2 shrink-0" />
              Cores
            </TabsTrigger>
            <TabsTrigger 
              value="general" 
              className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary whitespace-nowrap min-h-[44px] px-3 md:px-4 text-sm"
            >
              <Globe className="h-4 w-4 mr-1.5 md:mr-2 shrink-0" />
              Geral
            </TabsTrigger>
            <TabsTrigger 
              value="integrations" 
              className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary whitespace-nowrap min-h-[44px] px-3 md:px-4 text-sm"
            >
              <Plug className="h-4 w-4 mr-1.5 md:mr-2 shrink-0" />
              Integrações
            </TabsTrigger>
            <TabsTrigger 
              value="notifications" 
              className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary whitespace-nowrap min-h-[44px] px-3 md:px-4 text-sm"
            >
              <Bell className="h-4 w-4 mr-1.5 md:mr-2 shrink-0" />
              Notificações
            </TabsTrigger>
            <TabsTrigger 
              value="advanced" 
              className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary whitespace-nowrap min-h-[44px] px-3 md:px-4 text-sm"
            >
              <Shield className="h-4 w-4 mr-1.5 md:mr-2 shrink-0" />
              Avançado
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Tab: Identidade Visual */}
        <TabsContent value="visual">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="glass-card border-border/50">
              <CardHeader>
                <CardTitle>Logo da Plataforma</CardTitle>
                <CardDescription>Faça upload do logo que aparecerá no sidebar e área do aluno</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div 
                  className="border-2 border-dashed border-border/50 rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {settings.logo ? (
                    <img src={settings.logo} alt="Logo" className="max-h-24 mx-auto" />
                  ) : (
                    <div className="space-y-2">
                      <Upload className="h-10 w-10 mx-auto text-muted-foreground" />
                      <p className="text-muted-foreground">Clique para fazer upload</p>
                      <p className="text-xs text-muted-foreground">PNG, JPG ou SVG (max 2MB)</p>
                    </div>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleLogoUpload}
                />
                {settings.logo && (
                  <Button variant="outline" size="sm" onClick={() => updateSettings({ logo: null })}>
                    Remover Logo
                  </Button>
                )}
              </CardContent>
            </Card>

            <Card className="glass-card border-border/50">
              <CardHeader>
                <CardTitle>Informações da Plataforma</CardTitle>
                <CardDescription>Configure o nome e favicon da sua plataforma</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="platformName">Nome da Plataforma</Label>
                  <Input
                    id="platformName"
                    value={settings.platformName}
                    onChange={(e) => updateSettings({ platformName: e.target.value })}
                    placeholder="MemberHero"
                    className="bg-background/50 border-border/50 focus:border-primary"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Favicon</Label>
                  <div className="flex items-center gap-4">
                    <div 
                      className="w-16 h-16 border-2 border-dashed border-border/50 rounded-lg flex items-center justify-center cursor-pointer hover:border-primary/50 transition-colors"
                      onClick={() => document.getElementById('favicon-input')?.click()}
                    >
                      {settings.favicon ? (
                        <img src={settings.favicon} alt="Favicon" className="w-8 h-8" />
                      ) : (
                        <Upload className="h-6 w-6 text-muted-foreground" />
                      )}
                    </div>
                    <input
                      id="favicon-input"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleFaviconUpload}
                    />
                    <div className="text-sm text-muted-foreground">
                      <p>Ícone que aparece na aba do navegador</p>
                      <p className="text-xs">Recomendado: 32x32px ou 64x64px</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab: Cores */}
        <TabsContent value="colors">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="glass-card border-border/50">
              <CardHeader>
                <CardTitle>Cores Personalizadas</CardTitle>
                <CardDescription>Personalize as cores da sua plataforma</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="primaryColor">Cor Primária (Dourado)</Label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        id="primaryColor"
                        value={settings.primaryColor}
                        onChange={(e) => updateSettings({ primaryColor: e.target.value })}
                        className="w-10 h-10 rounded cursor-pointer border-0"
                      />
                      <Input
                        value={settings.primaryColor}
                        onChange={(e) => updateSettings({ primaryColor: e.target.value })}
                        className="flex-1 bg-background/50 border-border/50 focus:border-primary font-mono text-sm"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="backgroundColor">Cor de Fundo</Label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        id="backgroundColor"
                        value={settings.backgroundColor}
                        onChange={(e) => updateSettings({ backgroundColor: e.target.value })}
                        className="w-10 h-10 rounded cursor-pointer border-0"
                      />
                      <Input
                        value={settings.backgroundColor}
                        onChange={(e) => updateSettings({ backgroundColor: e.target.value })}
                        className="flex-1 bg-background/50 border-border/50 focus:border-primary font-mono text-sm"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="surfaceColor">Cor das Superfícies</Label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        id="surfaceColor"
                        value={settings.surfaceColor}
                        onChange={(e) => updateSettings({ surfaceColor: e.target.value })}
                        className="w-10 h-10 rounded cursor-pointer border-0"
                      />
                      <Input
                        value={settings.surfaceColor}
                        onChange={(e) => updateSettings({ surfaceColor: e.target.value })}
                        className="flex-1 bg-background/50 border-border/50 focus:border-primary font-mono text-sm"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="textColor">Cor do Texto</Label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        id="textColor"
                        value={settings.textColor}
                        onChange={(e) => updateSettings({ textColor: e.target.value })}
                        className="w-10 h-10 rounded cursor-pointer border-0"
                      />
                      <Input
                        value={settings.textColor}
                        onChange={(e) => updateSettings({ textColor: e.target.value })}
                        className="flex-1 bg-background/50 border-border/50 focus:border-primary font-mono text-sm"
                      />
                    </div>
                  </div>
                </div>

                <Button variant="outline" onClick={handleResetColors} className="mt-4">
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Restaurar Cores Padrão
                </Button>
              </CardContent>
            </Card>

            <Card className="glass-card border-border/50">
              <CardHeader>
                <CardTitle>Preview</CardTitle>
                <CardDescription>Visualize como ficará sua plataforma</CardDescription>
              </CardHeader>
              <CardContent>
                <div 
                  className="rounded-xl p-4 space-y-3"
                  style={{ backgroundColor: settings.backgroundColor }}
                >
                  <div 
                    className="rounded-lg p-4"
                    style={{ backgroundColor: settings.surfaceColor }}
                  >
                    <h3 
                      className="font-bold mb-2"
                      style={{ color: settings.primaryColor }}
                    >
                      {settings.platformName}
                    </h3>
                    <p 
                      className="text-sm"
                      style={{ color: settings.textColor }}
                    >
                      Exemplo de texto na sua plataforma
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <div 
                      className="px-4 py-2 rounded-lg text-sm font-medium"
                      style={{ 
                        backgroundColor: settings.primaryColor, 
                        color: settings.backgroundColor 
                      }}
                    >
                      Botão Primário
                    </div>
                    <div 
                      className="px-4 py-2 rounded-lg text-sm font-medium border"
                      style={{ 
                        borderColor: settings.primaryColor, 
                        color: settings.primaryColor 
                      }}
                    >
                      Botão Secundário
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab: Geral */}
        <TabsContent value="general">
          <Card className="glass-card border-border/50">
            <CardHeader>
              <CardTitle>Configurações Gerais</CardTitle>
              <CardDescription>Configure mensagens e informações da plataforma</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="welcomeMessage">Mensagem de Boas-vindas</Label>
                <Textarea
                  id="welcomeMessage"
                  value={settings.welcomeMessage}
                  onChange={(e) => updateSettings({ welcomeMessage: e.target.value })}
                  placeholder="Bem-vindo à sua área de membros!"
                  className="bg-background/50 border-border/50 focus:border-primary"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="footerText">Texto do Rodapé</Label>
                <Input
                  id="footerText"
                  value={settings.footerText}
                  onChange={(e) => updateSettings({ footerText: e.target.value })}
                  placeholder="© 2024 MemberHero. Todos os direitos reservados."
                  className="bg-background/50 border-border/50 focus:border-primary"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="supportEmail">E-mail de Suporte</Label>
                <Input
                  id="supportEmail"
                  type="email"
                  value={settings.supportEmail}
                  onChange={(e) => updateSettings({ supportEmail: e.target.value })}
                  placeholder="suporte@memberhero.com"
                  className="bg-background/50 border-border/50 focus:border-primary"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Integrações */}
        <TabsContent value="integrations">
          <Card className="glass-card border-border/50">
            <CardHeader>
              <CardTitle>Integrações de Analytics</CardTitle>
              <CardDescription>Conecte ferramentas de análise para acompanhar o desempenho</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="googleAnalyticsId">Google Analytics ID</Label>
                <Input
                  id="googleAnalyticsId"
                  value={settings.googleAnalyticsId}
                  onChange={(e) => updateSettings({ googleAnalyticsId: e.target.value })}
                  placeholder="G-XXXXXXXXXX"
                  className="bg-background/50 border-border/50 focus:border-primary font-mono"
                />
                <p className="text-xs text-muted-foreground">
                  Encontre seu ID no painel do Google Analytics
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="facebookPixelId">Facebook Pixel ID</Label>
                <Input
                  id="facebookPixelId"
                  value={settings.facebookPixelId}
                  onChange={(e) => updateSettings({ facebookPixelId: e.target.value })}
                  placeholder="XXXXXXXXXXXXXXX"
                  className="bg-background/50 border-border/50 focus:border-primary font-mono"
                />
                <p className="text-xs text-muted-foreground">
                  Encontre seu Pixel ID no Gerenciador de Eventos do Facebook
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Notificações */}
        <TabsContent value="notifications">
          <Card className="glass-card border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-primary" />
                Configuração de Alertas de Webhook
              </CardTitle>
              <CardDescription>
                Configure notificações automáticas por email quando houver falhas nos webhooks
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {isLoadingNotifications ? (
                <div className="text-center py-8 text-muted-foreground">Carregando configurações...</div>
              ) : (
                <>
                  {/* Alerta sobre RESEND_API_KEY */}
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 flex gap-3">
                    <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-amber-500">Configuração de API necessária</p>
                      <p className="text-sm text-muted-foreground">
                        Para ativar as notificações por email, você precisa configurar a chave{' '}
                        <code className="bg-background/50 px-1.5 py-0.5 rounded text-xs">RESEND_API_KEY</code>{' '}
                        nas configurações do Supabase.
                      </p>
                    </div>
                  </div>

                  {/* Toggle principal de alertas */}
                  <div className="flex items-center justify-between p-4 bg-background/30 rounded-lg">
                    <div className="space-y-0.5">
                      <Label className="text-base">Alertas por Email</Label>
                      <p className="text-sm text-muted-foreground">
                        Ativar notificações automáticas por email
                      </p>
                    </div>
                    <Switch
                      checked={notificationSettings?.email_alerts || false}
                      onCheckedChange={(checked) => updateNotificationSettings({ email_alerts: checked })}
                    />
                  </div>

                  {/* Email para alertas */}
                  <div className="space-y-2">
                    <Label htmlFor="alertEmail">Email para Alertas</Label>
                    <Input
                      id="alertEmail"
                      type="email"
                      value={notificationSettings?.alert_email || ''}
                      onChange={(e) => updateNotificationSettings({ alert_email: e.target.value })}
                      placeholder="admin@exemplo.com"
                      className="bg-background/50 border-border/50 focus:border-primary"
                    />
                    <p className="text-xs text-muted-foreground">
                      Email que receberá as notificações de falhas nos webhooks
                    </p>
                  </div>

                  {/* Condições de alerta */}
                  <div className="space-y-4">
                    <Label className="text-base">Condições de Alerta</Label>
                    
                    <div className="space-y-3 p-4 bg-background/30 rounded-lg">
                      <div className="flex items-start gap-3">
                        <Checkbox
                          id="alertOnError"
                          checked={notificationSettings?.alert_on_error || false}
                          onCheckedChange={(checked) => 
                            updateNotificationSettings({ alert_on_error: checked as boolean })
                          }
                        />
                        <div className="space-y-1 flex-1">
                          <Label htmlFor="alertOnError" className="cursor-pointer font-normal">
                            ⚠️ Alertar em cada erro de webhook
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            Você receberá um email imediatamente após cada falha detectada
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <Checkbox
                          id="alertOnMultiple"
                          checked={notificationSettings?.alert_on_multiple_failures || false}
                          onCheckedChange={(checked) => 
                            updateNotificationSettings({ alert_on_multiple_failures: checked as boolean })
                          }
                        />
                        <div className="space-y-2 flex-1">
                          <Label htmlFor="alertOnMultiple" className="cursor-pointer font-normal">
                            🔴 Alertar após falhas consecutivas
                          </Label>
                          <p className="text-xs text-muted-foreground mb-2">
                            Receberá email apenas após várias falhas seguidas
                          </p>
                          <div className="flex items-center gap-2">
                            <Label htmlFor="failureThreshold" className="text-xs whitespace-nowrap">
                              Limite de falhas:
                            </Label>
                            <Input
                              id="failureThreshold"
                              type="number"
                              min="2"
                              max="10"
                              value={notificationSettings?.failure_threshold || 3}
                              onChange={(e) => 
                                updateNotificationSettings({ failure_threshold: parseInt(e.target.value) })
                              }
                              className="w-20 h-8 bg-background/50 border-border/50 focus:border-primary"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Plataformas monitoradas */}
                  <div className="space-y-3">
                    <Label className="text-base">Plataformas Monitoradas</Label>
                    <p className="text-sm text-muted-foreground">
                      Selecione quais plataformas você deseja monitorar
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                      {platforms.map((platform) => (
                        <div
                          key={platform.id}
                          className="flex items-center gap-2 p-3 bg-background/30 rounded-lg border border-border/30 hover:border-primary/50 transition-colors"
                        >
                          <Checkbox
                            id={platform.id}
                            checked={notificationSettings?.platforms_to_monitor?.includes(platform.id) || false}
                            onCheckedChange={() => handlePlatformToggle(platform.id)}
                          />
                          <Label htmlFor={platform.id} className="cursor-pointer font-normal text-sm">
                            {platform.label}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Avançado */}
        <TabsContent value="advanced">
          <div className="space-y-6">
            <Card className="glass-card border-border/50">
              <CardHeader>
                <CardTitle>Controles da Plataforma</CardTitle>
                <CardDescription>Configurações avançadas de funcionamento</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Modo Manutenção</Label>
                    <p className="text-sm text-muted-foreground">
                      Quando ativo, apenas administradores podem acessar a plataforma
                    </p>
                  </div>
                  <Switch
                    checked={settings.maintenanceMode}
                    onCheckedChange={(checked) => updateSettings({ maintenanceMode: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Permitir Novos Cadastros</Label>
                    <p className="text-sm text-muted-foreground">
                      Permite que novos usuários se registrem na plataforma
                    </p>
                  </div>
                  <Switch
                    checked={settings.allowRegistration}
                    onCheckedChange={(checked) => updateSettings({ allowRegistration: checked })}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card border-border/50">
              <CardHeader>
                <CardTitle>Backup e Restauração</CardTitle>
                <CardDescription>Exporte ou importe suas configurações</CardDescription>
              </CardHeader>
              <CardContent className="flex gap-4">
                <Button variant="outline" onClick={handleExport}>
                  <Download className="h-4 w-4 mr-2" />
                  Exportar Configurações
                </Button>
                <Button variant="outline" onClick={() => importInputRef.current?.click()}>
                  <ImportIcon className="h-4 w-4 mr-2" />
                  Importar Configurações
                </Button>
                <input
                  ref={importInputRef}
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={handleImport}
                />
              </CardContent>
            </Card>

            <Card className="glass-card border-destructive/50">
              <CardHeader>
                <CardTitle className="text-destructive">Zona de Perigo</CardTitle>
                <CardDescription>Ações irreversíveis</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="destructive" onClick={() => {
                  resetToDefaults();
                  toast({ title: "Restaurado", description: "Todas as configurações foram restauradas para o padrão." });
                }}>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Restaurar Todas as Configurações
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
