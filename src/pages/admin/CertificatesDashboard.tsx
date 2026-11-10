import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Award, Search, ExternalLink, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Calendar, User } from "lucide-react";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface CertificateData {
  id: string;
  user_id: string;
  course_id: string;
  profiles: { name: string | null; email: string | null; avatar_url: string | null };
  courses: { title: string | null } | null;
}

const CertificateCard = ({ cert }: { cert: CertificateData }) => {
  return (
    <div className="glass-card rounded-[20px] border-white/10 overflow-hidden hover:border-white/10 transition-all duration-300 group">
      <div className="flex flex-col w-full">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Avatar className="h-10 w-10 rounded-full border border-white/10 shadow-2xl group-hover/row:scale-105 transition-transform duration-300">
                <AvatarImage src={cert.profiles?.avatar_url || ""} alt={cert.profiles?.name} />
                <AvatarFallback className="bg-primary/20 text-primary font-bold text-xs uppercase">
                  {cert.profiles?.name?.charAt(0) || "U"}
                </AvatarFallback>
              </Avatar>
            </div>
            <div className="ml-4 flex flex-col">
              <h3 className="font-bold text-white text-[14px] leading-tight group-hover/row:text-primary transition-colors truncate">
                {cert.profiles?.name}
              </h3>
              <p className="text-[12px] text-muted-foreground/60 mt-0.5">
                {cert.courses?.title || "Curso não encontrado"}
              </p>
            </div>
          </div>
          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-[9px] uppercase font-bold px-2 py-0.5 rounded-md">
            Concluído
          </Badge>
        </div>
        <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground/60">
          <Calendar className="w-3 h-3 mr-1" />
          <span>{new Date(cert.id).toLocaleDateString("pt-BR")}</span>
        </div>
      </div>
      <div className="mt-4 flex justify-between items-center px-4 pb-4">
        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-primary/60 mr-2" />
          <span className="text-[13px] text-white/80 font-medium">{cert.profiles?.name}</span>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to={`/certificado/${cert.id}`}
            target="_blank"
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] font-bold text-white"
          >
            <ExternalLink className="w-4 h-4 mr-1" />
            <span className="text-[11px] font-bold">Ver Certificado</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default function CertificatesDashboard() {
  const [searchTerm, setSearchTerm] = useState("");
  const { settings } = usePlatformSettings();

  const [formData, setFormData] = useState<{
    certificate_instructor_name: string;
    certificate_signature_url: string | null;
    certificate_logo_url: string | null;
    certificate_template: string;
  }>({
    certificate_instructor_name: settings?.certificate_instructor_name || "",
    certificate_signature_url: settings?.certificate_signature_url || null,
    certificate_logo_url: settings?.certificate_logo_url || null,
    certificate_template: settings?.certificate_template || "dark-premium",
  });

  useEffect(() => {
    if (settings) {
      setFormData({
        certificate_instructor_name: settings.certificate_instructor_name || "",
        certificate_signature_url: settings.certificate_signature_url || null,
        certificate_logo_url: settings.certificate_logo_url || null,
        certificate_template: settings.certificate_template || "dark-premium",
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
          profiles (name, email, avatar_url),
          courses (title)
        `)
        .order("issued_at", { ascending: false });
      if (error) throw error;
      return data as CertificateData[];
    },
  });

  const filteredCertificates = certificates.filter((cert: CertificateData) =>
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
            Gerencie e acompanhe os certificados emitidos pela plataforma.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setSearchTerm("")}
            className="glass-card border-white/10 hover:bg-white/5 h-10 px-4 rounded-[12px] text-[11px] font-bold"
          >
            Limpar
          </Button>
          <Button
            className="bg-primary hover:bg-primary/90 text-white h-[44px] px-6 rounded-[12px] font-bold"
          >
            <Plus className="w-4 h-4 mr-2" />
            Novo Certificado
          </Button>
        </div>
      </div>

      <div className="glass-card p-6 rounded-[16px] border border-white/10">
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex-1 w-full md:w-1/3">
            <Input
              placeholder="Buscar aluno, curso ou certificado..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-[44px] glass-card border-white/10 rounded-[12px] text-white placeholder:text-white/40"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredCertificates.length === 0 ? (
          <div className="col-span-full glass-card py-32 rounded-[32px] border-dashed border-white/10 flex flex-col items-center justify-center text-center px-6">
            <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-6">
              <Search className="w-10 h-10 text-white/10" />
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight mb-2">
              Nenhum Certificado Encontrado
            </h2>
            <p className="text-muted-foreground text-[14px] max-w-xs mb-8">
              Não encontramos nenhum certificado com os termos ou filtros selecionados.
            </p>
            <Button
              variant="outline"
              onClick={() => setSearchTerm("")}
              className="glass-card border-white/10 hover:bg-white/5 h-12 px-8 rounded-[12px] font-bold uppercase tracking-widest text-[12px]"
            >
              LIMPAR TODOS OS FILTROS
            </Button>
          </div>
        ) : (
          <>
            {filteredCertificates.map((cert: CertificateData) => (
              <CertificateCard key={cert.id} cert={cert} />
            ))}
          </>
        )}
      </div>
    </div>
  );
}