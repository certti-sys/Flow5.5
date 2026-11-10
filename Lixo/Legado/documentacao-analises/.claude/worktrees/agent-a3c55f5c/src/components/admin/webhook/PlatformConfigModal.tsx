import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Save, Trash2 } from "lucide-react";

interface Platform {
  id: string;
  name: string;
  display_name: string;
  webhook_secret: string | null;
  is_active: boolean;
  settings: any;
}

interface PlatformConfigModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  platform: Platform | null;
  onSaved: () => void;
}

export function PlatformConfigModal({
  open,
  onOpenChange,
  platform,
  onSaved
}: PlatformConfigModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    display_name: '',
    webhook_secret: '',
    is_active: true
  });
  const queryClient = useQueryClient();

  useEffect(() => {
    if (platform) {
      setFormData({
        name: platform.name,
        display_name: platform.display_name,
        webhook_secret: platform.webhook_secret || '',
        is_active: platform.is_active
      });
    } else {
      setFormData({
        name: '',
        display_name: '',
        webhook_secret: '',
        is_active: true
      });
    }
  }, [platform]);

  // Criar/Atualizar plataforma
  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (platform) {
        const { error } = await supabase
          .from('webhook_platforms')
          .update({
            name: data.name.toLowerCase().replace(/\s+/g, '-'),
            display_name: data.display_name,
            webhook_secret: data.webhook_secret || null,
            is_active: data.is_active
          })
          .eq('id', platform.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('webhook_platforms')
          .insert({
            name: data.name.toLowerCase().replace(/\s+/g, '-'),
            display_name: data.display_name,
            webhook_secret: data.webhook_secret || null,
            is_active: data.is_active
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(platform ? 'Plataforma atualizada!' : 'Plataforma criada!');
      onSaved();
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error('Erro ao salvar: ' + error.message);
    }
  });

  // Deletar plataforma
  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!platform) return;
      const { error } = await supabase
        .from('webhook_platforms')
        .delete()
        .eq('id', platform.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Plataforma removida!');
      queryClient.invalidateQueries({ queryKey: ['webhook-platforms'] });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error('Erro ao remover: ' + error.message);
    }
  });

  const handleSave = () => {
    if (!formData.name || !formData.display_name) {
      toast.error('Nome e nome de exibição são obrigatórios');
      return;
    }
    saveMutation.mutate(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {platform ? 'Editar Plataforma' : 'Nova Plataforma'}
          </DialogTitle>
          <DialogDescription>
            Configure a plataforma de webhook para receber eventos
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Nome (slug) *</Label>
            <Input
              placeholder="ex: hotmart, woocommerce, kiwify"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            />
            <p className="text-xs text-muted-foreground">
              Identificador único (sem espaços, minúsculas)
            </p>
          </div>

          <div className="space-y-2">
            <Label>Nome de Exibição *</Label>
            <Input
              placeholder="ex: Hotmart, WooCommerce, Kiwify"
              value={formData.display_name}
              onChange={(e) => setFormData(prev => ({ ...prev, display_name: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label>Webhook Secret (opcional)</Label>
            <Input
              type="password"
              placeholder="Secret para validação HMAC"
              value={formData.webhook_secret}
              onChange={(e) => setFormData(prev => ({ ...prev, webhook_secret: e.target.value }))}
            />
            <p className="text-xs text-muted-foreground">
              Usado para validar a autenticidade dos webhooks (HMAC-SHA256)
            </p>
          </div>
        </div>

        {/* Footer separado com toggle e ações */}
        <DialogFooter className="flex-col sm:flex-row gap-4 pt-4 border-t border-white/5 mt-4">
          {/* Linha 1: Toggle à esquerda */}
          <div className="flex items-center gap-2 sm:mr-auto">
            <Switch
              id="is_active"
              checked={formData.is_active}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
            />
            <Label htmlFor="is_active">Plataforma ativa</Label>
          </div>

          {/* Linha 2: Botões de ação */}
          <div className="flex items-center gap-2">
            {platform && (
              <Button
                variant="destructive"
                onClick={() => deleteMutation.mutate()}
                disabled={deleteMutation.isPending}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Excluir
              </Button>
            )}
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saveMutation.isPending}>
              <Save className="w-4 h-4 mr-2" />
              Salvar
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}