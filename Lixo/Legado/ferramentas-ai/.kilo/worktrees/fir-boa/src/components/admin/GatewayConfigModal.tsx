
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Gateway, GatewayCredentials } from "@/types/payment";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Loader2, Key, Eye, EyeOff, Settings } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

interface GatewayConfigModalProps {
    gateway: Gateway | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function GatewayConfigModal({ gateway, open, onOpenChange }: GatewayConfigModalProps) {
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState<"test" | "live">("test");
    const [showSecrets, setShowSecrets] = useState(false);

    // Form states
    const [publicKey, setPublicKey] = useState("");
    const [secretKey, setSecretKey] = useState("");
    const [webhookSecret, setWebhookSecret] = useState("");
    const [isActive, setIsActive] = useState(true);

    const [allowedMethods, setAllowedMethods] = useState<string[]>(["credit_card", "pix", "bolbradesco"]);
    const [maxInstallments, setMaxInstallments] = useState<number>(1);

    // Fetch existing credentials for the selected environment
    const { data: credentials, isLoading } = useQuery({
        queryKey: ["gatewayCredentials", gateway?.id, activeTab],
        queryFn: async () => {
            if (!gateway) return null;
            const { data, error } = await supabase
                .from("gateway_credentials")
                .select("*")
                .eq("gateway_id", gateway.id)
                .eq("env", activeTab)
                .maybeSingle();

            if (error) throw error;
            return data as GatewayCredentials | null;
        },
        enabled: !!gateway && open,
    });

    // Reset form when credentials fetch or tab changes
    useEffect(() => {
        if (credentials) {
            setPublicKey(credentials.public_key || "");
            setSecretKey(credentials.secret_key ? "********" : "");
            setWebhookSecret(credentials.webhook_secret ? "********" : "");
            setIsActive(credentials.is_active ?? true);
            setAllowedMethods(credentials.allowed_methods || ["credit_card", "pix", "bolbradesco"]);
            setMaxInstallments((credentials as any).max_installments || 1);
        } else {
            setPublicKey("");
            setSecretKey("");
            setWebhookSecret("");
            setIsActive(true);
            setAllowedMethods(["credit_card", "pix", "bolbradesco"]);
            setMaxInstallments(1);
        }
    }, [credentials, activeTab]);

    const mutation = useMutation({
        mutationFn: async () => {
            if (!gateway) return;

            const payload: any = {
                gateway_id: gateway.id,
                env: activeTab,
                public_key: publicKey,
                is_active: isActive,
                allowed_methods: allowedMethods,
                max_installments: maxInstallments,
            };

            // Only update secrets if they've changed from the placeholder
            if (secretKey !== "********") payload.secret_key = secretKey;
            if (webhookSecret !== "********") payload.webhook_secret = webhookSecret;

            const { error } = await supabase
                .from("gateway_credentials")
                .upsert(payload, { onConflict: "gateway_id,env" });

            if (error) throw error;
        },
        onSuccess: () => {
            toast.success(`Credenciais de ${activeTab} salvas com sucesso!`);
            queryClient.invalidateQueries({ queryKey: ["gatewayCredentials"] });
            onOpenChange(false);
        },
        onError: (error: any) => {
            toast.error("Erro ao salvar: " + error.message);
        },
    });

    const handleSave = () => {
        mutation.mutate();
    };

    if (!gateway) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="glass-card border-white/10 rounded-[20px] max-w-lg p-0 overflow-hidden bg-black/90 backdrop-blur-xl">
                <DialogHeader className="px-6 py-5 border-b border-white/5 bg-white/[0.02]">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center border border-blue-500/30 shrink-0">
                            <Settings className="w-5 h-5 text-blue-500" />
                        </div>
                        <div className="text-left space-y-1">
                            <DialogTitle className="text-[20px] font-bold text-white tracking-tight">Configurar {gateway.name}</DialogTitle>
                        </div>
                    </div>
                </DialogHeader>

                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "test" | "live")} className="flex flex-col w-full">
                    <div className="px-6 pt-4 border-b border-white/5">
                        <TabsList className="bg-transparent h-auto p-0 gap-6 w-full justify-start rounded-none">
                            <TabsTrigger 
                                value="test"
                                className="relative rounded-none px-0 py-3 text-white/50 data-[state=active]:text-white data-[state=active]:bg-transparent data-[state=active]:shadow-none after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-blue-500 after:opacity-0 data-[state=active]:after:opacity-100 transition-all font-medium"
                            >
                                Ambiente de Teste
                            </TabsTrigger>
                            <TabsTrigger 
                                value="live"
                                className="relative rounded-none px-0 py-3 text-white/50 data-[state=active]:text-red-400 data-[state=active]:bg-transparent data-[state=active]:shadow-none after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-red-500 after:opacity-0 data-[state=active]:after:opacity-100 transition-all font-medium"
                            >
                                Produção (Live)
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto scrollbar-styled">
                        <div className="flex items-center justify-between p-4 glass-card border border-white/10 rounded-[12px] bg-black/20">
                            <Label className="text-[14px] font-bold text-white">Ativar este ambiente</Label>
                            <Switch checked={isActive} onCheckedChange={setIsActive} />
                        </div>

                        <div className="space-y-2">
                            <Label className="text-[12px] uppercase tracking-widest font-bold text-white/40">Public Key</Label>
                            <Input
                                placeholder="pk_..."
                                value={publicKey}
                                onChange={(e) => setPublicKey(e.target.value)}
                                className="bg-white/5 border-white/5 h-12 rounded-[12px] focus:bg-white/[0.08] transition-all text-white"
                            />
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label className="text-[12px] uppercase tracking-widest font-bold text-white/40">Access Token / Secret Key</Label>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 hover:bg-white/5 rounded-full"
                                    onClick={() => setShowSecrets(!showSecrets)}
                                    type="button"
                                >
                                    {showSecrets ? <EyeOff className="w-4 h-4 text-white/40" /> : <Eye className="w-4 h-4 text-white/40" />}
                                </Button>
                            </div>
                            <Input
                                type={showSecrets ? "text" : "password"}
                                placeholder="sk_..."
                                value={secretKey}
                                onChange={(e) => setSecretKey(e.target.value)}
                                className="bg-white/5 border-white/5 h-12 rounded-[12px] focus:bg-white/[0.08] transition-all text-white"
                            />
                            <p className="text-[11px] text-white/30">
                                {secretKey === "********" ? "Chave salva oculta. Digite para substituir." : "Token de acesso privado."}
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-[12px] uppercase tracking-widest font-bold text-white/40">Webhook Secret (Opcional)</Label>
                            <Input
                                type={showSecrets ? "text" : "password"}
                                placeholder="whsec_..."
                                value={webhookSecret}
                                onChange={(e) => setWebhookSecret(e.target.value)}
                                className="bg-white/5 border-white/5 h-12 rounded-[12px] focus:bg-white/[0.08] transition-all text-white"
                            />
                        </div>

                        <div className="space-y-4 p-5 rounded-[12px] bg-black/20 border border-white/5">
                            <Label className="text-[12px] uppercase tracking-widest font-bold text-white/40">Métodos de Pagamento</Label>
                            <div className="flex flex-col gap-3">
                                <div className="flex items-center space-x-3 bg-white/[0.02] p-3 rounded-lg border border-white/5">
                                    <Checkbox
                                        id="method_cc"
                                        checked={allowedMethods.includes("credit_card")}
                                        onCheckedChange={(checked) => {
                                            if (checked) setAllowedMethods([...allowedMethods, "credit_card"]);
                                            else setAllowedMethods(allowedMethods.filter(m => m !== "credit_card"));
                                        }}
                                        className="data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500"
                                    />
                                    <Label htmlFor="method_cc" className="font-medium text-white/80 cursor-pointer text-[14px]">Cartão de Crédito</Label>
                                </div>
                                <div className="flex items-center space-x-3 bg-white/[0.02] p-3 rounded-lg border border-white/5">
                                    <Checkbox
                                        id="method_pix"
                                        checked={allowedMethods.includes("pix")}
                                        onCheckedChange={(checked) => {
                                            if (checked) setAllowedMethods([...allowedMethods, "pix"]);
                                            else setAllowedMethods(allowedMethods.filter(m => m !== "pix"));
                                        }}
                                        className="data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500"
                                    />
                                    <Label htmlFor="method_pix" className="font-medium text-white/80 cursor-pointer text-[14px]">Pix</Label>
                                </div>
                                <div className="flex items-center space-x-3 bg-white/[0.02] p-3 rounded-lg border border-white/5">
                                    <Checkbox
                                        id="method_boleto"
                                        checked={allowedMethods.includes("bolbradesco")}
                                        onCheckedChange={(checked) => {
                                            if (checked) setAllowedMethods([...allowedMethods, "bolbradesco"]);
                                            else setAllowedMethods(allowedMethods.filter(m => m !== "bolbradesco"));
                                        }}
                                        className="data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500"
                                    />
                                    <Label htmlFor="method_boleto" className="font-medium text-white/80 cursor-pointer text-[14px]">Boleto Bancário</Label>
                                </div>
                            </div>
                        </div>

                        {/* Configuração de Parcelamento */}
                        {allowedMethods.includes("credit_card") && (
                            <div className="space-y-3 pt-4 border-t border-white/5">
                                <Label className="text-[12px] uppercase tracking-widest font-bold text-white/40">Parcelamento (Cartão de Crédito)</Label>
                                <select
                                    value={maxInstallments}
                                    onChange={(e) => setMaxInstallments(Number(e.target.value))}
                                    className="flex h-12 w-full rounded-[12px] border border-white/5 bg-black/40 px-3 py-2 text-[14px] text-white focus-visible:outline-none focus:bg-white/[0.08] transition-all"
                                >
                                    <option value={1} className="bg-[#0f0f11]">Apenas à vista (1x)</option>
                                    <option value={2} className="bg-[#0f0f11]">Até 2x</option>
                                    <option value={3} className="bg-[#0f0f11]">Até 3x</option>
                                    <option value={4} className="bg-[#0f0f11]">Até 4x</option>
                                    <option value={6} className="bg-[#0f0f11]">Até 6x</option>
                                    <option value={10} className="bg-[#0f0f11]">Até 10x</option>
                                    <option value={12} className="bg-[#0f0f11]">Até 12x</option>
                                </select>
                                <p className="text-[11px] text-white/30">
                                    Define o número máximo de parcelas oferecidas ao cliente.
                                </p>
                            </div>
                        )}
                    </div>
                </Tabs>

                <div className="p-6 border-t border-white/5 bg-black/40 flex justify-end gap-3 rounded-b-[20px]">
                    <Button 
                        variant="outline" 
                        onClick={() => onOpenChange(false)}
                        className="h-[44px] px-6 glass-card border-white/10 hover:bg-white/5 rounded-[12px] text-white bg-transparent font-bold"
                    >
                        Cancelar
                    </Button>
                    <Button 
                        onClick={handleSave} 
                        disabled={mutation.isPending}
                        className="h-[44px] px-6 rounded-[12px] bg-blue-500 hover:bg-blue-600 text-white font-bold"
                    >
                        {mutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Salvar Credenciais
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
