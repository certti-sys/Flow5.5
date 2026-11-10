import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Copy, Check, Zap, Link2, Plug } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { CourseFormData } from "@/pages/admin/CourseManagement";
import { useSupabaseWebhooks, platforms } from "@/hooks/useSupabaseWebhooks";
import { toast } from "sonner";

interface CourseSettingsTabProps {
  formData: CourseFormData;
  updateFormData: (updates: Partial<CourseFormData>) => void;
  courseId?: string;
}

export function CourseSettingsTab({
  formData,
  updateFormData,
  courseId,
}: CourseSettingsTabProps) {
  const { 
    getWebhookConfigByCourse, 
    createWebhookConfig, 
    updateWebhookConfig,
    getWebhookUrl 
  } = useSupabaseWebhooks();
  
  const [webhookData, setWebhookData] = useState({
    externalProductId: '',
    active: true,
  });
  const [copied, setCopied] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const currentWebhook = courseId ? getWebhookConfigByCourse(courseId) : null;

  useEffect(() => {
    if (currentWebhook) {
      setWebhookData({
        externalProductId: currentWebhook.external_product_id || '',
        active: currentWebhook.active,
      });
    }
  }, [currentWebhook]);

  const handleSaveWebhook = async () => {
    if (!courseId || !formData.integrationPlatform) {
      toast.error("Habilite a integração e selecione uma plataforma primeiro");
      return;
    }

    if (!formData.externalProductId) {
      toast.error("Preencha o ID do Produto Externo na seção de Integrações");
      return;
    }

    setIsSaving(true);

    try {
      if (currentWebhook) {
        await updateWebhookConfig(currentWebhook.id, {
          external_product_id: formData.externalProductId,
          active: webhookData.active,
          checkout_url: formData.checkoutUrl,
        });
        toast.success("Webhook atualizado!");
      } else {
        await createWebhookConfig({
          course_id: courseId,
          platform: formData.integrationPlatform.toLowerCase(),
          active: webhookData.active,
          external_product_id: formData.externalProductId,
          checkout_url: formData.checkoutUrl,
        });
        toast.success("Webhook criado!");
      }
    } catch (error) {
      toast.error("Erro ao salvar webhook");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopyWebhookUrl = () => {
    if (!currentWebhook) return;
    const url = getWebhookUrl(currentWebhook.secret_key);
    navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success("URL copiada!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTestWebhook = async () => {
    if (!currentWebhook) return;
    
    toast.loading("Testando webhook...");
    
    try {
      const testPayload = {
        email: "teste@example.com",
        buyer_name: "Comprador Teste",
        product_id: formData.externalProductId,
        transaction_id: `TEST-${Date.now()}`,
      };

      const response = await fetch(getWebhookUrl(currentWebhook.secret_key), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testPayload),
      });

      if (response.ok) {
        toast.success("Webhook testado com sucesso!");
      } else {
        toast.error("Erro ao testar webhook");
      }
    } catch (error) {
      toast.error("Erro ao testar webhook");
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      {/* Seção 1: Integrações com Plataformas Externas - FASE A */}
      <Card className="glass-card border-border/50">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Plug className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Integrações</CardTitle>
          </div>
          <p className="text-sm text-muted-foreground">
            Vincule este curso a um produto em uma plataforma de pagamento externa
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Toggle Principal */}
          <div className="flex items-center justify-between p-4 bg-muted/20 rounded-lg border border-border/50">
            <div className="space-y-0.5">
              <Label htmlFor="integrationEnabled" className="text-foreground font-medium">
                Habilitar integração externa
              </Label>
              <p className="text-xs text-muted-foreground">
                Ative para vincular este curso a um produto de plataforma de pagamento
              </p>
            </div>
            <Switch
              id="integrationEnabled"
              checked={formData.integrationEnabled}
              onCheckedChange={(checked) => updateFormData({ integrationEnabled: checked })}
            />
          </div>

          {/* Campos condicionais - aparecem apenas quando integrationEnabled = true */}
          {formData.integrationEnabled && (
            <div className="space-y-4 pt-2 animate-in fade-in-50 duration-300">
              {/* Plataforma */}
              <div className="space-y-2">
                <Label htmlFor="integrationPlatform">Plataforma de Pagamento</Label>
                <Select
                  value={formData.integrationPlatform}
                  onValueChange={(value) => updateFormData({ 
                    integrationPlatform: value as typeof formData.integrationPlatform 
                  })}
                >
                  <SelectTrigger className="bg-background/50 border-border/50">
                    <SelectValue placeholder="Selecione a plataforma" />
                  </SelectTrigger>
                  <SelectContent>
                    {platforms.map((platform) => (
                      <SelectItem key={platform.value} value={platform.value}>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-2 h-2 rounded-full" 
                            style={{ backgroundColor: platform.color }}
                          />
                          {platform.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Plataforma onde o produto está cadastrado
                </p>
              </div>

              {/* ID do Produto Externo */}
              <div className="space-y-2">
                <Label htmlFor="externalProductId">ID do Produto Externo *</Label>
                <Input
                  id="externalProductId"
                  value={formData.externalProductId}
                  onChange={(e) => updateFormData({ externalProductId: e.target.value })}
                  placeholder="Ex: 1234567 ou prod_abc123"
                  className="bg-background/50 border-border/50"
                />
                <p className="text-xs text-muted-foreground">
                  Identificador único do produto na plataforma de pagamento
                </p>
              </div>

              {/* Nome do Produto Externo (opcional) */}
              <div className="space-y-2">
                <Label htmlFor="externalProductName">Nome do Produto Externo (opcional)</Label>
                <Input
                  id="externalProductName"
                  value={formData.externalProductName}
                  onChange={(e) => updateFormData({ externalProductName: e.target.value })}
                  placeholder="Ex: Curso Completo de Marketing"
                  className="bg-background/50 border-border/50"
                />
                <p className="text-xs text-muted-foreground">
                  Nome do produto como aparece na plataforma externa (para referência)
                </p>
              </div>

              {/* URL de Checkout */}
              <div className="space-y-2">
                <Label htmlFor="checkoutUrl" className="flex items-center gap-2">
                  <Link2 className="h-4 w-4" />
                  URL do Checkout
                </Label>
                <Input
                  id="checkoutUrl"
                  type="url"
                  value={formData.checkoutUrl}
                  onChange={(e) => updateFormData({ checkoutUrl: e.target.value })}
                  placeholder="https://pay.hotmart.com/..."
                  className="bg-background/50 border-border/50"
                />
                <p className="text-xs text-muted-foreground">
                  Link de compra onde os alunos serão redirecionados
                </p>
              </div>

              {/* Notas de Integração (opcional) */}
              <div className="space-y-2">
                <Label htmlFor="integrationNotes">Notas de Integração (opcional)</Label>
                <Textarea
                  id="integrationNotes"
                  value={formData.integrationNotes}
                  onChange={(e) => updateFormData({ integrationNotes: e.target.value })}
                  placeholder="Anotações sobre a integração, configurações especiais, etc."
                  className="bg-background/50 border-border/50 min-h-[80px] resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  Anotações internas sobre a configuração da integração
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Seção 2: Webhook de Vendas - só aparece se integração estiver habilitada e plataforma selecionada */}
      {formData.integrationEnabled && formData.integrationPlatform && (
        <Card className="glass-card border-border/50 animate-in fade-in-50 duration-300">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Webhook de Vendas</CardTitle>
            </div>
            <p className="text-sm text-muted-foreground">
              Configure webhooks para liberar acesso automaticamente após a compra
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Auto-generated Webhook URL */}
            {currentWebhook && (
              <div className="space-y-2">
                <Label htmlFor="webhookUrl" className="text-foreground">
                  URL do Webhook (Gerada Automaticamente)
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="webhookUrl"
                    value={getWebhookUrl(currentWebhook.secret_key)}
                    readOnly
                    className="bg-background/50 border-border/50 text-muted-foreground font-mono text-xs"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    className="border-border/50 shrink-0"
                    onClick={handleCopyWebhookUrl}
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-primary" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Cole esta URL nas configurações de webhook da plataforma de pagamento
                </p>
              </div>
            )}

            {/* Status Ativo/Inativo */}
            <div className="flex items-center justify-between p-4 bg-muted/20 rounded-lg border border-border/50">
              <div className="space-y-0.5">
                <Label htmlFor="webhookStatus" className="text-foreground">
                  Status do Webhook
                </Label>
                <p className="text-xs text-muted-foreground">
                  {webhookData.active ? 'Webhook ativo e recebendo notificações' : 'Webhook pausado'}
                </p>
              </div>
              <Switch
                id="webhookStatus"
                checked={webhookData.active}
                onCheckedChange={(checked) => setWebhookData(prev => ({ ...prev, active: checked }))}
              />
            </div>

            {/* Buttons */}
            <div className="flex gap-2">
              <Button
                className="gold-button flex-1"
                onClick={handleSaveWebhook}
                disabled={!formData.externalProductId || isSaving}
              >
                {currentWebhook ? 'Atualizar Webhook' : 'Criar Webhook'}
              </Button>
              
              {currentWebhook && (
                <Button
                  variant="outline"
                  onClick={handleTestWebhook}
                  className="border-border/50"
                >
                  <Zap className="h-4 w-4 mr-2" />
                  Testar
                </Button>
              )}
            </div>

            {!formData.externalProductId && (
              <p className="text-xs text-amber-500 text-center">
                Preencha o ID do Produto Externo acima para criar o webhook
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
