import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  Award, 
  Search, 
  ExternalLink,
  ShieldCheck,
  Calendar,
  User,
  BookOpen,
  Settings,
  Save,
  Loader2,
  Monitor
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Link } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ImageUploadField } from "@/components/admin/ImageUploadField";
import { usePlatformSettings, PlatformSettings } from "@/hooks/usePlatformSettings";
import { toast } from "sonner";

export default function CertificatesDashboard() {
  const [searchTerm, setSearchTerm] = useState("");
  const { settings, updateSettings, isSaving, uploadAsset } = usePlatformSettings();
  
  const [formData, setFormData] = useState<Partial<PlatformSettings>>({
    certificate_instructor_name: settings?.certificate_instructor_name || "",
    certificate_signature_url: settings?.certificate_signature_url || null,
    certificate_logo_url: settings?.certificate_logo_url || null,
  });

  useEffect(() => {
    if (settings) {
      setFormData({
        certificate_instructor_name: settings.certificate_instructor_name || "",
        certificate_signature_url: settings.certificate_signature_url || null,
        certificate_logo_url: settings.certificate_logo_url || null,
      });
    }
  }, [settings]);

  const { data: certificates = [], isLoading } = useQuery({
    queryKey: ["admin_certificates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("certificates")
        .select(`
          id,
          issued_at,
          user_id,
          course_id,
          profiles (name, email),
          courses (title)
        `)
        .order("issued_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const handleSaveSettings = async () => {
    try {
      await updateSettings(formData);
      toast.success("Configurações de certificado atualizadas!");
    } catch (error) {
      toast.error("Erro ao salvar configurações");
    }
  };

  const handleSignatureUpload = async (file: File) => {
    const url = await uploadAsset(file, 'cert-signature');
    setFormData(prev => ({ ...prev, certificate_signature_url: url }));
    return url;
  };

  const handleLogoUpload = async (file: File) => {
    const url = await uploadAsset(file, 'cert-logo');
    setFormData(prev => ({ ...prev, certificate_logo_url: url }));
    return url;
  };

  const filteredCertificates = certificates.filter(
    (cert: any) =>
      cert.profiles?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cert.profiles?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cert.courses?.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cert.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
            <Award className="w-8 h-8 text-amber-500" />
            Gestão de Certificados
          </h1>
          <p className="text-muted-foreground mt-1">
            Histórico de emissões e configurações globais dos diplomas.
          </p>
        </div>
      </div>

      <Tabs defaultValue="history" className="w-full">
        <TabsList className="bg-white/5 border border-white/10 p-1 mb-6">
          <TabsTrigger value="history" className="data-[state=active]:bg-primary flex gap-2">
            <Award className="w-4 h-4" />
            Histórico
          </TabsTrigger>
          <TabsTrigger value="settings" className="data-[state=active]:bg-primary flex gap-2">
            <Settings className="w-4 h-4" />
            Configurações Globais
          </TabsTrigger>
        </TabsList>

        <TabsContent value="history" className="space-y-6">
          <div className="flex justify-between items-center gap-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1">
              <div className="glass-card p-6 rounded-xl border border-white/10 flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <Award className="w-6 h-6 text-amber-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Emitidos</p>
                  <p className="text-2xl font-bold text-white">{certificates.length}</p>
                </div>
              </div>
            </div>

            <div className="relative w-full md:w-[300px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar aluno ou curso..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 glass-card border-white/10"
              />
            </div>
          </div>

          <div className="glass-card rounded-xl border border-white/10 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-white/5 text-muted-foreground">
                  <tr>
                    <th className="px-6 py-4 font-medium">Aluno</th>
                    <th className="px-6 py-4 font-medium">Curso</th>
                    <th className="px-6 py-4 font-medium">Autenticação</th>
                    <th className="px-6 py-4 font-medium">Data</th>
                    <th className="px-6 py-4 font-medium text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {isLoading ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
                      </td>
                    </tr>
                  ) : filteredCertificates.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                        Nenhum certificado encontrado.
                      </td>
                    </tr>
                  ) : (
                    filteredCertificates.map((cert: any) => (
                      <tr key={cert.id} className="hover:bg-white/5 transition-colors group text-white/80">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                              <User className="w-4 h-4 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium text-white">{cert.profiles?.name}</p>
                              <p className="text-xs text-muted-foreground">{cert.profiles?.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-medium">{cert.courses?.title}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-mono text-xs text-muted-foreground opacity-60">{cert.id.split('-')[0]}***</span>
                        </td>
                        <td className="px-6 py-4 text-muted-foreground">
                          {new Date(cert.issued_at).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Link 
                            to={`/certificado/${cert.id}`}
                            target="_blank"
                            className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-white/5 hover:bg-amber-500/20 hover:text-amber-500 transition-colors"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="settings">
          <div className="max-w-4xl space-y-6">
            <Card className="glass-card border-white/10 rounded-[16px]">
              <CardHeader className="p-8 border-b border-white/5">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/20">
                    <Monitor className="w-6 h-6 text-amber-500 shadow-glow-sm" />
                  </div>
                  <div>
                    <CardTitle className="text-[20px] font-bold text-white tracking-tight">Layout do Certificado</CardTitle>
                    <CardDescription className="text-[14px] text-muted-foreground/40 font-medium">As informações abaixo serão impressas em todos os certificados gerados.</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-8 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div className="space-y-3">
                      <Label className="text-[13px] font-bold text-muted-foreground/30 uppercase tracking-widest pl-1">Nome e Cargo do Assinante</Label>
                      <Input
                        value={formData.certificate_instructor_name || ""}
                        onChange={(e) => setFormData({ ...formData, certificate_instructor_name: e.target.value })}
                        placeholder="Ex: João Silva - Diretor Executivo"
                        className="glass-card border-white/10 h-[48px] rounded-[12px] text-white"
                      />
                    </div>

                    <div className="p-6 rounded-[12px] bg-white/[0.02] border border-white/5">
                      <ImageUploadField
                        label="Logo Específica do Certificado"
                        description="Opcional. Se vazio, usará a logo principal da plataforma."
                        currentImageUrl={formData.certificate_logo_url}
                        onImageUpload={handleLogoUpload}
                        onImageRemove={() => setFormData({ ...formData, certificate_logo_url: null })}
                        aspectRatio="3/1"
                        maxSizeMB={1}
                        maxPreviewWidth="280px"
                      />
                    </div>
                  </div>

                  <div className="p-6 rounded-[12px] bg-white/[0.02] border border-white/5">
                    <ImageUploadField
                      label="Assinatura Digital (PNG Transparente)"
                      description="Faça upload de uma imagem com fundo transparente."
                      currentImageUrl={formData.certificate_signature_url}
                      onImageUpload={handleSignatureUpload}
                      onImageRemove={() => setFormData({ ...formData, certificate_signature_url: null })}
                      aspectRatio="4/1"
                      maxSizeMB={1}
                      maxPreviewWidth="280px"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-white/5">
                  <Button
                    onClick={handleSaveSettings}
                    disabled={isSaving}
                    className="h-[48px] px-8 rounded-[12px] gradient-primary shadow-glow min-w-[200px] font-bold"
                  >
                    {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                    Salvar Alterações
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
