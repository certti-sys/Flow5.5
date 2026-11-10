import { useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Loader2, FileDown, ArrowLeft, Award, ShieldCheck } from "lucide-react";

// ─── Certificate Data Interface ───────────────────────────────────────────────

interface CertData {
  id: string;
  issued_at: string;
  course_id: string;
  user?: { name?: string; email?: string } | null;
  course?: { title?: string; duration?: string } | null;
}

interface TemplateData {
  studentName: string;
  courseTitle: string;
  courseDuration: string;
  issueDate: string;
  certId: string;
  instructorName: string;
  platformName: string;
  certLogo: string | null;
  signatureUrl: string | null;
  primaryColor: string;
}

// ─── TEMPLATE 1: Dark Premium ─────────────────────────────────────────────────

function darkPremiumTemplate(d: TemplateData): string {
  const logoHtml = d.certLogo
    ? `<img src="${d.certLogo}" alt="Logo" style="height:60px;object-fit:contain;" />`
    : `<div style="font-size:36px;line-height:1;">🏅</div>`;

  const logoText = !d.certLogo
    ? `<span style="font-size:26px;font-weight:900;color:#fff;letter-spacing:0.2em;">${d.platformName}</span>`
    : '';

  const signatureHtml = d.signatureUrl
    ? `<img src="${d.signatureUrl}" alt="Assinatura" style="max-height:70px;max-width:220px;object-fit:contain;opacity:0.9;" />`
    : '';

  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"/>
<title>Certificado - ${d.studentName}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  @page{size:A4 landscape;margin:0}
  html,body{width:297mm;height:210mm;background:#111113;font-family:'Inter',sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .cert{width:297mm;height:210mm;background:#111113;position:relative;display:flex;flex-direction:column;align-items:center;overflow:hidden}
  .b1{position:absolute;inset:12px;border:2px solid rgba(255,255,255,0.12)}
  .b2{position:absolute;inset:20px;border:1px solid rgba(255,255,255,0.06)}
  .glow1{position:absolute;top:-50px;left:-50px;width:300px;height:300px;background:radial-gradient(circle,rgba(124,58,237,0.4) 0%,transparent 70%);border-radius:50%}
  .glow2{position:absolute;bottom:-50px;right:-50px;width:300px;height:300px;background:radial-gradient(circle,rgba(245,158,11,0.2) 0%,transparent 70%);border-radius:50%}
  .logo{margin-top:28px;display:flex;align-items:center;gap:12px;z-index:2}
  .title{font-size:46px;font-weight:900;color:rgba(255,255,255,0.92);letter-spacing:0.18em;font-family:Georgia,serif;z-index:2;margin-top:8px}
  .subtitle{font-size:11px;font-weight:700;color:#f59e0b;letter-spacing:0.32em;text-transform:uppercase;z-index:2;margin-top:4px;margin-bottom:14px}
  .content{text-align:center;max-width:66%;z-index:2}
  .cl{font-size:13px;color:rgba(255,255,255,0.5);margin-bottom:6px}
  .sname{font-size:34px;font-weight:700;color:#fff;border-bottom:2px solid rgba(255,255,255,0.15);padding-bottom:8px;margin-bottom:10px}
  .clabel{font-size:13px;color:rgba(255,255,255,0.7);line-height:1.6}
  .cname{font-size:20px;font-weight:900;color:#f59e0b;display:block;margin-top:4px}
  .dtext{font-size:11px;color:rgba(255,255,255,0.4);margin-top:8px}
  .footer{position:absolute;bottom:36px;left:44px;right:44px;display:flex;justify-content:space-between;align-items:flex-end;z-index:2}
  .id-block{max-width:200px}
  .id-icon{width:44px;height:44px;border:1px solid rgba(255,255,255,0.12);border-radius:8px;background:rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;font-size:20px;margin-bottom:5px}
  .id-label{font-size:8px;font-weight:700;color:rgba(255,255,255,0.3);text-transform:uppercase;letter-spacing:0.15em;margin-bottom:2px}
  .id-val{font-size:7.5px;color:rgba(255,255,255,0.45);font-family:monospace;word-break:break-all}
  .sig{text-align:center;display:flex;flex-direction:column;align-items:center}
  .sig-line{width:196px;height:1px;background:linear-gradient(to right,transparent,rgba(255,255,255,0.4),transparent);margin:5px 0}
  .sig-name{font-size:11px;font-weight:700;color:rgba(255,255,255,0.8)}
</style></head><body>
<div class="cert">
  <div class="b1"></div><div class="b2"></div>
  <div class="glow1"></div><div class="glow2"></div>
  <div class="logo">${logoHtml}${logoText}</div>
  <div class="title">CERTIFICADO</div>
  <div class="subtitle">De Conclusão de Curso</div>
  <div class="content">
    <p class="cl">Certificamos que</p>
    <div class="sname">${d.studentName}</div>
    <p class="clabel">concluiu com sucesso todos os módulos e avaliações do curso<strong class="cname">${d.courseTitle}</strong></p>
    <p class="dtext">Duração estimada de <strong style="color:#fff">${d.courseDuration}</strong> · Finalizado em ${d.issueDate}</p>
  </div>
  <div class="footer">
    <div class="id-block">
      <div class="id-icon">🛡️</div>
      <div class="id-label">ID do Documento</div>
      <div class="id-val">${d.certId}</div>
    </div>
    <div class="sig">${signatureHtml}<div class="sig-line"></div><div class="sig-name">${d.instructorName}</div></div>
  </div>
</div>
<script>window.onload=function(){setTimeout(function(){window.print();window.onafterprint=function(){window.close();}},800);}</script>
</body></html>`;
}

// ─── TEMPLATE 2: Classic White ────────────────────────────────────────────────

function classicWhiteTemplate(d: TemplateData): string {
  const logoHtml = d.certLogo
    ? `<img src="${d.certLogo}" alt="Logo" style="height:56px;object-fit:contain;" />`
    : `<div style="font-size:32px;">🏅</div>`;

  const logoText = !d.certLogo
    ? `<span style="font-size:22px;font-weight:900;color:#3d2e00;letter-spacing:0.2em;">${d.platformName}</span>`
    : '';

  const signatureHtml = d.signatureUrl
    ? `<img src="${d.signatureUrl}" alt="Assinatura" style="max-height:64px;max-width:200px;object-fit:contain;opacity:0.85;" />`
    : '';

  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"/>
<title>Certificado - ${d.studentName}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=EB+Garamond:wght@400;600;700;800&family=Inter:wght@400;600;700&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  @page{size:A4 landscape;margin:0}
  html,body{width:297mm;height:210mm;background:#fffef8;font-family:'Inter',sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .cert{width:297mm;height:210mm;background:#fffef8;position:relative;display:flex;flex-direction:column;align-items:center;overflow:hidden}
  .outer{position:absolute;inset:10px;border:3px solid #c9a84c}
  .inner{position:absolute;inset:16px;border:1px solid #e2c878}
  .corner{position:absolute;width:40px;height:40px;border-color:#c9a84c}
  .c-tl{top:22px;left:22px;border-top:2px solid #c9a84c;border-left:2px solid #c9a84c}
  .c-tr{top:22px;right:22px;border-top:2px solid #c9a84c;border-right:2px solid #c9a84c}
  .c-bl{bottom:22px;left:22px;border-bottom:2px solid #c9a84c;border-left:2px solid #c9a84c}
  .c-br{bottom:22px;right:22px;border-bottom:2px solid #c9a84c;border-right:2px solid #c9a84c}
  .logo{margin-top:28px;display:flex;align-items:center;gap:10px;z-index:2}
  .divider{width:200px;height:2px;background:linear-gradient(to right,transparent,#c9a84c,transparent);margin:6px 0;z-index:2}
  .title{font-size:40px;font-weight:800;color:#2c1a00;letter-spacing:0.22em;font-family:'EB Garamond',serif;z-index:2;margin-top:6px}
  .subtitle{font-size:10px;font-weight:600;color:#8a6e00;letter-spacing:0.35em;text-transform:uppercase;z-index:2;margin-top:3px;margin-bottom:12px}
  .content{text-align:center;max-width:64%;z-index:2}
  .cl{font-size:13px;color:#7a6a50;margin-bottom:5px;font-style:italic}
  .sname{font-size:34px;font-weight:800;color:#1a1000;font-family:'EB Garamond',serif;border-bottom:1px solid #d4b96a;padding-bottom:6px;margin-bottom:8px}
  .clabel{font-size:13px;color:#5a4a30;line-height:1.6}
  .cname{font-size:18px;font-weight:700;color:#8a5a00;display:block;margin-top:4px}
  .dtext{font-size:11px;color:#9a8a6a;margin-top:8px}
  .footer{position:absolute;bottom:34px;left:44px;right:44px;display:flex;justify-content:space-between;align-items:flex-end;z-index:2}
  .id-block{max-width:200px}
  .id-label{font-size:8px;font-weight:600;color:#b09060;text-transform:uppercase;letter-spacing:0.12em;margin-bottom:2px}
  .id-val{font-size:7px;color:#8a7050;font-family:monospace;word-break:break-all}
  .seal{width:56px;height:56px;border-radius:50%;border:3px solid #c9a84c;background:#fff8e0;display:flex;align-items:center;justify-content:center;font-size:26px;box-shadow:0 0 0 2px #e2c878}
  .sig{text-align:center;display:flex;flex-direction:column;align-items:center}
  .sig-line{width:180px;height:1px;background:linear-gradient(to right,transparent,#c9a84c,transparent);margin:5px 0}
  .sig-name{font-size:11px;font-weight:600;color:#5a4020}
</style></head><body>
<div class="cert">
  <div class="outer"></div><div class="inner"></div>
  <div class="corner c-tl"></div><div class="corner c-tr"></div>
  <div class="corner c-bl"></div><div class="corner c-br"></div>
  <div class="logo">${logoHtml}${logoText}</div>
  <div class="divider"></div>
  <div class="title">CERTIFICADO</div>
  <div class="subtitle">De Conclusão de Curso</div>
  <div class="content">
    <p class="cl">Certificamos que</p>
    <div class="sname">${d.studentName}</div>
    <p class="clabel">concluiu com êxito todos os módulos e avaliações do curso<strong class="cname">${d.courseTitle}</strong></p>
    <p class="dtext">Duração estimada de <strong style="color:#5a4020">${d.courseDuration}</strong> · Finalizado em ${d.issueDate}</p>
  </div>
  <div class="footer">
    <div class="id-block">
      <div class="id-label">Código de Autenticidade</div>
      <div class="id-val">${d.certId}</div>
    </div>
    <div class="seal">🏆</div>
    <div class="sig">${signatureHtml}<div class="sig-line"></div><div class="sig-name">${d.instructorName}</div></div>
  </div>
</div>
<script>window.onload=function(){setTimeout(function(){window.print();window.onafterprint=function(){window.close();}},800);}</script>
</body></html>`;
}

// ─── TEMPLATE 3: Minimal Light ────────────────────────────────────────────────

function minimalLightTemplate(d: TemplateData): string {
  const logoHtml = d.certLogo
    ? `<img src="${d.certLogo}" alt="Logo" style="height:40px;object-fit:contain;" />`
    : `<span style="font-size:20px;font-weight:900;color:#1a1a1a;letter-spacing:0.15em;">${d.platformName}</span>`;

  const signatureHtml = d.signatureUrl
    ? `<img src="${d.signatureUrl}" alt="Assinatura" style="max-height:56px;max-width:180px;object-fit:contain;opacity:0.85;" />`
    : '';

  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"/>
<title>Certificado - ${d.studentName}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700;900&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  @page{size:A4 landscape;margin:0}
  html,body{width:297mm;height:210mm;background:#f7f7f5;font-family:'Inter',sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .cert{width:297mm;height:210mm;background:#f7f7f5;position:relative;display:flex;overflow:hidden}
  .accent-bar{position:absolute;top:0;left:0;right:0;height:6px;background:linear-gradient(to right,${d.primaryColor},${d.primaryColor}cc)}
  .left-col{width:200px;min-width:200px;height:100%;background:#fff;border-right:1px solid #e8e8e4;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px 20px;gap:16px}
  .right-col{flex:1;display:flex;flex-direction:column;justify-content:center;padding:40px 50px 36px 44px}
  .logo-wrap{display:flex;flex-direction:column;align-items:center;gap:8px;text-align:center}
  .tag{font-size:8px;font-weight:700;color:#bbb;letter-spacing:0.2em;text-transform:uppercase}
  .divider-v{width:1px;height:40px;background:#e0e0dc}
  .id-block{background:#f0f0ed;border-radius:8px;padding:10px 12px;width:100%}
  .id-label{font-size:7.5px;font-weight:700;color:#aaa;text-transform:uppercase;letter-spacing:0.15em;margin-bottom:3px}
  .id-val{font-size:6.5px;color:#888;font-family:monospace;word-break:break-all}
  .cert-label{font-size:10px;font-weight:600;color:#bbb;letter-spacing:0.3em;text-transform:uppercase;margin-bottom:4px}
  .cert-title{font-size:40px;font-weight:900;color:#111;letter-spacing:0.12em;margin-bottom:16px;line-height:1}
  .cl{font-size:13px;color:#888;margin-bottom:6px}
  .sname{font-size:30px;font-weight:900;color:#1a1a1a;margin-bottom:8px;padding-bottom:8px;border-bottom:2px solid ${d.primaryColor}}
  .clabel{font-size:13px;color:#555;line-height:1.6}
  .cname{font-size:17px;font-weight:700;color:#222;display:block;margin-top:4px}
  .dtext{font-size:11px;color:#999;margin-top:10px}
  .footer{margin-top:auto;display:flex;justify-content:flex-end;align-items:flex-end;gap:24px}
  .sig{text-align:center;display:flex;flex-direction:column;align-items:center}
  .sig-line{width:160px;height:1px;background:linear-gradient(to right,transparent,#bbb,transparent);margin:4px 0}
  .sig-name{font-size:10px;font-weight:600;color:#555}
</style></head><body>
<div class="cert">
  <div class="accent-bar"></div>
  <div class="left-col">
    <div class="logo-wrap">${logoHtml}</div>
    <div class="divider-v"></div>
    <p class="tag">Certificado Digital</p>
    <div class="divider-v"></div>
    <div class="id-block">
      <div class="id-label">ID de Autenticidade</div>
      <div class="id-val">${d.certId}</div>
    </div>
  </div>
  <div class="right-col">
    <p class="cert-label">Certificado de Conclusão</p>
    <h1 class="cert-title">DIPLOMA</h1>
    <p class="cl">Certificamos que</p>
    <div class="sname">${d.studentName}</div>
    <p class="clabel">concluiu com sucesso todos os módulos e avaliações do curso<strong class="cname">${d.courseTitle}</strong></p>
    <p class="dtext">Duração estimada de <strong style="color:#333">${d.courseDuration}</strong> · Finalizado em ${d.issueDate}</p>
    <div class="footer">
      <div class="sig">${signatureHtml}<div class="sig-line"></div><div class="sig-name">${d.instructorName}</div></div>
    </div>
  </div>
</div>
<script>window.onload=function(){setTimeout(function(){window.print();window.onafterprint=function(){window.close();}},800);}</script>
</body></html>`;
}

// ─── TEMPLATE 4: Corporate Blue ───────────────────────────────────────────────

function corporateBlueTemplate(d: TemplateData): string {
  const logoHtml = d.certLogo
    ? `<img src="${d.certLogo}" alt="Logo" style="height:44px;object-fit:contain;filter:brightness(0) invert(1);" />`
    : `<span style="font-size:20px;font-weight:900;color:#fff;letter-spacing:0.2em;">${d.platformName}</span>`;

  const signatureHtml = d.signatureUrl
    ? `<img src="${d.signatureUrl}" alt="Assinatura" style="max-height:60px;max-width:200px;object-fit:contain;opacity:0.9;" />`
    : '';

  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"/>
<title>Certificado - ${d.studentName}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700;900&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  @page{size:A4 landscape;margin:0}
  html,body{width:297mm;height:210mm;background:#fff;font-family:'Inter',sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .cert{width:297mm;height:210mm;background:#fff;display:flex;flex-direction:column;overflow:hidden}
  .header{background:#1e3a5f;padding:18px 44px;display:flex;align-items:center;justify-content:space-between}
  .header-right{display:flex;flex-direction:column;align-items:flex-end;gap:1px}
  .h-tag{font-size:8px;font-weight:700;color:rgba(255,255,255,0.5);letter-spacing:0.2em;text-transform:uppercase}
  .h-title{font-size:14px;font-weight:700;color:rgba(255,255,255,0.9);letter-spacing:0.08em}
  .body{flex:1;display:flex;align-items:center;padding:20px 52px 0 52px;gap:40px}
  .col-left{display:flex;flex-direction:column;align-items:flex-start;flex:1}
  .cert-label{font-size:9px;font-weight:700;color:#1e3a5f;letter-spacing:0.3em;text-transform:uppercase;margin-bottom:4px;opacity:0.6}
  .cert-title{font-size:42px;font-weight:900;color:#111;letter-spacing:0.1em;line-height:1;margin-bottom:14px}
  .cert-accent{display:block;width:60px;height:4px;background:#1e3a5f;border-radius:2px;margin-bottom:16px}
  .cl{font-size:12px;color:#888;margin-bottom:5px}
  .sname{font-size:28px;font-weight:900;color:#1a1a2e;margin-bottom:8px}
  .clabel{font-size:13px;color:#555;line-height:1.6}
  .cname{font-size:16px;font-weight:800;color:#1e3a5f;display:block;margin-top:4px}
  .dtext{font-size:10px;color:#aaa;margin-top:8px}
  .col-right{width:220px;display:flex;flex-direction:column;align-items:center;gap:12px}
  .seal-box{width:120px;height:120px;border-radius:50%;background:#1e3a5f;display:flex;align-items:center;justify-content:center;font-size:50px;box-shadow:0 8px 32px rgba(30,58,95,0.3)}
  .footer{background:#f0f4f8;padding:14px 52px;display:flex;justify-content:space-between;align-items:center;border-top:2px solid #1e3a5f}
  .id-block{display:flex;flex-direction:column;gap:2px}
  .id-label{font-size:7.5px;font-weight:700;color:#1e3a5f;text-transform:uppercase;letter-spacing:0.15em;opacity:0.5}
  .id-val{font-size:7px;color:#888;font-family:monospace;word-break:break-all;max-width:300px}
  .sig{text-align:center;display:flex;flex-direction:column;align-items:center}
  .sig-line{width:160px;height:1px;background:#1e3a5f;opacity:0.3;margin:4px 0}
  .sig-name{font-size:10px;font-weight:700;color:#1e3a5f}
</style></head><body>
<div class="cert">
  <div class="header">
    <div>${logoHtml}</div>
    <div class="header-right">
      <span class="h-tag">Certificado Oficial</span>
      <span class="h-title">Certificado de Conclusão</span>
    </div>
  </div>
  <div class="body">
    <div class="col-left">
      <p class="cert-label">Diploma Oficial</p>
      <h1 class="cert-title">CERTIFICADO</h1>
      <span class="cert-accent"></span>
      <p class="cl">Certificamos que</p>
      <div class="sname">${d.studentName}</div>
      <p class="clabel">concluiu com sucesso todos os módulos e avaliações do curso<strong class="cname">${d.courseTitle}</strong></p>
      <p class="dtext">Duração estimada de <strong style="color:#333">${d.courseDuration}</strong> · Finalizado em ${d.issueDate}</p>
    </div>
    <div class="col-right">
      <div class="seal-box">🏆</div>
      <div class="sig">${signatureHtml}<div class="sig-line"></div><div class="sig-name">${d.instructorName}</div></div>
    </div>
  </div>
  <div class="footer">
    <div class="id-block">
      <div class="id-label">Código de Autenticidade</div>
      <div class="id-val">${d.certId}</div>
    </div>
    <div style="font-size:10px;color:#aaa;text-align:right">${d.issueDate} · Documento válido e verificável</div>
  </div>
</div>
<script>window.onload=function(){setTimeout(function(){window.print();window.onafterprint=function(){window.close();}},800);}</script>
</body></html>`;
}

// ─── Template Dispatcher ──────────────────────────────────────────────────────

function generateCertificateHTML(templateId: string, d: TemplateData): string {
  switch (templateId) {
    case 'classic-white':    return classicWhiteTemplate(d);
    case 'minimal-light':   return minimalLightTemplate(d);
    case 'corporate-blue':  return corporateBlueTemplate(d);
    case 'dark-premium':
    default:                return darkPremiumTemplate(d);
  }
}

// ─── Main Component ───────────────────────────────────────────────────────────

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
        .select(`*, user:profiles(*), course:courses(*)`)
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      return data as CertData | null;
    },
    enabled: !!id,
  });

  const handleDownload = () => {
    if (!cert) return;

    const templateData: TemplateData = {
      studentName: cert.user?.name || 'Aluno da Plataforma',
      courseTitle: cert.course?.title || 'Curso',
      courseDuration: cert.course?.duration || 'N/A',
      issueDate: cert.issued_at
        ? format(new Date(cert.issued_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
        : '',
      certId: cert.id,
      instructorName: settings.certificate_instructor_name || 'Diretoria',
      platformName: settings.logo_text || 'STREAM',
      certLogo: settings.certificate_logo_url || settings.logo_image_url || null,
      signatureUrl: settings.certificate_signature_url || null,
      primaryColor: settings.gradient_start_color || '#7c3aed',
    };

    const templateId = settings.certificate_template || 'dark-premium';
    const html = generateCertificateHTML(templateId, templateData);

    const printWindow = window.open('', '_blank', 'width=1200,height=900');
    if (!printWindow) {
      alert('Por favor, permita pop-ups para este site e tente novamente.');
      return;
    }
    printWindow.document.write(html);
    printWindow.document.close();
  };

  // ── Loading ──
  if (isLoading || isLoadingSettings) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
      </div>
    );
  }

  // ── Error ──
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
  const templateId = settings.certificate_template || 'dark-premium';
  const isDark = templateId === 'dark-premium';

  return (
    <div className="min-h-screen bg-[#0a0a0b] py-8 px-4 flex flex-col items-center custom-scrollbar">
      {/* Controls */}
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

      {/* Preview */}
      <div className="w-full max-w-[1100px] overflow-x-auto pb-12">

        {/* ── Dark Premium ── */}
        {templateId === 'dark-premium' && (
          <div className="relative min-w-[1000px] aspect-[1.414/1] bg-[#111113] border border-white/5 shadow-2xl mx-auto overflow-hidden flex flex-col items-center"
            style={{ backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(255,255,255,0.02) 0%, transparent 60%)' }}>
            <div className="absolute inset-4 border-2 border-white/10" />
            <div className="absolute inset-6 border border-white/5" />
            <div className="absolute top-0 left-0 w-64 h-64 bg-primary/30 blur-[100px] rounded-full pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-64 h-64 bg-amber-500/10 blur-[100px] rounded-full pointer-events-none" />
            <div className="mt-14 mb-8 flex items-center gap-4 z-10">
              {certLogo ? <img src={certLogo} alt="Logo" className="h-14 object-contain" /> : <Award className="w-10 h-10 text-primary" />}
              {!settings.certificate_logo_url && <h1 className="text-2xl font-black text-white tracking-widest">{settings.logo_text || 'STREAM'}</h1>}
            </div>
            <h2 className="text-4xl font-black text-white/90 tracking-widest mb-1 z-10" style={{ fontFamily: 'serif' }}>CERTIFICADO</h2>
            <p className="text-xs font-bold text-amber-500 tracking-[0.3em] uppercase mb-8 z-10">De Conclusão de Curso</p>
            <div className="text-center max-w-[68%] z-10">
              <p className="text-sm text-white/50 mb-2">Certificamos que</p>
              <h3 className="text-3xl font-bold text-white mb-4 border-b border-white/15 pb-2">{cert.user?.name || 'Aluno'}</h3>
              <p className="text-sm text-white/70">concluiu com sucesso: <strong className="text-amber-400 block text-lg mt-1">{cert.course?.title}</strong></p>
              <p className="text-xs text-white/40 mt-4">Finalizado em {issueDate}</p>
            </div>
            <div className="absolute bottom-12 left-12 right-12 flex justify-between items-end z-10">
              <div><ShieldCheck className="w-8 h-8 text-primary/50 mb-1" /><p className="text-[8px] text-white/30 font-mono break-all max-w-[180px]">{cert.id}</p></div>
              <div className="text-center">
                {settings.certificate_signature_url && <img src={settings.certificate_signature_url} className="max-h-12 object-contain mb-1" alt="Assinatura" />}
                <div className="w-40 h-px bg-white/20 mx-auto mb-1" />
                <p className="text-xs text-white/70 font-bold">{settings.certificate_instructor_name || 'Diretoria'}</p>
              </div>
            </div>
          </div>
        )}

        {/* ── Classic White ── */}
        {templateId === 'classic-white' && (
          <div className="relative min-w-[1000px] aspect-[1.414/1] bg-[#fffef8] mx-auto shadow-2xl overflow-hidden flex flex-col items-center" style={{ border: '3px solid #c9a84c' }}>
            <div className="absolute inset-[6px]" style={{ border: '1px solid #e2c878' }} />
            {/* corner ornaments */}
            <div className="absolute top-5 left-5 w-8 h-8 border-t-2 border-l-2 border-yellow-600" />
            <div className="absolute top-5 right-5 w-8 h-8 border-t-2 border-r-2 border-yellow-600" />
            <div className="absolute bottom-5 left-5 w-8 h-8 border-b-2 border-l-2 border-yellow-600" />
            <div className="absolute bottom-5 right-5 w-8 h-8 border-b-2 border-r-2 border-yellow-600" />
            <div className="mt-10 mb-2 flex items-center gap-3 z-10">
              {certLogo ? <img src={certLogo} alt="Logo" className="h-12 object-contain" /> : <Award className="w-10 h-10 text-yellow-700" />}
              {!settings.certificate_logo_url && <h1 className="text-xl font-black tracking-widest" style={{ color: '#3d2e00' }}>{settings.logo_text || 'STREAM'}</h1>}
            </div>
            <div className="w-40 h-0.5 mx-auto mb-2" style={{ background: 'linear-gradient(to right, transparent, #c9a84c, transparent)' }} />
            <h2 className="text-4xl font-black tracking-widest mb-1 z-10" style={{ color: '#2c1a00', fontFamily: 'Georgia, serif' }}>CERTIFICADO</h2>
            <p className="text-[10px] font-bold tracking-[0.35em] uppercase mb-6 z-10" style={{ color: '#8a6e00' }}>De Conclusão de Curso</p>
            <div className="text-center max-w-[65%] z-10">
              <p className="text-sm mb-2 italic" style={{ color: '#7a6a50' }}>Certificamos que</p>
              <h3 className="text-3xl font-bold mb-4 pb-2 border-b" style={{ color: '#1a1000', borderColor: '#d4b96a', fontFamily: 'Georgia, serif' }}>{cert.user?.name || 'Aluno'}</h3>
              <p className="text-sm leading-relaxed" style={{ color: '#5a4a30' }}>concluiu com êxito todos os módulos do curso<strong className="block text-lg mt-2" style={{ color: '#8a5a00' }}>{cert.course?.title}</strong></p>
              <p className="text-xs mt-4" style={{ color: '#9a8a6a' }}>Finalizado em {issueDate}</p>
            </div>
            <div className="absolute bottom-8 left-10 right-10 flex justify-between items-end z-10">
              <div><p className="text-[7px] font-mono break-all max-w-[200px]" style={{ color: '#c0a870' }}>{cert.id}</p></div>
              <div className="w-12 h-12 rounded-full flex items-center justify-center text-2xl" style={{ border: '3px solid #c9a84c', background: '#fff8e0' }}>🏆</div>
              <div className="text-center">
                {settings.certificate_signature_url && <img src={settings.certificate_signature_url} className="max-h-10 object-contain mb-1" alt="Assinatura" />}
                <div className="w-36 h-px mx-auto mb-1" style={{ background: 'linear-gradient(to right, transparent, #c9a84c, transparent)' }} />
                <p className="text-xs font-semibold" style={{ color: '#5a4020' }}>{settings.certificate_instructor_name || 'Diretoria'}</p>
              </div>
            </div>
          </div>
        )}

        {/* ── Minimal Light ── */}
        {templateId === 'minimal-light' && (
          <div className="relative min-w-[1000px] aspect-[1.414/1] bg-[#f7f7f5] mx-auto shadow-2xl overflow-hidden flex">
            <div className="absolute top-0 left-0 right-0 h-1.5" style={{ background: `linear-gradient(to right, ${settings.gradient_start_color || '#7c3aed'}, ${settings.gradient_end_color || '#f59e0b'})` }} />
            {/* Left sidebar */}
            <div className="w-44 h-full bg-white border-r border-gray-100 flex flex-col items-center justify-center gap-4 p-5">
              <div className="flex flex-col items-center gap-2 text-center">
                {certLogo ? <img src={certLogo} alt="Logo" className="h-10 object-contain" /> : <span className="text-lg font-black text-gray-800 tracking-widest">{settings.logo_text || 'STREAM'}</span>}
              </div>
              <div className="w-px h-8 bg-gray-200" />
              <p className="text-[8px] font-bold text-gray-400 tracking-widest uppercase text-center">Certificado Digital</p>
              <div className="w-px h-8 bg-gray-200" />
              <div className="bg-gray-50 rounded-lg p-2 w-full">
                <p className="text-[7px] font-bold text-gray-300 uppercase tracking-widest mb-1">ID</p>
                <p className="text-[6px] text-gray-400 font-mono break-all">{cert.id.slice(0, 24)}…</p>
              </div>
            </div>
            {/* Right content */}
            <div className="flex-1 flex flex-col justify-center px-10 pt-6 pb-8">
              <p className="text-[10px] font-bold tracking-[0.3em] uppercase mb-1" style={{ color: settings.gradient_start_color || '#7c3aed', opacity: 0.7 }}>Certificado de Conclusão</p>
              <h2 className="text-4xl font-black text-gray-900 tracking-[0.12em] mb-4" style={{ lineHeight: 1 }}>DIPLOMA</h2>
              <p className="text-sm text-gray-400 mb-2">Certificamos que</p>
              <h3 className="text-3xl font-black text-gray-900 mb-3 pb-2" style={{ borderBottom: `2px solid ${settings.gradient_start_color || '#7c3aed'}` }}>{cert.user?.name || 'Aluno'}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">concluiu com sucesso todos os módulos do curso<strong className="block text-lg mt-1 text-gray-800">{cert.course?.title}</strong></p>
              <p className="text-xs text-gray-400 mt-4">Finalizado em {issueDate}</p>
              <div className="mt-auto pt-4 flex justify-end">
                <div className="text-center">
                  {settings.certificate_signature_url && <img src={settings.certificate_signature_url} className="max-h-10 object-contain mb-1" alt="Assinatura" />}
                  <div className="w-36 h-px bg-gray-300 mb-1" />
                  <p className="text-xs font-semibold text-gray-500">{settings.certificate_instructor_name || 'Diretoria'}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Corporate Blue ── */}
        {templateId === 'corporate-blue' && (
          <div className="relative min-w-[1000px] aspect-[1.414/1] bg-white mx-auto shadow-2xl overflow-hidden flex flex-col">
            {/* Header */}
            <div className="bg-[#1e3a5f] px-10 py-4 flex items-center justify-between shrink-0">
              <div>
                {certLogo ? <img src={certLogo} alt="Logo" className="h-10 object-contain brightness-0 invert" /> : <span className="text-lg font-black text-white tracking-widest">{settings.logo_text || 'STREAM'}</span>}
              </div>
              <div className="text-right">
                <p className="text-[8px] font-bold text-white/40 tracking-widest uppercase">Certificado Oficial</p>
                <p className="text-sm font-bold text-white/80 tracking-wider">Certificado de Conclusão</p>
              </div>
            </div>
            {/* Body */}
            <div className="flex-1 flex items-center px-12 gap-10">
              <div className="flex-1 flex flex-col">
                <p className="text-[9px] font-bold tracking-[0.3em] uppercase mb-1 text-[#1e3a5f] opacity-60">Diploma Oficial</p>
                <h2 className="text-4xl font-black text-gray-900 tracking-[0.1em] mb-3" style={{ lineHeight: 1 }}>CERTIFICADO</h2>
                <div className="w-14 h-1 bg-[#1e3a5f] rounded mb-4" />
                <p className="text-sm text-gray-400 mb-2">Certificamos que</p>
                <h3 className="text-2xl font-black text-[#1a1a2e] mb-3">{cert.user?.name || 'Aluno'}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">concluiu com sucesso todos os módulos do curso<strong className="block text-base mt-1 text-[#1e3a5f]">{cert.course?.title}</strong></p>
                <p className="text-xs text-gray-400 mt-3">Finalizado em {issueDate}</p>
              </div>
              <div className="flex flex-col items-center gap-4">
                <div className="w-24 h-24 rounded-full bg-[#1e3a5f] flex items-center justify-center text-4xl shadow-lg">🏆</div>
                <div className="text-center">
                  {settings.certificate_signature_url && <img src={settings.certificate_signature_url} className="max-h-10 object-contain mb-1" alt="Assinatura" />}
                  <div className="w-32 h-px bg-[#1e3a5f]/30 mb-1" />
                  <p className="text-[10px] font-bold text-[#1e3a5f]">{settings.certificate_instructor_name || 'Diretoria'}</p>
                </div>
              </div>
            </div>
            {/* Footer */}
            <div className="bg-[#f0f4f8] border-t-2 border-[#1e3a5f] px-10 py-3 flex justify-between items-center shrink-0">
              <p className="text-[7px] text-gray-400 font-mono break-all max-w-[300px]">{cert.id}</p>
              <p className="text-[10px] text-gray-400">{issueDate} · Documento válido e verificável</p>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
