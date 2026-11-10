import { useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Loader2, FileDown, ArrowLeft, Award, ShieldCheck } from "lucide-react";

export default function CertificateView() {
  const { id } = useParams();
  const { settings, isLoading: isLoadingSettings } = usePlatformSettings();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const { data: cert, isLoading, error } = useQuery({
    queryKey: ['certificate', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('certificates')
        .select(`
          *,
          user:profiles(*),
          course:courses(*)
        `)
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const handleDownload = () => {
    if (!cert) return;

    const issueDate = cert.issued_at
      ? format(new Date(cert.issued_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
      : '';

    const certLogo = settings.certificate_logo_url || settings.logo_image_url;
    const platformName = settings.logo_text || 'STREAM';
    const studentName = cert.user?.name || 'Aluno da Plataforma';
    const courseTitle = cert.course?.title || 'Curso';
    const courseDuration = cert.course?.duration || 'N/A';
    const instructorName = settings.certificate_instructor_name || 'Diretoria';
    const signatureUrl = settings.certificate_signature_url;

    const logoHtml = certLogo
      ? `<img src="${certLogo}" alt="Logo" style="height:64px;object-fit:contain;display:block;" />`
      : `<div style="font-size:32px;">🏅</div>`;

    const logoTextHtml = !settings.certificate_logo_url
      ? `<h1 style="margin:0;font-size:28px;font-weight:900;color:#ffffff;letter-spacing:0.2em;">${platformName}</h1>`
      : '';

    const signatureHtml = signatureUrl
      ? `<img src="${signatureUrl}" alt="Assinatura" style="max-height:80px;max-width:250px;object-fit:contain;opacity:0.9;" />`
      : '';

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>Certificado - ${studentName}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&display=swap');
    @page {
      size: A4 landscape;
      margin: 0;
    }
    html, body {
      width: 297mm;
      height: 210mm;
      background: #111113;
      font-family: 'Inter', sans-serif;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .certificate {
      width: 297mm;
      height: 210mm;
      background: #111113;
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      overflow: hidden;
    }
    .border-outer {
      position: absolute;
      inset: 12px;
      border: 2px solid rgba(255,255,255,0.12);
    }
    .border-inner {
      position: absolute;
      inset: 20px;
      border: 1px solid rgba(255,255,255,0.06);
    }
    .glow-tl {
      position: absolute;
      top: -40px; left: -40px;
      width: 280px; height: 280px;
      background: radial-gradient(circle, rgba(124,58,237,0.35) 0%, transparent 70%);
      border-radius: 50%;
    }
    .glow-br {
      position: absolute;
      bottom: -40px; right: -40px;
      width: 280px; height: 280px;
      background: radial-gradient(circle, rgba(245,158,11,0.15) 0%, transparent 70%);
      border-radius: 50%;
    }
    .logo-area {
      margin-top: 32px;
      display: flex;
      align-items: center;
      gap: 12px;
      z-index: 2;
    }
    .title {
      font-size: 44px;
      font-weight: 900;
      color: rgba(255,255,255,0.92);
      letter-spacing: 0.18em;
      font-family: Georgia, serif;
      z-index: 2;
      margin-top: 10px;
    }
    .subtitle {
      font-size: 11px;
      font-weight: 700;
      color: #f59e0b;
      letter-spacing: 0.3em;
      text-transform: uppercase;
      z-index: 2;
      margin-top: 4px;
      margin-bottom: 18px;
    }
    .content {
      text-align: center;
      max-width: 68%;
      z-index: 2;
    }
    .certifies-label {
      font-size: 14px;
      color: rgba(255,255,255,0.55);
      font-weight: 500;
      margin-bottom: 8px;
    }
    .student-name {
      font-size: 34px;
      font-weight: 700;
      color: #ffffff;
      border-bottom: 2px solid rgba(255,255,255,0.15);
      padding-bottom: 8px;
      margin-bottom: 12px;
    }
    .course-label {
      font-size: 14px;
      color: rgba(255,255,255,0.72);
      font-weight: 500;
      line-height: 1.6;
    }
    .course-name {
      font-size: 20px;
      font-weight: 900;
      color: #f59e0b;
      display: block;
      margin-top: 4px;
    }
    .date-text {
      font-size: 12px;
      color: rgba(255,255,255,0.45);
      margin-top: 8px;
    }
    .footer {
      position: absolute;
      bottom: 40px;
      left: 48px;
      right: 48px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      z-index: 2;
    }
    .id-block { max-width: 220px; }
    .id-icon {
      width: 48px; height: 48px;
      border: 1px solid rgba(255,255,255,0.12);
      border-radius: 8px;
      background: rgba(0,0,0,0.35);
      display: flex; align-items: center; justify-content: center;
      font-size: 22px;
      margin-bottom: 6px;
    }
    .id-label {
      font-size: 9px;
      font-weight: 700;
      color: rgba(255,255,255,0.35);
      text-transform: uppercase;
      letter-spacing: 0.15em;
      margin-bottom: 2px;
    }
    .id-value {
      font-size: 8px;
      color: rgba(255,255,255,0.5);
      font-family: monospace;
      word-break: break-all;
    }
    .signature-block {
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .signature-line {
      width: 200px;
      height: 1px;
      background: linear-gradient(to right, transparent, rgba(255,255,255,0.4), transparent);
      margin: 6px 0;
    }
    .signer-name {
      font-size: 12px;
      font-weight: 700;
      color: rgba(255,255,255,0.85);
    }
  </style>
</head>
<body>
  <div class="certificate">
    <div class="border-outer"></div>
    <div class="border-inner"></div>
    <div class="glow-tl"></div>
    <div class="glow-br"></div>

    <div class="logo-area">
      ${logoHtml}
      ${logoTextHtml}
    </div>

    <div class="title">CERTIFICADO</div>
    <div class="subtitle">De Conclusão de Curso</div>

    <div class="content">
      <p class="certifies-label">Certificamos que</p>
      <div class="student-name">${studentName}</div>
      <p class="course-label">
        concluiu com sucesso todos os módulos e avaliações do curso
        <strong class="course-name">${courseTitle}</strong>
      </p>
      <p class="date-text">
        Curso de duração estimada em <strong style="color:#fff">${courseDuration}</strong>, finalizado em ${issueDate}.
      </p>
    </div>

    <div class="footer">
      <div class="id-block">
        <div class="id-icon">🛡️</div>
        <div class="id-label">ID do Documento</div>
        <div class="id-value">${cert.id}</div>
      </div>
      <div class="signature-block">
        ${signatureHtml}
        <div class="signature-line"></div>
        <div class="signer-name">${instructorName}</div>
      </div>
    </div>
  </div>
  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
        window.onafterprint = function() { window.close(); };
      }, 800);
    };
  </script>
</body>
</html>`;

    const printWindow = window.open('', '_blank', 'width=1200,height=900');
    if (!printWindow) {
      alert('Por favor, permita pop-ups para este site e tente novamente.');
      return;
    }
    printWindow.document.write(html);
    printWindow.document.close();
  };

  if (isLoading || isLoadingSettings) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
      </div>
    );
  }

  if (error || !cert) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
        <ShieldCheck className="w-16 h-16 text-destructive opacity-50" />
        <h2 className="text-2xl font-bold">Certificado não encontrado</h2>
        <p className="text-muted-foreground">O código fornecido é incorreto ou o certificado foi revogado.</p>
        <Link to="/dashboard">
          <Button variant="outline" className="mt-4">
            <ArrowLeft className="w-4 h-4 mr-2" /> Voltar ao Início
          </Button>
        </Link>
      </div>
    );
  }

  const issueDate = cert.issued_at
    ? format(new Date(cert.issued_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
    : '';

  const certLogo = settings.certificate_logo_url || settings.logo_image_url;

  return (
    <div className="min-h-screen bg-[#0a0a0b] py-8 px-4 flex flex-col items-center custom-scrollbar">
      {/* Top Controls */}
      <div className="w-full max-w-[1100px] flex items-center justify-between mb-8">
        <Link to={`/curso/${cert.course_id}`}>
          <Button variant="outline" className="glass-card hover:bg-white/5 border-white/10 text-white rounded-xl">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar para o Curso
          </Button>
        </Link>
        <Button
          onClick={handleDownload}
          className="bg-primary hover:bg-primary/90 text-white font-bold border-0 shadow-xl shadow-primary/20 rounded-xl"
        >
          <FileDown className="w-4 h-4 mr-2" />
          Baixar Certificado (PDF)
        </Button>
      </div>

      {/* CERTIFICATE PREVIEW */}
      <div className="w-full max-w-[1100px] overflow-x-auto pb-12">
        <div
          id="certificate-print-area"
          className="relative min-w-[1000px] aspect-[1.414/1] bg-[#111113] border border-white/5 shadow-2xl mx-auto overflow-hidden flex flex-col items-center"
          style={{ backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(255,255,255,0.02) 0%, transparent 60%)' }}
        >
          <div className="absolute inset-4 border-2 border-white/10" />
          <div className="absolute inset-6 border border-white/5" />
          <div className="absolute top-0 left-0 w-64 h-64 bg-primary/30 blur-[100px] rounded-full pointer-events-none" />
          <div className="absolute bottom-0 right-0 w-64 h-64 bg-amber-500/10 blur-[100px] rounded-full pointer-events-none" />

          {/* Logo */}
          <div className="mt-16 mb-8 flex items-center justify-center gap-4 z-10">
            {certLogo ? (
              <img src={certLogo} alt="Logo" className="h-16 object-contain" />
            ) : (
              <Award className="w-12 h-12 text-primary" />
            )}
            {!settings.certificate_logo_url && (
              <h1 className="text-3xl font-black text-white tracking-widest">{settings.logo_text || 'STREAM'}</h1>
            )}
          </div>

          <h2 className="text-5xl font-black text-white/90 tracking-widest mb-2 z-10" style={{ fontFamily: 'serif' }}>CERTIFICADO</h2>
          <p className="text-sm font-bold text-amber-500 tracking-[0.3em] uppercase mb-10 z-10">De Conclusão de Curso</p>

          <div className="text-center max-w-[70%] z-10">
            <p className="text-base text-white/55 font-medium mb-3">Certificamos que</p>
            <h3 className="text-4xl font-bold text-white mb-5 border-b border-white/15 pb-3">
              {cert.user?.name || 'Aluno da Plataforma'}
            </h3>
            <p className="text-base text-white/75 font-medium leading-relaxed">
              concluiu com sucesso todos os módulos e avaliações do curso
              <strong className="text-xl mt-3 block text-amber-400 font-black">{cert.course?.title}</strong>
            </p>
            <p className="text-sm text-white/45 mt-5">
              Duração estimada de <strong className="text-white">{cert.course?.duration || 'N/A'}</strong>, finalizado em {issueDate}.
            </p>
          </div>

          {/* Footer */}
          <div className="absolute bottom-14 left-14 right-14 flex justify-between items-end z-10">
            <div className="max-w-[220px]">
              <div className="w-12 h-12 rounded-lg bg-black/40 border border-white/10 flex items-center justify-center mb-2">
                <ShieldCheck className="w-6 h-6 text-primary/70" />
              </div>
              <p className="text-[10px] text-white/35 font-bold uppercase tracking-widest mb-1">ID do Documento</p>
              <p className="text-[9px] text-white/50 font-mono break-all">{cert.id}</p>
            </div>
            <div className="text-center flex flex-col items-center">
              {settings.certificate_signature_url && (
                <img src={settings.certificate_signature_url} className="max-h-16 max-w-[200px] object-contain opacity-90 mb-1" alt="Assinatura" />
              )}
              <div className="w-48 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent mb-2" />
              <p className="text-xs font-bold text-white/85">{settings.certificate_instructor_name || 'Diretoria'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
